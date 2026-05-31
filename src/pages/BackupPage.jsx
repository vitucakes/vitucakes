import { useRef, useState } from 'react'
import { useEditGate } from '../hooks/useEditGate'
import { readBackupData, buildFactoryData } from '../utils/seedData'

const APP_VERSION = '2.0' // 2.0 = datos en la nube (Firestore)

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

// Backup de la base COMPARTIDA. Los datos ahora viven en la nube (Firestore) y
// se sincronizan entre todos los dispositivos, así que ya no se pierden al
// cambiar de celu. Igual dejamos exportar un JSON como copia extra / portátil,
// y restaurar o resetear (esto último detrás del PIN porque pisa la base de
// todos).
export default function BackupPage({ data, onApply, onReset, onBack }) {
  const { canEdit, requestUnlock } = useEditGate()
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [busy, setBusy] = useState(false)

  const insumos = data?.insumos ?? []
  const recetas = data?.recetas ?? []
  const competidoras = data?.competidoras ?? []

  const exportar = () => {
    const payload = {
      app: 'vitucakes',
      version: APP_VERSION,
      exportadoEn: new Date().toISOString(),
      datos: {
        vitucakes_insumos: insumos,
        vitucakes_recetas: recetas,
        vitucakes_competidoras_user: competidoras,
      },
    }
    const filename = `vitucakes-backup-${todayISO()}.json`
    downloadJSON(payload, filename)
    try {
      localStorage.setItem('vitucakes_last_backup_at', String(Date.now()))
    } catch {}
    setMessage({ type: 'ok', text: `Descargado ${filename}` })
  }

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const json = JSON.parse(await file.text())
      const parsed = readBackupData(json)
      setPendingRestore({
        parsed,
        summary: {
          version: json.version ?? '?',
          exportadoEn: json.exportadoEn ?? '?',
          insumos: parsed.insumos.length,
          recetas: parsed.recetas.length,
          competidoras: parsed.competidoras.length,
        },
      })
      setMessage(null)
    } catch (err) {
      setMessage({ type: 'error', text: `Archivo inválido: ${err.message}` })
      setPendingRestore(null)
    }
  }

  const confirmarRestore = async () => {
    if (!pendingRestore) return
    setBusy(true)
    try {
      await onApply(pendingRestore.parsed)
      setMessage({ type: 'ok', text: 'Restaurado. La base compartida ya tiene estos datos.' })
      setPendingRestore(null)
    } catch (err) {
      setMessage({ type: 'error', text: `No se pudo restaurar: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  const resetear = async () => {
    setBusy(true)
    try {
      const factory = await buildFactoryData()
      await onApply(factory)
      onReset?.()
      setMessage({ type: 'ok', text: 'Listo. Se cargaron los datos de fábrica en la base compartida.' })
      setConfirmReset(false)
    } catch (err) {
      setMessage({ type: 'error', text: `No se pudo resetear: ${err.message}` })
    } finally {
      setBusy(false)
    }
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm text-emerald-900 font-semibold mb-1">☁️ Tus datos están en la nube</p>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Insumos, recetas y competidoras se guardan online y se sincronizan entre todos los
            dispositivos. Ya no se pierden al cambiar de celu. Igual podés bajar una copia extra
            por las dudas o para tenerla a mano.
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

        {/* Export — disponible para todos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Descargar copia</p>
          <p className="text-sm text-gray-600 mb-3">
            Bajá un archivo JSON con los datos actuales ({insumos.length} insumos, {recetas.length} recetas).
          </p>
          <button
            onClick={exportar}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            ⬇️ Descargar copia ahora
          </button>
        </div>

        {/* Candado para acciones que pisan la base */}
        {!canEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs text-amber-800 leading-relaxed mb-3">
              Restaurar o resetear cambia la base que ven todos. Desbloqueá con el PIN para
              habilitar esas acciones.
            </p>
            <button
              onClick={requestUnlock}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm active:scale-95 transition-transform"
            >
              🔒 Desbloquear con PIN
            </button>
          </div>
        )}

        {/* Import */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Restaurar desde copia</p>
          <p className="text-sm text-gray-600 mb-3">
            Subí un JSON descargado antes. Va a <strong>reemplazar</strong> los datos de todos.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onFileSelected}
            className="hidden"
          />
          <button
            disabled={!canEdit}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            ⬆️ Elegir archivo
          </button>
        </div>

        {/* Reset */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Volver al estado inicial</p>
          <p className="text-sm text-gray-600 mb-3">
            Reemplaza la base compartida con la precarga de fábrica. Usalo solo si querés arrancar de cero.
          </p>
          <button
            disabled={!canEdit}
            onClick={() => setConfirmReset(true)}
            className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            Cargar datos de fábrica
          </button>
        </div>
      </div>

      {/* Modal confirmar restore */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setPendingRestore(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-3">¿Restaurar esta copia?</p>
            <div className="bg-brand-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
              <Row label="Versión" value={pendingRestore.summary.version} />
              <Row label="Insumos" value={pendingRestore.summary.insumos} />
              <Row label="Recetas" value={pendingRestore.summary.recetas} />
              <Row label="Competidoras propias" value={pendingRestore.summary.competidoras} />
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Reemplaza lo que ven todos. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => setPendingRestore(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={confirmarRestore}
                className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold disabled:opacity-50"
              >
                {busy ? 'Restaurando…' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar reset */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setConfirmReset(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Cargar datos de fábrica?</p>
            <p className="text-sm text-gray-500 text-center mb-5">
              Vas a reemplazar la base compartida con la precarga inicial. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => setConfirmReset(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold disabled:opacity-50">
                Cancelar
              </button>
              <button disabled={busy} onClick={resetear} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold disabled:opacity-50">
                {busy ? 'Cargando…' : 'Sí, cargar'}
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
