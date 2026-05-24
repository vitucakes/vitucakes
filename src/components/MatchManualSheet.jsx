import { useMemo, useState } from 'react'
import BottomSheet from './BottomSheet'
import { formatARS } from '../utils/calc'
import { productosDisponibles } from '../utils/competencia'

// Sheet reusable para que el user elija a mano un producto de competencia
// como match de una receta de Vitu. Usado tanto en RecetaDetail como en
// ResolverMatchesPage.
//
// Props:
// - isOpen, onClose: control estándar del BottomSheet
// - receta: la receta de Vitu que está matcheando (para el título y para
//   filtrar los productos que ya matcheó)
// - competidoras: array completo de competidoras del JSON
// - onElegir(producto): callback cuando el user elige uno. El padre actualiza
//   la receta (agregar a matchesCompetencia + limpiar rechazadosCompetencia
//   si aplica) y nosotros cerramos el sheet.
export default function MatchManualSheet({ isOpen, onClose, receta, competidoras = [], onElegir }) {
  const [search, setSearch] = useState('')

  const productos = useMemo(
    () => productosDisponibles(receta, competidoras, search),
    [receta, competidoras, search],
  )

  const handleClose = () => {
    setSearch('')
    onClose()
  }

  const handleElegir = (p) => {
    onElegir(p)
    setSearch('')
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Elegir match manual">
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Buscá el producto de la competencia que equivale a{' '}
          <span className="font-semibold text-gray-700">{receta.nombre}</span>.
        </p>
        <input
          type="text"
          placeholder="Buscar por nombre o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          autoFocus
        />
        {productos.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            {search
              ? `No hay productos que coincidan con "${search}"`
              : 'No hay productos disponibles para matchear.'}
          </p>
        )}
        <div className="space-y-2">
          {productos.map((p) => (
            <button
              key={`${p.competidoraId}-${p.productoSlug}`}
              onClick={() => handleElegir(p)}
              className="w-full text-left bg-brand-50 rounded-xl p-3 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-wide">
                    {p.competidoraNombre}
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{p.productoNombre}</p>
                  {p.productoDescripcion && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.productoDescripcion}</p>
                  )}
                </div>
                <span className="text-base font-black text-brand-600 flex-shrink-0">
                  {formatARS(p.productoPrecio)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}
