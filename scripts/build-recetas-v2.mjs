// Genera public/recetas_v2.json con:
// - Insumos nuevos (Sal, Mascarpone, Albúmina, Canela, Pan rallado)
// - Cambios a 5 recetas existentes
// - 17 recetas nuevas
//
// El JSON se aplica una vez en el cliente con un flag de migración.

import fs from 'node:fs'

const data = JSON.parse(fs.readFileSync('public/precarga.json', 'utf8'))
const byName = {}
for (const i of data.insumos) byName[i.nombre.toLowerCase()] = i.id

const id = (n) => {
  const r = byName[n.toLowerCase()]
  if (!r) throw new Error(`Insumo no encontrado: ${n}`)
  return r
}

// Insumos nuevos con IDs predecibles
const insumosNuevos = [
  { id: 'v2-sal', nombre: 'Sal', unidad: 'g', precioPorUnidad: 1, fechaActualizacion: '2026-05-04' },
  { id: 'v2-mascarpone', nombre: 'Queso Mascarpone', unidad: 'g', precioPorUnidad: 15, fechaActualizacion: '2026-05-04' },
  { id: 'v2-albumina', nombre: 'Albúmina', unidad: 'g', precioPorUnidad: 50, fechaActualizacion: '2026-05-04' },
  { id: 'v2-canela', nombre: 'Canela', unidad: 'g', precioPorUnidad: 40, fechaActualizacion: '2026-05-04' },
  { id: 'v2-pan-rallado', nombre: 'Pan rallado', unidad: 'g', precioPorUnidad: 2, fechaActualizacion: '2026-05-04' },
]

const SAL = 'v2-sal'
const MASCARPONE = 'v2-mascarpone'
const ALBUMINA = 'v2-albumina'
const CANELA = 'v2-canela'
const PAN_RALLADO = 'v2-pan-rallado'

// Cambios a recetas existentes (matchean por nombre exacto)
const cambiosRecetas = [
  {
    nombre: 'Pastafrola',
    agregar: [{ insumoId: id('Coco rayado'), cantidad: 50 }],
  },
  {
    nombre: 'Chipa 1/2 kg',
    agregar: [{ insumoId: SAL, cantidad: 10 }],
  },
  {
    nombre: 'Figacitas de manteca 36 unidades',
    agregar: [{ insumoId: SAL, cantidad: 20 }],
  },
  {
    nombre: 'Pan de Molde de Salvado',
    reemplazar: [
      { insumoId: id('Harina 000'), cantidad: 250 },
      { insumoId: id('Salvado de trigo'), cantidad: 50 },
      { insumoId: SAL, cantidad: 5 },
      { insumoId: id('Azucar Negra'), cantidad: 20 },
      { insumoId: id('Extracto de malta'), cantidad: 10 },
      { insumoId: id('Levadura'), cantidad: 15 },
      { insumoId: id('Manteca'), cantidad: 5 },
      { insumoId: id('Avena'), cantidad: 15 },
      { insumoId: id('Semillas de amapola'), cantidad: 20 },
    ],
  },
  {
    nombre: 'Macarrons x 12 unidades',
    // x48 / 4 según pidió el user
    reemplazar: [
      { insumoId: id('Azúcar'), cantidad: 57.5 },
      { insumoId: id('Harina de almendras'), cantidad: 31.25 },
      { insumoId: id('Huevo'), cantidad: 1 },
      { insumoId: id('Azúcar impalpable'), cantidad: 31.25 },
      { insumoId: id('Colorante'), cantidad: 0.28 },
      { insumoId: id('Saborizante'), cantidad: 2.5 },
      { insumoId: id('Crema de leche'), cantidad: 5 },
      { insumoId: id('Chocolate'), cantidad: 15 },
      { insumoId: id('Mangas descartables N°4'), cantidad: 2 },
      { insumoId: id('Caja macarrons x12'), cantidad: 1 },
    ],
  },
]

// Recetas nuevas (IDs predecibles v2-*)
const recetasNuevas = [
  {
    id: 'v2-masa-sablee',
    nombre: 'Masa Sablée',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Harina 0000'), cantidad: 300 },
      { insumoId: id('Manteca'), cantidad: 180 },
      { insumoId: id('Huevo'), cantidad: 2 },
      { insumoId: id('Azúcar impalpable'), cantidad: 120 },
      { insumoId: SAL, cantidad: 1 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
    ],
  },
  {
    id: 'v2-masa-frolla',
    nombre: 'Masa Frolla',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Harina 0000'), cantidad: 150 },
      { insumoId: id('Maicena'), cantidad: 50 },
      { insumoId: id('Manteca'), cantidad: 100 },
      { insumoId: id('Azúcar'), cantidad: 60 },
      { insumoId: id('Huevo'), cantidad: 1 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Limón'), cantidad: 0.5 },
      { insumoId: id('Polvo de hornear'), cantidad: 2.5 },
    ],
  },
  {
    id: 'v2-tiramisu',
    nombre: 'Tiramisú',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Huevo'), cantidad: 6 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Azúcar'), cantidad: 340 },
      { insumoId: id('Cacao'), cantidad: 40 },
      { insumoId: id('Harina 0000'), cantidad: 100 },
      { insumoId: id('Gelatina Sin Sabor'), cantidad: 17 },
      { insumoId: MASCARPONE, cantidad: 250 },
      { insumoId: id('Crema de leche'), cantidad: 200 },
      { insumoId: id('Café Instantaneo'), cantidad: 3 },
    ],
  },
  {
    id: 'v2-scones',
    nombre: 'Scones',
    rinde: 12,
    unidadRinde: 'unidades',
    ingredientes: [
      { insumoId: id('Manteca'), cantidad: 80 },
      { insumoId: id('Harina 0000'), cantidad: 400 },
      { insumoId: id('Azúcar'), cantidad: 80 },
      { insumoId: id('Polvo de hornear'), cantidad: 10 },
      { insumoId: id('Crema de leche'), cantidad: 120 },
      { insumoId: id('Huevo'), cantidad: 1 },
      { insumoId: SAL, cantidad: 1 },
      { insumoId: id('Pasas de uva'), cantidad: 50 },
      { insumoId: id('Limón'), cantidad: 1 },
    ],
  },
  {
    id: 'v2-apple-streusel',
    nombre: 'Apple Streusel Pie',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Harina 0000'), cantidad: 350 },
      { insumoId: id('Manteca'), cantidad: 200 },
      { insumoId: id('Azúcar'), cantidad: 220 },
      { insumoId: id('Huevo'), cantidad: 1 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Limón'), cantidad: 0.5 },
      // "Manzana Verde" existe como insumo (precio por g) — uso ~600g (3 manzanas grandes)
      { insumoId: id('Manzana Verde'), cantidad: 600 },
      { insumoId: id('Pasas de uva'), cantidad: 45 },
      { insumoId: id('Nuez'), cantidad: 30 },
      { insumoId: PAN_RALLADO, cantidad: 30 },
      { insumoId: CANELA, cantidad: 3 },
    ],
  },
  {
    id: 'v2-pionono',
    nombre: 'Pionono',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Huevo'), cantidad: 4 },
      { insumoId: id('Azúcar'), cantidad: 80 },
      { insumoId: id('Harina 0000'), cantidad: 80 },
      { insumoId: id('Miel'), cantidad: 15 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
    ],
  },
  {
    id: 'v2-arrollado-ddl',
    nombre: 'Arrollado de Dulce de Leche',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Huevo'), cantidad: 4 },
      { insumoId: id('Azúcar'), cantidad: 80 },
      { insumoId: id('Harina 0000'), cantidad: 80 },
      { insumoId: id('Miel'), cantidad: 15 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Dulce de leche'), cantidad: 300 },
      { insumoId: id('Cerezas'), cantidad: 10 },
    ],
  },
  {
    id: 'v2-trufa-chocolate',
    nombre: 'Trufa de Chocolate',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Huevo'), cantidad: 3 },
      { insumoId: id('Azúcar'), cantidad: 90 },
      { insumoId: id('Harina 0000'), cantidad: 90 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Dulce de leche'), cantidad: 250 },
      { insumoId: id('Manteca'), cantidad: 25 },
      { insumoId: id('Crema de leche'), cantidad: 150 },
      { insumoId: id('Chocolate'), cantidad: 150 },
      { insumoId: id('Coco rayado'), cantidad: 80 },
    ],
  },
  {
    id: 'v2-pan-viena',
    nombre: 'Pan de Viena (Pancho/Hamburguesa/Pebete)',
    rinde: 25,
    unidadRinde: 'unidades',
    ingredientes: [
      { insumoId: id('Harina 0000'), cantidad: 1000 },
      { insumoId: id('Levadura'), cantidad: 50 },
      { insumoId: SAL, cantidad: 10 },
      { insumoId: id('Azúcar'), cantidad: 150 },
      { insumoId: id('Manteca'), cantidad: 100 },
      // Receta original lleva 250 agua + 250 leche; uso 250 leche (el agua es despreciable)
      { insumoId: id('Leche'), cantidad: 250 },
    ],
  },
  {
    id: 'v2-mini-alfajor-nuez',
    nombre: 'Mini Alfajores de Nuez',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Huevo'), cantidad: 1 },
      { insumoId: id('Azúcar'), cantidad: 75 },
      { insumoId: id('Manteca'), cantidad: 75 },
      { insumoId: id('Harina 0000'), cantidad: 75 },
      { insumoId: id('Nuez'), cantidad: 75 },
      { insumoId: id('Dulce de leche'), cantidad: 150 },
    ],
  },
  {
    id: 'v2-cuadraditos-coco',
    nombre: 'Cuadraditos de Coco',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Harina 0000'), cantidad: 200 },
      { insumoId: id('Manteca'), cantidad: 120 },
      { insumoId: id('Azúcar impalpable'), cantidad: 80 },
      { insumoId: id('Cacao'), cantidad: 15 },
      { insumoId: id('Huevo'), cantidad: 2 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Dulce de leche'), cantidad: 200 },
      { insumoId: id('Coco rayado'), cantidad: 200 },
      { insumoId: id('Azúcar'), cantidad: 100 },
      { insumoId: id('Miel'), cantidad: 15 },
    ],
  },
  {
    id: 'v2-tarteleta-choco-ganache-blanco',
    nombre: 'Tarteleta de Chocolate y Ganache Blanco',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Harina 0000'), cantidad: 200 },
      { insumoId: id('Manteca'), cantidad: 120 },
      { insumoId: id('Azúcar impalpable'), cantidad: 80 },
      { insumoId: id('Huevo'), cantidad: 2 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Chocolate'), cantidad: 60 },
      { insumoId: id('Crema de leche'), cantidad: 80 },
      { insumoId: id('Frutilla'), cantidad: 8 },
    ],
  },
  {
    id: 'v2-budin-marmolado',
    nombre: 'Budín Marmolado',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Manteca'), cantidad: 100 },
      { insumoId: id('Azúcar'), cantidad: 100 },
      { insumoId: id('Huevo'), cantidad: 2 },
      { insumoId: id('Harina 0000'), cantidad: 120 },
      { insumoId: id('Polvo de hornear'), cantidad: 5 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('Cacao'), cantidad: 10 },
    ],
  },
  {
    id: 'v2-budin-ingles',
    nombre: 'Budín Inglés (Cuatro Cuartos)',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Manteca'), cantidad: 100 },
      { insumoId: id('Azúcar'), cantidad: 100 },
      { insumoId: id('Huevo'), cantidad: 2 },
      { insumoId: id('Harina 0000'), cantidad: 100 },
      { insumoId: id('Polvo de hornear'), cantidad: 5 },
      { insumoId: id('Frutas abrillantadas'), cantidad: 80 },
      { insumoId: id('Mix frutos secos'), cantidad: 80 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
    ],
  },
  {
    id: 'v2-galleta-pizpireta',
    nombre: 'Galleta Pizpireta',
    rinde: 25,
    unidadRinde: 'unidades',
    ingredientes: [
      { insumoId: id('Manteca'), cantidad: 250 },
      { insumoId: id('Azúcar impalpable'), cantidad: 400 },
      { insumoId: id('Huevo'), cantidad: 1 },
      { insumoId: id('Esencia de vainilla'), cantidad: 10 },
      { insumoId: SAL, cantidad: 1 },
      { insumoId: id('Harina 0000'), cantidad: 450 },
      { insumoId: ALBUMINA, cantidad: 9 },
    ],
  },
  {
    id: 'v2-cheesecake-frutos-rojos',
    nombre: 'Cheesecake con Frutos Rojos',
    rinde: 1,
    unidadRinde: 'unidad',
    ingredientes: [
      { insumoId: id('Galletitas lincoln'), cantidad: 200 },
      { insumoId: id('Manteca'), cantidad: 80 },
      { insumoId: id('Queso Crema'), cantidad: 750 },
      { insumoId: id('Azúcar'), cantidad: 240 },
      { insumoId: id('Crema de leche'), cantidad: 180 },
      { insumoId: id('Huevo'), cantidad: 3 },
      { insumoId: id('Maicena'), cantidad: 30 },
      { insumoId: id('Limón'), cantidad: 1 },
      { insumoId: id('Esencia de vainilla'), cantidad: 5 },
      { insumoId: id('frutos rojos congelados'), cantidad: 200 },
    ],
  },
  {
    id: 'v2-panes-salvado',
    nombre: 'Panes de Salvado',
    rinde: 10,
    unidadRinde: 'unidades',
    ingredientes: [
      { insumoId: id('Harina 000'), cantidad: 500 },
      { insumoId: id('Salvado de trigo'), cantidad: 50 },
      { insumoId: SAL, cantidad: 10 },
      { insumoId: id('Azucar Negra'), cantidad: 10 },
      { insumoId: id('Levadura'), cantidad: 40 },
      { insumoId: id('Manteca'), cantidad: 30 },
      { insumoId: id('Extracto de malta'), cantidad: 20 },
    ],
  },
]

// Setear updatedAt para todas las recetas nuevas con stamps únicos
let stamp = Date.now()
for (const r of recetasNuevas) r.updatedAt = stamp++

const out = {
  version: 2,
  insumosNuevos,
  cambiosRecetas,
  recetasNuevas,
}

fs.writeFileSync('public/recetas_v2.json', JSON.stringify(out, null, 2))
console.log(`Generado public/recetas_v2.json`)
console.log(`- ${insumosNuevos.length} insumos nuevos`)
console.log(`- ${cambiosRecetas.length} recetas con cambios`)
console.log(`- ${recetasNuevas.length} recetas nuevas`)
