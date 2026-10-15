// SettingsModal.js — Pausa y opciones (Crónica Celeste, etapa 1)
// Pantalla 15 del sistema de diseño ("Pausa y opciones"), con las clases lk- de src/ui/ds.generated.css.
// API pública intacta: new SettingsModal({ renderer, scene, audio, onExitToTitle, onSaveProgress }),
// isOpen, open(), close(), toggle(), applyQuality(preset), modalEl (#settings-modal, usa la clase .hidden).
import { saveSlotManager } from '../SaveSlotManager.js';
import { asset, sprite, toast } from '../../ui/lk.js';

const K = {
  quality: 'axie_tactics_graphics_quality',
  music: 'axie_tactics_music_vol',
  sfx: 'axie_tactics_sfx_vol',
  master: 'axie_tactics_master_vol',
  amb: 'axie_tactics_amb_vol',
  gfx: 'axie_tactics_gfx',
  prefs: 'axie_lk_prefs'
};

// [sombras, hierba, partículas, cielo, escala de resolución]
const PRESET = { low: [0, 0, 1, 0, 70], mid: [1, 0, 1, 1, 85], high: [1, 1, 1, 1, 100] };
const GFX_KEYS = ['shadows', 'grass', 'particles', 'sky'];
const AUDIO_DEFAULTS = { master: 100, music: 75, sfx: 80, amb: 60 };
const PREF_DEFAULTS = {
  mute: { master: false, music: false, sfx: false, amb: false },
  bgMute: true, duckDialog: false,
  lang: 'es', textSize: 'normal', textSpeed: 'normal',
  contrast: false, reduceMotion: false, shake: true
};
const TEXT_SPEED_MS = { slow: 40, normal: 22, instant: 1 };

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch { return fallback; } };
const readJSON = (k, fallback) => { try { return { ...fallback, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return { ...fallback }; } };
const write = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="lk-w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const EXIT_SVG = (style = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${style}><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4M6 12h10"/></svg>`;

const sw = (key, label, small, on) => `<div class="lk-set-row"><span class="lk-t"><b>${label}</b><small>${small}</small></span><button class="lk-switch" role="switch" data-k="${key}" aria-checked="${on}" aria-label="${label}"></button></div>`;
const seg = (key, label, small, opts) => `<div class="lk-set-row"><span class="lk-t"><b>${label}</b><small>${small}</small></span><div class="lk-segmented" data-k="${key}">${opts.map(([v, t]) => `<button aria-pressed="false" data-v="${v}">${t}</button>`).join('')}</div></div>`;
const vol = (ch, name, small, master = false) => `<div class="lk-vol ${master ? 'lk-is-master' : ''}" data-ch="${ch}"><button class="lk-mute" aria-pressed="false" aria-label="Silenciar ${name}">${SPEAKER}</button><span class="lk-t"><b>${name}</b><small>${small}</small></span><input class="lk-range" type="range" min="0" max="100" value="50" aria-label="Volumen de ${name}"><span class="lk-num">50%</span></div>`;
const keyRow = (label, keys) => `<div class="lk-key-row"><span>${label}</span><span>${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</span></div>`;
const bars = (n) => `<span class="lk-bars">${[0, 1, 2, 3].map((i) => `<i class="${i < n ? 'lk-on' : ''}"></i>`).join('')}</span>`;

export class SettingsModal {
  constructor(options = {}) {
    this.renderer = options.renderer || null;
    this.scene = options.scene || null;
    this.audio = options.audio || null;
    this.onExitToTitle = options.onExitToTitle || null;
    this.onSaveProgress = options.onSaveProgress || null;

    this.isOpen = false;
    const q = read(K.quality, 'high');
    this.currentQuality = q === 'medium' ? 'mid' : q;
    this.vol = {
      master: parseInt(read(K.master, AUDIO_DEFAULTS.master), 10),
      music: parseInt(read(K.music, AUDIO_DEFAULTS.music), 10),
      sfx: parseInt(read(K.sfx, AUDIO_DEFAULTS.sfx), 10),
      amb: parseInt(read(K.amb, AUDIO_DEFAULTS.amb), 10)
    };
    this.gfx = readJSON(K.gfx, { shadows: true, grass: true, particles: true, sky: true, res: 100 });
    if (this.currentQuality !== 'custom' && PRESET[this.currentQuality]) this.gfx = this._presetValues(this.currentQuality);
    this.prefs = readJSON(K.prefs, PREF_DEFAULTS);
    this.prefs.mute = { ...PREF_DEFAULTS.mute, ...this.prefs.mute };

    this._createDOM();
    this._initSettings();
  }

  // Compatibilidad con código que lea estos campos
  get musicVolume() { return this.vol.music; }
  get sfxVolume() { return this.vol.sfx; }

  _createDOM() {
    document.getElementById('settings-modal')?.remove();
    const I = asset('assets/ui/icons');
    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'lk-ui lk-backdrop hidden';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="lk-panel-modal-window lk-pause" role="dialog" aria-label="Pausa y opciones">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I}/setting.png" alt=""></span>
          <h3><small>Pausa · Esc</small>Opciones</h3>
          <span class="lk-save-chip" data-ref="saveChip"><i>✓</i><span>Sin guardar todavía</span></span>
          <button class="lk-btn-close-x" data-act="close" aria-label="Cerrar y reanudar">${sprite('i-close')}</button>
        </div>
        <div class="lk-pause__body">
          <nav class="lk-pause__nav" aria-label="Menú de pausa">
            <div class="lk-where"><img class="lk-ai" src="${I}/map.png" alt=""><b data-ref="zone">Lunacia</b><small data-ref="zoneMeta"></small></div>
            <button class="lk-btn lk-btn-primary-gold" data-act="resume"><span class="lk-b-ico"><img class="lk-ai" src="${I}/resume.png" alt=""></span>Reanudar<kbd>Esc</kbd></button>
            <div class="lk-vtabs" role="tablist" aria-orientation="vertical">
              <span class="lk-label">Opciones</span>
              <button class="lk-vtab" role="tab" aria-selected="true" data-p="gfx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 18l6-8 4 5 3-3 5 6z"/><circle cx="16.5" cy="6.5" r="2"/></svg>Gráficos</button>
              <button class="lk-vtab" role="tab" aria-selected="false" data-p="aud"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>Audio</button>
              <button class="lk-vtab" role="tab" aria-selected="false" data-p="ctl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 10h1M9 10h1M12 10h1M15 10h1M18 10h0M7 14h10" stroke-linecap="round"/></svg>Controles</button>
              <button class="lk-vtab" role="tab" aria-selected="false" data-p="acc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5l-3 6M12 15l3 6"/></svg>Accesibilidad</button>
            </div>
            <div class="lk-bottom">
              <button class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="save"><span class="lk-b-ico"><img class="lk-ai" src="${I}/save.png" alt=""></span>Guardar ahora</button>
              <button class="lk-link-danger" data-act="exit">${EXIT_SVG()}Salir al menú principal</button>
            </div>
          </nav>
          <div class="lk-pause__content">
            <div class="lk-pause__pane" data-p="gfx">
              <div class="lk-pane-h"><h4>Calidad gráfica</h4><span class="lk-fps" data-ref="fps">Midiendo FPS…</span></div>
              <div class="lk-presets">
                <button class="lk-preset" data-q="low" aria-pressed="false">${bars(1)}<b>Bajo</b><small>Prioriza fluidez en equipos modestos</small></button>
                <button class="lk-preset" data-q="mid" aria-pressed="false">${bars(2)}<b>Medio</b><small>Equilibrio entre detalle y rendimiento</small></button>
                <button class="lk-preset" data-q="high" aria-pressed="false">${bars(3)}<b>Alto</b><small>Máximo detalle del paisaje</small></button>
                <button class="lk-preset" data-q="custom" aria-pressed="false">${bars(4)}<b>Personalizado</b><small>Tus ajustes de abajo</small></button>
              </div>
              <div class="lk-group" data-ref="gfxToggles"><span class="lk-label">Detalle</span>
                ${sw('shadows', 'Sombras dinámicas', 'Sombras en tiempo real del sol y la luna', true)}
                ${sw('grass', 'Hierba animada', 'Briznas con viento por GPU', true)}
                ${sw('particles', 'Partículas ambientales', 'Hojas, nieve, brasas y esporas por bioma', true)}
                ${sw('sky', 'Cielo mágico', 'Auroras, nubes y estrellas procedurales', true)}
                <div class="lk-set-row"><span class="lk-t"><b>Escala de resolución</b><small>Menos escala, más rendimiento</small></span><span style="display:flex;align-items:center;gap:10px;min-width:180px"><input class="lk-range" type="range" min="50" max="100" value="100" data-ref="res" aria-label="Escala de resolución"><b class="lk-num" data-ref="resNum" style="font-size:.84rem;color:var(--lk-ivory-50);min-width:40px;text-align:right">100%</b></span></div>
              </div>
            </div>
            <div class="lk-pause__pane" data-p="aud" hidden>
              <div class="lk-pane-h"><h4>Audio</h4><p>Pulsa el altavoz para silenciar un canal sin perder su nivel.</p></div>
              <div class="lk-group"><span class="lk-label">Volumen</span>
                ${vol('master', 'General', 'Afecta a todo el sonido', true)}
                ${vol('music', 'Música', 'Banda sonora y temas de zona')}
                ${vol('sfx', 'Efectos', 'Combate, habilidades e interfaz')}
                ${vol('amb', 'Ambiente', 'Viento, agua, fauna')}
              </div>
              <div class="lk-group"><span class="lk-label">Comportamiento</span>
                ${sw('bgMute', 'Silenciar en segundo plano', 'Baja el sonido cuando cambias de ventana', true)}
                ${sw('duckDialog', 'Bajar música en diálogos', 'La música se atenúa mientras hablan los personajes', false)}
              </div>
            </div>
            <div class="lk-pause__pane" data-p="ctl" hidden>
              <div class="lk-pane-h"><h4>Controles</h4><p>Teclas actuales del juego.</p></div>
              <div class="lk-keys">
                <div class="lk-group"><span class="lk-label">Exploración</span>${keyRow('Moverse', ['W', 'A', 'S', 'D'])}${keyRow('Interactuar', ['E'])}${keyRow('Avanzar diálogo', ['Espacio'])}${keyRow('Mochila', ['I'])}${keyRow('Diario de misiones', ['J'])}${keyRow('Mapa del mundo', ['M'])}${keyRow('Opciones', ['O'])}${keyRow('Pausa', ['Esc'])}</div>
                <div class="lk-group"><span class="lk-label">Combate</span>${keyRow('Usar carta', ['1 – 6'])}${keyRow('Pasar turno', ['Espacio'])}${keyRow('Rotar cámara 45°', ['Q', 'E'])}${keyRow('Centrar en el héroe', ['R'])}${keyRow('Orbitar cámara', ['Clic der.'])}${keyRow('Zoom', ['Rueda'])}${keyRow('Cancelar acción', ['Esc'])}</div>
              </div>
            </div>
            <div class="lk-pause__pane" data-p="acc" hidden>
              <div class="lk-pane-h"><h4>Accesibilidad</h4><p>Idioma, lectura y comodidad para sesiones largas.</p></div>
              <div class="lk-group"><span class="lk-label">Idioma</span>
                ${seg('lang', 'Idioma del juego', 'Menús, diálogos, cartas y tooltips', [['es', 'Español'], ['en', 'English']])}
              </div>
              <div class="lk-group"><span class="lk-label">Lectura</span>
                ${seg('textSize', 'Tamaño del texto', 'Menús, tooltips y diálogos', [['normal', 'Normal'], ['large', 'Grande'], ['xlarge', 'Muy grande']])}
                ${seg('textSpeed', 'Velocidad del texto', 'Cómo aparece el diálogo', [['slow', 'Lenta'], ['normal', 'Normal'], ['instant', 'Instantánea']])}
              </div>
              <div class="lk-group"><span class="lk-label">Visión y movimiento</span>
                ${sw('contrast', 'Marcadores de alto contraste', 'Contorno y forma distinta para enemigos y aliados, no solo color', false)}
                ${sw('reduceMotion', 'Reducir movimiento', 'Menos destellos, rayos y animaciones de cámara', false)}
                ${sw('shake', 'Temblor de cámara', 'En golpes críticos y Vínculo Supremo', true)}
              </div>
            </div>
            <div class="lk-pause__foot"><span class="lk-hint"><i></i>Los cambios se aplican y guardan al instante</span><button class="lk-text-btn" data-act="reset">Restablecer esta pestaña</button></div>
          </div>
        </div>
        <div class="lk-confirm" data-ref="confirm" role="alertdialog" aria-labelledby="lk-exit-title">
          <div class="lk-confirm__card">
            <h4 id="lk-exit-title">¿Volver al menú principal?</h4>
            <p data-ref="exitText">Guardaremos tu aventura antes de salir.</p>
            <span class="lk-warn">Volverás a la pantalla de inicio del juego.</span>
            <div class="lk-acts"><button class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="exitCancel"><span class="lk-b-ico">${EXIT_SVG(' style="width:15px;height:15px;transform:scaleX(-1)"')}</span>Seguir jugando</button><button class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="exitOk"><span class="lk-b-ico"><img class="lk-ai" src="${I}/save.png" alt=""></span>Guardar y salir</button></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    this.modalEl = modal;
    this.panelEl = modal.querySelector('.lk-pause');
    this.$ = (s) => modal.querySelector(s);
    this.$$ = (s) => [...modal.querySelectorAll(s)];
    this.ref = (n) => modal.querySelector(`[data-ref="${n}"]`);
    this.qualityBtns = this.$$('.lk-preset');
    this._bindEvents();
  }

  _initSettings() {
    // Gráficos
    this._paintGfx();
    this.applyQuality(this.currentQuality, { silent: true });
    // Audio
    for (const ch of Object.keys(this.vol)) this._paintVol(ch);
    this._applyAudio();
    // Preferencias
    this.$$('.lk-switch[data-k]').forEach((s) => {
      const k = s.dataset.k;
      if (k in this.prefs) s.setAttribute('aria-checked', String(Boolean(this.prefs[k])));
    });
    this.$$('.lk-segmented[data-k]').forEach((g) => this._paintSeg(g, this.prefs[g.dataset.k]));
    this._applyPrefs();
    this._setupBackgroundMute();
    this._setupDialogDuck();
  }

  // ---------------------------------------------------------------- eventos
  _bindEvents() {
    const m = this.modalEl;
    const act = (name, fn) => this.$(`[data-act="${name}"]`).addEventListener('click', fn);

    act('close', () => { this._click(); this.close(); });
    act('resume', () => { this._click(); this.close(); });
    m.addEventListener('click', (e) => { if (e.target === m) this.close(); });

    // Pestañas verticales (clic y flechas)
    const tabs = this.$$('.lk-vtab');
    tabs.forEach((t) => t.addEventListener('click', () => { this._click(); this._showPane(t.dataset.p); }));
    this.$('.lk-vtabs').addEventListener('keydown', (e) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const n = tabs[(i + (e.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); this._showPane(n.dataset.p);
    });

    // Presets
    this.qualityBtns.forEach((b) => b.addEventListener('click', () => {
      this._click();
      this.applyQuality(b.dataset.q);
      if (b.dataset.q !== 'custom') toast(`Calidad ${b.querySelector('b').textContent.toLowerCase()} aplicada`);
    }));

    // Interruptores
    this.$$('.lk-switch[data-k]').forEach((s) => s.addEventListener('click', () => {
      const k = s.dataset.k, on = s.getAttribute('aria-checked') !== 'true';
      s.setAttribute('aria-checked', String(on));
      this._click();
      if (GFX_KEYS.includes(k)) {
        this.gfx[k] = on;
        this._setPreset('custom');
        this._applyGraphics();
      } else {
        this.prefs[k] = on;
        this._savePrefs();
      }
    }));

    // Escala de resolución
    const res = this.ref('res');
    res.addEventListener('input', () => {
      this.gfx.res = +res.value;
      this._paintRange(res); this.ref('resNum').textContent = `${res.value}%`;
      this._setPreset('custom');
      this._applyGraphics();
    });

    // Volúmenes
    this.$$('.lk-vol').forEach((row) => {
      const ch = row.dataset.ch, r = row.querySelector('.lk-range');
      r.addEventListener('input', () => {
        this.vol[ch] = +r.value;
        write(K[ch], String(r.value));
        if (+r.value > 0 && this.prefs.mute[ch]) this._setMute(ch, false);
        this._paintVol(ch); this._applyAudio();
      });
      row.querySelector('.lk-mute').addEventListener('click', () => {
        const on = !this.prefs.mute[ch];
        this._setMute(ch, on);
        toast(on ? `${row.querySelector('.lk-t b').textContent} silenciado` : `${row.querySelector('.lk-t b').textContent} activado`);
      });
    });

    // Segmentados (idioma, tamaño y velocidad del texto)
    this.$$('.lk-segmented[data-k]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const k = g.dataset.k;
      this._click();
      this.prefs[k] = b.dataset.v;
      this._paintSeg(g, b.dataset.v);
      this._savePrefs();
      if (k === 'lang') toast(b.dataset.v === 'en' ? 'Language set to English' : 'Idioma cambiado a español');
    })));

    // Guardar / salir
    act('save', () => this._saveNow());
    const conf = this.ref('confirm');
    act('exit', () => { this._click(); this._refreshInfo(); conf.classList.add('lk-is-on'); this.$('[data-act="exitCancel"]').focus(); });
    act('exitCancel', () => { conf.classList.remove('lk-is-on'); this.$('[data-act="exit"]').focus(); });
    act('exitOk', () => {
      if (this.audio && typeof this.audio.playConfirm === 'function') this.audio.playConfirm();
      conf.classList.remove('lk-is-on');
      this.close();
      // onExitToTitle → main._returnToTitleScreen(), que guarda el progreso antes de salir
      if (typeof this.onExitToTitle === 'function') this.onExitToTitle();
      else if (typeof this.onSaveProgress === 'function') this.onSaveProgress();
    });

    act('reset', () => this._resetPane());

    // Esc con la confirmación abierta: solo cierra la confirmación (antes que OverworldManager)
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || e.code !== 'Escape') return;
      if (conf.classList.contains('lk-is-on')) {
        conf.classList.remove('lk-is-on');
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, true);
  }

  // ---------------------------------------------------------------- gráficos
  _presetValues(k) {
    const v = PRESET[k];
    return { shadows: !!v[0], grass: !!v[1], particles: !!v[2], sky: !!v[3], res: v[4] };
  }

  _setPreset(k) {
    this.currentQuality = k;
    write(K.quality, k === 'mid' ? 'medium' : k);
    this.qualityBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.q === k)));
  }

  /** Aplica un preset: 'low' | 'mid' ('medium') | 'high' | 'custom'. */
  applyQuality(preset, { silent = false } = {}) {
    const k = preset === 'medium' ? 'mid' : (PRESET[preset] || preset === 'custom' ? preset : 'high');
    if (PRESET[k]) this.gfx = this._presetValues(k);
    this._setPreset(k);
    this._paintGfx();
    this._applyGraphics();
    if (!silent) this._click();
  }

  _paintGfx() {
    const t = this.ref('gfxToggles');
    GFX_KEYS.forEach((k) => t.querySelector(`[data-k="${k}"]`).setAttribute('aria-checked', String(!!this.gfx[k])));
    const r = this.ref('res');
    r.value = this.gfx.res; this._paintRange(r);
    this.ref('resNum').textContent = `${this.gfx.res}%`;
  }

  _applyGraphics() {
    write(K.gfx, this.gfx);
    if (this.renderer) {
      const base = Math.min(window.devicePixelRatio || 1, 2);
      this.renderer.setPixelRatio(base * (this.gfx.res / 100));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const shadows = !!this.gfx.shadows;
      if (this.renderer.shadowMap.enabled !== shadows) {
        this.renderer.shadowMap.enabled = shadows;
        this.scene?.traverse((obj) => {
          if (!obj.material) return;
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mat) => { mat.needsUpdate = true; });
        });
      }
    }
    this._emit();
  }

  // ---------------------------------------------------------------- audio
  _setMute(ch, on) {
    this.prefs.mute[ch] = on;
    const row = this.$(`.lk-vol[data-ch="${ch}"]`);
    row.classList.toggle('lk-is-muted', on);
    row.querySelector('.lk-mute').setAttribute('aria-pressed', String(on));
    row.querySelector('.lk-w').style.display = on ? 'none' : '';
    if (ch === 'master') {
      this.$$('.lk-vol').forEach((r) => r !== row && r.classList.toggle('lk-is-dimmed', on));
      if (this.audio && typeof this.audio.setMuted === 'function' && Boolean(this.audio.isMuted) !== on) this.audio.setMuted(on);
      this._syncHudSoundButtons();
    }
    this._savePrefs();
    this._applyAudio();
  }

  _paintVol(ch) {
    const row = this.$(`.lk-vol[data-ch="${ch}"]`), r = row.querySelector('.lk-range');
    r.value = this.vol[ch]; this._paintRange(r);
    row.querySelector('.lk-num').textContent = `${this.vol[ch]}%`;
    const muted = !!this.prefs.mute[ch];
    row.classList.toggle('lk-is-muted', muted);
    row.querySelector('.lk-mute').setAttribute('aria-pressed', String(muted));
    row.querySelector('.lk-w').style.display = muted ? 'none' : '';
    if (ch === 'master') this.$$('.lk-vol').forEach((x) => x !== row && x.classList.toggle('lk-is-dimmed', muted));
  }

  _applyAudio() {
    const a = this.audio;
    if (!a) return;
    const v = (ch) => (this.prefs.mute[ch] ? 0 : this.vol[ch] / 100);
    const master = v('master');
    const duck = this._ducked ? 0.35 : 1;
    if (a.music && typeof a.music.setVolume === 'function') a.music.setVolume(master * v('music') * duck);
    if (a.masterGain && a.ctx && !a.isMuted) a.masterGain.gain.setValueAtTime(master * v('sfx') * 0.25, a.ctx.currentTime);
    this._emit();
  }

  _syncHudSoundButtons() {
    const muted = Boolean(this.audio?.isMuted);
    const ov = document.getElementById('btn-toggle-sound');
    if (ov) ov.textContent = muted ? '🔇 Muted' : '🔊 Sound';
    const bm = document.getElementById('btn-mute');
    if (bm) bm.textContent = muted ? '🔇' : '🔊';
  }

  _setupBackgroundMute() {
    let mutedByUs = false;
    document.addEventListener('visibilitychange', () => {
      const a = this.audio;
      if (!a || typeof a.setMuted !== 'function') return;
      if (document.hidden && this.prefs.bgMute && !a.isMuted) { a.setMuted(true); mutedByUs = true; }
      else if (!document.hidden && mutedByUs) { mutedByUs = false; a.setMuted(false); this._applyAudio(); }
    });
  }

  _setupDialogDuck() {
    setInterval(() => {
      const active = Boolean(this.prefs.duckDialog && window.overworldManager?.dialogSystem?.isActive);
      if (active !== Boolean(this._ducked)) { this._ducked = active; this._applyAudio(); }
    }, 300);
  }

  // ---------------------------------------------------------------- preferencias
  _paintSeg(g, v) { g.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }

  _savePrefs() { write(K.prefs, this.prefs); this._applyPrefs(); }

  _applyPrefs() {
    const root = document.documentElement;
    root.dataset.lkText = this.prefs.textSize;
    root.classList.toggle('lk-reduce-motion', !!this.prefs.reduceMotion);
    root.classList.toggle('lk-high-contrast', !!this.prefs.contrast);
    const ds = window.overworldManager?.dialogSystem;
    if (ds && 'typingSpeed' in ds) ds.typingSpeed = TEXT_SPEED_MS[this.prefs.textSpeed] ?? 22;
    this._emit();
  }

  /** Todo el estado de opciones, para los sistemas que quieran escucharlo (window 'lk:settings'). */
  getSettings() {
    return { quality: this.currentQuality, graphics: { ...this.gfx }, volume: { ...this.vol }, ...JSON.parse(JSON.stringify(this.prefs)) };
  }

  _emit() { window.dispatchEvent(new CustomEvent('lk:settings', { detail: this.getSettings() })); }

  _resetPane() {
    const k = this.$('.lk-vtab[aria-selected="true"]').dataset.p;
    if (k === 'gfx') this.applyQuality('high', { silent: true });
    if (k === 'aud') {
      Object.entries(AUDIO_DEFAULTS).forEach(([ch, v]) => { this.vol[ch] = v; write(K[ch], String(v)); this._setMute(ch, false); this._paintVol(ch); });
      this.prefs.bgMute = true; this.prefs.duckDialog = false;
      this.$('[data-k="bgMute"]').setAttribute('aria-checked', 'true');
      this.$('[data-k="duckDialog"]').setAttribute('aria-checked', 'false');
      this._savePrefs(); this._applyAudio();
    }
    if (k === 'acc') {
      ['lang', 'textSize', 'textSpeed', 'contrast', 'reduceMotion', 'shake'].forEach((p) => { this.prefs[p] = PREF_DEFAULTS[p]; });
      this.$$('.lk-segmented[data-k]').forEach((g) => this._paintSeg(g, this.prefs[g.dataset.k]));
      ['contrast', 'reduceMotion', 'shake'].forEach((p) => this.$(`[data-k="${p}"]`).setAttribute('aria-checked', String(this.prefs[p])));
      this._savePrefs();
    }
    toast('Valores restablecidos');
  }

  // ---------------------------------------------------------------- guardado e info
  _slotLabel() {
    const id = saveSlotManager?.activeSlotId;
    if (id == null) return null;
    const n = String(id).replace(/\D/g, '');
    return `Ranura ${n || id}`;
  }

  _ago(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return 'ahora';
    const min = Math.round(s / 60);
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
  }

  _refreshInfo() {
    const slot = saveSlotManager?.getActiveSlot?.();
    const slotLabel = this._slotLabel();
    const chip = this.ref('saveChip');
    if (!chip.classList.contains('lk-is-saving')) {
      chip.querySelector('span').textContent = slot?.lastSaved
        ? `Autoguardado ${this._ago(slot.lastSaved)}${slotLabel ? ` · ${slotLabel}` : ''}`
        : 'Sin guardar todavía';
    }
    const def = window.overworldManager?.worldMapManager?.currentMapDef;
    const zone = def?.name || slot?.zone?.name || 'Lunacia';
    const coords = def && def.gx !== undefined ? [def.gx, def.gy] : slot?.zone?.coords;
    const lvl = window.game?.equipmentManager?.heroProgression?.kotaro?.level || slot?.level;
    this.ref('zone').textContent = zone;
    this.ref('zoneMeta').textContent = [coords ? `Zona [${coords.join(',')}]` : null, [slot?.playerName, lvl ? `Nv ${lvl}` : null].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    this.ref('exitText').innerHTML = `Guardaremos tu aventura${slotLabel ? ` en la <b>${slotLabel}</b>` : ''} antes de salir. Podrás continuar desde ${zone}.`;
  }

  _saveNow() {
    this._click();
    const chip = this.ref('saveChip');
    chip.classList.add('lk-is-saving');
    chip.querySelector('i').textContent = '↻';
    chip.querySelector('span').textContent = 'Guardando…';
    let ok = true;
    try {
      if (typeof this.onSaveProgress === 'function') this.onSaveProgress();
      else if (typeof window.game?._saveCurrentProgress === 'function') window.game._saveCurrentProgress();
      else ok = false;
    } catch (err) { ok = false; console.error('[SettingsModal] Error al guardar', err); }
    setTimeout(() => {
      chip.classList.remove('lk-is-saving');
      chip.querySelector('i').textContent = ok ? '✓' : '!';
      const slotLabel = this._slotLabel();
      chip.querySelector('span').textContent = ok ? `Guardado ahora${slotLabel ? ` · ${slotLabel}` : ''}` : 'No se pudo guardar';
      toast(ok ? `Partida guardada${slotLabel ? ` en la ${slotLabel}` : ''}` : 'No se pudo guardar la partida', !ok);
    }, 600);
  }

  // ---------------------------------------------------------------- utilidades
  _paintRange(r) { r.style.setProperty('--v', `${((r.value - r.min) / (r.max - r.min)) * 100}%`); }

  _showPane(k) {
    this.$$('.lk-vtab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.p === k)));
    this.$$('.lk-pause__pane').forEach((p) => { p.hidden = p.dataset.p !== k; });
  }

  _click() { if (this.audio && typeof this.audio.playClick === 'function') this.audio.playClick(); }

  _startFps() {
    const el = this.ref('fps');
    let frames = 0, t0 = performance.now();
    const loop = (t) => {
      if (!this.isOpen) return;
      frames++;
      if (t - t0 >= 1000) {
        const fps = Math.round((frames * 1000) / (t - t0));
        el.textContent = `≈ ${fps} FPS en este equipo`;
        el.classList.toggle('lk-mid', fps < 50);
        frames = 0; t0 = t;
      }
      this._fpsRaf = requestAnimationFrame(loop);
    };
    this._fpsRaf = requestAnimationFrame(loop);
  }

  _updateMuteUI() {
    // El botón de sonido del HUD puede haber cambiado el silencio general
    const muted = Boolean(this.audio?.isMuted);
    if (muted !== !!this.prefs.mute.master) { this.prefs.mute.master = muted; this._paintVol('master'); this._savePrefs(); }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._updateMuteUI();
    this._applyAudio();
    this._applyPrefs();
    this._refreshInfo();
    this._infoTimer = setInterval(() => this._refreshInfo(), 30000);
    if (this.audio && typeof this.audio.playConfirm === 'function') this.audio.playConfirm();

    clearTimeout(this._hideTimer);
    this.modalEl.classList.remove('hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    void this.modalEl.offsetWidth; // fuerza el reflow para animar la entrada
    this.modalEl.classList.add('lk-is-open');
    this._startFps();
    requestAnimationFrame(() => this.$('[data-act="resume"]').focus({ preventScroll: true }));
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    clearInterval(this._infoTimer);
    cancelAnimationFrame(this._fpsRaf);
    this.ref('confirm').classList.remove('lk-is-on');
    this.modalEl.classList.remove('lk-is-open');
    this.modalEl.setAttribute('aria-hidden', 'true');
    if (this.modalEl.contains(document.activeElement)) document.activeElement.blur();
    this._hideTimer = setTimeout(() => this.modalEl.classList.add('hidden'), 250);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
}
