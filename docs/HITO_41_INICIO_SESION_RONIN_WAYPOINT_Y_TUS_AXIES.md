# Hito 41 — Inicio de sesión con Sky Mavis (OIDC), API key en el servidor y tus Axies

> **Estado:** código listo y probado con Sky Mavis y Supabase simulados (19-oct-2026). Falta la configuración (sección 3) y la prueba real (sección 5).
> **Nota:** el nombre del archivo es histórico. Primero se probó con Ronin Waypoint, pero **Waypoint se apaga el 31-oct-2026**, así que se usa el **OIDC estándar de la cuenta de Sky Mavis**, que sigue activo.

## 1. Cómo funciona

1. **Ida:** el jugador pulsa **Sky Mavis** y el juego lo lleva a `https://api-gateway.skymavis.com/oauth2/auth` con:
   - `response_type=code`, `client_id`, `redirect_uri` y `scope=openid`;
   - `state` y `nonce`;
   - PKCE: `code_challenge` (S256).
2. **Vuelta:** el jugador inicia sesión con su cuenta de Sky Mavis y vuelve al juego con `?code=…&state=…`.
3. **Comprobación en el navegador:** el juego comprueba el `state` y manda el `code` y el `code_verifier` a la función `skymavis-auth`.
4. **La función:**
   1. canjea el código con el **client secret**, que solo vive en los secretos de Supabase;
   2. verifica el `id_token`: firma (JWKS), emisor, audiencia, caducidad y `nonce`;
   3. crea o vincula la cuenta (por el `sub`) y guarda la dirección Ronin (`roninAddress`);
   4. abre la sesión de Supabase.
5. **Tus Axies:** ya en la cuenta, el juego carga **todos** los Axies de tus direcciones para «Mis axies». Pasa por la función `axie-data`, que guarda la API key.
6. **Cerrar sesión:** cierra la sesión de Lunakai y la de Sky Mavis. El navegador pasa por `skymavis-auth?logout=1`, que redirige al logout de Sky Mavis añadiendo la API key, y Sky Mavis devuelve al jugador al juego.

## 2. Cambios

| Archivo | Cambio |
| --- | --- |
| `src/net/config.js` | `skymavis.clientId` (por rellenar), `authorizeUrl`, `scope`, `logoutAtSkyMavis`; rutas de las funciones. |
| `src/net/AuthService.js` | OIDC con PKCE, como en el Hito 25. Guarda el `id_token` solo para cerrar la sesión de Sky Mavis y limpia la URL al volver del logout. |
| `src/net/AccountManager.js` | `signOut` indica si el navegador va a Sky Mavis a cerrar sesión. |
| `supabase/functions/skymavis-auth/index.ts` | Canje de código como en el Hito 25, y además: guarda las direcciones Ronin, solo vincula por correo si no está marcado como no verificado, devuelve el `id_token` para el logout y añade la ruta `GET ?logout=1` (redirige solo a URIs del juego permitidas). |
| `supabase/functions/axie-data/index.ts` (nuevo) | Intermediario del marketplace con la API key en el servidor. Solo responde `axie` (por ID, para invitados) y `owned` (tus Axies, con las direcciones tomadas de tu perfil). Límite de 60 consultas por minuto por IP y orígenes permitidos. |
| `supabase/migrations/20261019000000_waypoint_addresses.sql` (nuevo) | Columnas `ronin_secondary_address` y `addresses_verified` en `profiles`. |
| `src/rpg/AxieMixerService.js` | **Ya no lleva la API key.** `fetchAxieData` usa `axie-data`; nuevo `fetchOwnedAxies()`. |
| `src/rpg/ui/StartScreenUI.js` | Carga tus Axies al entrar con Sky Mavis. Al elegir uno se calculan sus cartas, colecciones, vida e iniciativa, como con la carga por ID. |

## 3. Configuración (una sola vez)

### 3.1 Ronin Developer Console (app Lunakai)
1. **Permiso:** en *Permiso*, el servicio de cuentas aprobado habilita el menú de la cuenta de Sky Mavis (*Ronin Account* / *Sign in with Sky Mavis*). Ahí están el **Client ID** y el **Client Secret**.
2. **URIs de inicio de sesión y de cierre de sesión:** registra estas dos, **con la barra final**:
   - `https://lunakai.stivendev.info/`
   - `http://localhost:8082/` (para pruebas)
3. **Client ID:** va en `src/net/config.js` → `skymavis.clientId`. Es público.
4. **Client Secret y Clave (API key):** **no van en el juego**; van en los secretos de Supabase (paso 3.3). Como la API key estuvo escrita en el código, **genera una nueva**.

### 3.2 Supabase — base de datos (SQL Editor)
1. Si nunca se ejecutó: `supabase/migrations/20261016000000_accounts_and_saves.sql`.
2. La nueva: `supabase/migrations/20261019000000_waypoint_addresses.sql`.

### 3.3 Supabase — funciones y secretos
```bash
supabase login
supabase link --project-ref umujjnazgvxsxfbdjeyb
supabase secrets set SKYMAVIS_CLIENT_ID=<Client ID> SKYMAVIS_CLIENT_SECRET=<Client Secret> \
  SKYMAVIS_API_KEY=<la clave NUEVA> \
  ALLOWED_REDIRECT_URIS="https://lunakai.stivendev.info/,http://localhost:8082/" \
  ALLOWED_ORIGINS="https://lunakai.stivendev.info,http://localhost:8082"
supabase functions deploy skymavis-auth --no-verify-jwt
supabase functions deploy axie-data --no-verify-jwt
```
- **Sin la CLI:** en el panel, **Edge Functions → Deploy a new function**. Pega cada `index.ts`, desactiva *Verify JWT* y añade los secretos en **Edge Functions → Secrets**.
- **Authentication → URL Configuration:** *Site URL* = `https://lunakai.stivendev.info/`.

## 4. Pruebas hechas (simuladas)
- **Flujo del navegador** (12 comprobaciones con Sky Mavis y Supabase simulados):
  - URL de autorización OIDC con `response_type=code`, `client_id`, PKCE S256, `redirect_uri`, `nonce` y `state`;
  - sin secretos en la URL;
  - el canje manda el `code` y el `code_verifier` → sesión;
  - la URL queda limpia;
  - cerrar sesión pasa por el logout de Sky Mavis sin exponer la API key, y la vuelta deja la URL limpia;
  - un `state` manipulado se rechaza.
- **Funciones de servidor:** comprobadas con TypeScript (`tsc`). No se pudieron ejecutar contra Sky Mavis real desde el entorno de desarrollo.

## 5. Prueba real (checklist)
- [ ] En localhost, **Sky Mavis** → inicias sesión → vuelves con tu nombre y tu dirección Ronin en la esquina.
- [ ] **Mis axies** muestra tus Axies; al elegir uno se ve con sus partes y sus cartas.
- [ ] Creas una aventura, recargas, *Continuar* → sigue ahí.
- [ ] **Cerrar sesión** → pasa por Sky Mavis y vuelve al inicio. Al entrar de nuevo, Sky Mavis te pide iniciar sesión.
- [ ] Como invitado, «Cargar un Axie por su ID» sigue funcionando (ahora pasa por `axie-data`).
- [ ] Lo mismo en `https://lunakai.stivendev.info/`.
- [ ] Si algo falla: en **Supabase → Edge Functions → Logs**, la función anota el motivo (`token_exchange_failed`, `id_token_invalid`…).

## 6. Carga por ID con cuenta y nivel/AXP de Sky Mavis (19-oct)
- **Cargar un Axie por su ID también con cuenta de Sky Mavis:**
  - si la cuenta no tiene Axies, «Mis axies» abre directamente la carga por ID;
  - si los tiene, la lista termina con una tarjeta «# Cargar por ID».
- **Nivel y AXP de Sky Mavis en la ficha** (Escuadrón, tecla K): solo informativo; **el nivel de Lunakai es independiente**.
  - `axie-data` pide `axpInfo { level xp xpToLevelUp onchainLevel shouldAscend }`. Si el marketplace no reconociera ese bloque, repite la consulta sin él y el juego funciona igual.
  - La ficha muestra el nivel AXP y la AXP total. También muestra, cuando Sky Mavis los da: la AXP para subir de nivel, el nivel registrado si es distinto y «Lista para ascender».
  - No hay barra de progreso, porque Sky Mavis no documenta si `xpToLevelUp` es lo que falta o el total del nivel.
  - La lista del escuadrón muestra «AXP N» cuando el dato ya se conoce.
  - Bing y Pomodoro no tienen AXP (no son Axies de Sky Mavis).
  - Se quitaron los datos de demostración (`AxpDemo`) de la ficha y de la lista. La pantalla de fin de combate sigue con su AXP de demostración.
- Archivos: `src/rpg/ui/StartScreenUI.js`, `src/rpg/ui/SquadModal.js`, `src/rpg/SaveSlotManager.js` (guarda `axpInfo` al crear la aventura) y `supabase/functions/axie-data/index.ts`. **Hay que volver a desplegar `axie-data`.**

- **Barra de AXP de la victoria (ficticia):**
  - **Punto de partida:** el **nivel real del Axie en Sky Mavis**. Si su nivel real cambia allí, vuelve a partir de él.
  - **No sube más en dos casos:**
    - en el **nivel máximo 60**: «Nivel máximo (60): ya no gana AXP»;
    - en un **tope de evolución**: para pasar de 9→10, 19→20… hay que ascender en Axie Infinity. Con la barra llena, o si Sky Mavis indica `shouldAscend`, no gana AXP: «Tope de evolución: asciende a Nv X en Axie Infinity para seguir ganando AXP».
  - **Sin datos de Sky Mavis** (Bing, Pomodoro, o mientras no llegan): se mantiene la AXP de demostración de antes, también con tope en 60.
  - Sigue marcada como «Demo»: no se envía a Sky Mavis.
  - El juego pide los datos de Sky Mavis del escuadrón al empezar cada combate.
  - Archivos: `src/rpg/ui/CombatEndScreen.js` (`AxpDemo`) y `src/main.js` (`_resolvePartCards`).

## 7. Pendiente
- **Si Sky Mavis pidiera la API key** en la página de autorización, ponerla en `skymavis.authorizeApiKey`. La documentación no la pide.
- **Rendimiento con cuentas de muchos Axies:** de momento se cargan todos (tope de seguridad: 3000).
