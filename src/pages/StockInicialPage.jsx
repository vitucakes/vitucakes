import { useState } from 'react'
import { useEditGate, LockToggle } from '../hooks/useEditGate'
import { stockDe, fmtCant } from '../utils/stock'

// Carga MASIVA de stock inicial: una lista con un input por insumo para cargar
// de una lo que Vitu ya tiene hoy. A partir de ahí el stock se mantiene solo
// con Compras (suman) y Ventas (restan). Setea el stock directo (no es un
// movimiento): es un conteo de inventario, no una compra.
export default function StockInicialPage({ insumos, setInsumos, onBack }) {
  const { canEdit } = useEditGate()
  const [search, setSearch] = useState('')
  const [soloFaltan, setSoloFaltan] = useState(false)
  const [draft, setDraft] = useState({}) // { [insumoId]: string }

  const valorDe = (ins) =>
    draft[ins.id] !== undefined ? draft[ins.id] : ins.stock != null ? String(ins.stock) : ''

  const setVal = (id, v) => setDraft((d) => ({ ...d, [id]: v }))

  const total = insumos.length
  const conStock = insumos.filter((i) => i.stock != null).length

  const filtered = insumos
    .filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()))
    .filter((i) => (soloFaltan ? i.stock == null : true))
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Cambios pendientes: campos con valor no vacío y distinto al stock actual.
  // Dejar un campo vacío = no tocar ese insumo. Para poner 0, escribí "0".
  const cambios = Object.entries(draft).filter(([id, v]) => {
    if (v === '') return false
    const ins = insumos.find((i) => i.id === id)
    if (!ins) return false
    return (parseFloat(v) || 0) !== stockDe(ins)
  })

  const guardar = () => {
    if (cambios.length === 0) return
    const map = new Map(cambios.map(([id, v]) => [id, parseFloat(v) || 0]))
    setInsumos((prev) => prev.map((i) => (map.has(i.id) ? { ...i, stock: map.get(i.id) } : i)))
    setDraft({})
  }

  return (
    <div className="flex flex-col min-h-full bg-brand-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Stock inicial</h1>
          <LockToggle />
        </div>
        <input
          type="text"
          placeholder="Buscar insumo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{conStock} de {total} con stock cargado</span>
          <button
            onClick={() => setSoloFaltan((s) => !s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              soloFaltan ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-600'
            }`}
          >
            {soloFaltan ? '✓ Solo los que faltan' : 'Solo los que faltan'}
          </button>
        </div>
      </div>

      {/* Intro */}
      <div className="px-4 pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
          <p className="text-xs text-blue-800 leading-relaxed">
            Cargá lo que tenés hoy de cada insumo (en su unidad). Dejá vacío lo que no quieras tocar.
            Después se actualiza solo con Compras y Ventas.
          </p>
        </div>
      </div>

      {/* Lista editable */}
      <div className="flex-1 px-4 py-4 space-y-2 pb-32">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">
            {soloFaltan ? 'Ya cargaste el stock de todos 🎉' : 'No hay insumos que coincidan.'}
          </p>
        )}
        {filtered.map((ins) => (
          <div
            key={ins.id}
            className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm border border-brand-50"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 break-words text-sm">{ins.nombre}</p>
              <p className="text-[11px] text-gray-400">
                {ins.stock != null ? `Hoy: ${fmtCant(stockDe(ins))} ${ins.unidad}` : 'Sin cargar'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <input
                type="number"
                inputMode="decimal"
                value={valorDe(ins)}
                onChange={(e) => setVal(ins.id, e.target.value)}
                disabled={!canEdit}
                placeholder="0"
                className="w-20 text-right px-2.5 py-2 rounded-xl bg-brand-50 border border-brand-100 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
              />
              <span className="text-xs text-gray-400 w-8">{ins.unidad}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de guardar (sticky abajo) */}
      {canEdit && cambios.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-brand-100 px-4 py-3 z-40">
          <button
            onClick={guardar}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base active:scale-95 transition-transform"
          >
            Guardar stock ({cambios.length})
          </button>
        </div>
      )}
    </div>
  )
}
