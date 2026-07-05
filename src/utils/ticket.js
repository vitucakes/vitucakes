// Parser del texto OCR de un ticket de compra: matchea los renglones contra
// los insumos del user y arma las líneas pre-cargadas de una compra
// (insumo + cantidad en su unidad + total pagado). Es una PRE-carga: el OCR de
// tickets es ruidoso, el user siempre revisa y corrige antes de guardar.
// Funciones puras (testeables en Node, sin browser).
//
// Endurecido con un barrido adversarial (2026-07-05): precios de miles sin
// centavos, descuentos/anulaciones en negativo, multiplicadores no adyacentes,
// stop-words ('de') y prefijos desbocados ('AZUCARADAS' → Azúcar).

// Normaliza para comparar: minúsculas, sin acentos, sin símbolos.
export const normTexto = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Número formato argentino: '1.234,56' → 1234.56, '949,00' → 949, '12.500'
// (miles SIN centavos, típico de mayoristas) → 12500, '1234.56' → 1234.56.
export function parseNumeroAR(str) {
  if (str == null) return NaN
  let s = String(str).replace(/[$\s]/g, '')
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    const puntos = (s.match(/\./g) || []).length
    if (puntos > 1) s = s.replace(/\./g, '')
    else if (puntos === 1 && /\.\d{3}$/.test(s)) s = s.replace('.', '') // punto de miles AR
  }
  return parseFloat(s)
}

// Último token con pinta de plata en el renglón (los ítems del ticket terminan
// en el precio). Acepta '1.234,56', '949,00', '$1500', '1234.56'.
export function extraerPrecio(linea) {
  const s = linea || ''
  const tokens = [...s.matchAll(/(?:\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d+\.\d{1,2})(?![\d,.]|\s*(?:kg|grs?|gr|g|ml|cc|lt?s?|un|u)\b)/gi)]
  if (tokens.length) {
    const valor = parseNumeroAR(tokens[tokens.length - 1][1])
    if (Number.isFinite(valor) && valor > 0) return valor
  }
  // Fallback: entero pelado pero con '$' adelante ('$1500' es plata segura).
  const conPeso = [...s.matchAll(/\$\s*(\d+(?:[.,]\d+)?)/g)]
  if (conPeso.length) {
    const valor = parseNumeroAR(conPeso[conPeso.length - 1][1])
    if (Number.isFinite(valor) && valor > 0) return valor
  }
  return null
}

// Monto negativo al final del renglón = descuento / promo / anulación.
// Esos renglones se descartan enteros (jamás son una compra).
export const esMontoNegativo = (linea) => /-\s*\$?\s*[\d.,]+\s*$/.test((linea || '').trim())

// Tamaño del producto en el renglón: '1kg', 'x 500 grs', '1,5 l', '900cc'...
// Devuelve { valor, unidad: 'kg'|'g'|'l'|'ml' } o null.
// OJO: acá NO se usa normTexto porque borra la coma decimal ('1,5 l' → '1 5 l').
export function parseTamano(linea) {
  const n = (linea || '').toLowerCase()
  const m = n.match(/(?:^|[\sx(])(\d+(?:[.,]\d+)?)\s*(kgs?|kilos?|grs?|gramos|g|lts?|litros?|l|ml|cc)(?=[\s.,)]|$)/)
  if (!m) return null
  const valor = parseNumeroAR(m[1])
  if (!Number.isFinite(valor) || valor <= 0) return null
  const u = m[2]
  const unidad = u.startsWith('k') ? 'kg' : u === 'g' || u.startsWith('gr') || u === 'gramos' ? 'g' : u === 'ml' || u === 'cc' ? 'ml' : 'l'
  return { valor, unidad }
}

// Cantidad en unidades tipo 'X12' ('HUEVOS BLANCOS X12') para insumos por 'u'.
export function parseCantidadUnidades(linea) {
  const m = (linea || '').toLowerCase().match(/(?:^|[\s.])x\s*(\d{1,3})(?=\s|$)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n > 0 ? n : null
}

// Convierte un tamaño parseado a la unidad del insumo. null si no es convertible.
export function convertirAUnidad(tamano, unidadInsumo) {
  if (!tamano) return null
  const { valor, unidad } = tamano
  const peso = { kg: { kg: 1, g: 1000 }, g: { kg: 0.001, g: 1 } }
  const vol = { l: { l: 1, ml: 1000 }, ml: { l: 0.001, ml: 1 } }
  const tabla = peso[unidad] || vol[unidad]
  const factor = tabla?.[unidadInsumo]
  return factor != null ? valor * factor : null
}

// Renglones que NO son productos (totales, pagos, promos, encabezados).
// Ojo con meter palabras que aparecen en productos reales: 'caja' (packaging)
// y 'desc' (descremada) estuvieron acá y se comían ítems verdaderos.
const RUIDO = /\b(total|subtotal|iva|efectivo|tarjeta|debito|credito|cambio|vuelto|cuit|c\.?u\.?i\.?t|descuento|ahorro|promo|promocion|oferta|anulad[oa]|anulacion|devolucion|ticket|factura|gracias|sucursal|fecha|hora|items?|art\.?|redondeo|propina|puntos|saldo|mercadopago|qr)\b/

export const esRuido = (linea) => RUIDO.test(normTexto(linea))

// Multiplicador tipo '2 x 617,28' (cantidad × precio unitario) o pesable
// '0,466 kg x 2.400,00/kg'. Devuelve { valor, unidad: 'kg'|'g'|null } o null.
// Sin normTexto (preserva la coma decimal).
export function parseMultiplicador(linea) {
  const m = (linea || '').toLowerCase().trim().match(/^(\d+(?:[.,]\d+)?)\s*(kgs?|kilos?|grs?|gramos|g)?\s*x\s*[\d.,$]/)
  if (!m) return null
  const valor = parseNumeroAR(m[1])
  if (!Number.isFinite(valor) || valor <= 0 || valor >= 1000) return null
  const u = m[2]
  const unidad = !u ? null : u.startsWith('k') ? 'kg' : 'g'
  return { valor, unidad }
}

// Palabras sin peso semántico: no cuentan para el score del match (si no,
// 'DULCE DE BATATA' matchea 'Dulce de leche' gracias al 'de').
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'en', 'al', 'para', 'por', 'y', 'un', 'una'])

// Mejor insumo para un renglón. Exige que el token más largo del nombre del
// insumo esté en el renglón y que matcheen todos-o-casi los tokens (sin
// stop-words). Prefijos: la palabra del ticket puede ser una abreviatura del
// token ('MANT' → manteca, largo libre) o el token con poquito de más
// ('HUEVOS' → huevo, hasta 2 chars extra — así 'AZUCARADAS' NO matchea azúcar).
export function matchInsumo(linea, insumos) {
  const palabras = normTexto(linea).split(' ').filter((t) => t.length >= 2)
  if (!palabras.length) return null
  const coincide = (w, t) =>
    w === t ||
    (w.length >= 4 && t.length >= 4 && ((w.startsWith(t) && w.length - t.length <= 2) || t.startsWith(w)))
  let best = null
  for (const ins of insumos || []) {
    const tokens = normTexto(ins.nombre).split(' ').filter((t) => t.length >= 2 && !STOPWORDS.has(t))
    if (!tokens.length) continue
    const hits = tokens.filter((t) => palabras.some((w) => coincide(w, t))).length
    const score = hits / tokens.length
    const principal = tokens.reduce((a, b) => (b.length > a.length ? b : a))
    if (score < 0.6 || !palabras.some((w) => coincide(w, principal))) continue
    // Prefiere mayor score; empate → el nombre con MÁS tokens matcheados
    // (más específico: 'Chips de chocolate' le gana a 'Chocolate').
    if (!best || score > best.score || (score === best.score && hits > best.hits)) {
      best = { insumo: ins, score, hits }
    }
  }
  return best?.insumo ?? null
}

// Parser principal: texto OCR completo → líneas de compra pre-cargadas.
// Devuelve { lineas: [{ insumoId, cantidad, total }], noReconocidos: [string] }
// (cantidad y total como string, listos para el form; '' = que lo complete el user).
export function parsearTicket(texto, insumos) {
  const renglones = (texto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 3)

  const items = [] // { insumo, cantidad: number|null, total: number|null, multiplicado }
  const noReconocidos = []
  // Un multiplicador "cantidad primero" (COTO) vale SOLO para el renglón
  // siguiente; y uno "cantidad después" solo aplica si el renglón anterior fue
  // un ítem matcheado — si no, el peso de una banana ajena corrompe al insumo
  // de más arriba.
  let multiplicadorPendiente = null
  let prevAdyacente = false

  for (const renglon of renglones) {
    if (esRuido(renglon) || esMontoNegativo(renglon)) {
      multiplicadorPendiente = null
      prevAdyacente = false
      continue
    }

    const mult = parseMultiplicador(renglon)
    if (mult) {
      const prev = items[items.length - 1]
      if (prevAdyacente && prev && !prev.multiplicado) {
        if (mult.unidad) {
          // Pesable ('0,466 kg x ...'): es el peso del ítem, no un factor.
          const conv = convertirAUnidad({ valor: mult.valor, unidad: mult.unidad }, prev.insumo.unidad)
          if (conv != null) prev.cantidad = conv
        } else if (prev.cantidad != null) {
          prev.cantidad *= mult.valor
        } else if (prev.insumo.unidad === 'u') {
          prev.cantidad = mult.valor
        }
        // El renglón puede traer solo el precio UNITARIO: no pisar un total
        // que ya vino impreso en el renglón del ítem.
        const precio = extraerPrecio(renglon)
        if (precio != null && prev.total == null) prev.total = precio
        prev.multiplicado = true
      } else if (!mult.unidad && Number.isInteger(mult.valor)) {
        multiplicadorPendiente = mult.valor
      }
      prevAdyacente = false
      continue
    }

    const insumo = matchInsumo(renglon, insumos)
    if (!insumo) {
      multiplicadorPendiente = null
      prevAdyacente = false
      // Solo reportamos como "no reconocido" lo que parece un producto
      // (tiene precio al final), no cualquier basura del OCR.
      if (extraerPrecio(renglon) != null && normTexto(renglon).replace(/[\d\s]/g, '').length >= 4) {
        noReconocidos.push(renglon)
      }
      continue
    }

    const total = extraerPrecio(renglon)
    const tamano = parseTamano(renglon)
    let cantidad = convertirAUnidad(tamano, insumo.unidad)
    if (cantidad == null && insumo.unidad === 'u') cantidad = parseCantidadUnidades(renglon) ?? 1
    if (multiplicadorPendiente != null) {
      if (cantidad != null) cantidad *= multiplicadorPendiente
      multiplicadorPendiente = null
    }
    items.push({ insumo, cantidad, total, multiplicado: false })
    prevAdyacente = true
  }

  // Merge de duplicados (mismo insumo en dos renglones): suma cantidades y totales.
  const porInsumo = new Map()
  for (const it of items) {
    const prev = porInsumo.get(it.insumo.id)
    if (!prev) porInsumo.set(it.insumo.id, it)
    else {
      if (prev.cantidad != null && it.cantidad != null) prev.cantidad += it.cantidad
      else prev.cantidad = prev.cantidad ?? it.cantidad
      if (prev.total != null && it.total != null) prev.total += it.total
      else prev.total = prev.total ?? it.total
    }
  }

  const lineas = [...porInsumo.values()].map((it) => ({
    insumoId: it.insumo.id,
    cantidad: it.cantidad != null ? String(Math.round(it.cantidad * 1000) / 1000) : '',
    total: it.total != null ? String(Math.round(it.total * 100) / 100) : '',
  }))

  return { lineas, noReconocidos }
}
