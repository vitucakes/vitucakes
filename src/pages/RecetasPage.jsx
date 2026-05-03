import { useState } from 'react'
import BottomSheet from '../components/BottomSheet'
import { calcCostoReceta, formatARS } from '../utils/calc'

const EMPTY_RECETA = { nombre: '', rinde: '', unidadRinde: 'unidades', ingredientes: [], margen: 3 }
const EMPTY_ING = { insumoId: '', cantidad: '' }

export default function RecetasPage({ recetas, setRecetas, insumos, onSelect }) {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_RECETA)
  const [ingForm, setIngForm] = useState(EMPTY_ING)
  const [search, setSearch] = useState('')

  const filteredRecetas = recetas
    .filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  const openAdd = () => { setEditId(null); setForm(EMPTY_RECETA); setIngForm(EMPTY_ING); setOpen(true) }

  const openEdit = (r) => {
    setEditId(r.id)
    setForm({ nombre: r.nombre, rinde: String(r.rinde), unidadRinde: r.unidadRinde, ingredientes: [...r.ingredientes], margen: r.margen })
    setIngForm(EMPTY_ING)
    setOpen(true)
  }

  const addIngrediente = () => {
    const cantidad = parseFloat(ingForm.cantidad)
    if (!ingForm.insumoId || isNaN(cantidad) || cantidad <= 0) return
    if (form.ingredientes.find((i) => i.insumoId === ingForm.insumoId)) {
      setForm((f) => ({ ...f, ingredientes: f.ingredientes.map((i) => i.insumoId === ingForm.insumoId ? { ...i, cantidad } : i) }))
    } else {
      setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, { insumoId: ingForm.insumoId, cantidad }] }))
    }
    setIngForm(EMPTY_ING)
  }

  const removeIngrediente = (insumoId) => {
    setForm((f) => ({ ...f, ingredientes: f.ingredientes.filter((i) => i.insumoId !== insumoId) }))
  }

  const handleSave = () => {
    const nombre = form.nombre.trim()
    const rinde = parseFloat(form.rinde)
    if (!nombre || isNaN(rinde) || rinde <= 0 || form.ingredientes.length === 0) return
    const data = { nombre, rinde, unidadRinde: form.unidadRinde, ingredientes: form.ingredientes, margen: form.margen, updatedAt: Date.now() }
    if (editId) {
      setRecetas((prev) => prev.map((r) => r.id === editId ? { ...r, ...data } : r))
    } else {
      setRecetas((prev) => [...prev, { id: crypto.randomUUID(), ...data }])
    }
    setOpen(false)
  }

  const insumoName = (id) => insumos.find((i) => i.id === id)?.nombre ?? '?'
  const insumoUnit = (id) => insumos.find((i) => i.id === id)?.unidad ?? ''

  const availableInsumos = insumos.filter((i) => !form.ingredientes.find((ing) => ing.insumoId === i.id))

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Recetas</h1>
            <p className="text-xs text-gray-400 mt-0.5">{recetas.length} receta{recetas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Buscar receta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {recetas.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🎂</div>
            <p className="font-medium">No hay recetas todavía</p>
            <p className="text-sm mt-1">Tocá el botón + para crear una</p>
          </div>
        )}
        {recetas.length > 0 && filteredRecetas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No hay recetas que coincidan con "{search}"</p>
          </div>
        )}
        {filteredRecetas.map((r) => {
          const costo = calcCostoReceta(r, insumos)
          const precioVenta = r.rinde > 0 ? (costo / r.rinde) * r.margen : 0
          const tieneProblema = r.ingredientes.some((ing) => {
            const ins = insumos.find((i) => i.id === ing.insumoId)
            return !ins || ins.precioPorUnidad <= 0
          })
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`w-full bg-white rounded-2xl px-4 py-4 text-left shadow-sm active:scale-[0.98] transition-transform border ${tieneProblema ? 'border-amber-200' : 'border-brand-50'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 text-base truncate">{r.nombre}</p>
                    {tieneProblema && <span className="text-base flex-shrink-0">⚠️</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Rinde {r.rinde} {r.unidadRinde} · {r.ingredientes.length} ingrediente{r.ingredientes.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="ml-3 text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Venta / u</p>
                  <p className="text-lg font-bold text-brand-500">{formatARS(precioVenta)}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-brand-50 flex justify-between text-xs text-gray-500">
                <span>Costo total: <span className="font-medium">{formatARS(costo)}</span></span>
                <span>Margen: <span className="font-medium">{r.margen}x</span></span>
              </div>
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-4 w-14 h-14 bg-brand-400 rounded-full shadow-lg flex items-center justify-center text-white text-3xl active:scale-95 transition-transform z-30"
      >
        +
      </button>

      {/* Form sheet */}
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={editId ? 'Editar receta' : 'Nueva receta'}>
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="label">Nombre de la receta</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Facturas de manteca"
              className="input"
            />
          </div>

          {/* Rinde */}
          <div className="flex gap-3">
            <div className="w-28">
              <label className="label">Rinde</label>
              <input
                type="number"
                value={form.rinde}
                onChange={(e) => setForm((f) => ({ ...f, rinde: e.target.value }))}
                placeholder="12"
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Unidad</label>
              <input
                value={form.unidadRinde}
                onChange={(e) => setForm((f) => ({ ...f, unidadRinde: e.target.value }))}
                placeholder="Ej: facturas, porciones"
                className="input"
              />
            </div>
          </div>

          {/* Margen */}
          <div>
            <label className="label">Margen de ganancia</label>
            <div className="flex gap-2 mb-2">
              {[2, 2.5, 3, 3.5, 4].map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, margen: m }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                    form.margen === m ? 'bg-brand-400 text-white' : 'bg-brand-50 text-brand-600'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>
            <input
              type="number"
              value={form.margen}
              onChange={(e) => setForm((f) => ({ ...f, margen: parseFloat(e.target.value) || 1 }))}
              placeholder="Ej: 3"
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">El precio de venta será {form.margen}x el costo</p>
          </div>

          {/* Ingredientes */}
          <div>
            <label className="label">Ingredientes ({form.ingredientes.length})</label>

            {form.ingredientes.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.ingredientes.map((ing) => (
                  <div key={ing.insumoId} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-gray-700">{insumoName(ing.insumoId)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-500 font-semibold">{ing.cantidad} {insumoUnit(ing.insumoId)}</span>
                      <button onClick={() => removeIngrediente(ing.insumoId)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {insumos.length === 0 && (
              <p className="text-xs text-brand-500 bg-brand-50 rounded-xl px-3 py-2">
                Primero agregá insumos en la pestaña 🧂 Insumos
              </p>
            )}

            {availableInsumos.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500">Agregar ingrediente</p>
                <select
                  value={ingForm.insumoId}
                  onChange={(e) => setIngForm((f) => ({ ...f, insumoId: e.target.value }))}
                  className="input bg-white"
                >
                  <option value="">Seleccionar insumo...</option>
                  {availableInsumos.map((i) => (
                    <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={ingForm.cantidad}
                    onChange={(e) => setIngForm((f) => ({ ...f, cantidad: e.target.value }))}
                    placeholder={`Cantidad en ${insumos.find(i => i.id === ingForm.insumoId)?.unidad ?? 'unidad'}`}
                    className="input flex-1"
                  />
                  <button
                    onClick={addIngrediente}
                    disabled={!ingForm.insumoId || !ingForm.cantidad}
                    className="px-4 py-2.5 rounded-xl bg-brand-400 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!form.nombre.trim() || !form.rinde || form.ingredientes.length === 0}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-2"
          >
            {editId ? 'Guardar cambios' : 'Crear receta'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
