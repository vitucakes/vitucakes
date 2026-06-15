// Papelería / packaging: marcar qué insumos son packaging (cajas, bandejas,
// bolsas…) y detectar productos cuya receta NO incluye ninguno.
//
// El set "oficial" de papelería son los insumos con `esPapeleria === true`
// (lo confirma el user en MarcarPapeleriaPage). La detección por nombre de
// abajo SOLO se usa para PRE-tildar esa pantalla; no decide el aviso por sí
// sola (así no se equivoca con 'tapa de empanada' ni se pierde 'Bloda').

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const KEYWORDS = [
  'caja', 'bandeja', 'bolsa', 'bolsit', 'blonda', 'bloda', 'papel', 'film',
  'pirotin', 'carton', 'cartulina', 'cinta', 'mono', 'lazo', 'celofan', 'sobre',
  'vaso', 'servilleta', 'palito', 'brocheta', 'stick', 'etiqueta', 'sticker',
  'tag', 'tarjeta', 'separador', 'contenedor', 'pote', 'frasco', 'disco',
  'manga', 'globo', 'cuchara', 'vela', 'tul', 'pinche', 'viruta', 'budinera',
]

// ¿El nombre parece papelería? (solo para sugerir en la pantalla de marcado)
export const esPapeleriaAuto = (nombre) => {
  const n = norm(nombre)
  return KEYWORDS.some((k) => n.includes(k))
}

// Estado inicial del check en la pantalla de marcado: si el insumo ya tiene
// `esPapeleria` definido (true/false), gana eso; si nunca se tocó, sugerimos
// por nombre.
export const papeleriaInicial = (ins) =>
  typeof ins.esPapeleria === 'boolean' ? ins.esPapeleria : esPapeleriaAuto(ins.nombre)

// Set de ids de insumos marcados como papelería (los confirmados).
export const idsPapeleria = (insumos) =>
  new Set(insumos.filter((i) => i.esPapeleria === true).map((i) => i.id))

// ¿Hay al menos un insumo marcado como papelería?
export const hayPapeleriaMarcada = (insumos) => insumos.some((i) => i.esPapeleria === true)

// Productos (recetas) cuya receta NO incluye ningún insumo de papelería.
// Excluye los que el user confirmó que no llevan packaging (`noLlevaPackaging`).
export const productosSinPackaging = (recetas, insumos) => {
  const ids = idsPapeleria(insumos)
  if (ids.size === 0) return []
  return recetas.filter(
    (r) => r.noLlevaPackaging !== true && !(r.ingredientes || []).some((ing) => ids.has(ing.insumoId)),
  )
}
