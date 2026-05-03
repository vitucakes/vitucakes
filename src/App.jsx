import { useState, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import InsumosPage from './pages/InsumosPage'
import RecetasPage from './pages/RecetasPage'
import RecetaDetail from './pages/RecetaDetail'
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

  const navigate = (to, id = null) => {
    setPage(to)
    setSelectedId(id)
  }

  const selectedReceta = recetas.find((r) => r.id === selectedId)

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        {page === 'insumos' && (
          <InsumosPage insumos={insumos} setInsumos={setInsumos} />
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
      {page !== 'detalle' && (
        <BottomNav current={page} onChange={(p) => navigate(p)} />
      )}
    </div>
  )
}
