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

// Backward-compatible alias: returns total cost incl. indirect expenses
export const calcCostoReceta = (receta, insumos) =>
  calcCostoTotal(calcCostoInsumos(receta, insumos))
