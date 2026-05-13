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

## Decisiones de UI / naming (importante)

- **"Recetas" se renombró a "Productos"** en la UI. El código interno (variables, claves de `localStorage`, nombres de archivo: `RecetasPage`, `RecetaDetail`, etc.) **sigue usando "receta"** para no romper datos guardados. Cuando edites código y tengas dudas, hablale al user de "Productos" pero internamente seguís usando `recetas`.
- **Margen fijo en 3x** (`MARGEN = 3` en `utils/calc.js`). Selector de UI eliminado.
- **Gastos indirectos 10%** (`GASTOS_INDIRECTOS = 0.10`), discriminado en el desglose.
- **Idioma**: español rioplatense (vos, "tocá", etc.).
- **Diseño**: mobile-first, paleta rosa del logo (`brand.50–600` en `tailwind.config.js`).
- **Logo**: `public/logo.jpg` (1080×1080). Circular 48px a la izquierda del título en headers de Productos e Insumos. Favicon y apple-touch-icon también.

## Modelo de datos

```js
// Insumo
{
  id: string,                    // crypto.randomUUID()
  nombre: string,
  unidad: 'kg' | 'g' | 'l' | 'ml' | 'u' | 'cdas' | 'cdtas' | 'taza' | 'atado',
  precioPorUnidad: number,       // ARS por unidad
  fechaActualizacion: string,    // ISO 'YYYY-MM-DD' — se setea automáticamente a hoy al guardar
  updatedAt: number,             // timestamp ms — para sort por reciente
}

// Receta (mostrada como "Producto" en UI)
{
  id: string,
  nombre: string,
  rinde: number,                 // cuántas unidades produce
  unidadRinde: string,           // 'unidades', 'porciones', etc.
  ingredientes: [{ insumoId: string, cantidad: number }],
  updatedAt: number,
  // Nota: el campo `margen` quedó en recetas viejas pero ya no se usa.
}
```

## Cálculo (utils/calc.js)

```
costoInsumos = sum(cantidad × precioPorUnidad)
gastosIndirectos = costoInsumos × 0.10        // GASTOS_INDIRECTOS = 0.10
costoTotal = costoInsumos × 1.10
costoPorUnidad = costoTotal / rinde
precioVenta = costoPorUnidad × MARGEN         // MARGEN = 3 (fijo)
```

## Reglas de UX importantes (NO romper)

- **Insumos: fecha auto-actualizada**. El campo `fechaActualizacion` se setea solo a `todayISO()` cada vez que se guarda un insumo (creación o edición de cualquier dato). NO existe un input editable para esto.
- **Insumos: precio calculado en vivo**. El input "Precio por X ($)" del formulario es un display **readonly**. Se calcula automáticamente desde "Total pagado" / "Cantidad". Si en edición no se cargan totales nuevos, mantiene el precio anterior.
- **Insumos: no se puede borrar uno en uso**. Si tocás el tachito y el insumo está usado en alguna receta, el modal lista las recetas y bloquea el borrado. Solo deja borrar huérfanos.
- **Actualizar precios: el OK final es manual**. Default: ningún ítem seleccionado. Después de tildar, el botón "Revisar y aplicar" abre un modal de confirmación con la lista de cambios. El user confirma explícitamente.
- **Regla "no bajar precio"**: si el precio scrapeado es menor o igual al actual del user, no se muestra como sugerencia. La regla está en el cliente, no en el script (`item.precio <= ins.precioPorUnidad → null`).
- **Equivalencia g↔ml**: para "Crema de leche" y "Miel", el scraper acepta indistintamente el peso en g o el volumen en ml, según `allowMlToG` / `allowGToMl` en las queries.
- **Aplicar masivo arriba**: al aplicar precios masivamente, cada insumo recibe un `updatedAt` único e incremental (`stamp + 1`, `stamp + 2`, ...). Esto garantiza que todos los actualizados queden juntos arriba en la lista. NO usar `Date.now()` plano dentro del map porque todos terminan iguales y el sort estable conserva el orden previo.
- **Sort de listas**: por `updatedAt` descendente. Se setea al crear, editar, **abrir** un detalle (Productos), y al aplicar precios (Insumos).
- **Migración de insumos huérfanos**: si una receta referencia un `insumoId` que no existe en `insumos` pero sí en `public/precarga.json`, la app restaura ese insumo con el id original al abrir. Flag: `vitucakes_restore_orphans_v1`. Esto recupera insumos borrados por accidente sin romper recetas.

## Estructura

```
vitucakes/
├── src/
│   ├── App.jsx                  # Routing por estado, precarga, migración huérfanos
│   ├── main.jsx
│   ├── index.css                # Tailwind + clases .input .label
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── utils/
│   │   ├── calc.js              # Cálculos y constantes
│   │   └── scrapeGranate.js     # Scrape client-side vía proxy CORS
│   ├── components/
│   │   ├── BottomNav.jsx        # Tab "Productos" (id sigue siendo 'recetas')
│   │   └── BottomSheet.jsx
│   └── pages/
│       ├── InsumosPage.jsx      # CRUD insumos + botón "Actualizar precios"
│       ├── RecetasPage.jsx      # CRUD productos (file name legacy)
│       ├── RecetaDetail.jsx     # Detalle de producto (file name legacy)
│       └── ActualizarPreciosPage.jsx  # Pantalla de sugerencias de precios
├── public/
│   ├── precarga.json            # 167 insumos + 139 recetas migrados del Excel
│   ├── precios_sugeridos.json   # Generado por el cron / script
│   └── logo.jpg
├── scripts/
│   └── update-prices.mjs        # Scraper para GitHub Actions (Node)
├── .github/workflows/
│   ├── deploy.yml               # Deploy a GH Pages en push a main
│   └── update-prices.yml        # Cron lunes 23h ART
├── 0. Costeo y Ventas VITUCA CAKES.xlsx   # Excel original
└── vite.config.js               # base: '/vitucakes/'
```

## Sistema de actualización de precios desde El Granate

Distribuidora El Granate (https://www.distribuidoraelgranate.com.ar/) es una tienda Tiendanube de Lanús Oeste con catálogo público de insumos de pastelería. La app tiene un sistema de match entre los insumos de Vitucakes y los productos de El Granate.

### Cron semanal
- Workflow: `.github/workflows/update-prices.yml`
- Cron: `0 2 * * 2` (Martes 02:00 UTC = Lunes 23:00 ART)
- Script: `scripts/update-prices.mjs` (Node 20, sin dependencias)
- Output: `public/precios_sugeridos.json` (committed automáticamente si cambia)
- También: `workflow_dispatch` para correrlo manualmente desde GitHub Actions

### Scrape manual desde el browser
- Módulo: `src/utils/scrapeGranate.js`
- Usa el proxy CORS público `https://corsproxy.io/?` para evitar restricciones same-origin
- Pool de 5 fetches en paralelo
- Trigger: botón "Actualizar precios manualmente" en la pantalla `ActualizarPreciosPage`
- Cache: el resultado se guarda en `localStorage` clave `vitucakes_precios_sugeridos_cache` y se prefiere al JSON del cron en próximas aperturas

### Match insumo ↔ producto

El array `QUERIES` (duplicado en `scripts/update-prices.mjs` y `src/utils/scrapeGranate.js` — **mantenerlos sincronizados**) tiene la regla por insumo:

```js
{
  nombre: 'Harina 000',           // nombre EXACTO del insumo en Vitucakes
  unidad: 'g',                    // unidad del insumo del user
  keywords: ['harina-000-'],      // substring que debe contener el slug de la URL del producto
  exclude: ['0000', 'almendras'], // substring que descarta candidatos
}
```

El matching:
1. Fetch del sitemap de El Granate
2. Filtra URLs de `/productos/`
3. Por cada query, busca URLs que matcheen al menos un keyword y no contengan exclude
4. Elige la URL con mejor `scoreUrl` (prefiere "por 1 kilo")
5. Extrae el peso del slug (`por-1-kilo`, `por-500-grs`, `por-2-litros`, etc.) — regex en `parseWeight`
6. Fetcha la página y extrae el precio (`"price_number":N` del JSON inline de Tiendanube)
7. Calcula precio por unidad

### Insumos cubiertos (~22)

Harina 000, Harina 0000, Harina de almendras, Harina leudante, Azúcar, Azúcar impalpable, Chocolate, Nuez, Caju, Levadura, Bicarbonato de sodio, Esencia de vainilla, Crema de leche (g≡ml), Leche condensada, Avena, Nutella, Mermelada Frambuesa, Miel (ml≡g), Extracto de malta, Pasta ballina, Pasta de goma, Mix frutos secos.

### Insumos sin match (todavía)

Azucar Negra, Cacao, Cacao alcalino, Fecula de Mandioca, Manteca, Margarina, Chips de chocolate, Coco rayado, Almedras, Polvo de hornear, Gelatina Sin Sabor, Dulce de leche, Cerezas, Frutas abrillantadas, Salvado de trigo, Saborizante, Colorante, Granas de color, Semillas de amapola, Pasas de uva.

Razones:
- Los slugs de algunas URLs no tienen peso parseable (ej. `/azucar-negra/`).
- Algunas páginas devuelven precio 0 o estructura distinta.
- Algunos productos no están en El Granate o tienen otro nombre.

Para agregar uno: editar `QUERIES` en **ambos** archivos (script .mjs y utils .js), correr `node scripts/update-prices.mjs` localmente para verificar, commit y push.

### Flujo del user

1. Tab **Insumos** → tocar pill rosa "Actualizar precios" en el header
2. La pantalla `ActualizarPreciosPage`:
   - Carga primero el cache local; si no hay, fetcha `public/precios_sugeridos.json`
   - Filtra sugerencias donde el insumo del user existe (match por nombre exacto)
   - Aplica regla "no bajar precio"
   - Lista con checkboxes, **default sin selección**
3. Tildá los que querés actualizar
4. Tocá "Revisar y aplicar (N)" → modal con lista de cambios → "Confirmar"
5. Los insumos quedan actualizados con `fechaActualizacion = hoy` y `updatedAt` incremental (todos juntos arriba en la lista)
6. Si querés precios al día sin esperar al lunes: botón "Actualizar precios manualmente" → scrape live desde el browser (~30s)

## Hecho

- CRUD completo de Productos e Insumos
- Buscador en ambas listas
- Calculadora de precio en form de Insumos (en vivo, no editable)
- Aviso ⚠️ en lista y detalle si una receta tiene un insumo borrado o con precio 0
- Desglose de costos con barras horizontales por ingrediente
- Hero card con precio de venta destacado
- Bottom sheet para forms (mobile-friendly)
- Auto-precarga desde `precarga.json` en primer uso (flag `vitucakes_precarga_done`)
- Restauración automática de insumos del precarga si las recetas los siguen referenciando (flag `vitucakes_restore_orphans_v1`)
- Sort por última interacción (`updatedAt`)
- Fecha de actualización auto al guardar insumo
- Deploy automático a GitHub Pages
- Logo, favicon, apple-touch-icon
- Sistema completo de actualización de precios desde El Granate (cron + manual)
- Bloqueo de borrado de insumos en uso
- Modal de confirmación antes de aplicar precios

## Pendiente / a terminar

1. La usuaria iba a mandar un PDF con recetas para revalidar la precarga (no llegó a mandarlo).
2. La usuaria quería un resumen en chat con costo + precio recomendado de cada receta (queda en el aire).
3. Posible: botón "Recargar precarga" dentro de la app.
4. Mejorar matches del scraper para los ~20 insumos que todavía no machean.
5. Posible: sumar una segunda distribuidora.
6. Posible: botón en cada sugerencia para abrir la página del producto en El Granate.

## Conversación previa relevante

- Logo del negocio: rolling pin + whisk en un trazo rosa salmón, texto "VITUCAKES — PASTELERIA 100% CASERA"
- Quería app móvil corriendo en GitHub Pages, uso personal
- Confirmó "200% de ganancia" = 3x sobre el costo total (incluyendo indirectos)
- Pidió que las listas se ordenen "por las que más entre, modifique, etc"
- Reportó "no veo modificada la version del github" — era cache del browser; el deploy estaba OK
- Pidió que el botón "Actualizar precios manualmente" haga todo solo, sin abrir GitHub (→ se hizo con proxy CORS)
- Quiso dar el OK final a la actualización masiva → modal de confirmación con default sin selección
- Borró "Almedras" sin querer → se agregó migración para restaurar huérfanos

## Si tenés que retomar

1. Cloná el repo (o si ya está local, `git pull`), `npm install`, `npm run dev`
2. Leé este doc completo
3. Mirá `src/App.jsx` para entender el flujo y las migraciones
4. Para deploy: cualquier push a `main` se publica solo en ~30s vía GitHub Actions
5. Para tocar el scraper: editar `QUERIES` en **ambos** archivos (script .mjs y utils .js), después `node scripts/update-prices.mjs` para verificar

## Último estado (2026-05-04)

- PRs mergeados durante esta sesión: #2, #3, #4, #5, #6, #7, #8, #9
- `main` con todo el sistema de precios + UX nueva
- Cuestiones de seguridad/precaución del workflow agente:
  - **No mergees PRs antes de pushear todos los commits** (problema repetido durante esta sesión: el user mergeaba y yo seguía pusheando, lo que dejaba commits huérfanos. Ahora siempre `git push && gh pr merge`)
- Sin tareas en curso
- Carpeta del proyecto: `/Users/patriciomartinvallerino/Documents/General/Personal/vitucakes`
- Worktree de esta sesión: `/Users/patriciomartinvallerino/Documents/General/Personal/vitucakes/.claude/worktrees/great-engelbart-8fda00` (branch `claude/great-engelbart-8fda00`)
