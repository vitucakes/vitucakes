// Lógica de stock: cómo las COMPRAS (suman) y las VENTAS (restan, según la
// receta) mueven el stock de los insumos. Son funciones puras para usarlas
// dentro de setInsumos(prev => ...) y poder testearlas.
//
// Regla de oro respetada acá: una compra NUNCA baja el precio de un insumo
// (solo lo sube si pagaste más por unidad).

// Redondeo a 3 decimales: evita el drift de floats (0.1 + 0.2 = 0.3000000004).
export const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Stock de un insumo como número (0 si no tiene).
export const stockDe = (ins) => round3(ins?.stock)

// Formato de cantidad para mostrar (es-AR, hasta 3 decimales).
export const fmtCant = (n) => (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 3 })

const hoyISO = () => new Date().toISOString().slice(0, 10)

// Consumo de insumos de una lista de items de venta [{ recetaId, cantidad }].
// Por cada item suma ingrediente.cantidad * cantidad vendida. Devuelve la lista
// agregada [{ insumoId, cantidad }] (un insumo puede repetirse entre recetas).
export function consumoDeItems(items, recetas) {
  const acc = new Map()
  for (const it of items || []) {
    const receta = recetas.find((r) => r.id === it.recetaId)
    if (!receta) continue
    const mult = Number(it.cantidad) || 0
    for (const ing of receta.ingredientes || []) {
      acc.set(ing.insumoId, (acc.get(ing.insumoId) || 0) + (Number(ing.cantidad) || 0) * mult)
    }
  }
  return [...acc.entries()].map(([insumoId, cantidad]) => ({ insumoId, cantidad: round3(cantidad) }))
}

// Suma (signo +1) o resta (signo -1) deltas de stock sobre la lista de insumos.
// deltas: [{ insumoId, cantidad }]. Se usa para aplicar/revertir ventas y para
// revertir compras al borrarlas.
export function aplicarDeltasStock(insumos, deltas, signo = 1) {
  const map = new Map((deltas || []).map((d) => [d.insumoId, Number(d.cantidad) || 0]))
  return insumos.map((ins) => {
    const d = map.get(ins.id)
    if (d == null) return ins
    return { ...ins, stock: round3(stockDe(ins) + signo * d) }
  })
}

// Deltas de stock de una compra (para revertir al borrarla).
export const deltasDeCompra = (compra) =>
  (compra?.items || []).map((it) => ({ insumoId: it.insumoId, cantidad: Number(it.cantidad) || 0 }))

// Aplica una compra a los insumos: suma stock de cada item y, si la línea vino
// con `total` y el precio pagado por unidad es MAYOR al actual, actualiza el
// precio del insumo (NUNCA lo baja). Marca fuentePrecio = 'Compra'.
export function aplicarCompraAInsumos(insumos, compra) {
  const map = new Map((compra?.items || []).map((it) => [it.insumoId, it]))
  const hoy = hoyISO()
  return insumos.map((ins) => {
    const it = map.get(ins.id)
    if (!it) return ins
    const cant = Number(it.cantidad) || 0
    const next = { ...ins, stock: round3(stockDe(ins) + cant) }
    const total = Number(it.total) || 0
    if (total > 0 && cant > 0) {
      const precioUnit = total / cant
      if (precioUnit > (Number(ins.precioPorUnidad) || 0)) {
        next.precioPorUnidad = round2(precioUnit)
        next.fuentePrecio = 'Compra'
        next.fechaActualizacion = hoy
        next.updatedAt = Date.now()
      }
    }
    return next
  })
}
