import { useMemo, useState } from 'react'
import MatchManualSheet from '../components/MatchManualSheet'
import { formatARS } from '../utils/calc'
import { recetasParaResolver } from '../utils/competencia'

// Pantalla de bulk review: lista todas las recetas que todavía no tienen
// match confirmado con la competencia, con su sugerencia automática (si la
// hay) y opciones Sí / No / Elegir otro. Para las que no tienen sugerencia,
// botón "Elegir manualmente" que abre el mismo sheet que en RecetaDetail.
//
// Una vez que el user confirma un match, esa receta desaparece de la lista.
// La próxima semana, cuando el cron traiga el JSON actualizado, no se le
// vuelve a preguntar (la receta ya tiene match guardado).
export default function ResolverMatchesPage({ recetas, setRecetas, competidoras, onBack, onAgregarCompetidora }) {
  const [manualPara, setManualPara] = useState(null) // receta para la que se abre el sheet manual
  const [toast, setToast] = useState(null)

  const pendientes = useMemo(
    () => recetasParaResolver(recetas, competidoras),
    [recetas, competidoras],
  )

  const conSugerencia = pendientes.filter((p) => p.sugerencia)
  const sinSugerencia = pendientes.filter((p) => !p.sugerencia)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const confirmarMatch = (receta, sugerencia) => {
    setRecetas((prev) =>
      prev.map((r) =>
        r.id === receta.id
          ? {
              ...r,
              matchesCompetencia: [
                ...(r.matchesCompetencia ?? []),
                { competidoraId: sugerencia.competidoraId, productoSlug: sugerencia.productoSlug },
              ],
              updatedAt: Date.now(),
            }
          : r,
      ),
    )
    showToast(`✓ ${receta.nombre} matcheado`)
  }

  const rechazarMatch = (receta, sugerencia) => {
    setRecetas((prev) =>
      prev.map((r) =>
        r.id === receta.id
          ? {
              ...r,
              rechazadosCompetencia: [
                ...(r.rechazadosCompetencia ?? []),
                { competidoraId: sugerencia.competidoraId, productoSlug: sugerencia.productoSlug },
              ],
              updatedAt: Date.now(),
            }
          : r,
      ),
    )
  }

  const elegirManual = (producto) => {
    if (!manualPara) return
    setRecetas((prev) =>
      prev.map((r) =>
        r.id === manualPara.id
          ? {
              ...r,
              matchesCompetencia: [
                ...(r.matchesCompetencia ?? []),
                { competidoraId: producto.competidoraId, productoSlug: producto.productoSlug },
              ],
              rechazadosCompetencia: (r.rechazadosCompetencia ?? []).filter(
                (rj) => !(rj.competidoraId === producto.competidoraId && rj.productoSlug === producto.productoSlug),
              ),
              updatedAt: Date.now(),
            }
          : r,
      ),
    )
    showToast(`✓ ${manualPara.nombre} matcheado`)
    setManualPara(null)
  }

  return (
    <div className="flex flex-col min-h-full bg-brand-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Resolver matches</h1>
          {onAgregarCompetidora && (
            <button
              onClick={onAgregarCompetidora}
              className="px-3 py-2 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-sm flex-shrink-0"
              title="Agregar una competidora nueva"
            >
              + Competidora
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {conSugerencia.length} con sugerencia · {sinSugerencia.length} sin sugerencia
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {pendientes.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-medium">Todo resuelto</p>
            <p className="text-sm mt-1">No quedan matches pendientes con la competencia.</p>
          </div>
        )}

        {/* Sugerencias automáticas primero */}
        {conSugerencia.length > 0 && (
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide px-1 mt-2">
            Sugerencias automáticas
          </p>
        )}
        {conSugerencia.map(({ receta, sugerencia }) => (
          <div
            key={receta.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-brand-100"
          >
            <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-wide">
              Tu producto
            </p>
            <p className="text-base font-bold text-gray-800 mb-3 break-words">{receta.nombre}</p>

            <div className="bg-brand-50 rounded-xl p-3 mb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-500">{sugerencia.competidoraNombre} propone</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5 break-words">
                    {sugerencia.productoNombre}
                  </p>
                  {sugerencia.productoDescripcion && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                      {sugerencia.productoDescripcion}
                    </p>
                  )}
                </div>
                <span className="text-base font-black text-brand-600 flex-shrink-0">
                  {formatARS(sugerencia.productoPrecio)}
                </span>
              </div>
              {sugerencia.productoUrl && (
                <a
                  href={sugerencia.productoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-[11px] text-brand-500 underline"
                >
                  Ver en {sugerencia.competidoraNombre} ↗
                </a>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => rechazarMatch(receta, sugerencia)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm active:scale-95 transition-transform"
              >
                No
              </button>
              <button
                onClick={() => setManualPara(receta)}
                className="flex-1 py-2.5 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm active:scale-95 transition-transform"
              >
                Elegir otro
              </button>
              <button
                onClick={() => confirmarMatch(receta, sugerencia)}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm active:scale-95 transition-transform"
              >
                Sí
              </button>
            </div>
          </div>
        ))}

        {/* Sin sugerencia automática */}
        {sinSugerencia.length > 0 && (
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide px-1 mt-4">
            Sin sugerencia automática
          </p>
        )}
        {sinSugerencia.map(({ receta }) => (
          <div
            key={receta.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50"
          >
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Tu producto
            </p>
            <p className="text-base font-bold text-gray-800 mb-1 break-words">{receta.nombre}</p>
            <p className="text-xs text-gray-500 mb-3">
              No se encontró un equivalente automático en la competencia.
            </p>
            <button
              onClick={() => setManualPara(receta)}
              className="w-full py-2.5 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm active:scale-95 transition-transform"
            >
              Elegir manualmente
            </button>
          </div>
        ))}
      </div>

      {/* Sheet de match manual */}
      {manualPara && (
        <MatchManualSheet
          isOpen={!!manualPara}
          onClose={() => setManualPara(null)}
          receta={manualPara}
          competidoras={competidoras}
          onElegir={elegirManual}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
