# Vitucakes — Handoff

App de costeo y precios de venta para una pastelería casera (uso personal de Vitu).

## Resumen rápido

- **Repo**: https://github.com/patriciovallerino/vitucakes
- **Live**: https://patriciovallerino.github.io/vitucakes/
- **Stack**: React 18 + Vite + Tailwind CSS + **Firebase (Firestore + Auth anónima)**
- **Storage**: **Firestore** (colección `vitucakes`, un doc por "tabla": `insumos`, `recetas`, `competidoras_user`, `meta`). Compartido y en vivo entre todos los dispositivos. Ya NO es `localStorage`.
- **Deploy**: GitHub Actions → GitHub Pages (auto en push a `main`)
- **Cuenta GitHub conectada**: `patriciovallerino` (la usuaria también tiene `patriciovallerino-maker` pero no se llegó a switchear con `gh`)

## Cómo levantar

```bash
git clone https://github.com/patriciovallerino/vitucakes
cd vitucakes
npm install
npm run dev
```

Abre en `http://localhost:5173/` (en dev la `base` es `/`; en prod es `/vitucakes/`).

- **Node 20+ obligatorio** (con 18 puede fallar; en este repo hay `~/.nvm` con `v20`).
- ⚠️ **`npm run dev` pega contra la base de Firestore REAL** (los datos compartidos de Vitu). Si desbloqueás con el PIN en local y editás, le tocás los datos de producción. Para probar sin riesgo: no desbloquees, o usá un proyecto Firebase aparte cambiando `src/firebase.js`.
- El config de Firebase está committeado en `src/firebase.js` (no es secreto). Reglas de Firestore: ver sección de abajo.

## Decisiones de UI / naming (importante)

- **"Recetas" se renombró a "Productos"** en la UI. El código interno (variables, claves de `localStorage`, nombres de archivo: `RecetasPage`, `RecetaDetail`, etc.) **sigue usando "receta"** para no romper datos guardados. Cuando edites código y tengas dudas, hablale al user de "Productos" pero internamente seguís usando `recetas`.
- **Margen fijo en 3x** (`MARGEN = 3` en `utils/calc.js`). Selector de UI eliminado.
- **Gastos indirectos 10%** (`GASTOS_INDIRECTOS = 0.10`), discriminado en el desglose.
- **Idioma**: español rioplatense (vos, "tocá", etc.).
- **Diseño**: mobile-first, paleta rosa del logo (`brand.50–600` en `tailwind.config.js`).
- **Logo**: `public/logo.jpg` (1080×1080). Circular 48px a la izquierda del título en headers de Productos e Insumos. Favicon y apple-touch-icon también.

## Datos compartidos (Firebase) — arquitectura nueva (migración 2026-05)

Los datos viven en **Firestore** (proyecto `vitucakes`), no en `localStorage`.

- **`src/firebase.js`**: init de Firebase, Firestore con cache offline (IndexedDB) y login anónimo automático e invisible. El config NO es secreto (la seguridad la dan las reglas de Firestore).
- **`src/hooks/useSharedState.js`**: hook con la misma interfaz que `useLocalStorage` (`[valor, setValor]`) + 3er valor `loaded`. Real-time listener (`onSnapshot`), escrituras debounceadas (350ms) y guard contra el "eco" de la propia escritura. Un doc por "tabla" bajo la colección `vitucakes` (`insumos`, `recetas`, `competidoras_user`, `meta`), cada uno con un campo `value`.
- **Candado de edición** (`src/hooks/useEditGate.jsx`): lectura pública, edición detrás de **PIN** (hash SHA-256 en el archivo; lo conocen Vitu y Patricio). `canEdit` se persiste en `localStorage` por dispositivo. `<LockToggle/>` (🔒/🔓) está en los headers; cada control de edición se renderiza solo si `canEdit`. Para candado fuerte se puede migrar a Login con Google + allowlist de mails en las reglas.
- **`src/pages/InicializarDatos.jsx`**: pantalla de primera carga (cuando `meta.seeded` no existe). Opciones: *subir datos de este dispositivo* (lee el `localStorage` viejo), *importar backup JSON*, o *datos de fábrica*. Requiere PIN. Muestra conteos antes de confirmar.
- **`src/utils/seedData.js`**: helpers de seed (`readDeviceData`, `readBackupData`, `buildFactoryData`). `buildFactoryData` replica las migraciones viejas (precarga + v2) una sola vez.
- **Reglas Firestore**: `read: if true; write: if request.auth != null;` para `/vitucakes/{doc}`.

**Reglas a no romper**:
- `useSharedState` es la única vía de datos compartidos — no volver a `useLocalStorage` para insumos/recetas/competidoras.
- Las migraciones one-shot viejas (precarga, restore-orphans, v2) ya NO corren en `App.jsx`; su lógica vive una sola vez en `buildFactoryData()`.
- Tabla compartida nueva = otro doc en la colección `vitucakes` vía `useSharedState('nombre', inicial)`. Acordate de sumarla al export de `BackupPage`.

## Modelo de datos

```js
// Insumo
{
  id: string,                    // crypto.randomUUID()
  nombre: string,
  unidad: 'kg' | 'g' | 'l' | 'ml' | 'u' | 'cdas' | 'cdtas' | 'taza' | 'atado',
  precioPorUnidad: number,       // ARS por unidad
  fechaActualizacion: string,    // ISO 'YYYY-MM-DD' — se setea automáticamente a hoy al guardar
  updatedAt: number,             // timestamp ms de última edición (ya NO es la clave de orden)
  usos: number,                  // veces que se abrió/tocó — ES la clave de orden (desc). Opcional; ausente = 0
}

// Receta (mostrada como "Producto" en UI)
{
  id: string,
  nombre: string,
  rinde: number,                 // cuántas unidades produce (informativo; NO divide el precio)
  unidadRinde: string,           // 'unidades', 'porciones', etc.
  ingredientes: [{ insumoId: string, cantidad: number }],
  descripcion: string,           // texto para "Mensaje para clientes" (se le concatena el precio)
  matchesCompetencia: [{ competidoraId, productoSlug }],     // matches confirmados
  rechazadosCompetencia: [{ competidoraId, productoSlug }],  // matches rechazados
  updatedAt: number,             // última edición (ya NO ordena)
  usos: number,                  // veces que se abrió el detalle — clave de orden (desc). Ausente = 0
  // Nota: el campo `margen` quedó en recetas viejas pero ya no se usa.
}
```

## Cálculo (utils/calc.js)

El precio de venta es el de la **receta ENTERA** (no por porción). `rinde` es informativo
y NO divide el precio — así se compara receta entera vs producto entero de la competencia.

```
costoInsumos = sum(cantidad × precioPorUnidad)
gastosIndirectos = costoInsumos × 0.10        // GASTOS_INDIRECTOS = 0.10
costoReceta (costo total) = costoInsumos × 1.10
precioVenta = costoReceta × MARGEN            // MARGEN = 3 (fijo). Receta entera.
```

## Reglas de UX importantes (NO romper)

- **Insumos: fecha auto-actualizada**. El campo `fechaActualizacion` se setea solo a `todayISO()` cada vez que se guarda un insumo (creación o edición de cualquier dato). NO existe un input editable para esto.
- **Insumos: precio calculado en vivo**. El input "Precio por X ($)" del formulario es un display **readonly**. Se calcula automáticamente desde "Total pagado" / "Cantidad". Si en edición no se cargan totales nuevos, mantiene el precio anterior.
- **Insumos: no se puede borrar uno en uso**. Si tocás el tachito y el insumo está usado en alguna receta, el modal lista las recetas y bloquea el borrado. Solo deja borrar huérfanos.
- **Actualizar precios: el OK final es manual**. Default: ningún ítem seleccionado. Después de tildar, el botón "Revisar y aplicar" abre un modal de confirmación con la lista de cambios. El user confirma explícitamente.
- **Regla "no bajar precio"**: si el precio scrapeado es menor o igual al actual del user, no se muestra como sugerencia. La regla está en el cliente, no en el script (`item.precio <= ins.precioPorUnidad → null`).
- **Equivalencia g↔ml**: para "Crema de leche" y "Miel", el scraper acepta indistintamente el peso en g o el volumen en ml, según `allowMlToG` / `allowGToMl` en las queries.
- **Sort de listas (Insumos y Productos): por MÁS usados** (PR #24). Campo `usos` descendente, empate alfabético (`a.nombre.localeCompare(b.nombre)`). `usos` sube +1 cada vez que se **abre** un producto (su detalle, en `App.jsx onSelect`) o un insumo (su edición, en `InsumosPage openEdit` y el efecto de `initialEditId`), y **solo si `canEdit`** — un viewer/cliente no reordena la lista de todos. Ya NO se ordena por `updatedAt`/recencia (el user lo pidió explícito). Arranca alfabético (todo en 0) y se acomoda con el uso real.
- **Migración de insumos huérfanos / precarga / v2**: esas migraciones one-shot que antes corrían en `App.jsx` sobre `localStorage` ya NO existen como tales. Su lógica de armado de datos de fábrica vive una sola vez en `buildFactoryData()` (`utils/seedData.js`), que se usa solo en la siembra inicial (`InicializarDatos`) o en "datos de fábrica" del Backup.

## Estructura

```
vitucakes/
├── src/
│   ├── App.jsx                  # Routing por estado, carga, gate de inicialización, seed
│   ├── main.jsx                 # Envuelve App en <EditGateProvider>
│   ├── index.css                # Tailwind + clases .input .label
│   ├── firebase.js              # Init Firebase: Firestore (cache offline) + auth anónima
│   ├── hooks/
│   │   ├── useSharedState.js    # [valor,setValor,loaded] contra Firestore (real-time). Reemplaza useLocalStorage
│   │   ├── useLocalStorage.js   # legacy — ya no se usa para datos compartidos
│   │   └── useEditGate.jsx      # Candado por PIN: EditGateProvider, useEditGate, <LockToggle/>, PinPrompt
│   ├── utils/
│   │   ├── calc.js              # Cálculos y constantes (MARGEN, GASTOS_INDIRECTOS). Precio = receta entera
│   │   ├── competencia.js       # Match recetas ↔ competencia (Jaccard + Levenshtein)
│   │   ├── seedData.js          # Siembra inicial: readDeviceData / readBackupData / buildFactoryData
│   │   ├── scrapeGranate.js     # Scrape El Granate (insumos) vía proxy CORS
│   │   └── scrapeTiendanube.js  # Scrape genérico de cualquier Tiendanube
│   ├── components/
│   │   ├── BottomNav.jsx        # Tab "Productos" (id sigue siendo 'recetas')
│   │   ├── BottomSheet.jsx
│   │   └── MatchManualSheet.jsx # Sheet con buscador para elegir match manual
│   └── pages/
│       ├── InsumosPage.jsx      # CRUD insumos + "Actualizar precios". Sort por usos. Incrementa usos al abrir edición
│       ├── RecetasPage.jsx      # CRUD productos (file name legacy). Sort por usos. LockToggle en header
│       ├── RecetaDetail.jsx     # Detalle de producto. Controles de edición detrás de canEdit
│       ├── ActualizarPreciosPage.jsx  # Sugerencias de precios (El Granate)
│       ├── ResolverMatchesPage.jsx    # Bulk review de matches con competencia
│       ├── AgregarCompetidoraPage.jsx # Agregar competidora con scrape en vivo
│       ├── BackupPage.jsx       # Export/restore/reset de la base COMPARTIDA (no localStorage)
│       └── InicializarDatos.jsx # Primera carga (base vacía): subir de este dispositivo / backup / fábrica
├── public/
│   ├── precarga.json            # 167 insumos + 139 recetas (datos de fábrica)
│   ├── recetas_v2.json          # Migración v2 (insumos y recetas nuevas)
│   ├── precios_sugeridos.json   # Generado por el cron (El Granate)
│   ├── competencia.json         # Generado por el cron (competidoras Tiendanube)
│   └── logo.jpg
├── scripts/
│   ├── update-prices.mjs        # Cron: scrape de El Granate
│   ├── update-competencia.mjs   # Cron: scrape de competidoras
│   └── build-recetas-v2.mjs     # Generó recetas_v2.json (one-shot)
├── .github/workflows/
│   ├── deploy.yml               # Deploy a GH Pages en push a main
│   ├── update-prices.yml        # Cron lunes 23h ART
│   └── update-competencia.yml   # Cron lunes 23:30 ART
├── 0. Costeo y Ventas VITUCA CAKES.xlsx   # Excel original
└── vite.config.js               # base '/vitucakes/' en build, '/' en dev
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

// Firestore: vitucakes/competidoras_user (antes era localStorage; ahora compartido)
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

Los datos viven en **Firestore** (compartidos, en la nube) — ya NO se pierden al cambiar de celu. La pantalla **BackupPage** (botón 💾 en el header de Productos; visible siempre que `canEdit`, o cuando hace ≥14 días que no se baja una copia) permite:
- **Descargar copia**: JSON con `insumos`, `recetas`, `competidoras_user`. Formato `{ app, version, exportadoEn, datos: { vitucakes_* } }`, compatible con backups viejos. Abierto para todos (export no requiere PIN).
- **Restaurar**: sube un JSON y reemplaza la base compartida (detrás de PIN).
- **Datos de fábrica**: reemplaza la base con la precarga inicial vía `buildFactoryData()` (detrás de PIN).

`BackupPage` recibe de `App.jsx` los datos compartidos (`data`) + un `onApply(data)` que escribe a Firestore con los setters de `useSharedState`. Si agregás una "tabla" compartida nueva, sumala al export y al `onApply`.

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
- Orden de listas por **más usados** (`usos` desc, tiebreak alfabético) — PR #24
- Fecha de actualización auto al guardar insumo
- Deploy automático a GitHub Pages
- Logo, favicon, apple-touch-icon
- Sistema completo de actualización de precios desde El Granate (cron + manual)
- Bloqueo de borrado de insumos en uso
- Modal de confirmación antes de aplicar precios
- **Sistema de competencia con match interactivo** (sugerencia automática + match manual + comparador) — PR #15
- **Agregar competidoras desde la app** con scrape en vivo + flujo de sumarlas al cron oficial via Issue — PR #16
- **Backup de datos** (export/import JSON + reset) — ahora opera sobre la base compartida
- **Datos compartidos en la nube (Firebase/Firestore)** — todos los dispositivos ven y editan lo mismo, en vivo. Migración de `localStorage` → Firestore (PR #23)
- **Candado de edición por PIN** — lectura pública para todos, edición detrás de PIN (Vitu y Patricio). PR #23
- **Pantalla de primera carga** (`InicializarDatos`) — siembra inicial sin pisar los datos reales del user. PR #23
- **Orden por los más usados** (`usos`) en Insumos y Productos, en vez de por recencia. PR #24

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
- Datos del user: viven en **Firestore** (nube), ya NO se pierden al cambiar de celu. La pantalla **BackupPage** (💾 en Productos) baja una copia JSON extra. **Ojo**: si reconstruís la app en otro hosting sin el mismo proyecto Firebase (config en `src/firebase.js`), no vas a tener los datos — necesitás ese proyecto o sembrar de cero desde un backup. Para correr 100% offline/sin nube habría que volver a `useLocalStorage` (ver git antes de la migración a Firebase).

## Último estado (2026-05-31)

- **Migración a Firebase/Firestore** (datos compartidos en la nube) — **PR #23 mergeado y deployado**. Vitu sembró sus datos reales desde su celu: la base tiene `meta.seeded: true`, **176 insumos / 154 recetas**. La app quedó **unificada**: cualquiera que abra el link, desde cualquier dispositivo, ve exactamente lo mismo.
- **Orden por los más usados** (`usos`) en Insumos y Productos, en vez de por recencia — **PR #24 mergeado y deployado**.
- Antes: #15 (competencia), #16 (agregar competidora), #20/#21/#22. #14 (PWA+Vercel) quedó cerrado sin mergear.
- Tareas en curso: **ninguna**.
- **Firebase** (proyecto `vitucakes`, cuenta Google de Patricio):
  - Auth anónima habilitada. Reglas: `/vitucakes/{doc}` → `read: if true; write: if request.auth != null`.
  - PIN de edición: lo conocen Vitu y Patricio (hash SHA-256 en `src/hooks/useEditGate.jsx`).
  - Candado fuerte futuro (si se quiere): Login con Google + allowlist de mails (Vitu y Patricio) en las reglas.
- TODO próximos (sin empezar):
  1. Soportar Empretienda en el scraper (para Silnari)
  2. Sumar Nati's al cron cuando aparezca su Issue
  3. ~20 insumos sin match en El Granate
- Reglas de workflow agente (lecciones aprendidas):
  - **El user autorizó mergear PRs sin preguntar** (en Vitucakes). Flujo: crear PR → `gh pr merge --squash` → deploya solo. Excepción: algo de alto riesgo o que pueda perder datos → avisar primero.
  - **Después de un squash-merge**, para el siguiente PR ramá desde `origin/main` (no desde tu rama vieja); si no, el diff arrastra lo ya mergeado.
  - **No mergees antes de pushear todos los commits** — siempre `git push && gh pr merge`.
  - **Verificación de cambios**: hay un dev server vía preview (`launch.json`, puerto 5174) que pega a la base real. Para probar siembra/seed sin ensuciar, sembrá y después limpiá con un script `firebase/firestore` temporal (auth anónima + del docs), y NO te olvides de resetear.
  - **El user trabaja desde una carpeta en Google Drive** (`~/Library/CloudStorage/GoogleDrive-.../Mi unidad/vitucakes`). Hay también una en `~/Documents/General/Personal/vitucakes` que es legacy. Cuidado con confundir las dos.
  - **`node_modules` en Drive ralentiza la sincronización**. Recomendar excluir esa carpeta de Drive sync.

## Carpetas del proyecto en la máquina de Patricio

- **Drive (oficial, en uso)**: `/Users/patriciomartinvallerino/Library/CloudStorage/GoogleDrive-patriciovallerino@gmail.com/Mi unidad/vitucakes`
- **Documents (legacy)**: `/Users/patriciomartinvallerino/Documents/General/Personal/vitucakes`
