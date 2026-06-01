// Scrapea catálogos de competidoras y genera public/competencia.json con la
// lista de productos y precios. Corre semanalmente vía cron de GitHub Actions.
//
// Soporta 3 plataformas (campo `type`):
//   - 'tiendanube'  → URLs /productos/<slug>/, precio en "price_number"
//   - 'empretienda' → URLs /<categoria>/<slug>, precio en meta product:price:amount
//   - 'woocommerce' → sitemap índice → product-sitemap → /producto/<slug>/, precio en JSON-LD
//
// Para agregar una competidora nueva, sumarla al array COMPETIDORAS de abajo
// con su `type`.

import fs from 'node:fs';
import https from 'node:https';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const COMPETIDORAS = [
  {
    id: 'candelitte',
    nombre: 'Candelitte',
    type: 'tiendanube',
    sitemapUrl: 'https://candelitte.mitiendanube.com/sitemap.xml',
    excludeSlugs: ['gift-card', 'box-desayuno', 'fechas-disponibles'],
  },
  {
    id: 'memo-la-pasteleria',
    nombre: 'Memo La Pastelería',
    type: 'empretienda',
    sitemapUrl: 'https://memolapasteleria.empretienda.com.ar/sitemap.xml',
    excludeSlugs: [],
  },
  {
    id: 'silnari',
    nombre: 'Silnari',
    type: 'empretienda',
    sitemapUrl: 'https://www.silnari.com/sitemap.xml',
    excludeSlugs: [],
  },
  {
    id: 'delicias-del-corazon',
    nombre: 'Delicias del Corazón',
    type: 'woocommerce',
    sitemapUrl: 'https://deliciasdelcorazon.com.ar/sitemap.xml',
    excludeSlugs: [],
  },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(get(new URL(res.headers.location, url).href));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

const locs = (xml) =>
  (xml.match(/<loc>[^<]+<\/loc>/g) || []).map((s) => s.replace(/<\/?loc>/g, '').trim());

const IMG_RE = /\.(jpg|jpeg|png|webp|gif|svg|ico)(\?|$)/i;

function extractPrice(html) {
  // Tiendanube
  const m = html.match(/"price_number":(\d+(?:\.\d+)?)/);
  if (m) return Math.round(parseFloat(m[1]));
  // Empretienda / OpenGraph
  const m3 = html.match(/<meta\s+property="product:price:amount"\s+content="(\d+(?:\.\d+)?)"/);
  if (m3) return Math.round(parseFloat(m3[1]));
  const m2 = html.match(/tiendanube:price"\s+content="(\d+(?:\.\d+)?)"/);
  if (m2) return Math.round(parseFloat(m2[1]));
  // WooCommerce / JSON-LD
  const m4 = html.match(/"price"\s*:\s*"?(\d+(?:[.,]\d+)?)"?/);
  if (m4) return Math.round(parseFloat(m4[1].replace(',', '.')));
  return null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#x27;|&apos;/gi, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractName(html) {
  const m = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  if (!m) return '';
  return decodeEntities(m[1]).replace(/\s+-\s+[^-]+$/, '').trim(); // saca sufijo "- Tienda"
}

function extractDescription(html) {
  const m = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
  if (!m) return '';
  return decodeEntities(m[1]);
}

async function pool(jobs, concurrency = 5) {
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

function slugFromUrl(url, type) {
  if (type === 'tiendanube') {
    const m = url.match(/\/productos\/([^/]+)/);
    return m ? m[1] : url;
  }
  if (type === 'woocommerce') {
    const m = url.match(/\/producto\/([^/]+)/);
    return m ? m[1] : url;
  }
  // empretienda: último segmento
  const segs = new URL(url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 1] || url;
}

// Devuelve la lista de URLs de PRODUCTO según la plataforma.
async function getProductUrls(comp) {
  const sitemap = await get(comp.sitemapUrl);

  if (comp.type === 'tiendanube') {
    return locs(sitemap).filter((u) => /\/productos\/[^/]+\/?$/.test(u));
  }

  if (comp.type === 'empretienda') {
    const host = new URL(comp.sitemapUrl).host;
    return locs(sitemap).filter((u) => {
      try {
        const p = new URL(u);
        if (p.host !== host) return false; // descarta imágenes en CDN
        if (IMG_RE.test(p.pathname)) return false;
        const segs = p.pathname.split('/').filter(Boolean);
        return segs.length >= 2; // /categoria/slug ; las categorías (1 seg) se descartan
      } catch {
        return false;
      }
    });
  }

  if (comp.type === 'woocommerce') {
    // sitemap.xml suele ser un índice → buscamos los product-sitemap*.xml
    let subSitemaps = locs(sitemap).filter((u) => /product-sitemap\d*\.xml/i.test(u));
    if (subSitemaps.length === 0) subSitemaps = [comp.sitemapUrl]; // por si ya es el de productos
    const urls = [];
    for (const sm of subSitemaps) {
      const xml = await get(sm);
      urls.push(...locs(xml).filter((u) => /\/producto\/[^/]+\/?$/.test(u)));
    }
    return urls;
  }

  return [];
}

async function scrapeCompetidora(comp) {
  console.log(`\n[${comp.nombre}] (${comp.type}) Fetching sitemap...`);
  let urls = await getProductUrls(comp);
  urls = urls.filter((u) => !(comp.excludeSlugs || []).some((ex) => u.includes(ex)));
  // dedupe
  urls = [...new Set(urls)];
  console.log(`[${comp.nombre}] ${urls.length} URLs candidatas a producto`);

  const results = await pool(
    urls.map((url) => async () => {
      const html = await get(url);
      const precio = extractPrice(html);
      const nombre = extractName(html);
      const descripcion = extractDescription(html);
      if (!precio || !nombre) {
        return { url, error: !precio ? 'sin precio' : 'sin nombre' };
      }
      return { slug: slugFromUrl(url, comp.type), nombre, descripcion: descripcion.slice(0, 200), precio, url };
    }),
    5,
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
    fuente: comp.sitemapUrl.replace(/\/sitemap\.xml$/, ''),
    productos,
    errores,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const out = { generadoEn: new Date().toISOString(), competidoras: [] };

  for (const comp of COMPETIDORAS) {
    try {
      out.competidoras.push(await scrapeCompetidora(comp));
    } catch (e) {
      console.error(`[${comp.nombre}] FALLÓ:`, e.message);
      out.competidoras.push({
        id: comp.id,
        nombre: comp.nombre,
        fuente: comp.sitemapUrl.replace(/\/sitemap\.xml$/, ''),
        productos: [],
        errores: [{ error: e.message }],
        updatedAt: new Date().toISOString(),
      });
    }
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
