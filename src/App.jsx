import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import InsumosPage from './pages/InsumosPage'
import RecetasPage from './pages/RecetasPage'
import RecetaDetail from './pages/RecetaDetail'
import ActualizarPreciosPage from './pages/ActualizarPreciosPage'
import BottomNav from './components/BottomNav'

export default function App() {
  const [page, setPage] = useState('recetas')
  const [selectedId, setSelectedId] = useState(null)
  const [insumos, setInsumos] = useLocalStorage('vitucakes_insumos', [])
  const [recetas, setRecetas] = useLocalStorage('vitucakes_recetas', [])

  useEffect(() => {
    if (insumos.length === 0 && recetas.length === 0 && !localStorage.getItem('vitucakes_precarga_done')) {
      const url = `${import.meta.env.BASE_URL}precarga.json`
      fetch(url)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.insumos && data?.recetas) {
            setInsumos(data.insumos)
            setRecetas(data.recetas)
            localStorage.setItem('vitucakes_precarga_done', '1')
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Migración one-shot: restaurar insumos del precarga que el usuario haya
  // borrado por accidente y que sigan siendo referenciados por alguna receta.
  // Sin esto, las recetas quedan con ingredientes "fantasma" (warning ⚠️)
  // y no se puede recuperar el precio.
  useEffect(() => {
    const FLAG = 'vitucakes_restore_orphans_v1'
    if (localStorage.getItem(FLAG)) return
    if (insumos.length === 0 || recetas.length === 0) return
    const idsExistentes = new Set(insumos.map((i) => i.id))
    const idsReferenciados = new Set()
    for (const r of recetas) for (const ing of r.ingredientes) idsReferenciados.add(ing.insumoId)
    const idsFaltantes = [...idsReferenciados].filter((id) => !idsExistentes.has(id))
    if (idsFaltantes.length === 0) {
      localStorage.setItem(FLAG, '1')
      return
    }
    fetch(`${import.meta.env.BASE_URL}precarga.json`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.insumos) return
        const restaurar = data.insumos.filter((i) => idsFaltantes.includes(i.id))
        if (restaurar.length > 0) {
          setInsumos((prev) => [...prev, ...restaurar.map((i) => ({ ...i, updatedAt: Date.now() }))])
        }
        localStorage.setItem(FLAG, '1')
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insumos.length, recetas.length])

  // Migración v2: agrega insumos nuevos (Sal, Mascarpone, etc.), aplica cambios
  // a 5 recetas existentes y agrega 17 recetas nuevas que no estaban en el
  // precarga. Para recetas existentes solo se aplica el cambio si la receta
  // sigue teniendo el nombre original; para recetas nuevas, solo si no existe
  // otra con el mismo nombre.
  useEffect(() => {
    const FLAG = 'vitucakes_recetas_v2_done'
    if (localStorage.getItem(FLAG)) return
    if (insumos.length === 0 || recetas.length === 0) return
    fetch(`${import.meta.env.BASE_URL}recetas_v2.json`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        // 1) Insumos nuevos: agregar si no existen por id
        const insumosExistentesIds = new Set(insumos.map((i) => i.id))
        const insumosAAgregar = (data.insumosNuevos || []).filter((i) => !insumosExistentesIds.has(i.id))
        if (insumosAAgregar.length > 0) {
          setInsumos((prev) => [...prev, ...insumosAAgregar.map((i) => ({ ...i, updatedAt: Date.now() }))])
        }
        // 2) Cambios a recetas existentes: matchean por nombre
        let stamp = Date.now() + 1000
        setRecetas((prev) => {
          let next = prev.map((r) => {
            const cambio = (data.cambiosRecetas || []).find((c) => c.nombre === r.nombre)
            if (!cambio) return r
            stamp += 1
            if (cambio.reemplazar) {
              return { ...r, ingredientes: cambio.reemplazar, updatedAt: stamp }
            }
            if (cambio.agregar) {
              const existingIds = new Set(r.ingredientes.map((ing) => ing.insumoId))
              const toAdd = cambio.agregar.filter((ing) => !existingIds.has(ing.insumoId))
              if (toAdd.length === 0) return r
              return { ...r, ingredientes: [...r.ingredientes, ...toAdd], updatedAt: stamp }
            }
            return r
          })
          // 3) Recetas nuevas: agregar si no existe otra con el mismo nombre
          const nombresExistentes = new Set(next.map((r) => r.nombre))
          const nuevasAAgregar = (data.recetasNuevas || []).filter((r) => !nombresExistentes.has(r.nombre))
          if (nuevasAAgregar.length > 0) {
            next = [...next, ...nuevasAAgregar]
          }
          return next
        })
        localStorage.setItem(FLAG, '1')
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insumos.length, recetas.length])

  const navigate = (to, id = null) => {
    setPage(to)
    setSelectedId(id)
  }

  const selectedReceta = recetas.find((r) => r.id === selectedId)

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        {page === 'insumos' && (
          <InsumosPage insumos={insumos} setInsumos={setInsumos} recetas={recetas} onActualizarPrecios={() => navigate('actualizar-precios')} />
        )}
        {page === 'actualizar-precios' && (
          <ActualizarPreciosPage insumos={insumos} setInsumos={setInsumos} onBack={() => navigate('insumos')} />
        )}
        {page === 'recetas' && (
          <RecetasPage
            recetas={recetas}
            setRecetas={setRecetas}
            insumos={insumos}
            onSelect={(id) => {
              setRecetas((prev) => prev.map((r) => r.id === id ? { ...r, updatedAt: Date.now() } : r))
              navigate('detalle', id)
            }}
          />
        )}
        {page === 'detalle' && selectedReceta && (
          <RecetaDetail
            receta={selectedReceta}
            insumos={insumos}
            onBack={() => navigate('recetas')}
            onUpdate={(updated) => setRecetas((prev) => prev.map((r) => r.id === updated.id ? { ...updated, updatedAt: Date.now() } : r))}
            onDelete={(id) => { setRecetas((prev) => prev.filter((r) => r.id !== id)); navigate('recetas') }}
          />
        )}
      </main>
      {page !== 'detalle' && page !== 'actualizar-precios' && (
        <BottomNav current={page} onChange={(p) => navigate(p)} />
      )}
    </div>
  )
}
