// CinematicFlythrough.js - 3D In-Engine Prologue Flight Across Lunacia with Lore Subtitles
import * as THREE from 'three';

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
        text: 'Under the sacred mantle of Atia, Lunacia flourished for millennia in peace and mystical balance...'
      },
      {
        start: 0.35,
        end: 0.65,
        text: 'But from the chasms of the Abyss, a dark corruption has awakened, giving birth to the Chimeras...'
      },
      {
        start: 0.68,
        end: 0.94,
        text: 'At the Sacred Dojo, a new aspirant prepares to wield the Runes and defend the realm.'
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
      el.className = 'cinematic-flythrough hidden';
      el.innerHTML = `
        <div class="letterbox-bar letterbox-top"></div>
        <div class="flythrough-hud">
          <div class="flythrough-lore-badge">PROLOGUE • CHRONICLES OF LUNACIA</div>
          <button id="btn-skip-cinematic" class="skip-cinematic-btn" title="Skip prologue (Space)">
            Skip Prologue <span>[Space]</span> ➔
          </button>
        </div>
        <div class="flythrough-subtitle-container">
          <p id="flythrough-subtitle-text" class="flythrough-subtitle-text"></p>
        </div>
        <div class="letterbox-bar letterbox-bottom"></div>
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

    this.overlayEl.classList.remove('hidden');
    this.overlayEl.classList.remove('fade-out');
    this.overlayEl.style.display = 'flex';

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

    // Update Subtitles
    let activeSub = null;
    for (let i = 0; i < this.subtitles.length; i++) {
      const s = this.subtitles[i];
      if (this.progress >= s.start && this.progress <= s.end) {
        activeSub = s;
        break;
      }
    }

    if (activeSub) {
      if (this.subtitleTextEl.textContent !== activeSub.text) {
        this.subtitleTextEl.textContent = activeSub.text;
        this.subtitleTextEl.classList.add('visible');
      }
    } else {
      this.subtitleTextEl.classList.remove('visible');
    }
  }
}
