// Scraper genérico de Tiendanube desde el browser (via proxy CORS).
// Usado para agregar competidoras nuevas en vivo desde la app.
// Mismo patrón que scrapeGranate.js pero genérico (cualquier sitemap de Tiendanube).

const PROXY = 'https://corsproxy.io/?'

const fetchProxied = (url) =>
  fetch(PROXY + encodeURIComponent(url)).then((r) => {
    if (!r.ok) throw new Error(`Proxy ${r.status} para ${url}`)
    return r.text()
  })

const extractPrice = (html) => {
  const m = html.match(/"price_number":(\d+(?:\.\d+)?)/)
  if (m) return Math.round(parseFloat(m[1]))
  const m2 = html.match(/tiendanube:price"\s+content="(\d+(?:\.\d+)?)"/)
  if (m2) return Math.round(parseFloat(m2[1]))
  const m3 = html.match(/<meta\s+property="product:price:amount"\s+content="(\d+(?:\.\d+)?)"/)
  if (m3) return Math.round(parseFloat(m3[1]))
  return null
}

const extractName = (html) => {
  const m = html.match(/<meta property="og:title" content="([^"]+)"/)
  if (!m) return ''
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, '')
    .replace(/\s+-\s+[^-]+$/, '')
    .trim()
}

const extractDescription = (html) => {
  const m = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)
  if (!m) return ''
  return m[1].replace(/&amp;/g, '&').replace(/&[a-z]+;/g, '').trim()
}

const slugFromUrl = (url) => {
  const m = url.match(/\/productos\/([^/]+)/)
  return m ? m[1] : url
}

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

// Intenta detectar una tienda Tiendanube a partir de cualquier URL del catálogo.
// Devuelve la URL del sitemap si es válida, o null si no parece Tiendanube.
//
// Acepta entradas como:
//   - https://candelitte.mitiendanube.com
//   - candelitte.mitiendanube.com/tortas/
//   - https://www.miprovider.com (con dominio propio que usa TN debajo)
export function detectarSitemap(input) {
  let url = (input ?? '').trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  try {
    const u = new URL(url)
    // Tiendanube cuelga el sitemap del root del dominio
    return `${u.protocol}//${u.host}/sitemap.xml`
  } catch {
    return null
  }
}

// Scrapea una tienda Tiendanube.
// - sitemapUrl: URL completa al sitemap.xml
// - excludeSlugs: array de strings; productos cuyo slug contenga alguno se descartan
//   (útil para descartar gift-cards, box-desayunos, etc.)
// - onProgress({ stage, done, total }): callback de progreso
export async function scrapeTiendanube({ sitemapUrl, excludeSlugs = [] }, onProgress) {
  onProgress?.({ stage: 'sitemap', done: 0, total: 0 })
  const sitemap = await fetchProxied(sitemapUrl)
  const urls = (sitemap.match(/<loc>[^<]+<\/loc>/g) || [])
    .map((s) => s.replace(/<\/?loc>/g, '').trim())
    // Solo productos individuales (slug no vacío)
    .filter((u) => /\/productos\/[^/]+\/?$/.test(u))
    .filter((u) => !excludeSlugs.some((ex) => u.includes(ex)))

  if (urls.length === 0) {
    throw new Error('No se encontraron productos en el sitemap. ¿La URL es de una tienda Tiendanube con productos públicos?')
  }

  let done = 0
  const total = urls.length
  onProgress?.({ stage: 'productos', done: 0, total })

  const results = await pool(
    urls.map((url) => async () => {
      const html = await fetchProxied(url)
      const precio = extractPrice(html)
      const nombre = extractName(html)
      const descripcion = extractDescription(html)
      if (!precio || !nombre) {
        return { url, error: !precio ? 'sin precio' : 'sin nombre' }
      }
      return { slug: slugFromUrl(url), nombre, descripcion, precio, url }
    }),
    5,
    () => {
      done++
      onProgress?.({ stage: 'productos', done, total })
    },
  )

  const productos = []
  const errores = []
  for (const r of results) {
    if (r.error) errores.push(r)
    else productos.push(r)
  }
  return { productos, errores }
}
