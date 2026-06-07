import { useState } from 'react'
import VentaEditSheet from '../components/VentaEditSheet'
import { useEditGate, LockToggle } from '../hooks/useEditGate'
import { aplicarDeltasStock } from '../utils/stock'
import { formatARS } from '../utils/calc'

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
const mesActual = () => new Date().toISOString().slice(0, 7)

// Módulo de VENTAS: registrás qué productos vendiste y cuánto. Descuenta del
// stock los insumos de cada receta y suma la facturación.
export default function VentasPage({ ventas, setVentas, insumos, setInsumos, recetas }) {
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const { canEdit } = useEditGate()

  const ordenadas = [...ventas].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  const totalGeneral = ventas.reduce((s, v) => s + (v.total || 0), 0)
  const totalMes = ventas
    .filter((v) => (v.fecha || '').startsWith(mesActual()))
    .reduce((s, v) => s + (v.total || 0), 0)

  const handleSubmit = (venta) => {
    const record = { id: crypto.randomUUID(), createdAt: Date.now(), ...venta }
    setVentas((prev) => [record, ...prev])
    setInsumos((prev) => aplicarDeltasStock(prev, venta.consumo || [], -1))
    setOpen(false)
  }

  const handleDelete = () => {
    const venta = ventas.find((v) => v.id === deleteId)
    if (venta) {
      setInsumos((prev) => aplicarDeltasStock(prev, venta.consumo || [], +1))
      setVentas((prev) => prev.filter((v) => v.id !== deleteId))
    }
    setDeleteId(null)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vitucakes" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-800 flex-1">Ventas</h1>
          <LockToggle />
        </div>
      </div>

      {/* Resumen de facturación */}
      <div className="px-4 pt-4">
        <div className="bg-brand-400 rounded-3xl p-5 text-white shadow-md flex justify-between items-end">
          <div>
            <p className="text-sm font-medium opacity-80 mb-1">Facturado este mes</p>
            <p className="text-3xl font-black">{formatARS(totalMes)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] opacity-70">Total histórico</p>
            <p className="text-sm font-bold">{formatARS(totalGeneral)}</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {ordenadas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">💵</div>
            <p className="font-medium">No hay ventas todavía</p>
            <p className="text-sm mt-1">Tocá + para registrar una venta</p>
          </div>
        )}
        {ordenadas.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-brand-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-800">{formatDate(v.fecha)}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-brand-600">{formatARS(v.total)}</span>
                {canEdit && (
                  <button onClick={() => setDeleteId(v.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-sm">🗑️</button>
                )}
              </div>
            </div>
            <ul className="space-y-1">
              {(v.items || []).map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm text-gray-600 gap-2">
                  <span className="break-words">{it.cantidad}× {it.nombre}</span>
                  <span className="text-gray-400 whitespace-nowrap">{formatARS(it.precioUnitario * it.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAB */}
      {canEdit && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-brand-400 rounded-full shadow-lg flex items-center justify-center text-white text-3xl active:scale-95 transition-transform z-30"
        >
          +
        </button>
      )}

      <VentaEditSheet isOpen={open} recetas={recetas} insumos={insumos} onClose={() => setOpen(false)} onSubmit={handleSubmit} />

      {/* Confirmar borrado */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Borrar esta venta?</p>
            <p className="text-sm text-gray-500 text-center mb-5">Se va a devolver al stock lo que esta venta había descontado.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold">Borrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
