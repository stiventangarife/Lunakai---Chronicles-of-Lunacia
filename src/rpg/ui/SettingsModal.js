// SettingsModal.js - Options & Settings Modal for Graphics Quality, Music Volume and Exit to Title
export class SettingsModal {
  constructor(options = {}) {
    this.renderer = options.renderer || null;
    this.scene = options.scene || null;
    this.audio = options.audio || null;
    this.onExitToTitle = options.onExitToTitle || null;
    this.onSaveProgress = options.onSaveProgress || null;

    this.isOpen = false;
    this.currentQuality = localStorage.getItem('axie_tactics_graphics_quality') || 'high';
    this.musicVolume = localStorage.getItem('axie_tactics_music_vol') !== null
      ? parseInt(localStorage.getItem('axie_tactics_music_vol'), 10)
      : 75;
    this.sfxVolume = localStorage.getItem('axie_tactics_sfx_vol') !== null
      ? parseInt(localStorage.getItem('axie_tactics_sfx_vol'), 10)
      : 80;

    this._createDOM();
    this._initSettings();
  }

  _createDOM() {
    let modal = document.getElementById('settings-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settings-modal';
      modal.className = 'settings-modal hidden';
      modal.innerHTML = `
        <div class="settings-backdrop"></div>
        <div class="settings-container">
          <!-- Modal Header -->
          <div class="settings-header">
            <div class="settings-title-group">
              <span class="settings-badge">⚙️ SETTINGS</span>
              <h2 class="settings-title">Game Options</h2>
            </div>
            <button id="settings-close-btn" class="settings-close-btn" title="Close [Escape]">✕</button>
          </div>

          <!-- Modal Body -->
          <div class="settings-body">
            <!-- Section 1: Graphics Quality -->
            <div class="settings-section">
              <div class="section-heading">
                <span class="section-icon">🎨</span>
                <div class="section-info">
                  <h3>Graphics Quality</h3>
                  <p>Adjust 3D detail and resolution for your device.</p>
                </div>
              </div>
              <div class="quality-selector-group">
                <button class="quality-btn" data-quality="low">
                  <span class="q-icon">⚡</span>
                  <span class="q-name">Low</span>
                  <span class="q-sub">Max Performance</span>
                </button>
                <button class="quality-btn" data-quality="medium">
                  <span class="q-icon">⚖️</span>
                  <span class="q-name">Medium</span>
                  <span class="q-sub">Balanced</span>
                </button>
                <button class="quality-btn" data-quality="high">
                  <span class="q-icon">🌟</span>
                  <span class="q-name">High</span>
                  <span class="q-sub">Max Detail</span>
                </button>
              </div>
            </div>

            <!-- Section 2: Audio Settings -->
            <div class="settings-section">
              <div class="section-heading">
                <span class="section-icon">🎵</span>
                <div class="section-info">
                  <h3>Audio & Soundtrack</h3>
                  <p>Adjust background music and combat sound effects volume.</p>
                </div>
              </div>

              <div class="audio-sliders-group">
                <!-- Music Volume Slider -->
                <div class="audio-slider-row">
                  <div class="slider-label-col">
                    <span class="slider-name">🎼 Background Music</span>
                    <span id="settings-music-val" class="slider-val-badge">75%</span>
                  </div>
                  <input type="range" id="settings-music-slider" class="settings-range-slider" min="0" max="100" value="75" />
                </div>

                <!-- SFX Volume Slider -->
                <div class="audio-slider-row">
                  <div class="slider-label-col">
                    <span class="slider-name">⚔️ Sound Effects (SFX)</span>
                    <span id="settings-sfx-val" class="slider-val-badge">80%</span>
                  </div>
                  <input type="range" id="settings-sfx-slider" class="settings-range-slider" min="0" max="100" value="80" />
                </div>

                <!-- Mute Toggle Switch -->
                <div class="audio-mute-row">
                  <span class="slider-name">Mute All Audio</span>
                  <button id="settings-mute-btn" class="settings-mute-toggle-btn">
                    <span id="settings-mute-icon">🔊</span>
                    <span id="settings-mute-text">Sound On</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Section 3: Exit / Return to Main Menu -->
            <div class="settings-section exit-section">
              <div class="section-heading">
                <span class="section-icon">🚪</span>
                <div class="section-info">
                  <h3>Game & Exit</h3>
                  <p>Save your adventure progress and return to the main menu.</p>
                </div>
              </div>
              <div class="exit-actions-container">
                <button id="btn-save-and-exit-title" class="settings-exit-btn">
                  <span>🏠</span> Save & Exit to Main Menu
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="settings-footer">
            <button id="settings-resume-btn" class="settings-resume-btn">
              🌿 Return to Game
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    this.modalEl = modal;
    this.closeBtn = document.getElementById('settings-close-btn');
    this.resumeBtn = document.getElementById('settings-resume-btn');
    this.exitBtn = document.getElementById('btn-save-and-exit-title');
    this.musicSlider = document.getElementById('settings-music-slider');
    this.musicValEl = document.getElementById('settings-music-val');
    this.sfxSlider = document.getElementById('settings-sfx-slider');
    this.sfxValEl = document.getElementById('settings-sfx-val');
    this.muteBtn = document.getElementById('settings-mute-btn');
    this.muteIcon = document.getElementById('settings-mute-icon');
    this.muteText = document.getElementById('settings-mute-text');
    this.qualityBtns = modal.querySelectorAll('.quality-btn');

    this._bindEvents();
  }

  _initSettings() {
    // 1. Initialize sliders values
    if (this.musicSlider) {
      this.musicSlider.value = this.musicVolume;
      if (this.musicValEl) this.musicValEl.textContent = `${this.musicVolume}%`;
    }
    if (this.sfxSlider) {
      this.sfxSlider.value = this.sfxVolume;
      if (this.sfxValEl) this.sfxValEl.textContent = `${this.sfxVolume}%`;
    }

    // 2. Apply initial volumes
    if (this.audio && this.audio.music) {
      this.audio.music.setVolume(this.musicVolume / 100);
    }
    if (this.audio && this.audio.masterGain && this.audio.ctx) {
      this.audio.masterGain.gain.setValueAtTime((this.sfxVolume / 100) * 0.25, this.audio.ctx.currentTime);
    }

    // 3. Update mute UI
    this._updateMuteUI();

    // 4. Apply initial graphics quality
    this.applyQuality(this.currentQuality);
  }

  _bindEvents() {
    // Close / Resume Buttons
    const handleClose = () => {
      if (this.audio && typeof this.audio.playClick === 'function') {
        this.audio.playClick();
      }
      this.close();
    };

    if (this.closeBtn) this.closeBtn.addEventListener('click', handleClose);
    if (this.resumeBtn) this.resumeBtn.addEventListener('click', handleClose);

    // Backdrop click to close
    const backdrop = this.modalEl.querySelector('.settings-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', handleClose);
    }

    // Graphics Quality Buttons
    this.qualityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const quality = btn.getAttribute('data-quality');
        if (quality) {
          if (this.audio && typeof this.audio.playClick === 'function') {
            this.audio.playClick();
          }
          this.applyQuality(quality);
        }
      });
    });

    // Music Volume Slider
    if (this.musicSlider) {
      this.musicSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.musicVolume = val;
        if (this.musicValEl) this.musicValEl.textContent = `${val}%`;
        localStorage.setItem('axie_tactics_music_vol', val);

        if (this.audio && this.audio.music) {
          this.audio.music.setVolume(val / 100);
        }
      });
    }

    // SFX Volume Slider
    if (this.sfxSlider) {
      this.sfxSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.sfxVolume = val;
        if (this.sfxValEl) this.sfxValEl.textContent = `${val}%`;
        localStorage.setItem('axie_tactics_sfx_vol', val);

        if (this.audio && this.audio.masterGain && this.audio.ctx && !this.audio.isMuted) {
          this.audio.masterGain.gain.setValueAtTime((val / 100) * 0.25, this.audio.ctx.currentTime);
        }
      });
    }

    // Mute Toggle Button
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        if (this.audio && typeof this.audio.toggleMute === 'function') {
          this.audio.toggleMute();
          this._updateMuteUI();

          // Sync HUD sound buttons
          const ovSoundBtn = document.getElementById('btn-toggle-sound');
          if (ovSoundBtn) ovSoundBtn.textContent = this.audio.isMuted ? '🔇 Muted' : '🔊 Sound';
          const battleMuteBtn = document.getElementById('btn-mute');
          if (battleMuteBtn) battleMuteBtn.textContent = this.audio.isMuted ? '🔇' : '🔊';
        }
      });
    }

    // Save & Exit to Title Button
    if (this.exitBtn) {
      this.exitBtn.addEventListener('click', () => {
        if (this.audio && typeof this.audio.playConfirm === 'function') {
          this.audio.playConfirm();
        }
        if (typeof this.onSaveProgress === 'function') {
          this.onSaveProgress();
        }
        this.close();
        if (typeof this.onExitToTitle === 'function') {
          this.onExitToTitle();
        }
      });
    }
  }

  applyQuality(preset) {
    this.currentQuality = preset;
    localStorage.setItem('axie_tactics_graphics_quality', preset);

    // Update active button state
    this.qualityBtns.forEach(btn => {
      const q = btn.getAttribute('data-quality');
      btn.classList.toggle('active', q === preset);
    });

    let pixelRatio = 1.0;
    let shadows = true;

    if (preset === 'low') {
      pixelRatio = 0.80;
      shadows = false;
    } else if (preset === 'medium') {
      pixelRatio = 1.0;
      shadows = true;
    } else { // high
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2.0);
      shadows = true;
    }

    if (this.renderer) {
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      if (this.renderer.shadowMap.enabled !== shadows) {
        this.renderer.shadowMap.enabled = shadows;
        if (this.scene) {
          this.scene.traverse((obj) => {
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.needsUpdate = true);
              } else {
                obj.material.needsUpdate = true;
              }
            }
          });
        }
      }
    }
  }

  _updateMuteUI() {
    const isMuted = this.audio ? Boolean(this.audio.isMuted) : false;
    if (this.muteIcon) this.muteIcon.textContent = isMuted ? '🔇' : '🔊';
    if (this.muteText) this.muteText.textContent = isMuted ? 'Muted' : 'Sound On';
    if (this.muteBtn) this.muteBtn.classList.toggle('is-muted', isMuted);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._updateMuteUI();

    if (this.audio && typeof this.audio.playConfirm === 'function') {
      this.audio.playConfirm();
    }

    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.remove('fade-out');
    this.modalEl.style.display = 'flex';
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.modalEl.classList.add('fade-out');

    setTimeout(() => {
      this.modalEl.classList.add('hidden');
      this.modalEl.classList.remove('fade-out');
      this.modalEl.style.display = 'none';
    }, 250);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
