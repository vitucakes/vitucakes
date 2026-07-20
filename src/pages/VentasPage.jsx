import { useState } from 'react'
import VentaEditSheet from '../components/VentaEditSheet'
import BottomSheet from '../components/BottomSheet'
import { useEditGate, LockToggle } from '../hooks/useEditGate'
import { aplicarDeltasStock, fmtCant } from '../utils/stock'
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
  const [editing, setEditing] = useState(null) // venta a editar, o null = nueva
  const [deleteId, setDeleteId] = useState(null)
  const [detalleId, setDetalleId] = useState(null) // venta cuyo detalle se está viendo
  const [search, setSearch] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const { canEdit } = useEditGate()

  // Busca en el historial por producto vendido (texto) y/o por día exacto
  // (calendario). Los dos filtros se combinan.
  const q = search.trim().toLowerCase()
  const ordenadas = [...ventas]
    .filter((v) => !fechaFiltro || v.fecha === fechaFiltro)
    .filter(
      (v) =>
        !q ||
        (v.items || []).some((it) => (it.nombre || '').toLowerCase().includes(q)) ||
        formatDate(v.fecha).includes(q) ||
        (v.fecha || '').includes(q),
    )
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  const totalGeneral = ventas.reduce((s, v) => s + (v.total || 0), 0)
  const totalMes = ventas
    .filter((v) => (v.fecha || '').startsWith(mesActual()))
    .reduce((s, v) => s + (v.total || 0), 0)

  const handleSubmit = (venta) => {
    if (editing) {
      // Edición: se devuelve al stock el consumo de la venta vieja y se
      // descuenta el de la nueva (guardado en el record para poder revertir
      // después aunque la receta cambie).
      const record = { ...editing, ...venta }
      setInsumos((prev) => aplicarDeltasStock(aplicarDeltasStock(prev, editing.consumo || [], +1), venta.consumo || [], -1))
      setVentas((prev) => prev.map((v) => (v.id === editing.id ? record : v)))
    } else {
      const record = { id: crypto.randomUUID(), createdAt: Date.now(), ...venta }
      setVentas((prev) => [record, ...prev])
      setInsumos((prev) => aplicarDeltasStock(prev, venta.consumo || [], -1))
    }
    setOpen(false)
    setEditing(null)
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
        {ventas.length > 0 && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              aria-label="Filtrar por día"
              title="Filtrar por día"
              className="px-3 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            {fechaFiltro && (
              <button
                onClick={() => setFechaFiltro('')}
                aria-label="Quitar filtro de fecha"
                className="w-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 text-sm active:scale-95 transition-transform"
              >
                ✕
              </button>
            )}
          </div>
        )}
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
        {ventas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">💵</div>
            <p className="font-medium">No hay ventas todavía</p>
            <p className="text-sm mt-1">Tocá + para registrar una venta</p>
          </div>
        )}
        {ventas.length > 0 && ordenadas.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">
            Sin resultados
            {search.trim() ? <> para “{search.trim()}”</> : ''}
            {fechaFiltro ? <> el {formatDate(fechaFiltro)}</> : ''}
          </p>
        )}
        {ordenadas.map((v) => (
          <div
            key={v.id}
            onClick={() => setDetalleId(v.id)}
            className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-brand-50 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-800">{formatDate(v.fecha)}</span>
              <div className="flex items-center gap-2">
                {v.gratis ? (
                  <span className="text-sm font-black text-emerald-600">🎁 Gratis</span>
                ) : (
                  <span className="text-sm font-black text-brand-600">{formatARS(v.total)}</span>
                )}
                {canEdit && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(v); setOpen(true) }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-50 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(v.id) }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-sm"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
            <ul className="space-y-1">
              {(v.items || []).map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm text-gray-600 gap-2">
                  <span className="break-words">{it.cantidad}× {it.nombre}</span>
                  <span className={`whitespace-nowrap ${v.gratis ? 'text-gray-300 line-through' : 'text-gray-400'}`}>
                    {formatARS(it.precioUnitario * it.cantidad)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-300 mt-1.5">Tocá para ver el detalle ›</p>
          </div>
        ))}
      </div>

      {/* FAB */}
      {canEdit && (
        <button
          onClick={() => { setEditing(null); setOpen(true) }}
          className="fixed bottom-24 right-4 w-14 h-14 bg-brand-400 rounded-full shadow-lg flex items-center justify-center text-white text-3xl active:scale-95 transition-transform z-30"
        >
          +
        </button>
      )}

      <VentaEditSheet
        isOpen={open}
        venta={editing}
        recetas={recetas}
        insumos={insumos}
        onClose={() => { setOpen(false); setEditing(null) }}
        onSubmit={handleSubmit}
      />

      {/* Detalle de una venta: items con precio unitario, total y el stock
          que descontó (el consumo guardado en el record). */}
      {(() => {
        const v = detalleId ? ventas.find((x) => x.id === detalleId) : null
        return (
          <BottomSheet isOpen={!!v} onClose={() => setDetalleId(null)} title={v ? `Venta · ${formatDate(v.fecha)}` : ''}>
            {v && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {(v.items || []).map((it, idx) => (
                    <div key={idx} className="bg-brand-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 break-words">{it.cantidad}× {it.nombre}</p>
                        <p className="text-[11px] text-gray-400">{formatARS(it.precioUnitario)} c/u</p>
                      </div>
                      <span className={`text-sm font-bold whitespace-nowrap ${v.gratis ? 'text-gray-300 line-through' : 'text-gray-800'}`}>
                        {formatARS(it.precioUnitario * it.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-gray-600">Total de la venta</span>
                  {v.gratis ? (
                    <span className="text-right">
                      <span className="text-xl font-black text-emerald-600">🎁 Gratis</span>
                      <p className="text-[11px] text-gray-400 line-through">
                        {formatARS((v.items || []).reduce((s, it) => s + it.precioUnitario * it.cantidad, 0))}
                      </p>
                    </span>
                  ) : (
                    <span className="text-xl font-black text-brand-600">{formatARS(v.total)}</span>
                  )}
                </div>

                {(v.consumo || []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Stock descontado</p>
                    <div className="bg-gray-50 rounded-2xl p-3 space-y-1.5">
                      {v.consumo.map((d) => {
                        const ins = insumos.find((i) => i.id === d.insumoId)
                        return (
                          <div key={d.insumoId} className="flex justify-between text-xs text-gray-600 gap-2">
                            <span className="break-words">{ins?.nombre ?? 'Insumo borrado'}</span>
                            <span className="text-gray-400 whitespace-nowrap">
                              −{fmtCant(d.cantidad)} {ins?.unidad ?? ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setDetalleId(null); setEditing(v); setOpen(true) }}
                    className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold active:scale-95 transition-transform"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => { setDetalleId(null); setDeleteId(v.id) }}
                    className="flex-1 py-3 rounded-2xl bg-red-50 text-red-500 font-semibold active:scale-95 transition-transform"
                  >
                    🗑️ Borrar
                  </button>
                </div>
              </div>
            )}
          </BottomSheet>
        )
      })()}

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
