import { useState } from 'react'
import BottomSheet from '../components/BottomSheet'

const UNIDADES = ['kg', 'g', 'l', 'ml', 'u', 'cdas', 'cdtas', 'taza', 'atado']

const todayISO = () => new Date().toISOString().slice(0, 10)

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const EMPTY = { nombre: '', unidad: 'kg', precioPorUnidad: '', totalPagado: '', cantidadComprada: '' }

export default function InsumosPage({ insumos, setInsumos, onActualizarPrecios }) {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const filtered = insumos
    .filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  const openAdd = () => { setEditId(null); setForm(EMPTY); setOpen(true) }

  const openEdit = (ins) => {
    setEditId(ins.id)
    setForm({
      nombre: ins.nombre,
      unidad: ins.unidad,
      precioPorUnidad: String(ins.precioPorUnidad),
      totalPagado: '',
      cantidadComprada: '',
    })
    setOpen(true)
  }

  const computedPrecio = (() => {
    const t = parseFloat(form.totalPagado)
    const c = parseFloat(form.cantidadComprada)
    if (t > 0 && c > 0) return t / c
    return parseFloat(form.precioPorUnidad) || 0
  })()

  const handleSave = () => {
    const nombre = form.nombre.trim()
    const precio = computedPrecio
    if (!nombre || precio <= 0) return
    if (editId) {
      setInsumos((prev) => prev.map((i) => {
        if (i.id !== editId) return i
        return {
          ...i,
          nombre,
          unidad: form.unidad,
          precioPorUnidad: precio,
          fechaActualizacion: todayISO(),
          updatedAt: Date.now(),
        }
      }))
    } else {
      setInsumos((prev) => [...prev, {
        id: crypto.randomUUID(),
        nombre,
        unidad: form.unidad,
        precioPorUnidad: precio,
        fechaActualizacion: todayISO(),
        updatedAt: Date.now(),
      }])
    }
    setOpen(false)
  }

  const confirmDelete = (id) => setDeleteId(id)

  const handleDelete = () => {
    setInsumos((prev) => prev.filter((i) => i.id !== deleteId))
    setDeleteId(null)
  }

  const field = (k) => ({
    value: form[k],
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vitucakes" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-800 flex-1">Insumos</h1>
          {onActualizarPrecios && (
            <button
              onClick={onActualizarPrecios}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg active:scale-95 transition-transform"
              aria-label="Actualizar precios"
              title="Actualizar precios desde El Granate"
            >
              ⟳
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
              <p className="font-semibold text-gray-800 truncate">{ins.nombre}</p>
              <p className="text-sm text-brand-500 font-medium mt-0.5">
                ${ins.precioPorUnidad.toLocaleString('es-AR')} / {ins.unidad}
              </p>
              {ins.fechaActualizacion && (
                <p className="text-[11px] text-gray-400 mt-0.5">Actualizado: {formatDate(ins.fechaActualizacion)}</p>
              )}
            </div>
            <div className="flex gap-2 ml-2">
              <button onClick={() => openEdit(ins)} className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-base">✏️</button>
              <button onClick={() => confirmDelete(ins.id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-base">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-4 w-14 h-14 bg-brand-400 rounded-full shadow-lg flex items-center justify-center text-white text-3xl active:scale-95 transition-transform z-30"
      >
        +
      </button>

      {/* Form sheet */}
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={editId ? 'Editar insumo' : 'Nuevo insumo'}>
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input {...field('nombre')} placeholder="Ej: Harina 000" className="input" />
          </div>
          <div>
            <label className="label">Unidad</label>
            <select {...field('unidad')} className="input bg-white">
              {UNIDADES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Total pagado ($)</label>
              <input type="number" {...field('totalPagado')} placeholder="Ej: 6000" className="input" />
            </div>
            <div className="flex-1">
              <label className="label">Cantidad ({form.unidad})</label>
              <input type="number" {...field('cantidadComprada')} placeholder="Ej: 5" className="input" />
            </div>
          </div>

          <div>
            <label className="label">Precio por {form.unidad} ($)</label>
            <div className="input font-semibold text-brand-600 bg-gray-50">
              {computedPrecio > 0 ? computedPrecio.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—'}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!form.nombre.trim() || computedPrecio <= 0}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-2"
          >
            {editId ? 'Guardar cambios' : 'Agregar insumo'}
          </button>
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Eliminar insumo?</p>
            <p className="text-sm text-gray-500 text-center mb-5">Se va a borrar de todas las recetas que lo usen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
