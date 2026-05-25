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

## Sistema de competencia (PR #15 y #16)

Vitucakes muestra precios de referencia de pastelerías competidoras al lado del propio.

### Cron semanal de competencia
- Workflow: `.github/workflows/update-competencia.yml`
- Cron: lunes 23:30 ART (30 min después del de precios, para no pisarse)
- Script: `scripts/update-competencia.mjs` (Node 20, sin deps)
- Output: `public/competencia.json`
- Array `COMPETIDORAS` en el script lista las "oficiales" (committeadas al repo). Hoy: solo **Candelitte** (`https://candelitte.mitiendanube.com`).

### Modelo de datos competencia
```js
// public/competencia.json
{
  generadoEn: ISO,
  competidoras: [{
    id, nombre, fuente,
    productos: [{ slug, nombre, descripcion, precio, url }],
    errores: [...],
    updatedAt: ISO,
  }]
}

// localStorage: vitucakes_competidoras_user
// Mismo formato, pero son las que el user agregó desde la app.
// Se mergean con las oficiales via mergeCompetidoras() en utils/competencia.js.
// Si hay colisión por id, gana la oficial.

// En cada receta:
{
  ...,
  matchesCompetencia: [{ competidoraId, productoSlug }],
  rechazadosCompetencia: [{ competidoraId, productoSlug }],
}
```

### UX del matching
1. En **Productos** aparece el pill **🤔** cuando hay competidoras cargadas (con número si hay matches pendientes).
2. **ResolverMatchesPage** lista las recetas sin match agrupadas en "con sugerencia automática" (Sí / No / Elegir otro) y "sin sugerencia" (Elegir manualmente).
3. **Match automático** (score Jaccard + Levenshtein, threshold 25%): se calcula en `proponerSugerencia()` (utils/competencia.js).
4. **Match manual**: `MatchManualSheet` con buscador (filtra por nombre + descripción). Resuelve casos como "Lemon pie" ↔ "Alimonada" donde los nombres no coinciden pero la descripción menciona limón.
5. **Resolver Page tiene un botón "+ Competidora"** que lleva a `AgregarCompetidoraPage`. El user pega URL de un Tiendanube → `scrapeTiendanube` en vivo (proxy CORS, mismo patrón que `scrapeGranate`) → muestra productos → guarda en `vitucakes_competidoras_user`.
6. **Sumar competidora user al cron oficial**: la app abre un GitHub Issue prefilled (botón "Pedir sumarla al cron semanal"). El admin lo ve, agrega al array `COMPETIDORAS` de `update-competencia.mjs`, mergea PR, queda automática.

### Promesa: "no preguntar lo que ya validé"
Una vez confirmado un match, `recetasParaResolver()` excluye esa receta. La próxima corrida del cron actualiza el precio pero NO vuelve a preguntar. Solo se vuelve a preguntar si el slug del producto cambió en la competencia (raro).

### Reglas a no romper en competencia
- `mergeCompetidoras()` es la única fuente para la lista combinada — no leer `competencia.competidoras` directo en pantallas, pasar la mergeada.
- Los IDs de competidoras user se generan de `idFromHost(sitemapUrl)` (en `AgregarCompetidoraPage.jsx`) — si dos users agregan la misma URL, el id colisiona y se trata como la misma.
- El scraper devuelve productos cuyo slug coincide con `/productos/<slug>/` — para soportar Empretienda (Silnari) habría que extender el regex.

## Backup de datos del user

**Crítico**: los datos del user (insumos, recetas, matches, competidoras user) viven en `localStorage` del browser, NO en la carpeta. La pantalla **BackupPage** (botón 💾 en el header de Productos) permite:
- **Descargar backup**: JSON con todos los keys relevantes + flags de migración.
- **Restaurar backup**: sube JSON y reemplaza el localStorage actual.
- **Reset**: borra todo y vuelve a precarga inicial.

Las claves de localStorage que se respaldan están en `BACKUP_KEYS` en `src/pages/BackupPage.jsx`. Si agregás un nuevo dato del user en localStorage, **sumalo a esa lista** y bumpeá `APP_VERSION`.

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
- Migración v2 con insumos + recetas nuevas (flag `vitucakes_recetas_v2_done`)
- Sort por última interacción (`updatedAt`)
- Fecha de actualización auto al guardar insumo
- Deploy automático a GitHub Pages
- Logo, favicon, apple-touch-icon
- Sistema completo de actualización de precios desde El Granate (cron + manual)
- Bloqueo de borrado de insumos en uso
- Modal de confirmación antes de aplicar precios
- **Sistema de competencia con match interactivo** (sugerencia automática + match manual + comparador) — PR #15
- **Agregar competidoras desde la app** con scrape en vivo + flujo de sumarlas al cron oficial via Issue — PR #16
- **Backup de datos** (export/import JSON + reset) — para sobrevivir cambio de celu / wipe de Safari

## Pendiente / a terminar

1. **Extender scraper para Empretienda** (Silnari, `https://www.silnari.com/tortas-y-tartas`). El actual solo soporta Tiendanube. Las URLs de Silnari son `/tortas-y-tartas/<slug>` (no `/productos/<slug>/`) y el HTML probablemente tiene los precios en otro formato (no `price_number` JSON inline).
2. **Sumar Nati's Pastelería al cron** (`https://www.natispasteleria.com.ar`). Es Tiendanube, ~130 productos. Patricio iba a agregarla desde la app y abrir el Issue. Cuando aparezca, sumarla al array `COMPETIDORAS` de `update-competencia.mjs`. Conviene agregar `excludeSlugs` para descartar desayunos/panes/packs.
3. Resto del cron de El Granate: ~20 insumos siguen sin match (ver lista en `update-prices.mjs`).
4. La usuaria iba a mandar un PDF con recetas para revalidar la precarga (no llegó a mandarlo).
5. PWA + Vercel: PR #14 quedó **cerrado sin mergear**. Si en el futuro queremos instalable en iOS / URL más linda, retomar de cero (no la rama, está borrada).

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
2. Leé este doc completo + el README.md
3. Mirá `src/App.jsx` para entender el flujo y las migraciones
4. Para deploy: cualquier push a `main` se publica solo en ~30s vía GitHub Actions
5. Para tocar el scraper de El Granate: editar `QUERIES` en **ambos** archivos (script `update-prices.mjs` y utils `scrapeGranate.js`), después `node scripts/update-prices.mjs` para verificar
6. Para agregar una competidora oficial al cron: agregar entrada al array `COMPETIDORAS` en `scripts/update-competencia.mjs`, correr `node scripts/update-competencia.mjs` localmente para verificar
7. **Node 20+ obligatorio** (con 18 falla por un tema de `crypto` global en dep transitiva)

## Cómo levantar sin GitHub ni Claude (solo con esta carpeta)

**Guía completa, paso a paso, asumiendo cero conocimiento**: [RECONSTRUIR.md](./RECONSTRUIR.md).

Resumen:
- Local: `bash arrancar.sh` (o `npm install && npm run dev`)
- Build estático: `bash publicar.sh` (o `npm run build`) → `dist/` se puede subir a Netlify Drop, Cloudflare Pages, Vercel, o servidor propio
- Datos del user: usar **BackupPage** (botón 💾 en Productos) para descargar JSON con todo. Sin eso, los datos viven solo en el `localStorage` del browser y se pierden si Vitu cambia de celu. La app muestra un banner amarillo de recordatorio si pasaron más de 14 días sin descargar backup.

## Último estado (2026-05-24)

- PRs mergeados en sesiones recientes: #11, #12, #13, **#15** (competencia con match interactivo), **#16** (agregar competidora desde app)
- PR #14 (PWA + Vercel) → **cerrado sin mergear** (decisión del user)
- `main` con todo el sistema de competencia + backup
- Tareas en curso: **ninguna**
- TODO próximos:
  1. Soportar Empretienda en el scraper (para Silnari)
  2. Sumar Nati's al cron cuando aparezca su Issue
  3. Filtros de exclusión para Nati's (excluir desayunos/panes/packs)
- Reglas de workflow agente (lecciones aprendidas):
  - **No mergees PRs antes de pushear todos los commits** — siempre `git push && gh pr merge`.
  - **El user trabaja desde una carpeta en Google Drive** (`~/Library/CloudStorage/GoogleDrive-.../Mi unidad/vitucakes`). Hay también una carpeta en `~/Documents/General/Personal/vitucakes` que es legacy. Cuidado con confundir las dos.
  - **`node_modules` en Drive ralentiza la sincronización**. Recomendar al user excluir esa carpeta de Drive sync.

## Carpetas del proyecto en la máquina de Patricio

- **Drive (oficial, en uso)**: `/Users/patriciomartinvallerino/Library/CloudStorage/GoogleDrive-patriciovallerino@gmail.com/Mi unidad/vitucakes`
- **Documents (legacy)**: `/Users/patriciomartinvallerino/Documents/General/Personal/vitucakes`
