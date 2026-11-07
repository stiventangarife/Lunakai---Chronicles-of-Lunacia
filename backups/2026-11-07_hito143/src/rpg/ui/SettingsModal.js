// SettingsModal.js — Pausa y opciones (Crónica Celeste, etapa 1)
// Pantalla 15 del sistema de diseño ("Pausa y opciones"), con las clases lk- de src/ui/ds.generated.css.
// API pública intacta: new SettingsModal({ renderer, scene, audio, onExitToTitle, onSaveProgress }),
// isOpen, open(), close(), toggle(), applyQuality(preset), modalEl (#settings-modal, usa la clase .hidden).
import { saveSlotManager } from '../SaveSlotManager.js';
import { asset, sprite, toast } from '../../ui/lk.js';
import * as i18n from '../../i18n/i18n.js';
import { access, accessDefaults } from '../../ui/AccessPrefs.js';

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
  lang: i18n.DEFAULT_LANG,
  // Lectura, visión y movimiento (Hito 85): los valores por defecto los da AccessPrefs (la primera vez,
  // «Reducir movimiento» y «Alto contraste» siguen al sistema operativo). AccessPrefs aplica todo al juego.
  ...accessDefaults()
};
const ACCESS_SWITCHES = ['contrast', 'reduceMotion', 'shake'];
const ACCESS_SEGS = ['textSize', 'textSpeed', 'autoAdvance', 'colorblind', 'combatNumbers', 'combatCam'];

const read = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch { return fallback; } };
const readJSON = (k, fallback) => { try { return { ...fallback, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return { ...fallback }; } };
const write = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="lk-w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
const EXIT_SVG = (style = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${style}><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4M6 12h10"/></svg>`;

const sw = (key, label, small, on) => `<div class="lk-set-row"><span class="lk-t"><b>${label}</b><small>${small}</small></span><button class="lk-switch" role="switch" data-k="${key}" aria-checked="${on}" aria-label="${label}"></button></div>`;
const seg = (key, label, small, opts) => `<div class="lk-set-row"><span class="lk-t"><b>${label}</b><small>${small}</small></span><div class="lk-segmented" data-k="${key}">${opts.map(([v, t]) => `<button aria-pressed="false" data-v="${v}">${t}</button>`).join('')}</div></div>`;
const vol = (ch, name, small, master = false) => `<div class="lk-vol ${master ? 'lk-is-master' : ''}" data-ch="${ch}"><button class="lk-mute" aria-pressed="false" aria-label="${i18n.t('settings.muteChannel', { name })}">${SPEAKER}</button><span class="lk-t"><b>${name}</b><small>${small}</small></span><input class="lk-range" type="range" min="0" max="100" value="50" aria-label="${i18n.t('settings.volumeOf', { name })}"><span class="lk-num">50%</span></div>`;
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
      <div class="lk-panel-modal-window lk-pause" role="dialog" aria-label="${i18n.t('settings.dialogLabel')}">
        <div class="lk-panel-head">
          <span class="lk-emblem"><img class="lk-ai" src="${I}/setting.png" alt=""></span>
          <h3><small>${i18n.t('settings.kickPause')}</small>${i18n.t('settings.title')}</h3>
          <span class="lk-save-chip" data-ref="saveChip"><i>✓</i><span>${i18n.t('settings.notSaved')}</span></span>
          <button class="lk-btn-close-x" data-act="close" aria-label="${i18n.t('settings.closeResume')}">${sprite('i-close')}</button>
        </div>
        <div class="lk-pause__body">
          <nav class="lk-pause__nav" aria-label="${i18n.t('settings.pauseMenu')}">
            <div class="lk-where"><img class="lk-ai" src="${I}/map.png" alt=""><b data-ref="zone">Lunacia</b><small data-ref="zoneMeta"></small></div>
            <button class="lk-btn lk-btn-primary-gold" data-act="resume"><span class="lk-b-ico"><img class="lk-ai" src="${I}/resume.png" alt=""></span>${i18n.t('settings.resume')}<kbd>Esc</kbd></button>
            <div class="lk-vtabs" role="tablist" aria-orientation="vertical">
              <span class="lk-label">${i18n.t('settings.title')}</span>
              <button class="lk-vtab" role="tab" aria-selected="true" data-p="gfx"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 18l6-8 4 5 3-3 5 6z"/><circle cx="16.5" cy="6.5" r="2"/></svg>${i18n.t('settings.tabGfx')}</button>
              <button class="lk-vtab" role="tab" aria-selected="false" data-p="aud"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>${i18n.t('settings.tabAudio')}</button>
              <button class="lk-vtab" role="tab" aria-selected="false" data-p="ctl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 10h1M9 10h1M12 10h1M15 10h1M18 10h0M7 14h10" stroke-linecap="round"/></svg>${i18n.t('settings.tabControls')}</button>
              <button class="lk-vtab" role="tab" aria-selected="false" data-p="acc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5l-3 6M12 15l3 6"/></svg>${i18n.t('settings.tabAccess')}</button>
            </div>
            <div class="lk-bottom">
              <button class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="save"><span class="lk-b-ico"><img class="lk-ai" src="${I}/save.png" alt=""></span>${i18n.t('settings.saveNow')}</button>
              <button class="lk-link-danger" data-act="exit">${EXIT_SVG()}${i18n.t('settings.exitToMenu')}</button>
              <p class="lk-pause__cnote"><b>${i18n.t('settings.inCombat')}</b>${i18n.t('settings.inCombatNote')}</p>
            </div>
          </nav>
          <div class="lk-pause__content">
            <div class="lk-pause__pane" data-p="gfx">
              <div class="lk-pane-h"><h4>${i18n.t('settings.gfxQuality')}</h4><span class="lk-fps" data-ref="fps">${i18n.t('settings.measuringFps')}</span></div>
              <div class="lk-presets">
                <button class="lk-preset" data-q="low" aria-pressed="false">${bars(1)}<b>${i18n.t('settings.qLow')}</b><small>${i18n.t('settings.qLowDesc')}</small></button>
                <button class="lk-preset" data-q="mid" aria-pressed="false">${bars(2)}<b>${i18n.t('settings.qMid')}</b><small>${i18n.t('settings.qMidDesc')}</small></button>
                <button class="lk-preset" data-q="high" aria-pressed="false">${bars(3)}<b>${i18n.t('settings.qHigh')}</b><small>${i18n.t('settings.qHighDesc')}</small></button>
                <button class="lk-preset" data-q="custom" aria-pressed="false">${bars(4)}<b>${i18n.t('settings.qCustom')}</b><small>${i18n.t('settings.qCustomDesc')}</small></button>
              </div>
              <div class="lk-group" data-ref="gfxToggles"><span class="lk-label">${i18n.t('settings.detail')}</span>
                ${sw('shadows', i18n.t('settings.shadows'), i18n.t('settings.shadowsDesc'), true)}
                ${sw('grass', i18n.t('settings.grass'), i18n.t('settings.grassDesc'), true)}
                ${sw('particles', i18n.t('settings.particles'), i18n.t('settings.particlesDesc'), true)}
                ${sw('sky', i18n.t('settings.sky'), i18n.t('settings.skyDesc'), true)}
                <div class="lk-set-row"><span class="lk-t"><b>${i18n.t('settings.resScale')}</b><small>${i18n.t('settings.resScaleDesc')}</small></span><span style="display:flex;align-items:center;gap:10px;min-width:180px"><input class="lk-range" type="range" min="50" max="100" value="100" data-ref="res" aria-label="${i18n.t('settings.resScale')}"><b class="lk-num" data-ref="resNum" style="font-size:.84rem;color:var(--lk-ivory-50);min-width:40px;text-align:right">100%</b></span></div>
              </div>
            </div>
            <div class="lk-pause__pane" data-p="aud" hidden>
              <div class="lk-pane-h"><h4>${i18n.t('settings.tabAudio')}</h4><p>${i18n.t('settings.audioHint')}</p></div>
              <div class="lk-group"><span class="lk-label">${i18n.t('settings.volume')}</span>
                ${vol('master', i18n.t('settings.volMaster'), i18n.t('settings.volMasterDesc'), true)}
                ${vol('music', i18n.t('settings.volMusic'), i18n.t('settings.volMusicDesc'))}
                ${vol('sfx', i18n.t('settings.volSfx'), i18n.t('settings.volSfxDesc'))}
                ${vol('amb', i18n.t('settings.volAmb'), i18n.t('settings.volAmbDesc'))}
              </div>
              <div class="lk-group"><span class="lk-label">${i18n.t('settings.behaviour')}</span>
                ${sw('bgMute', i18n.t('settings.bgMute'), i18n.t('settings.bgMuteDesc'), true)}
                ${sw('duckDialog', i18n.t('settings.duck'), i18n.t('settings.duckDesc'), false)}
              </div>
            </div>
            <div class="lk-pause__pane" data-p="ctl" hidden>
              <div class="lk-pane-h"><h4>${i18n.t('settings.tabControls')}</h4><p>${i18n.t('settings.controlsHint')}</p></div>
              <div class="lk-keys">
                <div class="lk-group"><span class="lk-label">${i18n.t('settings.kExplore')}</span>${keyRow(i18n.t('settings.kMove'), ['W', 'A', 'S', 'D'])}${keyRow(i18n.t('settings.kInteract'), ['E'])}${keyRow(i18n.t('settings.kDialog'), [i18n.t('settings.keySpace')])}${keyRow(i18n.t('settings.kBag'), ['I'])}${keyRow(i18n.t('settings.kJournal'), ['J'])}${keyRow(i18n.t('settings.kMap'), ['M'])}${keyRow(i18n.t('overworld.menuSquad'), ['T'])}${keyRow(i18n.t('koliseo.menu'), ['K'])}${keyRow(i18n.t('feedback.menu'), ['F'])}${keyRow(i18n.t('settings.title'), ['O'])}${keyRow(i18n.t('settings.kPause'), ['Esc'])}</div>
                <div class="lk-group"><span class="lk-label">${i18n.t('settings.kCombat')}</span>${keyRow(i18n.t('settings.kCard'), ['1 – 6'])}${keyRow(i18n.t('settings.kEndTurn'), [i18n.t('settings.keySpace')])}${keyRow(i18n.t('settings.kRotate'), ['Q', 'E'])}${keyRow(i18n.t('settings.kCenter'), ['R'])}${keyRow(i18n.t('settings.kOrbit'), [i18n.t('settings.keyRmb')])}${keyRow('Zoom', [i18n.t('settings.keyWheel')])}${keyRow(i18n.t('settings.kCancel'), ['Esc'])}</div>
              </div>
            </div>
            <div class="lk-pause__pane" data-p="acc" hidden>
              <div class="lk-pane-h"><h4>${i18n.t('settings.tabAccess')}</h4><p>${i18n.t('settings.accessHint')}</p></div>
              <div class="lk-group"><span class="lk-label">${i18n.t('settings.language')}</span>
                ${seg('lang', i18n.t('settings.gameLang'), i18n.t('settings.gameLangDesc'), [['en', 'English'], ['es', 'Español']])}
              </div>
              <div class="lk-group"><span class="lk-label">${i18n.t('settings.reading')}</span>
                ${seg('textSize', i18n.t('settings.textSize'), i18n.t('settings.textSizeDesc'), [['normal', i18n.t('settings.normal')], ['large', i18n.t('settings.large')], ['xlarge', i18n.t('settings.xlarge')]])}
                ${seg('textSpeed', i18n.t('settings.textSpeed'), i18n.t('settings.textSpeedDesc'), [['slow', i18n.t('settings.slow')], ['normal', i18n.t('settings.normal')], ['instant', i18n.t('settings.instant')]])}
                ${seg('autoAdvance', i18n.t('settings.autoAdvance'), i18n.t('settings.autoAdvanceDesc'), [['off', i18n.t('settings.off')], ['normal', i18n.t('settings.normal')], ['slow', i18n.t('settings.slow')]])}
              </div>
              <div class="lk-group"><span class="lk-label">${i18n.t('settings.vision')}</span>
                ${sw('contrast', i18n.t('settings.contrast'), i18n.t('settings.contrastDesc'), false)}
                ${seg('colorblind', i18n.t('settings.colorblind'), i18n.t('settings.colorblindDesc'), [['off', i18n.t('settings.off')], ['rg', i18n.t('settings.cbRG')], ['tri', i18n.t('settings.cbTri')]])}
                ${sw('reduceMotion', i18n.t('settings.reduceMotion'), i18n.t('settings.reduceMotionDesc'), false)}
                ${sw('shake', i18n.t('settings.shake'), i18n.t('settings.shakeDesc'), true)}
                ${seg('combatNumbers', i18n.t('settings.combatNumbers'), i18n.t('settings.combatNumbersDesc'), [['full', i18n.t('settings.cnFull')], ['damage', i18n.t('settings.cnDamage')], ['off', i18n.t('settings.cnOff')]])}
                ${seg('combatCam', i18n.t('settings.combatCamera'), i18n.t('settings.combatCameraDesc'), [['fixed', i18n.t('settings.ccFixed')], ['mine', i18n.t('settings.ccMine')], ['follow', i18n.t('settings.ccFollow')]])}
              </div>
            </div>
            <div class="lk-pause__foot"><span class="lk-hint"><i></i>${i18n.t('settings.applyHint')}</span><button class="lk-text-btn" data-act="reset">${i18n.t('settings.resetTab')}</button></div>
          </div>
        </div>
        <div class="lk-confirm" data-ref="confirm" role="alertdialog" aria-labelledby="lk-exit-title">
          <div class="lk-confirm__card">
            <h4 id="lk-exit-title">${i18n.t('settings.exitTitle')}</h4>
            <p data-ref="exitText">${i18n.t('settings.exitText')}</p>
            <span class="lk-warn">${i18n.t('settings.exitWarn')}</span>
            <div class="lk-acts"><button class="lk-btn lk-btn-secondary-wood lk-btn--sm" data-act="exitCancel"><span class="lk-b-ico">${EXIT_SVG(' style="width:15px;height:15px;transform:scaleX(-1)"')}</span>${i18n.t('settings.keepPlaying')}</button><button class="lk-btn lk-btn-primary-gold lk-btn--sm" data-act="exitOk"><span class="lk-b-ico"><img class="lk-ai" src="${I}/save.png" alt=""></span>${i18n.t('settings.saveExit')}</button></div>
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
    // Hito 85: otros sistemas pueden cambiar una preferencia (el botón «Auto» del diálogo): se refleja aquí
    access.onChange((a) => {
      const p = a.prefs;
      for (const k of [...ACCESS_SWITCHES, ...ACCESS_SEGS]) {
        if (this.prefs[k] === p[k]) continue;
        this.prefs[k] = p[k];
        const el = this.$(`[data-k="${k}"]`);
        if (!el) continue;
        if (el.classList.contains('lk-segmented')) this._paintSeg(el, p[k]);
        else el.setAttribute('aria-checked', String(Boolean(p[k])));
      }
    });
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
      if (b.dataset.q !== 'custom') toast(i18n.t('settings.toastQuality', { q: b.querySelector('b').textContent.toLowerCase() }));
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
        toast(i18n.t(on ? 'settings.toastMuted' : 'settings.toastUnmuted', { name: row.querySelector('.lk-t b').textContent }));
      });
    });

    // Segmentados (idioma, tamaño y velocidad del texto)
    this.$$('.lk-segmented[data-k]').forEach((g) => g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const k = g.dataset.k;
      this._click();
      this.prefs[k] = b.dataset.v;
      this._paintSeg(g, b.dataset.v);
      this._savePrefs();
      if (k === 'lang' && b.dataset.v !== i18n.lang()) this._reloadForLanguage(b.dataset.v);
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
      const base = Math.min(window.devicePixelRatio || 1, 1.5); // mismo tope que SceneManager
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
    // Hito 91: el bus de efectos tiene su base en TacticalAudio (SFX_BASE); aquí solo el nivel de Opciones
    if (typeof a.setSfxVolume === 'function') a.setSfxVolume(master * v('sfx'));
    else if (a.masterGain && a.ctx && !a.isMuted) a.masterGain.gain.setValueAtTime(master * v('sfx') * 0.25, a.ctx.currentTime);
    // Hito 86: el canal «Ambiente» por fin suena (viento, agua, fauna, hogueras…: AmbienceManager)
    if (typeof a.setAmbientVolume === 'function') a.setAmbientVolume(master * v('amb') * duck);
    this._emit();
  }

  _syncHudSoundButtons() {
    const muted = Boolean(this.audio?.isMuted);
    const ov = document.getElementById('btn-toggle-sound');
    if (ov) ov.textContent = muted ? i18n.t('settings.hudMuted') : i18n.t('settings.hudSound');
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

  /** Recarga guiada al cambiar el idioma: guarda la partida (si hay una en curso) y recarga la página. */
  _reloadForLanguage(next) {
    try { if (typeof this.onSaveProgress === 'function') this.onSaveProgress(); else if (typeof window.game?._saveCurrentProgress === 'function') window.game._saveCurrentProgress(); } catch (err) { console.error('[SettingsModal] Error al guardar antes de cambiar el idioma', err); }
    toast(next === 'es' ? 'Cambiando el idioma… el juego se recargará' : 'Changing language… the game will reload');
    setTimeout(() => location.reload(), 900);
  }

  _applyPrefs() {
    const root = document.documentElement;
    root.dataset.lkText = this.prefs.textSize;
    root.classList.toggle('lk-reduce-motion', !!this.prefs.reduceMotion);
    root.classList.toggle('lk-high-contrast', !!this.prefs.contrast);
    // Velocidad del texto, avance automático, daltonismo, temblor…: AccessPrefs los aplica al recibir 'lk:settings'
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
      const def = { ...PREF_DEFAULTS, ...accessDefaults() };
      ['lang', ...ACCESS_SEGS, ...ACCESS_SWITCHES].forEach((p) => { this.prefs[p] = def[p]; });
      this.$$('.lk-segmented[data-k]').forEach((g) => this._paintSeg(g, this.prefs[g.dataset.k]));
      ACCESS_SWITCHES.forEach((p) => this.$(`[data-k="${p}"]`).setAttribute('aria-checked', String(this.prefs[p])));
      this._savePrefs();
      if (this.prefs.lang !== i18n.lang()) { this._reloadForLanguage(this.prefs.lang); return; }
    }
    toast(i18n.t('settings.toastReset'));
  }

  // ---------------------------------------------------------------- guardado e info
  _slotLabel() {
    const id = saveSlotManager?.activeSlotId;
    if (id == null) return null;
    const n = String(id).replace(/\D/g, '');
    return i18n.t('settings.slot', { n: n || id });
  }

  _ago(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return i18n.t('settings.agoNow');
    const min = Math.round(s / 60);
    if (min < 60) return i18n.t('settings.agoMin', { n: min });
    const h = Math.round(min / 60);
    return h < 24 ? i18n.t('settings.agoH', { n: h }) : i18n.t('settings.agoD', { n: Math.round(h / 24) });
  }

  _refreshInfo() {
    const slot = saveSlotManager?.getActiveSlot?.();
    const slotLabel = this._slotLabel();
    const chip = this.ref('saveChip');
    if (!chip.classList.contains('lk-is-saving')) {
      chip.querySelector('span').textContent = slot?.lastSaved
        ? `${i18n.t('settings.autosaved', { ago: this._ago(slot.lastSaved) })}${slotLabel ? ` · ${slotLabel}` : ''}`
        : i18n.t('settings.notSaved');
    }
    const def = window.overworldManager?.worldMapManager?.currentMapDef;
    const zone = def?.name || slot?.zone?.name || 'Lunacia';
    const coords = def && def.gx !== undefined ? [def.gx, def.gy] : slot?.zone?.coords;
    const lvl = window.game?.equipmentManager?.heroProgression?.kotaro?.level || slot?.level;
    this.ref('zone').textContent = zone;
    this.ref('zoneMeta').textContent = [coords ? i18n.t('settings.zoneCoords', { c: coords.join(',') }) : null, [slot?.playerName, lvl ? i18n.t('settings.level', { n: lvl }) : null].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    this.ref('exitText').innerHTML = slotLabel ? i18n.t('settings.exitTextSlot', { slot: slotLabel, zone }) : i18n.t('settings.exitTextZone', { zone });
  }

  _saveNow() {
    this._click();
    const chip = this.ref('saveChip');
    chip.classList.add('lk-is-saving');
    chip.querySelector('i').textContent = '↻';
    chip.querySelector('span').textContent = i18n.t('settings.saving');
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
      chip.querySelector('span').textContent = ok ? `${i18n.t('settings.savedNow')}${slotLabel ? ` · ${slotLabel}` : ''}` : i18n.t('settings.saveFailed');
      toast(ok ? (slotLabel ? i18n.t('settings.toastSavedSlot', { slot: slotLabel }) : i18n.t('settings.toastSaved')) : i18n.t('settings.toastSaveFailed'), !ok);
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
        el.textContent = i18n.t('settings.fps', { n: fps });
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
    // En el tablero: sin «Guardar ahora» ni «Salir» (solo se guarda fuera del combate) y con una nota que lo explica
    const inCombat = document.body.classList.contains('state-combat') || window.game?.gameState === 'BATTLE';
    this.modalEl.classList.toggle('lk-in-combat', inCombat);
    const kick = this.modalEl.querySelector('.lk-panel-head h3 small');
    if (kick) kick.textContent = inCombat ? i18n.t('settings.kickCombat') : i18n.t('settings.kickPause'); // en el tablero el juego no se pausa
    const res = this.$('[data-act="resume"]');
    if (res) { const t = [...res.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = inCombat ? i18n.t('settings.backToCombat') : i18n.t('settings.resume'); }
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
