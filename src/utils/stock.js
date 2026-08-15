// Lógica de stock: cómo las COMPRAS (suman) y las VENTAS (restan, según la
// receta) mueven el stock de los insumos. Son funciones puras para usarlas
// dentro de setInsumos(prev => ...) y poder testearlas.
//
// Regla de oro respetada acá: una compra NUNCA baja el precio de un insumo
// (solo lo sube si pagaste más por unidad).

// Redondeo a 2 decimales: evita el drift de floats (0.1 + 0.2 = 0.3000000004)
// y mantiene los números legibles. Decisión del user (2026-07-22): TODO va con
// 2 decimales como máximo — cantidades, stock y plata.
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Stock de un insumo como número (0 si no tiene).
export const stockDe = (ins) => round2(ins?.stock)

// Formato de cantidad para mostrar (es-AR, hasta 2 decimales).
export const fmtCant = (n) => (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })

const hoyISO = () => new Date().toISOString().slice(0, 10)

// Acumula en `acc` (Map insumoId→cantidad) el consumo de insumos de una receta
// multiplicado por `mult`. Si la receta lleva otros productos como componentes
// (`componentes: [{recetaId, cantidad}]`, cantidad = unidades del sub-producto),
// baja recursivamente: cada componente aporta su consumo × (cantidad / rinde).
// `seen` corta ciclos (A→B→A) para no colgar el navegador.
function acumularConsumo(acc, receta, mult, recetas, seen) {
  if (!receta || seen.has(receta.id)) return
  for (const ing of receta.ingredientes || []) {
    acc.set(ing.insumoId, (acc.get(ing.insumoId) || 0) + (Number(ing.cantidad) || 0) * mult)
  }
  const componentes = receta.componentes || []
  if (componentes.length === 0) return
  const seen2 = new Set(seen)
  seen2.add(receta.id)
  for (const comp of componentes) {
    const sub = recetas.find((r) => r.id === comp.recetaId)
    if (!sub) continue
    const rinde = Number(sub.rinde) || 1
    const fraccion = (Number(comp.cantidad) || 0) / rinde
    acumularConsumo(acc, sub, mult * fraccion, recetas, seen2)
  }
}

// Consumo de insumos de una lista de items de venta [{ recetaId, cantidad }].
// Baja los sub-productos (componentes) a insumos reales. Devuelve la lista
// agregada [{ insumoId, cantidad }] (un insumo puede repetirse entre recetas).
export function consumoDeItems(items, recetas) {
  const acc = new Map()
  for (const it of items || []) {
    const receta = recetas.find((r) => r.id === it.recetaId)
    acumularConsumo(acc, receta, Number(it.cantidad) || 0, recetas, new Set())
  }
  return [...acc.entries()].map(([insumoId, cantidad]) => ({ insumoId, cantidad: round2(cantidad) }))
}

// Suma (signo +1) o resta (signo -1) deltas de stock sobre la lista de insumos.
// deltas: [{ insumoId, cantidad }]. Se usa para aplicar/revertir ventas y para
// revertir compras al borrarlas.
export function aplicarDeltasStock(insumos, deltas, signo = 1) {
  const map = new Map((deltas || []).map((d) => [d.insumoId, Number(d.cantidad) || 0]))
  return insumos.map((ins) => {
    const d = map.get(ins.id)
    if (d == null) return ins
    return { ...ins, stock: round2(stockDe(ins) + signo * d) }
  })
}

// Deltas de stock de una compra (para revertir al borrarla).
export const deltasDeCompra = (compra) =>
  (compra?.items || []).map((it) => ({ insumoId: it.insumoId, cantidad: Number(it.cantidad) || 0 }))

// Aplica una compra a los insumos: suma stock de cada item y, si la línea vino
// con `total` y el precio pagado por unidad es MAYOR al actual, actualiza el
// precio del insumo (NUNCA lo baja). Marca fuentePrecio = 'Compra'.
// Excepción: item con `actualizaPrecio: false` (el user dijo que NO al guardar,
// ej. compra de emergencia pagada más cara que el costo real) → suma stock
// pero no toca el precio. Ausente o true = comportamiento de siempre.
export function aplicarCompraAInsumos(insumos, compra) {
  const map = new Map((compra?.items || []).map((it) => [it.insumoId, it]))
  const hoy = hoyISO()
  return insumos.map((ins) => {
    const it = map.get(ins.id)
    if (!it) return ins
    const cant = Number(it.cantidad) || 0
    const next = { ...ins, stock: round2(stockDe(ins) + cant) }
    const total = Number(it.total) || 0
    if (total > 0 && cant > 0 && it.actualizaPrecio !== false) {
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
