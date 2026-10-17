# Hito 25: Cuentas (Sign in with Sky Mavis + correo) y guardado en la nube

> **Estado:** código listo y probado. Falta la configuración (Supabase + Ronin Developer Console), que hace el dueño del proyecto.
> **Requisito cubierto:** *Accounts and onboarding* de la Ronda 2 de la Vibeathon.

## 1. Qué se construyó

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Base de datos | `supabase/migrations/20261016000000_accounts_and_saves.sql` | Tablas `profiles` y `save_slots` con RLS (cada jugador ve solo lo suyo) y la función `save_slot` con control de versión. |
| Inicio con Sky Mavis | `supabase/functions/skymavis-auth/index.ts` | Canjea el código OAuth (Authorization Code + PKCE) con el *client secret*, valida el `id_token` (JWKS, `iss`, `aud`, `nonce`), crea o vincula la cuenta y devuelve una sesión de Supabase. |
| Configuración pública | `src/net/config.js` | URL y clave *anon* de Supabase, Client ID de Sky Mavis. |
| Sesión | `src/net/AuthService.js` | Sky Mavis (redirección + PKCE), correo con código de 6 dígitos, renovación del token, cierre de sesión. Sin librerías: REST con `fetch`. |
| Guardado en la nube | `src/net/CloudSave.js` | Sube las ranuras con *debounce*, reintenta sin red, resuelve conflictos entre dispositivos. |
| Orquestador | `src/net/AccountManager.js` | Une sesión, ranuras y nube; modo invitado; subir aventuras de invitado a la cuenta. |
| Indicador | `src/net/SaveStatusChip.js` + `src/ui/lunakai-auth.css` | "Guardado en la nube" / "Guardando…" / "Sin conexión" / "No se pudo guardar · Reintentar". |
| Integración | `SaveSlotManager.js`, `StartScreenUI.js`, `main.js`, `index.html` | Caché local por cuenta, pantalla de inicio real, indicador en partida. |
| Seguridad | `server.js` | `/api/save-*` solo acepta peticiones desde la propia máquina y no escribe fuera del proyecto. |

## 2. Cómo cumple la guía de la Ronda 2

- **Acceso a la cuenta:** la pantalla de inicio explica que la cuenta guarda el progreso. Sky Mavis o correo; la primera entrada crea el perfil sola (sin segundo registro). Errores claros con *Reintentar* y *Volver al inicio*.
- **Guardado:** las ranuras se guardan por jugador autenticado en Supabase; `localStorage` es solo caché. El indicador muestra si se guardó o si falló.
- **Volver:** la sesión se restaura y se renueva sola; la selección ofrece *Continuar aventura*. *Cerrar sesión* y *Cambiar de cuenta* limpian la caché local de esa cuenta. Si hay cambios sin subir, pregunta antes de cerrar.
- **Caída del servicio:** si no se puede verificar la sesión, no se entra a la cuenta (se ofrece *Reintentar* o *Jugar como invitado*).
- **Sin billetera:** jugar no exige billetera, compra ni firma.
- **Invitado:** progreso local; al vincular una cuenta se ofrece subirlo (si no cabe, se elige entre "solo las que caben" o "reemplazar").

## 3. Configuración (una sola vez)

### 3.1 Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pega y ejecuta `supabase/migrations/20261016000000_accounts_and_saves.sql`.
3. **Authentication → Providers → Email:** activado. **Authentication → Email Templates → Magic Link:** el cuerpo debe incluir `{{ .Token }}` (el código de 6 dígitos), por ejemplo: `Tu código de Lunakai es: {{ .Token }}`.
4. **Authentication → URL Configuration:** *Site URL* = la URL pública del juego.
5. **Project Settings → API:** copia *Project URL* y la clave *anon/publishable* en `src/net/config.js`.
6. Para producción, configura un SMTP propio (el de Supabase tiene un límite bajo de correos por hora).

### 3.2 Ronin Developer Console (Sign in with Sky Mavis)
1. [developers.roninchain.com/console](https://developers.roninchain.com/console/applications/) → crea o elige tu app.
2. **App Permission → Waypoint Account Service → Request Access** y espera la aprobación (aparece el menú *Ronin Account*).
3. En *Ronin Account*: genera el **Client Secret**; anota el **Client ID** y la **API key**.
4. **Sign-in URIs:** añade la URL pública del juego **con barra final** (p. ej. `https://lunakai.vercel.app/`) y `http://localhost:8082/` para pruebas. Guarda.
5. Pon el Client ID en `src/net/config.js` (`skymavis.clientId`).

### 3.3 Edge Function
Con la CLI de Supabase (`npx supabase` o instalada):
```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set SKYMAVIS_CLIENT_ID=... SKYMAVIS_CLIENT_SECRET=... SKYMAVIS_API_KEY=... \
  ALLOWED_REDIRECT_URIS="https://lunakai.vercel.app/,http://localhost:8082/"
supabase functions deploy skymavis-auth --no-verify-jwt
```
`--no-verify-jwt` es necesario: el jugador aún no tiene sesión cuando llama a la función.
Sin CLI: Dashboard → **Edge Functions → Deploy a new function**, pega `index.ts`, desactiva *Verify JWT* y añade los secretos en **Edge Functions → Secrets**.

## 4. Pruebas manuales (checklist)
- [ ] Correo nuevo → recibe código → entra → crea aventura → recarga → *Continuar* la muestra.
- [ ] Mismo correo en otro navegador → ve la misma aventura.
- [ ] Sky Mavis → vuelve al juego con su nombre / dirección Ronin en la esquina.
- [ ] Invitado con una aventura → *Vincular cuenta* → acepta subirla → aparece en la cuenta.
- [ ] Modo avión durante la partida → indicador "Sin conexión" → al volver, "Guardado en la nube".
- [ ] *Cerrar sesión* → la pantalla vuelve al inicio y las aventuras de esa cuenta ya no se ven.
- [ ] Recarga con la red cortada y sesión guardada → "No pudimos verificar tu sesión" (no entra a la cuenta).

## 5. Pruebas automáticas hechas
- SQL ejecutado en PostgreSQL 16 con un esquema `auth` simulado: versiones, conflictos, permisos por columna, aislamiento entre jugadores y rechazo sin sesión.
- 28 casos de cliente en Node con un Supabase simulado: correo, invitado → cuenta, *debounce*, conflictos en ambos sentidos, sin red y reintento, cierre de sesión con pendientes, regreso, caída del servicio, PKCE, `state` manipulado y cancelación en Sky Mavis.
- La Edge Function no se pudo ejecutar contra Sky Mavis real desde el entorno de desarrollo; se valida con la checklist del punto 4.

## 6. Pendiente / siguientes pasos
- Si el endpoint de autorización de Sky Mavis pide la API key en la URL, ponla en `skymavis.authorizeApiKey`.
- Cargar los axies propios del jugador (`setOwnedAxies`) con su dirección Ronin, junto con el sistema de habilidades por partes.
- Usar `profiles.has_completed_intro` para saltar el prólogo en aventuras nuevas de jugadores que ya lo vieron.
