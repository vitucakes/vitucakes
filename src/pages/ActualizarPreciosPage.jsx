import { useEffect, useMemo, useState } from 'react'
import { formatARS } from '../utils/calc'

const todayISO = () => new Date().toISOString().slice(0, 10)
const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const REPO_ACTIONS_URL = 'https://github.com/patriciovallerino/vitucakes/actions/workflows/update-prices.yml'

export default function ActualizarPreciosPage({ insumos, setInsumos, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [appliedToast, setAppliedToast] = useState(null)

  const load = (bust = false) => {
    setLoading(true)
    setError(null)
    const url = `${import.meta.env.BASE_URL}precios_sugeridos.json${bust ? `?t=${Date.now()}` : ''}`
    fetch(url, { cache: bust ? 'no-store' : 'default' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el archivo'))))
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(false) }, [])

  const sugerencias = useMemo(() => {
    if (!data?.items) return []
    return data.items
      .map((item) => {
        const ins = insumos.find((i) => i.nombre === item.nombre)
        if (!ins) return null
        if (item.precio <= ins.precioPorUnidad) return null
        return {
          insumoId: ins.id,
          nombre: ins.nombre,
          unidadVitu: ins.unidad,
          precioActual: ins.precioPorUnidad,
          precioSugerido: item.precio,
          unidadSugerida: item.unidad,
          fechaActual: ins.fechaActualizacion,
          producto: item.producto,
          sourceUrl: item.sourceUrl,
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b.precioSugerido / b.precioActual) - (a.precioSugerido / a.precioActual))
  }, [data, insumos])

  useEffect(() => {
    setSelected(new Set(sugerencias.map((s) => s.insumoId)))
  }, [sugerencias.length])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === sugerencias.length) setSelected(new Set())
    else setSelected(new Set(sugerencias.map((s) => s.insumoId)))
  }

  const aplicar = () => {
    const ids = selected
    const fecha = todayISO()
    const cantidad = ids.size
    setInsumos((prev) => prev.map((i) => {
      if (!ids.has(i.id)) return i
      const sug = sugerencias.find((s) => s.insumoId === i.id)
      if (!sug) return i
      return {
        ...i,
        precioPorUnidad: sug.precioSugerido,
        fechaActualizacion: fecha,
        updatedAt: Date.now(),
      }
    }))
    setAppliedToast(`Se actualizaron ${cantidad} insumo${cantidad !== 1 ? 's' : ''}`)
    setSelected(new Set())
    setTimeout(() => setAppliedToast(null), 2500)
  }

  return (
    <div className="flex flex-col min-h-full bg-brand-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold">←</button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Actualizar precios</h1>
        </div>
        {data?.generadoEn && (
          <p className="text-xs text-gray-400">
            Última consulta: {new Date(data.generadoEn).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} · {data.fuente}
          </p>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading && <p className="text-center text-gray-400 py-12">Cargando...</p>}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {!loading && !error && sugerencias.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-medium">Todo al día</p>
            <p className="text-sm mt-1">No hay precios para actualizar.</p>
          </div>
        )}

        {!loading && !error && sugerencias.length > 0 && (
          <>
            <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-brand-50">
              <p className="text-sm font-semibold text-gray-700">{sugerencias.length} sugerencia{sugerencias.length !== 1 ? 's' : ''}</p>
              <button onClick={toggleAll} className="text-xs font-bold text-brand-500 uppercase">
                {selected.size === sugerencias.length ? 'Ninguno' : 'Todos'}
              </button>
            </div>

            {sugerencias.map((s) => {
              const pct = ((s.precioSugerido - s.precioActual) / s.precioActual) * 100
              const isSelected = selected.has(s.insumoId)
              return (
                <button
                  key={s.insumoId}
                  onClick={() => toggle(s.insumoId)}
                  className={`w-full bg-white rounded-2xl p-4 text-left shadow-sm border transition-colors ${isSelected ? 'border-brand-300' : 'border-brand-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-400 border-brand-400 text-white' : 'border-gray-300'}`}>
                      {isSelected && <span className="text-xs leading-none">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{s.nombre}</p>
                      <p className="text-[11px] text-gray-400 truncate mb-2">{s.producto}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400 line-through">{formatARS(s.precioActual)}/{s.unidadVitu}</span>
                        <span className="text-gray-300">→</span>
                        <span className="font-bold text-brand-500">{formatARS(s.precioSugerido)}/{s.unidadVitu}</span>
                        <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">+{pct.toFixed(0)}%</span>
                      </div>
                      {s.fechaActual && (
                        <p className="text-[11px] text-gray-400 mt-1">Tu precio del {formatDate(s.fechaActual)}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {/* Botón de re-fetch / forzar scrape */}
        <div className="bg-white rounded-2xl p-4 mt-6 shadow-sm border border-brand-50 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Buscar actualizaciones</p>
          <button
            onClick={() => load(true)}
            className="w-full py-3 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm active:scale-95 transition-transform"
          >
            Refrescar archivo
          </button>
          <a
            href={REPO_ACTIONS_URL}
            target="_blank"
            rel="noreferrer"
            className="block w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm text-center active:scale-95 transition-transform"
          >
            Forzar nuevo scraping (GitHub)
          </a>
          <p className="text-[11px] text-gray-400 leading-tight">
            El scraping corre automáticamente los lunes a la noche. El botón "Refrescar" trae el último resultado. "Forzar" abre GitHub para ejecutar el workflow manualmente.
          </p>
        </div>
      </div>

      {/* Apply bar */}
      {sugerencias.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-brand-100 p-4 shadow-lg">
          <button
            onClick={aplicar}
            disabled={selected.size === 0}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
          >
            Aplicar {selected.size} {selected.size === 1 ? 'cambio' : 'cambios'}
          </button>
        </div>
      )}

      {/* Toast */}
      {appliedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          {appliedToast}
        </div>
      )}
    </div>
  )
}
