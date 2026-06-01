// Scrapea precios de insumos en Día (supermercado) vía su API pública VTEX y
// genera public/precios_dia.json con el mismo formato que precios_sugeridos.json
// (El Granate). La regla "no bajar precio" se aplica en el cliente, no acá.
//
// Corre semanalmente vía cron de GitHub Actions (igual que El Granate).
// Para agregar un insumo, sumarlo a QUERIES (nombre = nombre EXACTO en Vitucakes).

import fs from 'node:fs';
import https from 'node:https';

const BASE = 'https://diaonline.supermercadosdia.com.ar';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// nombre = nombre EXACTO del insumo en Vitucakes. ft = término de búsqueda.
// head  = el nombre del producto debe EMPEZAR con alguna de estas palabras
//         (evita falsos positivos: "Figacitas de manteca", "Leche descremada", etc.).
// exclude = términos que descartan. allowMlToG / allowGToMl = equivalencia vol↔peso.
const QUERIES = [
  { nombre: 'Harina 000', unidad: 'g', ft: 'harina 000', head: ['harina'], exclude: ['0000', 'leudante', 'integral', 'almendra', 'garbanzo', 'premezcla'] },
  { nombre: 'Harina 0000', unidad: 'g', ft: 'harina 0000', head: ['harina'], exclude: ['leudante', 'integral'] },
  { nombre: 'Harina leudante', unidad: 'g', ft: 'harina leudante', head: ['harina'], exclude: ['integral'] },
  { nombre: 'Azúcar', unidad: 'g', ft: 'azucar comun', head: ['azucar', 'azúcar'], exclude: ['impalpable', 'negra', 'mascabo', 'rubia', 'glas', 'organica', 'gelificante', 'vainillado'] },
  { nombre: 'Azúcar impalpable', unidad: 'g', ft: 'azucar impalpable', head: ['azucar', 'azúcar'], exclude: [] },
  { nombre: 'Cacao', unidad: 'g', ft: 'cacao', head: ['cacao'], exclude: ['chocolatada', 'azucarado', 'toddy', 'nesquik', 'dulce', 'crema'] },
  { nombre: 'Manteca', unidad: 'g', ft: 'manteca', head: ['manteca'], exclude: ['mani', 'maní', 'cacao'] },
  { nombre: 'Margarina', unidad: 'g', ft: 'margarina', head: ['margarina'], exclude: [] },
  { nombre: 'Leche', unidad: 'ml', ft: 'leche entera larga vida', head: ['leche'], exclude: ['polvo', 'condensada', 'descremada', 'chocolatada'] },
  { nombre: 'Crema de leche', unidad: 'g', ft: 'crema de leche', head: ['crema'], exclude: ['vegana', 'vegetal'], allowMlToG: true },
  { nombre: 'Dulce de leche', unidad: 'g', ft: 'dulce de leche', head: ['dulce'], exclude: ['vegano'] },
  { nombre: 'Leche condensada', unidad: 'g', ft: 'leche condensada', head: ['leche'], exclude: ['vegana'], allowMlToG: true },
  { nombre: 'Sal', unidad: 'g', ft: 'sal fina', head: ['sal'], exclude: ['gruesa', 'parrillera', 'marina', 'rosa', 'apio'] },
  { nombre: 'Aceite', unidad: 'ml', ft: 'aceite girasol', head: ['aceite'], exclude: ['oliva', 'maiz', 'mezcla', 'aerosol'] },
  { nombre: 'Maicena', unidad: 'g', ft: 'maicena', head: ['maicena', 'almidon'], exclude: [] },
  { nombre: 'Polvo de hornear', unidad: 'g', ft: 'polvo para hornear', head: ['polvo'], include: ['hornear'], exclude: [] },
  { nombre: 'Bicarbonato de sodio', unidad: 'g', ft: 'bicarbonato', head: ['bicarbonato'], exclude: [] },
  { nombre: 'Esencia de vainilla', unidad: 'ml', ft: 'esencia vainilla', head: ['esencia'], exclude: [] },
  { nombre: 'Miel', unidad: 'ml', ft: 'miel', head: ['miel'], exclude: ['galletita', 'cereal'], allowGToMl: true },
  { nombre: 'Coco rayado', unidad: 'g', ft: 'coco rallado', head: ['coco'], exclude: ['agua', 'leche', 'aceite'] },
  { nombre: 'Nuez', unidad: 'g', ft: 'nueces', head: ['nuez', 'nueces'], exclude: ['moscada', 'pecan'] },
  { nombre: 'Avena', unidad: 'g', ft: 'avena', head: ['avena'], exclude: ['leche', 'barra', 'galleta'] },
  { nombre: 'Queso Crema', unidad: 'g', ft: 'queso crema', head: ['queso'], exclude: ['light'] },
  { nombre: 'Nutella', unidad: 'g', ft: 'nutella', head: ['nutella', 'pasta'], exclude: [] },
  { nombre: 'Pan rallado', unidad: 'g', ft: 'pan rallado', head: ['pan'], exclude: [] },
  { nombre: 'Huevo', unidad: 'u', ft: 'huevos', head: ['huevo', 'huevos', 'maple'], exclude: ['codorniz', 'chocolate', 'pascua', 'rellenos'] },
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
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

const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Parsea el tamaño del paquete desde el nombre del producto → { qty, unit }.
function parseSize(name) {
  const s = norm(name);
  let m;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/))) return { qty: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'g' };
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:grs?|gramos|g)\b/))) return { qty: parseFloat(m[1].replace(',', '.')), unit: 'g' };
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:lt?s?|litros?)\b/))) return { qty: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'ml' };
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/))) return { qty: parseFloat(m[1].replace(',', '.')), unit: 'ml' };
  if (/media docena/.test(s)) return { qty: 6, unit: 'u' };
  if (/docena/.test(s)) return { qty: 12, unit: 'u' };
  if (/\bmaple\b/.test(s)) return { qty: 30, unit: 'u' };
  if ((m = s.match(/(\d+)\s*(?:ud|uds|unidad|unidades)\b/))) return { qty: parseInt(m[1]), unit: 'u' };
  if ((m = s.match(/(?:x\s*|por\s*)(\d+)\b/))) return { qty: parseInt(m[1]), unit: 'u' };
  return null;
}

async function search(ft) {
  const url = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(ft)}&_from=0&_to=24`;
  const raw = await get(url);
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function bestCandidate(q, products) {
  const heads = (q.head || []).map(norm);
  const cands = [];
  for (const p of products) {
    const n = norm(p.productName);
    // El nombre debe EMPEZAR con el término del insumo (filtro anti-falsos-positivos).
    if (heads.length && !heads.some((h) => n === h || n.startsWith(h + ' '))) continue;
    if (q.exclude?.some((k) => n.includes(norm(k)))) continue;
    if (q.include?.length && !q.include.every((k) => n.includes(norm(k)))) continue;
    const offer = p.items?.[0]?.sellers?.[0]?.commertialOffer;
    const price = offer?.Price;
    if (!price || price <= 0 || offer.AvailableQuantity === 0) continue;
    const size = parseSize(p.productName);
    if (!size) continue;
    const unitOk =
      size.unit === q.unidad ||
      (q.allowMlToG && size.unit === 'ml' && q.unidad === 'g') ||
      (q.allowGToMl && size.unit === 'g' && q.unidad === 'ml');
    if (!unitOk) continue;
    cands.push({ productName: p.productName, price, size, precioUnit: price / size.qty });
  }
  if (!cands.length) return null;
  // El más barato por unidad entre los válidos = el insumo "básico".
  return cands.sort((a, b) => a.precioUnit - b.precioUnit)[0];
}

async function main() {
  const items = [];
  const errores = [];
  for (const q of QUERIES) {
    try {
      const products = await search(q.ft);
      const best = bestCandidate(q, products);
      if (!best) {
        errores.push({ nombre: q.nombre, error: 'sin candidato válido', encontrados: products.length });
        continue;
      }
      items.push({
        nombre: q.nombre,
        precio: +best.precioUnit.toFixed(4),
        unidad: q.unidad,
        producto: best.productName,
        diaQty: best.size.qty,
        diaUnit: best.size.unit,
        diaPrecioTotal: best.price,
      });
      console.log(`✓ ${q.nombre}: $${best.precioUnit.toFixed(4)}/${q.unidad}  (${best.productName} = $${best.price})`);
    } catch (e) {
      errores.push({ nombre: q.nombre, error: e.message });
    }
  }

  const out = { generadoEn: new Date().toISOString(), fuente: 'Día', items, errores };
  fs.writeFileSync('public/precios_dia.json', JSON.stringify(out, null, 2));
  console.log(`\n=> public/precios_dia.json — ${items.length} items, ${errores.length} errores`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
