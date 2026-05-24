import { useState } from 'react'
import { formatARS } from '../utils/calc'
import { detectarSitemap, scrapeTiendanube } from '../utils/scrapeTiendanube'

const REPO_ISSUE_URL = 'https://github.com/patriciovallerino/vitucakes/issues/new'

// Genera un id legible para guardar la competidora en localStorage. Si dos
// users agregan la misma, los ids van a coincidir y se trata como la misma.
const idFromHost = (sitemapUrl) => {
  try {
    const host = new URL(sitemapUrl).host.toLowerCase()
    return host.replace(/^www\./, '').replace(/\.mitiendanube\.com$/, '').replace(/[^a-z0-9-]/g, '-')
  } catch {
    return `user-${Date.now()}`
  }
}

export default function AgregarCompetidoraPage({ extras, setExtras, onBack }) {
  const [nombre, setNombre] = useState('')
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null) // { sitemapUrl, productos, errores }
  const [saved, setSaved] = useState(false)

  const buscar = async () => {
    setError(null)
    setResultado(null)
    setSaved(false)

    const sitemapUrl = detectarSitemap(url)
    if (!sitemapUrl) {
      setError('URL inválida. Pegá algo como "https://nombre.mitiendanube.com"')
      return
    }
    if (!nombre.trim()) {
      setError('Ponele un nombre para que después la reconozcas.')
      return
    }

    setScraping(true)
    setProgress({ stage: 'sitemap', done: 0, total: 0 })
    try {
      const r = await scrapeTiendanube({ sitemapUrl }, (p) => setProgress(p))
      if (r.productos.length === 0) {
        setError('No se encontraron productos. Verificá que la tienda sea Tiendanube y tenga catálogo público.')
      } else {
        setResultado({ sitemapUrl, ...r })
      }
    } catch (e) {
      setError(`No pudimos consultar: ${e.message}`)
    } finally {
      setScraping(false)
      setProgress(null)
    }
  }

  const guardar = () => {
    if (!resultado) return
    const id = idFromHost(resultado.sitemapUrl)
    const competidora = {
      id,
      nombre: nombre.trim(),
      fuente: resultado.sitemapUrl.replace('/sitemap.xml', ''),
      productos: resultado.productos,
      updatedAt: new Date().toISOString(),
    }
    setExtras((prev = []) => {
      const sinDuplicado = prev.filter((c) => c.id !== id)
      return [...sinDuplicado, competidora]
    })
    setSaved(true)
  }

  const eliminar = () => {
    if (!resultado) return
    const id = idFromHost(resultado.sitemapUrl)
    setExtras((prev = []) => prev.filter((c) => c.id !== id))
    setSaved(false)
    setResultado(null)
    setNombre('')
    setUrl('')
  }

  // Abre un Issue de GitHub con el pedido prefillado para sumar al cron oficial.
  // El admin del repo (vos) lo ve, edita scripts/update-competencia.mjs y mergea.
  const sumarAlCron = () => {
    if (!resultado) return
    const baseUrl = resultado.sitemapUrl.replace('/sitemap.xml', '')
    const issueTitle = `Sumar al cron: ${nombre.trim()}`
    const issueBody = [
      `Pido sumar **${nombre.trim()}** al cron semanal de competencia.`,
      ``,
      `- **URL del catálogo**: ${baseUrl}`,
      `- **Sitemap**: ${resultado.sitemapUrl}`,
      `- **Productos encontrados**: ${resultado.productos.length}`,
      ``,
      `Hace falta agregarla al array \`COMPETIDORAS\` de \`scripts/update-competencia.mjs\`.`,
    ].join('\n')
    const queryParams = new URLSearchParams({
      title: issueTitle,
      body: issueBody,
      labels: 'competencia',
    })
    window.open(`${REPO_ISSUE_URL}?${queryParams.toString()}`, '_blank', 'noopener,noreferrer')
  }

  const competidoraYaGuardada = saved && resultado
    ? extras?.find((c) => c.id === idFromHost(resultado.sitemapUrl))
    : null

  return (
    <div className="flex flex-col min-h-full bg-brand-50">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Agregar competidora</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Form */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50 space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Candelitte"
              className="input"
            />
          </div>
          <div>
            <label className="label">Link del catálogo</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Ej: https://candelitte.mitiendanube.com"
              className="input"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Por ahora soportamos solo tiendas Tiendanube (catálogo público).
            </p>
          </div>
          <button
            onClick={buscar}
            disabled={scraping || !nombre.trim() || !url.trim()}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            {scraping
              ? progress?.stage === 'sitemap'
                ? 'Buscando productos...'
                : `Consultando precios... ${progress?.done ?? 0}/${progress?.total ?? '?'}`
              : 'Buscar productos'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Resultados */}
        {resultado && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {resultado.productos.length} producto{resultado.productos.length !== 1 ? 's' : ''} encontrado{resultado.productos.length !== 1 ? 's' : ''}
              </p>
              {resultado.errores?.length > 0 && (
                <span className="text-[11px] text-amber-700">
                  {resultado.errores.length} sin precio
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {resultado.productos.map((p) => (
                <div key={p.slug} className="bg-brand-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{p.nombre}</span>
                  <span className="text-sm font-bold text-brand-600 flex-shrink-0">{formatARS(p.precio)}</span>
                </div>
              ))}
            </div>

            {!saved && (
              <button
                onClick={guardar}
                className="w-full mt-4 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm active:scale-95 transition-transform"
              >
                Guardar competidora
              </button>
            )}

            {saved && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-sm font-bold text-emerald-800 mb-1">✓ Guardada localmente</p>
                <p className="text-xs text-emerald-700 mb-3">
                  Ya podés matchear sus productos con los tuyos. <strong>Esta competidora se guarda en este celular.</strong>
                  {' '}Si querés que se actualice sola cada semana junto con las demás, pedí sumarla al cron oficial:
                </p>
                <button
                  onClick={sumarAlCron}
                  className="w-full py-2.5 rounded-xl bg-white text-emerald-700 border border-emerald-200 font-semibold text-sm active:scale-95 transition-transform"
                >
                  Pedir sumarla al cron semanal ↗
                </button>
                {competidoraYaGuardada && (
                  <button
                    onClick={eliminar}
                    className="w-full mt-2 py-2 text-red-500 text-xs font-semibold"
                  >
                    Eliminar de mi celu
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tus competidoras locales */}
        {(extras?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Tus competidoras locales ({extras.length})
            </p>
            <div className="space-y-2">
              {extras.map((c) => (
                <div key={c.id} className="bg-brand-50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{c.nombre}</p>
                      <p className="text-[11px] text-gray-500 truncate">{c.fuente}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{c.productos.length} producto{c.productos.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setExtras((prev) => prev.filter((x) => x.id !== c.id))}
                      className="text-red-400 text-xs font-semibold"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
