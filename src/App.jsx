import { useState, useEffect } from 'react'
import { useSharedState } from './hooks/useSharedState'
import { useEditGate } from './hooks/useEditGate'
import InsumosPage from './pages/InsumosPage'
import RecetasPage from './pages/RecetasPage'
import RecetaDetail from './pages/RecetaDetail'
import ActualizarPreciosPage from './pages/ActualizarPreciosPage'
import ResolverMatchesPage from './pages/ResolverMatchesPage'
import AgregarCompetidoraPage from './pages/AgregarCompetidoraPage'
import BackupPage from './pages/BackupPage'
import InicializarDatos from './pages/InicializarDatos'
import ComprasPage from './pages/ComprasPage'
import VentasPage from './pages/VentasPage'
import BottomNav from './components/BottomNav'
import { mergeCompetidoras } from './utils/competencia'

const COMPETENCIA_CACHE_KEY = 'vitucakes_competencia_cache'

export default function App() {
  const { canEdit } = useEditGate()
  const [page, setPage] = useState('recetas')
  const [selectedId, setSelectedId] = useState(null)

  // Datos COMPARTIDOS (viven en Firestore, sincronizan en vivo entre todos los
  // dispositivos). Misma interfaz que antes: [valor, setValor], + flag loaded.
  const [insumos, setInsumos, insumosLoaded] = useSharedState('insumos', [])
  const [recetas, setRecetas, recetasLoaded] = useSharedState('recetas', [])
  const [competidorasExtra, setCompetidorasExtra, compLoaded] = useSharedState('competidoras_user', [])
  // Metadatos: { seeded: bool } — marca si ya se cargaron los datos iniciales.
  const [meta, setMeta, metaLoaded] = useSharedState('meta', {})
  // Stock: compras (suman) y ventas (restan, según receta). Datos internos del
  // negocio (solo visibles en modo edición).
  const [compras, setCompras, comprasLoaded] = useSharedState('compras', [])
  const [ventas, setVentas, ventasLoaded] = useSharedState('ventas', [])

  const [competencia, setCompetencia] = useState(null)

  // Combinación: oficiales del JSON del cron + las que el user agregó.
  const competidoras = mergeCompetidoras(competencia?.competidoras ?? [], competidorasExtra)

  // Carga la competencia (productos de pasteleras competidoras). Esto sigue
  // viniendo del JSON del repo (lo genera el cron semanal); no es dato del user.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(COMPETENCIA_CACHE_KEY)
      if (cached) setCompetencia(JSON.parse(cached))
    } catch {}
    fetch(`${import.meta.env.BASE_URL}competencia.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setCompetencia(data)
        try {
          localStorage.setItem(COMPETENCIA_CACHE_KEY, JSON.stringify(data))
        } catch {}
      })
      .catch(() => {})
  }, [])

  const navigate = (to, id = null) => {
    setPage(to)
    setSelectedId(id)
  }

  // Si se bloquea la edición estando en una pantalla interna (Compras/Ventas),
  // volvemos a Productos: esas pantallas son solo para editores.
  useEffect(() => {
    if (!canEdit && (page === 'compras' || page === 'ventas')) setPage('recetas')
  }, [canEdit, page])

  // Siembra inicial de la base compartida (una sola vez). La dispara el user
  // desde la pantalla InicializarDatos eligiendo el origen de los datos.
  const seed = async (data) => {
    setInsumos(data.insumos || [])
    setRecetas(data.recetas || [])
    setCompetidorasExtra(data.competidoras || [])
    setMeta((prev) => ({ ...prev, seeded: true, seededAt: new Date().toISOString() }))
  }

  const loaded = insumosLoaded && recetasLoaded && compLoaded && metaLoaded && comprasLoaded && ventasLoaded

  // 1) Mientras no sepamos el estado real de la nube: pantalla de carga.
  if (!loaded) {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center max-w-md mx-auto gap-3">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Conectando…</p>
      </div>
    )
  }

  // 2) Si la base está vacía: pantalla de primera carga.
  if (!meta?.seeded) {
    return <InicializarDatos onSeed={seed} />
  }

  const selectedReceta = recetas.find((r) => r.id === selectedId)

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        {page === 'insumos' && (
          <InsumosPage
            insumos={insumos}
            setInsumos={setInsumos}
            recetas={recetas}
            onActualizarPrecios={() => navigate('actualizar-precios')}
          />
        )}
        {page === 'actualizar-precios' && (
          <ActualizarPreciosPage insumos={insumos} setInsumos={setInsumos} onBack={() => navigate('insumos')} />
        )}
        {page === 'recetas' && (
          <RecetasPage
            recetas={recetas}
            setRecetas={setRecetas}
            insumos={insumos}
            competidoras={competidoras}
            onResolverMatches={() => navigate('resolver-matches')}
            onBackup={() => navigate('backup')}
            onSelect={(id) => {
              // Contamos una "apertura" para el orden por más usados. Solo si
              // puede editar: un viewer (cliente) no debe reordenar la lista de todos.
              if (canEdit) {
                setRecetas((prev) => prev.map((r) => (r.id === id ? { ...r, usos: (r.usos ?? 0) + 1 } : r)))
              }
              navigate('detalle', id)
            }}
          />
        )}
        {page === 'resolver-matches' && (
          <ResolverMatchesPage
            recetas={recetas}
            setRecetas={setRecetas}
            competidoras={competidoras}
            onBack={() => navigate('recetas')}
            onAgregarCompetidora={() => navigate('agregar-competidora')}
          />
        )}
        {page === 'agregar-competidora' && (
          <AgregarCompetidoraPage
            extras={competidorasExtra}
            setExtras={setCompetidorasExtra}
            onBack={() => navigate('resolver-matches')}
          />
        )}
        {page === 'backup' && (
          <BackupPage
            data={{ insumos, recetas, competidoras: competidorasExtra, compras, ventas }}
            onApply={(d) => {
              setInsumos(d.insumos || [])
              setRecetas(d.recetas || [])
              setCompetidorasExtra(d.competidoras || [])
              setCompras(d.compras || [])
              setVentas(d.ventas || [])
            }}
            onBack={() => navigate('recetas')}
          />
        )}
        {page === 'compras' && canEdit && (
          <ComprasPage compras={compras} setCompras={setCompras} insumos={insumos} setInsumos={setInsumos} />
        )}
        {page === 'ventas' && canEdit && (
          <VentasPage
            ventas={ventas}
            setVentas={setVentas}
            insumos={insumos}
            setInsumos={setInsumos}
            recetas={recetas}
          />
        )}
        {page === 'detalle' && selectedReceta && (
          <RecetaDetail
            receta={selectedReceta}
            insumos={insumos}
            setInsumos={setInsumos}
            competidoras={competidoras}
            onBack={() => navigate('recetas')}
            onUpdate={(updated) =>
              setRecetas((prev) => prev.map((r) => (r.id === updated.id ? { ...updated, updatedAt: Date.now() } : r)))
            }
            onDelete={(id) => {
              setRecetas((prev) => prev.filter((r) => r.id !== id))
              navigate('recetas')
            }}
          />
        )}
      </main>
      {page !== 'detalle' &&
        page !== 'actualizar-precios' &&
        page !== 'resolver-matches' &&
        page !== 'agregar-competidora' &&
        page !== 'backup' && <BottomNav current={page} onChange={(p) => navigate(p)} canEdit={canEdit} />}
    </div>
  )
}
