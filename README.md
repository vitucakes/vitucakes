# Vitucakes

App de costeo y precios de venta para una pastelería casera (uso personal).
React + Vite + Tailwind. Sin backend. Datos en `localStorage`.

**Live**: https://patriciovallerino.github.io/vitucakes/

## 🚨 Si llegaste acá sin saber qué es esto

Leé **[RECONSTRUIR.md](./RECONSTRUIR.md)** — guía paso a paso, sin presupuesto técnico, para levantar la app desde cero con solo esta carpeta y un backup JSON.

## Quick start (rápido, asume Node 20+ instalado)

```bash
bash arrancar.sh   # script todo-en-uno: verifica, instala, arranca
```

O manualmente:

```bash
npm install
npm run dev      # http://localhost:5173/vitucakes/
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

Listo. La app es 100% client-side y funciona contra `localStorage`. No necesita servidor propio.

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

**No están en esta carpeta**. Viven en el `localStorage` del browser de quien usa la app. Si Vitu pierde el celu o limpia datos del sitio, **se pierden**.

Por eso la app tiene una pantalla **Backup de datos** (botón 💾 en el header de Productos) con:
- **Descargar backup**: baja un JSON con todos los datos del user.
- **Restaurar backup**: sube un JSON y reemplaza lo actual.
- **Reset**: borra todo y vuelve a la precarga inicial (167 insumos + 139 recetas).

Recomendado: que Vitu baje un backup cada tanto y lo guarde en Drive / mail.

## Estructura

```
vitucakes/
├── src/
│   ├── App.jsx                    # Routing por estado, precarga, migraciones one-shot
│   ├── main.jsx
│   ├── index.css                  # Tailwind + clases .input .label
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── utils/
│   │   ├── calc.js                # Cálculos y constantes (MARGEN, GASTOS_INDIRECTOS)
│   │   ├── competencia.js         # Match recetas ↔ productos de competencia
│   │   ├── scrapeGranate.js       # Scrape de El Granate (insumos) en vivo
│   │   └── scrapeTiendanube.js    # Scrape genérico de cualquier Tiendanube
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   ├── BottomSheet.jsx
│   │   └── MatchManualSheet.jsx   # Sheet con buscador para elegir match manual
│   └── pages/
│       ├── InsumosPage.jsx
│       ├── RecetasPage.jsx        # Lista de productos (legacy: "recetas" en código)
│       ├── RecetaDetail.jsx
│       ├── ActualizarPreciosPage.jsx
│       ├── ResolverMatchesPage.jsx   # Bulk review de matches con competencia
│       ├── AgregarCompetidoraPage.jsx
│       └── BackupPage.jsx
├── public/
│   ├── precarga.json              # 167 insumos + 139 recetas (datos iniciales)
│   ├── recetas_v2.json            # Migración v2 (insumos y recetas nuevas)
│   ├── precios_sugeridos.json     # Generado por el cron (El Granate)
│   ├── competencia.json           # Generado por el cron (competidoras Tiendanube)
│   └── logo.jpg
├── scripts/
│   ├── update-prices.mjs          # Cron: scrape de El Granate
│   └── update-competencia.mjs     # Cron: scrape de competidoras
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
4. No agregues backend ni servicios externos sin avisar.
5. **Mantené el patrón de migraciones one-shot** en App.jsx para cambios al modelo de datos — vivimos en producción con datos del user, no podés romper backwards compat.
6. **Internamente "receta" = "producto"** (en UI dice "Producto", en código sigue siendo `receta` por compat).
7. Idioma: español rioplatense.
8. **Si el user dice que perdió GitHub o Claude**: el documento RECONSTRUIR.md es para él, llevalo de la mano por ahí.
