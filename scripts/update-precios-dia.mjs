// Scrapea precios de insumos en Día (supermercado) vía su API pública VTEX y
// genera public/precios_dia.json (mismo formato que precios_sugeridos.json).
//
// "Busca TODOS los insumos en Día": lee la lista REAL de insumos de Vitu desde
// Firestore (lectura pública por reglas) y busca cada uno. Para los staples
// finos hay OVERRIDES con ft/head/exclude a mano; el resto usa match GENÉRICO
// por palabras del nombre. La precedencia El Granate > Día la aplica el cliente,
// no este script: acá comparamos "todo con todo". La regla "no bajar precio"
// también vive en el cliente.
//
// Corre semanalmente vía cron de GitHub Actions.

import fs from 'node:fs';
import https from 'node:https';

const BASE = 'https://diaonline.supermercadosdia.com.ar';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Lista de insumos: Firestore REST (lectura pública). El apiKey no es secreto.
const FIREBASE_KEY = 'AIzaSyB2kU0j2lbbKlNTHalUFPChQW3u0t1cj60';
const INSUMOS_URL = `https://firestore.googleapis.com/v1/projects/vitucakes/databases/(default)/documents/vitucakes/insumos?key=${FIREBASE_KEY}`;

// OVERRIDES: control fino para staples donde el match genérico se equivoca
// (harina 000 vs 0000, azúcar común vs impalpable, verdura fresca vs procesada)
// o productos que el user cuenta por envase (porEnvase). El resto de los insumos
// va por match genérico (significantTokens). nombre = nombre EXACTO en Vitucakes.
const OVERRIDES = [
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
  // Verduras / frutas frescas (Día las vende "x Kg" → parseSize → g).
  { nombre: 'Cebolla', unidad: 'g', ft: 'cebolla', head: ['cebolla'], exclude: ['deshidratada', 'polvo', 'morada', 'verdeo', 'snack', 'congelada', 'cubo', 'frita'] },
  { nombre: 'Tomate', unidad: 'g', ft: 'tomate', head: ['tomate', 'tomates'], exclude: ['cherry', 'triturado', 'pure', 'puré', 'salsa', 'seco', 'deshidratado', 'lata', 'jugo', 'cubeteado', 'perita'] },
  { nombre: 'Tomate cherry', unidad: 'g', ft: 'tomate cherry', head: ['tomate', 'tomates'], include: ['cherry'], exclude: ['seco', 'lata'] },
  { nombre: 'Zanahoria', unidad: 'g', ft: 'zanahoria', head: ['zanahoria', 'zanahorias'], exclude: ['rallada', 'lata', 'deshidratada', 'knorr', 'congelada'] },
  { nombre: 'Manzana Verde', unidad: 'g', ft: 'manzana verde', head: ['manzana', 'manzanas'], include: ['verde'] },
  { nombre: 'remolacha', unidad: 'g', ft: 'remolacha', head: ['remolacha'], exclude: ['lata', 'conserva', 'snack'] },
  { nombre: 'Batata', unidad: 'g', ft: 'batata', head: ['batata', 'batatas'], exclude: ['dulce', 'lata', 'fritas', 'slices', 'chips', 'snack', 'noisette'] },
  { nombre: 'Limas', unidad: 'g', ft: 'lima', head: ['lima', 'limas'], exclude: ['limon', 'limón'] },
  // Carnes / fiambres.
  { nombre: 'carne picada', unidad: 'g', ft: 'carne picada', head: ['carne'], exclude: ['hamburguesa', 'soja', 'vegetal', 'cerdo'] },
  { nombre: 'Pechuga de pollo', unidad: 'g', ft: 'suprema pollo', head: ['suprema', 'pechuga', 'filet'], exclude: ['rebozada', 'milanesa', 'empanada', 'notmila', 'vegetal', 'nuggets'] },
  { nombre: 'Jamón cocido', unidad: 'g', ft: 'jamon cocido', head: ['jamon', 'jamón'], exclude: ['crudo', 'natural', 'pizza'] },
  { nombre: 'bondiola 1kg', unidad: 'g', ft: 'bondiola', head: ['bondiola'], exclude: ['sandwich', 'curada', 'feteada', 'feteado', 'lario', 'cocida'] },
  { nombre: 'grasa', unidad: 'g', ft: 'grasa', head: ['grasa'], exclude: ['cero', 'reducida', 'sin', 'aceite'] },
  // Lácteos.
  { nombre: 'Queso semiduro', unidad: 'g', ft: 'queso cremoso', head: ['queso'], exclude: ['crema', 'rallado', 'untable', 'light', 'fundido', 'feta'] },
  { nombre: 'Queso Mascarpone', unidad: 'g', ft: 'queso mascarpone', head: ['queso', 'mascarpone'], include: ['mascarpone'] },
  // Condimentos / secos.
  { nombre: 'Canela', unidad: 'g', ft: 'canela molida', head: ['canela'], exclude: ['rama', 'palo', 'azucar'] },
  { nombre: 'Oregano', unidad: 'g', ft: 'oregano', head: ['oregano', 'orégano'] },
  { nombre: 'Café Instantaneo', unidad: 'g', ft: 'cafe instantaneo', head: ['cafe', 'café'], exclude: ['saquito', 'molido', 'torrado', 'capsula', 'cápsula', 'descafeinado', 'mixes', 'caramel', 'vainilla', 'capuccino', 'cappuccino'] },
  { nombre: 'Pasas de uva', unidad: 'g', ft: 'pasas de uva', head: ['pasas'], exclude: ['ciruela', 'chocolate', 'bañada', 'yogur'] },
  { nombre: 'Premezcla', unidad: 'g', ft: 'premezcla bizcochuelo', head: ['premezcla'], exclude: ['pan', 'pizza'] },
  // Conservas / pulpas.
  { nombre: 'Mayonesa', unidad: 'g', ft: 'mayonesa', head: ['mayonesa'], exclude: ['light', 'aderezo'] },
  { nombre: 'Salsa de tomate', unidad: 'g', ft: 'salsa de tomate', head: ['salsa'], exclude: ['soja', 'inglesa', 'golf'] },
  { nombre: 'Membrillo', unidad: 'g', ft: 'dulce membrillo', head: ['dulce', 'membrillo'], include: ['membrillo'] },
  { nombre: 'frutos rojos congelados', unidad: 'g', ft: 'frutos rojos congelados', head: ['frutos'], exclude: ['secos'] },
  // Galletitas / golosinas.
  { nombre: 'Oreos', unidad: 'g', ft: 'oreo', head: ['galletitas', 'oreo'], include: ['oreo'] },
  { nombre: 'Chocolinas', unidad: 'g', ft: 'chocolinas', head: ['galletitas', 'chocolinas'], include: ['chocolinas'] },
  { nombre: 'Galletitas lincoln', unidad: 'g', ft: 'lincoln', head: ['galletitas', 'lincoln'], include: ['lincoln'] },
  // Por envase (el user cuenta por lata / botella / tetra → porEnvase).
  { nombre: 'atun', unidad: 'u', ft: 'atun al natural', head: ['atun', 'atún'], exclude: ['aceite', 'ensalada', 'pate', 'paté'], porEnvase: true },
  { nombre: 'Lata de durazno', unidad: 'u', ft: 'durazno', head: ['durazno', 'duraznos'], exclude: ['x kg', 'mermelada', 'pelon', 'pelón', 'damasco', 'ensalada', 'seco', 'orejon'], porEnvase: true },
  { nombre: 'Baggio', unidad: 'u', ft: 'jugo baggio', head: ['jugo', 'baggio'], include: ['baggio'], exclude: ['polvo'], porEnvase: true },
  { nombre: 'Chocolatada 200ml', unidad: 'u', ft: 'chocolatada', include: ['chocolatada'], exclude: ['polvo', 'saquito'], porEnvase: true },
];
const overrideByName = new Map(OVERRIDES.map((o) => [o.nombre, o]));

const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rawGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(rawGet(new URL(res.headers.location, url).href));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

// Día corta conexiones (ECONNRESET) si le pegás muy seguido → reintentos con backoff.
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await rawGet(url);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

// Decodifica el doc Firestore (REST, valores tipados) → [{nombre, unidad}].
function decodeInsumos(raw) {
  const doc = JSON.parse(raw);
  const arr = doc?.fields?.value?.arrayValue?.values || [];
  return arr
    .map((v) => {
      const f = v.mapValue?.fields || {};
      return { nombre: f.nombre?.stringValue ?? '', unidad: f.unidad?.stringValue ?? '' };
    })
    .filter((i) => i.nombre && i.unidad);
}

async function fetchInsumos() {
  return decodeInsumos(await get(INSUMOS_URL));
}

// Parsea el tamaño del paquete desde el nombre del producto → { qty, unit }.
function parseSize(name) {
  const s = norm(name);
  let m;
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo)/))) return { qty: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'g' };
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:grs?|gramos|g)\b/))) return { qty: parseFloat(m[1].replace(',', '.')), unit: 'g' };
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:lt?s?|litros?)\b/))) return { qty: parseFloat(m[1].replace(',', '.')) * 1000, unit: 'ml' };
  if ((m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/))) return { qty: parseFloat(m[1].replace(',', '.')), unit: 'ml' };
  // Vendido "x Kg" / "por Kg" SIN número (verdura fresca, fiambre por kilo) = 1 kg.
  if (/\b(?:x|por)\s*(?:kg|kilo|kilogramo)s?\b/.test(s)) return { qty: 1000, unit: 'g' };
  if (/\b(?:x|por)\s*(?:lt|litro)s?\b/.test(s)) return { qty: 1000, unit: 'ml' };
  if (/media docena/.test(s)) return { qty: 6, unit: 'u' };
  if (/docena/.test(s)) return { qty: 12, unit: 'u' };
  if (/\bmaple\b/.test(s)) return { qty: 30, unit: 'u' };
  if ((m = s.match(/(\d+)\s*(?:ud|uds|unidad|unidades)\b/))) return { qty: parseInt(m[1]), unit: 'u' };
  if ((m = s.match(/(?:x\s*|por\s*)(\d+)\b/))) return { qty: parseInt(m[1]), unit: 'u' };
  return null;
}

// Cuántas "piezas" trae el producto (insumos que el user cuenta por envase).
function parseCount(name) {
  const s = norm(name);
  let m;
  if (/media docena/.test(s)) return 6;
  if (/docena/.test(s)) return 12;
  if (/\bmaple\b/.test(s)) return 30;
  if ((m = s.match(/(\d+)\s*(?:ud|uds|unidad|unidades)\b/))) return parseInt(m[1]);
  if ((m = s.match(/(?:x\s*|por\s*)(\d+)\b/))) return parseInt(m[1]);
  return 1;
}

// Tokens significativos del nombre del insumo (para el match genérico): saca
// stopwords y tokens de tamaño. Sin tokens útiles ⇒ no se busca.
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'por', 'para', 'x', 'y', 'al', 'a', 'en', 'tipo', 'un', 'una']);
function significantTokens(nombre) {
  return norm(nombre)
    .split(/[\s,./]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+(?:[.,]\d+)?(?:kg|kgs|g|gr|grs|gramos|ml|cc|l|lt|lts|litro|litros|u|un)?$/.test(t));
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

// Precio por unidad del insumo, convirtiendo desde el tamaño del producto
// (parseSize devuelve g/ml/u). null si las unidades no son compatibles.
function precioEnUnidad(unidad, size, price, spec) {
  const u = size.unit;
  if (u === unidad) return price / size.qty;
  if (unidad === 'kg' && u === 'g') return price / (size.qty / 1000);
  if (unidad === 'l' && u === 'ml') return price / (size.qty / 1000);
  if (spec?.allowMlToG && unidad === 'g' && u === 'ml') return price / size.qty;
  if (spec?.allowGToMl && unidad === 'ml' && u === 'g') return price / size.qty;
  return null;
}

// Un bulto "x kg" no representa 1 unidad → inútil para insumos contados por pieza.
const BULK_KG = /\b(?:x|por)\s*(?:kg|kilo|kilogramo)s?\b/;

function bestCandidate(insumo, spec, products) {
  const unidad = insumo.unidad;
  const generic = !spec;
  const heads = (spec?.head || []).map(norm);
  const tokens = generic ? significantTokens(insumo.nombre) : null;
  if (generic && !tokens.length) return null;
  const porEnvase = spec ? !!spec.porEnvase : unidad === 'u';

  const cands = [];
  for (const p of products) {
    const n = norm(p.productName);
    if (generic) {
      const words = n.split(/[\s,.()]+/);
      // El producto debe EMPEZAR con la palabra principal del insumo: evita
      // "Ravioles Ricota", "Postre con Rocklets", "Galletitas Frutilla",
      // "Bizcocho con Azúcar Negra", "Té Limón", etc. (contienen la palabra
      // pero son otro producto).
      if (words[0] !== tokens[0] && !n.startsWith(tokens[0] + ' ')) continue;
      // …y además contener TODAS las palabras clave (como palabras enteras, así
      // "000" no matchea "0000").
      if (!tokens.every((t) => words.includes(t))) continue;
    } else {
      if (heads.length && !heads.some((h) => n === h || n.startsWith(h + ' '))) continue;
      if (spec.exclude?.some((k) => n.includes(norm(k)))) continue;
      if (spec.include?.length && !spec.include.every((k) => n.includes(norm(k)))) continue;
    }
    const offer = p.items?.[0]?.sellers?.[0]?.commertialOffer;
    const price = offer?.Price;
    if (!price || price <= 0 || offer.AvailableQuantity === 0) continue;

    let size, precioUnit;
    if (porEnvase) {
      if (unidad !== 'u') continue;
      if (BULK_KG.test(n)) continue; // 1 kg suelto ≠ 1 unidad
      const count = parseCount(p.productName);
      size = { qty: count, unit: 'u' };
      precioUnit = price / count;
    } else {
      size = parseSize(p.productName);
      if (!size) continue;
      precioUnit = precioEnUnidad(unidad, size, price, spec);
      if (precioUnit == null) continue;
    }
    cands.push({ productName: p.productName, price, size, precioUnit });
  }
  if (!cands.length) return null;
  // El más barato por unidad entre los válidos = el insumo "básico".
  return cands.sort((a, b) => a.precioUnit - b.precioUnit)[0];
}

// Unidades que no mapean a productos de súper (cucharadas, tazas, atados).
const SKIP_UNITS = new Set(['cdas', 'cdtas', 'taza', 'atado']);

async function main() {
  let insumos;
  try {
    insumos = await fetchInsumos();
  } catch (e) {
    console.error('No pude leer insumos de Firestore:', e.message);
    process.exit(1);
  }
  console.log(`Insumos leídos de Firestore: ${insumos.length}`);

  const items = [];
  const errores = []; // solo de OVERRIDES (un miss ahí = problema de tuning).
  let autoMiss = 0;
  for (const ins of insumos) {
    if (SKIP_UNITS.has(ins.unidad)) continue;
    const spec = overrideByName.get(ins.nombre);
    const ft = spec ? spec.ft : significantTokens(ins.nombre).join(' ');
    if (!ft) continue;
    try {
      const products = await search(ft);
      const best = bestCandidate(ins, spec, products);
      if (!best) {
        if (spec) errores.push({ nombre: ins.nombre, error: 'sin candidato válido', encontrados: products.length });
        else autoMiss++;
        continue;
      }
      items.push({
        nombre: ins.nombre,
        precio: +best.precioUnit.toFixed(4),
        unidad: ins.unidad,
        producto: best.productName,
        diaQty: best.size.qty,
        diaUnit: best.size.unit,
        diaPrecioTotal: best.price,
        match: spec ? 'curado' : 'auto',
      });
      console.log(`✓ ${ins.nombre}: $${best.precioUnit.toFixed(4)}/${ins.unidad}  (${best.productName})${spec ? '' : '  [auto]'}`);
    } catch (e) {
      errores.push({ nombre: ins.nombre, error: e.message });
    }
    await sleep(120); // throttle suave anti-ECONNRESET
  }

  const out = { generadoEn: new Date().toISOString(), fuente: 'Día', items, errores };
  fs.writeFileSync('public/precios_dia.json', JSON.stringify(out, null, 2));
  const curados = items.filter((i) => i.match === 'curado').length;
  console.log(`\n=> public/precios_dia.json — ${items.length} items (${curados} curados, ${items.length - curados} auto), ${errores.length} errores de override, ${autoMiss} insumos sin match en Día`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
