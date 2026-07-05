// Control de gestión: agregación por mes de lo facturado (ventas) y lo
// gastado (compras), y la ganancia resultante. Funciones puras sobre los
// arrays compartidos, para poder testearlas y reusarlas.

// 'YYYY-MM' de una fecha ISO 'YYYY-MM-DD'.
export const mesKey = (fechaISO) => (fechaISO || '').slice(0, 7)

// Mes anterior / siguiente de una key 'YYYY-MM'.
export function mesAnterior(key) {
  const [y, m] = key.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export function mesSiguiente(key) {
  const [y, m] = key.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// 'julio 2026' (en minúscula; capitalizar con CSS si hace falta).
export function nombreMes(key) {
  const [y, m] = (key || '').split('-').map(Number)
  return `${MESES[m - 1] ?? '?'} ${y || ''}`.trim()
}

// Resumen de un mes: los registros de ventas y compras de ese mes (por su
// campo `fecha`), los totales y la ganancia (facturado − gastado). Los
// registros van ordenados por fecha descendente para mostrarlos en el detalle.
export function resumenMes(ventas, compras, key) {
  const porFechaDesc = (a, b) =>
    (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt ?? 0) - (a.createdAt ?? 0)
  const ventasMes = (ventas || []).filter((v) => mesKey(v.fecha) === key).sort(porFechaDesc)
  const comprasMes = (compras || []).filter((c) => mesKey(c.fecha) === key).sort(porFechaDesc)
  const facturado = ventasMes.reduce((s, v) => s + (Number(v.total) || 0), 0)
  const gastado = comprasMes.reduce((s, c) => s + (Number(c.total) || 0), 0)
  return { key, ventas: ventasMes, compras: comprasMes, facturado, gastado, ganancia: facturado - gastado }
}
