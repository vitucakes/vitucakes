import { useState } from 'react'
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
            onSelect={(id) => navigate('detalle', id)}
          />
        )}
        {page === 'detalle' && selectedReceta && (
          <RecetaDetail
            receta={selectedReceta}
            insumos={insumos}
            onBack={() => navigate('recetas')}
            onUpdate={(updated) => setRecetas((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
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
