export const GASTOS_INDIRECTOS = 0.10
export const MARGEN = 3

export const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0)

// Costo de insumos CRUDO de una receta. Suma los insumos directos y, si la
// receta lleva otros productos como componentes (`componentes: [{recetaId,
// cantidad}]`, cantidad = unidades del sub-producto), suma su costo de insumos
// crudo proporcional: fracción = cantidad / rinde del sub-producto. Así el 10%
// de indirectos y el 3x de margen se aplican UNA sola vez, arriba de todo.
// `recetas` es necesario para resolver componentes; sin él, se ignoran (los
// sitios que muestran precio deben pasarlo). `_seen` corta ciclos (A→B→A).
export const calcCostoInsumos = (receta, insumos, recetas = [], _seen = new Set()) => {
  if (!receta || _seen.has(receta.id)) return 0
  const directo = (receta.ingredientes ?? []).reduce((sum, ing) => {
    const ins = insumos.find((i) => i.id === ing.insumoId)
    return ins ? sum + ing.cantidad * ins.precioPorUnidad : sum
  }, 0)
  const componentes = receta.componentes ?? []
  if (componentes.length === 0) return directo
  const seen = new Set(_seen)
  seen.add(receta.id)
  const deComponentes = componentes.reduce((sum, comp) => {
    const sub = recetas.find((r) => r.id === comp.recetaId)
    if (!sub) return sum
    const rinde = Number(sub.rinde) || 1
    const fraccion = (Number(comp.cantidad) || 0) / rinde
    return sum + calcCostoInsumos(sub, insumos, recetas, seen) * fraccion
  }, 0)
  return directo + deComponentes
}

export const calcGastosIndirectos = (costoInsumos) => costoInsumos * GASTOS_INDIRECTOS

export const calcCostoTotal = (costoInsumos) => costoInsumos * (1 + GASTOS_INDIRECTOS)

// Costo total de la receta entera (insumos + indirectos). NO se divide por rinde.
// El precio de venta es el de la receta completa (1 unidad de venta = 1 receta).
export const calcCostoReceta = (receta, insumos, recetas = []) =>
  calcCostoTotal(calcCostoInsumos(receta, insumos, recetas))

// Precio de venta de la receta entera. Es lo que cobra Vitu por esa receta,
// independientemente de cuántas porciones/unidades produzca internamente.
// Esto también arregla la comparación con la competencia: ahora se compara
// receta entera vs producto entero de la competencia.
export const calcPrecioVenta = (receta, insumos, recetas = []) =>
  calcCostoReceta(receta, insumos, recetas) * MARGEN
