import { useState } from 'react'
import { calcCostoInsumos, calcGastosIndirectos, calcCostoTotal, formatARS, GASTOS_INDIRECTOS, MARGEN } from '../utils/calc'

export default function RecetaDetail({ receta, insumos, onBack, onUpdate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const costoInsumos = calcCostoInsumos(receta, insumos)
  const indirectos = calcGastosIndirectos(costoInsumos)
  const costo = calcCostoTotal(costoInsumos)
  const costoPorUnidad = receta.rinde > 0 ? costo / receta.rinde : 0
  const precioVenta = costoPorUnidad * MARGEN

  const insumosConProblema = receta.ingredientes.filter((ing) => {
    const ins = insumos.find((i) => i.id === ing.insumoId)
    return !ins || ins.precioPorUnidad <= 0
  })

  return (
    <div className="flex flex-col min-h-full bg-brand-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1 break-words">{receta.nombre}</h1>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50"
          >
            🗑️
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Rinde <span className="font-semibold text-gray-700">{receta.rinde} {receta.unidadRinde}</span>
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Warning: insumos faltantes */}
        {insumosConProblema.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3 items-start">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">Insumos con problema</p>
              <ul className="mt-1 space-y-0.5">
                {insumosConProblema.map((ing) => {
                  const ins = insumos.find((i) => i.id === ing.insumoId)
                  return (
                    <li key={ing.insumoId} className="text-xs text-amber-700">
                      {ins ? `"${ins.nombre}" no tiene precio cargado` : `Un insumo fue eliminado — el costo puede estar incompleto`}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Precio de venta — hero card */}
        <div className="bg-brand-400 rounded-3xl p-5 text-white shadow-md">
          <p className="text-sm font-medium opacity-80 mb-1">Precio de venta por unidad</p>
          <p className="text-4xl font-black">{formatARS(precioVenta)}</p>
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-sm">
            <span className="opacity-70">Costo / u: <span className="font-bold opacity-100">{formatARS(costoPorUnidad)}</span></span>
            <span className="opacity-70">Margen: <span className="font-bold opacity-100">{MARGEN}x</span></span>
          </div>
        </div>

        {/* Costo total */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Desglose de costos</p>
          <div className="space-y-2">
            {receta.ingredientes.map((ing) => {
              const ins = insumos.find((i) => i.id === ing.insumoId)
              if (!ins) return null
              const costoIng = ing.cantidad * ins.precioPorUnidad
              const pct = costoInsumos > 0 ? (costoIng / costoInsumos) * 100 : 0
              return (
                <div key={ing.insumoId}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 font-medium">{ins.nombre}</span>
                    <span className="text-sm font-semibold text-gray-800">{formatARS(costoIng)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-brand-50 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-300 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{ing.cantidad} {ins.unidad}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-brand-100 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Costo de insumos</span>
              <span className="text-sm font-semibold text-gray-700">{formatARS(costoInsumos)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Gastos indirectos ({Math.round(GASTOS_INDIRECTOS * 100)}%)</span>
              <span className="text-sm font-semibold text-gray-700">{formatARS(indirectos)}</span>
            </div>
            <div className="pt-1.5 border-t border-brand-50 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800">Costo total</span>
              <span className="text-lg font-black text-gray-800">{formatARS(costo)}</span>
            </div>
          </div>
        </div>

        {/* Resumen de precios */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Resumen</p>
          <div className="space-y-2">
            <Row label="Costo de insumos" value={formatARS(costoInsumos)} />
            <Row label={`Indirectos (${Math.round(GASTOS_INDIRECTOS * 100)}%)`} value={formatARS(indirectos)} />
            <Row label="Costo total" value={formatARS(costo)} />
            <Row label={`Costo por ${receta.unidadRinde.replace(/s$/, '')}`} value={formatARS(costoPorUnidad)} />
            <Row label={`Ganancia por ${receta.unidadRinde.replace(/s$/, '')}`} value={formatARS(precioVenta - costoPorUnidad)} highlight />
            <div className="pt-2 border-t border-brand-100 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-800">Precio de venta</span>
              <span className="text-xl font-black text-brand-500">{formatARS(precioVenta)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Eliminar producto?</p>
            <p className="text-sm text-gray-500 text-center mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
              <button onClick={() => onDelete(receta.id)} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-green-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}
