// WorldMapModal.js - Interactive 7x7 World Map Overlay (Pinwheel Biomes & 2x2 Sub-Quadrants)
import { WORLD_GRID_MATRIX, BIOME_COLORS, BIOME_LABELS, getBiomeForCoord } from './MapRegistry.js';

export class WorldMapModal {
  constructor(worldMapManager) {
    this.wmm = worldMapManager;
    this.isOpen = false;
    this.selectedZone = null;
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
              <h2 class="world-map-title">World Map</h2>
            </div>
            <button id="world-map-close-btn" class="world-map-close-btn" title="Close [M]">✕</button>
          </div>

          <!-- Biome Legend Bar -->
          <div class="world-map-legend">
            <div class="legend-item"><span class="legend-dot" style="background:#22c55e"></span> 🌲 Forest</div>
            <div class="legend-item"><span class="legend-dot" style="background:#38bdf8"></span> ❄️ Arctic</div>
            <div class="legend-item"><span class="legend-dot" style="background:#FAC651"></span> 🏜️ Savannah</div>
            <div class="legend-item"><span class="legend-dot" style="background:#a855f7"></span> 🔮 Mystic</div>
            <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> 🏰 Dungeon</div>
          </div>

          <!-- Main Layout: Grid + Detail Sidebar -->
          <div class="world-map-body">
            <!-- Grid Board -->
            <div id="world-map-grid-wrapper" class="world-map-grid-wrapper">
              <div id="world-map-grid" class="world-map-grid"></div>
              <!-- Floating Quest Objective Popover Modal -->
              <div id="world-map-quest-popover" class="world-map-quest-popover hidden">
                <div class="popover-header">
                  <span class="popover-badge">🎯 QUEST OBJECTIVE</span>
                  <span id="popover-zone-tag" class="popover-zone-tag">[3, 2]</span>
                </div>
                <h4 id="popover-quest-title" class="popover-quest-title">Prove Your Ferocity</h4>
                <p id="popover-quest-desc" class="popover-quest-desc">Locate Bing in Eastern Savannah [3, 2]</p>
                <div class="popover-arrow"></div>
              </div>
            </div>

            <!-- Detail Sidebar for Active / Selected Zone -->
            <div id="world-map-detail" class="world-map-detail">
              <div class="detail-header">
                <span id="detail-biome-badge" class="detail-biome-badge">🌲 FOREST</span>
                <h3 id="detail-zone-name" class="detail-zone-name">Dojo Valley</h3>
                <span id="detail-zone-coord" class="detail-zone-coord">Coord: [2, 2]</span>
              </div>

              <!-- Sub-quadrant Matrix -->
              <div class="detail-section">
                <div class="section-label">Macro-Zone Quadrants</div>
                <div class="sub-quadrants-grid">
                  <div class="sub-quadrant-cell" data-q="NW">
                    <span class="q-label">NW</span>
                    <span class="q-name">North Entrance</span>
                  </div>
                  <div class="sub-quadrant-cell" data-q="NE">
                    <span class="q-label">NE</span>
                    <span class="q-name">East Garden</span>
                  </div>
                  <div class="sub-quadrant-cell" data-q="SW">
                    <span class="q-label">SW</span>
                    <span class="q-name">Main Courtyard</span>
                  </div>
                  <div class="sub-quadrant-cell" data-q="SE">
                    <span class="q-label">SE</span>
                    <span class="q-name">Forest Path</span>
                  </div>
                </div>
              </div>

              <!-- Exits / Portals -->
              <div class="detail-section">
                <div class="section-label">Cardinal Connections</div>
                <div id="detail-portals-list" class="detail-portals-list">
                  <!-- Injected dynamically -->
                </div>
              </div>

              <!-- Quick action hint -->
              <div class="detail-footer-hint">
                Press <kbd>[M]</kbd> or click <kbd>[✕]</kbd> to resume exploration.
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event listeners
      modal.querySelector('.world-map-backdrop').addEventListener('click', () => this.close());
      document.getElementById('world-map-close-btn').addEventListener('click', () => this.close());

      // Prevent wheel scrolling inside world map modal from zooming 3D overworld camera
      modal.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }

    this.modalEl = modal;
    this.gridWrapperEl = document.getElementById('world-map-grid-wrapper');
    this.gridEl = document.getElementById('world-map-grid');
    this.detailEl = document.getElementById('world-map-detail');
    this.questPopoverEl = document.getElementById('world-map-quest-popover');
  }

  renderGrid() {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    const currentZone = this.wmm.currentMapDef;
    const curGx = currentZone ? currentZone.gx : 2;
    const curGy = currentZone ? currentZone.gy : 2;

    const qm = this.wmm?.om?.questManager;
    const trackedQuest = qm ? qm.getTrackedQuest() : null;
    let targetGx = -1;
    let targetGy = -1;
    if (trackedQuest && trackedQuest.zoneCoords) {
      targetGx = trackedQuest.zoneCoords[0];
      targetGy = trackedQuest.zoneCoords[1];
      const pendingStep = trackedQuest.objective?.steps?.find(s => !s.done);
      if (pendingStep && pendingStep.zoneCoords) {
        targetGx = pendingStep.zoneCoords[0];
        targetGy = pendingStep.zoneCoords[1];
      }
    }

    for (let gy = 1; gy <= 3; gy++) {
      for (let gx = 1; gx <= 3; gx++) {
        const zone = WORLD_GRID_MATRIX[gy - 1][gx - 1];
        const isCurrent = (gx === curGx && gy === curGy);
        const isTarget = (gx === targetGx && gy === targetGy);
        const biome = zone.biome;
        const color = BIOME_COLORS[biome] || '#22c55e';

        const cell = document.createElement('div');
        cell.className = `map-cell biome-${biome} ${isCurrent ? 'current-player-cell' : ''} ${isTarget ? 'quest-target-cell' : ''}`;
        cell.dataset.gx = gx;
        cell.dataset.gy = gy;
        cell.style.borderColor = color;

        let pinHTML = '';
        if (isCurrent && isTarget) {
          pinHTML = `
            <div class="player-pin dual-pin" title="Your position and quest objective">
              <span class="pin-icon">⚔️</span>
              <span class="pin-target-corner">🎯</span>
              <span class="pin-pulse"></span>
              <span class="quest-target-pulse"></span>
            </div>
          `;
        } else if (isCurrent) {
          pinHTML = `
            <div class="player-pin" title="Your current position">
              <span class="pin-icon">⚔️</span>
              <span class="pin-pulse"></span>
            </div>
          `;
        } else if (isTarget) {
          pinHTML = `
            <div class="quest-target-pin" title="Objective: ${trackedQuest.title}">
              <span class="quest-target-icon">📍</span>
              <span class="quest-target-pulse"></span>
            </div>
          `;
        }

        cell.innerHTML = `
          <div class="cell-coord">${gx},${gy}</div>
          <div class="cell-title">${zone.regionTitle.replace(/ \[.*\]/, '')}</div>
          ${pinHTML}
        `;

        cell.addEventListener('mouseenter', () => {
          this.selectZone(zone);
          if (isTarget && trackedQuest) {
            this.showQuestPopover(cell, zone, trackedQuest);
          } else {
            this.hideQuestPopover();
          }
        });

        cell.addEventListener('mouseleave', () => {
          if (isTarget) {
            this.hideQuestPopover();
          }
        });

        cell.addEventListener('click', () => {
          this.selectZone(zone);
        });

        this.gridEl.appendChild(cell);
      }
    }

    this.gridEl.onmouseleave = () => {
      this.hideQuestPopover();
    };

    // Default select current zone
    const activeZone = (curGy >= 1 && curGy <= 5 && curGx >= 1 && curGx <= 5)
      ? WORLD_GRID_MATRIX[curGy - 1][curGx - 1]
      : WORLD_GRID_MATRIX[2][2];
    this.selectZone(activeZone);
  }

  selectZone(zone) {
    if (!zone || !this.detailEl) return;
    this.selectedZone = zone;

    const currentZone = this.wmm.currentMapDef;
    const isCurrent = currentZone && (zone.gx === currentZone.gx && zone.gy === currentZone.gy);

    // Highlight cell in grid
    document.querySelectorAll('.map-cell').forEach(c => {
      c.classList.remove('selected-cell');
      if (parseInt(c.dataset.gx) === zone.gx && parseInt(c.dataset.gy) === zone.gy) {
        c.classList.add('selected-cell');
      }
    });

    // Update detail pane
    const badgeEl = document.getElementById('detail-biome-badge');
    const nameEl = document.getElementById('detail-zone-name');
    const coordEl = document.getElementById('detail-zone-coord');
    const portalsList = document.getElementById('detail-portals-list');

    if (badgeEl) {
      badgeEl.textContent = BIOME_LABELS[zone.biome] || zone.biome.toUpperCase();
      badgeEl.style.color = BIOME_COLORS[zone.biome];
      badgeEl.style.borderColor = BIOME_COLORS[zone.biome];
    }
    if (nameEl) nameEl.textContent = zone.name;
    if (coordEl) {
      coordEl.textContent = `Macro-Zone [${zone.gx}, ${zone.gy}] ${isCurrent ? '★ (CURRENT LOCATION)' : ''}`;
    }

    // Update 2x2 Sub-quadrants
    const subQCells = document.querySelectorAll('.sub-quadrant-cell');
    const subQDefs = zone.subQuadrants || {};
    subQCells.forEach(cell => {
      const q = cell.dataset.q;
      const nameEl = cell.querySelector('.q-name');
      if (nameEl && subQDefs[q]) {
        nameEl.textContent = subQDefs[q].label || `Sector ${q}`;
      }
    });
    this.highlightSubQuadrant(this.wmm.currentSubQuadrant || 'SE');

    if (portalsList) {
      portalsList.innerHTML = '';
      const directions = ['NORTH', 'SOUTH', 'WEST', 'EAST'];
      const dirIcons = { NORTH: '▲ North', SOUTH: '▼ South', WEST: '◄ West', EAST: '► East' };

      directions.forEach(dir => {
        const portal = zone.portals[dir];
        const row = document.createElement('div');
        row.className = 'portal-row';
        if (portal) {
          row.innerHTML = `
            <span class="portal-dir">${dirIcons[dir]}</span>
            <span class="portal-dest">${portal.label.replace(/ \[.*\]/, '')}</span>
          `;
        } else {
          row.innerHTML = `
            <span class="portal-dir text-muted">${dirIcons[dir]}</span>
            <span class="portal-dest text-muted">World Edge (Impassable)</span>
          `;
        }
        portalsList.appendChild(row);
      });
    }
  }

  highlightSubQuadrant(subQ) {
    const isCurrent = this.selectedZone && this.wmm.currentMapDef && (this.selectedZone.id === this.wmm.currentMapDef.id);
    document.querySelectorAll('.sub-quadrant-cell').forEach(cell => {
      if (isCurrent && cell.dataset.q === subQ) {
        cell.classList.add('active-sub-quadrant');
      } else {
        cell.classList.remove('active-sub-quadrant');
      }
    });
  }

  showQuestPopover(cell, zone, quest) {
    if (!this.questPopoverEl || !this.gridWrapperEl) return;

    const zoneTagEl = document.getElementById('popover-zone-tag');
    const titleEl = document.getElementById('popover-quest-title');
    const descEl = document.getElementById('popover-quest-desc');

    if (zoneTagEl) {
      zoneTagEl.textContent = `[${zone.gx}, ${zone.gy}] ${zone.name ? `· ${zone.name}` : ''}`;
    }
    if (titleEl) {
      titleEl.textContent = quest.title || 'Active Quest';
    }
    if (descEl) {
      const pendingStep = quest.objective?.steps?.find(s => !s.done);
      const desc = pendingStep ? pendingStep.desc : (quest.objective?.summary || '');
      descEl.textContent = desc;
    }

    // Reveal popover so offsetWidth/offsetHeight can be calculated
    this.questPopoverEl.classList.remove('hidden');

    const wrapperRect = this.gridWrapperEl.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    const cellCenterX = (cellRect.left + cellRect.width / 2) - wrapperRect.left;
    const cellTopY = cellRect.top - wrapperRect.top;
    const cellBottomY = cellRect.bottom - wrapperRect.top;

    const popoverWidth = this.questPopoverEl.offsetWidth || 250;
    const popoverHeight = this.questPopoverEl.offsetHeight || 80;

    let left = cellCenterX - (popoverWidth / 2);
    left = Math.max(6, Math.min(wrapperRect.width - popoverWidth - 6, left));

    const arrowEl = this.questPopoverEl.querySelector('.popover-arrow');
    const arrowOffset = cellCenterX - left;
    if (arrowEl) {
      arrowEl.style.left = `${Math.max(14, Math.min(popoverWidth - 24, arrowOffset - 5))}px`;
    }

    this.questPopoverEl.style.left = `${left}px`;

    // Top rows (gy <= 2) display below the cell, others display above the cell
    if (zone.gy <= 2) {
      this.questPopoverEl.classList.remove('pos-above');
      this.questPopoverEl.classList.add('pos-below');
      this.questPopoverEl.style.top = `${cellBottomY + 8}px`;
    } else {
      this.questPopoverEl.classList.remove('pos-below');
      this.questPopoverEl.classList.add('pos-above');
      this.questPopoverEl.style.top = `${cellTopY - popoverHeight - 8}px`;
    }
  }

  hideQuestPopover() {
    if (this.questPopoverEl) {
      this.questPopoverEl.classList.add('hidden');
    }
  }

  open() {
    if (document.body.classList.contains('state-combat') || 
        (window.__AXIE_TACTICS_APP__ && window.__AXIE_TACTICS_APP__.gameState === 'BATTLE')) {
      return;
    }
    this.isOpen = true;
    this.renderGrid();
    this.modalEl.classList.remove('hidden');
    // Sound effect
    if (this.wmm.audio && typeof this.wmm.audio.playHover === 'function') {
      this.wmm.audio.playHover();
    }
  }

  close() {
    this.isOpen = false;
    this.hideQuestPopover();
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
