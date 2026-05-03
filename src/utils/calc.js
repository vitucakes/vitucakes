export const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0)

export const calcCostoReceta = (receta, insumos) =>
  (receta?.ingredientes ?? []).reduce((sum, ing) => {
    const ins = insumos.find((i) => i.id === ing.insumoId)
    return ins ? sum + ing.cantidad * ins.precioPorUnidad : sum
  }, 0)
