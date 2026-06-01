import { useEffect, useMemo, useState } from 'react'
import { formatARS } from '../utils/calc'
import { scrapeGranate } from '../utils/scrapeGranate'

const todayISO = () => new Date().toISOString().slice(0, 10)
const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const CACHE_KEY = 'vitucakes_precios_sugeridos_cache'

export default function ActualizarPreciosPage({ insumos, setInsumos, onBack }) {
  const [data, setData] = useState(null) // El Granate
  const [dataDia, setDataDia] = useState(null) // Día (supermercado)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [appliedToast, setAppliedToast] = useState(null)
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState(null)
  const [confirmando, setConfirmando] = useState(false)

  // Carga inicial: cache local primero, fallback al JSON del cron semanal
  useEffect(() => {
    setLoading(true)
    setError(null)
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        setData(JSON.parse(cached))
        setLoading(false)
        return
      }
    } catch {}
    fetch(`${import.meta.env.BASE_URL}precios_sugeridos.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el archivo'))))
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Precios de Día (supermercado): solo del cron semanal (sin scrape manual).
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}precios_dia.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDataDia(d))
      .catch(() => {})
  }, [])

  const actualizarManualmente = async () => {
    setScraping(true)
    setError(null)
    setProgress({ stage: 'sitemap', done: 0, total: 0 })
    try {
      const fresh = await scrapeGranate((p) => setProgress(p))
      setData(fresh)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)) } catch {}
    } catch (e) {
      setError(`No se pudo actualizar: ${e.message}`)
    } finally {
      setScraping(false)
      setProgress(null)
    }
  }

  const sugerencias = useMemo(() => {
    // El Granate es la fuente PRINCIPAL. Día es FALLBACK: solo aporta insumos
    // que El Granate no trae — o sea, los que no encontró o trajo en 0/sin
    // precio. Un insumo cuenta como "cubierto" SOLO si El Granate le dio un
    // precio > 0; si no, lo busca Día.
    const cubiertosPorGranate = new Set(
      (data?.items || []).filter((it) => it.precio > 0).map((it) => it.nombre),
    )
    const fuentes = [
      { items: data?.items, fuente: data?.fuente || 'El Granate' },
      { items: (dataDia?.items || []).filter((it) => !cubiertosPorGranate.has(it.nombre)), fuente: dataDia?.fuente || 'Día' },
    ]
    const out = []
    for (const { items, fuente } of fuentes) {
      for (const item of items || []) {
        const ins = insumos.find((i) => i.nombre === item.nombre)
        if (!ins) continue
        // REGLA DE ORO — NUNCA bajar un precio de insumo: solo sugerimos si el
        // precio nuevo es MAYOR al actual. Un precio menor o igual se descarta.
        if (item.precio <= ins.precioPorUnidad) continue
        out.push({
          key: `${ins.id}|${fuente}`,
          insumoId: ins.id,
          nombre: ins.nombre,
          unidadVitu: ins.unidad,
          precioActual: ins.precioPorUnidad,
          precioSugerido: item.precio,
          unidadSugerida: item.unidad,
          fechaActual: ins.fechaActualizacion,
          producto: item.producto,
          sourceUrl: item.sourceUrl,
          fuente,
        })
      }
    }
    return out.sort((a, b) => b.precioSugerido / b.precioActual - a.precioSugerido / a.precioActual)
  }, [data, dataDia, insumos])

  // Default: nada seleccionado. El user tilda lo que quiere aplicar.

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === sugerencias.length) setSelected(new Set())
    else setSelected(new Set(sugerencias.map((s) => s.key)))
  }

  const aplicar = () => {
    const fecha = todayISO()
    // De las sugerencias seleccionadas armamos insumoId → precio. Si hay dos
    // fuentes para el mismo insumo, gana la última en la lista.
    const byInsumo = new Map()
    sugerencias.forEach((s) => {
      if (selected.has(s.key)) byInsumo.set(s.insumoId, s.precioSugerido)
    })
    const cantidad = byInsumo.size
    // Timestamps únicos e incrementales para que los actualizados queden juntos arriba.
    let stamp = Date.now()
    setInsumos((prev) => prev.map((i) => {
      if (!byInsumo.has(i.id)) return i
      stamp += 1
      return { ...i, precioPorUnidad: byInsumo.get(i.id), fechaActualizacion: fecha, updatedAt: stamp }
    }))
    setAppliedToast(`Se actualizaron ${cantidad} insumo${cantidad !== 1 ? 's' : ''}`)
    setSelected(new Set())
    setConfirmando(false)
    setTimeout(() => setAppliedToast(null), 2500)
  }

  const sugerenciasSeleccionadas = sugerencias.filter((s) => selected.has(s.key))

  return (
    <div className="flex flex-col min-h-full bg-brand-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold">←</button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Actualizar precios</h1>
        </div>
        {(data?.generadoEn || dataDia?.generadoEn) && (
          <p className="text-xs text-gray-400">
            Fuentes: {[data && 'El Granate', dataDia && 'Día'].filter(Boolean).join(' · ')}
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
              const isSelected = selected.has(s.key)
              const fuenteCorta = s.fuente.replace('Distribuidora ', '')
              return (
                <button
                  key={s.key}
                  onClick={() => toggle(s.key)}
                  className={`w-full bg-white rounded-2xl p-4 text-left shadow-sm border transition-colors ${isSelected ? 'border-brand-300' : 'border-brand-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-brand-400 border-brand-400 text-white' : 'border-gray-300'}`}>
                      {isSelected && <span className="text-xs leading-none">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 break-words">{s.nombre}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.fuente === 'Día' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>{fuenteCorta}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 break-words mb-2">{s.producto}</p>
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

        {/* Botón único: actualizar manualmente */}
        <div className="bg-white rounded-2xl p-4 mt-6 shadow-sm border border-brand-50 space-y-2">
          <button
            onClick={actualizarManualmente}
            disabled={scraping}
            className="w-full py-3 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
          >
            {scraping
              ? (progress?.stage === 'sitemap'
                  ? 'Buscando productos...'
                  : `Consultando precios... ${progress?.done ?? 0}/${progress?.total ?? '?'}`)
              : 'Actualizar precios manualmente'}
          </button>
          <p className="text-[11px] text-gray-400 leading-tight">
            Los precios se actualizan solos los lunes a la noche. Si necesitás precios al día antes, tocá el botón.
          </p>
        </div>
      </div>

      {/* Apply bar */}
      {sugerencias.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-brand-100 p-4 shadow-lg">
          <button
            onClick={() => setConfirmando(true)}
            disabled={selected.size === 0}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-base disabled:opacity-40 active:scale-95 transition-transform"
          >
            {selected.size === 0
              ? 'Seleccioná los que querés aplicar'
              : `Revisar y aplicar (${selected.size})`}
          </button>
        </div>
      )}

      {/* Confirm modal */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmando(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Aplicar {sugerenciasSeleccionadas.length} {sugerenciasSeleccionadas.length === 1 ? 'cambio' : 'cambios'}?</p>
            <p className="text-xs text-gray-500 text-center mb-4">Se va a actualizar el precio y la fecha de:</p>
            <div className="bg-brand-50 rounded-2xl p-3 max-h-56 overflow-y-auto mb-5 space-y-1.5">
              {sugerenciasSeleccionadas.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700 font-medium break-words flex-1">
                    {s.nombre} <span className="text-gray-400 text-xs">· {s.fuente.replace('Distribuidora ', '')}</span>
                  </span>
                  <span className="text-brand-600 font-semibold flex-shrink-0">{formatARS(s.precioSugerido)}/{s.unidadVitu}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmando(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">Cancelar</button>
              <button onClick={aplicar} className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold">Confirmar</button>
            </div>
          </div>
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
