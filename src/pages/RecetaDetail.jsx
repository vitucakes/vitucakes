import { useEffect, useState } from 'react'
import MatchManualSheet from '../components/MatchManualSheet'
import { calcCostoInsumos, calcGastosIndirectos, calcCostoTotal, formatARS, GASTOS_INDIRECTOS, MARGEN } from '../utils/calc'
import { proponerSugerencia, matchesConDetalle, promedioCompetencia, productosDisponibles } from '../utils/competencia'

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function RecetaDetail({ receta, insumos, competidoras = [], onBack, onUpdate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [matchManualOpen, setMatchManualOpen] = useState(false)
  const [insumoModal, setInsumoModal] = useState(null) // insumo abierto en el modal de detalle

  // Scroll-to-top al entrar al detalle (o cambiar de receta). El scroll
  // vive en el <main> de App.jsx con overflow-y-auto, no en window.
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [receta.id])

  const costoInsumos = calcCostoInsumos(receta, insumos)
  const indirectos = calcGastosIndirectos(costoInsumos)
  const costo = calcCostoTotal(costoInsumos)
  const costoPorUnidad = receta.rinde > 0 ? costo / receta.rinde : 0
  const precioVenta = costoPorUnidad * MARGEN

  const insumosConProblema = receta.ingredientes.filter((ing) => {
    const ins = insumos.find((i) => i.id === ing.insumoId)
    return !ins || ins.precioPorUnidad <= 0
  })

  // Competencia: sugerencia pendiente + matches confirmados
  const sugerencia = proponerSugerencia(receta, competidoras)
  const matches = matchesConDetalle(receta, competidoras)
  const promedio = promedioCompetencia(matches)
  const diffPct = promedio > 0 && precioVenta > 0
    ? ((precioVenta - promedio) / promedio) * 100
    : null

  const confirmarMatch = (sug) => {
    onUpdate({
      ...receta,
      matchesCompetencia: [
        ...(receta.matchesCompetencia ?? []),
        { competidoraId: sug.competidoraId, productoSlug: sug.productoSlug },
      ],
    })
  }

  const rechazarMatch = (sug) => {
    onUpdate({
      ...receta,
      rechazadosCompetencia: [
        ...(receta.rechazadosCompetencia ?? []),
        { competidoraId: sug.competidoraId, productoSlug: sug.productoSlug },
      ],
    })
  }

  const quitarMatch = (m) => {
    onUpdate({
      ...receta,
      matchesCompetencia: (receta.matchesCompetencia ?? []).filter(
        (x) => !(x.competidoraId === m.competidoraId && x.productoSlug === m.productoSlug),
      ),
    })
  }

  // Match manual: el user busca un producto de competencia y lo elige
  // como equivalente, sin importar si el algoritmo automático lo hubiera
  // pescado o no. También limpia el "rechazo" previo en caso de que existiera.
  const elegirMatchManual = (p) => {
    onUpdate({
      ...receta,
      matchesCompetencia: [
        ...(receta.matchesCompetencia ?? []),
        { competidoraId: p.competidoraId, productoSlug: p.productoSlug },
      ],
      rechazadosCompetencia: (receta.rechazadosCompetencia ?? []).filter(
        (r) => !(r.competidoraId === p.competidoraId && r.productoSlug === p.productoSlug),
      ),
    })
    setMatchManualOpen(false)
  }

  const hayCompetidorasCargadas = (competidoras ?? []).some((c) => (c.productos ?? []).length > 0)

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
        {/* Card de sugerencia de competencia — arriba del hero */}
        {sugerencia && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-brand-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🤔</span>
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">
                ¿Es lo mismo?
              </p>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              <span className="font-bold">{sugerencia.competidoraNombre}</span> vende
              {' '}<span className="font-semibold">"{sugerencia.productoNombre}"</span> a
              {' '}<span className="font-bold text-brand-600">{formatARS(sugerencia.productoPrecio)}</span>.
            </p>
            {sugerencia.productoDescripcion && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                {sugerencia.productoDescripcion}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => rechazarMatch(sugerencia)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:scale-95 transition-transform"
              >
                No, distinto
              </button>
              <button
                onClick={() => confirmarMatch(sugerencia)}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm active:scale-95 transition-transform"
              >
                Sí, es el mismo
              </button>
            </div>
            {sugerencia.productoUrl && (
              <a
                href={sugerencia.productoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-center text-[11px] text-brand-500 underline"
              >
                Ver en {sugerencia.competidoraNombre} ↗
              </a>
            )}
          </div>
        )}

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

        {/* Comparador con competencia — siempre visible si hay competidoras cargadas */}
        {hayCompetidorasCargadas && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Precio de referencia · competencia
              </p>
              {matches.length > 1 && (
                <span className="text-[11px] text-gray-400">Promedio de {matches.length}</span>
              )}
            </div>

            {matches.length > 1 && (
              <div className="mb-3 pb-3 border-b border-brand-50">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">Promedio</span>
                  <span className="text-xl font-black text-gray-800">{formatARS(promedio)}</span>
                </div>
                {diffPct !== null && (
                  <p className="text-xs mt-1 text-right">
                    {diffPct > 0 ? (
                      <span className="text-amber-700 font-semibold">Estás +{diffPct.toFixed(0)}% que la competencia</span>
                    ) : diffPct < 0 ? (
                      <span className="text-emerald-700 font-semibold">Estás {diffPct.toFixed(0)}% que la competencia</span>
                    ) : (
                      <span className="text-gray-500 font-semibold">Mismo precio que la competencia</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((m) => {
                  const diff = precioVenta > 0
                    ? ((precioVenta - m.productoPrecio) / m.productoPrecio) * 100
                    : null
                  return (
                    <div key={`${m.competidoraId}-${m.productoSlug}`} className="bg-brand-50 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{m.competidoraNombre}</p>
                          <p className="text-[11px] text-gray-500 truncate">{m.productoNombre}</p>
                        </div>
                        <span className="text-base font-black text-brand-600 flex-shrink-0">{formatARS(m.productoPrecio)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex gap-3">
                          {m.productoUrl && (
                            <a
                              href={m.productoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-500 font-semibold"
                            >
                              Ver ↗
                            </a>
                          )}
                          <button
                            onClick={() => quitarMatch(m)}
                            className="text-gray-400"
                          >
                            Quitar match
                          </button>
                        </div>
                        {diff !== null && matches.length === 1 && (
                          <span className={diff > 0 ? 'text-amber-700 font-semibold' : diff < 0 ? 'text-emerald-700 font-semibold' : 'text-gray-500'}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs vos
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Sin matches todavía: mensaje discreto. Si arriba está la card
              // de sugerencia automática, esta queda como complemento.
              <p className="text-sm text-gray-500 text-center py-2">
                {sugerencia
                  ? 'Confirmá o rechazá la sugerencia de arriba, o elegí manualmente.'
                  : 'Todavía no matcheaste este producto con nadie de la competencia.'}
              </p>
            )}

            {/* Botón para abrir match manual: siempre disponible si hay productos
                disponibles para elegir. Texto cambia según haya o no matches. */}
            {productosDisponibles(receta, competidoras).length > 0 && (
              <button
                onClick={() => setMatchManualOpen(true)}
                className="w-full mt-3 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm active:scale-95 transition-transform"
              >
                {matches.length > 0 ? '+ Agregar otro match' : 'Elegir manualmente'}
              </button>
            )}
          </div>
        )}

        {/* Costo total */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Desglose de costos</p>
          <p className="text-[11px] text-gray-400 mb-2">Tocá un ingrediente para ver su precio actual.</p>
          <div className="space-y-2">
            {receta.ingredientes.map((ing) => {
              const ins = insumos.find((i) => i.id === ing.insumoId)
              if (!ins) return null
              const costoIng = ing.cantidad * ins.precioPorUnidad
              const pct = costoInsumos > 0 ? (costoIng / costoInsumos) * 100 : 0
              return (
                <button
                  key={ing.insumoId}
                  onClick={() => setInsumoModal(ins)}
                  className="w-full text-left rounded-xl active:bg-brand-50 active:scale-[0.99] transition-all px-1 py-1 -mx-1"
                >
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
                </button>
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

      <MatchManualSheet
        isOpen={matchManualOpen}
        onClose={() => setMatchManualOpen(false)}
        receta={receta}
        competidoras={competidoras}
        onElegir={elegirMatchManual}
      />

      {/* Modal detalle de insumo */}
      {insumoModal && (() => {
        const ing = receta.ingredientes.find((x) => x.insumoId === insumoModal.id)
        const cantidad = ing?.cantidad ?? 0
        const costoEnReceta = cantidad * insumoModal.precioPorUnidad
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/40" onClick={() => setInsumoModal(null)} />
            <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-500 uppercase tracking-wide">Insumo</p>
                  <p className="text-lg font-black text-gray-800 mt-0.5 break-words">{insumoModal.nombre}</p>
                </div>
                <button
                  onClick={() => setInsumoModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm font-medium flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className="bg-brand-50 rounded-2xl p-4 mb-3">
                <p className="text-xs text-gray-500 mb-1">Precio actual</p>
                <p className="text-2xl font-black text-brand-600">
                  {formatARS(insumoModal.precioPorUnidad)}
                  <span className="text-sm font-semibold text-brand-500"> / {insumoModal.unidad}</span>
                </p>
                {insumoModal.fechaActualizacion && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Actualizado el {formatDate(insumoModal.fechaActualizacion)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Usado en esta receta</span>
                  <span className="font-semibold text-gray-700">{cantidad} {insumoModal.unidad}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Costo en esta receta</span>
                  <span className="font-semibold text-gray-700">{formatARS(costoEnReceta)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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
