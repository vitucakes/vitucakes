# Vitucakes — para una sesión nueva de Claude (o cualquier IA / dev)

App de **costeo, precios y stock** para una pastelería casera (uso personal de Vitu).
React 18 + Vite + Tailwind, datos en **Firebase/Firestore**, deploy a GitHub Pages.

## Leé esto primero (en orden)
1. **HANDOFF.md** — contexto técnico completo: decisiones, modelo de datos, reglas de UX y cada módulo (precios El Granate/Día, competencia, **stock / compras / ventas**, **papelería**, orden de insumos). Empezá acá; el estado actual está al final ("Último estado").
2. **RECONSTRUIR.md** — cómo levantar la carpeta solo (incl. **Parte 3B: armar tu propio Firebase** para que sea 100% independiente).
3. **README.md** — quick start.

## Correr
- **Node 20+ obligatorio** (con Node 18 falla por `crypto` en una dep). `npm install` → `npm run dev` → abrir `http://localhost:5173/vitucakes/`. Build de producción: `npm run build` (genera `dist/`).

## Datos
- Viven en **Firestore compartido** (config pública en `src/firebase.js`), NO en localStorage. Sincronizan en vivo entre dispositivos vía `src/hooks/useSharedState.js` (un doc por "tabla": insumos, recetas, competidoras_user, meta, compras, ventas).
- **Edición detrás de un PIN** (`src/hooks/useEditGate.jsx`); lectura pública. Los datos reales de Vitu NO se tocan a la ligera (probar siembra/escritura → limpiar después).

## Reglas que NO se rompen
- 🥇 **NUNCA bajar el precio de un insumo** (solo se sugiere/actualiza si SUBE). El user lo recalcó con énfasis.
- "Recetas" se muestra como **"Productos"** en la UI, pero el código sigue usando `receta`/`recetas` (no romper datos). Margen fijo **3x**, gastos indirectos **10%**. Idioma: **español rioplatense** (vos, "tocá").

## Git / merge — repo PÚBLICO (importante)
- El repo vive en la cuenta **`vitucakes`** (mail `pvallerino@gmail.com`) desde 2026-07-05; antes estaba en `patriciovallerino`. El `gh` local puede seguir autenticado como `patriciovallerino` (colaborador del repo).
- Commiteá **SIEMPRE** con `pvallerino@gmail.com`. **NUNCA** `patricio.vallerino@lemon.me` (es el mail de trabajo y el repo es público).
- **Mergeá sin preguntar** (el user lo autorizó). Excepción: algo de alto riesgo o que pueda perder datos → avisá primero.
- ⚠️ **NO uses `gh pr merge --squash`**: el squash estampa el commit en `main` con el mail **primario de la cuenta de GitHub autenticada en `gh`** (si es `patriciovallerino`, ese primario es el de Lemon) y pisa tu `user.email` local; "Keep my email private" NO lo evita. **Forma correcta de mergear: push directo a `main` con el commit firmado en gmail** →
  ```bash
  git checkout -b claude/<tarea>      # rama de trabajo
  git commit ...                      # user.email = pvallerino@gmail.com
  git rebase origin/main              # si main avanzó
  git push origin HEAD:main           # ← merge real, sin squash, sin filtrar mail
  git fetch origin && git reset --hard origin/main
  ```
  Podés abrir un PR igual (para registro); GitHub lo marca "merged" al detectar el commit en `main`.
- Cualquier push a `main` **deploya solo** a GitHub Pages (~30s, workflow `deploy.yml`). Live: `https://vitucakes.github.io/vitucakes/`.
