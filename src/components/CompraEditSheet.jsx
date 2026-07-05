import { useEffect, useRef, useState } from 'react'
import BottomSheet from './BottomSheet'
import PickerBuscador from './PickerBuscador'
import { parsearTicket } from '../utils/ticket'

const todayISO = () => new Date().toISOString().slice(0, 10)
const emptyLinea = () => ({ insumoId: '', cantidad: '', total: '', paquetes: '', porPaquete: '' })

// Compra por paquetes: si cargás "3 paquetes de 500 g", la cuenta la hace la
// app (cantidad = paquetes × contenido). Si no, la cantidad se escribe directo.
const usaPaquetes = (l) => parseFloat(l.paquetes) > 0 && parseFloat(l.porPaquete) > 0
const cantidadFinal = (l) =>
  usaPaquetes(l) ? String(Math.round(parseFloat(l.paquetes) * parseFloat(l.porPaquete) * 1000) / 1000) : l.cantidad

// Sheet para registrar o EDITAR una COMPRA. Una compra puede tener varias
// líneas (lo que trajiste en una misma ida). Cada línea suma stock al insumo;
// si cargás el total pagado, además puede actualizar el precio (nunca lo baja).
// `compra` null = nueva; objeto = edición (el padre revierte el efecto viejo
// en el stock y aplica el nuevo).
export default function CompraEditSheet({ isOpen, compra, insumos, onClose, onSubmit }) {
  const [fecha, setFecha] = useState(todayISO())
  const [lineas, setLineas] = useState([emptyLinea()])
  // Confirmación antes de guardar: líneas que subirían el costo del insumo.
  // null = sin modal; array = [{ insumoId, nombre, unidad, actual, nuevo, aplicar }]
  const [confirmPrecios, setConfirmPrecios] = useState(null)
  // Lectura de foto del ticket (OCR en el dispositivo, Tesseract.js):
  // null | { fase: 'leyendo', progreso } | { fase: 'listo', n, sinMatch } | { fase: 'error', msg }
  const [ocr, setOcr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setConfirmPrecios(null)
    setOcr(null)
    setFecha(compra?.fecha ?? todayISO())
    setLineas(
      compra?.items?.length
        ? compra.items.map((it) => ({
            insumoId: it.insumoId,
            cantidad: String(it.cantidad),
            total: it.total > 0 ? String(it.total) : '',
            paquetes: '',
            porPaquete: '',
          }))
        : [emptyLinea()],
    )
  }, [isOpen, compra])

  const insumosOrden = [...insumos].sort((a, b) => a.nombre.localeCompare(b.nombre))

  const setLinea = (i, patch) => setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLinea = () => setLineas((ls) => [...ls, emptyLinea()])
  const removeLinea = (i) => setLineas((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))

  const lineasValidas = lineas.filter((l) => l.insumoId && parseFloat(cantidadFinal(l)) > 0)
  const puedeGuardar = lineasValidas.length > 0

  // OCR de las fotos del ticket, 100% en el dispositivo (no sube las imágenes
  // a ningún lado). Tesseract se importa dinámico para no engordar el bundle;
  // la primera vez baja el modelo de español (~unos MB, después queda cacheado).
  // Acepta varias fotos (ticket largo en partes, o varios tickets de la misma
  // compra) y lo encontrado se SUMA a las líneas ya cargadas.
  const leerFotos = async (files) => {
    const fotos = [...(files || [])].filter(Boolean)
    if (!fotos.length) return
    let fotoActual = 0
    setOcr({ fase: 'leyendo', progreso: 0, foto: 1, fotos: fotos.length })
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text')
            setOcr({ fase: 'leyendo', progreso: m.progress, foto: fotoActual + 1, fotos: fotos.length })
        },
      })
      let texto = ''
      for (fotoActual = 0; fotoActual < fotos.length; fotoActual++) {
        const { data } = await worker.recognize(fotos[fotoActual])
        texto += '\n' + data.text
      }
      await worker.terminate()
      const { lineas: sugeridas, noReconocidos } = parsearTicket(texto, insumos)
      if (!sugeridas.length) {
        setOcr({ fase: 'error', msg: 'No reconocí ningún insumo tuyo en las fotos. Probá con una más nítida o cargá la compra a mano.' })
        return
      }
      // Merge con lo ya cargado: mismo insumo → suma cantidades y totales.
      setLineas((prev) => {
        const resultado = prev.filter((l) => l.insumoId || l.cantidad || l.total).map((l) => ({ ...l }))
        const suma = (a, b) => {
          const x = parseFloat(a) || 0
          const y = parseFloat(b) || 0
          return x + y > 0 ? String(Math.round((x + y) * 1000) / 1000) : ''
        }
        for (const s of sugeridas) {
          const ex = resultado.find((l) => l.insumoId === s.insumoId)
          if (!ex) {
            resultado.push({ ...s, paquetes: '', porPaquete: '' })
            continue
          }
          // Si la línea existente venía por paquetes, se aplana antes de sumar.
          if (usaPaquetes(ex)) {
            ex.cantidad = cantidadFinal(ex)
            ex.paquetes = ''
            ex.porPaquete = ''
          }
          ex.cantidad = suma(ex.cantidad, s.cantidad)
          ex.total = suma(ex.total, s.total)
        }
        return resultado.length ? resultado : [emptyLinea()]
      })
      setOcr({ fase: 'listo', n: sugeridas.length, sinMatch: noReconocidos.length, fotos: fotos.length })
    } catch {
      setOcr({ fase: 'error', msg: 'No pude leer las fotos. Probá de nuevo o cargá la compra a mano.' })
    }
  }

  const buildItems = () =>
    lineasValidas.map((l) => {
      const ins = insumos.find((i) => i.id === l.insumoId)
      return {
        insumoId: l.insumoId,
        nombre: ins?.nombre ?? '',
        unidad: ins?.unidad ?? '',
        cantidad: parseFloat(cantidadFinal(l)) || 0,
        total: parseFloat(l.total) || 0,
      }
    })

  const guardar = (items) => {
    const total = items.reduce((s, it) => s + (it.total || 0), 0)
    onSubmit({ fecha, items, total })
  }

  const submit = () => {
    if (!puedeGuardar) return
    const items = buildItems()
    // Líneas donde el precio pagado por unidad supera el costo actual: antes
    // de aplicar se pregunta cuáles actualizar (una compra de emergencia puede
    // no representar el costo real). Si no hay ninguna, se guarda directo.
    const suben = items
      .map((it) => {
        const ins = insumos.find((i) => i.id === it.insumoId)
        if (!ins || !(it.total > 0) || !(it.cantidad > 0)) return null
        const nuevo = it.total / it.cantidad
        if (nuevo <= (Number(ins.precioPorUnidad) || 0)) return null
        // Al editar, si esa línea ya tenía el "no actualizar" elegido, se
        // respeta como default (destildada).
        const original = compra?.items?.find((x) => x.insumoId === it.insumoId)
        return {
          insumoId: it.insumoId,
          nombre: ins.nombre,
          unidad: ins.unidad,
          actual: Number(ins.precioPorUnidad) || 0,
          nuevo,
          aplicar: original ? original.actualizaPrecio !== false : true,
        }
      })
      .filter(Boolean)
    if (suben.length === 0) {
      guardar(items)
      return
    }
    setConfirmPrecios(suben)
  }

  const confirmarGuardado = () => {
    const noAplicar = new Set(confirmPrecios.filter((c) => !c.aplicar).map((c) => c.insumoId))
    const items = buildItems().map((it) => (noAplicar.has(it.insumoId) ? { ...it, actualizaPrecio: false } : it))
    setConfirmPrecios(null)
    guardar(items)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={compra ? 'Editar compra' : 'Nueva compra'}>
      <div className="space-y-4">
        <div>
          <label className="label">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input bg-white" />
        </div>

        {/* Pre-carga desde una foto del ticket (solo en compra nueva) */}
        {!compra && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                leerFotos(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={ocr?.fase === 'leyendo'}
              className="w-full py-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-sm active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              {ocr?.fase === 'leyendo'
                ? `📷 Leyendo foto ${ocr.foto}/${ocr.fotos}… ${Math.round((ocr.progreso || 0) * 100)}%`
                : '📷 Cargar desde fotos del ticket'}
            </button>
            {ocr?.fase === 'listo' && (
              <p className="text-[11px] text-emerald-700 mt-1.5 px-1">
                ✓ Encontré {ocr.n} insumo{ocr.n !== 1 ? 's' : ''} en {ocr.fotos > 1 ? `las ${ocr.fotos} fotos` : 'el ticket'}
                {ocr.sinMatch > 0 ? ` (${ocr.sinMatch} renglón${ocr.sinMatch !== 1 ? 'es' : ''} sin reconocer)` : ''}. Revisá
                cantidades y totales antes de guardar. Podés sumar más fotos con el mismo botón.
              </p>
            )}
            {ocr?.fase === 'error' && <p className="text-[11px] text-red-500 mt-1.5 px-1">{ocr.msg}</p>}
          </div>
        )}

        <div className="space-y-3">
          {lineas.map((l, i) => {
            const ins = insumos.find((x) => x.id === l.insumoId)
            const cant = parseFloat(cantidadFinal(l)) || 0
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
                {/* Compra por paquetes (opcional): la cuenta la hace la app */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label">Paquetes</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={l.paquetes}
                      onChange={(e) => setLinea(i, { paquetes: e.target.value })}
                      placeholder="opcional"
                      className="input"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label">{ins ? `${ins.unidad} por paquete` : 'Por paquete'}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={l.porPaquete}
                      onChange={(e) => setLinea(i, { porPaquete: e.target.value })}
                      placeholder="Ej: 500"
                      className="input"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label">Cantidad {ins ? `(${ins.unidad})` : ''}</label>
                    {usaPaquetes(l) ? (
                      <div className="input bg-gray-50 font-semibold text-brand-600">{cantidadFinal(l)}</div>
                    ) : (
                      <input
                        type="number"
                        inputMode="decimal"
                        value={l.cantidad}
                        onChange={(e) => setLinea(i, { cantidad: e.target.value })}
                        placeholder="Ej: 5"
                        className="input"
                      />
                    )}
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
                {usaPaquetes(l) && (
                  <p className="text-[11px] text-gray-400">
                    {l.paquetes} paquete{parseFloat(l.paquetes) !== 1 ? 's' : ''} × {l.porPaquete} {ins?.unidad ?? ''} ={' '}
                    {cantidadFinal(l)} {ins?.unidad ?? ''}
                  </p>
                )}
                {precioUnit != null && ins && (
                  <p className={`text-[11px] ${subePrecio ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>
                    {precioUnit.toLocaleString('es-AR', { maximumFractionDigits: 2 })} $/{ins.unidad}
                    {subePrecio
                      ? ` · más caro que el costo actual ($${Number(ins.precioPorUnidad).toLocaleString('es-AR')}): al guardar te pregunta si actualizarlo`
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
            ? 'Al guardar se recalcula el stock: se deshace lo que había sumado esta compra y se aplica lo nuevo. Si pagaste más caro, te pregunta si actualizar el costo (nunca lo baja).'
            : 'Suma el stock de cada insumo. Si cargás el total y pagaste más caro que el costo actual, te pregunta si actualizarlo (nunca lo baja).'}
        </p>
      </div>

      {/* Confirmación: qué costos actualizar (encima del sheet, z-60 > z-50) */}
      {confirmPrecios && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPrecios(null)} />
          <div className="relative bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Actualizar el costo de estos insumos?</p>
            <p className="text-xs text-gray-500 text-center mb-4">
              Pagaste más caro que el costo actual. Destildá lo que fue una compra de emergencia y no representa el costo real (el stock se suma igual).
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
              {confirmPrecios.map((c) => (
                <label key={c.insumoId} className="flex items-center gap-3 bg-brand-50 rounded-xl px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.aplicar}
                    onChange={(e) =>
                      setConfirmPrecios((prev) =>
                        prev.map((p) => (p.insumoId === c.insumoId ? { ...p, aplicar: e.target.checked } : p)),
                      )
                    }
                    className="w-5 h-5 accent-brand-500 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 break-words">{c.nombre}</p>
                    <p className="text-[11px] text-gray-500">
                      ${c.actual.toLocaleString('es-AR', { maximumFractionDigits: 2 })} →{' '}
                      <span className="font-semibold text-emerald-700">
                        ${c.nuevo.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </span>{' '}
                      el {c.unidad}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPrecios(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">
                Volver
              </button>
              <button onClick={confirmarGuardado} className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
