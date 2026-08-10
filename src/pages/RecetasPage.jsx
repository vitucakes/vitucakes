import { useMemo, useState } from 'react'
import BottomSheet from '../components/BottomSheet'
import RecetaEditSheet from '../components/RecetaEditSheet'
import { calcCostoReceta, formatARS, MARGEN } from '../utils/calc'
import { matchesConDetalle, promedioCompetencia, recetasParaResolver } from '../utils/competencia'
import { useEditGate, LockToggle } from '../hooks/useEditGate'
import { hayPapeleriaMarcada, productosSinPackaging } from '../utils/papeleria'

export default function RecetasPage({ recetas, setRecetas, insumos, competidoras = [], onSelect, onResolverMatches, onBackup, onMarcarPapeleria }) {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [verSinPackaging, setVerSinPackaging] = useState(false)
  const { canEdit } = useEditGate()

  // Orden: por los MÁS usados/abiertos (contador `usos`), no por el último.
  // Empate (ej. todos en 0 al principio) → alfabético, para un orden neutro.
  const filteredRecetas = recetas
    .filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()))
    .slice()
    .sort((a, b) => (b.usos ?? 0) - (a.usos ?? 0) || a.nombre.localeCompare(b.nombre))

  const pendientesMatch = useMemo(
    () => recetasParaResolver(recetas, competidoras),
    [recetas, competidoras],
  )

  // Papelería: si no hay ninguno marcado, pedimos marcarlos. Si hay, avisamos
  // qué productos no incluyen packaging en su receta.
  const algunaPapeleria = useMemo(() => hayPapeleriaMarcada(insumos), [insumos])
  const sinPackaging = useMemo(() => productosSinPackaging(recetas, insumos), [recetas, insumos])

  const openAdd = () => { setEditId(null); setOpen(true) }
  const openEdit = (r) => { setEditId(r.id); setOpen(true) }
  const editingReceta = editId ? recetas.find((r) => r.id === editId) ?? null : null

  const guardarReceta = (data) => {
    if (editId) {
      setRecetas((prev) => prev.map((r) => (r.id === editId ? { ...r, ...data, updatedAt: Date.now() } : r)))
    } else {
      setRecetas((prev) => [...prev, { id: crypto.randomUUID(), ...data, updatedAt: Date.now() }])
    }
    setOpen(false)
  }

  // Confirmar que un producto NO lleva packaging a propósito: lo saca del aviso
  // sin tener que cargarle una caja/bandeja.
  const marcarNoLlevaPackaging = (id) => {
    setRecetas((prev) => prev.map((r) => (r.id === id ? { ...r, noLlevaPackaging: true, updatedAt: Date.now() } : r)))
  }

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
          <LockToggle />
          {/* Pill de competencia: aparece siempre que hay competidoras cargadas.
              Con N si hay matches pendientes, sin número si está todo resuelto. */}
          {canEdit && competidoras.length > 0 && onResolverMatches && (
            <button
              onClick={onResolverMatches}
              className="px-3 py-2 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm flex-shrink-0"
              title="Competencia"
            >
              <span>🤔{pendientesMatch.length > 0 ? ` ${pendientesMatch.length}` : ''}</span>
            </button>
          )}
          {/* Cassette 💾: acceso a la página de backup (bajar/restaurar a mano).
              Solo para editores; el backup periódico corre automático aparte. */}
          {onBackup && canEdit && (
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

      {/* Aviso de papelería (solo editores). Primero pide marcar la papelería;
          una vez marcada, avisa qué productos no la incluyen en su receta. */}
      {canEdit && recetas.length > 0 && (
        !algunaPapeleria ? (
          <div className="px-4 pt-4">
            <button
              onClick={onMarcarPapeleria}
              className="w-full bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl flex-shrink-0">🏷️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-900">Marcá tus insumos de papelería</p>
                <p className="text-xs text-blue-700">Decime cuáles son cajas, bandejas, bolsas… para avisarte qué productos no tienen packaging cargado.</p>
              </div>
              <span className="text-blue-400 text-lg flex-shrink-0">›</span>
            </button>
          </div>
        ) : sinPackaging.length > 0 ? (
          <div className="px-4 pt-4">
            <button
              onClick={() => setVerSinPackaging(true)}
              className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">{sinPackaging.length} producto{sinPackaging.length !== 1 ? 's' : ''} sin packaging</p>
                <p className="text-xs text-amber-800">No tienen caja/bandeja en la receta. Tocá para verlos y agregarlo.</p>
              </div>
              <span className="text-amber-700 text-lg flex-shrink-0">›</span>
            </button>
          </div>
        ) : null
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
          const costo = calcCostoReceta(r, insumos, recetas)
          // Precio de venta = costo total × margen (receta entera, no por unidad).
          const precioVenta = costo * MARGEN
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.rinde === 1
                        ? `1 ${r.unidadRinde.replace(/s$/, '')}`
                        : `${r.rinde} ${r.unidadRinde}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">Mi precio</p>
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
              {canEdit && (
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
              )}
            </div>
          )
        })}
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

      {/* Form de alta/edición (componente reutilizable, también usado en el detalle) */}
      <RecetaEditSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        receta={editingReceta}
        insumos={insumos}
        recetas={recetas}
        onSave={guardarReceta}
      />

      {/* Productos sin packaging */}
      <BottomSheet isOpen={verSinPackaging} onClose={() => setVerSinPackaging(false)} title="Productos sin packaging">
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">
            Estos productos no tienen ningún insumo de papelería en su receta. Agregales la caja/bandeja,
            o confirmá que no llevan packaging para sacarlos del aviso.
          </p>
          {sinPackaging.length === 0 ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-3 text-center">
              ✓ Listo, no quedan productos sin packaging.
            </p>
          ) : (
            sinPackaging.map((r) => (
              <div key={r.id} className="bg-brand-50 rounded-xl px-3 py-2.5">
                <p className="text-sm font-medium text-gray-800 break-words mb-2">{r.nombre}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setVerSinPackaging(false); openEdit(r) }}
                    className="flex-1 py-2 rounded-lg bg-brand-400 text-white font-semibold text-xs active:scale-95 transition-transform"
                  >
                    Agregar packaging
                  </button>
                  <button
                    onClick={() => marcarNoLlevaPackaging(r.id)}
                    className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 font-semibold text-xs active:scale-95 transition-transform"
                  >
                    No lleva ✓
                  </button>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => { setVerSinPackaging(false); onMarcarPapeleria() }}
            className="w-full mt-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm"
          >
            Configurar qué es papelería
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
