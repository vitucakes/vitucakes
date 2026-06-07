import { useState } from 'react'
import CompraEditSheet from '../components/CompraEditSheet'
import { useEditGate, LockToggle } from '../hooks/useEditGate'
import { aplicarCompraAInsumos, deltasDeCompra, aplicarDeltasStock, fmtCant } from '../utils/stock'
import { formatARS } from '../utils/calc'

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Módulo de COMPRAS: registrás lo que comprás y suma el stock de tus insumos.
// Si cargás el total pagado, también puede actualizar el precio (nunca lo baja).
export default function ComprasPage({ compras, setCompras, insumos, setInsumos }) {
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const { canEdit } = useEditGate()

  const ordenadas = [...compras].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  const handleSubmit = (compra) => {
    const record = { id: crypto.randomUUID(), createdAt: Date.now(), ...compra }
    setCompras((prev) => [record, ...prev])
    setInsumos((prev) => aplicarCompraAInsumos(prev, record))
    setOpen(false)
  }

  const handleDelete = () => {
    const compra = compras.find((c) => c.id === deleteId)
    if (compra) {
      setInsumos((prev) => aplicarDeltasStock(prev, deltasDeCompra(compra), -1))
      setCompras((prev) => prev.filter((c) => c.id !== deleteId))
    }
    setDeleteId(null)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vitucakes" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-800 flex-1">Compras</h1>
          <LockToggle />
        </div>
        <p className="text-xs text-gray-400 mt-1">Cargá lo que comprás y suma el stock de tus insumos.</p>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {ordenadas.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🛒</div>
            <p className="font-medium">No hay compras todavía</p>
            <p className="text-sm mt-1">Tocá + para registrar una compra</p>
          </div>
        )}
        {ordenadas.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-brand-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-800">{formatDate(c.fecha)}</span>
              <div className="flex items-center gap-2">
                {c.total > 0 && <span className="text-sm font-black text-brand-600">{formatARS(c.total)}</span>}
                {canEdit && (
                  <button onClick={() => setDeleteId(c.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-sm">🗑️</button>
                )}
              </div>
            </div>
            <ul className="space-y-1">
              {(c.items || []).map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm text-gray-600 gap-2">
                  <span className="break-words">{it.nombre}</span>
                  <span className="text-gray-400 whitespace-nowrap">
                    +{fmtCant(it.cantidad)} {it.unidad}{it.total > 0 ? ` · ${formatARS(it.total)}` : ''}
                  </span>
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

      <CompraEditSheet isOpen={open} insumos={insumos} onClose={() => setOpen(false)} onSubmit={handleSubmit} />

      {/* Confirmar borrado */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Borrar esta compra?</p>
            <p className="text-sm text-gray-500 text-center mb-5">Se va a restar del stock lo que esta compra había sumado. El precio de los insumos no cambia.</p>
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
