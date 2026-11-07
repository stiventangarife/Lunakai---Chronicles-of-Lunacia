# Hito 121: Formulario de feedback

> **Estado:** programado el 3-nov-2026. Sintaxis comprobada con `node --check`. Migración probada en PostgreSQL 16 con un esquema `auth` simulado. Ventana probada en Chrome sin interfaz con el servidor simulado (invitado, Sky Mavis, errores, teclado, velo del tutorial, 1366×768 y 1280×600). **Falta probarlo en el juego real y aplicar la migración en Supabase.**
> **Pedido:** un botón en el menú de abajo a la derecha, antes de Opciones, que abra un formulario sencillo (título, explicación, campo de texto y Enviar). El feedback se guarda en Supabase ligado a «invitado» o a la cuenta de Sky Mavis. Al terminar el tutorial, en lugar del mapa, una tarjeta «¿Te está gustando Lunakai?» con un botón para abrir el formulario.
> **Decisiones del usuario:** el botón funciona durante el tutorial; «Ahora no» no abre el mapa.
> **Reglas respetadas:** sin bundlers; textos por `i18n.t()` en español e inglés; sin cambios en `assets/` (no hace falta subir `ASSET_VERSION`); `GAME_VERSION` sube a 0.4.1.

## 1. Servidor: `supabase/migrations/20261104000000_feedback.sql`

| Pieza | Qué hace |
|---|---|
| Tabla `public.feedback` | `account_kind` (`guest` · `skymavis` · `email`), `user_id`, `guest_id`, `display_name`, `ronin_address`, `source` (`hud` · `tutorial_end`), `message` (5–2000 caracteres), `context` (jsonb, ≤ 4 KB), `ip_hash` (md5 de la IP, solo antispam), `status` (`new` · `read` · `done` · `spam`). |
| RLS | Activada y sin políticas; `revoke all` a `anon` y `authenticated`. Ningún jugador puede leer ni escribir la tabla. Se revisa en el panel de Supabase (Table Editor → `feedback`; marcar `status`). |
| `submit_feedback(p_message, p_source, p_guest_id, p_context)` | `security definer`, la pueden llamar `anon` y `authenticated`. **El tipo de cuenta lo decide el servidor**: con sesión lee `auth_provider`, `display_name` y `ronin_address` de `profiles`; sin sesión es `guest` y exige `p_guest_id`. Antispam: 3 mensajes cada 10 min por cuenta o invitado y 10 cada 10 min por IP. Devuelve `{ok:true,id}` o `{ok:false,error:'too_short'│'too_long'│'missing_guest_id'│'rate_limited'}`. |

Por qué una función y no un insert: los invitados no tienen sesión en Supabase (`AccountManager.enterGuest` solo guarda en local), así que con RLS no podrían escribir; y así el cliente nunca puede declararse «Sky Mavis».

**Aplicar:** `supabase db push` (o pegar el archivo en el SQL Editor). Sin la migración, enviar muestra «No hemos podido enviarlo ahora mismo» y el texto se conserva.

## 2. Cliente

| Qué | Dónde |
|---|---|
| `feedbackService.send({ message, source })`: llama a `/rest/v1/rpc/submit_feedback` con `supabaseFetch`. Con cuenta envía el token (`accountManager.auth.getAccessToken()`); si la sesión no se puede renovar, se envía como invitado para no perder el mensaje. El invitado lleva un `guest_id` aleatorio guardado en `localStorage` (`lunakai_feedback_guest_id`). Contexto: versión, idioma, tierra, paso del tutorial, pantalla, `devicePixelRatio` y navegador (160 caracteres). `sender()` dice quién firma para la interfaz. | `src/net/FeedbackService.js` (nuevo) |
| `FeedbackPanel`: estados `ask` (invitación) → `form` → `sending` → `done`. Contador, «Enviando como: Invitado / Sky Mavis · nombre», Ctrl + Intro para enviar. Error con el texto conservado; cerrar sin enviar también lo conserva; tras enviar se vacía. Esc cierra; fuera del área de texto ninguna tecla llega al juego. `close({ force: true })` lo cierra aunque esté enviando. | `src/ui/FeedbackPanel.js` (nuevo) |
| Botón `#btn-open-feedback` (icono `chat.png`) entre Mapa y Opciones y **tecla F** (ningún otro sistema la usaba): los dos llaman a `om.toggleFeedback()`, que no abre el formulario en combate, con un diálogo, en la cinemática ni encima de otra ventana. En la guía del tutorial `_guideKeyAllowed` deja pasar `KeyF`. La fila «Enviar opinión · F» está en Opciones › Controles. `this.feedbackPanel` cuenta en `isAnyModalOpen()` (el jugador no se mueve). Al empezar un encuentro (`_handleMonsterEncounter`, también los combates del tutorial) el formulario se cierra a la fuerza y conserva el texto. | `src/rpg/OverworldManager.js` |
| Tutorial: con el formulario abierto `_computeGuide` y `_squadGuideVisible` no guían; `_placeSpot` abre un **segundo hueco en el velo** sobre el botón de feedback (si no se solapa con el objetivo), así que se puede pulsar en cualquier paso. La capa del formulario va en z 2147483004, por encima del velo y de la franja. | `src/rpg/tutorial/TutorialDirector.js`, `src/ui/lunakai-ui.css` |
| Final del tutorial: `_graduate()` → tarjeta de graduación → `_askFeedback()` (antes `_openArchipelago()`). Una sola vez por partida (`flags.feedbackAsked`); no sale con «Saltar tutorial». «Ahora no» solo cierra. | `TutorialDirector.js` |
| Estilos: bloque «Hito 121» al final (ventana del sistema de diseño `.lk-backdrop` + `.lk-panel-modal-window`, compactación con `max-height: 700px`, `prefers-reduced-motion`). | `src/ui/lunakai-ui.css` |
| Textos: módulo `feedback` (29 claves) en los dos idiomas, registrado en los `index.js`. | `src/i18n/{es,en}/feedback.js` |

## 3. Pruebas en el juego

1. Aplicar la migración. Entrar como invitado: el botón 💬 (con la etiqueta F) está entre Mapa y Opciones y la tecla F también lo abre; abre el formulario con el cursor en el texto; Enviar se activa a partir de 5 caracteres; enviar → «¡Gracias, Lunaciano!». En Supabase: fila con `account_kind = guest` y `guest_id`.
2. Entrar con Sky Mavis: «Enviando como: Sky Mavis · nombre»; la fila lleva `account_kind = skymavis`, `user_id` y `ronin_address`.
3. Enviar 4 mensajes seguidos: el cuarto avisa de esperar unos minutos y el texto sigue ahí.
4. Escribir W, A, S, D, I, M, E y F en el formulario: el personaje no se mueve ni se abre nada. Esc cierra el formulario (no abre Opciones).
5. Durante el tutorial (p. ej. con la guía señalando la Mochila): el botón 💬 se ve sin velo y abre el formulario; al cerrarlo la guía vuelve.
6. Ganar al Slime Caballero: tras la tarjeta de graduación sale «¿Te está gustando Lunakai?»; «Ahora no» cierra sin abrir el mapa; «Enviar mi opinión» pasa al formulario (fila con `source = tutorial_end`).
7. Ventana a 1280×600: el botón Enviar se ve sin desplazar.

## 4. Consultas útiles en Supabase

```sql
-- últimos mensajes sin leer
select created_at, account_kind, display_name, source, message, context->>'map' as tierra
  from public.feedback where status = 'new' order by created_at desc;
-- marcar como leído
update public.feedback set status = 'read' where id = 123;
```

## 5. Pendiente

- Probarlo en el juego real y aplicar la migración en el proyecto de Supabase. **[Aplicada · revisión del 7-nov-2026: la migración está aplicada en Supabase y funciona.]**
