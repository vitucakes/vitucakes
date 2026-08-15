import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Colección de Firestore donde vive todo. Un doc por "tabla":
//   vitucakes/insumos              -> { value: [...] }
//   vitucakes/recetas              -> { value: [...] }
//   vitucakes/competidoras_user    -> { value: [...] }
//   vitucakes/meta                 -> { value: { seeded: true, ... } }
const COL = 'vitucakes'

// Hook con la MISMA interfaz que useLocalStorage: [value, setValue].
// Diferencias:
//   - Los datos viven en Firestore (compartidos entre todos los dispositivos).
//   - Sincroniza EN VIVO: si otro dispositivo cambia el dato, se refleja acá
//     solo (real-time listener).
//   - Devuelve un 3er valor `loaded` para saber si ya conocemos el estado real
//     de la nube (útil para no actuar sobre el initialValue por error).
//
// Las escrituras se debouncean (350ms) para coalescer ráfagas de cambios y no
// spamear Firestore.
export function useSharedState(name, initialValue) {
  const [value, setValueState] = useState(initialValue)
  const [loaded, setLoaded] = useState(false)
  // Espejo síncrono del valor actual: necesario para soportar el patrón
  // setValue(prev => ...) sin depender del closure de React.
  const valueRef = useRef(initialValue)
  // JSON de lo último que ESTE cliente escribió, para ignorar el "eco" del
  // listener cuando Firestore nos devuelve nuestra propia escritura.
  const lastWrittenJson = useRef(null)
  const initialRef = useRef(initialValue)
  const writeTimer = useRef(null)
  // Escritura pendiente (todavía en el debounce). Si la app se cierra/pasa a
  // background antes de que dispare el timer, se pierde el cambio → por eso
  // hay que poder mandarla YA (flush).
  const pending = useRef(null)

  // Manda la escritura pendiente sin esperar el debounce. Firestore tiene
  // cache offline (IndexedDB): con que setDoc se LLAME, el dato queda guardado
  // localmente y sincroniza solo cuando vuelve la app/conexión.
  const flush = useCallback(() => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current)
      writeTimer.current = null
    }
    const next = pending.current
    if (next === null) return
    pending.current = null
    setDoc(doc(db, COL, name), { value: next }, { merge: true }).catch((e) =>
      console.error(`useSharedState(${name}) write:`, e),
    )
  }, [name])

  // En mobile la pestaña se congela/descarta al pasar a background o bloquear
  // la pantalla, y los timers no llegan a correr. Estos dos eventos son la
  // última chance de escribir: 'pagehide' (iOS Safari) y 'visibilitychange'.
  useEffect(() => {
    const alGuardar = () => flush()
    window.addEventListener('pagehide', alGuardar)
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      window.removeEventListener('pagehide', alGuardar)
      document.removeEventListener('visibilitychange', alOcultar)
      flush() // por las dudas, al desmontar
    }
  }, [flush])

  useEffect(() => {
    const ref = doc(db, COL, name)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const remote = snap.exists() ? snap.data().value : undefined
        const next = remote === undefined ? initialRef.current : remote
        const json = JSON.stringify(next)
        // Si coincide con lo que acabamos de escribir nosotros, es el eco:
        // no re-seteamos para evitar parpadeos / loops.
        if (json !== lastWrittenJson.current) {
          valueRef.current = next
          setValueState(next)
        }
        setLoaded(true)
      },
      (err) => {
        console.error(`useSharedState(${name}) listener:`, err)
        setLoaded(true)
      },
    )
    return () => {
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  const setValue = useCallback(
    (updater) => {
      const next = updater instanceof Function ? updater(valueRef.current) : updater
      valueRef.current = next
      setValueState(next)
      const json = JSON.stringify(next)
      lastWrittenJson.current = json
      pending.current = next
      if (writeTimer.current) clearTimeout(writeTimer.current)
      writeTimer.current = setTimeout(flush, 350)
    },
    [name, flush],
  )

  return [value, setValue, loaded]
}
