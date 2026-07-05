import { useState } from 'react'
import BottomSheet from '../components/BottomSheet'
import { LockToggle } from '../hooks/useEditGate'
import { formatARS } from '../utils/calc'
import { mesAnterior, mesSiguiente, nombreMes, resumenMes } from '../utils/gestion'

const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const hoyMes = () => new Date().toISOString().slice(0, 7)

// Monto compacto para las celdas chicas (sin centavos).
const fmtCorto = (n) => formatARS(Math.round(n ?? 0))

// Módulo de CONTROL DE GESTIÓN: elegís un mes y ves cuánto facturaste
// (ventas), cuánto gastaste (compras) y la ganancia. Como no siempre se compra
// y se vende en el mismo mes, abajo van los 3 meses anteriores de referencia.
// Tocar cualquier número abre el detalle de los registros que lo forman.
export default function GestionPage({ ventas, compras }) {
  const [mes, setMes] = useState(hoyMes())
  const [detalle, setDetalle] = useState(null) // { key, tipo: 'ventas' | 'compras' | 'ganancia' }

  const actual = resumenMes(ventas, compras, mes)
  const anteriores = []
  let k = mes
  for (let i = 0; i < 3; i++) {
    k = mesAnterior(k)
    anteriores.push(resumenMes(ventas, compras, k))
  }

  // Promedio mensual de los 3 meses anteriores (÷3): normaliza el timing de
  // compra/venta cuando se compra un mes y se vende otro.
  const promedio = {
    facturado: anteriores.reduce((s, m) => s + m.facturado, 0) / 3,
    gastado: anteriores.reduce((s, m) => s + m.gastado, 0) / 3,
  }
  promedio.ganancia = promedio.facturado - promedio.gastado

  // % de ganancia sobre lo facturado (margen). null si no hubo ventas.
  const pctGanancia = (r) => (r.facturado > 0 ? Math.round((r.ganancia / r.facturado) * 100) : null)

  const r = detalle ? resumenMes(ventas, compras, detalle.key) : null
  const tituloDetalle = detalle
    ? `${{ ventas: 'Ventas', compras: 'Compras', ganancia: 'Ganancia' }[detalle.tipo]} · ${nombreMes(detalle.key)}`
    : ''

  const colorGanancia = (n) => (n >= 0 ? 'text-emerald-600' : 'text-red-500')

  const ListaVentas = ({ registros }) =>
    registros.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-6">No hubo ventas este mes.</p>
    ) : (
      <div className="space-y-2">
        {registros.map((v) => (
          <div key={v.id} className="bg-brand-50 rounded-xl px-3 py-2.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-700">{formatDate(v.fecha)}</span>
              <span className="text-sm font-black text-brand-600">{formatARS(v.total)}</span>
            </div>
            <ul className="space-y-0.5">
              {(v.items || []).map((it, idx) => (
                <li key={idx} className="flex justify-between text-xs text-gray-600 gap-2">
                  <span className="break-words">{it.cantidad}× {it.nombre}</span>
                  <span className="text-gray-400 whitespace-nowrap">{formatARS(it.precioUnitario * it.cantidad)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )

  const ListaCompras = ({ registros }) =>
    registros.length === 0 ? (
      <p className="text-sm text-gray-400 text-center py-6">No hubo compras este mes.</p>
    ) : (
      <div className="space-y-2">
        {registros.map((c) => (
          <div key={c.id} className="bg-brand-50 rounded-xl px-3 py-2.5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-700">{formatDate(c.fecha)}</span>
              {c.total > 0 ? (
                <span className="text-sm font-black text-brand-600">{formatARS(c.total)}</span>
              ) : (
                <span className="text-xs text-gray-400">sin monto</span>
              )}
            </div>
            <ul className="space-y-0.5">
              {(c.items || []).map((it, idx) => (
                <li key={idx} className="flex justify-between text-xs text-gray-600 gap-2">
                  <span className="break-words">{it.nombre}</span>
                  <span className="text-gray-400 whitespace-nowrap">
                    +{it.cantidad} {it.unidad}{it.total > 0 ? ` · ${formatARS(it.total)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Vitucakes" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          <h1 className="text-2xl font-bold text-gray-800 flex-1">Gestión</h1>
          <LockToggle />
        </div>
        <p className="text-xs text-gray-400 mt-1">Cuánto facturaste, cuánto compraste y cuánto te quedó.</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-3">
        {/* Selector de mes */}
        <div className="bg-white rounded-2xl px-2 py-2 shadow-sm border border-brand-50 flex items-center justify-between">
          <button
            onClick={() => setMes(mesAnterior(mes))}
            aria-label="Mes anterior"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold active:scale-90 transition-transform"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-800 capitalize">{nombreMes(mes)}</p>
            {mes !== hoyMes() && (
              <button onClick={() => setMes(hoyMes())} className="text-[11px] text-brand-500 font-semibold">
                volver a hoy
              </button>
            )}
          </div>
          <button
            onClick={() => setMes(mesSiguiente(mes))}
            aria-label="Mes siguiente"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-50 text-brand-500 text-lg font-bold active:scale-90 transition-transform"
          >
            ›
          </button>
        </div>

        {/* Resumen del mes elegido */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-brand-50 space-y-1">
          <button
            onClick={() => setDetalle({ key: mes, tipo: 'ventas' })}
            className="w-full flex items-center justify-between py-1.5 active:opacity-60 transition-opacity"
          >
            <span className="text-sm text-gray-500">
              Facturado <span className="text-gray-300">({actual.ventas.length} venta{actual.ventas.length !== 1 ? 's' : ''})</span>
            </span>
            <span className="text-base font-bold text-gray-800">
              {formatARS(actual.facturado)} <span className="text-gray-300 font-normal">›</span>
            </span>
          </button>
          <button
            onClick={() => setDetalle({ key: mes, tipo: 'compras' })}
            className="w-full flex items-center justify-between py-1.5 active:opacity-60 transition-opacity"
          >
            <span className="text-sm text-gray-500">
              Compras <span className="text-gray-300">({actual.compras.length})</span>
            </span>
            <span className="text-base font-bold text-gray-800">
              −{formatARS(actual.gastado)} <span className="text-gray-300 font-normal">›</span>
            </span>
          </button>
          <div className="border-t border-brand-50 my-1" />
          <button
            onClick={() => setDetalle({ key: mes, tipo: 'ganancia' })}
            className="w-full flex items-center justify-between py-1.5 active:opacity-60 transition-opacity"
          >
            <span className="text-sm font-semibold text-gray-600">Ganancia</span>
            <span className={`text-2xl font-black ${colorGanancia(actual.ganancia)}`}>
              {formatARS(actual.ganancia)} <span className="text-gray-300 font-normal text-base">›</span>
            </span>
          </button>
          {pctGanancia(actual) != null && (
            <p className="text-right text-[11px] text-gray-400">
              = <span className={`font-bold ${colorGanancia(actual.ganancia)}`}>{pctGanancia(actual)}%</span> de lo facturado
            </p>
          )}
        </div>

        {/* Promedio mensual de los 3 meses anteriores */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-brand-50">
          <p className="text-xs font-bold text-gray-500 mb-0.5">Promedio mensual</p>
          <p className="text-[10px] text-gray-400 mb-2">Últimos 3 meses ÷ 3 — empareja compras y ventas de meses distintos.</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-brand-50 rounded-xl px-2 py-2">
              <p className="text-[10px] text-gray-400 font-semibold">Facturado</p>
              <p className="text-xs font-bold text-gray-800 break-words">{fmtCorto(promedio.facturado)}</p>
            </div>
            <div className="bg-brand-50 rounded-xl px-2 py-2">
              <p className="text-[10px] text-gray-400 font-semibold">Compras</p>
              <p className="text-xs font-bold text-gray-800 break-words">−{fmtCorto(promedio.gastado)}</p>
            </div>
            <div className="bg-brand-50 rounded-xl px-2 py-2">
              <p className="text-[10px] text-gray-400 font-semibold">Ganancia</p>
              <p className={`text-xs font-bold break-words ${colorGanancia(promedio.ganancia)}`}>{fmtCorto(promedio.ganancia)}</p>
              {pctGanancia(promedio) != null && (
                <p className={`text-[10px] font-semibold ${colorGanancia(promedio.ganancia)}`}>{pctGanancia(promedio)}% s/ ventas</p>
              )}
            </div>
          </div>
        </div>

        {/* Referencia: los 3 meses anteriores */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-1 pt-1">Meses anteriores</p>
        {anteriores.map((m) => (
          <div key={m.key} className="bg-white rounded-2xl p-3 shadow-sm border border-brand-50">
            <button
              onClick={() => setMes(m.key)}
              className="text-sm font-bold text-gray-800 capitalize mb-2 active:opacity-60 transition-opacity"
              title="Ver este mes"
            >
              {nombreMes(m.key)} <span className="text-gray-300 font-normal text-xs">› ver</span>
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDetalle({ key: m.key, tipo: 'ventas' })}
                className="bg-brand-50 rounded-xl px-2 py-2 text-left active:scale-[0.98] transition-transform"
              >
                <p className="text-[10px] text-gray-400 font-semibold">Facturado</p>
                <p className="text-xs font-bold text-gray-800 break-words">{fmtCorto(m.facturado)}</p>
              </button>
              <button
                onClick={() => setDetalle({ key: m.key, tipo: 'compras' })}
                className="bg-brand-50 rounded-xl px-2 py-2 text-left active:scale-[0.98] transition-transform"
              >
                <p className="text-[10px] text-gray-400 font-semibold">Compras</p>
                <p className="text-xs font-bold text-gray-800 break-words">−{fmtCorto(m.gastado)}</p>
              </button>
              <button
                onClick={() => setDetalle({ key: m.key, tipo: 'ganancia' })}
                className="bg-brand-50 rounded-xl px-2 py-2 text-left active:scale-[0.98] transition-transform"
              >
                <p className="text-[10px] text-gray-400 font-semibold">Ganancia</p>
                <p className={`text-xs font-bold break-words ${colorGanancia(m.ganancia)}`}>{fmtCorto(m.ganancia)}</p>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detalle de lo que forma cada número */}
      <BottomSheet isOpen={!!detalle} onClose={() => setDetalle(null)} title={tituloDetalle}>
        {detalle && r && (
          <div className="space-y-4">
            {detalle.tipo === 'ventas' && (
              <>
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm text-gray-500">Total facturado ({r.ventas.length} venta{r.ventas.length !== 1 ? 's' : ''})</span>
                  <span className="text-lg font-black text-brand-600">{formatARS(r.facturado)}</span>
                </div>
                <ListaVentas registros={r.ventas} />
              </>
            )}
            {detalle.tipo === 'compras' && (
              <>
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm text-gray-500">Total comprado ({r.compras.length})</span>
                  <span className="text-lg font-black text-brand-600">{formatARS(r.gastado)}</span>
                </div>
                <ListaCompras registros={r.compras} />
              </>
            )}
            {detalle.tipo === 'ganancia' && (
              <>
                <div className="bg-gray-50 rounded-2xl p-3 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Facturado</span>
                    <span className="font-semibold">{formatARS(r.facturado)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Compras</span>
                    <span className="font-semibold">−{formatARS(r.gastado)}</span>
                  </div>
                  <div className="border-t border-gray-200 my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Ganancia</span>
                    <span className={`text-lg font-black ${colorGanancia(r.ganancia)}`}>{formatARS(r.ganancia)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Ventas ({r.ventas.length})</p>
                  <ListaVentas registros={r.ventas} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Compras ({r.compras.length})</p>
                  <ListaCompras registros={r.compras} />
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
