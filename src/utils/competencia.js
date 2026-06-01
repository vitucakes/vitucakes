// Lógica de match entre recetas de Vitucakes y productos de competencia.
//
// El flujo: cuando el user abre una receta, la app busca en cada competidora
// el producto que más se parece (por nombre), excluyendo los que ya rechazó.
// Si hay un candidato con score arriba del umbral, se le propone confirmar.
//
// El user confirma (queda en `matchesCompetencia` de la receta) o rechaza
// (queda en `rechazadosCompetencia`). Los rechazos persisten — si el cron
// trae un producto NUEVO en la competidora, la app vuelve a proponerlo porque
// ese slug no está en la lista de rechazados.

// Mergea las competidoras "oficiales" (las que vienen del JSON del cron
// semanal) con las "personales" (las que el user agregó desde la app, que
// viven en localStorage). Si hay colisión por id, gana la oficial.
//
// Devuelve un array nuevo, no muta nada.
export function mergeCompetidoras(oficiales = [], extras = []) {
  const oficialesIds = new Set((oficiales ?? []).map((c) => c.id))
  const extrasFiltradas = (extras ?? []).filter((c) => !oficialesIds.has(c.id))
  return [...(oficiales ?? []), ...extrasFiltradas]
}

const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'con',
  'sin',
  'a',
  'al',
  'y',
  'o',
  'en',
  'por',
  'para',
  'un',
  'una',
  'unos',
  'unas',
  'casero',
  'casera',
  'caseros',
  'caseras',
  'rico',
  'rica',
  'mini',
  'grande',
  'chico',
  'chica',
  'torta',
  'tortas',
  // Palabras genéricas de postre: no distinguen un producto de otro, así que
  // no deben generar match por sí solas (ej. "Carrot Cake" vs "Drip Cake").
  'cake',
  'tarta',
  'tartas',
  'pie',
])

// Normaliza un nombre para matching: lowercase, sin tildes, sin puntuación,
// sin stopwords.
function tokens(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    // Descarta stopwords y tokens de tamaño/número (22cm, 20, 2kg, x12…) que no
    // distinguen un producto de otro.
    .filter((t) => t && !STOPWORDS.has(t) && !/^\d/.test(t))
}

// Distancia de Levenshtein normalizada (0 = idénticas, 1 = sin nada en común).
function levRatio(a, b) {
  if (!a && !b) return 0
  if (!a || !b) return 1
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }
  return dp[m][n] / Math.max(m, n)
}

// Score entre 0 y 1 (1 = match perfecto).
// Combina overlap de tokens (más peso) + similitud Levenshtein del nombre normalizado.
export function scoreNombres(a, b) {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const setA = new Set(ta)
  const setB = new Set(tb)
  const inter = [...setA].filter((t) => setB.has(t)).length
  const union = new Set([...setA, ...setB]).size
  const jaccard = union === 0 ? 0 : inter / union
  const lev = 1 - levRatio(ta.join(' '), tb.join(' '))
  return 0.7 * jaccard + 0.3 * lev
}

// Threshold mínimo para mostrar una sugerencia. Si el mejor score está por
// debajo, no se propone nada (mejor "sin equivalente" que un match malo).
export const MATCH_THRESHOLD = 0.3

// Para una receta, devuelve la mejor sugerencia pendiente entre todos los
// productos de todas las competidoras que NO fueron confirmados ni rechazados
// antes. null si no hay candidato bueno.
export function proponerSugerencia(receta, competidoras) {
  const matches = receta.matchesCompetencia ?? []
  const rechazados = receta.rechazadosCompetencia ?? []
  const yaDecidido = (compId, slug) =>
    matches.some((m) => m.competidoraId === compId && m.productoSlug === slug) ||
    rechazados.some((r) => r.competidoraId === compId && r.productoSlug === slug)

  let best = null
  for (const comp of competidoras ?? []) {
    for (const p of comp.productos ?? []) {
      if (yaDecidido(comp.id, p.slug)) continue
      const score = scoreNombres(receta.nombre, p.nombre)
      if (score < MATCH_THRESHOLD) continue
      if (!best || score > best.score) {
        best = {
          competidoraId: comp.id,
          competidoraNombre: comp.nombre,
          productoSlug: p.slug,
          productoNombre: p.nombre,
          productoPrecio: p.precio,
          productoUrl: p.url,
          productoDescripcion: p.descripcion,
          score,
        }
      }
    }
  }
  return best
}

// Devuelve los matches confirmados de una receta, enriquecidos con la info
// del producto de la competencia (precio, url) para mostrar en el detalle.
export function matchesConDetalle(receta, competidoras) {
  const matches = receta.matchesCompetencia ?? []
  return matches
    .map((m) => {
      const comp = competidoras?.find((c) => c.id === m.competidoraId)
      const prod = comp?.productos?.find((p) => p.slug === m.productoSlug)
      if (!comp || !prod) return null
      return {
        competidoraId: comp.id,
        competidoraNombre: comp.nombre,
        productoSlug: prod.slug,
        productoNombre: prod.nombre,
        productoPrecio: prod.precio,
        productoUrl: prod.url,
        productoDescripcion: prod.descripcion,
      }
    })
    .filter(Boolean)
}

// Promedio de precios entre todos los matches confirmados (para mostrar
// "Competencia: $X" cuando hay varias).
export function promedioCompetencia(matches) {
  if (!matches?.length) return 0
  const sum = matches.reduce((s, m) => s + (m.productoPrecio ?? 0), 0)
  return sum / matches.length
}

// Devuelve la lista de recetas que tienen algo pendiente de resolver con la
// competencia: las que NO tienen ningún match confirmado todavía. Cada item
// incluye la mejor sugerencia automática (si la hay) o null para que el user
// la resuelva manual.
//
// Diseño consciente: si Vitu ya confirmó un match para una receta, no
// volvemos a molestarla aunque haya más sugerencias posibles. Esto cumple
// la promesa "ya te lo validé yo, no me lo vuelvas a preguntar".
export function recetasParaResolver(recetas, competidoras) {
  if (!recetas?.length || !competidoras?.length) return []
  return recetas
    .map((receta) => {
      const matches = receta.matchesCompetencia ?? []
      if (matches.length > 0) return null
      return {
        receta,
        sugerencia: proponerSugerencia(receta, competidoras),
      }
    })
    .filter(Boolean)
}

// Devuelve todos los productos de la competencia que esta receta todavía no
// matcheó (ni siquiera rechazó). Útil para la pantalla de "match manual"
// donde el user busca y elige el equivalente cuando los nombres no se parecen
// (ej. 'Lemon pie' ↔ 'Alimonada').
//
// Opcionalmente filtra por un texto de búsqueda (sin acentos, case-insensitive).
export function productosDisponibles(receta, competidoras, search = '') {
  const matches = receta.matchesCompetencia ?? []
  const yaMatcheado = (compId, slug) =>
    matches.some((m) => m.competidoraId === compId && m.productoSlug === slug)

  const norm = (s) =>
    (s ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')

  const q = norm(search.trim())

  const out = []
  for (const comp of competidoras ?? []) {
    for (const p of comp.productos ?? []) {
      if (yaMatcheado(comp.id, p.slug)) continue
      if (q && !norm(p.nombre).includes(q) && !norm(p.descripcion).includes(q)) continue
      out.push({
        competidoraId: comp.id,
        competidoraNombre: comp.nombre,
        productoSlug: p.slug,
        productoNombre: p.nombre,
        productoPrecio: p.precio,
        productoUrl: p.url,
        productoDescripcion: p.descripcion,
      })
    }
  }
  return out
}
