// StartScreenUI.js - Title & Save Slots Screen with Sapidae Customization & Companion Axie Selection
import { saveSlotManager, HERO_ROSTER, SAPIDAE_CLASSES } from '../SaveSlotManager.js';
import { portraitService } from '../../tactics/CharacterPortraitService.js';
import {
  HORN_STYLES,
  HORN_COLORS,
  EYE_SHAPES,
  PUPIL_COLORS,
  HAIR_STYLES,
  HAIR_COLORS,
  SUIT_COLORS
} from '../SapidaeModularController.js';
import { CharacterPreviewDiorama } from './CharacterPreviewDiorama.js';
import { sprite, toast, tooltip, esc } from '../../ui/lk.js';
import { accountManager } from '../../net/AccountManager.js';

// Creación de personaje (etapa 5)
const CC_STEPS = ['Clase', 'Apariencia', 'Compañero', 'Nombre'];
const CC_STARTERS = ['beast_rage', 'bird_early'];
const CC_COLORS = { crafter: '#C98A3B', shepard: '#E86AB0', lunalogist: '#5BB6C9', stargazer: '#8A6CE0' };
const CC_ICON = (n) => `./assets/ui/icons/${n}.png`;
const CC_PART_CLASSES = ['beast', 'bird', 'plant', 'aquatic', 'bug', 'reptile'];

export const RANDOM_NAMES = [
  'Ema', 'Lunara', 'Vael', 'Kaelen', 'Zephyr', 'Solis', 'Nyx', 'Astrid',
  'Tatsumi', 'Sylas', 'Orion', 'Caelum', 'Lyra', 'Mira', 'Riven', 'Thorne',
  'Aeron', 'Kael', 'Finn', 'Elowen', 'Bryn', 'Kaelis'
];

export function getAxieClassIcon(cls) {
  const s = String(cls || '').toLowerCase();
  if (s.includes('bestia') || s.includes('beast')) return 'assets/classes/beast.png';
  if (s.includes('pájaro') || s.includes('pajaro') || s.includes('bird')) return 'assets/classes/bird.png';
  if (s.includes('planta') || s.includes('plant')) return 'assets/classes/plant.png';
  if (s.includes('acu') || s.includes('aquatic')) return 'assets/classes/aquatic.png';
  if (s.includes('bicho') || s.includes('bug')) return 'assets/classes/bug.png';
  if (s.includes('reptil') || s.includes('reptile')) return 'assets/classes/reptile.png';
  return 'assets/classes/beast.png';
}

export const CLASS_PORTRAITS = {
  crafter: './assets/classes/class_forjacubiles.jpg',
  shepard: './assets/classes/class_susurrador.jpg',
  lunalogist: './assets/classes/class_lunalogista.jpg',
  stargazer: './assets/classes/class_astromante.jpg'
};

export const AXIE_BODY_PARTS = [
  { id: 'eyes', name: 'Eyes', icon: './assets/parts/beast-eyes.png' },
  { id: 'ears', name: 'Ears', icon: './assets/parts/beast-ears.png' },
  { id: 'mouth', name: 'Mouth', icon: './assets/parts/beast-mouth.png' },
  { id: 'horn', name: 'Horn', icon: './assets/parts/beast-horn.png' },
  { id: 'back', name: 'Back', icon: './assets/parts/beast-back.png' },
  { id: 'tail', name: 'Tail', icon: './assets/parts/beast-tail.png' }
];

export const AXIE_BODY_PARTS_MAP = {
  eyes: { name: 'Eyes', icon: './assets/parts/beast-eyes.png' },
  ears: { name: 'Ears', icon: './assets/parts/beast-ears.png' },
  mouth: { name: 'Mouth', icon: './assets/parts/beast-mouth.png' },
  horn: { name: 'Horn', icon: './assets/parts/beast-horn.png' },
  back: { name: 'Back', icon: './assets/parts/beast-back.png' },
  tail: { name: 'Tail', icon: './assets/parts/beast-tail.png' }
};

export const ITEM_ICONS = {
  hair: {
    braids: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="22" r="13" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M12 21C12 14.5 17 10 24 10C31 10 36 14.5 36 21C34 19 30 17 24 17C18 17 14 19 12 21Z" fill="#fbbf24"/>
        <path d="M18 10C22 14 26 15 32 16" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 21C11 25 10 30 11 36C12 37 14 37 14 35C14 33 13 28 15 24Z" fill="#fbbf24"/>
        <circle cx="11.5" cy="28" r="3" fill="#f59e0b"/>
        <circle cx="12" cy="33" r="2.5" fill="#f59e0b"/>
        <rect x="9.5" y="34" width="4" height="2" rx="1" fill="#ef4444"/>
        <path d="M34 21C37 25 38 30 37 36C36 37 34 37 34 35C34 33 35 28 33 24Z" fill="#fbbf24"/>
        <circle cx="36.5" cy="28" r="3" fill="#f59e0b"/>
        <circle cx="36" cy="33" r="2.5" fill="#f59e0b"/>
        <rect x="34.5" y="34" width="4" height="2" rx="1" fill="#ef4444"/>
      </svg>
    `,
    short: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="23" r="13" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M11 22C11 13 16 9 24 9C32 9 37 13 37 22C35 21 34 18 31 18C28 18 27 20 23 18C19 16 16 19 11 22Z" fill="#fbbf24"/>
        <path d="M11 22L13 27L16 23L19 28L23 21L27 27L31 21L35 26L37 21" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 12C21 10 28 11 31 15" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    bun: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="25" r="12" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <circle cx="24" cy="11" r="7" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
        <path d="M21 9C23 7 26 7 27 9" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
        <line x1="16" y1="14" x2="32" y2="8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="32" cy="8" r="2" fill="#facc15"/>
        <path d="M12 24C12 17 18 14 24 14C30 14 36 17 36 24C33 21 29 20 24 20C19 20 15 21 12 24Z" fill="#fbbf24"/>
      </svg>
    `,
    long: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 22C10 28 10 36 13 41C15 42 17 40 16 35C15 30 15 25 15 22Z" fill="#d97706"/>
        <path d="M37 22C38 28 38 36 35 41C33 42 31 40 32 35C33 30 33 25 33 22Z" fill="#d97706"/>
        <circle cx="24" cy="22" r="12" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <path d="M12 20C12 13 17 9 24 9C31 9 36 13 36 20C34 18 29 16 24 16C19 16 14 18 12 20Z" fill="#fbbf24"/>
        <path d="M13 20C13 25 14 31 16 36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <path d="M35 20C35 25 34 31 32 36" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `
  },
  eyes: {
    round: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(4, 0)">
          <ellipse cx="12" cy="24" rx="8" ry="9" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="12" cy="24" r="5.5" fill="#0284c7"/>
          <circle cx="12" cy="24" r="3" fill="#0f172a"/>
          <circle cx="14" cy="22" r="1.8" fill="#ffffff"/>
          <path d="M5 19C8 16 16 16 19 19" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
          <ellipse cx="28" cy="24" rx="8" ry="9" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="28" cy="24" r="5.5" fill="#0284c7"/>
          <circle cx="28" cy="24" r="3" fill="#0f172a"/>
          <circle cx="30" cy="22" r="1.8" fill="#ffffff"/>
          <path d="M21 19C24 16 32 16 35 19" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,
    medium: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(4, 0)">
          <path d="M4 25C7 20 17 20 20 25C17 29 7 29 4 25Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="12" cy="25" rx="4.5" ry="4" fill="#0284c7"/>
          <circle cx="12" cy="25" r="2.2" fill="#0f172a"/>
          <circle cx="13.5" cy="23.5" r="1.3" fill="#ffffff"/>
          <path d="M4 22C8 19 16 19 20 22" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M20 25C23 20 33 20 36 25C33 29 23 29 20 25Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="28" cy="25" rx="4.5" ry="4" fill="#0284c7"/>
          <circle cx="28" cy="25" r="2.2" fill="#0f172a"/>
          <circle cx="29.5" cy="23.5" r="1.3" fill="#ffffff"/>
          <path d="M20 22C24 19 32 19 36 22" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `,
    almond: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(4, 0)">
          <path d="M3 26C8 19 16 20 21 24C16 28 8 28 3 26Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="12.5" cy="24.5" rx="4" ry="3.5" fill="#0284c7"/>
          <ellipse cx="12.5" cy="24.5" rx="1.8" ry="3" fill="#0f172a"/>
          <circle cx="14" cy="23" r="1.2" fill="#ffffff"/>
          <path d="M3 24C9 18 17 19 22 23" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M19 24C24 20 32 19 37 26C32 28 24 28 19 24Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="27.5" cy="24.5" rx="4" ry="3.5" fill="#0284c7"/>
          <ellipse cx="27.5" cy="24.5" rx="1.8" ry="3" fill="#0f172a"/>
          <circle cx="29" cy="23" r="1.2" fill="#ffffff"/>
          <path d="M18 23C23 19 31 18 37 24" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `
  },
  horns: {
    base: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 32C15 25 10 18 8 13C12 15 17 21 19 27C20 30 19 32 17 32Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
        <path d="M31 32C33 25 38 18 40 13C36 15 31 21 29 27C28 30 29 32 31 32Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.5"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    beast: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 33C13 30 7 24 4 17C9 18 16 23 20 29Z" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
        <path d="M31 33C35 30 41 24 44 17C39 18 32 23 28 29Z" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
        <path d="M6 19C11 23 15 27 18 31" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <path d="M42 19C37 23 33 27 30 31" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    spiral: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 30C15 25 11 23 8 25C5 27 6 32 10 34C13 35 17 33 18 30Z" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <path d="M12 25C15 27 16 31 15 33" stroke="#fef08a" stroke-width="1.5"/>
        <path d="M30 30C33 25 37 23 40 25C43 27 42 32 38 34C35 35 31 33 30 30Z" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
        <path d="M36 25C33 27 32 31 33 33" stroke="#fef08a" stroke-width="1.5"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    dragon: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 32L12 23L14 22L7 11L14 17L16 15L20 28Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.5"/>
        <path d="M30 32L36 23L34 22L41 11L34 17L32 15L28 28Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1.5"/>
        <path d="M10 15L15 21" stroke="#c084fc" stroke-width="2"/>
        <path d="M38 15L33 21" stroke="#c084fc" stroke-width="2"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    astral: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 32C16 23 13 16 9 10C14 13 18 20 20 28Z" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5"/>
        <path d="M30 32C32 23 35 16 39 10C34 13 30 20 28 28Z" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5"/>
        <path d="M24 10L25.5 14L29.5 15.5L25.5 17L24 21L22.5 17L18.5 15.5L22.5 14Z" fill="#fef08a" stroke="#f59e0b" stroke-width="1"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `,
    deer: `
      <svg class="dofus-item-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 32C18 26 15 20 12 15M15 20L10 19M13 17L14 11M16 23L19 19" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M29 32C30 26 33 20 36 15M33 20L38 19M35 17L34 11M32 23L29 19" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="24" cy="34" r="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      </svg>
    `
  }
};

/**
 * BUILD DE PRUEBA: solo se puede jugar como invitado (sin Sky Mavis ni correo).
 * Para volver a activar las cuentas, pon `false` aquí; no hay que tocar nada más.
 */
export const GUEST_ONLY = true;

export class StartScreenUI {
  constructor(options = {}) {
    this.audio = options.audio || null;
    this.onStartAdventure = options.onStartAdventure || (() => {});

    this.container = null;
    this.heroSelectModal = null;
    this.confirmModal = null;
    this.pendingSlotId = null;
    this.diorama = null;

    // Wizard & Customization state
    this.currentWizardStep = 1;
    this.playerName = 'Ema';
    this.selectedSapidaeModel = 'sapidae-f-a';
    this.selectedSapidaeClass = 'crafter';
    this.selectedCompanionKey = 'beast_rage';
    this.customization = {
      useOriginalTextures: true,
      hair: 'original',
      hairStyle: 'braids',
      eyes: 'original',
      eyeShape: 'round',
      suitColor: 'original',
      shirt: 'original',
      pants: 'original',
      horns: 'base',
      hornColor: 'original',
      hasHat: false,
      hatColor: 'original'
    };

    this.isOpen = true;
    this._createDOM();
    this.refreshSlots();

    // Listen to portrait service updates to refresh slot and hero avatars in real time
    portraitService.addListener(() => {
      if (this.isOpen) {
        this.refreshSlots();
        if (this.heroSelectModal && !this.heroSelectModal.classList.contains('hidden')) {
          if (this.ccStep === 3) {
            this._ccRenderAxie();
          }
        }
      }
    });
  }

  // ===================================================================================
  // Inicio de sesión + selección de aventura (Crónica Celeste, etapa 4)
  // Pantallas 10 y 11 del sistema de diseño con las clases lk- de src/ui/ds.generated.css.
  // El estudio de creación (#hero-select-modal) se rediseña en la etapa 5.
  // ===================================================================================
  _createDOM() {
    const I = (n) => `./assets/ui/icons/${n}.png`;
    const SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.8l7.5 3v5.6c0 4.7-3.2 8.4-7.5 9.8-4.3-1.4-7.5-5.1-7.5-9.8V5.8z"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke-linecap="round"/></svg>';
    const MOON = '<svg class="lk-moon-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a9 9 0 1 0 6 15.7A7.5 7.5 0 1 1 15 3z" fill="currentColor"/></svg>';
    const lang = this._getLang();
    const langSeg = (cls) => `<div class="lk-segmented ${cls}" data-ref="lang"><button aria-pressed="${lang === 'es'}" data-v="es">ES</button><button aria-pressed="${lang === 'en'}" data-v="en">EN</button></div>`;

    // 1. Pantalla de inicio (login + selección), a pantalla completa
    const root = document.createElement('div');
    root.id = 'start-screen-overlay';
    root.className = 'lk-ui lk-screen lk-start';
    root.dataset.view = 'login';
    root.innerHTML = `
      <div class="lk-vista lk-vista--night"><div class="lk-mt lk-mt1"></div><div class="lk-mt lk-mt2"></div><div class="lk-haze"></div><div class="lk-mt lk-mt3"></div></div>
      ${this._skySVG()}

      <section class="lk-start__login" aria-label="Inicio de sesión">
        <div class="lk-lang-mini">${langSeg('')}</div>
        <div class="lk-login">
          <img class="lk-login__logo" src="./assets/ui/brand/lunakai-logo.webp" alt="Lunakai: Chronicles of Lunacia">
          <div class="lk-login__card" data-ref="loginCard" data-state="idle">
            <h3 class="lk-idle">Bienvenido a Lunacia</h3>
            <p class="lk-idle">Tu cuenta guarda tu progreso en la nube: sigue tu aventura en cualquier dispositivo. Si ya tienes cuenta de Sky Mavis, no necesitas registrarte otra vez.</p>
            <button class="lk-btn-sso lk-idle" data-act="sso"><span class="lk-ico">${SHIELD}</span><span><b>Continuar con Sky Mavis</b><small>Cuenta de Sky Mavis · Ronin</small></span><span class="lk-arr">→</span></button>
            <button class="lk-btn lk-btn-secondary-wood lk-email-btn lk-idle" data-act="emailStart"><span class="lk-b-ico"><img class="lk-ai" src="${I('mail')}" alt=""></span>Entrar con correo electrónico</button>
            <ul class="lk-perks lk-idle"><li>Progreso en la nube</li><li>Sin billetera ni compras</li><li>Sin frases semilla</li></ul>
            <div class="lk-or lk-idle">o</div>
            <button class="lk-btn lk-btn-secondary-wood lk-guest lk-idle" data-act="guest"><span class="lk-b-ico"><img class="lk-ai" src="${I('friend')}" alt=""></span>Jugar como invitado</button>
            <small class="lk-guest-note lk-idle">Empiezas con un axie inicial y el progreso se guarda solo en este dispositivo. Podrás vincular tu cuenta más tarde sin perderlo.</small>
            <form class="lk-login__email" data-ref="emailForm" novalidate>
              <button type="button" class="lk-text-btn lk-login__back" data-act="emailBack"><span aria-hidden="true">‹</span> Volver</button>
              <span class="lk-login__seal"><img class="lk-ai" src="${I('mail')}" alt=""></span>
              <b>Entrar con correo</b>
              <p>Te enviaremos un enlace para entrar. Si es tu primera vez, tu cuenta se crea sola.</p>
              <label class="lk-login__label" for="lk-email-input">Correo electrónico</label>
              <input class="lk-input" id="lk-email-input" type="email" name="email" data-ref="emailInput" placeholder="tu@correo.com" autocomplete="email" autocapitalize="off" spellcheck="false" required>
              <small class="lk-login__msg" data-ref="emailMsg" role="alert"></small>
              <button type="submit" class="lk-btn lk-btn-primary-gold lk-login__cta" data-ref="emailSend"><span class="lk-b-ico"><img class="lk-ai" src="${I('mail')}" alt=""></span><span data-ref="emailSendTxt">Enviarme el enlace</span></button>
            </form>
            <form class="lk-login__code" data-ref="codeForm" novalidate>
              <button type="button" class="lk-text-btn lk-login__back" data-act="emailStart"><span aria-hidden="true">‹</span> Cambiar correo</button>
              <span class="lk-login__seal lk-is-sent"><img class="lk-ai" src="${I('mail')}" alt=""><i>✓</i></span>
              <b>Revisa tu correo</b>
              <p>Enviamos un enlace a <strong class="lk-login__addr" data-ref="codeEmail"></strong>. Ábrelo en este navegador y entrarás sin hacer nada más.</p>
              <div class="lk-login__waiting">${MOON}<span>Esperando que abras el enlace…</span></div>
              <a class="lk-btn lk-btn-secondary-wood lk-btn--sm lk-login__mailapp" data-ref="mailApp" href="#" target="_blank" rel="noopener" hidden><span class="lk-b-ico"><img class="lk-ai" src="${I('share')}" alt=""></span><span data-ref="mailAppTxt">Abrir el correo</span></a>
              <div class="lk-or">¿Trae un código?</div>
              <label class="lk-otp" data-ref="otp">
                <input type="text" name="code" data-ref="codeInput" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" aria-label="Código de 6 dígitos" required>
                <span class="lk-otp__cells" aria-hidden="true">${'<i></i>'.repeat(6)}</span>
              </label>
              <small class="lk-login__msg" data-ref="codeMsg" role="alert"></small>
              <button type="submit" class="lk-btn lk-btn-primary-gold lk-login__cta" data-ref="codeSend" disabled><span class="lk-b-ico"><img class="lk-ai" src="${I('tick')}" alt=""></span>Entrar con el código</button>
              <p class="lk-login__resend">¿No llegó? Mira en spam o <button type="button" class="lk-text-btn" data-act="emailResend" data-ref="resendBtn">reenvíalo</button></p>
            </form>
            <div class="lk-login__wait">${MOON}<b data-ref="waitTitle">Conectando con Sky Mavis…</b><p data-ref="waitText">Te llevamos a la página de inicio de sesión de Sky Mavis.</p><button class="lk-text-btn" data-act="ssoCancel">Cancelar</button></div>
            <div class="lk-login__err"><span class="lk-err-ring">!</span><b data-ref="errTitle">No pudimos conectar</b><p data-ref="errText">La ventana de inicio de sesión se cerró o no hubo respuesta. Tu progreso no se ha perdido.</p><div class="lk-acts"><button class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="retry"><span class="lk-b-ico"><img class="lk-ai" src="${I('replay')}" alt=""></span>Reintentar</button><button class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="guest"><span class="lk-b-ico"><img class="lk-ai" src="${I('friend')}" alt=""></span>Jugar como invitado</button></div><button class="lk-text-btn" data-act="errBack">Volver al inicio</button></div>
            <div class="lk-login__ok"><span class="lk-ok-ring">✓</span><b>Sesión iniciada</b><span class="lk-wallet-chip" data-ref="wallet"></span><p data-ref="okText">Cargando tus aventuras…</p></div>
          </div>
          <div class="lk-login__foot"><span class="lk-on">Lunacia en línea</span><span>Demo 1 (Build V0.2.0)</span></div>
        </div>
      </section>

      <section class="lk-start__select" aria-label="Selección de aventura">
        <header class="lk-sel-top">
          <img class="lk-lg" src="./assets/ui/brand/lunakai-logo.webp" alt="Lunakai">
          ${langSeg('')}
          <div class="lk-start__acct"><button class="lk-acct" data-ref="acct" aria-haspopup="menu"></button>
            <div class="lk-kmenu" data-ref="acctMenu" role="menu"><button data-act="switchAccount">Cambiar de cuenta</button><button data-act="logout">Cerrar sesión</button></div></div>
          <button class="lk-btn-circle-icon" data-act="options" aria-label="Opciones"><img class="lk-ai" src="${I('setting')}" alt=""></button>
        </header>
        <div class="lk-guest-banner" data-ref="guestBanner" hidden><img class="lk-ai" src="${I('info')}" alt="">Juegas como invitado: tus aventuras se guardan solo en este dispositivo.<button class="lk-btn lk-btn-moon lk-btn--sm" data-act="link"><span class="lk-b-ico" style="width:28px;height:28px">${SHIELD.replace('<svg ', '<svg style="width:16px;height:16px" ')}</span>Vincular cuenta</button></div>
        <div class="lk-guest-banner lk-sync-banner" data-ref="syncBanner" hidden><img class="lk-ai" src="${I('info')}" alt=""><span data-ref="syncText">No pudimos sincronizar con la nube. Se muestran las aventuras guardadas en este dispositivo y se reintentará solo.</span><button class="lk-btn lk-btn-moon lk-btn--sm" data-act="syncRetry">Reintentar</button></div>
        <div class="lk-sel-body">
          <div class="lk-sel-head"><h3>Elige tu aventura</h3><small><kbd>←</kbd><kbd>→</kbd> elegir · <kbd>Enter</kbd> jugar</small></div>
          <div class="lk-slots" id="start-slots-grid" role="listbox" aria-label="Ranuras de aventura"></div>
        </div>
        <div class="lk-sel-foot"><div class="lk-sel-summary" data-ref="summary"></div><button class="lk-btn lk-btn-primary-gold lk-btn--lg" data-act="play"><span class="lk-b-ico" data-ref="playIco"></span><span data-ref="playTxt">Continuar aventura</span></button></div>
        <div class="lk-sel-legal"><span>Demo 1 (Build V0.2.0) · Sistema táctico Sapidae de 4 clases</span></div>
      </section>

      <div class="lk-confirm" id="lk-delete-confirm" role="alertdialog" aria-labelledby="lk-del-title">
        <div class="lk-confirm__card">
          <h4 id="lk-del-title">¿Eliminar esta aventura?</h4>
          <p data-ref="delText"></p>
          <span class="lk-warn">No se puede deshacer. Tus axies y su AXP no se ven afectados.</span>
          <div class="lk-acts"><button class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="delCancel"><span class="lk-b-ico">${sprite('i-close')}</span>Cancelar</button><button class="lk-btn lk-btn-danger-red lk-btn--sm lk-hold" data-act="delHold"><span class="lk-fill"></span><span class="lk-b-ico"><img class="lk-ai" src="${I('trash')}" alt=""></span>Mantén pulsado para eliminar</button></div>
        </div>
      </div>

      <div class="lk-confirm lk-acct-dialog" data-ref="acctDialog" role="alertdialog" aria-labelledby="lk-acct-title">
        <div class="lk-confirm__card">
          <h4 id="lk-acct-title" data-ref="acctDialogTitle"></h4>
          <p data-ref="acctDialogText"></p>
          <div class="lk-acts" data-ref="acctDialogActs"></div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    this.container = root;
    this.confirmModal = root.querySelector('#lk-delete-confirm');
    this._ref = (n) => root.querySelector(`[data-ref="${n}"]`);
    if (GUEST_ONLY) {
      // Build de prueba: la tarjeta solo ofrece jugar como invitado (CSS: .lk-guest-only en lunakai-auth.css)
      root.classList.add('lk-guest-only');
      const card = this._ref('loginCard');
      const intro = card.querySelector(':scope > p.lk-idle');
      if (intro) intro.textContent = 'Versión de prueba: entra como invitado. Tu progreso se guarda en este dispositivo.';
      const note = card.querySelector('.lk-guest-note');
      if (note) note.textContent = 'Empiezas con un axie inicial. Las cuentas en la nube llegarán en una próxima versión.';
      const guestBtn = card.querySelector('.lk-guest');
      if (guestBtn) guestBtn.classList.replace('lk-btn-secondary-wood', 'lk-btn-primary-gold');
    }
    this._selectedSlot = null;

    // 2. Sapidae Customization Studio (Dofus Unity Style) — etapa 5
    const heroModal = document.createElement('div');
    heroModal.id = 'hero-select-modal';
    heroModal.className = 'lk-ui lk-cc-layer hidden';
    heroModal.innerHTML = '<div class="lk-screen lk-cc-screen" id="dofus-studio-container" role="dialog" aria-label="Creación de personaje"></div>';
    document.body.appendChild(heroModal);
    this.heroSelectModal = heroModal;


    this._setupEventListeners();
    this._setupStartScreen();

    // Cuenta: procesa el retorno de Sky Mavis o restaura la sesión guardada (o la del invitado).
    this.bootPromise = this.bootAccount();
  }

  /** Cielo nocturno con estrellas y constelaciones que titilan (componente del sistema de diseño). */
  _skySVG() {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const CONST = [
      [[90, 70], [150, 40], [215, 85], [270, 60], [320, 120]],
      [[640, 60], [700, 110], [760, 80], [800, 150], [745, 190], [700, 110]],
      [[430, 150], [470, 105], [520, 140], [560, 95]],
      [[860, 230], [905, 190], [950, 240], [915, 280]]];
    const spark = (x, y, r) => `M${x} ${y - r}C${x + r * .18} ${y - r * .18} ${x + r * .18} ${y - r * .18} ${x + r} ${y}C${x + r * .18} ${y + r * .18} ${x + r * .18} ${y + r * .18} ${x} ${y + r}C${x - r * .18} ${y + r * .18} ${x - r * .18} ${y + r * .18} ${x - r} ${y}C${x - r * .18} ${y - r * .18} ${x - r * .18} ${y - r * .18} ${x} ${y - r}Z`;
    let svg = '<svg class="lk-sky" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="shootGrad" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#A9CCFF" stop-opacity="0"/></linearGradient></defs>';
    for (let i = 0; i < 90; i++) svg += `<circle class="lk-st" cx="${rnd(0, 1000).toFixed(0)}" cy="${(Math.pow(Math.random(), 1.4) * 330).toFixed(0)}" r="${rnd(0.6, 1.7).toFixed(2)}" style="--d:${rnd(2.2, 5.5).toFixed(2)}s;--dl:-${rnd(0, 5).toFixed(2)}s"/>`;
    CONST.forEach((pts, ci) => {
      svg += `<polyline class="lk-cl" points="${pts.map((p) => p.join(',')).join(' ')}" style="--dl:-${ci * 1.7}s"/>`;
      pts.forEach(([x, y], i) => {
        if (pts.findIndex((q) => q[0] === x && q[1] === y) !== i) return;
        svg += `<path class="lk-sp" d="${spark(x, y, i % 2 ? 6 : 8.5)}" style="--d:${rnd(3, 5.5).toFixed(2)}s;--dl:-${rnd(0, 4).toFixed(2)}s"/>`;
      });
    });
    svg += `<line class="lk-shoot" x1="820" y1="40" x2="900" y2="0" style="--dl:${rnd(1, 4).toFixed(1)}s"/><line class="lk-shoot" x1="420" y1="70" x2="500" y2="30" style="--dl:${rnd(5, 8).toFixed(1)}s"/></svg>`;
    return svg;
  }

  // ---------------------------------------------------------------- sesión e idioma
  /** Sesión actual para la interfaz: { mode: 'guest' | 'skymavis' | 'email', name, ... } o null. */
  _getSession() { return accountManager.getSessionView(); }
  _getLang() { try { return JSON.parse(localStorage.getItem('axie_lk_prefs') || '{}').lang || 'es'; } catch { return 'es'; } }
  _setLang(v) {
    try { const p = JSON.parse(localStorage.getItem('axie_lk_prefs') || '{}'); p.lang = v; localStorage.setItem('axie_lk_prefs', JSON.stringify(p)); } catch { /* nada */ }
    this.container.querySelectorAll('[data-ref="lang"] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    toast(v === 'en' ? 'Language: English' : 'Idioma: español');
  }

  _setLoginState(st) { this._ref('loginCard').dataset.state = st; }

  // ---------------------------------------------------------------- cuentas

  /** Arranque: retorno de Sky Mavis, sesión guardada, invitado recordado o pantalla de inicio de sesión. */
  async bootAccount() {
    const root = this.container;
    root.dataset.view = 'login';
    if (GUEST_ONLY || !accountManager.configured) {
      // Sin backend configurado: el juego sigue funcionando en modo local.
      if (accountManager.wasGuest()) { accountManager.enterGuest(); this._showSelect(this._getSession(), false); }
      else this._setLoginState('idle');
      return;
    }

    const isCallback = /[?&](code|error)=/.test(window.location.search) || /access_token=|error_code=/.test(window.location.hash);
    if (isCallback || this._hasStoredAuth()) {
      this._setWait('Verificando tu cuenta…', isCallback ? 'Terminando el inicio de sesión con Sky Mavis.' : 'Recuperando tu sesión y tus aventuras.');
    }

    let res;
    try { res = await accountManager.boot(); } catch (err) { res = { status: 'signed_out', error: err }; }

    if (res.status === 'signed_in') { await this._afterSignIn(res); return; }

    if (res.status === 'unverified') {
      this._lastRetry = 'boot';
      this._showError('No pudimos verificar tu sesión', `${accountManager.describeError(res.error)} No entraremos a tu cuenta hasta poder comprobarla.`);
      return;
    }

    if (res.error) {
      this._lastRetry = 'sso';
      this._showError(res.error.code === 'session_expired' ? 'Tu sesión caducó' : 'No pudimos iniciar sesión', accountManager.describeError(res.error));
      return;
    }

    if (accountManager.wasGuest()) { accountManager.enterGuest(); this._showSelect(this._getSession(), false); return; }
    this._setLoginState('idle');
  }

  _hasStoredAuth() { try { return Boolean(localStorage.getItem('lunakai_auth_v1')); } catch { return false; } }

  _setWait(title, text, cancellable = false) {
    this._ref('waitTitle').textContent = title;
    this._ref('waitText').textContent = text;
    this._ref('loginCard').querySelector('[data-act="ssoCancel"]').hidden = !cancellable;
    this._setLoginState('wait');
  }

  _showError(title, text) {
    this._ref('errTitle').textContent = title;
    this._ref('errText').textContent = text;
    this._setLoginState('err');
  }

  /** Tras iniciar sesión (o restaurarla): bienvenida, oferta de subir las aventuras de invitado y selección. */
  async _afterSignIn(res = {}) {
    const view = this._getSession();
    const n = saveSlotManager.getSlots().filter((s) => s.data).length;
    this._ref('wallet').innerHTML = `<span class="lk-av">${esc(view.name[0] || '?').toUpperCase()}</span>${esc(view.name)}${view.roninShort ? ` <code>${esc(view.roninShort)}</code>` : ''}`;
    this._ref('okText').textContent = n ? `Cargando tus ${n === 1 ? 'aventura' : `${n} aventuras`}…` : 'Preparando tu primera aventura…';
    this._setLoginState('ok');
    if (res.fresh) await new Promise((r) => setTimeout(r, 900));

    const offer = accountManager.getGuestImportOffer();
    if (offer && (res.linkGuest || this._linkGuest || offer.accountCount === 0)) {
      await this._offerGuestImport(offer);
    }
    this._linkGuest = false;

    this._showSelect(this._getSession(), true);
    const syncBanner = this._ref('syncBanner');
    syncBanner.hidden = res.syncOk !== false;
    (res.notices || []).forEach((t) => toast(t));
    toast(res.fresh ? `Sesión iniciada · ${view.providerLabel}` : `Bienvenido de nuevo, ${view.name}`);
  }

  async _offerGuestImport(offer) {
    const plural = offer.guestCount === 1 ? 'una aventura' : `${offer.guestCount} aventuras`;
    let choice = await this._ask({
      title: 'Aventuras de invitado encontradas',
      text: `En este dispositivo tienes ${plural} jugadas como invitado. ¿Quieres guardarlas en tu cuenta para no perderlas?`,
      actions: [{ id: 'skip', label: 'Ahora no' }, { id: 'import', label: 'Guardar en mi cuenta', primary: true }],
    });
    if (choice !== 'import') return;

    let strategy = 'fill';
    if (!offer.fits) {
      choice = await this._ask({
        title: 'No caben todas',
        text: `Tu cuenta ya tiene ${offer.accountCount} de 3 ranuras ocupadas. Puedo guardar solo las que caben en ranuras libres, o reemplazar las de tu cuenta por las de este dispositivo.`,
        actions: [{ id: 'fill', label: 'Solo las que caben', primary: true }, { id: 'replace', label: 'Reemplazar las de la cuenta', danger: true }],
      });
      strategy = choice === 'replace' ? 'replace' : 'fill';
    }
    try {
      const r = await accountManager.importGuest(strategy);
      toast(r.skipped ? `${r.imported} guardadas en tu cuenta · ${r.skipped} no cabían` : `${r.imported === 1 ? 'Aventura guardada' : 'Aventuras guardadas'} en tu cuenta`);
    } catch (err) {
      toast(`No se pudieron subir ahora: ${accountManager.describeError(err)} Se reintentará.`, true);
    }
  }

  /** Diálogo de decisión con el estilo del sistema de diseño. Resuelve con el id de la acción elegida. */
  _ask({ title, text, actions }) {
    const dlg = this._ref('acctDialog');
    this._ref('acctDialogTitle').textContent = title;
    this._ref('acctDialogText').textContent = text;
    const acts = this._ref('acctDialogActs');
    acts.innerHTML = actions.map((a) => `<button class="lk-btn ${a.primary ? 'lk-btn-primary-gold' : a.danger ? 'lk-btn-danger-red' : 'lk-btn-secondary-wood'} lk-btn--sm" data-choice="${a.id}">${esc(a.label)}</button>`).join('');
    dlg.classList.add('lk-is-on');
    return new Promise((resolve) => {
      const done = (id) => { dlg.classList.remove('lk-is-on'); acts.onclick = null; dlg.onkeydown = null; resolve(id); };
      acts.onclick = (e) => { const b = e.target.closest('[data-choice]'); if (b) done(b.dataset.choice); };
      dlg.onkeydown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(actions[0].id); } };
      setTimeout(() => acts.querySelector('.lk-btn-primary-gold, button')?.focus(), 30);
    });
  }

  /** Inicio con Sky Mavis (redirige a su página de inicio de sesión y vuelve al juego). */
  async _ssoLogin() {
    if (this.audio && typeof this.audio.playConfirm === 'function') this.audio.playConfirm();
    if (!accountManager.skyMavisConfigured) {
      this._lastRetry = 'sso';
      this._showError('Sky Mavis no disponible', 'El inicio con Sky Mavis aún no está configurado en esta versión. Puedes entrar con tu correo o jugar como invitado.');
      return;
    }
    this._setWait('Conectando con Sky Mavis…', 'Te llevamos a la página de inicio de sesión de Sky Mavis. Volverás aquí automáticamente.', true);
    try {
      await accountManager.startSkyMavis({ linkGuest: Boolean(this._linkGuest) });
    } catch (err) {
      this._lastRetry = 'sso';
      this._showError('No pudimos conectar', accountManager.describeError(err));
    }
  }

  // ---- correo
  _emailStart() {
    if (!accountManager.configured) {
      this._lastRetry = 'email';
      this._showError('Cuentas no disponibles', 'Las cuentas en la nube aún no están configuradas en esta versión. Puedes jugar como invitado.');
      return;
    }
    this._ref('emailMsg').textContent = '';
    if (this._email && !this._ref('emailInput').value) this._ref('emailInput').value = this._email;
    this._setLoginState('email');
    setTimeout(() => this._ref('emailInput').focus(), 30);
  }

  /** Si el enlace del correo se abre en otra pestaña, esta pestaña también entra a la cuenta. */
  _watchOtherTabSignIn() {
    if (this._storageWatch) return;
    this._storageWatch = (e) => {
      if (e.key !== 'lunakai_auth_v1' || !e.newValue) return;
      window.removeEventListener('storage', this._storageWatch);
      this._storageWatch = null;
      if (this.container.dataset.view === 'login') this.bootAccount();
    };
    window.addEventListener('storage', this._storageWatch);
  }

  async _emailSend(resend = false) {
    const input = this._ref('emailInput');
    const msg = resend ? this._ref('codeMsg') : this._ref('emailMsg');
    const btn = resend ? this._ref('resendBtn') : this._ref('emailSend');
    msg.textContent = '';
    const raw = String(input.value || '').trim();
    if (!resend && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) {
      msg.textContent = 'Escribe un correo válido, por ejemplo nombre@gmail.com.';
      input.focus();
      return;
    }
    btn.disabled = true;
    const txt = this._ref('emailSendTxt');
    if (!resend && txt) txt.textContent = 'Enviando…';
    try {
      accountManager.auth.setPendingLinkGuest(Boolean(this._linkGuest));
      this._email = await accountManager.sendEmailCode(input.value);
      this._ref('codeEmail').textContent = this._email;
      this._setMailApp(this._email);
      this._startResendCooldown();
      this._watchOtherTabSignIn();
      this._ref('codeInput').value = '';
      this._renderOtp();
      this._ref('codeMsg').textContent = '';
      if (resend) toast('Te enviamos un correo nuevo');
      this._setLoginState('code');
      setTimeout(() => this._ref('codeInput').focus(), 30);
    } catch (err) {
      msg.textContent = accountManager.describeError(err);
    } finally {
      if (txt) txt.textContent = 'Enviarme el enlace';
      if (!resend || !this._resendLeft) btn.disabled = false;
    }
  }

  /** Atajo al buzón para los proveedores más comunes. */
  _setMailApp(email) {
    const dom = String(email || '').split('@')[1]?.toLowerCase() || '';
    const P = [
      [/^(gmail|googlemail)\.com$/, 'Abrir Gmail', 'https://mail.google.com/mail/u/0/#search/in%3Aanywhere+newer_than%3A1h'],
      [/^(outlook|hotmail|live|msn)\.[a-z.]+$/, 'Abrir Outlook', 'https://outlook.live.com/mail/'],
      [/^(yahoo|ymail)\.[a-z.]+$/, 'Abrir Yahoo Mail', 'https://mail.yahoo.com/'],
      [/^(icloud|me|mac)\.com$/, 'Abrir iCloud Mail', 'https://www.icloud.com/mail'],
      [/^proton(mail)?\.(me|com)$/, 'Abrir Proton Mail', 'https://mail.proton.me/'],
    ].find(([re]) => re.test(dom));
    const a = this._ref('mailApp');
    a.hidden = !P;
    if (P) { a.href = P[2]; this._ref('mailAppTxt').textContent = P[1]; }
  }

  /** Evita reenvíos seguidos (el servicio limita a uno por minuto). */
  _startResendCooldown(sec = 60) {
    const btn = this._ref('resendBtn');
    clearInterval(this._resendT);
    this._resendLeft = sec;
    const tick = () => {
      if (this._resendLeft <= 0) { clearInterval(this._resendT); btn.disabled = false; btn.textContent = 'reenvíalo'; return; }
      btn.disabled = true; btn.textContent = `reenvíalo en ${this._resendLeft} s`;
      this._resendLeft--;
    };
    tick();
    this._resendT = setInterval(tick, 1000);
  }

  /** Pinta los 6 dígitos del código en sus casillas y entra solo al completarlo. */
  _renderOtp(autoSubmit = false) {
    const input = this._ref('codeInput');
    const clean = String(input.value || '').replace(/\D/g, '').slice(0, 6);
    if (input.value !== clean) input.value = clean;
    const focused = document.activeElement === input;
    this._ref('otp').querySelectorAll('.lk-otp__cells i').forEach((c, i) => {
      c.textContent = clean[i] || '';
      c.classList.toggle('lk-is-filled', Boolean(clean[i]));
      c.classList.toggle('lk-is-active', focused && i === Math.min(clean.length, 5));
    });
    this._ref('codeSend').disabled = clean.length < 6;
    if (autoSubmit && clean.length === 6 && !this._verifying) this._emailVerify();
  }

  async _emailVerify() {
    const msg = this._ref('codeMsg');
    const btn = this._ref('codeSend');
    const otp = this._ref('otp');
    msg.textContent = '';
    btn.disabled = true;
    this._verifying = true;
    otp.classList.remove('lk-is-error');
    otp.classList.add('lk-is-busy');
    try {
      const res = await accountManager.verifyEmailCode(this._email, this._ref('codeInput').value);
      clearInterval(this._resendT);
      await this._afterSignIn({ ...res, fresh: true });
    } catch (err) {
      msg.textContent = accountManager.describeError(err);
      void otp.offsetWidth; otp.classList.add('lk-is-error');
      const input = this._ref('codeInput'); input.select();
    } finally {
      this._verifying = false;
      otp.classList.remove('lk-is-busy');
      btn.disabled = this._ref('codeInput').value.length < 6;
    }
  }

  _guestLogin() {
    clearTimeout(this._ssoT);
    if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
    accountManager.enterGuest();
    this._showSelect(this._getSession(), true);
    toast('Entraste como invitado');
  }

  async _logout({ thenLogin = true } = {}) {
    const res = await accountManager.signOut();
    if (res.pending) {
      const choice = await this._ask({
        title: 'Hay progreso sin guardar en la nube',
        text: 'No pudimos subir tus últimos cambios. Si cierras sesión ahora, se perderán en este dispositivo.',
        actions: [{ id: 'stay', label: 'Seguir conectado', primary: true }, { id: 'force', label: 'Cerrar igualmente', danger: true }],
      });
      if (choice !== 'force') return;
      await accountManager.signOut({ force: true });
    }
    this._ref('syncBanner').hidden = true;
    this.container.dataset.view = 'login';
    this._setLoginState('idle');
    if (thenLogin) toast('Sesión cerrada');
  }

  _retry() {
    const r = this._lastRetry;
    if (r === 'boot') { this.bootAccount(); return; }
    if (r === 'email') { this._emailStart(); return; }
    this._ssoLogin();
  }

  _showSelect(session, animate = true) {
    this._setLoginState('idle');
    const acct = this._ref('acct');
    const guest = !session || session.mode === 'guest';
    acct.classList.toggle('lk-is-guest', guest);
    const sub = guest ? '' : [session.providerLabel, session.roninShort || session.email].filter(Boolean).join(' · ');
    acct.innerHTML = guest
      ? '<span class="lk-av">?</span><span><b>Invitado</b><small>Progreso local</small></span>'
      : `<span class="lk-av">${esc((session.name || '?')[0]).toUpperCase()}</span><span><b>${esc(session.name)}</b><small>${esc(sub)}</small></span>`;
    this._ref('guestBanner').hidden = !guest;
    if (GUEST_ONLY) this._ref('guestBanner').hidden = true;
    this.container.querySelector('[data-act="switchAccount"]').hidden = guest || GUEST_ONLY;
    this.container.querySelector('[data-act="logout"]').textContent = guest ? 'Salir del modo invitado' : 'Cerrar sesión';
    this.container.dataset.view = 'select';
    if (animate) { this.container.classList.remove('lk-view-in'); void this.container.offsetWidth; this.container.classList.add('lk-view-in'); }
    this.refreshSlots();
    setTimeout(() => this.container.querySelector('.lk-slot[aria-selected="true"]')?.focus({ preventScroll: true }), 60);
  }

  _setupStartScreen() {
    const root = this.container;
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      const menu = this._ref('acctMenu');
      if (!e.target.closest('.lk-kebab, .lk-kmenu, .lk-acct')) {
        root.querySelectorAll('.lk-kmenu.lk-is-on').forEach((m) => m.classList.remove('lk-is-on'));
      }
      if (e.target.closest('.lk-acct')) { menu.classList.toggle('lk-is-on'); return; }
      if (!btn) return;
      switch (btn.dataset.act) {
        case 'sso': this._ssoLogin(); break;
        case 'retry': this._retry(); break;
        case 'guest': this._guestLogin(); break;
        case 'ssoCancel': this._setLoginState('idle'); break;
        case 'errBack': this._setLoginState('idle'); break;
        case 'emailStart': this._emailStart(); break;
        case 'emailBack': this._setLoginState('idle'); break;
        case 'emailResend': this._emailSend(true); break;
        case 'logout': menu.classList.remove('lk-is-on'); this._logout(); break;
        case 'switchAccount': menu.classList.remove('lk-is-on'); this._logout({ thenLogin: false }).then(() => toast('Inicia sesión con otra cuenta')); break;
        case 'syncRetry': {
          btn.disabled = true;
          accountManager.cloud.pullAll()
            .then(({ notices }) => { this._ref('syncBanner').hidden = true; this.refreshSlots(); notices.forEach((t) => toast(t)); toast('Sincronizado con la nube'); })
            .catch((err) => toast(accountManager.describeError(err), true))
            .finally(() => { btn.disabled = false; });
          break;
        }
        case 'link': {
          // Desde invitado: se inicia sesión y luego se ofrece subir sus aventuras a la cuenta.
          this._linkGuest = true;
          root.dataset.view = 'login';
          this._setLoginState('idle');
          toast('Elige cómo vincular: Sky Mavis o correo');
          break;
        }
        case 'options': {
          const sm = window.overworldManager?.settingsModal;
          if (sm && typeof sm.open === 'function') sm.open(); else toast('Las opciones estarán disponibles en un momento');
          break;
        }
        case 'play': this._playSelected(); break;
        case 'delCancel': this.confirmModal.classList.remove('lk-is-on'); break;
        default: break;
      }
    });
    root.querySelectorAll('[data-ref="lang"] button').forEach((b) => b.addEventListener('click', () => this._setLang(b.dataset.v)));
    this._ref('emailForm').addEventListener('submit', (e) => { e.preventDefault(); this._emailSend(false); });
    this._ref('codeForm').addEventListener('submit', (e) => { e.preventDefault(); if (this._ref('codeInput').value.length === 6) this._emailVerify(); });
    const otpIn = this._ref('codeInput');
    otpIn.addEventListener('input', () => { this._ref('otp').classList.remove('lk-is-error'); this._renderOtp(true); });
    ['focus', 'blur', 'keyup', 'click'].forEach((ev) => otpIn.addEventListener(ev, () => this._renderOtp(false)));
    this._ref('emailInput').addEventListener('input', () => { this._ref('emailMsg').textContent = ''; });
    // Si la sesión caduca durante la partida, se avisa (el progreso local de la cuenta se conserva).
    accountManager.onSessionExpired = () => toast('Tu sesión caducó: inicia sesión de nuevo para seguir guardando en la nube', true);

    // Teclado: ← → para elegir, Enter para jugar
    root.addEventListener('keydown', (e) => {
      if (root.dataset.view !== 'select' || this.confirmModal.classList.contains('lk-is-on')) {
        if (e.key === 'Escape' && this.confirmModal.classList.contains('lk-is-on')) { this.confirmModal.classList.remove('lk-is-on'); e.stopPropagation(); }
        return;
      }
      const ids = saveSlotManager.getSlots().map((s) => s.id);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const i = ids.indexOf(this._selectedSlot);
        this._selectedSlot = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
        this.refreshSlots();
        root.querySelector('.lk-slot[aria-selected="true"]')?.focus({ preventScroll: true });
      } else if (e.key === 'Enter' && e.target.classList?.contains('lk-slot')) {
        e.preventDefault();
        this._playSelected();
      }
    });

    // Borrar: mantener pulsado 1,4 s
    const hold = root.querySelector('[data-act="delHold"]');
    let ht = null;
    const start = (e) => {
      e.preventDefault();
      hold.classList.add('lk-is-holding');
      ht = setTimeout(() => {
        hold.classList.remove('lk-is-holding');
        this.confirmModal.classList.remove('lk-is-on');
        const id = this._slotToDelete;
        const data = saveSlotManager.getSlot(id);
        if (id) {
          saveSlotManager.deleteSlot(id);
          this._slotToDelete = null;
          this.refreshSlots();
          if (this.audio && typeof this.audio.playCollision === 'function') this.audio.playCollision();
          toast(`Aventura de ${data?.playerName || 'la ranura ' + id} eliminada`);
        }
      }, 1400);
    };
    const stop = () => { clearTimeout(ht); hold.classList.remove('lk-is-holding'); };
    hold.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, stop));
    hold.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
    hold.addEventListener('keyup', stop);
  }

  _biomeOf(zone) {
    const n = `${zone?.name || ''} ${zone?.mapId || ''}`.toLowerCase();
    if (/ártic|artic|glaci|nieve|hielo|polar|snow|arctic/.test(n)) return 'linear-gradient(180deg,#9EC4E8,#5E86B8 60%,#3B5A86)';
    if (/sabana|savan|desiert|dune|árid|arid|cañón|canon/.test(n)) return 'linear-gradient(180deg,#F6D29A,#D9A25E 50%,#8C6A3E)';
    if (/místic|mystic|astral|vacío|void|cósmic/.test(n)) return 'linear-gradient(180deg,#B9A4E8,#6E58B8 55%,#3B2E6E)';
    if (/mazmorra|dungeon|cripta|ígnea|volc/.test(n)) return 'linear-gradient(180deg,#E89A7A,#9C4A3E 55%,#3E1E22)';
    return 'linear-gradient(180deg,#F2C6B4,#C98A9C 45%,#5E8A62)';
  }

  _when(ts) {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const hm = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(now) - day(d)) / 86400000);
    if (diff === 0) return `Hoy, ${hm}`;
    if (diff === 1) return `Ayer, ${hm}`;
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + `, ${hm}`;
  }

  refreshSlots() {
    const grid = document.getElementById('start-slots-grid');
    if (!grid) return;
    const slots = saveSlotManager.getSlots();
    const occupied = slots.filter((s) => s.data);
    const recentId = occupied.sort((a, b) => (b.data.lastSaved || 0) - (a.data.lastSaved || 0))[0]?.id ?? null;
    if (this._selectedSlot == null || !slots.some((s) => s.id === this._selectedSlot)) {
      this._selectedSlot = recentId ?? slots[0]?.id ?? 1;
    }
    const sel = this._selectedSlot;
    const I = (n) => `./assets/ui/icons/${n}.png`;

    grid.innerHTML = slots.map((slotInfo) => {
      const selected = slotInfo.id === sel;
      const common = `role="option" tabindex="${selected ? 0 : -1}" aria-selected="${selected}" data-slot-id="${slotInfo.id}"`;
      if (!slotInfo.data) {
        return `<div class="lk-slot lk-is-empty" ${common}>
          <div class="lk-slot__top"><span class="lk-slot__n">Ranura ${slotInfo.id}</span></div>
          <div class="lk-new"><span class="lk-plus"><span>+</span></span><b>Nueva aventura</b><small>Crea tu Sapidae, elige su clase y tu axie compañero.</small></div>
        </div>`;
      }
      const data = slotInfo.data;
      const hero = data.hero || {};
      const classDef = SAPIDAE_CLASSES[data.sapidaeClass || 'crafter'] || SAPIDAE_CLASSES.crafter;
      const sapidaePortrait = this._sapidaePortrait(data);
      const axiePortrait = portraitService.getPortraitSync(hero.axieId)
        || (hero.heroKey && portraitService.getPortraitSync(hero.heroKey))
        || hero.image || null;
      const axCls = String(getAxieClassIcon(hero.class || hero.heroKey || hero.archetype)).match(/classes\/(\w+)\.png/)?.[1] || 'beast';
      return `<div class="lk-slot" ${common}>
        <div class="lk-slot__top"><span class="lk-slot__n">Ranura ${slotInfo.id}</span>${slotInfo.id === recentId ? '<span class="lk-recent">Última partida</span>' : ''}
          <button class="lk-kebab" aria-label="Más opciones de la ranura ${slotInfo.id}"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
          <div class="lk-kmenu" role="menu"><button data-k="play">Jugar</button><button class="lk-del" data-k="del">Eliminar…</button></div></div>
        <div class="lk-slot__art" style="--biome:${this._biomeOf(data.zone)}"><span class="lk-mt"></span>
          <span class="lk-med lk-is-sapi" style="--cc:var(--lk-lumen-500)"><img class="slot-fullbody-img" src="${sapidaePortrait}" alt=""></span>
          ${axiePortrait ? `<span class="lk-med" style="--cc:var(--lk-class-${axCls})"><img src="${axiePortrait}" alt=""></span>` : ''}
          <span class="lk-loc"><img src="${I('map')}" alt="" style="width:14px;height:14px;vertical-align:-3px;margin-right:4px">${data.zone?.name || 'Valle del Dojo'}</span></div>
        <div class="lk-slot__info"><div class="lk-nm"><b>${data.playerName || 'Sapidae'}</b><span class="lk-lv">XP Nv ${data.level || 1}</span></div>
          <span class="lk-row"><img src="${I('friend')}" alt="">Sapidae · <em>${classDef.name}</em></span>
          <span class="lk-row"><img src="${getAxieClassIcon(hero.class || hero.heroKey || hero.archetype)}" alt=""><em>${hero.name || 'Shinji'}</em> #${hero.axieId || '10455'}</span>
          <span class="lk-when">${this._when(data.lastSaved || data.createdAt)}</span></div>
      </div>`;
    }).join('');

    // Resumen y botón principal
    const d = saveSlotManager.getSlot(sel);
    const playIco = this._ref('playIco'), playTxt = this._ref('playTxt'), summary = this._ref('summary');
    if (playIco) playIco.innerHTML = `<img class="lk-ai" src="${I(d ? 'resume' : 'add')}" alt="">`;
    if (playTxt) playTxt.textContent = d ? 'Continuar aventura' : 'Crear aventura';
    if (summary) summary.innerHTML = d
      ? `<b>${d.playerName || 'Sapidae'}</b> con ${(d.hero && d.hero.name) || 'Shinji'} · ${d.zone?.name || 'Valle del Dojo'} · Nv ${d.level || 1}`
      : '<b>Ranura libre</b> · empieza una historia nueva';

    grid.querySelectorAll('.lk-slot').forEach((el) => {
      const id = +el.dataset.slotId;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.lk-kebab, .lk-kmenu')) return;
        if (this._selectedSlot === id) return; // ya elegida: el doble clic juega o crea
        this._selectedSlot = id;
        if (this.audio && typeof this.audio.playHover === 'function') this.audio.playHover();
        this.refreshSlots();
        grid.querySelector(`.lk-slot[data-slot-id="${id}"]`)?.focus({ preventScroll: true });
      });
      el.addEventListener('dblclick', (e) => { if (!e.target.closest('.lk-kebab, .lk-kmenu')) this._playSelected(); });
    });
    grid.querySelectorAll('.lk-kebab').forEach((k) => k.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = k.nextElementSibling, on = !m.classList.contains('lk-is-on');
      grid.querySelectorAll('.lk-kmenu').forEach((x) => x.classList.remove('lk-is-on'));
      m.classList.toggle('lk-is-on', on);
    }));
    grid.querySelectorAll('.lk-kmenu button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = +b.closest('.lk-slot').dataset.slotId;
      b.parentElement.classList.remove('lk-is-on');
      const data = saveSlotManager.getSlot(id);
      if (b.dataset.k === 'del') this._confirmDeleteSlot(id, `${data?.playerName || 'Sapidae'} con ${data?.hero?.name || 'su axie'}`);
      else this._playSlot(id);
    }));
  }

  _sapidaePortrait(data) {
    const customKey = 'sapidae_fullbody_' + (data.sapidaeModel || 'sapidae-f-a') + '_' + JSON.stringify(data.customization || {}) + '_' + JSON.stringify(data.equipped || {});
    const url = portraitService.getPortraitSync(customKey)
      || data.sapidaePortrait
      || portraitService.getPortraitSync(data.sapidaeModel || 'sapidae-f-a')
      || `./assets/portraits/${data.sapidaeModel || 'sapidae-f-a'}.png`;
    // Se genera (o actualiza) el render 3D con su personalización exacta
    if (!this._portraitReq) this._portraitReq = new Set();
    if (!this._portraitReq.has(customKey) && typeof portraitService.getSapidaeCustomPortrait === 'function') {
      this._portraitReq.add(customKey);
      portraitService.getSapidaeCustomPortrait(data.sapidaeModel || 'sapidae-f-a', data.customization, data.equipped).then((u) => {
        if (u && u !== data.sapidaePortrait) { data.sapidaePortrait = u; saveSlotManager._saveToStorage(); }
      }).catch(() => {});
    }
    return url;
  }

  _playSelected() {
    const id = this._selectedSlot;
    if (saveSlotManager.getSlot(id)) this._playSlot(id);
    else this._openHeroSelectForSlot(id);
  }

  // ===================================================================================
  // Creación de personaje (Crónica Celeste, etapa 5) — pantalla 12 del sistema de diseño.
  // 4 pasos (Clase, Apariencia, Compañero, Nombre) con la vista previa 3D siempre visible.
  // ===================================================================================
  _renderUnifiedStudio() {
    const container = document.getElementById('dofus-studio-container');
    if (!container) return;
    this.ccStep = this.ccStep || 1;
    this.ccDone = this.ccDone || new Set();
    container.innerHTML = `
      <div class="lk-vista lk-vista--night"><div class="lk-mt lk-mt1"></div><div class="lk-mt lk-mt2"></div><div class="lk-haze"></div><div class="lk-mt lk-mt3"></div></div>
      <header class="lk-cc-top">
        <button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-cc="back"><span class="lk-b-ico">${sprite('i-back')}</span>Ranuras</button>
        <nav class="lk-stepper" data-ref="steps" aria-label="Pasos"></nav>
        <span class="lk-slotpill">Ranura ${this.pendingSlotId || 1}</span>
      </header>
      <div class="lk-cc-body">
        <div class="lk-cc-stage">
          <div id="dofus-3d-canvas-container" class="lk-cc-canvas"></div>
          <div class="lk-cc-badges"><div class="lk-cls-badge" data-ref="badge"></div><div class="lk-stat-chips" data-ref="stats"></div></div>
          <div class="lk-cc-scene"></div>
          <div class="lk-cc-rot"><button type="button" class="lk-btn-circle-icon" data-cc="rotL" aria-label="Girar a la izquierda">${sprite('i-rotate').replace('<svg ', '<svg style="transform:scaleX(-1)" ')}</button><span>Arrastra o usa las flechas para girar</span><button type="button" class="lk-btn-circle-icon" data-cc="rotR" aria-label="Girar a la derecha">${sprite('i-rotate')}</button></div>
        </div>
        <div class="lk-cc-panel">
          <div class="lk-cc-pane" data-step="1"></div>
          <div class="lk-cc-pane" data-step="2" hidden></div>
          <div class="lk-cc-pane" data-step="3" hidden></div>
          <div class="lk-cc-pane" data-step="4" hidden></div>
          <div class="lk-cc-foot"><button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-cc="prev"><span class="lk-b-ico">${sprite('i-back')}</span>Atrás</button><span class="lk-sp"></span><button type="button" class="lk-btn lk-btn-primary-gold" data-cc="next"><span class="lk-b-ico">${sprite('i-back').replace('<svg ', '<svg style="transform:scaleX(-1)" ')}</span><span data-ref="nextTxt">Siguiente</span></button></div>
        </div>
      </div>
      <div class="lk-confirm" data-ref="picker" role="dialog" aria-labelledby="lk-ax-pick-title">
        <div class="lk-confirm__card lk-pick-card">
          <div class="lk-pick-head"><h4 id="lk-ax-pick-title">Elige uno de tus axies</h4><button type="button" class="lk-btn-close-x" data-cc="pickClose" aria-label="Cerrar">${sprite('i-close')}</button></div>
          <p>Axies de tu cuenta Sky Mavis. Llegan con su nivel AXP y sus partes; podrás cambiarlo después en el Escuadrón.</p>
          <div class="lk-ax-grid" data-ref="pickGrid"></div>
        </div>
      </div>`;
    this._ccRef = (n) => container.querySelector(`[data-ref="${n}"]`);
    this._ccRenderAll();
  }

  _ccClass() { return SAPIDAE_CLASSES[this.selectedSapidaeClass] || SAPIDAE_CLASSES.crafter; }
  _ccCompanion() { return this._customCompanion && this._customCompanion.heroKey === this.selectedCompanionKey ? this._customCompanion : (HERO_ROSTER.find((h) => h.heroKey === this.selectedCompanionKey) || HERO_ROSTER[0]); }
  _ccCrest(c, size) { return `<span class="lk-crest" style="--cc:${CC_COLORS[c.id] || '#C98A3B'}${size ? `;width:${size}px;height:${size}px` : ''}"><img src="${CLASS_PORTRAITS[c.id] || c.iconImg || './assets/classes/class_forjacubiles.jpg'}" alt=""></span>`; }
  _ccRole(c) { const m = String(c.archetype || '').match(/\(([^)]+)\)/); return m ? m[1] : (c.title || ''); }
  _ccNameState() {
    const v = String(this.playerName || '').trim();
    if (v.length < 3) return ['err', 'Mínimo 3 letras'];
    if (v.length > 14) return ['err', 'Máximo 14 letras'];
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(v)) return ['err', 'Solo letras, espacios, guion o apóstrofo'];
    return ['ok', 'Nombre disponible'];
  }

  _ccRenderAll() {
    this._ccRenderSteps();
    this._ccRenderBadges();
    this._ccRenderClass();
    this._ccRenderLook();
    this._ccRenderAxie();
    this._ccRenderName();
  }

  _renderWizard() { this._ccRenderAll(); }

  _ccRenderSteps() {
    const steps = this._ccRef('steps');
    if (!steps) return;
    steps.innerHTML = CC_STEPS.map((t, i) => {
      const n = i + 1, done = this.ccDone.has(n) && this.ccStep !== n;
      return `${i ? '<span class="lk-step-sep"></span>' : ''}<button type="button" class="lk-step ${done ? 'lk-is-done' : ''}" ${this.ccStep === n ? 'aria-current="step"' : ''} data-cc="step" data-s="${n}"><span class="lk-n"><span>${done ? '✓' : n}</span></span><span class="lk-t">${t}</span></button>`;
    }).join('');
    this.heroSelectModal.querySelectorAll('.lk-cc-pane').forEach((p) => { p.hidden = +p.dataset.step !== this.ccStep; });
    const prev = this.heroSelectModal.querySelector('[data-cc="prev"]');
    const next = this.heroSelectModal.querySelector('[data-cc="next"]');
    if (prev) prev.disabled = this.ccStep === 1;
    const last = this.ccStep === 4;
    this._ccRef('nextTxt').textContent = last ? 'Comenzar aventura' : `Siguiente: ${CC_STEPS[this.ccStep]}`;
    if (next) { next.disabled = last && this._ccNameState()[0] !== 'ok'; next.classList.toggle('lk-btn--lg', last); }
  }

  _ccGo(n) {
    this.ccDone.add(this.ccStep);
    this.ccStep = Math.max(1, Math.min(4, n));
    tooltip.hide();
    this._ccRenderSteps();
    if (this.ccStep === 4) this._ccRenderName();
    const pane = this.heroSelectModal.querySelector(`.lk-cc-pane[data-step="${this.ccStep}"]`);
    if (pane) pane.scrollTop = 0;
    if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
  }

  _ccRenderBadges() {
    const c = this._ccClass();
    const badge = this._ccRef('badge'), stats = this._ccRef('stats');
    if (badge) badge.innerHTML = `${this._ccCrest(c)}<span><b>${c.name}</b><small>${this._ccRole(c)}</small></span>`;
    if (stats) stats.innerHTML = `<span><img src="${CC_ICON('heart')}" alt="">${c.maxHP}<small>Vida</small></span><span><img src="${CC_ICON('pa')}" alt="">${c.maxPA}<small>PA</small></span><span>${sprite('i-pm')}${c.maxPM}<small>PM</small></span><span>${c.initiative}<small>Ini</small></span>`;
  }

  _ccRenderClass() {
    const pane = this.heroSelectModal.querySelector('.lk-cc-pane[data-step="1"]');
    if (!pane) return;
    const cur = this._ccClass();
    pane.innerHTML = `<h4>Elige tu clase</h4><p class="lk-lead">Define tus 6 hechizos y tu papel en el escuadrón. Podrás verla siempre en la vista previa.</p>
      <div class="lk-cls-grid">${Object.values(SAPIDAE_CLASSES).map((c) => `<button type="button" class="lk-cls-card" aria-pressed="${c.id === cur.id}" data-cc="class" data-k="${c.id}">${this._ccCrest(c)}<b>${c.name}</b><small>${this._ccRole(c)}</small></button>`).join('')}</div>
      <div class="lk-cls-info"><span class="lk-role">${this._ccRole(cur)}</span><p>${cur.description || ''}</p><span class="lk-label">Hechizos de clase (6)</span>
        <div class="lk-spells">${(cur.spellPreviews || []).map((s, i) => `<button type="button" class="lk-spell" style="--cc:${CC_COLORS[cur.id] || '#C98A3B'}" data-tip="class" data-i="${i}" aria-label="${s.name}"><img src="${s.icon}" alt="" loading="lazy" onerror="this.style.display='none'"><b>${i + 1}</b></button>`).join('')}</div>
        <span class="lk-tip-hint">Pasa el ratón o mantén pulsado para ver cada hechizo</span></div>`;
  }

  _ccRenderLook() {
    const pane = this.heroSelectModal.querySelector('.lk-cc-pane[data-step="2"]');
    if (!pane) return;
    const cz = this.customization;
    const named = (list, v) => (list.find((x) => x.id === v || x.hex === v) || {}).name;
    const short = (s) => String(s || '').replace(/^Cuernos /, '').replace(/^Cornamenta de /, '').replace(/^Corte /, '');
    const swatches = (list, part, cur) => {
      const curL = String(cur || 'original').toLowerCase();
      const known = list.some((c) => String(c.hex).toLowerCase() === curL);
      const free = !known && curL.startsWith('#') ? cur : (list.find((c) => String(c.hex).toLowerCase() === curL)?.sample || list[0]?.sample || '#ffffff');
      return `<div class="lk-cc-swatches">${list.map((c) => `<button type="button" class="lk-cc-sw" style="--c:${c.sample}" aria-pressed="${String(c.hex).toLowerCase() === curL}" aria-label="${c.name}" title="${c.name}" data-cc="color" data-part="${part}" data-c="${c.hex}"></button>`).join('')}<label class="lk-sw-custom" title="Color libre"><input type="color" value="${free}" data-part="${part}" aria-label="Color libre"></label></div>`;
    };
    const colorName = (list, v) => named(list, v) || (String(v).startsWith('#') ? String(v).toUpperCase() : 'Original');
    const opts = (list, cat, icons) => `<div class="lk-opts">${list.map((o) => `<button type="button" class="lk-opt" aria-pressed="${cz[cat] === o.id}" data-cc="trait" data-cat="${cat}" data-v="${o.id}" title="${o.desc || o.name}">${icons && icons[o.id] ? icons[o.id] : ''}${short(o.name)}</button>`).join('')}</div>`;
    pane.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h4>Apariencia</h4><button type="button" class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-cc="random"><span class="lk-b-ico"><img class="lk-ai" src="${CC_ICON('rotate')}" alt=""></span>Aleatorio</button></div>
      <p class="lk-lead">Los cambios se ven al instante en tu Sapidae.</p>
      <div class="lk-opt-sec lk-base-seg"><div class="lk-hd"><span class="lk-label">Base</span></div><div class="lk-segmented"><button type="button" aria-pressed="${this.selectedSapidaeModel === 'sapidae-f-a'}" data-cc="base" data-v="sapidae-f-a">Femenina</button><button type="button" aria-pressed="${this.selectedSapidaeModel === 'sapidae-m-a'}" data-cc="base" data-v="sapidae-m-a">Masculina</button></div></div>
      <div class="lk-opt-sec"><div class="lk-hd"><span class="lk-label">Peinado</span><em>${short(named(HAIR_STYLES, cz.hairStyle))} · ${colorName(HAIR_COLORS, cz.hair)}</em></div>${opts(HAIR_STYLES, 'hairStyle', ITEM_ICONS.hair)}${swatches(HAIR_COLORS, 'hair', cz.hair)}</div>
      <div class="lk-opt-sec"><div class="lk-hd"><span class="lk-label">Ojos</span><em>${named(EYE_SHAPES, cz.eyeShape) || ''} · ${colorName(PUPIL_COLORS, cz.eyes)}</em></div>${opts(EYE_SHAPES, 'eyeShape', ITEM_ICONS.eyes)}${swatches(PUPIL_COLORS, 'eyes', cz.eyes)}</div>
      <div class="lk-opt-sec"><div class="lk-hd"><span class="lk-label">Cuernos</span><em>${short(named(HORN_STYLES, cz.horns))} · ${colorName(HORN_COLORS, cz.hornColor)}</em></div>${opts(HORN_STYLES, 'horns', ITEM_ICONS.horns)}${swatches(HORN_COLORS, 'hornColor', cz.hornColor)}</div>
      <div class="lk-opt-sec"><div class="lk-hd"><span class="lk-label">Color del atuendo</span><em>${colorName(SUIT_COLORS, cz.suitColor)}</em></div>${swatches(SUIT_COLORS, 'suitColor', cz.suitColor)}</div>`;
  }

  _ccRenderAxie() {
    const pane = this.heroSelectModal.querySelector('.lk-cc-pane[data-step="3"]');
    if (!pane) return;
    const comp = this._ccCompanion();
    const guest = (this._getSession && this._getSession()?.mode) !== 'skymavis';
    const portraitOf = (h) => portraitService.getPortraitSync(h.axieId) || h.image || `./assets/portraits/${h.heroKey}.png`;
    const clsKey = (h) => String(getAxieClassIcon(h.class || h.heroKey)).match(/classes\/(\w+)\.png/)?.[1] || 'beast';
    const card = (h) => `<button type="button" aria-pressed="${h.heroKey === this.selectedCompanionKey}" data-cc="axie" data-k="${h.heroKey}"><span class="lk-med" style="--cc:var(--lk-class-${clsKey(h)})"><img src="${portraitOf(h)}" alt=""></span><b>${h.name}</b><small><img src="${getAxieClassIcon(h.class || h.heroKey)}" alt="">${h.class}</small></button>`;
    const custom = this._customCompanion && this._customCompanion.heroKey === this.selectedCompanionKey;
    const mine = custom
      ? `<button type="button" class="lk-is-mine" aria-pressed="true" data-cc="mine"><span class="lk-med" style="--cc:var(--lk-class-${clsKey(comp)})"><img src="${portraitOf(comp)}" alt=""></span><b>${comp.name}</b><small><img src="${getAxieClassIcon(comp.class)}" alt="">${comp.class} · <span class="lk-chg">Cambiar</span></small><span class="lk-mine-tag">Tu axie</span></button>`
      : `<button type="button" class="lk-pick-mine ${guest ? 'lk-is-locked' : ''}" data-cc="mine"><span class="lk-pm-ico"><img class="lk-ai" src="${CC_ICON(guest ? 'lock' : 'collection')}" alt=""></span><b>Mis axies</b><small>${guest ? 'Inicia sesión con Sky Mavis' : (this.ownedAxies?.length ? `Elige uno de tus ${this.ownedAxies.length}` : 'Tu colección de Sky Mavis')}</small></button>`;
    const parts = (s, idx) => { const k = (s.part || AXIE_BODY_PARTS[idx]?.id || '').toLowerCase(); return AXIE_BODY_PARTS_MAP[k] || null; };
    pane.innerHTML = `<h4>Axie compañero</h4><p class="lk-lead">Será tu axie principal: te sigue por Lunacia y con él desatas el Vínculo Supremo. Elige uno inicial o uno de tus propios axies.</p>
      <div class="lk-ax-pick">${CC_STARTERS.map((k) => HERO_ROSTER.find((h) => h.heroKey === k)).filter(Boolean).map(card).join('')}${mine}</div>
      <div class="lk-cls-info"><span class="lk-role">${String(comp.archetype || '').replace(/^.*\(([^)]+)\).*$/, '$1') || comp.class}</span><p>${comp.description || ''}</p><span class="lk-label">Cartas de sus partes (6)</span>
        <div class="lk-spells">${(comp.skills || []).map((s, i) => { const p = parts(s, i); return `<button type="button" class="lk-spell" style="--cc:var(--lk-class-${clsKey(comp)})" data-tip="axie" data-i="${i}" aria-label="${s.name}${p ? ` (${p.name})` : ''}"><img src="${s.icon}" alt="" loading="lazy" onerror="this.style.display='none'"><img class="lk-spell-part" src="./assets/parts/${this._ccAxieCls(comp)}-${this._ccPartOf(s, i)}.png" alt=""></button>`; }).join('')}</div>
        <span class="lk-tip-hint">Pasa el ratón o mantén pulsado para ver cada carta</span></div>`;
  }

  _ccRenderName() {
    const pane = this.heroSelectModal.querySelector('.lk-cc-pane[data-step="4"]');
    if (!pane) return;
    const c = this._ccClass(), comp = this._ccCompanion(), cz = this.customization;
    const sample = (list, v) => (list.find((x) => String(x.hex).toLowerCase() === String(v || 'original').toLowerCase()) || {}).sample || v;
    const short = (s) => String(s || '').replace(/^Cuernos /, '').replace(/^Cornamenta de /, '').replace(/^Corte /, '');
    const [st, msg] = this._ccNameState();
    const name = String(this.playerName || '');
    const focused = document.activeElement && document.activeElement.id === 'dofus-char-name';
    if (focused) { // solo se actualiza la ayuda para no perder el cursor
      const help = pane.querySelector('[data-ref="nameHelp"]');
      if (help) help.innerHTML = `<span class="lk-${st}">${msg}</span><span>${name.length}/14</span>`;
      pane.querySelector('#dofus-char-name')?.classList.toggle('lk-is-bad', st === 'err');
      this._ccRenderSteps();
      return;
    }
    pane.innerHTML = `<h4>Nombre y confirmación</h4><p class="lk-lead">Así te llamarán los habitantes de Lunacia.</p>
      <div class="lk-name-field">
        <div class="lk-name-row"><input class="lk-input ${st === 'err' ? 'lk-is-bad' : ''}" id="dofus-char-name" maxlength="14" value="${name.replace(/"/g, '&quot;')}" autocomplete="off" aria-describedby="lk-cc-name-help"><button type="button" class="lk-btn-circle-icon" data-cc="dice" aria-label="Sugerir un nombre"><img class="lk-ai" src="${CC_ICON('rotate')}" alt=""></button></div>
        <div class="lk-name-help" id="lk-cc-name-help" data-ref="nameHelp"><span class="lk-${st}">${msg}</span><span>${name.length}/14</span></div>
      </div>
      <div class="lk-summary"><span class="lk-label" style="color:var(--lk-gilt-300)">Resumen</span>
        <div><span>Clase</span><b>${this._ccCrest(c, 20)}${c.name}</b><button type="button" class="lk-edit" data-cc="step" data-s="1">Editar</button></div>
        <div><span>Aspecto</span><b><i class="lk-dot" style="--c:${sample(HAIR_COLORS, cz.hair)}"></i><i class="lk-dot" style="--c:${sample(PUPIL_COLORS, cz.eyes)}"></i><i class="lk-dot" style="--c:${sample(HORN_COLORS, cz.hornColor)}"></i><i class="lk-dot" style="--c:${sample(SUIT_COLORS, cz.suitColor)}"></i>${short((HAIR_STYLES.find((h) => h.id === cz.hairStyle) || {}).name)} · ${short((HORN_STYLES.find((h) => h.id === cz.horns) || {}).name)}</b><button type="button" class="lk-edit" data-cc="step" data-s="2">Editar</button></div>
        <div><span>Compañero</span><b><img src="${getAxieClassIcon(comp.class || comp.heroKey)}" alt="">${comp.name}</b><button type="button" class="lk-edit" data-cc="step" data-s="3">Editar</button></div>
      </div>`;
    this._ccRenderSteps();
  }

  /** Axies de la cuenta Sky Mavis (mismo formato que HERO_ROSTER). Llamar tras iniciar sesión. */
  setOwnedAxies(list) {
    this.ownedAxies = Array.isArray(list) ? list : [];
    if (this.heroSelectModal && !this.heroSelectModal.classList.contains('hidden')) this._ccRenderAxie();
  }

  _ccOpenPicker() {
    const list = this.ownedAxies || [];
    const grid = this._ccRef('pickGrid');
    const clsKey = (h) => String(getAxieClassIcon(h.class || h.heroKey)).match(/classes\/(\w+)\.png/)?.[1] || 'beast';
    grid.innerHTML = list.map((a, i) => `<button type="button" class="lk-ax-card ${a.heroKey === this.selectedCompanionKey ? 'lk-is-sel' : ''}" data-cc="pickAxie" data-i="${i}" style="--cc:var(--lk-class-${clsKey(a)});cursor:pointer"><span class="lk-med" style="--cc:var(--lk-class-${clsKey(a)})"><img src="${portraitService.getPortraitSync(a.axieId) || a.image || ''}" alt=""></span><b>${a.name}</b><small><img src="${getAxieClassIcon(a.class)}" alt="">${a.class}${a.axpLevel ? ` · AXP ${a.axpLevel}` : ''}</small></button>`).join('');
    this._ccRef('picker').classList.add('lk-is-on');
    this.heroSelectModal.querySelector('[data-cc="pickClose"]')?.focus();
  }

  _ccSetCompanion(hero) {
    this.selectedCompanionKey = hero.heroKey;
    this._ccRenderAxie();
    if (this.diorama) this.diorama.loadCompanion(hero.axieId, hero.genes);
    if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect();
  }

  _randomizeAllTraits() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const suit = pick(SUIT_COLORS);
    Object.assign(this.customization, {
      hair: pick(HAIR_COLORS).hex, hairStyle: pick(HAIR_STYLES).id, eyes: pick(PUPIL_COLORS).hex, eyeShape: pick(EYE_SHAPES).id,
      horns: pick(HORN_STYLES).id, hornColor: pick(HORN_COLORS).hex, suitColor: suit.hex, shirt: suit.hex, pants: suit.hex
    });
    this._ccRenderLook();
    if (this.diorama) this.diorama.applyCustomization(this.customization);
  }

  /** Ficha táctica del sistema de diseño: arte, icono de parte o clase, coste, alcance, visión y efecto. */
  _ccSpellTip(s, color, lead, label) {
    const abs = (u) => { try { return new URL(u, document.baseURI).href; } catch { return u; } };
    const cost = String(s.cost || '').replace(/\s*AP\b/i, ' PA');
    const range = String(s.range || '');
    const type = String(s.type || '');
    const desc = String(s.desc || '');
    const noLos = /aura|salto|teletransp|^0$/i.test(range) || /aura|salto|movilidad|autopropi|potenciador/i.test(type);
    let eff = null;
    const dmg = desc.match(/(\d+(?:\s*[-–]\s*\d+)?)\s*de\s*daño/i);
    const heal = desc.match(/(?:cura|restaura|recupera)[^0-9+]*\+?(\d+(?:\s*[-–]\s*\d+)?)/i) || desc.match(/\+?(\d+(?:\s*[-–]\s*\d+)?)\s*de\s*(?:vida|curación|salud)/i);
    const shield = desc.match(/\+?(\d+(?:\s*[-–]\s*\d+)?)\s*de\s*escudo/i);
    if (dmg) eff = ['Daño', dmg[1].replace(/\s*[-–]\s*/, '–')];
    else if (heal) eff = ['Curación', `+${heal[1].replace(/\s*[-–]\s*/, '–')}`];
    else if (shield) eff = ['Escudo', `+${shield[1].replace(/\s*[-–]\s*/, '–')}`];
    const vision = `<img class="lk-ai" src="${CC_ICON('vision')}" alt="">`;
    return `<div class="lk-tooltip-tactical" style="--c:${color};--art:url('${abs(s.icon)}')"><header class="lk-has-art">${lead || ''}<div><small>${label ? `${label} · ` : ''}${type || 'Hechizo'}</small><b>${s.name}</b></div></header>`
      + '<div class="lk-tt-body"><div class="lk-tt-stats">'
      + `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${CC_ICON('pa')}" alt="">Coste</i><b>${cost || '—'}</b></span>`
      + `<span class="lk-tt-stat"><i class="lk-tl"><img class="lk-ai" src="${CC_ICON('range')}" alt="">Alcance</i><b>AL ${range.replace('-', '–') || '—'}</b></span>`
      + `<span class="lk-tt-stat"><i class="lk-tl">${noLos ? `<span class="lk-nolos-ai">${vision}</span>` : vision}Visión</i><b>${noLos ? 'No requiere' : 'Requiere'}</b></span>`
      + (eff ? `<span class="lk-tt-stat">${eff[0]}<b>${eff[1]}</b></span>` : '')
      + `</div><p>${desc}</p></div></div>`;
  }

  _ccAxieCls(h) { const c = String(getAxieClassIcon(h.class || h.heroKey)).match(/classes\/(\w+)\.png/)?.[1] || 'beast'; return CC_PART_CLASSES.includes(c) ? c : 'beast'; }
  _ccPartOf(s, i) { return (s.part || AXIE_BODY_PARTS[i]?.id || 'eyes').toLowerCase(); }

  _showSkillTooltip(el) {
    if (!el) return;
    const i = +el.dataset.i;
    if (el.dataset.tip === 'class') {
      const c = this._ccClass(), s = (c.spellPreviews || [])[i];
      if (s) tooltip.show(el, this._ccSpellTip(s, CC_COLORS[c.id] || '#C98A3B', `<span class="lk-tt-crest">${this._ccCrest(c, 40)}</span>`, 'Hechizo'));
    } else {
      const comp = this._ccCompanion(), s = (comp.skills || [])[i];
      if (!s) return;
      const cls = this._ccAxieCls(comp), part = this._ccPartOf(s, i);
      const PART = { eyes: 'Ojos', ears: 'Orejas', mouth: 'Boca', horn: 'Cuerno', back: 'Espalda', tail: 'Cola' };
      tooltip.show(el, this._ccSpellTip(s, `var(--lk-class-${cls})`, `<img class="lk-part-ico lk-tt-part" src="./assets/parts/${cls}-${part}.png" alt="${PART[part] || part}">`, PART[part] || part));
    }
  }

  _hideSkillTooltip() { tooltip.hide(); }

  _setupEventListeners() {
    const m = this.heroSelectModal;
    const sfx = () => { if (this.audio && typeof this.audio.playSelect === 'function') this.audio.playSelect(); };
    const setColor = (part, hex) => {
      this.customization[part] = hex;
      if (part === 'suitColor') { this.customization.shirt = hex; this.customization.pants = hex; }
      if (this.diorama) this.diorama.applyCustomization(this.customization);
    };

    m.addEventListener('click', (e) => {
      const el = e.target.closest('[data-cc]');
      if (!el) return;
      switch (el.dataset.cc) {
        case 'back': this.closeHeroSelect(); break;
        case 'step': this._ccGo(+el.dataset.s); break;
        case 'prev': this._ccGo(this.ccStep - 1); break;
        case 'next':
          if (this.ccStep < 4) { this._ccGo(this.ccStep + 1); break; }
          if (this._ccNameState()[0] !== 'ok' || !this.pendingSlotId) { toast(this._ccNameState()[1], true); break; }
          this._createSlotAndStart(this.pendingSlotId, this._ccCompanion());
          break;
        case 'rotL': this.diorama?.rotateBy(-Math.PI / 4); sfx(); break;
        case 'rotR': this.diorama?.rotateBy(Math.PI / 4); sfx(); break;
        case 'class':
          this.selectedSapidaeClass = el.dataset.k;
          this._ccRenderClass(); this._ccRenderBadges(); sfx();
          break;
        case 'base':
          this.selectedSapidaeModel = el.dataset.v;
          this._ccRenderLook();
          if (this.diorama) this.diorama.loadSapidae(this.selectedSapidaeModel, this.customization);
          sfx();
          break;
        case 'trait':
          this.customization[el.dataset.cat] = el.dataset.v;
          this._ccRenderLook();
          if (this.diorama) this.diorama.applyCustomization(this.customization);
          sfx();
          break;
        case 'color': setColor(el.dataset.part, el.dataset.c); this._ccRenderLook(); sfx(); break;
        case 'random': this._randomizeAllTraits(); sfx(); break;
        case 'axie': { const h = HERO_ROSTER.find((x) => x.heroKey === el.dataset.k); if (h) this._ccSetCompanion(h); break; }
        case 'mine': {
          const guest = this._getSession?.()?.mode !== 'skymavis';
          if (guest) { toast('Inicia sesión con Sky Mavis para usar tus propios axies', true); break; }
          if (!this.ownedAxies || !this.ownedAxies.length) { toast('Tus axies de Sky Mavis aparecerán aquí al conectar la cuenta'); break; }
          this._ccOpenPicker();
          break;
        }
        case 'pickAxie': {
          const h = (this.ownedAxies || [])[+el.dataset.i];
          if (h) { this._customCompanion = h; this._ccRef('picker').classList.remove('lk-is-on'); this._ccSetCompanion(h); toast(`${h.name} será tu compañero`); }
          break;
        }
        case 'pickClose': this._ccRef('picker').classList.remove('lk-is-on'); break;
        case 'dice': {
          let n; do { n = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]; } while (n === this.playerName && RANDOM_NAMES.length > 1);
          this.playerName = n;
          const input = m.querySelector('#dofus-char-name');
          if (input) input.value = n;
          this._ccRenderName(); sfx();
          break;
        }
        default: break;
      }
    });

    // Color libre y nombre
    m.addEventListener('input', (e) => {
      if (e.target.id === 'dofus-char-name') { this.playerName = e.target.value; this._ccRenderName(); return; }
      if (e.target.matches('input[type="color"][data-part]')) {
        setColor(e.target.dataset.part, e.target.value);
        e.target.closest('.lk-opt-sec')?.querySelectorAll('.lk-cc-sw').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      }
    });
    m.addEventListener('change', (e) => { if (e.target.matches('input[type="color"][data-part]')) this._ccRenderLook(); });

    // Tooltips de hechizos y cartas (ratón, foco y pulsación larga)
    m.addEventListener('mouseover', (e) => { const el = e.target.closest('.lk-spell[data-tip]'); if (el) this._showSkillTooltip(el); });
    m.addEventListener('mouseout', (e) => { if (e.target.closest('.lk-spell[data-tip]')) tooltip.hide(); });
    m.addEventListener('focusin', (e) => { const el = e.target.closest('.lk-spell[data-tip]'); if (el) this._showSkillTooltip(el); });
    m.addEventListener('focusout', (e) => { if (e.target.closest('.lk-spell[data-tip]')) tooltip.hide(); });
    let lp;
    m.addEventListener('touchstart', (e) => { const el = e.target.closest('.lk-spell[data-tip]'); if (el) lp = setTimeout(() => this._showSkillTooltip(el), 350); }, { passive: true });
    m.addEventListener('touchend', () => { clearTimeout(lp); setTimeout(() => tooltip.hide(), 1600); });
    m.addEventListener('scroll', () => tooltip.hide(), true);

    // El teclado del estudio no llega al Overworld (I, M, J…)
    m.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Escape') {
        const picker = this._ccRef && this._ccRef('picker');
        if (picker && picker.classList.contains('lk-is-on')) { picker.classList.remove('lk-is-on'); return; }
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) document.activeElement.blur();
        else this.closeHeroSelect();
      } else if (e.key === 'Enter' && e.target.id === 'dofus-char-name') {
        m.querySelector('[data-cc="next"]')?.click();
      }
    });
    m.addEventListener('keyup', (e) => e.stopPropagation());
    m.addEventListener('keypress', (e) => e.stopPropagation());

    this.container.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName) || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.stopPropagation();
      }
    });
  }

  _openHeroSelectForSlot(slotId) {
    if (this.audio && typeof this.audio.playSelect === 'function') {
      this.audio.playSelect();
    }
    this.pendingSlotId = slotId;
    this.selectedSapidaeClass = this.selectedSapidaeClass || 'crafter';
    this.selectedSapidaeModel = this.selectedSapidaeModel || 'sapidae-f-a';
    this.selectedCompanionKey = this.selectedCompanionKey || 'beast_rage';
    this.playerName = this.playerName || 'Ema';

    if (!CC_STARTERS.includes(this.selectedCompanionKey) && !this._customCompanion) this.selectedCompanionKey = CC_STARTERS[0];
    this.ccStep = 1;
    this.ccDone = new Set();
    this._renderUnifiedStudio();

    this.heroSelectModal.classList.remove('hidden');
    this.heroSelectModal.style.display = '';

    // Mount and start 3D Diorama
    const canvasContainer = document.getElementById('dofus-3d-canvas-container');
    if (canvasContainer) {
      if (this.diorama) {
        this.diorama.dispose();
        this.diorama = null;
      }
      this.diorama = new CharacterPreviewDiorama(canvasContainer);
      this.diorama.loadSapidae(this.selectedSapidaeModel, this.customization);

      const comp = HERO_ROSTER.find(h => h.heroKey === this.selectedCompanionKey) || HERO_ROSTER[0];
      if (comp) {
        this.diorama.loadCompanion(comp.axieId, comp.genes);
      }
      this.diorama.start();
    }
  }

  closeHeroSelect() {
    this._hideSkillTooltip();
    if (this.diorama) {
      this.diorama.dispose();
      this.diorama = null;
    }
    this.heroSelectModal.classList.add('hidden');
    this.pendingSlotId = null;
  }

  _createSlotAndStart(slotId, heroTemplate) {
    if (this.audio && typeof this.audio.playConfirm === 'function') {
      this.audio.playConfirm();
    }
    const nameInput = document.getElementById('dofus-char-name') || document.getElementById('char-name-input');
    if (nameInput && nameInput.value && nameInput.value.trim()) {
      this.playerName = nameInput.value.trim();
    }
    const classDef = SAPIDAE_CLASSES[this.selectedSapidaeClass] || SAPIDAE_CLASSES.crafter;
    const finalPlayerName = (this.playerName && this.playerName.trim()) ? this.playerName.trim() : `Sapidae (${classDef.name})`;

    let dynamicPortrait = null;
    if (this.diorama && typeof this.diorama.capturePortrait === 'function') {
      try {
        dynamicPortrait = this.diorama.capturePortrait();
      } catch (err) {
        console.warn('[StartScreenUI] Could not capture diorama portrait:', err);
      }
    }

    const templateWithSapidae = Object.assign({}, heroTemplate, {
      isSapidae: true,
      sapidaeModel: this.selectedSapidaeModel || 'sapidae-f-a',
      sapidaeClass: this.selectedSapidaeClass || 'crafter',
      customization: { ...this.customization },
      playerName: finalPlayerName,
      sapidaePortrait: dynamicPortrait
    });
    const newSlot = saveSlotManager.createSlot(slotId, templateWithSapidae);
    this.closeHeroSelect();
    this.refreshSlots();
    this._launchGameWithSlot(newSlot, true);
  }

  _playSlot(slotId) {
    const slot = saveSlotManager.getSlot(slotId);
    if (!slot) return;

    if (this.audio && typeof this.audio.playConfirm === 'function') {
      this.audio.playConfirm();
    }
    saveSlotManager.setActiveSlotId(slotId);
    this._launchGameWithSlot(slot, false);
  }

  _confirmDeleteSlot(slotId, heroName = 'esta aventura') {
    this._slotToDelete = slotId;
    const data = saveSlotManager.getSlot(slotId);
    const txt = this._ref('delText');
    if (txt) txt.innerHTML = `Se borrará la aventura de <b>${heroName}</b> (Ranura ${slotId}${data?.zone?.name ? `, ${data.zone.name}` : ''}).`;
    this.confirmModal.classList.add('lk-is-on');
    setTimeout(() => this.confirmModal.querySelector('[data-act="delCancel"]')?.focus(), 30);
  }

  _launchGameWithSlot(slotData, isNewGame = false) {
    // Fundido de salida
    this.container.classList.add('lk-is-leaving');
    setTimeout(() => {
      this.container.classList.add('hidden');
      this.container.classList.remove('lk-is-leaving');
      this.isOpen = false;
      if (typeof this.onStartAdventure === 'function') {
        this.onStartAdventure(slotData, isNewGame);
      }
    }, 600);
  }

  show() {
    const session = this._getSession();
    if (session) this._showSelect(session, false);
    else { this.container.dataset.view = 'login'; this._setLoginState('idle'); }
    this.refreshSlots();
    this.container.classList.remove('hidden', 'lk-is-leaving');
    this.container.style.display = '';
    this.isOpen = true;
  }

  hide() {
    this.container.classList.add('hidden');
    this.isOpen = false;
  }
}
