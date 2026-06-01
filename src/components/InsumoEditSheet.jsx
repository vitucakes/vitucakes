import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'

const UNIDADES = ['kg', 'g', 'l', 'ml', 'u', 'cdas', 'cdtas', 'taza', 'atado']
const EMPTY = { nombre: '', unidad: 'kg', precioPorUnidad: '', totalPagado: '', cantidadComprada: '' }

// Sheet para crear/editar un insumo. Reutilizable:
//  - InsumosPage lo usa para crear y editar desde la lista.
//  - RecetaDetail lo usa al tocar un ingrediente, para editarlo SIN salir de la
//    receta (te quedás en el producto).
//
// El componente solo maneja el formulario. La persistencia (id, fecha, etc.) la
// resuelve el padre en `onSubmit({ nombre, unidad, precioPorUnidad })`.
export default function InsumoEditSheet({ isOpen, insumo, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY)

  // Al abrir (o cambiar el insumo a editar) cargamos sus datos en el form.
  useEffect(() => {
    if (!isOpen) return
    setForm(
      insumo
        ? {
            nombre: insumo.nombre,
            unidad: insumo.unidad,
            precioPorUnidad: String(insumo.precioPorUnidad),
            totalPagado: '',
            cantidadComprada: '',
          }
        : EMPTY,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, insumo?.id])

  // Precio por unidad: si cargás total + cantidad, se calcula solo; si no,
  // mantiene el precio anterior.
  const computedPrecio = (() => {
    const t = parseFloat(form.totalPagado)
    const c = parseFloat(form.cantidadComprada)
    if (t > 0 && c > 0) return t / c
    return parseFloat(form.precioPorUnidad) || 0
  })()

  const field = (k) => ({
    value: form[k],
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  const submit = () => {
    const nombre = form.nombre.trim()
    if (!nombre || computedPrecio <= 0) return
    onSubmit({ nombre, unidad: form.unidad, precioPorUnidad: computedPrecio })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={insumo ? 'Editar insumo' : 'Nuevo insumo'}>
      <div className="space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input {...field('nombre')} placeholder="Ej: Harina 000" className="input" />
        </div>
        <div>
          <label className="label">Unidad</label>
          <select {...field('unidad')} className="input bg-white">
            {UNIDADES.map((u) => (
              <option key={u}>{u}</option>
            ))}
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
          onClick={submit}
          disabled={!form.nombre.trim() || computedPrecio <= 0}
          className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-2"
        >
          {insumo ? 'Guardar cambios' : 'Agregar insumo'}
        </button>
      </div>
    </BottomSheet>
  )
}
