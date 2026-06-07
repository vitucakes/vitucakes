// Construcción de los datos de "arranque" para sembrar la base compartida la
// PRIMERA vez. La nube arranca vacía; alguien (idealmente Vitu desde su celu)
// elige de dónde salen los datos iniciales.

const BASE = import.meta.env.BASE_URL

// Lee los datos que YA tiene este dispositivo en localStorage (la versión
// vieja de la app guardaba todo ahí). Es la fuente correcta para subir los
// datos reales de Vitu desde su celular sin perder nada.
export function readDeviceData() {
  const parse = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null')
    } catch {
      return null
    }
  }
  return {
    insumos: parse('vitucakes_insumos') || [],
    recetas: parse('vitucakes_recetas') || [],
    competidoras: parse('vitucakes_competidoras_user') || [],
    compras: parse('vitucakes_compras') || [],
    ventas: parse('vitucakes_ventas') || [],
  }
}

// Extrae datos de un archivo de backup (mismo formato que exporta BackupPage).
export function readBackupData(json) {
  if (json?.app !== 'vitucakes') {
    throw new Error('No parece un backup de Vitucakes (falta "app": "vitucakes")')
  }
  const d = json.datos || {}
  return {
    insumos: d.vitucakes_insumos || [],
    recetas: d.vitucakes_recetas || [],
    competidoras: d.vitucakes_competidoras_user || [],
    compras: d.vitucakes_compras || [],
    ventas: d.vitucakes_ventas || [],
  }
}

// Construye los datos de fábrica (precarga + migración v2) desde los JSON del
// repo. Es el ÚLTIMO recurso: solo si no hay datos reales que subir.
// Replica la lógica de las migraciones que antes corrían en App.jsx, pero de
// una sola vez sobre datos limpios.
export async function buildFactoryData() {
  const precarga = await fetch(`${BASE}precarga.json`).then((r) => r.json())
  let insumos = [...(precarga.insumos || [])]
  let recetas = [...(precarga.recetas || [])]

  try {
    const v2 = await fetch(`${BASE}recetas_v2.json`).then((r) => r.json())

    // 1) Insumos nuevos
    const insumoIds = new Set(insumos.map((i) => i.id))
    for (const i of v2.insumosNuevos || []) {
      if (!insumoIds.has(i.id)) insumos.push(i)
    }

    // 2) Cambios a recetas existentes (matchean por nombre)
    recetas = recetas.map((r) => {
      const c = (v2.cambiosRecetas || []).find((x) => x.nombre === r.nombre)
      if (!c) return r
      if (c.reemplazar) return { ...r, ingredientes: c.reemplazar }
      if (c.agregar) {
        const ids = new Set(r.ingredientes.map((g) => g.insumoId))
        return { ...r, ingredientes: [...r.ingredientes, ...c.agregar.filter((g) => !ids.has(g.insumoId))] }
      }
      return r
    })

    // 3) Recetas nuevas
    const nombres = new Set(recetas.map((r) => r.nombre))
    for (const r of v2.recetasNuevas || []) {
      if (!nombres.has(r.nombre)) recetas.push(r)
    }
  } catch {
    // Si falla recetas_v2, usamos solo la precarga base.
  }

  return { insumos, recetas, competidoras: [], compras: [], ventas: [] }
}
