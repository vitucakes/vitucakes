import { useState } from 'react'
import InsumoEditSheet from '../components/InsumoEditSheet'
import { useEditGate, LockToggle } from '../hooks/useEditGate'

const todayISO = () => new Date().toISOString().slice(0, 10)

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function InsumosPage({ insumos, setInsumos, recetas = [], onActualizarPrecios }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // insumo a editar, o null = nuevo
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const { canEdit } = useEditGate()

  // Orden: por los MÁS usados/tocados (contador `usos`), no por el último.
  // Empate (ej. todos en 0 al principio) → alfabético, para un orden neutro.
  const filtered = insumos
    .filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => (b.usos ?? 0) - (a.usos ?? 0) || a.nombre.localeCompare(b.nombre))

  const openAdd = () => {
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (ins) => {
    setEditing(ins)
    setOpen(true)
    // Cuenta una "apertura" del insumo para el orden por más usados.
    setInsumos((prev) => prev.map((i) => (i.id === ins.id ? { ...i, usos: (i.usos ?? 0) + 1 } : i)))
  }

  const handleSubmit = (data) => {
    if (editing) {
      setInsumos((prev) =>
        prev.map((i) =>
          i.id === editing.id ? { ...i, ...data, fechaActualizacion: todayISO(), updatedAt: Date.now() } : i,
        ),
      )
    } else {
      setInsumos((prev) => [
        ...prev,
        { id: crypto.randomUUID(), ...data, fechaActualizacion: todayISO(), updatedAt: Date.now() },
      ])
    }
    setOpen(false)
  }

  const confirmDelete = (id) => setDeleteId(id)

  const handleDelete = () => {
    setInsumos((prev) => prev.filter((i) => i.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vitucakes" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-800 flex-1">Insumos</h1>
          <LockToggle />
          {canEdit && onActualizarPrecios && (
            <button
              onClick={onActualizarPrecios}
              className="px-3 py-2 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm"
              aria-label="Actualizar precios"
              title="Actualizar precios desde El Granate"
            >
              <span className="text-sm leading-none">⟳</span>
              <span>Actualizar precios</span>
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🧂</div>
            <p className="font-medium">No hay insumos todavía</p>
            <p className="text-sm mt-1">Tocá el botón + para agregar</p>
          </div>
        )}
        {filtered.map((ins) => (
          <div key={ins.id} className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm border border-brand-50">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 break-words">{ins.nombre}</p>
              <p className="text-sm text-brand-500 font-medium mt-0.5">
                ${ins.precioPorUnidad.toLocaleString('es-AR')} / {ins.unidad}
              </p>
              {ins.fechaActualizacion && (
                <p className="text-[11px] text-gray-400 mt-0.5">Actualizado: {formatDate(ins.fechaActualizacion)}</p>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-2 ml-2">
                <button onClick={() => openEdit(ins)} className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-base">✏️</button>
                <button onClick={() => confirmDelete(ins.id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-base">🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAB */}
      {canEdit && (
        <button
          onClick={openAdd}
          className="fixed bottom-24 right-4 w-14 h-14 bg-brand-400 rounded-full shadow-lg flex items-center justify-center text-white text-3xl active:scale-95 transition-transform z-30"
        >
          +
        </button>
      )}

      {/* Form sheet (crear / editar) */}
      <InsumoEditSheet isOpen={open} insumo={editing} onClose={() => setOpen(false)} onSubmit={handleSubmit} />

      {/* Delete confirm */}
      {deleteId && (() => {
        const ins = insumos.find((i) => i.id === deleteId)
        const recetasQueLoUsan = recetas.filter((r) => r.ingredientes.some((ing) => ing.insumoId === deleteId))
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
            <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              {recetasQueLoUsan.length > 0 ? (
                <>
                  <p className="text-base font-bold text-gray-800 text-center mb-2">No se puede eliminar</p>
                  <p className="text-sm text-gray-600 text-center mb-3">
                    <span className="font-semibold">{ins?.nombre}</span> está usado en {recetasQueLoUsan.length} producto{recetasQueLoUsan.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="bg-brand-50 rounded-2xl p-3 max-h-48 overflow-y-auto mb-5">
                    <ul className="space-y-1">
                      {recetasQueLoUsan.map((r) => (
                        <li key={r.id} className="text-sm text-gray-700">• {r.nombre}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-4">Quitalo de esas recetas primero o editalo en lugar de borrarlo.</p>
                  <button onClick={() => setDeleteId(null)} className="w-full py-3 rounded-2xl bg-gray-800 text-white font-semibold">Entendido</button>
                </>
              ) : (
                <>
                  <p className="text-base font-bold text-gray-800 text-center mb-1">¿Eliminar insumo?</p>
                  <p className="text-sm text-gray-500 text-center mb-5">
                    <span className="font-semibold">{ins?.nombre}</span> no está siendo usado en ningún producto.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
                    <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold">Eliminar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
