# Vitucakes — Handoff

App de costeo y precios de venta para una pastelería casera (uso personal de Vitu).

## Resumen rápido

- **Repo**: https://github.com/patriciovallerino/vitucakes
- **Live**: https://patriciovallerino.github.io/vitucakes/
- **Stack**: React 18 + Vite + Tailwind CSS, sin backend
- **Storage**: `localStorage` (claves `vitucakes_insumos`, `vitucakes_recetas`)
- **Deploy**: GitHub Actions → GitHub Pages (auto en push a `main`)
- **Cuenta GitHub conectada**: `patriciovallerino` (la usuaria también tiene `patriciovallerino-maker` pero no se llegó a switchear con `gh`)

## Cómo levantar

```bash
git clone https://github.com/patriciovallerino/vitucakes
cd vitucakes
npm install
npm run dev
```

Abre en `http://localhost:5173/vitucakes/`.

## Modelo de datos

```js
// Insumo
{
  id: string,                    // crypto.randomUUID()
  nombre: string,
  unidad: 'kg' | 'g' | 'l' | 'ml' | 'u' | 'cdas' | 'cdtas' | 'taza' | 'atado',
  precioPorUnidad: number,       // ARS por unidad
  fechaActualizacion: string,    // ISO 'YYYY-MM-DD' — cuándo se actualizó el precio
  updatedAt: number,             // timestamp ms — para sort por reciente
}

// Receta
{
  id: string,
  nombre: string,
  rinde: number,                 // cuántas unidades produce
  unidadRinde: string,           // 'unidades', 'porciones', etc.
  margen: number,                // multiplicador (3 = 200% ganancia)
  ingredientes: [{ insumoId: string, cantidad: number }],
  updatedAt: number,
}
```

## Cálculo (utils/calc.js)

```
costoInsumos = sum(cantidad × precioPorUnidad)
gastosIndirectos = costoInsumos × 0.10        // 10% fijo
costoTotal = costoInsumos × 1.10
costoPorUnidad = costoTotal / rinde
precioVenta = costoPorUnidad × margen         // margen siempre 3x
```

## Preferencias de la usuaria (importantes — respetar)

- **Margen fijo en 3x** (200% de ganancia). Pidió sacar el selector. **Tarea a medio terminar**: agregué `MARGEN = 3` en `calc.js` pero **NO** removí los selectores UI en `RecetasPage.jsx` (form de receta) ni `RecetaDetail.jsx`. Hay que terminarlo: eliminar el bloque "Ajustar margen", usar `MARGEN` constante para todos los cálculos, y borrar `margen` del modelo de receta o ignorarlo.
- **Gastos indirectos 10%** discriminados en el desglose de costos (ya implementado).
- **Orden de listas**: por `updatedAt` descendente (las más recientes arriba). Se setea al crear, editar o **abrir** un detalle.
- **Idioma**: español rioplatense (vos, "tocá", etc.).
- **Diseño**: mobile-first, paleta rosa del logo (no se llegó a recibir hex codes, está usando aprox del logo). Colores en `tailwind.config.js` bajo `brand.50–600`.

## Estructura

```
vitucakes/
├── src/
│   ├── App.jsx              # Routing por estado (no react-router)
│   ├── main.jsx
│   ├── index.css            # Tailwind + clases .input .label
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── utils/
│   │   └── calc.js          # Cálculos y constantes
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   └── BottomSheet.jsx
│   └── pages/
│       ├── InsumosPage.jsx
│       ├── RecetasPage.jsx
│       └── RecetaDetail.jsx
├── public/
│   └── precarga.json        # 169 insumos + 139 recetas migrados del Excel
├── .github/workflows/deploy.yml
├── 0. Costeo y Ventas VITUCA CAKES.xlsx   # Excel original (fuente de la precarga)
└── vite.config.js           # base: '/vitucakes/'
```

## Precarga inicial

`public/precarga.json` contiene 169 insumos y 139 recetas migrados del Excel original `0. Costeo y Ventas VITUCA CAKES.xlsx` (sheets `Insumos` y `Recetas`). Se carga automáticamente la primera vez que se abre la app si `localStorage` está vacío. Flag: `vitucakes_precarga_done`.

Para regenerarla, hay que parsear el Excel con pandas (ver el último script de Python en el chat anterior — usa `pd.read_excel` con `sheet_name='Insumos'/'Recetas'`).

Mapeo de unidades del Excel a la app:
- `Grs` → `g`
- `Cm3` → `ml`
- `Unidad` → `u`

Para extraer el `rinde`, regex sobre el nombre de la receta: `x N unidades`, `x N`, `DOCENA` → 12. Default = 1 unidad.

## Hecho

- CRUD completo de insumos y recetas
- Buscador en ambas listas
- Calculadora de precio (total ÷ cantidad) en el form de insumos
- Aviso ⚠️ en lista y detalle si una receta tiene un insumo borrado o con precio 0
- Desglose de costos con barras horizontales por ingrediente
- Hero card con precio de venta destacado
- Bottom sheet para forms (mobile-friendly)
- Auto-precarga desde `precarga.json` en primer uso
- Sort por última interacción (`updatedAt`)
- Fecha de actualización por insumo (manual o auto al cambiar precio)
- Deploy automático a GitHub Pages

## Pendiente / a terminar

1. **Quitar UI de margen** (la usuaria pidió esto último — ver "Preferencias")
2. La usuaria iba a mandar un PDF con recetas para revalidar la precarga (no llegó a mandarlo)
3. La usuaria quería un resumen en chat con costo + precio recomendado de cada receta (queda en el aire)
4. Posible: botón "Recargar precarga" dentro de la app (lo ofrecí pero no lo implementé)
5. Posible: usuaria mencionó tener `patriciovallerino-maker` como cuenta de GitHub pero el `gh` quedó autenticado con `patriciovallerino`

## Conversación previa relevante

- Logo del negocio: rolling pin + whisk en un trazo rosa salmón, texto "VITUCAKES — PASTELERIA 100% CASERA"
- Quería app móvil corriendo en GitHub Pages, uso personal
- Confirmó "200% de ganancia" = 3x sobre el costo total (incluyendo indirectos)
- Pidió que las recetas/insumos se ordenen "por las que más entre, modifique, etc"
- Reportó "no veo modificada la version del github" — era cache del browser; el deploy estaba OK

## Si tenés que retomar

1. Cloná el repo, `npm install`, `npm run dev`
2. Lee este doc + scrolleá `src/App.jsx` para entender el flujo
3. La tarea más fresca pendiente es quitar el selector de margen
4. Para deploy: cualquier push a `main` se publica solo en ~30s vía GitHub Actions
