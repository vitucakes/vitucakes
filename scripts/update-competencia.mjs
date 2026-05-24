// Scrapea catálogos de competidoras (todas Tiendanube por ahora) y genera
// public/competencia.json con la lista de productos y precios.
// Pensado para correrse semanalmente vía cron de GitHub Actions.
//
// Para agregar una competidora nueva, sumarla al array COMPETIDORAS de abajo.

import fs from 'node:fs';
import https from 'node:https';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Lista de competidoras. Cada una es una tienda Tiendanube con catálogo
// público. Si en el futuro hay competidoras que NO son Tiendanube, agregar
// un campo `type` y discriminar en el parser.
const COMPETIDORAS = [
  {
    id: 'candelitte',
    nombre: 'Candelitte',
    sitemapUrl: 'https://candelitte.mitiendanube.com/sitemap.xml',
    // Filtros para descartar productos que no son tortas/pastelería.
    excludeSlugs: ['gift-card', 'box-desayuno', 'fechas-disponibles'],
  },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(get(res.headers.location));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function extractPrice(html) {
  // Tiendanube inyecta JSON inline con price_number — mismo patrón que El Granate.
  const m = html.match(/"price_number":(\d+(?:\.\d+)?)/);
  if (m) return Math.round(parseFloat(m[1]));
  const m2 = html.match(/tiendanube:price"\s+content="(\d+(?:\.\d+)?)"/);
  if (m2) return Math.round(parseFloat(m2[1]));
  // Fallback: meta property og:price:amount
  const m3 = html.match(/<meta\s+property="product:price:amount"\s+content="(\d+(?:\.\d+)?)"/);
  if (m3) return Math.round(parseFloat(m3[1]));
  return null;
}

function extractName(html) {
  const m = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (!m) return '';
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, '')
    // Remueve sufijos comunes tipo "- Candelitte"
    .replace(/\s+-\s+[^-]+$/, '')
    .trim();
}

function extractDescription(html) {
  const m = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
  if (!m) return '';
  return m[1].replace(/&amp;/g, '&').replace(/&[a-z]+;/g, '').trim();
}

// Pool simple para no martillar el servidor
async function pool(jobs, concurrency = 4) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < jobs.length) {
      const idx = i++;
      try {
        results[idx] = await jobs[idx]();
      } catch (e) {
        results[idx] = { error: e.message };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function slugFromUrl(url) {
  const m = url.match(/\/productos\/([^/]+)/);
  return m ? m[1] : url;
}

async function scrapeCompetidora(comp) {
  console.log(`\n[${comp.nombre}] Fetching sitemap...`);
  const sitemap = await get(comp.sitemapUrl);
  const urls = (sitemap.match(/<loc>[^<]+<\/loc>/g) || [])
    .map((s) => s.replace(/<\/?loc>/g, '').trim())
    // Producto individual: /productos/<slug>/ (slug no vacío).
    .filter((u) => /\/productos\/[^/]+\/?$/.test(u))
    .filter((u) => !(comp.excludeSlugs || []).some((ex) => u.includes(ex)));

  console.log(`[${comp.nombre}] ${urls.length} productos a scrapear`);

  const results = await pool(
    urls.map((url) => async () => {
      const html = await get(url);
      const precio = extractPrice(html);
      const nombre = extractName(html);
      const descripcion = extractDescription(html);
      if (!precio || !nombre) {
        return { url, error: !precio ? 'sin precio' : 'sin nombre' };
      }
      return {
        slug: slugFromUrl(url),
        nombre,
        descripcion,
        precio,
        url,
      };
    }),
    4,
  );

  const productos = [];
  const errores = [];
  for (const r of results) {
    if (r.error) errores.push(r);
    else {
      productos.push(r);
      console.log(`  ✓ ${r.nombre}: $${r.precio.toLocaleString('es-AR')}`);
    }
  }

  return {
    id: comp.id,
    nombre: comp.nombre,
    fuente: comp.sitemapUrl.replace('/sitemap.xml', ''),
    productos,
    errores,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const out = {
    generadoEn: new Date().toISOString(),
    competidoras: [],
  };

  for (const comp of COMPETIDORAS) {
    const data = await scrapeCompetidora(comp);
    out.competidoras.push(data);
  }

  fs.writeFileSync('public/competencia.json', JSON.stringify(out, null, 2));

  const totalProductos = out.competidoras.reduce((s, c) => s + c.productos.length, 0);
  const totalErrores = out.competidoras.reduce((s, c) => s + c.errores.length, 0);
  console.log(`\n=> public/competencia.json — ${out.competidoras.length} competidora(s), ${totalProductos} productos, ${totalErrores} errores`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
