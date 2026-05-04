const TABS = [
  { id: 'insumos', label: 'Insumos', icon: '🧂' },
  { id: 'recetas', label: 'Productos', icon: '🎂' },
]

export default function BottomNav({ current, onChange }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-brand-100 flex z-40">
      {TABS.map((tab) => (
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
