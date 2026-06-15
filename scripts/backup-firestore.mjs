// Backup automático de la base compartida (Firestore) a un archivo local.
//
// Corre SIN dependencias: usa la API REST pública de Firestore (las reglas
// dejan lectura para todos) y el `fetch` nativo de Node 18+. Por eso no
// necesita `npm install` ni el SDK de firebase: se puede agendar con launchd/
// cron sin frituras.
//
// Genera el MISMO formato que el botón "Bajá un backup" de la app
// (src/pages/BackupPage.jsx), así que el archivo sirve para restaurar desde
// "Inicializar datos" → "Importar desde un backup".
//
// Salida: backups/vitucakes-backup-AAAA-MM-DD.json (en la raíz del repo).
// Esa carpeta está en .gitignore: queda en tu compu (y en Drive si la carpeta
// sincroniza), pero NO se sube al repo público.

import { writeFile, rename, mkdir, readdir, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PROJECT = 'vitucakes'
const APP_VERSION = '2.1' // igual que BackupPage.jsx
const KEEP_LAST = 12 // cuántos backups dejar en la carpeta (≈3 meses)

// clave del backup -> nombre del doc en Firestore (colección "vitucakes")
const DOCS = {
  vitucakes_insumos: 'insumos',
  vitucakes_recetas: 'recetas',
  vitucakes_competidoras_user: 'competidoras_user',
  vitucakes_compras: 'compras',
  vitucakes_ventas: 'ventas',
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${PROJECT}`

// Convierte el JSON "tipado" de Firestore REST a valores JS planos.
function decode(v) {
  if (v == null) return null
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('timestampValue' in v) return v.timestampValue
  if ('stringValue' in v) return v.stringValue
  if ('referenceValue' in v) return v.referenceValue
  if ('geoPointValue' in v) return v.geoPointValue
  if ('bytesValue' in v) return v.bytesValue
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode)
  if ('mapValue' in v) {
    const out = {}
    const fields = v.mapValue.fields || {}
    for (const k of Object.keys(fields)) out[k] = decode(fields[k])
    return out
  }
  return null
}

async function fetchDoc(docName) {
  const res = await fetch(`${BASE}/${docName}`)
  if (res.status === 404) return undefined // doc inexistente → se trata como vacío
  if (!res.ok) throw new Error(`GET ${docName} -> HTTP ${res.status}`)
  const json = await res.json()
  return decode(json.fields?.value)
}

async function main() {
  const datos = {}
  let totalItems = 0
  for (const [key, docName] of Object.entries(DOCS)) {
    const value = await fetchDoc(docName)
    // los docs guardan arrays; si no existe el doc, va array vacío
    const arr = value === undefined ? [] : value
    datos[key] = arr
    if (Array.isArray(arr)) totalItems += arr.length
  }

  const payload = {
    app: 'vitucakes',
    version: APP_VERSION,
    exportadoEn: new Date().toISOString(),
    origen: 'backup-automatico',
    datos,
  }

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const dir = join(repoRoot, 'backups')
  await mkdir(dir, { recursive: true })

  const fecha = new Date().toISOString().slice(0, 10)
  const filename = `vitucakes-backup-${fecha}.json`
  const finalPath = join(dir, filename)
  const tmpPath = `${finalPath}.tmp`

  // Escritura atómica: tmp + rename, para no dejar un backup a medias.
  await writeFile(tmpPath, JSON.stringify(payload, null, 2))
  await rename(tmpPath, finalPath)

  // Poda: dejar solo los KEEP_LAST más recientes.
  const files = (await readdir(dir))
    .filter((f) => /^vitucakes-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
  const sobran = files.slice(0, Math.max(0, files.length - KEEP_LAST))
  for (const f of sobran) await unlink(join(dir, f))

  const resumen = Object.entries(datos)
    .map(([k, v]) => `${k.replace('vitucakes_', '')}=${Array.isArray(v) ? v.length : '?'}`)
    .join(' ')
  console.log(`[${new Date().toISOString()}] OK ${filename} (${resumen}, ${totalItems} items)`)
}

main().catch((e) => {
  console.error(`[${new Date().toISOString()}] ERROR backup:`, e.message)
  process.exit(1)
})
