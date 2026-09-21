// BattleTransition.js - Dramatic Screen Shatter & Flash Battle Encounter Transition
export class BattleTransition {
  constructor(audioSystem) {
    this.audio = audioSystem;
    this.isTransitioning = false;
    this._createDOM();
  }

  _createDOM() {
    let el = document.getElementById('battle-transition-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'battle-transition-overlay';
      el.className = 'battle-transition hidden';
      el.innerHTML = `
        <div class="transition-flash"></div>
        <div class="transition-vortex">
          <div class="rune-glyph rune-1">⚔️</div>
          <div class="rune-glyph rune-2">✦</div>
          <div class="rune-glyph rune-3">⚡</div>
          <div class="rune-glyph rune-4">✦</div>
        </div>
        <div class="transition-text">TACTICAL COMBAT!</div>
      `;
      document.body.appendChild(el);
    }
    this.overlayEl = el;
  }

  /**
   * Plays the full cinematic encounter transition.
   * @param {Function} onBlackout - Called when screen is fully blacked out so scene can swap.
   * @param {Function} onComplete - Called when the entire sequence finishes.
   */
  async playEncounter(onBlackout = null, onComplete = null) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Audio cue
    if (this.audio && typeof this.audio.playImpact === 'function') {
      this.audio.playImpact();
    } else if (this.audio && typeof this.audio.playCollision === 'function') {
      this.audio.playCollision();
    }
    if (this.audio && typeof this.audio.stopMusic === 'function') {
      this.audio.stopMusic(600);
    }

    this.overlayEl.classList.remove('hidden');
    this.overlayEl.classList.remove('fade-out');
    this.overlayEl.classList.add('active');

    // Wait for flash and dramatic text zoom (1.1s)
    await new Promise(r => setTimeout(r, 1100));

    if (onBlackout && typeof onBlackout === 'function') {
      await onBlackout();
    }

    // Wait a brief moment in the arena loading state
    await new Promise(r => setTimeout(r, 400));

    // Smoothly fade out transition overlay
    this.overlayEl.classList.add('fade-out');
    await new Promise(r => setTimeout(r, 600));

    this.overlayEl.classList.remove('active');
    this.overlayEl.classList.remove('fade-out');
    this.overlayEl.classList.add('hidden');
    this.isTransitioning = false;

    if (onComplete && typeof onComplete === 'function') {
      onComplete();
    }
  }

  /**
   * Plays a smooth return transition from tactical battle back to the Overworld.
   */
  async playReturn(onBlackout = null, onComplete = null) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.overlayEl.classList.remove('hidden');
    this.overlayEl.classList.add('return-fade');

    await new Promise(r => setTimeout(r, 500));

    if (onBlackout && typeof onBlackout === 'function') {
      await onBlackout();
    }

    await new Promise(r => setTimeout(r, 300));

    this.overlayEl.classList.add('fade-out');
    await new Promise(r => setTimeout(r, 600));

    this.overlayEl.classList.remove('return-fade');
    this.overlayEl.classList.remove('fade-out');
    this.overlayEl.classList.add('hidden');
    this.isTransitioning = false;

    if (onComplete && typeof onComplete === 'function') {
      onComplete();
    }
  }
}
