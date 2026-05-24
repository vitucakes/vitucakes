import { useRef, useState } from 'react'

// Claves de localStorage que tienen DATOS DEL USER (las únicas que vale la
// pena respaldar). El resto (cache de competencia, flags de migración) se
// regeneran solos.
const BACKUP_KEYS = [
  'vitucakes_insumos',
  'vitucakes_recetas',
  'vitucakes_competidoras_user',
  'vitucakes_precios_sugeridos_cache',
]

// Flags one-shot que SÍ deberíamos restaurar para que migraciones no se
// vuelvan a correr al importar (si no, sobrescribirían los datos importados).
const MIGRATION_FLAGS = [
  'vitucakes_precarga_done',
  'vitucakes_restore_orphans_v1',
  'vitucakes_recetas_v2_done',
]

const APP_VERSION = '1.0' // bump si el formato del backup cambia

const todayISO = () => new Date().toISOString().slice(0, 10)

const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function BackupPage({ onBack }) {
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState(null) // { type: 'ok'|'error'|'info', text: string }
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingRestore, setPendingRestore] = useState(null) // { data, summary }

  // Lee localStorage y empaqueta todo en un objeto serializable.
  const exportar = () => {
    const data = {
      app: 'vitucakes',
      version: APP_VERSION,
      exportadoEn: new Date().toISOString(),
      datos: {},
      flags: {},
    }
    for (const key of BACKUP_KEYS) {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          data.datos[key] = JSON.parse(raw)
        } catch {
          data.datos[key] = raw
        }
      }
    }
    for (const flag of MIGRATION_FLAGS) {
      const v = localStorage.getItem(flag)
      if (v) data.flags[flag] = v
    }
    const filename = `vitucakes-backup-${todayISO()}.json`
    downloadJSON(data, filename)
    setMessage({ type: 'ok', text: `Descargado ${filename}` })
  }

  // Lee el archivo seleccionado y prepara un resumen para que el user
  // confirme antes de sobrescribir. NO toca localStorage todavía.
  const onFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // permite reseleccionar el mismo archivo después

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.app !== 'vitucakes') {
        throw new Error('No parece un backup de Vitucakes (falta el campo "app": "vitucakes")')
      }
      const summary = {
        version: data.version ?? '?',
        exportadoEn: data.exportadoEn ?? '?',
        insumos: data.datos?.vitucakes_insumos?.length ?? 0,
        recetas: data.datos?.vitucakes_recetas?.length ?? 0,
        competidorasUser: data.datos?.vitucakes_competidoras_user?.length ?? 0,
      }
      setPendingRestore({ data, summary })
      setMessage(null)
    } catch (err) {
      setMessage({ type: 'error', text: `Archivo inválido: ${err.message}` })
      setPendingRestore(null)
    }
  }

  const confirmarRestore = () => {
    if (!pendingRestore) return
    const { data } = pendingRestore
    // Borra los keys actuales que vamos a restaurar para evitar mezclas.
    for (const key of BACKUP_KEYS) localStorage.removeItem(key)
    for (const flag of MIGRATION_FLAGS) localStorage.removeItem(flag)
    // Restaura
    for (const [key, value] of Object.entries(data.datos ?? {})) {
      localStorage.setItem(key, JSON.stringify(value))
    }
    for (const [flag, value] of Object.entries(data.flags ?? {})) {
      localStorage.setItem(flag, value)
    }
    setMessage({
      type: 'ok',
      text: `Restaurado. Recargá la app para ver los datos.`,
    })
    setPendingRestore(null)
  }

  const resetear = () => {
    for (const key of BACKUP_KEYS) localStorage.removeItem(key)
    for (const flag of MIGRATION_FLAGS) localStorage.removeItem(flag)
    // También limpiamos cache de competencia para que se vuelva a bajar
    localStorage.removeItem('vitucakes_competencia_cache')
    setMessage({
      type: 'ok',
      text: 'Datos borrados. Recargá la app para que vuelva al estado inicial (con la precarga de fábrica).',
    })
    setConfirmReset(false)
  }

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
          <h1 className="text-xl font-bold text-gray-800 flex-1">Backup de datos</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Intro */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-900 font-semibold mb-1">¿Por qué importa?</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Tus insumos, recetas y matches con la competencia viven en este celular (en el browser).
            Si cambiás de celu, borrás datos de Safari, o reinstalás, <strong>se pierden</strong>.
            Bajá un backup cada tanto y guardalo en Drive / mail / donde quieras.
          </p>
        </div>

        {/* Mensaje */}
        {message && (
          <div
            className={`rounded-2xl p-3 text-sm ${
              message.type === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Export */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Descargar backup</p>
          <p className="text-sm text-gray-600 mb-3">
            Bajá un archivo JSON con todos tus datos. Guardalo en Drive, mail, donde puedas recuperarlo.
          </p>
          <button
            onClick={exportar}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            ⬇️ Descargar backup ahora
          </button>
        </div>

        {/* Import */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Restaurar desde backup</p>
          <p className="text-sm text-gray-600 mb-3">
            Subí un JSON descargado antes. Va a <strong>reemplazar</strong> los datos actuales.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileSelected}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm active:scale-95 transition-transform"
          >
            ⬆️ Elegir archivo
          </button>
        </div>

        {/* Reset */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Volver al estado inicial</p>
          <p className="text-sm text-gray-600 mb-3">
            Borra todos tus datos y restaura la precarga de fábrica (167 insumos + 139 recetas). Usalo solo si querés arrancar de cero.
          </p>
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm active:scale-95 transition-transform"
          >
            Borrar mis datos y resetear
          </button>
        </div>
      </div>

      {/* Modal confirmar restore */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPendingRestore(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-3">¿Restaurar este backup?</p>
            <div className="bg-brand-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
              <Row label="Versión" value={pendingRestore.summary.version} />
              <Row label="Exportado" value={new Date(pendingRestore.summary.exportadoEn).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} />
              <Row label="Insumos" value={pendingRestore.summary.insumos} />
              <Row label="Recetas" value={pendingRestore.summary.recetas} />
              <Row label="Competidoras locales" value={pendingRestore.summary.competidorasUser} />
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Va a reemplazar lo que tenés ahora. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingRestore(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRestore}
                className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar reset */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmReset(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Borrar todos los datos?</p>
            <p className="text-sm text-gray-500 text-center mb-5">
              Vas a perder tus insumos, recetas, matches y competidoras locales. Volvés a la precarga inicial. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold">
                Cancelar
              </button>
              <button onClick={resetear} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
  )
}
