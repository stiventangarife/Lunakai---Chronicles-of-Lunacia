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
