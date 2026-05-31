# Cómo reconstruir Vitucakes desde cero

Esta es la guía a prueba de balas para alguien que tiene **solo esta carpeta** y un archivo de backup, sin acceso a GitHub, sin Claude, y sin la Mac original. Asume cero conocimiento técnico.

Si seguís estos pasos, en menos de 30 minutos tenés la app andando con todos los datos de Vitu.

---

## 🎯 Resumen ultra corto

Necesitás:

1. **La carpeta `vitucakes/`** (tiene todo el código).
2. **Una de estas dos** para los datos:
   - Acceso al proyecto **Firebase `vitucakes`** (cuenta Google de Patricio) → los datos ya están en la nube, no hace falta nada más.
   - O un **`vitucakes-backup-AAAA-MM-DD.json`** → lo importás y la app lo sube a la nube.

Con eso, en cualquier computadora moderna, tenés la app de vuelta.

> ⚠️ **Cambió con Firebase (2026-05):** los datos de Vitu ya **no** viven en el navegador (localStorage), sino en la **nube (Firebase/Firestore)** — por eso todos los dispositivos ven lo mismo. El código de conexión está en `src/firebase.js` (no es secreto). Para **editar** hace falta un **PIN** (botón 🔒). Si reconstruís contra un Firebase vacío, la app muestra una pantalla "Inicializar datos" para sembrar desde un backup.

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

## Parte 3 — Que aparezcan los datos de Vitu (2 min)

Depende de a qué Firebase apunte la app (la config está en `src/firebase.js`):

**Caso A — apunta al Firebase `vitucakes` real (lo normal):** los datos de Vitu **ya están en la nube**. Apenas abrís la app, los ves. No tenés que hacer nada. (Para editar, tocá **🔒** y poné el PIN.)

**Caso B — apunta a un Firebase vacío (reconstrucción desde cero):** la app te muestra la pantalla **"Inicializar datos"**:

1. Tocá **"Desbloquear con PIN"** y poné el PIN.
2. Tocá **"Importar desde un backup"** → elegí el archivo `vitucakes-backup-AAAA-MM-DD.json`.
3. Revisá los números (insumos / recetas) y confirmá.
4. Listo: esos datos quedan en la nube y los ve cualquier dispositivo.

> Si ya pasaste la pantalla inicial y querés restaurar un backup igual: botón **💾** en Productos → "Restaurar desde copia" (requiere PIN).

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

Como los datos viven en **Firebase** (no en el browser), la app de Netlify usa el **mismo** `src/firebase.js` → muestra **los mismos datos** que la versión de siempre, sin reimportar nada. (A diferencia de antes, ya no hay que volver a cargar el backup en cada browser.)

---

## Parte 5 — Si necesitás modificar el código

Sin Claude, las modificaciones requieren saber **React + Vite + Tailwind**. Si no sabés, las opciones son:

1. **Contratar un dev React por hora** (sitios como Workana, freelance.com). Mostrale este RECONSTRUIR.md + el HANDOFF.md + el README.md, debería entender el proyecto en 30 minutos.
2. **Usar otra IA** (ChatGPT, Gemini, Claude desde otra cuenta) y pedirle que lea los .md del proyecto. La carpeta entera ocupa ~150 KB sin `node_modules`, se la podés subir como contexto.
3. **Aprender lo básico**: la app es bastante simple. React + Tailwind + Firebase (Firestore). Hay miles de tutoriales gratis.

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
- **Firebase/Firestore** como base de datos compartida en la nube (config pública en `src/firebase.js`)
- Capa de datos: `src/hooks/useSharedState.js`. Edición detrás de PIN: `src/hooks/useEditGate.jsx`
- Datos de fábrica (semilla) en `public/precarga.json`, `public/recetas_v2.json`

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
- **Firebase / Firestore**: la base de datos en la nube donde viven los datos de Vitu (insumos, recetas, competidoras). Reemplazó a localStorage para que todos los dispositivos vean lo mismo. Config (pública) en `src/firebase.js`.
- **PIN de edición**: clave que desbloquea la edición (botón 🔒). Sin PIN, la app es solo-lectura. La saben Vitu y Patricio.
- **localStorage**: antes guardaba los datos del user; ahora solo guarda cosas locales del dispositivo (el flag de "edición desbloqueada" y algunos caches). Los datos reales están en Firebase.
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
2. **Datos**: viven en **Firebase** (nube). Con acceso al proyecto `vitucakes` aparecen solos; si no, un **backup JSON** + la pantalla "Inicializar datos" los repone.
3. **Netlify Drop** (opcional) → URL pública nueva (apuntando al mismo Firebase).
4. **Cualquier IA o dev React** → podés modificar el código si querés.

**El código está todo en esta carpeta.** Los **datos** viven en Firebase (nube) — guardá backups igual, por las dudas. Con la carpeta + acceso a Firebase (o un backup), nada se pierde.
