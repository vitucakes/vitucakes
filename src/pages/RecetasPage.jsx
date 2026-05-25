import { useMemo, useState } from 'react'
import BottomSheet from '../components/BottomSheet'
import { calcCostoReceta, formatARS, MARGEN } from '../utils/calc'
import { matchesConDetalle, promedioCompetencia, recetasParaResolver } from '../utils/competencia'

const EMPTY_RECETA = { nombre: '', rinde: '', unidadRinde: 'unidades', ingredientes: [] }
const EMPTY_ING = { insumoId: '', cantidad: '' }

export default function RecetasPage({ recetas, setRecetas, insumos, competidoras = [], onSelect, onResolverMatches, onBackup }) {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_RECETA)
  const [ingForm, setIngForm] = useState(EMPTY_ING)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const filteredRecetas = recetas
    .filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  const pendientesMatch = useMemo(
    () => recetasParaResolver(recetas, competidoras),
    [recetas, competidoras],
  )

  // Banner de recordatorio de backup. Si pasaron más de 14 días desde el
  // último backup, mostramos un aviso amarillo. La fecha se guarda en
  // localStorage cuando el user descarga uno (en BackupPage).
  const diasSinBackup = useMemo(() => {
    const last = localStorage.getItem('vitucakes_last_backup_at')
    if (!last) return Infinity
    const dias = (Date.now() - parseInt(last, 10)) / (1000 * 60 * 60 * 24)
    return Math.floor(dias)
  }, [])
  const mostrarRecordatorioBackup = diasSinBackup >= 14 && recetas.length > 0

  const openAdd = () => { setEditId(null); setForm(EMPTY_RECETA); setIngForm(EMPTY_ING); setOpen(true) }

  const openEdit = (r) => {
    setEditId(r.id)
    setForm({ nombre: r.nombre, rinde: String(r.rinde), unidadRinde: r.unidadRinde, ingredientes: [...r.ingredientes] })
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
    const data = { nombre, rinde, unidadRinde: form.unidadRinde, ingredientes: form.ingredientes, updatedAt: Date.now() }
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
        <div className="flex items-center gap-3 mb-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vitucakes" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
            <p className="text-xs text-gray-400 mt-0.5">{recetas.length} producto{recetas.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Pill de competencia: aparece siempre que hay competidoras cargadas.
              Con N si hay matches pendientes, sin número si está todo resuelto. */}
          {competidoras.length > 0 && onResolverMatches && (
            <button
              onClick={onResolverMatches}
              className="px-3 py-2 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm flex-shrink-0"
              title="Competencia"
            >
              <span>🤔{pendientesMatch.length > 0 ? ` ${pendientesMatch.length}` : ''}</span>
            </button>
          )}
          {onBackup && (
            <button
              onClick={onBackup}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-base flex-shrink-0"
              title="Backup de datos"
              aria-label="Backup de datos"
            >
              💾
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {/* Banner recordatorio de backup */}
      {mostrarRecordatorioBackup && onBackup && (
        <div className="px-4 pt-4">
          <button
            onClick={onBackup}
            className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl flex-shrink-0">💾</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Bajá un backup</p>
              <p className="text-xs text-amber-800">
                {diasSinBackup === Infinity
                  ? 'Nunca bajaste un respaldo. Tus datos solo viven en este celu.'
                  : `Hace ${diasSinBackup} días que no respaldás. Tocá para descargar uno.`}
              </p>
            </div>
            <span className="text-amber-700 font-bold text-lg flex-shrink-0">›</span>
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {recetas.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">🎂</div>
            <p className="font-medium">No hay productos todavía</p>
            <p className="text-sm mt-1">Tocá el botón + para crear uno</p>
          </div>
        )}
        {recetas.length > 0 && filteredRecetas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No hay productos que coincidan con "{search}"</p>
          </div>
        )}
        {filteredRecetas.map((r) => {
          const costo = calcCostoReceta(r, insumos)
          const precioVenta = r.rinde > 0 ? (costo / r.rinde) * MARGEN : 0
          const tieneProblema = r.ingredientes.some((ing) => {
            const ins = insumos.find((i) => i.id === ing.insumoId)
            return !ins || ins.precioPorUnidad <= 0
          })
          // Competencia: si la receta tiene matches confirmados, calculamos
          // el promedio para mostrar la referencia y el diff vs el precio propio.
          const matches = matchesConDetalle(r, competidoras)
          const compPromedio = promedioCompetencia(matches)
          const diffPct = compPromedio > 0 && precioVenta > 0
            ? ((precioVenta - compPromedio) / compPromedio) * 100
            : null
          return (
            <div
              key={r.id}
              className={`bg-white rounded-2xl shadow-sm border ${tieneProblema ? 'border-amber-200' : 'border-brand-50'}`}
            >
              <button
                onClick={() => onSelect(r.id)}
                className="w-full px-4 pt-4 pb-2 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-base break-words">{r.nombre}</p>
                      {tieneProblema && <span className="text-base flex-shrink-0">⚠️</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Rinde {r.rinde} {r.unidadRinde}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">Mi precio /u</p>
                    <p className="text-xl font-black text-brand-500 leading-tight">{formatARS(precioVenta)}</p>
                    <p className="text-[10px] text-gray-400">margen {MARGEN}x</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-brand-50 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Costo total</span>
                    <span className="font-semibold text-gray-700">{formatARS(costo)}</span>
                  </div>
                  {compPromedio > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">
                        Competencia
                        {matches.length > 1 ? ` (avg ${matches.length})` : ''}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">{formatARS(compPromedio)}</span>
                        {diffPct !== null && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              diffPct > 5
                                ? 'bg-amber-100 text-amber-700'
                                : diffPct < -5
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {diffPct > 0 ? '+' : ''}{diffPct.toFixed(0)}%
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              <div className="px-4 pb-3 pt-1 flex justify-end gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-base"
                  aria-label="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-base"
                  aria-label="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
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
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={editId ? 'Editar producto' : 'Nuevo producto'}>
        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="label">Nombre del producto</label>
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
            {editId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      {deleteId && (() => {
        const r = recetas.find((x) => x.id === deleteId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteId(null)} />
            <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <p className="text-base font-bold text-gray-800 text-center mb-1">¿Eliminar producto?</p>
              <p className="text-sm text-gray-500 text-center mb-5">
                <span className="font-semibold">{r?.nombre}</span> se va a borrar. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
                <button
                  onClick={() => {
                    setRecetas((prev) => prev.filter((x) => x.id !== deleteId))
                    setDeleteId(null)
                  }}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
