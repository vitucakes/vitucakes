import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Colección de Firestore donde vive todo. Un doc por "tabla":
//   vitucakes/insumos              -> { value: [...] }
//   vitucakes/recetas              -> { value: [...] }
//   vitucakes/competidoras_user    -> { value: [...] }
//   vitucakes/meta                 -> { value: { seeded: true, ... } }
const COL = 'vitucakes'

// Si una escritura falla, el user TIENE que enterarse: antes fallaba en
// silencio (la pantalla mostraba el cambio y después volvía atrás sola) y
// parecía que la app "no guarda". Avisamos una sola vez por tabla.
const yaAvisado = new Set()
function avisarFalloDeGuardado(name, error) {
  console.error(`useSharedState(${name}) write:`, error)
  if (yaAvisado.has(name)) return
  yaAvisado.add(name)
  setTimeout(() => {
    yaAvisado.delete(name)
    alert(
      'No se pudo guardar el último cambio 😕\n\n' +
        'Revisá tu conexión y volvé a intentar. Si sigue pasando, avisá para revisarlo.',
    )
  }, 0)
}

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
  const initialRef = useRef(initialValue)
  const writeTimer = useRef(null)
  // Escritura pendiente (todavía en el debounce). Si la app se cierra/pasa a
  // background antes de que dispare el timer, se pierde el cambio → por eso
  // hay que poder mandarla YA (flush).
  const pending = useRef(null)
  // Escrituras nuestras ya enviadas pero sin confirmar. Mientras haya alguna
  // (o algo pendiente), lo LOCAL manda y se ignoran los snapshots: si no, el
  // eco de una escritura vieja pisa la nueva y el cambio se ve "no guardado"
  // (y peor: la edición siguiente parte de ese valor viejo y lo borra).
  const enVuelo = useRef(0)

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
    enVuelo.current += 1
    // setDoc puede tirar SINCRÓNICAMENTE si el dato es inválido (ej. un campo
    // en undefined): un .catch() no lo agarra y el error queda "Uncaught",
    // así que el guardado falla en silencio. Por eso el try/catch.
    try {
      setDoc(doc(db, COL, name), { value: next }, { merge: true })
        .catch((e) => avisarFalloDeGuardado(name, e))
        .finally(() => {
          enVuelo.current = Math.max(0, enVuelo.current - 1)
        })
    } catch (e) {
      enVuelo.current = Math.max(0, enVuelo.current - 1)
      avisarFalloDeGuardado(name, e)
    }
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
        // Mientras tengamos cambios propios sin confirmar, lo LOCAL manda: un
        // snapshot que llega en el medio es más viejo que lo que tenemos acá.
        // Cuando se confirmen, el siguiente snapshot ya trae todo junto.
        if (pending.current !== null || enVuelo.current > 0) {
          setLoaded(true)
          return
        }
        const remote = snap.exists() ? snap.data().value : undefined
        const next = remote === undefined ? initialRef.current : remote
        // Si es idéntico a lo que ya tenemos (el eco de nuestra escritura),
        // no re-seteamos: evita re-renders y parpadeos al pedo.
        if (JSON.stringify(next) !== JSON.stringify(valueRef.current)) {
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
      pending.current = next
      if (writeTimer.current) clearTimeout(writeTimer.current)
      writeTimer.current = setTimeout(flush, 350)
    },
    [name, flush],
  )

  return [value, setValue, loaded]
}
