import { createContext, useContext, useState, useCallback } from 'react'

// Candado de edición.
//
// Por defecto la app está en modo SOLO LECTURA: cualquiera que abra el link ve
// todo, pero para editar (crear/modificar/borrar insumos, recetas, precios,
// etc.) hace falta desbloquear con un PIN que solo Vitu y Patricio saben.
//
// El PIN no viaja en texto plano en el repo: guardamos su hash SHA-256. Es un
// candado "anti-accidente" (frena a viewers/clientes); no pretende frenar a
// alguien técnico con el link. Si en el futuro se quiere candado fuerte, se
// migra a Login con Google + allowlist de mails en las reglas de Firestore.
const PIN_HASH = '7a64ce427ce0ca963ce9c3ab0da2db27c1f3ac9620444e1b4312422af8e093b9'
const STORAGE_KEY = 'vitucakes_edit_unlocked'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const EditGateContext = createContext(null)

export function EditGateProvider({ children }) {
  // Una vez desbloqueado en un dispositivo, queda desbloqueado (se guarda en
  // localStorage de ESE dispositivo). En el celu de un cliente nunca se
  // desbloquea porque no tiene el PIN.
  const [canEdit, setCanEdit] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [prompting, setPrompting] = useState(false)

  const unlock = useCallback(async (pin) => {
    const ok = (await sha256(String(pin).trim())) === PIN_HASH
    if (ok) {
      setCanEdit(true)
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {}
    }
    return ok
  }, [])

  const lock = useCallback(() => {
    setCanEdit(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const requestUnlock = useCallback(() => setPrompting(true), [])

  return (
    <EditGateContext.Provider value={{ canEdit, unlock, lock, requestUnlock }}>
      {children}
      {prompting && <PinPrompt onClose={() => setPrompting(false)} onUnlock={unlock} />}
    </EditGateContext.Provider>
  )
}

export function useEditGate() {
  const ctx = useContext(EditGateContext)
  if (!ctx) throw new Error('useEditGate debe usarse dentro de <EditGateProvider>')
  return ctx
}

// Botón candado para los headers. Muestra 🔒 (bloqueado, tocá para desbloquear)
// o 🔓 (desbloqueado, tocá para volver a bloquear).
export function LockToggle({ className = '' }) {
  const { canEdit, lock, requestUnlock } = useEditGate()
  return (
    <button
      onClick={() => (canEdit ? lock() : requestUnlock())}
      title={canEdit ? 'Modo edición activo — tocá para bloquear' : 'Solo lectura — tocá para desbloquear'}
      className={`w-9 h-9 flex items-center justify-center rounded-full text-lg active:scale-90 transition-transform ${
        canEdit ? 'bg-emerald-50' : 'bg-brand-50'
      } ${className}`}
    >
      {canEdit ? '🔓' : '🔒'}
    </button>
  )
}

function PinPrompt({ onClose, onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    if (checking) return
    setChecking(true)
    const ok = await onUnlock(pin)
    setChecking(false)
    if (ok) {
      onClose()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-base font-bold text-gray-800 text-center mb-1">Modo edición</p>
        <p className="text-sm text-gray-500 text-center mb-4">
          Ingresá el PIN para poder crear y modificar datos.
        </p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError(false)
          }}
          placeholder="••••"
          className={`w-full text-center text-2xl tracking-[0.5em] py-3 rounded-2xl border-2 ${
            error ? 'border-red-300 bg-red-50' : 'border-brand-100 bg-brand-50'
          } focus:outline-none focus:border-brand-400`}
        />
        {error && <p className="text-xs text-red-600 text-center mt-2">PIN incorrecto</p>}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={checking || pin.length === 0}
            className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold disabled:opacity-50"
          >
            Desbloquear
          </button>
        </div>
      </form>
    </div>
  )
}
