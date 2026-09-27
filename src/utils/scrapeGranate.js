// Scraping de Distribuidora El Granate desde el browser, vía proxy CORS público.
// Usado por el botón "Actualizar precios manualmente". Si el proxy falla,
// la app cae al precios_sugeridos.json generado por el cron semanal.
//
// El Granate migró de Tiendanube a **Odoo eCommerce** (~2026-05). URLs ahora son
// /shop/<ref>-<slug>-<idOdoo> y el precio (con IVA) vive en
// <span itemprop="price">11000.0</span>. Mantener en sync con scripts/update-prices.mjs.

const PROXY = 'https://corsproxy.io/?'
const SITEMAP_URL = 'https://www.distribuidoraelgranate.com.ar/sitemap.xml'

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
  // ── Agregados 2026-09-27: insumos que El Granate SÍ vende y no se buscaban
  // (el user los compra ahí; sin esto caían en Día). Nombres EXACTOS del insumo.
  { nombre: 'Oreos', unidad: 'g', keywords: ['oreos'], exclude: [] },
  { nombre: 'Chocolinas', unidad: 'g', keywords: ['chocolinas'], exclude: ['blancas'] },
  { nombre: 'Galletitas lincoln', unidad: 'g', keywords: ['galletitas-lincoln'], exclude: [] },
  { nombre: 'Queso Crema', unidad: 'g', keywords: ['queso-crema'], exclude: ['milkaut','290grs','doble-crema'] }, // La Paulina 4 kg (el user compra 4 kg)
  { nombre: 'Cacao alcalino', unidad: 'g', keywords: ['cacao-amargo-alcalino','alcalino'], exclude: [] },
  { nombre: 'Canela', unidad: 'g', keywords: ['canela-'], exclude: ['esencia','rama'] },
  { nombre: 'Cebolla deshidratada', unidad: 'g', keywords: ['cebolla-deshidratada'], exclude: [] },
  { nombre: 'Oregano', unidad: 'g', keywords: ['oregano'], exclude: [] },
  { nombre: 'Pan rallado', unidad: 'g', keywords: ['pan-rallado'], exclude: [] },
  { nombre: 'Pasas de uva', unidad: 'g', keywords: ['pasas-de-uva'], exclude: ['cobertura','chocolate'] },
  { nombre: 'Albúmina', unidad: 'g', keywords: ['albumina'], exclude: [] },
  { nombre: 'LECHE CONDENSADA', unidad: 'g', keywords: ['leche-condensada'], exclude: ['vegana'] }, // insumo duplicado de "Leche condensada"
  { nombre: 'Membrillo', unidad: 'g', keywords: ['dulce-de-membrillo'], exclude: [] },
  { nombre: 'Rocklets', unidad: 'g', keywords: ['rocklets'], exclude: ['mini'] },
  { nombre: 'Frambuesas', unidad: 'g', keywords: ['frambuesas-congeladas'], exclude: [] },
  { nombre: 'Cerezas', unidad: 'g', keywords: ['cerezas-'], exclude: ['fruta-escurrida','quinotos'] },
  { nombre: 'Aceite', unidad: 'ml', keywords: ['aceite-natura','aceite-de-girasol'], exclude: ['oliva','aerosol'] },
  { nombre: 'Sal', unidad: 'g', keywords: ['sal-fina'], exclude: [] },
  { nombre: 'Leche', unidad: 'ml', keywords: ['leche-entera'], exclude: [] },
  { nombre: 'Mayonesa', unidad: 'g', keywords: ['mayonesa'], exclude: [] },
  // ── Agregados 2026-09-27 (2da tanda): revisados los 124 insumos restantes.
  { nombre: 'Maicena', unidad: 'g', keywords: ['almidon-de-maiz'], exclude: [] },
  { nombre: 'frutos rojos congelados', unidad: 'g', keywords: ['frutos-del-bosque-congelados'], exclude: [] },
  { nombre: 'granas de color', unidad: 'g', keywords: ['granas-'], exclude: [] },
  { nombre: 'Azúcar granulada', unidad: 'g', keywords: ['azucar-granella'], exclude: [] }, // la de la rosca de pascua
  { nombre: 'Ricota', unidad: 'g', keywords: ['ricotta','ricota'], exclude: [] },
  { nombre: 'Frutas abrillantadas', unidad: 'g', keywords: ['fruta-escurrida'], exclude: [] }, // pan dulce / budín inglés
  { nombre: 'Rocklets Argentina', unidad: 'g', keywords: ['rocklets'], exclude: ['mini'] },
  { nombre: 'Crema de chocolate', unidad: 'g', keywords: ['crema-ledevit-chocolate'], exclude: [], allowMlToG: true }, // tortas Ferrero; Vitu usa Ledevit
  { nombre: 'grasa', unidad: 'g', keywords: ['grasa-ramgras'], exclude: [] },
  // Por UNIDAD: `porEnvase` = cada producto es 1 u (una lata); si el slug dice
  // "N-unidades" se divide por N (Ferrero x3 → precio por bombón).
  { nombre: 'Lata de durazno', unidad: 'u', keywords: ['duraznos-por'], exclude: [], porEnvase: true },
  { nombre: 'atun', unidad: 'u', keywords: ['atun-en-aceite','atun-desmenuzado'], exclude: [], porEnvase: true },
  { nombre: 'Ferrero rocher', unidad: 'u', keywords: ['ferrero-rocher'], exclude: [] },
]

const fetchProxied = (url) => fetch(PROXY + encodeURIComponent(url)).then((r) => {
  if (!r.ok) throw new Error(`Proxy ${r.status} para ${url}`)
  return r.text()
})

// El slug de Odoo es todo lo que va después de /shop/ (incluye ref numérica al
// inicio y el id de Odoo al final; el peso va en el medio, ej. "por-1-kg").
const slugOf = (url) => url.split('/shop/')[1] || ''

// Insumos contados por unidad ('u'): la cantidad sale del slug ("ferrero-rocher-3-unidades")
// o, con `porEnvase`, cada producto vale 1 u (una lata de duraznos = 1 u).
const parseUnidades = (q, slug) => {
  const m = slug.match(/(?:por-|x-)?(\d+)-unidades\b/)
  if (m) return { qty: parseInt(m[1]), unit: 'u' }
  if (q.porEnvase) return { qty: 1, unit: 'u' }
  return null
}

const parseWeight = (slug) => {
  // kilos / litros decimales: "por-2-5-kg" = 2,5 kg
  let m = slug.match(/(?:por-|x-)?(\d+)-(\d+)-(?:kilos?|kg)\b/)
  if (m) return { qty: parseFloat(`${m[1]}.${m[2]}`) * 1000, unit: 'g' }
  m = slug.match(/(?:por-|x-)?(\d+)-(\d+)-litros?\b/)
  if (m) return { qty: parseFloat(`${m[1]}.${m[2]}`) * 1000, unit: 'ml' }
  // kilos / kg con número
  m = slug.match(/(?:por-|x-)?(\d+)-?(?:kilos?|kg)\b/)
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'g' }
  // gramos / grs / g con número
  m = slug.match(/(?:por-|x-)?(\d+)-?(?:gramos|grs|g)\b/)
  if (m) return { qty: parseInt(m[1]), unit: 'g' }
  // litros con número
  m = slug.match(/(?:por-|x-)?(\d+)-?litros?\b/)
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'ml' }
  // cc / ml con número
  m = slug.match(/(?:por-|x-)?(\d+)-?(?:cc|ml)\b/)
  if (m) return { qty: parseInt(m[1]), unit: 'ml' }
  // "por kilo" / "por kg" SIN número = 1 kg
  if (/por-kilos?\b/.test(slug) || /por-kg\b/.test(slug)) return { qty: 1000, unit: 'g' }
  // "por litro" SIN número = 1 litro
  if (/por-litros?\b/.test(slug)) return { qty: 1000, unit: 'ml' }
  return null
}

// Preferimos tamaños retail (1 kg / 500 g / 1 l) sobre bultos mayoristas.
const scoreUrl = (url) => {
  const slug = slugOf(url)
  if (/(?:por-)?1-(?:kilo|kg)\b/.test(slug) || /por-kilos?\b/.test(slug) || /por-kg\b/.test(slug)) return 100
  if (/por-1-litro\b/.test(slug) || /por-litros?\b/.test(slug)) return 98
  if (/500-?(?:grs|gramos|g|cc)\b/.test(slug)) return 90
  if (/250-?(?:grs|gramos|g|cc)\b/.test(slug)) return 80
  if (/(?:por-|x-)?2-(?:kg|kilo|litros?)\b/.test(slug)) return 70
  if (/(?:por-|x-)?3-(?:kg|kilo|litros?)\b/.test(slug)) return 65
  if (/(?:por-|x-)?5-(?:kg|kilo|litros?)\b/.test(slug)) return 60
  return 30 // bultos 10/15/20/50 kg
}

const parsePrice = (raw) => {
  raw = String(raw).trim()
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

const extractPrice = (html) => {
  // Odoo: span oculto con el precio limpio (con IVA), ej. <span itemprop="price">11000.0</span>
  let m = html.match(/itemprop="price"[^>]*>\s*([\d.,]+)\s*</)
  if (m) return parsePrice(m[1])
  // Fallback: primer oe_currency_value (precio mostrado, con IVA, formato AR)
  m = html.match(/oe_currency_value">\s*([\d.,]+)/)
  if (m) return parsePrice(m[1])
  return null
}

const extractName = (html) => {
  const m = html.match(/<meta property="og:title" content="([^"]+)"/)
  return m ? m[1].replace(/&[a-z]+;/g, '').trim() : ''
}

// Run promises in parallel pool of size `concurrency`
const pool = async (jobs, concurrency, onItemDone) => {
  const results = []
  let i = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < jobs.length) {
      const idx = i++
      try {
        results[idx] = await jobs[idx]()
      } catch (e) {
        results[idx] = { error: e.message }
      }
      onItemDone?.()
    }
  })
  await Promise.all(workers)
  return results
}

// Cuántos candidatos probar por insumo antes de rendirse (agotados con precio 0,
// otra unidad, etc.). Se prueban en orden de score (retail primero).
const MAX_TRY = 6

export async function scrapeGranate(onProgress) {
  onProgress?.({ stage: 'sitemap', done: 0, total: QUERIES.length })

  const sitemap = await fetchProxied(SITEMAP_URL)
  const urls = (sitemap.match(/<loc>[^<]+<\/loc>/g) || [])
    .map((s) => s.replace(/<\/?loc>/g, '').trim())
    .filter((u) => u.includes('/shop/') && !u.includes('/shop/category/'))

  let done = 0
  const total = QUERIES.length

  // Un job por insumo: filtra candidatos, los ordena por score y prueba en
  // orden hasta dar con uno que tenga peso parseable, unidad compatible y precio.
  const resolved = await pool(QUERIES.map((q) => async () => {
    const cands = urls
      .filter((u) => {
        const slug = slugOf(u)
        if (q.exclude.some((ex) => slug.includes(ex))) return false
        return q.keywords.some((kw) => slug.includes(kw))
      })
      .sort((a, b) => scoreUrl(b) - scoreUrl(a))
    if (cands.length === 0) return { q, error: 'sin candidatos' }

    let lastErr = null
    for (const url of cands.slice(0, MAX_TRY)) {
      const w = q.unidad === 'u' ? parseUnidades(q, slugOf(url)) : parseWeight(slugOf(url))
      if (!w) { lastErr = { error: q.unidad === 'u' ? 'sin cantidad de unidades' : 'sin peso en slug', url }; continue }
      const unitOk = w.unit === q.unidad
        || (q.allowMlToG && w.unit === 'ml' && q.unidad === 'g')
        || (q.allowGToMl && w.unit === 'g' && q.unidad === 'ml')
      if (!unitOk) { lastErr = { error: 'unidad no coincide', url }; continue }
      let html
      try {
        html = await fetchProxied(url)
      } catch (e) {
        lastErr = { error: e.message, url }
        continue
      }
      const price = extractPrice(html)
      if (!price) { lastErr = { error: 'sin precio en página (¿agotado?)', url }; continue }
      return { q, url, weight: w, price, name: extractName(html) }
    }
    return { q, ...lastErr }
  }), 5, () => {
    done++
    onProgress?.({ stage: 'pages', done, total })
  })

  const items = []
  const errores = []
  for (const r of resolved) {
    const q = r.q
    if (!r || r.error) { errores.push({ nombre: q?.nombre, error: r?.error || 'desconocido', url: r?.url }); continue }
    items.push({
      nombre: q.nombre,
      precio: +(r.price / r.weight.qty).toFixed(4),
      unidad: q.unidad,
      producto: r.name.replace(/ [|\-] Distribuidora.*$/, '').trim(),
      granateQty: r.weight.qty,
      granateUnit: r.weight.unit,
      granatePrecioTotal: r.price,
      sourceUrl: r.url,
    })
  }

  return {
    generadoEn: new Date().toISOString(),
    fuente: 'Distribuidora El Granate (manual)',
    items,
    errores,
  }
}
