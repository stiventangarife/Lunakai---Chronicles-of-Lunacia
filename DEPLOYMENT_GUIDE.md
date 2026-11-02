# Guía de Despliegue y Subida a Hosting: Lunakai: Chronicles of Lunacia

El proyecto está 100% optimizado y preparado para desplegarse en cualquier plataforma de hosting web. Dado que el juego utiliza Three.js y ES Modules nativos autónomos en la carpeta `vendor/`, **no requiere compilación compleja** y puede funcionar tanto en **hostings estáticos gratuitos** como en **servidores Node.js o cPanel**.

---

## Opción 1: Vercel (Recomendada - Gratis, SSL automático, CDN global ultra rápido)

1. Crea una cuenta gratuita en [Vercel](https://vercel.com).
2. Si usas GitHub:
   - Sube este proyecto a un repositorio de GitHub.
   - En Vercel, pulsa **"Add New Project"** e importa tu repositorio.
   - En **Framework Preset**, déjalo en **"Other"**.
   - En **Root Directory**, déjalo en `./`.
   - Haz clic en **"Deploy"**.
3. O si prefieres desplegar directamente desde la terminal con Vercel CLI:
   ```bash
   npm i -g vercel
   vercel
   ```
4. El archivo [`vercel.json`](./vercel.json) ya configurado aplicará automáticamente las cabeceras MIME para modelos `.glb` y caché acelerada.

---

## Opción 2: Netlify (Muy sencilla - Arrastrar y soltar o Git)

1. Crea una cuenta en [Netlify](https://www.netlify.com).
2. **Método Arrastrar y Soltar (Sin Git):**
   - En tu panel de Netlify, ve a la sección **"Sites"**.
   - Arrastra la carpeta `axie-tactics-web` directamente al recuadro de subida.
   - En 30 segundos tu juego estará online con enlace HTTPS público.
3. **Método Git:**
   - Conecta tu repositorio de GitHub / GitLab.
   - Deja el campo de build vacío y el publish directory en `.`.
4. Los archivos [`netlify.toml`](./netlify.toml) y [`_headers`](./_headers) ya incluidos configuran los tipos MIME y compresión sin tocar nada más.

---

## Opción 3: GitHub Pages (100% Gratuito)

1. Sube tu proyecto a un repositorio de GitHub (por ejemplo, `lunakai-tactics`).
2. En tu repositorio en GitHub, ve a **Settings** > **Pages**.
3. En **Source**, selecciona `Deploy from a branch`.
4. Elige la rama `main` (o `master`) y la carpeta `/ (root)`.
5. Haz clic en **Save**.
6. En un par de minutos tu juego estará disponible en:
   `https://tu-usuario.github.io/nombre-del-repo/`
7. El archivo [`.nojekyll`](./.nojekyll) ya incluido asegura que GitHub no ignore ningún asset 3D ni archivo de Three.js.

---

## Opción 4: Hosting Tradicional / cPanel / Hostinger / DonWeb / Apache

1. Abre tu cliente FTP (como FileZilla) o el **Administrador de Archivos** de tu cPanel.
2. Entra en la carpeta pública de tu dominio (habitualmente `public_html` o `www`).
3. Sube todos los archivos y carpetas del proyecto:
   - `index.html`
   - `styles.css`
   - `assets/`
   - `src/`
   - `vendor/`
   - `.htaccess`
4. El archivo [`.htaccess`](./.htaccess) ya preparado asegurará que Apache sirva correctamente los modelos 3D (`model/gltf-binary`), audio y compresión Gzip.

---

## Opción 5: Render / Railway / Docker / VPS (Node.js)

Si prefieres ejecutar el servidor Node.js propio incluido en [`server.js`](./server.js):

- **Render / Railway:**
  - Conecta el repositorio.
  - Elige entorno **Node**.
  - Comando de inicio: `npm start` (o `node server.js`).
  - Detectará automáticamente el puerto mediante `process.env.PORT`.
- **Docker:**
  - Construye y corre el contenedor con el [`Dockerfile`](./Dockerfile) incluido:
    ```bash
    docker build -t lunakai-game .
    docker run -p 8080:8080 lunakai-game
    ```

---

## Verificación Previa a la Subida

- [x] Todas las rutas de assets son relativas (funcionan en raíz o subcarpetas).
- [x] Archivos `.glb` y `.gltf` con cabeceras MIME declaradas en `.htaccess`, `vercel.json`, `netlify.toml` y `server.js`.
- [x] Zero errores de sintaxis en los 28 módulos ES.
- [x] Compatibilidad móvil y de escritorio con layout responsive.

---

## Antes de cada entrega: versión del juego (Hito 110)

La versión que se ve en la pantalla de inicio y en la de selección de personaje («Demo 1 (v0.4.0) - Lunakai») es la constante `GAME_VERSION` de `src/rpg/ui/StartScreenUI.js`. Súbela cuando quieras marcar una entrega nueva (por ejemplo, `0.4.0` → `0.4.1` para correcciones, `0.5.0` para funciones nuevas). Es independiente de la versión de los assets de abajo.

## Base de datos (Supabase): migraciones pendientes

Si la entrega trae migraciones nuevas en `supabase/migrations/`, aplícalas **en orden** con `supabase db push` o en el SQL Editor de Supabase. Las del Hito 110 (moneda AXS):

1. `20261101000000_axs.sql`
2. `20261101000001_economy_catalog.sql`
3. `20261101000002_market_rules.sql`
4. `20261101000003_market_bound_bags.sql`
5. `20261101000004_economy_catalog.sql`
6. `20261101000005_market_rules.sql`

Si hay que repetirlas, ejecútalas todas y en este mismo orden (las de catálogo reescriben la lista entera). El regalo de AXS a las partidas existentes se da una sola vez aunque se repita la primera.

## Actualizar el juego ya publicado: versión de los assets (Hito 109)

Los modelos, la música y los efectos se guardan **un año** en el navegador de cada jugador sin volver a preguntar al servidor (`.htaccess`, `_headers`, `netlify.toml`, `vercel.json`). Por eso, si reemplazas un archivo de `assets/` conservando su nombre, quien ya jugó seguiría viendo o escuchando el viejo.

El juego pide esos archivos con `?v=<versión>` (`src/render/AssetVersion.js`). Antes de cada subida:

1. ¿Cambiaste, reemplazaste u optimizaste algo en `assets/` o `vendor/`? Sube la versión en `src/render/AssetVersion.js`:
   ```js
   export const ASSET_VERSION = '0.4.1'; // antes '0.4.0'
   ```
   Si solo cambiaste código (`src/`), textos o añadiste archivos nuevos con nombre nuevo, no hace falta.
2. Sube el juego como siempre (Hostinger: Administrador de archivos / FTP a `public_html`, incluido `.htaccess`).
3. Si tienes activada la **CDN de Hostinger** o LiteSpeed Cache, púrgala desde hPanel.
4. Comprueba en el navegador (F12 → Red) que los `.glb` / `.mp3` llevan `?v=0.4.1`. En la consola, `lkAssetVersion` muestra la versión activa.

Las imágenes de la interfaz (iconos, retratos) no llevan versión: el `.htaccess` hace que el navegador pregunte si cambiaron, así que se actualizan solas.

