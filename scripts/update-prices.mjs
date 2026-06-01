// Scrapea precios de Distribuidora El Granate y genera public/precios_sugeridos.json
// con sugerencias de actualización. La regla "no bajar precio" se aplica en el
// cliente (App), no acá: este script entrega TODOS los precios encontrados.
//
// El Granate migró de Tiendanube a **Odoo eCommerce** (~2026-05). URLs ahora son
// /shop/<ref>-<slug>-<idOdoo> (ej. /shop/1575-chocolate-alpino-pins-con-leche-por-1-kg-4592)
// y el precio (con IVA) vive en <span itemprop="price">11000.0</span>.

import fs from 'node:fs';
import https from 'node:https';

const SITEMAP_URL = 'https://www.distribuidoraelgranate.com.ar/sitemap.xml';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Mapping: nombre exacto del insumo en Vitucakes → cómo encontrarlo en El Granate.
// `keywords` = substrings que debe contener el slug (todo lo que va después de /shop/).
// Si el insumo del user usa una unidad equivalente (g↔ml, ej. crema y miel),
// el precio se asigna sin conversión (allowMlToG / allowGToMl).
const QUERIES = [
  { nombre: 'Harina 000', unidad: 'g', keywords: ['harina-000-'], exclude: ['0000','almendras','garbanzos','salvado','semolin','malta','leudante','reposteria','integral'] },
  { nombre: 'Harina 0000', unidad: 'g', keywords: ['harina-0000'], exclude: ['leudante','reposteria','integral'] },
  { nombre: 'Harina de almendras', unidad: 'g', keywords: ['harina-de-almendra'], exclude: [] },
  { nombre: 'Harina leudante', unidad: 'g', keywords: ['harina-leudante'], exclude: [] },
  { nombre: 'Azúcar', unidad: 'g', keywords: ['azucar-ledesma','azucar-comun-tipo','azucar-refinada'], exclude: ['impalpable','negra','granulada','granella','rubio','rubia','mascabo','organica','glasse','antihumedad'] },
  { nombre: 'Azúcar impalpable', unidad: 'g', keywords: ['azucar-impalpable'], exclude: [] },
  { nombre: 'Azucar Negra', unidad: 'g', keywords: ['azucar-negra','azucar-mascabo'], exclude: [] },
  { nombre: 'Cacao', unidad: 'g', keywords: ['cacao-fenix-56n','cacao-especial','cacao-amargo','cacao-en-polvo'], exclude: ['alcalino','alcalinizado','chocolate','manteca','nesquik'] },
  { nombre: 'Fecula de Mandioca', unidad: 'g', keywords: ['fecula-de-mandioca'], exclude: [] },
  { nombre: 'Manteca', unidad: 'g', keywords: ['manteca-'], exclude: ['cacao','aroma','kolaroma','esencia'] },
  { nombre: 'Margarina', unidad: 'g', keywords: ['margarina','oleomargarina'], exclude: [] },
  { nombre: 'Chips de chocolate', unidad: 'g', keywords: ['chips-'], exclude: ['blanco'] },
  { nombre: 'Chocolate', unidad: 'g', keywords: ['chocolate-alpino-pins-con-leche'], exclude: [] },
  { nombre: 'Coco rayado', unidad: 'g', keywords: ['coco-rallado'], exclude: [] },
  { nombre: 'Almedras', unidad: 'g', keywords: ['almendras-'], exclude: ['harina','leche','esencia','aceite','chocolate','garrapinada','pasta'] },
  { nombre: 'Nuez', unidad: 'g', keywords: ['nuez-','nueces-'], exclude: ['moscada','pecan','cascara'] },
  { nombre: 'Caju', unidad: 'g', keywords: ['castana-de-caju','castanas-de-caju','caju-'], exclude: [] },
  { nombre: 'Levadura', unidad: 'g', keywords: ['levadura'], exclude: ['nutricional','quimica'] },
  { nombre: 'Polvo de hornear', unidad: 'g', keywords: ['polvo-para-hornear','polvo-de-hornear','polvo-leudante'], exclude: [] },
  { nombre: 'Bicarbonato de sodio', unidad: 'g', keywords: ['bicarbonato'], exclude: ['amonio'] },
  { nombre: 'Gelatina Sin Sabor', unidad: 'g', keywords: ['gelatina-sin-sabor'], exclude: [] },
  { nombre: 'Esencia de vainilla', unidad: 'ml', keywords: ['esencia-de-vainilla'], exclude: [] },
  { nombre: 'Dulce de leche', unidad: 'g', keywords: ['dulce-de-leche-vacalin','dulce-de-leche-el-mundo','dulce-de-leche-milkey'], exclude: ['vegano','alfajorero'] },
  { nombre: 'Crema de leche', unidad: 'g', keywords: ['crema-de-leche'], exclude: ['vegana','vegetal','condensada','chocolate'], allowMlToG: true },
  { nombre: 'Leche condensada', unidad: 'g', keywords: ['leche-condensada'], exclude: ['vegana'] },
  { nombre: 'Avena', unidad: 'g', keywords: ['avena-'], exclude: ['leche'] },
  { nombre: 'Nutella', unidad: 'g', keywords: ['nutella'], exclude: [] },
  { nombre: 'Mermelada Frambuesa', unidad: 'g', keywords: ['mermelada-de-frambuesa','mermelada-frambuesa'], exclude: [] },
  { nombre: 'Miel', unidad: 'ml', keywords: ['miel-'], exclude: [], allowGToMl: true },
  { nombre: 'Salvado de trigo', unidad: 'g', keywords: ['salvado-de-trigo','salvado-chacabuco','salvado'], exclude: ['avena'] },
  { nombre: 'Extracto de malta', unidad: 'g', keywords: ['extracto-de-malta'], exclude: [] },
  { nombre: 'Pasta ballina', unidad: 'g', keywords: ['pasta-ballina'], exclude: ['goma','color','chocolate','cacao'] },
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

// El slug de Odoo es todo lo que va después de /shop/ (incluye ref numérica al
// inicio y el id de Odoo al final; el peso va en el medio, ej. "por-1-kg").
function slugOf(url) {
  return url.split('/shop/')[1] || '';
}

function parseWeight(slug) {
  // kilos decimales: "por-2-5-kg" = 2,5 kg (Odoo slugifica la coma como guion)
  let m = slug.match(/(?:por-|x-)?(\d+)-(\d+)-(?:kilos?|kg)\b/);
  if (m) return { qty: parseFloat(`${m[1]}.${m[2]}`) * 1000, unit: 'g' };
  // litros decimales: "por-1-5-litros" = 1,5 l
  m = slug.match(/(?:por-|x-)?(\d+)-(\d+)-litros?\b/);
  if (m) return { qty: parseFloat(`${m[1]}.${m[2]}`) * 1000, unit: 'ml' };
  // kilos / kg, con o sin "por"/"x", con número
  m = slug.match(/(?:por-|x-)?(\d+)-?(?:kilos?|kg)\b/);
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'g' };
  // gramos / grs / g, con número (ej. por-500-grs, por-90grs, x-100grs)
  m = slug.match(/(?:por-|x-)?(\d+)-?(?:gramos|grs|g)\b/);
  if (m) return { qty: parseInt(m[1]), unit: 'g' };
  // litros, con número
  m = slug.match(/(?:por-|x-)?(\d+)-?litros?\b/);
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'ml' };
  // cc / ml, con número (ej. por-500cc, por-30cc)
  m = slug.match(/(?:por-|x-)?(\d+)-?(?:cc|ml)\b/);
  if (m) return { qty: parseInt(m[1]), unit: 'ml' };
  // "por kilo" / "por kg" SIN número = 1 kg
  if (/por-kilos?\b/.test(slug) || /por-kg\b/.test(slug)) return { qty: 1000, unit: 'g' };
  // "por litro" SIN número = 1 litro
  if (/por-litros?\b/.test(slug)) return { qty: 1000, unit: 'ml' };
  return null;
}

// Preferimos tamaños retail (1 kg / 500 g / 1 l) sobre bultos mayoristas.
function scoreUrl(url) {
  const slug = slugOf(url);
  if (/(?:por-)?1-(?:kilo|kg)\b/.test(slug) || /por-kilos?\b/.test(slug) || /por-kg\b/.test(slug)) return 100;
  if (/por-1-litro\b/.test(slug) || /por-litros?\b/.test(slug)) return 98;
  if (/500-?(?:grs|gramos|g|cc)\b/.test(slug)) return 90;
  if (/250-?(?:grs|gramos|g|cc)\b/.test(slug)) return 80;
  if (/(?:por-|x-)?2-(?:kg|kilo|litros?)\b/.test(slug)) return 70;
  if (/(?:por-|x-)?3-(?:kg|kilo|litros?)\b/.test(slug)) return 65;
  if (/(?:por-|x-)?5-(?:kg|kilo|litros?)\b/.test(slug)) return 60;
  return 30; // bultos 10/15/20/50 kg
}

function parsePrice(raw) {
  raw = String(raw).trim();
  // Formato AR (11.000,00): saca separador de miles y pasa coma a punto.
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function extractPrice(html) {
  // Odoo: span oculto con el precio limpio (con IVA), ej. <span itemprop="price">11000.0</span>
  let m = html.match(/itemprop="price"[^>]*>\s*([\d.,]+)\s*</);
  if (m) return parsePrice(m[1]);
  // Fallback: primer oe_currency_value (precio mostrado, con IVA, formato AR)
  m = html.match(/oe_currency_value">\s*([\d.,]+)/);
  if (m) return parsePrice(m[1]);
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
    .filter((u) => u.includes('/shop/') && !u.includes('/shop/category/'));
  console.log(`Sitemap: ${urls.length} product URLs`);

  // Cuántos candidatos probar por insumo antes de rendirse. Algunos productos
  // están agotados (precio 0) o tienen otra unidad; probamos en orden de score
  // (retail primero) hasta dar con uno que tenga precio válido.
  const MAX_TRY = 6;

  const items = [];
  const errors = [];
  for (const q of QUERIES) {
    const cands = urls
      .filter((u) => {
        const slug = slugOf(u);
        if (q.exclude.some((ex) => slug.includes(ex))) return false;
        return q.keywords.some((kw) => slug.includes(kw));
      })
      .sort((a, b) => scoreUrl(b) - scoreUrl(a));
    if (cands.length === 0) {
      errors.push({ nombre: q.nombre, error: 'sin candidatos' });
      continue;
    }

    let chosen = null;
    let lastErr = null;
    for (const url of cands.slice(0, MAX_TRY)) {
      const w = parseWeight(slugOf(url));
      if (!w) { lastErr = { error: 'sin peso en slug', url }; continue; }
      // Equivalencia g↔ml (crema, miel)
      const unitOk = w.unit === q.unidad
        || (q.allowMlToG && w.unit === 'ml' && q.unidad === 'g')
        || (q.allowGToMl && w.unit === 'g' && q.unidad === 'ml');
      if (!unitOk) { lastErr = { error: `unidad no coincide (granate=${w.unit}, vitu=${q.unidad})`, url }; continue; }
      let html;
      try {
        html = await get(url);
      } catch (e) {
        lastErr = { error: e.message, url };
        continue;
      }
      const price = extractPrice(html);
      if (!price) { lastErr = { error: 'sin precio en página (¿agotado?)', url }; continue; }
      chosen = { url, w, price, name: extractName(html) };
      break;
    }

    if (!chosen) {
      errors.push({ nombre: q.nombre, ...lastErr });
      continue;
    }

    items.push({
      nombre: q.nombre,
      precio: +(chosen.price / chosen.w.qty).toFixed(4),
      unidad: q.unidad,
      producto: chosen.name.replace(/ [|\-] Distribuidora.*$/, '').trim(),
      granateQty: chosen.w.qty,
      granateUnit: chosen.w.unit,
      granatePrecioTotal: chosen.price,
      sourceUrl: chosen.url,
    });
    console.log(`✓ ${q.nombre}: $${(chosen.price / chosen.w.qty).toFixed(4)}/${q.unidad}  (${chosen.name})`);
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
