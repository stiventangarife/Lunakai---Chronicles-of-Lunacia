// CinematicFlythrough.js - 3D In-Engine Prologue Flight Across Lunacia with Lore Subtitles
import * as THREE from 'three';
import * as i18n from '../i18n/i18n.js';

export class CinematicFlythrough {
  constructor(camera, audioSystem) {
    this.camera = camera;
    this.audio = audioSystem;

    this.isActive = false;
    this.progress = 0; // 0.0 to 1.0
    this.duration = 14.0; // seconds for full majestic flight
    this.onCompleteCallback = null;

    this.currentSubIdx = -1;
    this.subtitles = [
      {
        start: 0.04,
        end: 0.32,
        text: i18n.t('prologue.flySub1')
      },
      {
        start: 0.35,
        end: 0.65,
        text: i18n.t('prologue.flySub2')
      },
      {
        start: 0.68,
        end: 0.94,
        text: i18n.t('prologue.flySub3')
      }
    ];

    // Spline Camera Keyframes for scenic flight
    this.cameraPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22, 28, 36),
      new THREE.Vector3(-10, 22, 26),
      new THREE.Vector3(6, 16, 18),
      new THREE.Vector3(8, 11, 10),
      new THREE.Vector3(3, 7.5, 6.5),
      new THREE.Vector3(0, 5.2, 4.5) // Final framing facing hero at (0, 0, 0)
    ]);

    this.lookAtPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 4, 0),
      new THREE.Vector3(2, 2.5, -1),
      new THREE.Vector3(4, 1.8, -2),
      new THREE.Vector3(2, 1.2, -3.5),
      new THREE.Vector3(0, 0.8, -4.0),
      new THREE.Vector3(0, 0.8, -1.0)
    ]);

    this._createDOM();
    this._initInput();
  }

  _createDOM() {
    let el = document.getElementById('cinematic-flythrough-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cinematic-flythrough-overlay';
      // Crónica Celeste: franjas de cine con filo dorado; el rótulo y «Saltar» viven en la franja superior,
      // el subtítulo en tipografía de títulos sobre la franja inferior, con un hilo dorado de progreso.
      el.className = 'lk-ui lk-prologue hidden';
      const dots = this.subtitles.map(() => '<i></i>').join('');
      el.innerHTML = `
        <div class="lk-prologue__bar lk-prologue__bar--top">
          <span class="lk-prologue__kicker"><i></i>${i18n.t('prologue.kicker')}</span>
          <button id="btn-skip-cinematic" class="lk-prologue__skip" type="button" title="${i18n.t('prologue.skipPrologue')}">
            ${i18n.t('prologue.skipPrologue')} <kbd>${i18n.t('prologue.keySpace')}</kbd>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>
          </button>
        </div>
        <div class="lk-prologue__scrim" aria-hidden="true"></div>
        <div class="lk-prologue__sub" aria-live="polite">
          <span class="lk-prologue__orn" aria-hidden="true"><i></i></span>
          <p id="flythrough-subtitle-text" class="lk-prologue__text"></p>
          <span class="lk-prologue__dots" aria-hidden="true">${dots}</span>
        </div>
        <div class="lk-prologue__bar lk-prologue__bar--bot"><span class="lk-prologue__prog"><i></i></span></div>
      `;
      document.body.appendChild(el);
    }
    this.overlayEl = el;
    this.subtitleTextEl = document.getElementById('flythrough-subtitle-text');
    this.skipBtn = document.getElementById('btn-skip-cinematic');
  }

  _initInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        this.skip();
      }
    });

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => {
        if (this.isActive) {
          this.skip();
        }
      });
    }
  }

  start(onComplete = null) {
    this.isActive = true;
    this.progress = 0;
    this.currentSubIdx = -1;
    this.onCompleteCallback = onComplete;

    this.overlayEl.classList.remove('hidden', 'fade-out', 'lk-prologue--sub');
    this.overlayEl.style.setProperty('--p', '0');
    this.overlayEl.style.display = 'block';
    // Reinicia la animación de entrada de las franjas
    this.overlayEl.classList.remove('lk-prologue--in');
    void this.overlayEl.offsetWidth;
    this.overlayEl.classList.add('lk-prologue--in');

    if (this.audio) {
      if (typeof this.audio.init === 'function') {
        this.audio.init();
      }
      if (typeof this.audio.playCinematicMusic === 'function') {
        this.audio.playCinematicMusic();
      }
    }
  }

  skip() {
    if (!this.isActive) return;
    this.finish();
  }

  finish() {
    this.isActive = false;
    this.overlayEl.classList.add('fade-out');

    if (this.audio && typeof this.audio.playBiomeMusic === 'function') {
      this.audio.playBiomeMusic('forest');
    }

    // Smooth transition
    setTimeout(() => {
      this.overlayEl.classList.add('hidden');
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('fade-out');
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      if (cb && typeof cb === 'function') {
        cb();
      }
    }, 600);
  }

  update(dt) {
    if (!this.isActive) return;

    this.progress += dt / this.duration;

    if (this.progress >= 1.0) {
      this.finish();
      return;
    }

    // Update Camera Position along Catmull-Rom curve
    const camPos = this.cameraPath.getPoint(Math.min(1.0, this.progress));
    const lookAtPos = this.lookAtPath.getPoint(Math.min(1.0, this.progress));

    this.camera.position.copy(camPos);
    this.camera.lookAt(lookAtPos);

    // Hilo dorado de progreso en la franja inferior
    this.overlayEl.style.setProperty('--p', Math.min(1, this.progress).toFixed(4));

    // Update Subtitles
    let activeSub = null;
    let activeIdx = -1;
    for (let i = 0; i < this.subtitles.length; i++) {
      const s = this.subtitles[i];
      if (this.progress >= s.start && this.progress <= s.end) {
        activeSub = s;
        activeIdx = i;
        break;
      }
    }

    if (activeSub) {
      if (this.subtitleTextEl.textContent !== activeSub.text) {
        this.subtitleTextEl.textContent = activeSub.text;
        this.overlayEl.querySelectorAll('.lk-prologue__dots i').forEach((d, i) => {
          d.classList.toggle('lk-is-done', i < activeIdx);
          d.classList.toggle('lk-is-on', i === activeIdx);
        });
      }
      this.overlayEl.classList.add('lk-prologue--sub');
    } else {
      this.overlayEl.classList.remove('lk-prologue--sub');
    }
  }
}
