const BASE_TABS = [
  { id: 'insumos', label: 'Insumos', icon: '🧂' },
  { id: 'recetas', label: 'Productos', icon: '🎂' },
]
// Compras y Ventas son datos internos del negocio: solo se muestran en modo
// edición (detrás del PIN), no para un cliente que abre el link público.
const EDIT_TABS = [
  { id: 'compras', label: 'Compras', icon: '🛒' },
  { id: 'ventas', label: 'Ventas', icon: '💵' },
]

export default function BottomNav({ current, onChange, canEdit }) {
  const tabs = canEdit ? [...BASE_TABS, ...EDIT_TABS] : BASE_TABS
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-brand-100 flex z-40">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
            current === tab.id ? 'text-brand-500' : 'text-gray-400'
          }`}
        >
          <span className="text-2xl leading-none">{tab.icon}</span>
          <span className={`text-xs font-semibold mt-1 ${current === tab.id ? 'text-brand-500' : 'text-gray-400'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}
