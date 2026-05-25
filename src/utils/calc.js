export const GASTOS_INDIRECTOS = 0.10
export const MARGEN = 3

export const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0)

export const calcCostoInsumos = (receta, insumos) =>
  (receta?.ingredientes ?? []).reduce((sum, ing) => {
    const ins = insumos.find((i) => i.id === ing.insumoId)
    return ins ? sum + ing.cantidad * ins.precioPorUnidad : sum
  }, 0)

export const calcGastosIndirectos = (costoInsumos) => costoInsumos * GASTOS_INDIRECTOS

export const calcCostoTotal = (costoInsumos) => costoInsumos * (1 + GASTOS_INDIRECTOS)

// Costo total de la receta entera (insumos + indirectos). NO se divide por rinde.
// El precio de venta es el de la receta completa (1 unidad de venta = 1 receta).
export const calcCostoReceta = (receta, insumos) =>
  calcCostoTotal(calcCostoInsumos(receta, insumos))

// Precio de venta de la receta entera. Es lo que cobra Vitu por esa receta,
// independientemente de cuántas porciones/unidades produzca internamente.
// Esto también arregla la comparación con la competencia: ahora se compara
// receta entera vs producto entero de la competencia.
export const calcPrecioVenta = (receta, insumos) =>
  calcCostoReceta(receta, insumos) * MARGEN
