# Cómo reconstruir Vitucakes desde cero

Esta es la guía a prueba de balas para alguien que tiene **solo esta carpeta** y un archivo de backup, sin acceso a GitHub, sin Claude, y sin la Mac original. Asume cero conocimiento técnico.

Si seguís estos pasos, en menos de 30 minutos tenés la app andando con todos los datos de Vitu.

---

## 🎯 Resumen ultra corto

Necesitás 2 cosas:

1. **La carpeta `vitucakes/`** (tiene todo el código).
2. **El archivo `vitucakes-backup-AAAA-MM-DD.json`** (tiene los datos de Vitu).

Con esas dos cosas en cualquier computadora moderna, tenés la app de vuelta.

---

## Parte 1 — Preparar la computadora (5 min)

### Paso 1.1 — Instalar Node.js (si no lo tenés)

1. Abrí una terminal y escribí `node --version` y enter.
   - Si te dice `v20.x.x` o superior → **pasá al Paso 2**.
   - Si te dice `command not found` o un número menor a 20 → seguí.

2. Andá a https://nodejs.org/
3. Bajá la versión **LTS** (la verde, recomendada).
4. Abrí el `.pkg` (Mac) o `.msi` (Windows) y dale **Siguiente** a todo.
5. Cerrá la terminal y abrí una **nueva** terminal.
6. Volvé a escribir `node --version`. Ahora tiene que decir `v20.x.x` o superior.

> 💡 Si en la terminal te dice "permission denied" al instalar, abrí Configuración → Privacidad y Seguridad → permití el instalador de Node.

### Paso 1.2 — Encontrar la carpeta

Asumimos que tenés la carpeta `vitucakes` en algún lado. Anotá su ruta completa. Ejemplos:

- En Mac: `/Users/tu-usuario/Desktop/vitucakes`
- En Windows: `C:\Users\tu-usuario\Desktop\vitucakes`

Vas a usar esa ruta en el próximo paso.

---

## Parte 2 — Levantar la app (5 min)

### Opción A — Con el script automático (más fácil)

1. Abrí una terminal.
2. Escribí `cd ` (con espacio) y arrastrá la carpeta `vitucakes` adentro de la terminal. Te queda algo como:
   ```
   cd /Users/tu-usuario/Desktop/vitucakes
   ```
3. Enter.
4. Escribí:
   ```bash
   bash arrancar.sh
   ```
5. El script verifica que Node esté OK, instala dependencias si falta, y arranca la app.
6. Cuando termine, abrí tu browser y andá a **http://localhost:5173/vitucakes/**

### Opción B — Comandos manuales (si la opción A falla)

```bash
cd /ruta/a/tu/carpeta/vitucakes
npm install
npm run dev
```

- `npm install` toma ~30-60 segundos la primera vez y baja unas 400 MB de dependencias. Necesita internet.
- Cuando termine, vas a ver algo como `Local: http://localhost:5173/vitucakes/` → abrí esa URL en el browser.

### ¿Qué hacer si npm install falla?

- **"command not found: npm"** → No instalaste Node bien. Volvé al Paso 1.1.
- **"EACCES" / permisos** → Probá `sudo npm install` (te va a pedir tu password de Mac).
- **Internet lento** → esperá. Si pasa 5 min sin avanzar, cancelá (Ctrl+C) y volvé a probar.
- **"crypto is not defined"** → tu Node es viejo. Necesitás v20+. Volvé al Paso 1.1.

---

## Parte 3 — Restaurar los datos de Vitu (2 min)

Cuando abras la app por primera vez, va a tener los **datos de fábrica** (167 insumos y 139 recetas del Excel original). Necesitás reemplazarlos por los datos de Vitu (que están en el backup):

1. En la app, andá a **Productos** (abajo a la derecha).
2. Arriba a la derecha tocá el botón **💾**.
3. En "Restaurar desde backup", tocá **Elegir archivo**.
4. Buscá el archivo `vitucakes-backup-AAAA-MM-DD.json` y abrilo.
5. Te aparece un modal con preview de cuántos insumos / recetas tiene.
6. Tocá **Restaurar**.
7. **Recargá la página** (F5 o Cmd+R).

Listo. Tenés todos los datos de vuelta.

---

## Parte 4 — Publicar la app online (opcional, 3 min)

Si querés que la app esté en una URL pública (para que Vitu la use desde el celular como antes), seguí estos pasos. **No necesitás cuenta de GitHub.**

### Generar el build

En la terminal, parada en la carpeta `vitucakes`:

```bash
npm run build
```

Eso te crea una carpeta `dist/` con la app lista para servir.

### Subir a Netlify (gratis, sin cuenta, sin tarjeta)

1. Andá a https://app.netlify.com/drop
2. **Arrastrá la carpeta `dist/`** desde tu computadora al sitio.
3. En 30 segundos, te da una URL tipo `https://random-name-12345.netlify.app/vitucakes/`
4. Esa URL es pública. Vitu la abre desde su celular.

### Configuración importante después de subir

La URL de Netlify probablemente no tenga el `/vitucakes/` final. Para que funcione bien, hay que ajustar el `vite.config.js`:

1. Abrí el archivo `vite.config.js` con cualquier editor de texto (incluido el bloc de notas).
2. Cambiá:
   ```js
   base: '/vitucakes/',
   ```
   por:
   ```js
   base: '/',
   ```
3. Volvé a correr `npm run build`.
4. Subí `dist/` de nuevo a Netlify Drop.
5. Ahora la URL funciona en la raíz: `https://tu-nombre.netlify.app/`

### Datos en la versión nueva

La app de Netlify nueva **arranca con datos de fábrica**. Vitu tiene que volver a importar el backup (botón 💾 → Restaurar) **en el browser que use** para acceder a esa URL. Una vez importado, queda guardado en ese browser.

---

## Parte 5 — Si necesitás modificar el código

Sin Claude, las modificaciones requieren saber **React + Vite + Tailwind**. Si no sabés, las opciones son:

1. **Contratar un dev React por hora** (sitios como Workana, freelance.com). Mostrale este RECONSTRUIR.md + el HANDOFF.md + el README.md, debería entender el proyecto en 30 minutos.
2. **Usar otra IA** (ChatGPT, Gemini, Claude desde otra cuenta) y pedirle que lea los .md del proyecto. La carpeta entera ocupa ~150 KB sin `node_modules`, se la podés subir como contexto.
3. **Aprender lo básico**: la app es bastante simple. React + Tailwind + localStorage. Hay miles de tutoriales gratis.

Lo que el dev/IA necesita leer en orden:
1. `README.md` — quick start
2. `RECONSTRUIR.md` — este archivo (contexto operativo)
3. `HANDOFF.md` — contexto técnico detallado (decisiones, reglas, modelo de datos)

---

## Parte 6 — Cosas que dejan de funcionar sin GitHub

Estas cosas necesitan GitHub para correr **automáticamente**. La app igual funciona, pero algunas cosas hay que hacerlas a mano:

| Antes (con GitHub) | Sin GitHub |
|---|---|
| Cron semanal actualiza precios de El Granate los lunes a las 23h | Hay que tocar "Actualizar precios manualmente" en la app cuando quieras refresh |
| Cron semanal actualiza precios de competencia (Candelitte) | Idem — los precios quedan congelados al último que se subió a la carpeta |
| Deploy automático en cada push | Hay que hacer `npm run build` y subir `dist/` a Netlify manualmente |
| URL pública estable `patriciovallerino.github.io/vitucakes/` | URL nueva de Netlify |

**Todo lo demás funciona igual**: agregar/editar insumos, recetas, matches con competencia, cálculos, backup/restore, etc.

---

## Parte 7 — Datos importantes para recordar

### Stack técnico
- React 18 + Vite + Tailwind CSS
- Sin backend, sin base de datos
- Datos del user en `localStorage` del browser
- Datos de fábrica en `public/precarga.json`, `public/recetas_v2.json`

### Migrar a otra Mac
1. Copiá la carpeta `vitucakes` entera (con USB, AirDrop, Drive, ZIP).
2. Copiá el backup JSON.
3. En la Mac nueva, seguí los pasos de la Parte 1 y 2.

### Lo que NO necesitás copiar
- `node_modules/` — se regenera con `npm install` (mejor que copiarlo, evita problemas de paths).
- `.git/` — solo si querés mantener el historial. Si lo perdés, igual funciona.
- `dist/` — se regenera con `npm run build`.

### Lo que SÍ necesitás copiar
- Toda la carpeta `vitucakes/` excepto `node_modules` y `dist` (opcional pero recomendado para ahorrar espacio).
- El archivo `vitucakes-backup-*.json` (en una ubicación segura, no adentro de `vitucakes/`).

---

## Parte 8 — Backup periódico

**Recomendado: bajá un backup cada 2 semanas** o cada vez que hagas cambios importantes.

La app tiene un recordatorio incorporado: si pasaron más de 14 días sin bajar backup, aparece un banner amarillo en Productos.

Guardá los backups en:
- ✅ Drive (sincronización en la nube)
- ✅ Mail (te lo mandás a vos misma)
- ✅ Disco externo
- ❌ Solo en el celu (si se rompe el celu, perdés todo)

---

## Parte 9 — Glosario

- **Node.js / npm**: el motor que ejecuta JavaScript y maneja dependencias. Como un "Microsoft Word para apps web". Hay que instalarlo una vez.
- **`npm install`**: baja todas las dependencias del proyecto (~400 MB). Hay que correrlo una vez por máquina.
- **`npm run dev`**: arranca la app en modo desarrollo (localhost). Mientras corre, podés editar código y se refresca solo.
- **`npm run build`**: prepara la versión "para producción". Genera la carpeta `dist/` con HTML/JS/CSS minificados.
- **`dist/`**: la carpeta resultado de `npm run build`. Es lo que subís a un servidor.
- **localStorage**: donde el browser guarda los datos del user. Cada browser y cada URL tienen su propio localStorage independiente.
- **CORS / proxy CORS**: técnica para que la app del browser pueda leer datos de otros sitios (ej. catálogos de competencia). Usamos `corsproxy.io` (servicio externo gratis).
- **GitHub Pages**: el hosting gratis donde estaba publicada la app (cuando había acceso a GitHub).
- **Netlify Drop**: alternativa a GitHub Pages, sin cuenta. Arrastrás una carpeta, te da una URL.

---

## Parte 10 — Plan de emergencia si algo no funciona

### "Bajé `npm install` y tarda mucho"
Es normal la primera vez (~1 min con buena internet, 5 min con mala). Si pasa 10 min, cancelá (Ctrl+C) y probá `npm install --prefer-offline` (usa cache local).

### "Abro localhost:5173 y veo página en blanco"
Abrí la consola del browser (F12 → Console) y mirá si hay errores rojos. Buscá el mensaje en Google o pedile a una IA que te lo explique.

### "Importo el backup y no veo los datos"
Después de importar, **tenés que recargar la página** (F5 o Cmd+R). Si tampoco aparecen, abrí la consola del browser y buscá errores.

### "Quiero volver a la versión antes de mi cambio"
Tu carpeta `vitucakes/` tiene un repo Git adentro. Probá:
```bash
git status        # ¿qué cambió?
git diff          # ¿qué cambió exactamente?
git checkout .    # descarta TODOS los cambios (cuidado, no se puede deshacer)
```

### "Le di a 'Borrar mis datos y resetear' por error"
Importá tu backup más reciente. Si no tenés backup → te quedaste con la precarga de fábrica (no se puede deshacer).

---

## En resumen

1. **Carpeta `vitucakes/` + Node 20 + 30 min** → tenés la app andando.
2. **Backup JSON** → tenés los datos.
3. **Netlify Drop** (opcional) → tenés URL pública nueva.
4. **Cualquier IA o dev React** → podés modificar el código si querés.

**Todo lo que necesitás está en esta carpeta.** Nada vive solo en GitHub o en mi cabeza. Nada se pierde si seguís estos pasos.
