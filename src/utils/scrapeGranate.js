// Scraping de Distribuidora El Granate desde el browser, vía proxy CORS público.
// Usado por el botón "Actualizar precios manualmente". Si el proxy falla,
// la app cae al precios_sugeridos.json generado por el cron semanal.

const PROXY = 'https://corsproxy.io/?'
const SITEMAP_URL = 'https://www.distribuidoraelgranate.com.ar/sitemap.xml'

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
]

const fetchProxied = (url) => fetch(PROXY + encodeURIComponent(url)).then((r) => {
  if (!r.ok) throw new Error(`Proxy ${r.status} para ${url}`)
  return r.text()
})

const parseWeight = (slug) => {
  let m = slug.match(/por-(\d+)-kilos?/)
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'g' }
  m = slug.match(/x-(\d+)-?kg/)
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'g' }
  m = slug.match(/por-(\d+)-?(?:gramos|grs|g\b)/)
  if (m) return { qty: parseInt(m[1]), unit: 'g' }
  m = slug.match(/x-(\d+)-?(?:gramos|grs|g\b)/)
  if (m) return { qty: parseInt(m[1]), unit: 'g' }
  m = slug.match(/por-(\d+)-litros?/)
  if (m) return { qty: parseInt(m[1]) * 1000, unit: 'ml' }
  m = slug.match(/por-(\d+)-?ml/)
  if (m) return { qty: parseInt(m[1]), unit: 'ml' }
  return null
}

const scoreUrl = (url) => {
  const slug = url.split('/productos/')[1] || ''
  if (slug.includes('por-1-kilo')) return 100
  if (slug.includes('x-1-kilo')) return 95
  if (slug.includes('por-500-')) return 90
  if (slug.includes('por-250-')) return 80
  if (slug.includes('por-2-')) return 70
  if (slug.includes('por-5-')) return 60
  if (slug.includes('por-10-kilo')) return 50
  if (slug.includes('por-25-kilo')) return 40
  return 30
}

const extractPrice = (html) => {
  const m = html.match(/"price_number":(\d+)/)
  if (m) return parseInt(m[1])
  const m2 = html.match(/tiendanube:price"\s+content="(\d+)"/)
  if (m2) return parseInt(m2[1])
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

export async function scrapeGranate(onProgress) {
  onProgress?.({ stage: 'sitemap', done: 0, total: QUERIES.length })

  const sitemap = await fetchProxied(SITEMAP_URL)
  const urls = (sitemap.match(/<loc>[^<]+<\/loc>/g) || [])
    .map((s) => s.replace(/<\/?loc>/g, '').trim())
    .filter((u) => u.includes('/productos/'))

  // Resolve best URL per query (no fetch yet)
  const targets = QUERIES.map((q) => {
    const cands = urls.filter((u) => {
      const slug = u.split('/productos/')[1] || ''
      if (q.exclude.some((ex) => slug.includes(ex))) return false
      return q.keywords.some((kw) => slug.includes(kw))
    })
    if (cands.length === 0) return { q, error: 'sin candidatos' }
    const best = cands.sort((a, b) => scoreUrl(b) - scoreUrl(a))[0]
    const slug = best.split('/productos/')[1] || ''
    const w = parseWeight(slug)
    if (!w) return { q, url: best, error: 'sin peso en slug' }
    return { q, url: best, weight: w }
  })

  let done = 0
  const total = targets.length
  const fetched = await pool(targets.map((t) => async () => {
    if (t.error) return t
    const html = await fetchProxied(t.url)
    return { ...t, html }
  }), 5, () => {
    done++
    onProgress?.({ stage: 'pages', done, total })
  })

  const items = []
  const errores = []
  for (const t of fetched) {
    const q = t.q
    if (t.error) { errores.push({ nombre: q.nombre, error: t.error, url: t.url }); continue }
    const price = extractPrice(t.html)
    const name = extractName(t.html)
    if (!price) { errores.push({ nombre: q.nombre, error: 'sin precio en página', url: t.url }); continue }
    const unitOk = t.weight.unit === q.unidad
      || (q.allowMlToG && t.weight.unit === 'ml' && q.unidad === 'g')
      || (q.allowGToMl && t.weight.unit === 'g' && q.unidad === 'ml')
    if (!unitOk) { errores.push({ nombre: q.nombre, error: `unidad no coincide`, url: t.url }); continue }
    items.push({
      nombre: q.nombre,
      precio: +(price / t.weight.qty).toFixed(4),
      unidad: q.unidad,
      producto: name.replace(/ - Distribuidora.*$/, '').trim(),
      granateQty: t.weight.qty,
      granateUnit: t.weight.unit,
      granatePrecioTotal: price,
      sourceUrl: t.url,
    })
  }

  return {
    generadoEn: new Date().toISOString(),
    fuente: 'Distribuidora El Granate (manual)',
    items,
    errores,
  }
}
