import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import PickerBuscador from './PickerBuscador'

const todayISO = () => new Date().toISOString().slice(0, 10)
const emptyLinea = () => ({ insumoId: '', cantidad: '', total: '' })

// Sheet para registrar o EDITAR una COMPRA. Una compra puede tener varias
// líneas (lo que trajiste en una misma ida). Cada línea suma stock al insumo;
// si cargás el total pagado, además puede actualizar el precio (nunca lo baja).
// `compra` null = nueva; objeto = edición (el padre revierte el efecto viejo
// en el stock y aplica el nuevo).
export default function CompraEditSheet({ isOpen, compra, insumos, onClose, onSubmit }) {
  const [fecha, setFecha] = useState(todayISO())
  const [lineas, setLineas] = useState([emptyLinea()])

  useEffect(() => {
    if (!isOpen) return
    setFecha(compra?.fecha ?? todayISO())
    setLineas(
      compra?.items?.length
        ? compra.items.map((it) => ({
            insumoId: it.insumoId,
            cantidad: String(it.cantidad),
            total: it.total > 0 ? String(it.total) : '',
          }))
        : [emptyLinea()],
    )
  }, [isOpen, compra])

  const insumosOrden = [...insumos].sort((a, b) => a.nombre.localeCompare(b.nombre))

  const setLinea = (i, patch) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLinea = () => setLineas((ls) => [...ls, emptyLinea()])
  const removeLinea = (i) => setLineas((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))

  const lineasValidas = lineas.filter((l) => l.insumoId && parseFloat(l.cantidad) > 0)
  const puedeGuardar = lineasValidas.length > 0

  const submit = () => {
    if (!puedeGuardar) return
    const items = lineasValidas.map((l) => {
      const ins = insumos.find((i) => i.id === l.insumoId)
      return {
        insumoId: l.insumoId,
        nombre: ins?.nombre ?? '',
        unidad: ins?.unidad ?? '',
        cantidad: parseFloat(l.cantidad) || 0,
        total: parseFloat(l.total) || 0,
      }
    })
    const total = items.reduce((s, it) => s + (it.total || 0), 0)
    onSubmit({ fecha, items, total })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={compra ? 'Editar compra' : 'Nueva compra'}>
      <div className="space-y-4">
        <div>
          <label className="label">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input bg-white" />
        </div>

        <div className="space-y-3">
          {lineas.map((l, i) => {
            const ins = insumos.find((x) => x.id === l.insumoId)
            const cant = parseFloat(l.cantidad) || 0
            const total = parseFloat(l.total) || 0
            const precioUnit = cant > 0 && total > 0 ? total / cant : null
            const subePrecio = ins && precioUnit != null && precioUnit > (Number(ins.precioPorUnidad) || 0)
            return (
              <div key={i} className="bg-brand-50 rounded-2xl p-3 space-y-2 relative">
                {lineas.length > 1 && (
                  <button
                    onClick={() => removeLinea(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-gray-400 text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                )}
                {/* Se excluyen los insumos ya elegidos en otra línea: repetir el
                    mismo insumo en dos líneas rompe la reversión del stock al
                    borrar la compra (se aplica una vez pero se revierte dos). */}
                <PickerBuscador
                  items={insumosOrden
                    .filter((x) => x.id === l.insumoId || !lineas.some((ol, j) => j !== i && ol.insumoId === x.id))
                    .map((x) => ({ id: x.id, nombre: x.nombre, detalle: x.unidad }))}
                  value={l.insumoId}
                  onChange={(id) => setLinea(i, { insumoId: id })}
                  placeholder="🔍 Buscar insumo..."
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label">Cantidad {ins ? `(${ins.unidad})` : ''}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={l.cantidad}
                      onChange={(e) => setLinea(i, { cantidad: e.target.value })}
                      placeholder="Ej: 5"
                      className="input"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label">Total pagado ($)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={l.total}
                      onChange={(e) => setLinea(i, { total: e.target.value })}
                      placeholder="opcional"
                      className="input"
                    />
                  </div>
                </div>
                {precioUnit != null && ins && (
                  <p className={`text-[11px] ${subePrecio ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>
                    {precioUnit.toLocaleString('es-AR', { maximumFractionDigits: 2 })} $/{ins.unidad}
                    {subePrecio
                      ? ` · actualiza el precio (antes $${Number(ins.precioPorUnidad).toLocaleString('es-AR')})`
                      : ` · no cambia el precio (actual $${Number(ins.precioPorUnidad).toLocaleString('es-AR')})`}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={addLinea}
          className="w-full py-2.5 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm active:scale-95 transition-transform"
        >
          + Agregar otro insumo
        </button>

        <button
          onClick={submit}
          disabled={!puedeGuardar}
          className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform mt-1"
        >
          {compra ? 'Guardar cambios' : 'Registrar compra'}
        </button>
        <p className="text-[11px] text-gray-400 text-center">
          {compra
            ? 'Al guardar se recalcula el stock: se deshace lo que había sumado esta compra y se aplica lo nuevo. El precio de los insumos solo puede subir (nunca baja).'
            : 'Suma el stock de cada insumo. Si cargás el total y el precio por unidad subió, también actualiza el precio (nunca lo baja).'}
        </p>
      </div>
    </BottomSheet>
  )
}
