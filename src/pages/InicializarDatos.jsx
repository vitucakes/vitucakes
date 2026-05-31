import { useRef, useState } from 'react'
import { useEditGate } from '../hooks/useEditGate'
import { readDeviceData, readBackupData, buildFactoryData } from '../utils/seedData'

// Pantalla de PRIMERA carga: aparece solo cuando la base compartida está vacía
// (meta.seeded !== true). Sirve para subir por única vez los datos iniciales.
//
// Recomendado: que Vitu la abra desde SU celular y elija "Subir los datos de
// este dispositivo", así sus datos reales quedan como fuente de verdad para
// todos. Requiere desbloquear con PIN (es una escritura importante).
export default function InicializarDatos({ onSeed }) {
  const { canEdit, requestUnlock } = useEditGate()
  const device = readDeviceData()
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null) // { origen, data }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const pedirDispositivo = () => {
    setPending({ origen: 'Este dispositivo', data: device })
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      const data = readBackupData(json)
      setPending({ origen: `Backup (${json.exportadoEn?.slice(0, 10) ?? 'archivo'})`, data })
    } catch (err) {
      setError(`Archivo inválido: ${err.message}`)
    }
  }

  const pedirFabrica = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await buildFactoryData()
      setPending({ origen: 'Datos de fábrica', data })
    } catch (err) {
      setError(`No se pudieron cargar los datos de fábrica: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const confirmar = async () => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      await onSeed(pending.data)
      // Al setear meta.seeded, App desmonta esta pantalla automáticamente.
    } catch (err) {
      setError(`No se pudo subir: ${err.message}`)
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-50">
      <div className="bg-white px-5 pt-14 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Inicializar datos</h1>
        <p className="text-sm text-gray-500 mt-1">
          La base compartida está vacía. Cargá los datos iniciales una sola vez.
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Aviso de candado */}
        {!canEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-900 font-semibold mb-1">🔒 Necesitás desbloquear</p>
            <p className="text-xs text-amber-800 leading-relaxed mb-3">
              Esto carga los datos que van a ver todos. Desbloqueá con el PIN para continuar.
            </p>
            <button
              onClick={requestUnlock}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm active:scale-95 transition-transform"
            >
              Desbloquear con PIN
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-3 text-sm bg-red-50 border border-red-200 text-red-800">{error}</div>
        )}

        {/* Opción recomendada: este dispositivo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-brand-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">Recomendado</p>
            <span className="text-xs text-gray-400">desde el celu de Vitu</span>
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1">Subir los datos de este dispositivo</p>
          <p className="text-xs text-gray-600 mb-3">
            Sube lo que este celular tiene cargado hoy. Es la opción correcta si lo abrís en el
            dispositivo donde Vitu venía usando la app.
          </p>
          <div className="bg-brand-50 rounded-xl p-3 mb-3 grid grid-cols-3 gap-2 text-center">
            <Stat n={device.insumos.length} label="insumos" />
            <Stat n={device.recetas.length} label="recetas" />
            <Stat n={device.competidoras.length} label="comp." />
          </div>
          <button
            disabled={!canEdit || busy}
            onClick={pedirDispositivo}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            Subir estos datos
          </button>
          {device.insumos.length === 0 && device.recetas.length === 0 && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Este dispositivo no tiene datos. Mejor hacelo desde el celu de Vitu.
            </p>
          )}
        </div>

        {/* Importar backup */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand-50">
          <p className="text-sm font-bold text-gray-800 mb-1">Importar desde un backup</p>
          <p className="text-xs text-gray-600 mb-3">
            Subí un archivo de backup (.json) que hayas descargado antes.
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
          <button
            disabled={!canEdit || busy}
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl bg-brand-50 text-brand-600 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            Elegir archivo de backup
          </button>
        </div>

        {/* Fábrica (último recurso) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-1">Datos de fábrica</p>
          <p className="text-xs text-gray-600 mb-3">
            Carga la precarga inicial (167 insumos + recetas base). Usalo solo si no hay datos
            reales que subir.
          </p>
          <button
            disabled={!canEdit || busy}
            onClick={pedirFabrica}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
          >
            Cargar datos de fábrica
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setPending(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-base font-bold text-gray-800 text-center mb-1">¿Subir estos datos?</p>
            <p className="text-xs text-gray-500 text-center mb-4">Origen: {pending.origen}</p>
            <div className="bg-brand-50 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
              <Row label="Insumos" value={pending.data.insumos.length} />
              <Row label="Recetas / Productos" value={pending.data.recetas.length} />
              <Row label="Competidoras propias" value={pending.data.competidoras.length} />
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Esto va a ser lo que vean todos. Confirmá que los números son correctos.
            </p>
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => setPending(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={confirmar}
                className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold disabled:opacity-50"
              >
                {busy ? 'Subiendo…' : 'Sí, subir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ n, label }) {
  return (
    <div>
      <div className="text-lg font-bold text-brand-600">{n}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
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
