// WorldMapModal.js - Dual-Mode World Map Overlay: 5-Islands Cross World Map & High-Detail Island Map
import {
  ISLANDS_REGISTRY,
  ISLANDS_LAYOUT,
  BIOME_COLORS,
  BIOME_LABELS,
  WORLD_GRID_MATRIX,
  MAP_REGISTRY
} from './MapRegistry.js';

export class WorldMapModal {
  constructor(worldMapManager) {
    this.wmm = worldMapManager;
    this.isOpen = false;
    this.currentTab = 'world'; // 'world' | 'island'
    this.selectedIslandKey = 'island_forest';
    this.selectedZone = null;

    // Island map canvas state
    this.islandCanvas = null;
    this.islandCtx = null;
    this.islandHoverPoi = null;
    this.islandZoom = 1.0;
    this.islandPan = { x: 0, y: 0 };
    this.islandCenterOnPlayer = true;
    this.animFrameId = null;

    this._createDOM();
  }

  _createDOM() {
    let modal = document.getElementById('world-map-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'world-map-modal';
      modal.className = 'world-map-modal hidden';
      modal.innerHTML = `
        <div class="world-map-backdrop"></div>
        <div class="world-map-container">
          <!-- Header -->
          <div class="world-map-header">
            <div class="world-map-title-group">
              <span class="world-map-badge">LUNACIA OVERWORLD</span>
              <h2 class="world-map-title" id="world-map-main-title">Mapa de las 5 Islas</h2>
            </div>

            <!-- Tab Navigation Switcher -->
            <div class="world-map-tabs">
              <button id="map-tab-world-btn" class="map-tab-btn active" title="Vista de las 5 Grandes Islas">
                🌍 Mapa Mundi (5 Islas)
              </button>
              <button id="map-tab-island-btn" class="map-tab-btn" title="Mapa detallado de la Isla del Bosque">
                🏝️ Mapa de la Isla (Bosque)
              </button>
            </div>

            <button id="world-map-close-btn" class="world-map-close-btn" title="Cerrar [M]">✕</button>
          </div>

          <!-- Biome Legend Bar -->
          <div class="world-map-legend">
            <div class="legend-item"><span class="legend-dot" style="background:#22c55e"></span> 🌲 Bosque (Centro)</div>
            <div class="legend-item"><span class="legend-dot" style="background:#38bdf8"></span> ❄️ Ártico (Norte)</div>
            <div class="legend-item"><span class="legend-dot" style="background:#FAC651"></span> 🏜️ Sabana (Este)</div>
            <div class="legend-item"><span class="legend-dot" style="background:#6366f1"></span> 🔮 Místico (Oeste)</div>
            <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> 🏰 Mazmorra (Sur)</div>
          </div>

          <!-- Main Layout: Views + Detail Sidebar -->
          <div class="world-map-body">

            <!-- VIEW 1: World Map (5 Islands Cross Layout) -->
            <div id="view-world-islands" class="world-map-view-panel">
              <div class="islands-cross-container" id="islands-cross-container">
                <!-- SVG Connecting Sea Routes -->
                <svg class="islands-sea-routes" viewBox="0 0 460 460" preserveAspectRatio="none">
                  <!-- Dotted lines connecting center to 4 surrounding islands -->
                  <line x1="230" y1="230" x2="230" y2="70" class="sea-route-line route-north" />
                  <line x1="230" y1="230" x2="70" y2="230" class="sea-route-line route-west" />
                  <line x1="230" y1="230" x2="390" y2="230" class="sea-route-line route-east" />
                  <line x1="230" y1="230" x2="230" y2="390" class="sea-route-line route-south" />
                  <circle cx="230" cy="230" r="155" class="sea-route-circle" />
                </svg>

                <!-- 3x3 Cross Grid for the 5 Islands -->
                <div class="islands-cross-grid" id="islands-cross-grid"></div>
              </div>
            </div>

            <!-- VIEW 2: High-Detail Island Map (Isla del Bosque) -->
            <div id="view-island-detail" class="world-map-view-panel hidden">
              <div class="island-canvas-wrapper" id="island-canvas-wrapper">
                <canvas id="island-map-canvas" width="560" height="440"></canvas>
                
                <!-- On-Canvas Controls -->
                <div class="island-map-hud-controls">
                  <button id="btn-island-recenter" class="island-hud-btn" title="Centrar en el jugador">🎯 Centrar</button>
                  <button id="btn-island-zoom-in" class="island-hud-btn" title="Aumentar zoom">+</button>
                  <button id="btn-island-zoom-out" class="island-hud-btn" title="Reducir zoom">−</button>
                </div>

                <!-- Floating Tooltip on Island Map Hover -->
                <div id="island-map-tooltip" class="island-map-tooltip hidden">
                  <div id="tooltip-title" class="tooltip-title">Punto de Interés</div>
                  <div id="tooltip-desc" class="tooltip-desc">Descripción</div>
                  <div id="tooltip-coords" class="tooltip-coords">X: 0.0 | Z: 0.0</div>
                </div>

                <!-- Island Map Watermark / Scale -->
                <div class="island-map-watermark">
                  <span id="island-watermark-title">🌲 ISLA DEL BOSQUE · LUNACIA</span>
                  <span id="island-cursor-coords">Cursor: X 0.0 | Z 0.0</span>
                </div>
              </div>
            </div>

            <!-- Detail Sidebar for Active / Selected Island or Landmark -->
            <div id="world-map-detail" class="world-map-detail">
              <div class="detail-header">
                <span id="detail-biome-badge" class="detail-biome-badge">🌲 BOSQUE</span>
                <h3 id="detail-zone-name" class="detail-zone-name">Isla del Bosque</h3>
                <span id="detail-zone-coord" class="detail-zone-coord">Ubicación: Centro [Demo Activa]</span>
              </div>

              <!-- Island Level Range & Tagline -->
              <div class="detail-meta-box">
                <div class="detail-meta-item">
                  <span class="meta-label">Rango:</span>
                  <span id="detail-level-range" class="meta-val">Nivel 1 - 10</span>
                </div>
                <div class="detail-meta-item">
                  <span class="meta-label">Estado:</span>
                  <span id="detail-status-badge" class="meta-val status-active">Explorable</span>
                </div>
              </div>

              <!-- Island Lore Description -->
              <div class="detail-section">
                <div class="section-label">Descripción del Bioma</div>
                <p id="detail-island-desc" class="detail-desc-text">
                  Valle templado y verde custodiado por el Gran Árbol Sagrado de Atia. Centro de entrenamiento marcial donde el Maestro Paladill instruye a los jóvenes reclutas de Lunacia.
                </p>
              </div>

              <!-- Key Landmarks / POIs List -->
              <div class="detail-section">
                <div class="section-label" id="detail-landmarks-header">Puntos de Interés</div>
                <div id="detail-landmarks-list" class="detail-landmarks-list">
                  <!-- Populated dynamically -->
                </div>
              </div>

              <!-- Action Button (Go to Island Map) -->
              <div class="detail-action-container" id="detail-action-container">
                <button id="btn-detail-switch-view" class="detail-action-btn">
                  🏝️ Ver Mapa de la Isla
                </button>
              </div>

              <!-- Quick action hint -->
              <div class="detail-footer-hint">
                Presiona <kbd>[M]</kbd> o haz clic en <kbd>[✕]</kbd> para volver a la aventura.
              </div>
            </div>

          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event listeners
      modal.querySelector('.world-map-backdrop').addEventListener('click', () => this.close());
      document.getElementById('world-map-close-btn').addEventListener('click', () => this.close());

      // Tabs
      document.getElementById('map-tab-world-btn').addEventListener('click', () => this.switchTab('world'));
      document.getElementById('map-tab-island-btn').addEventListener('click', () => this.switchTab('island'));

      // Switch View button in sidebar
      const switchBtn = document.getElementById('btn-detail-switch-view');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          if (this.currentTab === 'world') {
            this.switchTab('island');
          } else {
            this.switchTab('world');
          }
        });
      }

      // Island Canvas controls
      const recenterBtn = document.getElementById('btn-island-recenter');
      if (recenterBtn) {
        recenterBtn.addEventListener('click', () => {
          this.islandPan.x = 0;
          this.islandPan.y = 0;
          this.islandZoom = 1.0;
          this.renderIslandMap();
        });
      }

      const zoomInBtn = document.getElementById('btn-island-zoom-in');
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
          this.islandZoom = Math.min(2.5, this.islandZoom * 1.25);
          this.renderIslandMap();
        });
      }

      const zoomOutBtn = document.getElementById('btn-island-zoom-out');
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
          this.islandZoom = Math.max(0.6, this.islandZoom / 1.25);
          this.renderIslandMap();
        });
      }

      // Setup Island Map Canvas interaction
      this._setupIslandCanvasInteraction();

      // Prevent wheel scrolling from zooming 3D camera
      modal.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }

    this.modalEl = modal;
    this.viewWorldEl = document.getElementById('view-world-islands');
    this.viewIslandEl = document.getElementById('view-island-detail');
    this.crossGridEl = document.getElementById('islands-cross-grid');
    this.detailEl = document.getElementById('world-map-detail');
    this.islandCanvas = document.getElementById('island-map-canvas');
    if (this.islandCanvas) {
      this.islandCtx = this.islandCanvas.getContext('2d');
    }
  }

  _setupIslandCanvasInteraction() {
    if (!this.islandCanvas) return;

    const canvas = this.islandCanvas;
    const tooltip = document.getElementById('island-map-tooltip');
    const cursorCoordsEl = document.getElementById('island-cursor-coords');

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - this.islandPan.x;
      startY = e.clientY - this.islandPan.y;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDragging) {
        this.islandPan.x = e.clientX - startX;
        this.islandPan.y = e.clientY - startY;
        this.renderIslandMap();
        return;
      }

      // Convert canvas pixels to world coordinates (centered at canvas middle)
      const cx = canvas.width / 2 + this.islandPan.x;
      const cy = canvas.height / 2 + this.islandPan.y;
      const scale = 1.35 * this.islandZoom; // pixel per world meter

      const worldX = (mouseX - cx) / scale;
      const worldZ = (mouseY - cy) / scale;

      if (cursorCoordsEl) {
        cursorCoordsEl.textContent = `Cursor: X ${worldX.toFixed(1)} | Z ${worldZ.toFixed(1)}`;
      }

      // Check hover on landmarks / NPCs
      const currentIslandKey = ISLANDS_REGISTRY.island_savannah?.isCurrent ? 'island_savannah' : 'island_forest';
      const currentIsland = ISLANDS_REGISTRY[currentIslandKey];
      const landmarks = currentIsland?.landmarks || [];
      let foundPoi = null;

      landmarks.forEach(lm => {
        if (!lm.coords) return;
        const px = cx + lm.coords.x * scale;
        const py = cy + lm.coords.z * scale;
        const distSq = (mouseX - px) * (mouseX - px) + (mouseY - py) * (mouseY - py);
        if (distSq < 18 * 18) {
          foundPoi = { ...lm, screenX: px, screenY: py };
        }
      });

      // Check player position hover
      const playerPos = this.wmm?.om?.player?.position;
      if (playerPos) {
        const ppx = cx + playerPos.x * scale;
        const ppy = cy + playerPos.z * scale;
        const distSq = (mouseX - ppx) * (mouseX - ppx) + (mouseY - ppy) * (mouseY - ppy);
        if (distSq < 16 * 16) {
          foundPoi = {
            name: 'Tu Personaje (Héroe)',
            desc: `Posición actual en la ${currentIsland?.name || 'Isla'}.`,
            coords: { x: playerPos.x, z: playerPos.z },
            icon: '⚔️',
            screenX: ppx,
            screenY: ppy
          };
        }
      }

      if (foundPoi && tooltip) {
        tooltip.classList.remove('hidden');
        tooltip.style.left = `${Math.min(canvas.width - 200, Math.max(10, foundPoi.screenX - 70))}px`;
        tooltip.style.top = `${Math.max(10, foundPoi.screenY - 75)}px`;

        const titleEl = document.getElementById('tooltip-title');
        const descEl = document.getElementById('tooltip-desc');
        const coordsEl = document.getElementById('tooltip-coords');

        if (titleEl) titleEl.textContent = `${foundPoi.icon || '📍'} ${foundPoi.name}`;
        if (descEl) descEl.textContent = foundPoi.desc || '';
        if (coordsEl) coordsEl.textContent = `X: ${foundPoi.coords.x.toFixed(1)} | Z: ${foundPoi.coords.z.toFixed(1)}`;

        this.islandHoverPoi = foundPoi;
        canvas.style.cursor = 'pointer';
      } else if (tooltip) {
        tooltip.classList.add('hidden');
        this.islandHoverPoi = null;
        canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.classList.add('hidden');
      this.islandHoverPoi = null;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 1.15 : 0.88;
      this.islandZoom = Math.min(2.5, Math.max(0.6, this.islandZoom * zoomDelta));
      this.renderIslandMap();
    }, { passive: false });
  }

  switchTab(tab) {
    this.currentTab = tab;

    const worldBtn = document.getElementById('map-tab-world-btn');
    const islandBtn = document.getElementById('map-tab-island-btn');
    const titleEl = document.getElementById('world-map-main-title');
    const switchBtn = document.getElementById('btn-detail-switch-view');

    if (tab === 'world') {
      if (worldBtn) worldBtn.classList.add('active');
      if (islandBtn) islandBtn.classList.remove('active');
      if (this.viewWorldEl) this.viewWorldEl.classList.remove('hidden');
      if (this.viewIslandEl) this.viewIslandEl.classList.add('hidden');
      if (titleEl) titleEl.textContent = 'Mapa de las 5 Islas';
      if (switchBtn) switchBtn.textContent = '🏝️ Ver Mapa de la Isla';

      const currentIslandKey = ISLANDS_REGISTRY.island_savannah?.isCurrent ? 'island_savannah' : 'island_forest';
      this.renderIslandsCross();
      this.selectIsland(this.selectedIslandKey || currentIslandKey);
    } else {
      const currentIslandKey = ISLANDS_REGISTRY.island_savannah?.isCurrent ? 'island_savannah' : 'island_forest';
      const currentIsland = ISLANDS_REGISTRY[currentIslandKey];

      if (worldBtn) worldBtn.classList.remove('active');
      if (islandBtn) islandBtn.classList.add('active');
      if (this.viewWorldEl) this.viewWorldEl.classList.add('hidden');
      if (this.viewIslandEl) this.viewIslandEl.classList.remove('hidden');
      if (titleEl) titleEl.textContent = `Mapa de la ${currentIsland?.name || 'Isla'}`;
      if (switchBtn) switchBtn.textContent = '🌍 Volver a Mapa Mundi';

      this.selectIsland(currentIslandKey);
      this.renderIslandMap();
    }
  }

  renderIslandsCross() {
    if (!this.crossGridEl) return;
    this.crossGridEl.innerHTML = '';

    const qm = this.wmm?.om?.questManager;
    const trackedQuest = qm ? qm.getTrackedQuest() : null;

    // 3x3 layout iteration
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const islandId = ISLANDS_LAYOUT[r][c];

        if (!islandId) {
          // Empty ocean slot
          const oceanCell = document.createElement('div');
          oceanCell.className = 'island-cell island-cell-ocean';
          // Corner decor
          if (r === 0 && c === 0) oceanCell.innerHTML = `<span class="ocean-compass-rose">✦</span>`;
          if (r === 0 && c === 2) oceanCell.innerHTML = `<span class="ocean-compass-rose">✦</span>`;
          if (r === 2 && c === 0) oceanCell.innerHTML = `<span class="ocean-compass-rose">✦</span>`;
          if (r === 2 && c === 2) oceanCell.innerHTML = `<span class="ocean-compass-rose">✦</span>`;
          this.crossGridEl.appendChild(oceanCell);
          continue;
        }

        const island = ISLANDS_REGISTRY[islandId];
        const isCurrent = island.isCurrent;
        const isSelected = this.selectedIslandKey === island.id;

        const cell = document.createElement('div');
        cell.className = `island-cell island-card biome-${island.biome} ${isCurrent ? 'current-island-cell' : ''} ${isSelected ? 'selected-island' : ''}`;
        cell.dataset.islandId = island.id;
        cell.style.borderColor = island.color;

        let statusBadge = isCurrent
          ? `<span class="island-status-pill status-current">⚔️ Tu Ubicación</span>`
          : '';

        let pinHTML = '';
        if (isCurrent) {
          pinHTML = `
            <div class="island-player-pin" title="Tu posición actual">
              <span class="pin-symbol">⚔️</span>
              <span class="pin-halo"></span>
            </div>
          `;
        }

        cell.innerHTML = `
          <div class="island-card-header">
            <span class="island-direction-tag">${island.direction}</span>
            ${statusBadge}
          </div>
          <div class="island-card-center">
            <span class="island-card-icon">${island.icon}</span>
            <h4 class="island-card-name" style="color: ${island.color}">${island.name}</h4>
            <span class="island-card-tagline">${island.tagline}</span>
          </div>
          <div class="island-card-footer">
            <span class="island-level-tag">${island.levelRange}</span>
            ${pinHTML}
          </div>
        `;

        cell.addEventListener('mouseenter', () => {
          this.selectIsland(island.id);
        });

        cell.addEventListener('click', () => {
          this.selectIsland(island.id);
          if (island.isCurrent) {
            this.switchTab('island');
          }
        });

        this.crossGridEl.appendChild(cell);
      }
    }
  }

  selectIsland(islandId) {
    const island = ISLANDS_REGISTRY[islandId];
    if (!island) return;
    this.selectedIslandKey = islandId;

    // Highlight card in grid
    document.querySelectorAll('.island-card').forEach(c => {
      c.classList.remove('selected-island');
      if (c.dataset.islandId === islandId) {
        c.classList.add('selected-island');
      }
    });

    // Update Detail Sidebar
    const badgeEl = document.getElementById('detail-biome-badge');
    const nameEl = document.getElementById('detail-zone-name');
    const coordEl = document.getElementById('detail-zone-coord');
    const levelRangeEl = document.getElementById('detail-level-range');
    const statusEl = document.getElementById('detail-status-badge');
    const descEl = document.getElementById('detail-island-desc');
    const landmarksList = document.getElementById('detail-landmarks-list');
    const actionBtn = document.getElementById('btn-detail-switch-view');

    if (badgeEl) {
      badgeEl.textContent = `${island.icon} ${BIOME_LABELS[island.biome] || island.biome.toUpperCase()}`;
      badgeEl.style.color = island.color;
      badgeEl.style.borderColor = island.color;
    }
    if (nameEl) nameEl.textContent = island.name;
    if (coordEl) {
      coordEl.textContent = `Posición: ${island.direction} · ${island.isCurrent ? '★ (UBICACIÓN ACTUAL)' : 'Explorable'}`;
    }
    if (levelRangeEl) levelRangeEl.textContent = island.levelRange;
    if (statusEl) {
      statusEl.textContent = island.isCurrent ? 'Ubicación Actual' : 'Explorable';
      statusEl.className = 'meta-val status-active';
    }
    if (descEl) descEl.textContent = island.description;

    // Populate landmarks list
    if (landmarksList) {
      landmarksList.innerHTML = '';
      (island.landmarks || []).forEach(lm => {
        const row = document.createElement('div');
        row.className = 'landmark-row';
        row.innerHTML = `
          <div class="landmark-icon">${lm.icon}</div>
          <div class="landmark-info">
            <span class="landmark-name">${lm.name}</span>
            <span class="landmark-desc">${lm.desc}</span>
          </div>
        `;
        if (island.isCurrent) {
          row.style.cursor = 'pointer';
          row.title = 'Ver en el mapa de la isla';
          row.addEventListener('click', () => {
            this.switchTab('island');
            if (lm.coords) {
              this.islandPan.x = -lm.coords.x * 1.35;
              this.islandPan.y = -lm.coords.z * 1.35;
              this.renderIslandMap();
            }
          });
        }
        landmarksList.appendChild(row);
      });
    }

    if (actionBtn) {
      if (island.isCurrent) {
        actionBtn.style.display = 'block';
        actionBtn.textContent = (this.currentTab === 'world') ? '🏝️ Ver Mapa de la Isla' : '🌍 Volver a Mapa Mundi';
        actionBtn.onclick = () => {
          this.switchTab(this.currentTab === 'world' ? 'island' : 'world');
        };
      } else {
        // Show travel option to explore other active islands
        actionBtn.style.display = 'block';
        actionBtn.textContent = `⛵ Viajar a ${island.name}`;
        actionBtn.onclick = async () => {
          this.close();
          if (this.wmm && typeof this.wmm.travelToIsland === 'function') {
            await this.wmm.travelToIsland(island.id);
          }
        };
      }
    }
  }

  renderIslandMap() {
    if (!this.islandCanvas || !this.islandCtx) return;
    const canvas = this.islandCanvas;
    const ctx = this.islandCtx;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2 + this.islandPan.x;
    const cy = h / 2 + this.islandPan.y;
    const scale = 1.35 * this.islandZoom;

    ctx.clearRect(0, 0, w, h);

    // 1. Deep Ocean Background
    const oceanGrad = ctx.createRadialGradient(cx, cy, 60, cx, cy, Math.max(w, h));
    oceanGrad.addColorStop(0, '#0c2738');
    oceanGrad.addColorStop(0.5, '#081c2b');
    oceanGrad.addColorStop(1, '#030d17');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle Ocean Wave Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1.5;
    [160, 220, 280].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    });

    const isSavannah = Boolean(ISLANDS_REGISTRY.island_savannah?.isCurrent);
    const currentIslandKey = isSavannah ? 'island_savannah' : 'island_forest';
    const currentIsland = ISLANDS_REGISTRY[currentIslandKey];
    const landmarks = currentIsland?.landmarks || [];

    const watermarkTitleEl = document.getElementById('island-watermark-title');
    if (watermarkTitleEl) {
      watermarkTitleEl.textContent = isSavannah ? '🏜️ ISLA DE LA SABANA · LUNACIA' : '🌲 ISLA DEL BOSQUE · LUNACIA';
    }

    ctx.save();
    if (isSavannah) {
      // 2. Savannah Stepped Mesa Outlines
      const coastPoints = [
        { x: -145, z: -140 },
        { x: -70, z: -165 },
        { x: 50, z: -160 },
        { x: 135, z: -130 },
        { x: 160, z: -30 },
        { x: 145, z: 95 },
        { x: 75, z: 150 },
        { x: -45, z: 155 },
        { x: -130, z: 120 },
        { x: -165, z: 15 },
        { x: -160, z: -70 }
      ];

      // Beach Sand fill
      ctx.beginPath();
      coastPoints.forEach((pt, i) => {
        const px = cx + pt.x * scale;
        const py = cy + pt.z * scale;
        if (i === 0) ctx.moveTo(px, py);
        else {
          const prev = coastPoints[(i - 1 + coastPoints.length) % coastPoints.length];
          const midX = (prev.x + pt.x) / 2;
          const midZ = (prev.z + pt.z) / 2;
          ctx.quadraticCurveTo(cx + prev.x * scale, cy + prev.z * scale, cx + midX * scale, cy + midZ * scale);
        }
      });
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.lineWidth = 6 * scale;
      ctx.strokeStyle = '#d97706';
      ctx.stroke();

      // Intermediate canyon shelf (terracotta)
      ctx.beginPath();
      const midPoints = coastPoints.map(p => ({ x: p.x * 0.80, z: p.z * 0.80 }));
      midPoints.forEach((pt, i) => {
        const px = cx + pt.x * scale;
        const py = cy + pt.z * scale;
        if (i === 0) ctx.moveTo(px, py);
        else {
          const prev = midPoints[(i - 1 + midPoints.length) % midPoints.length];
          const midX = (prev.x + pt.x) / 2;
          const midZ = (prev.z + pt.z) / 2;
          ctx.quadraticCurveTo(cx + prev.x * scale, cy + prev.z * scale, cx + midX * scale, cy + midZ * scale);
        }
      });
      ctx.closePath();
      ctx.fillStyle = '#b45309';
      ctx.fill();
      ctx.lineWidth = 4 * scale;
      ctx.strokeStyle = '#9a3412';
      ctx.stroke();

      // High Summit Plateau (Golden Savannah Turf)
      ctx.beginPath();
      const plateauPoints = coastPoints.map(p => ({ x: p.x * 0.60, z: p.z * 0.60 }));
      plateauPoints.forEach((pt, i) => {
        const px = cx + pt.x * scale;
        const py = cy + pt.z * scale;
        if (i === 0) ctx.moveTo(px, py);
        else {
          const prev = plateauPoints[(i - 1 + plateauPoints.length) % plateauPoints.length];
          const midX = (prev.x + pt.x) / 2;
          const midZ = (prev.z + pt.z) / 2;
          ctx.quadraticCurveTo(cx + prev.x * scale, cy + prev.z * scale, cx + midX * scale, cy + midZ * scale);
        }
      });
      ctx.closePath();
      const plateauGrad = ctx.createRadialGradient(cx, cy, 20 * scale, cx, cy, 110 * scale);
      plateauGrad.addColorStop(0, '#fcd34d');
      plateauGrad.addColorStop(0.7, '#f59e0b');
      plateauGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = plateauGrad;
      ctx.fill();
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = '#ca8a04';
      ctx.stroke();

      // Recessed Oasis Pool on Plateau (at X: 14, Z: -12)
      const oasisX = cx + 14 * scale;
      const oasisY = cy + (-12) * scale;
      const oasisR = 20 * scale;

      // Oasis Lush Palm Ring
      ctx.beginPath();
      ctx.arc(oasisX, oasisY, oasisR + 5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#15803d';
      ctx.fill();

      // Oasis Turquoise Water
      ctx.beginPath();
      ctx.arc(oasisX, oasisY, oasisR, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = '#a5f3fc';
      ctx.stroke();

      // Oasis palm dots
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      [0, 1.25, 2.5, 3.75, 5.0].forEach(a => {
        ctx.fillText('🌴', oasisX + Math.cos(a) * (oasisR + 3 * scale), oasisY + Math.sin(a) * (oasisR + 3 * scale));
      });

      // Walkable canyon ramps
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3 * scale;
      ctx.setLineDash([5 * scale, 3 * scale]);

      // Ramp A: Southwest Pass
      ctx.beginPath();
      ctx.moveTo(cx + (-120) * scale, cy + 42 * scale);
      ctx.lineTo(cx + (-70) * scale, cy + 25 * scale);
      ctx.lineTo(cx + (-35) * scale, cy + 8 * scale);
      ctx.stroke();

      // Ramp B: Northeast Trail
      ctx.beginPath();
      ctx.moveTo(cx + 90 * scale, cy + (-108) * scale);
      ctx.lineTo(cx + 60 * scale, cy + (-75) * scale);
      ctx.lineTo(cx + 30 * scale, cy + (-42) * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 2. Forest Island Beach Silhouette (Golden Coast Rim)
      ctx.beginPath();
      const coastPoints = [
      { x: -140, z: -170 },
      { x: -90, z: -195 },
      { x: 30, z: -200 },
      { x: 110, z: -170 },
      { x: 155, z: -110 },
      { x: 165, z: -20 },
      { x: 145, z: 80 },
      { x: 95, z: 125 },
      { x: -30, z: 120 },
      { x: -125, z: 95 },
      { x: -160, z: 30 },
      { x: -165, z: -80 }
    ];

    coastPoints.forEach((pt, i) => {
      const px = cx + pt.x * scale;
      const py = cy + pt.z * scale;
      if (i === 0) ctx.moveTo(px, py);
      else {
        // Curve smoothly between points
        const prev = coastPoints[(i - 1 + coastPoints.length) % coastPoints.length];
        const midX = (prev.x + pt.x) / 2;
        const midZ = (prev.z + pt.z) / 2;
        ctx.quadraticCurveTo(cx + prev.x * scale, cy + prev.z * scale, cx + midX * scale, cy + midZ * scale);
      }
    });
    ctx.closePath();

    // Beach Sand fill
    ctx.fillStyle = '#eab308';
    ctx.fill();
    ctx.lineWidth = 8 * scale;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.stroke();

    // 3. Island Interior Grassland (Lush Green)
    ctx.beginPath();
    const grassPoints = coastPoints.map(p => ({ x: p.x * 0.92, z: p.z * 0.92 }));
    grassPoints.forEach((pt, i) => {
      const px = cx + pt.x * scale;
      const py = cy + pt.z * scale;
      if (i === 0) ctx.moveTo(px, py);
      else {
        const prev = grassPoints[(i - 1 + grassPoints.length) % grassPoints.length];
        const midX = (prev.x + pt.x) / 2;
        const midZ = (prev.z + pt.z) / 2;
        ctx.quadraticCurveTo(cx + prev.x * scale, cy + prev.z * scale, cx + midX * scale, cy + midZ * scale);
      }
    });
    ctx.closePath();
    const grassGrad = ctx.createRadialGradient(cx - 30 * scale, cy + 20 * scale, 30, cx, cy, 180 * scale);
    grassGrad.addColorStop(0, '#22c55e');
    grassGrad.addColorStop(0.6, '#15803d');
    grassGrad.addColorStop(1, '#166534');
    ctx.fillStyle = grassGrad;
    ctx.fill();

    // 4. Forest Canopy Patches (Darker Greens)
    const forestGroves = [
      { x: -50, z: -100, r: 35 },
      { x: 60, z: -60, r: 42 },
      { x: -90, z: -40, r: 28 },
      { x: 70, z: 50, r: 38 },
      { x: -40, z: 65, r: 32 }
    ];
    ctx.fillStyle = 'rgba(20, 83, 45, 0.45)';
    forestGroves.forEach(g => {
      ctx.beginPath();
      ctx.arc(cx + g.x * scale, cy + g.z * scale, g.r * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. River Flowing Across Island
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 8 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const riverPts = [
      { x: -110, z: -140 },
      { x: -70, z: -90 },
      { x: -35, z: -40 },
      { x: -8, z: -15 },
      { x: 22, z: 18 },
      { x: 55, z: 45 },
      { x: 105, z: 75 },
      { x: 145, z: 95 }
    ];
    riverPts.forEach((pt, i) => {
      const px = cx + pt.x * scale;
      const py = cy + pt.z * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // River sparkling highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    // 6. Roads / Trails
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4 * scale;
    ctx.setLineDash([6 * scale, 3 * scale]);

    // Path 1: Central valley towards Dojo
    ctx.beginPath();
    const roadDojo = [
      { x: -95, z: 25 },
      { x: -90, z: 55 },
      { x: -87.9, z: 74 }
    ];
    roadDojo.forEach((pt, i) => {
      const px = cx + pt.x * scale;
      const py = cy + pt.z * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Path 2: Valley to East Ridge & Shrine
    ctx.beginPath();
    const roadShrine = [
      { x: -95, z: 25 },
      { x: -40, z: -18 },
      { x: 15, z: 26 },
      { x: 60, z: 40 },
      { x: 115, z: 65 }
    ];
    roadShrine.forEach((pt, i) => {
      const px = cx + pt.x * scale;
      const py = cy + pt.z * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
    }

    // 7. Landmarks & NPCs Markers (from current active island)
    landmarks.forEach(lm => {
      if (!lm.coords) return;
      const px = cx + lm.coords.x * scale;
      const py = cy + lm.coords.z * scale;

      // Pin background circle
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();

      // Pin Icon
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lm.icon || '📍', px, py);

      // Label below pin
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(lm.name, px, py + 16);
      ctx.shadowBlur = 0;
    });

    // 8. Active Quest Target Pin (Pulsing)
    const qm = this.wmm?.om?.questManager;
    const trackedQuest = qm ? qm.getTrackedQuest() : null;
    const questPos = this.wmm?.om?.questTargetPos;

    if (questPos) {
      const qx = cx + questPos.x * scale;
      const qy = cy + questPos.z * scale;

      // Pulse ring
      ctx.beginPath();
      ctx.arc(qx, qy, 16, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(qx, qy, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎯', qx, qy);
    }

    // 9. Live Player Entity Pin
    const player = this.wmm?.om?.player;
    const playerPos = player?.position;
    const playerYaw = player?.yaw ?? player?.targetYaw ?? player?.rotation?.y ?? 0;

    if (playerPos) {
      const ppx = cx + playerPos.x * scale;
      const ppy = cy + playerPos.z * scale;

      // Vision direction indicator
      const dirX = Math.sin(playerYaw);
      const dirY = Math.cos(playerYaw);
      const canvasHeading = Math.atan2(dirY, dirX);

      ctx.save();
      ctx.translate(ppx, ppy);
      ctx.rotate(canvasHeading);

      // Direction cone
      ctx.fillStyle = 'rgba(56, 189, 248, 0.40)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 24, -Math.PI / 5, Math.PI / 5);
      ctx.closePath();
      ctx.fill();

      // Arrow pointer
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
      ctx.restore();

      // Center hero pin
      ctx.beginPath();
      ctx.arc(ppx, ppy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ Tú', ppx, ppy - 14);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // Compatibility helper methods for WorldMapManager
  renderGrid() {
    if (this.currentTab === 'world') {
      this.renderIslandsCross();
    } else {
      this.renderIslandMap();
    }
  }

  highlightSubQuadrant(subQ) {
    // Retained for compatibility with WorldMapManager
  }

  open() {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      return;
    }
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');

    if (this.currentTab === 'world') {
      this.renderIslandsCross();
      this.selectIsland(this.selectedIslandKey || 'island_forest');
    } else {
      this.renderIslandMap();
      this.selectIsland('island_forest');
    }

    // Audio feedback
    if (this.wmm.audio && typeof this.wmm.audio.playHover === 'function') {
      this.wmm.audio.playHover();
    }

    // Quest progress hook: Cartographer opening the map
    if (this.wmm?.om?.questManager) {
      this.wmm.om.questManager.advanceStep('quest_world_cartographer', 'open_map', true);
    }
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  toggle() {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      this.close();
      return;
    }
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}
