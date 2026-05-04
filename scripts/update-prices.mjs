// Scrapea precios de Distribuidora El Granate (Tiendanube) y genera
// public/precios_sugeridos.json con sugerencias de actualización.
// La regla "no bajar precio" se aplica en el cliente (App), no acá:
// este script entrega TODOS los precios encontrados.

import fs from 'node:fs';
import https from 'node:https';

const SITEMAP_URL = 'https://www.distribuidoraelgranate.com.ar/sitemap.xml';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Mapping: nombre exacto del insumo en Vitucakes → cómo encontrarlo en El Granate.
// Si el insumo del user usa una unidad equivalente (g↔ml, ej. crema y miel),
// el precio se asigna sin conversión.
const QUERIES = [
  { nombre: 'Harina 000', unidad: 'g', keywords: ['harina-000-'], exclude: ['0000','almendras','garbanzos','salvado','semolin','malta','leudante','reposteria','integral'] },
  { nombre: 'Harina 0000', unidad: 'g', keywords: ['harina-0000'], exclude: ['leudante','reposteria','integral'] },
  { nombre: 'Harina de almendras', unidad: 'g', keywords: ['harina-de-almendra'], exclude: [] },
  { nombre: 'Harina leudante', unidad: 'g', keywords: ['harina-leudante'], exclude: [] },
  { nombre: 'Azúcar', unidad: 'g', keywords: ['azucar-ledesma','azucar-comun-tipo'], exclude: ['impalpable','negra','granulada','rubia','mascabo','organica','glasse'] },
  { nombre: 'Azúcar impalpable', unidad: 'g', keywords: ['azucar-impalpable'], exclude: [] },
  { nombre: 'Azucar Negra', unidad: 'g', keywords: ['azucar-negra','azucar-mascabo'], exclude: [] },
  { nombre: 'Cacao', unidad: 'g', keywords: ['cacao-amargo','cacao-en-polvo','cacao-puro'], exclude: ['alcalino','alcalinizado','chocolate'] },
  { nombre: 'Fecula de Mandioca', unidad: 'g', keywords: ['fecula-de-mandioca'], exclude: [] },
  { nombre: 'Manteca', unidad: 'g', keywords: ['manteca-'], exclude: ['cacao'] },
  { nombre: 'Margarina', unidad: 'g', keywords: ['margarina'], exclude: [] },
  { nombre: 'Chips de chocolate', unidad: 'g', keywords: ['chips-de-chocolate','chip-de-chocolate'], exclude: [] },
  { nombre: 'Chocolate', unidad: 'g', keywords: ['chocolate-alpino-pins-con-leche'], exclude: [] },
  { nombre: 'Coco rayado', unidad: 'g', keywords: ['coco-rallado'], exclude: [] },
  { nombre: 'Almedras', unidad: 'g', keywords: ['almendra-'], exclude: ['harina','leche','esencia','aceite'] },
  { nombre: 'Nuez', unidad: 'g', keywords: ['nuez-','nueces-'], exclude: ['moscada','pecan'] },
  { nombre: 'Caju', unidad: 'g', keywords: ['castana-de-caju','castanas-de-caju','caju-'], exclude: [] },
  { nombre: 'Levadura', unidad: 'g', keywords: ['levadura'], exclude: ['nutricional','quimica'] },
  { nombre: 'Polvo de hornear', unidad: 'g', keywords: ['polvo-de-hornear','polvo-leudante'], exclude: [] },
  { nombre: 'Bicarbonato de sodio', unidad: 'g', keywords: ['bicarbonato'], exclude: [] },
  { nombre: 'Gelatina Sin Sabor', unidad: 'g', keywords: ['gelatina-sin-sabor'], exclude: [] },
  { nombre: 'Esencia de vainilla', unidad: 'ml', keywords: ['esencia-de-vainilla'], exclude: [] },
  { nombre: 'Dulce de leche', unidad: 'g', keywords: ['dulce-de-leche-vacalin','dulce-de-leche-el-mundo','dulce-de-leche-milkey'], exclude: ['vegano','alfajorero'] },
  { nombre: 'Crema de leche', unidad: 'g', keywords: ['crema-de-leche'], exclude: ['vegana','vegetal','condensada','chocolate'], allowMlToG: true },
  { nombre: 'LECHE CONDENSADA', unidad: 'g', keywords: ['leche-condensada'], exclude: ['vegana'] },
  { nombre: 'Avena', unidad: 'g', keywords: ['avena-'], exclude: ['leche'] },
  { nombre: 'Nutella', unidad: 'g', keywords: ['nutella'], exclude: [] },
  { nombre: 'Mermelada Frambuesa', unidad: 'g', keywords: ['mermelada-de-frambuesa','mermelada-frambuesa'], exclude: [] },
  { nombre: 'Miel', unidad: 'ml', keywords: ['miel-'], exclude: [], allowGToMl: true },
  { nombre: 'Salvado de trigo', unidad: 'g', keywords: ['salvado-de-trigo'], exclude: [] },
  { nombre: 'Extracto de malta', unidad: 'g', keywords: ['extracto-de-malta'], exclude: [] },
  { nombre: 'Pasta ballina', unidad: 'g', keywords: ['pasta-ballina'], exclude: ['goma','color','chocolate'] },
  { nombre: 'Pasta de goma', unidad: 'g', keywords: ['pasta-de-goma'], exclude: [] },
  { nombre: 'Mix frutos secos', unidad: 'g', keywords: ['mix-de-frutos','mix-frutos'], exclude: [] },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseWeight(slug) {
  let m = slug.match(/por-(\d+)-kilos?/);
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'g' };
  m = slug.match(/x-(\d+)-?kg/);
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'g' };
  m = slug.match(/por-(\d+)-?(?:gramos|grs|g\b)/);
  if (m) return { qty: parseInt(m[1]), unit: 'g' };
  m = slug.match(/x-(\d+)-?(?:gramos|grs|g\b)/);
  if (m) return { qty: parseInt(m[1]), unit: 'g' };
  m = slug.match(/por-(\d+)-litros?/);
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'ml' };
  m = slug.match(/por-(\d+)-?ml/);
  if (m) return { qty: parseInt(m[1]), unit: 'ml' };
  return null;
}

function scoreUrl(url) {
  const slug = url.split('/productos/')[1] || '';
  if (slug.includes('por-1-kilo')) return 100;
  if (slug.includes('x-1-kilo')) return 95;
  if (slug.includes('por-500-')) return 90;
  if (slug.includes('por-250-')) return 80;
  if (slug.includes('por-2-')) return 70;
  if (slug.includes('por-5-')) return 60;
  if (slug.includes('por-10-kilo')) return 50;
  if (slug.includes('por-25-kilo')) return 40;
  return 30;
}

function extractPrice(html) {
  const m = html.match(/"price_number":(\d+)/);
  if (m) return parseInt(m[1]);
  const m2 = html.match(/tiendanube:price"\s+content="(\d+)"/);
  if (m2) return parseInt(m2[1]);
  return null;
}

function extractName(html) {
  const m = html.match(/<meta property="og:title" content="([^"]+)"/);
  return m ? m[1].replace(/&[a-z]+;/g, '').trim() : '';
}

async function main() {
  console.log('Fetching sitemap...');
  const sitemap = await get(SITEMAP_URL);
  const urls = (sitemap.match(/<loc>[^<]+<\/loc>/g) || [])
    .map((s) => s.replace(/<\/?loc>/g, '').trim())
    .filter((u) => u.includes('/productos/'));
  console.log(`Sitemap: ${urls.length} product URLs`);

  const items = [];
  const errors = [];
  for (const q of QUERIES) {
    const cands = urls.filter((u) => {
      const slug = u.split('/productos/')[1] || '';
      if (q.exclude.some((ex) => slug.includes(ex))) return false;
      return q.keywords.some((kw) => slug.includes(kw));
    });
    if (cands.length === 0) {
      errors.push({ nombre: q.nombre, error: 'sin candidatos' });
      continue;
    }
    const best = cands.sort((a, b) => scoreUrl(b) - scoreUrl(a))[0];
    const slug = best.split('/productos/')[1] || '';
    const w = parseWeight(slug);
    if (!w) {
      errors.push({ nombre: q.nombre, error: 'sin peso en slug', url: best });
      continue;
    }
    try {
      const html = await get(best);
      const price = extractPrice(html);
      const name = extractName(html);
      if (!price) {
        errors.push({ nombre: q.nombre, error: 'sin precio en página', url: best });
        continue;
      }
      // Equivalencia g↔ml (crema, miel)
      const unitOk = w.unit === q.unidad
        || (q.allowMlToG && w.unit === 'ml' && q.unidad === 'g')
        || (q.allowGToMl && w.unit === 'g' && q.unidad === 'ml');
      if (!unitOk) {
        errors.push({ nombre: q.nombre, error: `unidad no coincide (granate=${w.unit}, vitu=${q.unidad})`, url: best });
        continue;
      }
      items.push({
        nombre: q.nombre,
        precio: +(price / w.qty).toFixed(4),
        unidad: q.unidad,
        producto: name.replace(/ - Distribuidora.*$/, '').trim(),
        granateQty: w.qty,
        granateUnit: w.unit,
        granatePrecioTotal: price,
        sourceUrl: best,
      });
      console.log(`✓ ${q.nombre}: $${(price / w.qty).toFixed(4)}/${q.unidad}`);
    } catch (e) {
      errors.push({ nombre: q.nombre, error: e.message, url: best });
    }
  }

  const out = {
    generadoEn: new Date().toISOString(),
    fuente: 'Distribuidora El Granate',
    items,
    errores: errors,
  };

  fs.writeFileSync('public/precios_sugeridos.json', JSON.stringify(out, null, 2));
  console.log(`\nGenerado public/precios_sugeridos.json — ${items.length} items, ${errors.length} errores`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
