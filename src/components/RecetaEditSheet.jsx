import { useEffect, useMemo, useState } from 'react'
import BottomSheet from './BottomSheet'

// Form de alta/edición de producto (receta). Reutilizable: se usa tanto en la
// lista (RecetasPage) como dentro del detalle (RecetaDetail), para poder editar
// sin salir del producto.
//
// - `receta` null   -> modo "Nuevo producto" (form vacío).
// - `receta` objeto -> modo "Editar producto" (form precargado).
// `onSave(data)` recibe { nombre, rinde, unidadRinde, ingredientes, componentes, descripcion };
// el padre decide si crea o actualiza (y preserva el resto de los campos).
//
// Un producto puede llevar INSUMOS y/o otros PRODUCTOS (componentes). Un
// componente { recetaId, cantidad } tiene `cantidad` en UNIDADES del
// sub-producto (ej: 1 alfajor de una receta que rinde 12 → cantidad 1, que
// equivale a 1/12 de esa receta). El costo y el stock se prorratean por rinde.

const EMPTY_RECETA = { nombre: '', rinde: '', unidadRinde: 'unidades', ingredientes: [], componentes: [], descripcion: '' }
const EMPTY_ING = { insumoId: '', cantidad: '' }
const EMPTY_COMP = { recetaId: '', cantidad: '' }

// ¿La receta `candidatoId` incluye (directa o transitivamente) a `targetId`?
// Se usa para no dejar armar un ciclo al elegir un componente.
function contieneA(candidatoId, targetId, recetas, seen = new Set()) {
  if (candidatoId === targetId) return true
  if (seen.has(candidatoId)) return false
  seen.add(candidatoId)
  const r = recetas.find((x) => x.id === candidatoId)
  return (r?.componentes ?? []).some((c) => contieneA(c.recetaId, targetId, recetas, seen))
}

export default function RecetaEditSheet({ isOpen, onClose, receta, insumos, recetas = [], onSave }) {
  const [form, setForm] = useState(EMPTY_RECETA)
  const [ingForm, setIngForm] = useState(EMPTY_ING)
  const [ingSearch, setIngSearch] = useState('')
  const [compForm, setCompForm] = useState(EMPTY_COMP)
  const [compSearch, setCompSearch] = useState('')

  // Al abrir (o cambiar de receta), cargar los datos en el form.
  useEffect(() => {
    if (!isOpen) return
    setForm(
      receta
        ? {
            nombre: receta.nombre,
            rinde: String(receta.rinde),
            unidadRinde: receta.unidadRinde,
            ingredientes: [...receta.ingredientes],
            componentes: [...(receta.componentes ?? [])],
            descripcion: receta.descripcion ?? '',
          }
        : EMPTY_RECETA,
    )
    setIngForm(EMPTY_ING)
    setIngSearch('')
    setCompForm(EMPTY_COMP)
    setCompSearch('')
  }, [isOpen, receta])

  const insumoName = (id) => insumos.find((i) => i.id === id)?.nombre ?? '?'
  const insumoUnit = (id) => insumos.find((i) => i.id === id)?.unidad ?? ''
  const recetaById = (id) => recetas.find((r) => r.id === id)

  const availableInsumos = insumos.filter((i) => !form.ingredientes.find((ing) => ing.insumoId === i.id))
  const filteredInsumos = useMemo(() => {
    const q = ingSearch.trim().toLowerCase()
    if (!q) return availableInsumos
    return availableInsumos.filter((i) => i.nombre.toLowerCase().includes(q))
  }, [availableInsumos, ingSearch])

  // Productos que se pueden agregar como componentes: todos menos este mismo,
  // menos los ya agregados, y menos los que ya dependen de este (evita ciclos).
  const availableRecetas = useMemo(
    () =>
      recetas.filter(
        (r) =>
          r.id !== receta?.id &&
          !form.componentes.find((c) => c.recetaId === r.id) &&
          !(receta?.id && contieneA(r.id, receta.id, recetas)),
      ),
    [recetas, receta, form.componentes],
  )
  const filteredRecetas = useMemo(() => {
    const q = compSearch.trim().toLowerCase()
    if (!q) return availableRecetas
    return availableRecetas.filter((r) => r.nombre.toLowerCase().includes(q))
  }, [availableRecetas, compSearch])

  const addIngrediente = () => {
    const cantidad = parseFloat(ingForm.cantidad)
    if (!ingForm.insumoId || isNaN(cantidad) || cantidad <= 0) return
    if (form.ingredientes.find((i) => i.insumoId === ingForm.insumoId)) {
      setForm((f) => ({ ...f, ingredientes: f.ingredientes.map((i) => (i.insumoId === ingForm.insumoId ? { ...i, cantidad } : i)) }))
    } else {
      setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, { insumoId: ingForm.insumoId, cantidad }] }))
    }
    setIngForm(EMPTY_ING)
    setIngSearch('')
  }

  const removeIngrediente = (insumoId) => {
    setForm((f) => ({ ...f, ingredientes: f.ingredientes.filter((i) => i.insumoId !== insumoId) }))
  }

  const addComponente = () => {
    const cantidad = parseFloat(compForm.cantidad)
    if (!compForm.recetaId || isNaN(cantidad) || cantidad <= 0) return
    if (form.componentes.find((c) => c.recetaId === compForm.recetaId)) {
      setForm((f) => ({ ...f, componentes: f.componentes.map((c) => (c.recetaId === compForm.recetaId ? { ...c, cantidad } : c)) }))
    } else {
      setForm((f) => ({ ...f, componentes: [...f.componentes, { recetaId: compForm.recetaId, cantidad }] }))
    }
    setCompForm(EMPTY_COMP)
    setCompSearch('')
  }

  const removeComponente = (recetaId) => {
    setForm((f) => ({ ...f, componentes: f.componentes.filter((c) => c.recetaId !== recetaId) }))
  }

  const handleSave = () => {
    const nombre = form.nombre.trim()
    const rinde = parseFloat(form.rinde)
    // Puede tener solo insumos, solo componentes, o ambos — pero algo debe llevar.
    if (!nombre || isNaN(rinde) || rinde <= 0 || (form.ingredientes.length === 0 && form.componentes.length === 0)) return
    onSave({
      nombre,
      rinde,
      unidadRinde: form.unidadRinde,
      ingredientes: form.ingredientes,
      componentes: form.componentes,
      descripcion: form.descripcion?.trim() ?? '',
    })
  }

  const compSel = recetaById(compForm.recetaId)
  const compRinde = Number(compSel?.rinde) || 1

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={receta ? 'Editar producto' : 'Nuevo producto'}>
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
              <input
                value={ingSearch}
                onChange={(e) => setIngSearch(e.target.value)}
                placeholder="🔍 Buscar insumo..."
                className="input bg-white"
              />
              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {filteredInsumos.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-3 text-center">
                    Sin resultados para “{ingSearch.trim()}”
                  </p>
                ) : (
                  filteredInsumos.map((i) => {
                    const selected = ingForm.insumoId === i.id
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setIngForm((f) => ({ ...f, insumoId: i.id }))}
                        className={`w-full flex items-center justify-between text-left px-3 py-2.5 text-sm transition-colors ${selected ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-gray-700 active:bg-brand-50'}`}
                      >
                        <span>{i.nombre}</span>
                        <span className="text-xs text-gray-400">{i.unidad}</span>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={ingForm.cantidad}
                  onChange={(e) => setIngForm((f) => ({ ...f, cantidad: e.target.value }))}
                  placeholder={`Cantidad en ${insumos.find((i) => i.id === ingForm.insumoId)?.unidad ?? 'unidad'}`}
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

        {/* Productos que lleva (componentes) — otros productos ya creados */}
        <div>
          <label className="label">Lleva otros productos ({form.componentes.length})</label>

          {form.componentes.length > 0 && (
            <div className="space-y-2 mb-3">
              {form.componentes.map((comp) => {
                const sub = recetaById(comp.recetaId)
                const rinde = Number(sub?.rinde) || 1
                return (
                  <div key={comp.recetaId} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-700 break-words">{sub?.nombre ?? 'Producto borrado'}</span>
                      <p className="text-[11px] text-gray-400">= {Math.round((comp.cantidad / rinde) * 10000) / 10000} de la receta (rinde {rinde})</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-brand-500 font-semibold">{comp.cantidad} {sub?.unidadRinde ?? 'u'}</span>
                      <button onClick={() => removeComponente(comp.recetaId)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {availableRecetas.length > 0 ? (
            <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Agregar un producto ya creado</p>
              <input
                value={compSearch}
                onChange={(e) => setCompSearch(e.target.value)}
                placeholder="🔍 Buscar producto..."
                className="input bg-white"
              />
              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {filteredRecetas.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-3 text-center">
                    Sin resultados para “{compSearch.trim()}”
                  </p>
                ) : (
                  filteredRecetas.map((r) => {
                    const selected = compForm.recetaId === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setCompForm((f) => ({ ...f, recetaId: r.id }))}
                        className={`w-full flex items-center justify-between text-left px-3 py-2.5 text-sm transition-colors ${selected ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-gray-700 active:bg-brand-50'}`}
                      >
                        <span className="break-words min-w-0">{r.nombre}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">rinde {r.rinde}</span>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={compForm.cantidad}
                  onChange={(e) => setCompForm((f) => ({ ...f, cantidad: e.target.value }))}
                  placeholder={compSel ? `Cuántas ${compSel.unidadRinde} (de ${compSel.rinde})` : 'Cuántas unidades'}
                  className="input flex-1"
                />
                <button
                  onClick={addComponente}
                  disabled={!compForm.recetaId || !compForm.cantidad}
                  className="px-4 py-2.5 rounded-xl bg-brand-400 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
                >
                  +
                </button>
              </div>
              {compSel && parseFloat(compForm.cantidad) > 0 && (
                <p className="text-[11px] text-gray-500 px-1">
                  {compForm.cantidad} de {compSel.rinde} = {Math.round((parseFloat(compForm.cantidad) / compRinde) * 10000) / 10000} de la receta de <span className="font-semibold">{compSel.nombre}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 px-1">
              Podés incluir otro producto ya creado (ej: un desayuno que lleva 1 alfajor). {recetas.length <= 1 ? 'Creá más productos primero.' : ''}
            </p>
          )}
        </div>

        {/* Descripción para copy/paste a clientes. El precio se concatena
            solo al final cuando se ve/copia desde RecetaDetail. */}
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Cheesecake de frutos rojos, base de vainilla, rinde 8 porciones. Hacelo con 48hs de anticipación."
            rows={4}
            className="input resize-none leading-snug"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Te lo dejamos listo para copiar-pegar. El precio se agrega solo al final, no lo escribas.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!form.nombre.trim() || !form.rinde || (form.ingredientes.length === 0 && form.componentes.length === 0)}
          className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-2"
        >
          {receta ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </BottomSheet>
  )
}
