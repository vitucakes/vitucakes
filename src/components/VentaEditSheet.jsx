import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { formatARS, calcPrecioVenta } from '../utils/calc'
import { consumoDeItems, stockDe, fmtCant } from '../utils/stock'

const todayISO = () => new Date().toISOString().slice(0, 10)
const emptyLinea = () => ({ recetaId: '', cantidad: '1' })

// Sheet para registrar una VENTA. Elegís uno o más productos y la cantidad.
// El precio se toma del precio de venta del producto en este momento (snapshot)
// y se descuentan los insumos de su receta del stock.
export default function VentaEditSheet({ isOpen, recetas, insumos, onClose, onSubmit }) {
  const [fecha, setFecha] = useState(todayISO())
  const [lineas, setLineas] = useState([emptyLinea()])

  useEffect(() => {
    if (!isOpen) return
    setFecha(todayISO())
    setLineas([emptyLinea()])
  }, [isOpen])

  const recetasOrden = [...recetas].sort((a, b) => a.nombre.localeCompare(b.nombre))

  const setLinea = (i, patch) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLinea = () => setLineas((ls) => [...ls, emptyLinea()])
  const removeLinea = (i) => setLineas((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))

  const lineasValidas = lineas.filter((l) => l.recetaId && parseFloat(l.cantidad) > 0)

  const items = lineasValidas.map((l) => {
    const receta = recetas.find((r) => r.id === l.recetaId)
    const precioUnitario = receta ? calcPrecioVenta(receta, insumos) : 0
    return { recetaId: l.recetaId, nombre: receta?.nombre ?? '', cantidad: parseFloat(l.cantidad) || 0, precioUnitario }
  })
  const total = items.reduce((s, it) => s + it.precioUnitario * it.cantidad, 0)

  // Preview de stock que quedaría negativo (avisar, pero permitir igual).
  const consumo = consumoDeItems(items, recetas)
  const faltantes = consumo
    .map((d) => {
      const ins = insumos.find((i) => i.id === d.insumoId)
      const resultante = stockDe(ins) - d.cantidad
      return ins && resultante < 0 ? { nombre: ins.nombre, unidad: ins.unidad, resultante } : null
    })
    .filter(Boolean)

  const puedeGuardar = lineasValidas.length > 0

  const submit = () => {
    if (!puedeGuardar) return
    onSubmit({ fecha, items, total, consumo })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Nueva venta">
      <div className="space-y-4">
        <div>
          <label className="label">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input bg-white" />
        </div>

        <div className="space-y-3">
          {lineas.map((l, i) => {
            const receta = recetas.find((r) => r.id === l.recetaId)
            const precio = receta ? calcPrecioVenta(receta, insumos) : 0
            const cant = parseFloat(l.cantidad) || 0
            return (
              <div key={i} className="bg-brand-50 rounded-2xl p-3 space-y-2 relative">
                {lineas.length > 1 && (
                  <button
                    onClick={() => removeLinea(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-gray-400 text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                )}
                <select
                  value={l.recetaId}
                  onChange={(e) => setLinea(i, { recetaId: e.target.value })}
                  className="input bg-white"
                >
                  <option value="">Elegí un producto…</option>
                  {recetasOrden.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
                <div className="flex items-end gap-2">
                  <div className="w-24">
                    <label className="label">Cantidad</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={l.cantidad}
                      onChange={(e) => setLinea(i, { cantidad: e.target.value })}
                      className="input"
                    />
                  </div>
                  {receta && (
                    <div className="flex-1 text-right">
                      <p className="text-[11px] text-gray-400">{formatARS(precio)} c/u</p>
                      <p className="text-sm font-bold text-gray-800">{formatARS(precio * cant)}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={addLinea}
          className="w-full py-2.5 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm active:scale-95 transition-transform"
        >
          + Agregar otro producto
        </button>

        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-gray-600">Total de la venta</span>
          <span className="text-xl font-black text-brand-600">{formatARS(total)}</span>
        </div>

        {faltantes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <p className="text-xs font-bold text-amber-800 mb-1">⚠️ Te va a faltar stock</p>
            <ul className="space-y-0.5">
              {faltantes.map((f) => (
                <li key={f.nombre} className="text-[11px] text-amber-700">
                  {f.nombre}: quedaría en {fmtCant(f.resultante)} {f.unidad}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-600 mt-1">Igual podés registrar la venta; después cargás la compra.</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!puedeGuardar}
          className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
        >
          Registrar venta
        </button>
      </div>
    </BottomSheet>
  )
}
