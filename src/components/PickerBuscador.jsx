import { useMemo, useState } from 'react'

// Selector con buscador para listas largas (insumos, productos). Reemplaza a
// los <select> planos: escribís un par de letras y tocás el ítem de la lista.
// Una vez elegido, colapsa a una sola fila con el botón "Cambiar" para volver
// a buscar. `items`: [{ id, nombre, detalle? }] (detalle: texto chico a la
// derecha, ej. la unidad o el precio).
export default function PickerBuscador({ items, value, onChange, placeholder = '🔍 Buscar...' }) {
  const [search, setSearch] = useState('')
  const seleccionado = items.find((it) => it.id === value)

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.nombre.toLowerCase().includes(q))
  }, [items, search])

  if (seleccionado) {
    return (
      <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-brand-100 px-3 py-2.5">
        <span className="flex-1 text-sm font-semibold text-gray-800 break-words min-w-0">{seleccionado.nombre}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {seleccionado.detalle && <span className="text-xs text-gray-400">{seleccionado.detalle}</span>}
          <button
            type="button"
            onClick={() => {
              onChange('')
              setSearch('')
            }}
            className="text-xs font-semibold text-brand-500 bg-brand-50 rounded-full px-2.5 py-1 active:scale-95 transition-transform"
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="input bg-white"
      />
      <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {filtrados.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-3 text-center">Sin resultados para “{search.trim()}”</p>
        ) : (
          filtrados.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                onChange(it.id)
                setSearch('')
              }}
              className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 text-sm text-gray-700 active:bg-brand-50 transition-colors"
            >
              <span className="flex-1 break-words min-w-0">{it.nombre}</span>
              {it.detalle && <span className="text-xs text-gray-400 flex-shrink-0">{it.detalle}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
