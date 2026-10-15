// MinimapHUD.js - Sleek Real-Time Overworld Minimap / Tactical Radar (Top-Right HUD)
import { ISLANDS_REGISTRY } from '../world/MapRegistry.js';

export class MinimapHUD {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.container = null;
    this.canvas = null;
    this.ctx = null;

    // Radar configuration
    this.size = 180; // canvas pixel size
    this.center = this.size / 2;
    this.radius = 78; // circular radar radius

    // Zoom levels (in meters of world radius visible on radar)
    this.zoomLevels = [45, 80, 140];
    this.zoomIndex = 1; // default ~80m radius
    this.radarRadiusMeters = this.zoomLevels[this.zoomIndex];

    this.isVisible = true;
    this.pulseTime = 0;

    this._createDOM();
  }

  _createDOM() {
    let el = document.getElementById('overworld-minimap-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'overworld-minimap-hud';
      el.className = 'overworld-minimap-hud';
      el.innerHTML = `
        <div class="minimap-outer-wrapper">
          <!-- Zone Title Bar -->
          <div class="minimap-header">
            <span class="minimap-biome-dot"></span>
            <span id="minimap-zone-title" class="minimap-zone-title">🌲 Isla del Bosque</span>
            <button id="minimap-map-btn" class="minimap-expand-btn" title="Open Island Map [M]">🗺️</button>
          </div>

          <!-- Radar Frame & Canvas -->
          <div class="minimap-radar-frame" id="minimap-radar-frame" title="Click to view Island Map [M]">
            <canvas id="minimap-canvas" width="${this.size}" height="${this.size}"></canvas>

            <!-- Cardinal Compass Labels -->
            <span class="compass-marker compass-n">N</span>
            <span class="compass-marker compass-s">S</span>
            <span class="compass-marker compass-e">E</span>
            <span class="compass-marker compass-w">W</span>

            <!-- Zoom Controls -->
            <div class="minimap-zoom-controls">
              <button id="minimap-zoom-in" class="minimap-zoom-btn" title="Zoom In">+</button>
              <button id="minimap-zoom-out" class="minimap-zoom-btn" title="Zoom Out">−</button>
            </div>
          </div>

          <!-- Live Coordinates & Tracker -->
          <div class="minimap-footer">
            <span id="minimap-coords-text" class="minimap-coords-text">X: 0.0 | Z: 0.0</span>
            <span id="minimap-target-dist" class="minimap-target-dist hidden">🎯 0m</span>
          </div>
        </div>
      `;
      document.body.appendChild(el);
    }

    this.container = el;
    this.canvas = document.getElementById('minimap-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }

    // Event listeners
    const radarFrame = document.getElementById('minimap-radar-frame');
    if (radarFrame) {
      radarFrame.addEventListener('click', (e) => {
        // Prevent click if clicking zoom buttons
        if (e.target.closest('.minimap-zoom-controls')) return;
        this.openMapModal();
      });
    }

    const mapBtn = document.getElementById('minimap-map-btn');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => this.openMapModal());
    }

    const zoomInBtn = document.getElementById('minimap-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.zoomIn();
      });
    }

    const zoomOutBtn = document.getElementById('minimap-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.zoomOut();
      });
    }
  }

  zoomIn() {
    if (this.zoomIndex > 0) {
      this.zoomIndex--;
      this.radarRadiusMeters = this.zoomLevels[this.zoomIndex];
    }
  }

  zoomOut() {
    if (this.zoomIndex < this.zoomLevels.length - 1) {
      this.zoomIndex++;
      this.radarRadiusMeters = this.zoomLevels[this.zoomIndex];
    }
  }

  openMapModal() {
    if (this.om && this.om.worldMapManager) {
      this.om.worldMapManager.openWorldMap();
      if (this.om.worldMapManager.worldMapModal) {
        this.om.worldMapManager.worldMapModal.switchTab('island');
      }
    }
  }

  show() {
    this.isVisible = true;
    if (this.container) this.container.classList.remove('hidden');
  }

  hide() {
    this.isVisible = false;
    if (this.container) this.container.classList.add('hidden');
  }

  update(dt, playerPos, playerRotationY, npcs = [], questTargetPos = null) {
    if (!this.isVisible || !this.ctx || !playerPos) return;

    this.pulseTime += dt * 3.0;

    // Update live coordinates text & zone title
    const isSavannah = Boolean(ISLANDS_REGISTRY.island_savannah?.isCurrent);
    const titleEl = document.getElementById('minimap-zone-title');
    if (titleEl) {
      titleEl.textContent = isSavannah ? '🏜️ Isla de la Sabana' : '🌲 Isla del Bosque';
    }

    const coordsEl = document.getElementById('minimap-coords-text');
    if (coordsEl) {
      coordsEl.textContent = `X: ${playerPos.x.toFixed(1)} | Z: ${playerPos.z.toFixed(1)}`;
    }

    const ctx = this.ctx;
    const cx = this.center;
    const cy = this.center;
    const r = this.radius;
    const scale = r / this.radarRadiusMeters; // pixels per world meter

    // Clear canvas
    ctx.clearRect(0, 0, this.size, this.size);

    // 1. Radar Circular Mask & Base Background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Dark high-tech / fantasy slate background
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    bgGrad.addColorStop(0, '#0f1f1d');
    bgGrad.addColorStop(0.7, '#071317');
    bgGrad.addColorStop(1, '#03080c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.size, this.size);

    // 2. Subtle Water / River Flow indication (relative to player)
    // River crosses from roughly (-60, -40) to (40, 20)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 14 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const riverWaypoints = [
      { x: -50, z: -45 },
      { x: -20, z: -25 },
      { x: 10, z: 0 },
      { x: 35, z: 25 },
      { x: 60, z: 45 }
    ];
    riverWaypoints.forEach((pt, idx) => {
      const rx = cx + (pt.x - playerPos.x) * scale;
      const ry = cy + (pt.z - playerPos.z) * scale;
      if (idx === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    });
    ctx.stroke();

    // 3. Roads / Paths cues
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.28)';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    const roadWaypoints = [
      { x: -95, z: 25 },
      { x: -88, z: 65 },
      { x: -68, z: 5 },
      { x: -40, z: -18 },
      { x: -10, z: -38 },
      { x: 15, z: 26 },
      { x: 8, z: 46 }
    ];
    roadWaypoints.forEach((pt, idx) => {
      const rx = cx + (pt.x - playerPos.x) * scale;
      const ry = cy + (pt.z - playerPos.z) * scale;
      if (idx === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    });
    ctx.stroke();

    // 4. Radar Grid Rings (Range circles: 25m, 50m, 75m...)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.lineWidth = 1;
    [0.35, 0.70, 1.0].forEach(frac => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // 5. Landmarks Icons on Radar
    const landmarks = ISLANDS_REGISTRY.island_forest.landmarks;
    landmarks.forEach(lm => {
      if (!lm.coords) return;
      const dx = (lm.coords.x - playerPos.x) * scale;
      const dy = (lm.coords.z - playerPos.z) * scale;
      const distSq = dx * dx + dy * dy;

      if (distSq < (r - 6) * (r - 6)) {
        ctx.save();
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lm.icon, cx + dx, cy + dy);
        ctx.restore();
      }
    });

    // 6. NPCs on Radar
    if (npcs && npcs.length > 0) {
      npcs.forEach(npc => {
        if (!npc.position) return;
        const nx = npc.position.x;
        const nz = npc.position.z;
        const dx = (nx - playerPos.x) * scale;
        const dy = (nz - playerPos.z) * scale;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= r - 4) {
          // NPC Dot & Halo
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = npc.type === 'mentor' ? '#f59e0b' : '#38bdf8';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // NPC Icon
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = npc.type === 'mentor' ? '🥋' : '💬';
          ctx.fillText(icon, cx + dx, cy + dy - 7);
        }
      });
    }

    // 7. Active Quest Target Indicator
    const distTextEl = document.getElementById('minimap-target-dist');
    if (questTargetPos) {
      const qdx = (questTargetPos.x - playerPos.x);
      const qdz = (questTargetPos.z - playerPos.z);
      const worldDist = Math.sqrt(qdx * qdx + qdz * qdz);

      if (distTextEl) {
        distTextEl.classList.remove('hidden');
        distTextEl.textContent = `🎯 ${Math.round(worldDist)}m`;
      }

      const screenDx = qdx * scale;
      const screenDy = qdz * scale;
      const screenDist = Math.sqrt(screenDx * screenDx + screenDy * screenDy);

      if (screenDist <= r - 10) {
        // Within radar range: Pulsing quest pin
        const pulse = 1.0 + Math.sin(this.pulseTime) * 0.25;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx + screenDx, cy + screenDy, 7 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.fill();

        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎯', cx + screenDx, cy + screenDy);
        ctx.restore();
      } else {
        // Clamped to perimeter: Arrow pointing towards target
        const angle = Math.atan2(screenDy, screenDx);
        const clampRadius = r - 10;
        const px = cx + Math.cos(angle) * clampRadius;
        const py = cy + Math.sin(angle) * clampRadius;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);

        // Golden chevron
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-6, -6);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    } else {
      if (distTextEl) distTextEl.classList.add('hidden');
    }

    // 8. Player Entity at Canvas Center (cx, cy)
    // Real-time look direction & vision cone
    const yaw = (playerRotationY !== undefined && playerRotationY !== null) ? playerRotationY : 0;
    // Calculate 2D angle in canvas coordinates (+X = East/Right, +Y = South/Down)
    const dirX = Math.sin(yaw);
    const dirY = Math.cos(yaw);
    const canvasHeading = Math.atan2(dirY, dirX);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(canvasHeading);

    // Forward light cone (oriented along look heading)
    const coneGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.50)');
    coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 26, -Math.PI / 5, Math.PI / 5);
    ctx.closePath();
    ctx.fill();

    // Direction arrow pointing forward
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Player center dot
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    ctx.restore(); // Restore clip

    // 9. Outer Ring & Golden Radar Bezel
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isSavannah ? 'rgba(250, 198, 81, 0.85)' : 'rgba(34, 197, 94, 0.75)'; // Biome Accent
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();
  }
}
