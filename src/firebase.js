// Conexión a Firebase (Firestore + Auth anónima).
//
// Los datos del config NO son secretos: son identificadores públicos del
// proyecto. La seguridad real la dan las reglas de Firestore (lectura para
// todos, escritura solo con sesión anónima) + el candado por PIN en la UI.
import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyB2kU0j2lbbKlNTHalUFPChQW3u0t1cj60',
  authDomain: 'vitucakes.firebaseapp.com',
  projectId: 'vitucakes',
  storageBucket: 'vitucakes.firebasestorage.app',
  messagingSenderId: '199513121308',
  appId: '1:199513121308:web:b3925fc5413139777cb5d9',
}

const app = initializeApp(firebaseConfig)

// Firestore con cache offline (IndexedDB). Clave en mobile: la app sigue
// andando sin señal y sincroniza cuando vuelve la conexión.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const auth = getAuth(app)

// Login anónimo automático e invisible: no hay pantalla de login, pero las
// reglas de Firestore exigen estar autenticado para escribir, lo que frena
// bots externos que escaneen proyectos abiertos.
export const authReady = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsub()
      resolve(user)
    }
  })
})

signInAnonymously(auth).catch((e) => {
  console.error('Falló el login anónimo de Firebase:', e)
})
