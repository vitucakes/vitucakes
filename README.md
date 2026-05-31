# Vitucakes

App de costeo y precios de venta para una pastelería casera (uso personal).
React + Vite + Tailwind. **Datos compartidos en la nube vía Firebase (Firestore)** — todos los dispositivos ven y editan lo mismo, en vivo.

**Live**: https://patriciovallerino.github.io/vitucakes/

## Datos compartidos (Firebase) — leer esto primero

- Los datos (insumos, recetas, competidoras propias) viven en **Firestore** (proyecto `vitucakes`), no en `localStorage`. Se sincronizan en vivo entre todos los dispositivos.
- **Lectura pública / escritura con candado**: cualquiera que abra el link ve los datos. Para editar hay que **desbloquear con un PIN** (botón 🔒 en el header). El PIN está hasheado en `src/hooks/useEditGate.jsx`.
- **Config**: `src/firebase.js` (no es secreto; la seguridad la dan las reglas de Firestore). Capa de datos: `src/hooks/useSharedState.js` (misma interfaz que el viejo `useLocalStorage`, pero contra Firestore).
- **Primer arranque**: si la base está vacía, la app muestra `InicializarDatos` (subir datos de este dispositivo / importar backup / datos de fábrica). Requiere PIN.
- **Reglas de Firestore** (Firestore → Reglas):

  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /vitucakes/{doc} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
  ```

## 🚨 Si llegaste acá sin saber qué es esto

Leé **[RECONSTRUIR.md](./RECONSTRUIR.md)** — guía paso a paso, sin presupuesto técnico, para levantar la app desde cero con solo esta carpeta y un backup JSON.

## Quick start (rápido, asume Node 20+ instalado)

```bash
bash arrancar.sh   # script todo-en-uno: verifica, instala, arranca
```

O manualmente:

```bash
npm install
npm run dev      # http://localhost:5173/  (en dev la base es '/'; en prod '/vitucakes/')
npm run build    # produce dist/ con la app lista para servir
```

## Scripts incluidos

- `arrancar.sh` — verifica Node, instala dependencias si falta, arranca la app en dev.
- `publicar.sh` — buildea y te da instrucciones para subir `dist/` a Netlify Drop (deploy gratis sin GitHub).

## Levantar la app sin GitHub y sin Claude

Si en algún momento no tenés acceso al repo de GitHub ni a Claude, y solo tenés esta carpeta, podés:

### Correrla localmente

```bash
cd vitucakes
npm install
npm run dev
```

La app es client-side, pero los datos viven en **Firebase/Firestore** (nube). Para que muestre los datos reales necesitás el mismo proyecto Firebase (config en `src/firebase.js`); si lo corrés contra un proyecto vacío, arranca con la pantalla de inicializar y te deja sembrar (subir de este dispositivo / backup / fábrica).

### Publicarla en otro hosting (sin GitHub)

```bash
npm run build
```

Te genera `dist/` con HTML + JS + CSS + JSONs estáticos. Esa carpeta la podés:

- **Netlify Drop**: arrastrá `dist/` a https://app.netlify.com/drop. URL pública en 30 segundos, sin cuenta.
- **Cloudflare Pages / Vercel**: tienen drop UIs equivalentes.
- **Servidor propio**: cualquier nginx / Apache / `python -m http.server 8080` dentro de `dist/` la sirve.

Importante: si vas a servir desde una ruta distinta a `/vitucakes/`, editá `vite.config.js` y cambiá `base: '/vitucakes/'` por la nueva ruta (o `'/'` si va a la raíz).

### Los datos del user (insumos, recetas, matches, etc.)

Viven en **Firestore** (nube), compartidos entre todos los dispositivos. Ya **no** se pierden al cambiar de celu. La pantalla **Backup de datos** (botón 💾 en el header de Productos) sigue existiendo como copia extra:
- **Descargar copia**: baja un JSON con los datos actuales.
- **Restaurar**: sube un JSON y reemplaza la base compartida (requiere PIN).
- **Datos de fábrica**: reemplaza la base con la precarga inicial (requiere PIN).

Para correr la app **sin Firebase** (offline total / fork sin nube) habría que volver a `useLocalStorage` — ver historial de git antes de la migración a Firebase.

## Estructura

```
vitucakes/
├── src/
│   ├── App.jsx                    # Routing por estado, carga, gate de inicialización, seed
│   ├── main.jsx                   # Envuelve App en <EditGateProvider>
│   ├── index.css                  # Tailwind + clases .input .label
│   ├── firebase.js                # Init Firebase: Firestore (cache offline) + auth anónima
│   ├── hooks/
│   │   ├── useSharedState.js      # [valor,setValor,loaded] contra Firestore (real-time)
│   │   ├── useLocalStorage.js     # legacy (ya no se usa para datos compartidos)
│   │   └── useEditGate.jsx        # Candado por PIN: provider, hook, <LockToggle/>, PinPrompt
│   ├── utils/
│   │   ├── calc.js                # Cálculos y constantes (MARGEN, GASTOS_INDIRECTOS)
│   │   ├── competencia.js         # Match recetas ↔ productos de competencia
│   │   ├── seedData.js            # Siembra inicial (this device / backup / fábrica)
│   │   ├── scrapeGranate.js       # Scrape de El Granate (insumos) en vivo
│   │   └── scrapeTiendanube.js    # Scrape genérico de cualquier Tiendanube
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   ├── BottomSheet.jsx
│   │   └── MatchManualSheet.jsx   # Sheet con buscador para elegir match manual
│   └── pages/
│       ├── InsumosPage.jsx        # CRUD insumos. Orden por más usados (usos)
│       ├── RecetasPage.jsx        # Lista de productos (legacy: "recetas"). Orden por usos
│       ├── RecetaDetail.jsx       # Detalle; edición detrás del candado (canEdit)
│       ├── ActualizarPreciosPage.jsx
│       ├── ResolverMatchesPage.jsx   # Bulk review de matches con competencia
│       ├── AgregarCompetidoraPage.jsx
│       ├── BackupPage.jsx         # Export/restore/reset de la base COMPARTIDA
│       └── InicializarDatos.jsx   # Primera carga cuando la base está vacía
├── public/
│   ├── precarga.json              # 167 insumos + 139 recetas (datos de fábrica)
│   ├── recetas_v2.json            # Migración v2 (insumos y recetas nuevas)
│   ├── precios_sugeridos.json     # Generado por el cron (El Granate)
│   ├── competencia.json           # Generado por el cron (competidoras Tiendanube)
│   └── logo.jpg
├── scripts/
│   ├── update-prices.mjs          # Cron: scrape de El Granate
│   ├── update-competencia.mjs     # Cron: scrape de competidoras
│   └── build-recetas-v2.mjs       # Generó recetas_v2.json (one-shot)
└── .github/workflows/
    ├── deploy.yml                 # Deploy automático a GH Pages en push a main
    ├── update-prices.yml          # Cron lunes 23 ART
    └── update-competencia.yml     # Cron lunes 23:30 ART
```

## Para entender el proyecto en detalle

Leé [HANDOFF.md](./HANDOFF.md). Tiene contexto histórico, decisiones de UX, reglas de no-romper, y todo lo que un dev (o Claude) necesita para retomar.

## Para Claude / otra IA que arranca de cero

Si sos una IA que retoma este proyecto solo con esta carpeta:
1. Leé `RECONSTRUIR.md` (para entender el escenario "el user solo tiene la carpeta").
2. Leé este README + el HANDOFF.md (contexto técnico).
3. El stack es simple: React 18 funcional (no clases), Tailwind, sin TypeScript.
4. Ya hay un "backend" liviano: **Firebase/Firestore** (datos compartidos — ver `src/firebase.js` + `src/hooks/useSharedState.js`). No agregues MÁS servicios externos sin avisar.
5. **Vivimos en producción con datos reales del user (en Firestore): no rompas backwards-compat.** La capa de datos compartida es `useSharedState`; la siembra y los "datos de fábrica" viven en `utils/seedData.js` (ya NO hay migraciones one-shot en `App.jsx`).
6. **Internamente "receta" = "producto"** (en UI dice "Producto", en código sigue siendo `receta` por compat).
7. **Orden de listas por más usados** (`usos`), no por recencia. **Edición detrás de PIN** (`useEditGate`); los controles se muestran solo si `canEdit`.
8. Idioma: español rioplatense.
9. **Si el user dice que perdió GitHub o Claude**: el documento RECONSTRUIR.md es para él, llevalo de la mano por ahí.
