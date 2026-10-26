// WorldMapModal.js - Dual-Mode World Map Overlay: 5-Islands Cross World Map & High-Detail Island Map
import {
  ISLANDS_REGISTRY,
  ISLANDS_LAYOUT,
  BIOME_COLORS,
  BIOME_LABELS,
  WORLD_GRID_MATRIX,
  MAP_REGISTRY
} from './MapRegistry.js';
import { IslandChart, startExplorationTracking } from './IslandChart.js';
import * as i18n from '../../i18n/i18n.js';

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
    // La niebla de la carta se despeja mientras exploras, aunque no abras el mapa
    if (this.wmm?.om) startExplorationTracking(this.wmm.om);
  }

  _createDOM() {
    let modal = document.getElementById('world-map-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'world-map-modal';
      // Crónica Celeste: ventana del sistema (cabecera con emblema, pestañas segmentadas) con el archipiélago a la
      // izquierda y la ficha de la isla en papel marfil a la derecha. Se conservan todos los ids que usa este módulo.
      modal.className = 'world-map-modal lk-ui lk-backdrop lk-wmap-layer hidden';
      modal.innerHTML = `
        <div class="world-map-backdrop" aria-hidden="true"></div>
        <div class="world-map-container lk-panel-modal-window lk-wmap" role="dialog" aria-label="${i18n.t('worldMap.dialogLabel')}">
          <div class="world-map-header lk-panel-head">
            <span class="lk-emblem"><img class="lk-ai" src="./assets/ui/icons/map.png" alt=""></span>
            <h3><small>${i18n.t('worldMap.kicker')}</small><span id="world-map-main-title" class="world-map-title">${i18n.t('worldMap.archipelagoTitle')}</span></h3>
            <div class="world-map-tabs lk-segmented" role="tablist">
              <button id="map-tab-world-btn" class="map-tab-btn active" type="button" role="tab" aria-pressed="true">${i18n.t('worldMap.tabArchipelago')}</button>
              <button id="map-tab-island-btn" class="map-tab-btn" type="button" role="tab" aria-pressed="false">${i18n.t('worldMap.tabCurrentIsland')}</button>
            </div>
            <button id="world-map-close-btn" class="world-map-close-btn lk-btn-close-x" type="button" aria-label="${i18n.t('worldMap.close')}" title="${i18n.t('worldMap.closeM')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
          </div>

          <div class="world-map-body lk-wmap__body">
            <!-- Vista 1: archipiélago en cruz -->
            <div id="view-world-islands" class="world-map-view-panel lk-wmap__stage">
              <div class="islands-cross-container lk-wmap__sea" id="islands-cross-container">
                <svg class="islands-sea-routes lk-wmap__routes" viewBox="0 0 460 460" preserveAspectRatio="none" aria-hidden="true">
                  <line x1="230" y1="230" x2="230" y2="70" class="sea-route-line" />
                  <line x1="230" y1="230" x2="70" y2="230" class="sea-route-line" />
                  <line x1="230" y1="230" x2="390" y2="230" class="sea-route-line" />
                  <line x1="230" y1="230" x2="230" y2="390" class="sea-route-line" />
                  <circle cx="230" cy="230" r="155" class="sea-route-circle" />
                  <circle cx="230" cy="230" r="205" class="sea-route-circle lk-wmap__ring2" />
                </svg>
                <div class="lk-wmap__compass" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M32 4l5 23 23 5-23 5-5 23-5-23-23-5 23-5z" fill="currentColor" opacity=".9"/><path d="M32 14l3 15 15 3-15 3-3 15-3-15-15-3 15-3z" fill="#0B0F1C" opacity=".55"/></svg><b>N</b></div>
                <div class="islands-cross-grid lk-wmap__grid" id="islands-cross-grid"></div>
              </div>
              <p class="lk-wmap__hint">${i18n.t('worldMap.hintWorld')}</p>
            </div>

            <!-- Vista 2: mapa detallado de la isla actual -->
            <div id="view-island-detail" class="world-map-view-panel lk-wmap__stage hidden">
              <!-- Carta del cartógrafo (IslandChart.js). El lienzo antiguo queda oculto como respaldo. -->
              <div id="island-chart-host" class="lk-wmap__chart"></div>
              <div class="island-canvas-wrapper lk-wmap__canvas" id="island-canvas-wrapper" hidden>
                <canvas id="island-map-canvas" width="560" height="440"></canvas>
                <div class="island-map-hud-controls lk-wmap__ctrl">
                  <button id="btn-island-recenter" class="island-hud-btn lk-btn-circle-icon" type="button" title="${i18n.t('worldMap.recenter')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button>
                  <button id="btn-island-zoom-in" class="island-hud-btn lk-btn-circle-icon" type="button" title="${i18n.t('worldMap.zoomIn')}">+</button>
                  <button id="btn-island-zoom-out" class="island-hud-btn lk-btn-circle-icon" type="button" title="${i18n.t('worldMap.zoomOut')}">−</button>
                </div>
                <div id="island-map-tooltip" class="island-map-tooltip lk-wmap__tip hidden">
                  <div id="tooltip-title" class="tooltip-title">${i18n.t('worldMap.poi')}</div>
                  <div id="tooltip-desc" class="tooltip-desc"></div>
                  <div id="tooltip-coords" class="tooltip-coords"></div>
                </div>
                <div class="island-map-watermark lk-wmap__mark">
                  <span id="island-watermark-title">${i18n.t('places.islandForest')} · Lunacia</span>
                  <span id="island-cursor-coords"></span>
                </div>
              </div>
              <p class="lk-wmap__hint">${i18n.t('worldMap.hintIsland')}</p>
            </div>

            <!-- Ficha de la isla (papel marfil) -->
            <aside id="world-map-detail" class="world-map-detail lk-wmap__page">
              <div class="detail-header lk-wmap__ph">
                <span id="detail-biome-badge" class="detail-biome-badge lk-wmap__biome">${i18n.t('worldMap.biomeForest')}</span>
                <h3 id="detail-zone-name" class="detail-zone-name">${i18n.t('places.islandForest')}</h3>
                <span id="detail-zone-coord" class="detail-zone-coord">${i18n.t('worldMap.dirCenter')}</span>
              </div>
              <div class="detail-meta-box lk-wmap__meta">
                <div class="detail-meta-item"><span class="meta-label">${i18n.t('worldMap.recLevel')}</span><b id="detail-level-range" class="meta-val">1</b></div>
                <div class="detail-meta-item"><span class="meta-label">${i18n.t('worldMap.status')}</span><b id="detail-status-badge" class="meta-val">${i18n.t('worldMap.explorable')}</b></div>
              </div>
              <p id="detail-level-warn" class="lk-wmap__warn" hidden></p>
              <div id="detail-chart-track" class="lk-wmap__track" hidden></div>
              <div class="detail-section">
                <div class="section-label lk-wmap__label">${i18n.t('worldMap.description')}</div>
                <p id="detail-island-desc" class="detail-desc-text"></p>
              </div>
              <div class="detail-section">
                <div class="section-label lk-wmap__label" id="detail-landmarks-header">${i18n.t('worldMap.pois')}</div>
                <div id="detail-landmarks-list" class="detail-landmarks-list"></div>
              </div>
              <div id="detail-chart-explored" class="lk-wmap__explored" hidden><div class="lk-bar-read"><span>${i18n.t('worldMap.explored')}</span><b data-ref="pct">0 %</b></div><div class="lk-bar lk-bar--xp"><i data-ref="bar" style="width:0%"></i></div></div>
              <div class="detail-action-container lk-wmap__actions" id="detail-action-container">
                <p id="detail-travel-note" class="lk-wmap__travel" hidden></p>
              </div>
              <div class="detail-footer-hint lk-wmap__keys">${i18n.t('worldMap.footerKeys')}</div>
            </aside>
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
        cursorCoordsEl.textContent = i18n.t('worldMap.cursor', { x: worldX.toFixed(1), z: worldZ.toFixed(1) });
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
            name: i18n.t('worldMap.yourHero'),
            desc: i18n.t('worldMap.currentPosIn', { name: currentIsland?.name || i18n.t('worldMap.island') }),
            coords: { x: playerPos.x, z: playerPos.z },
            icon: '◆',
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

        if (titleEl) titleEl.textContent = `◆ ${foundPoi.name}`;
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
      if (titleEl) titleEl.textContent = i18n.t('worldMap.archipelagoTitle');
      worldBtn?.setAttribute('aria-pressed', 'true'); islandBtn?.setAttribute('aria-pressed', 'false');

      const currentIslandKey = this._currentKey();
      this.chart?.close();
      this._showChartSide(false);
      this.renderIslandsCross();
      this.selectIsland(this.selectedIslandKey || currentIslandKey);
    } else {
      const currentIslandKey = this._currentKey();
      const currentIsland = ISLANDS_REGISTRY[currentIslandKey];

      if (worldBtn) worldBtn.classList.remove('active');
      if (islandBtn) islandBtn.classList.add('active');
      if (this.viewWorldEl) this.viewWorldEl.classList.add('hidden');
      if (this.viewIslandEl) this.viewIslandEl.classList.remove('hidden');
      if (titleEl) titleEl.textContent = currentIsland?.name || i18n.t('worldMap.tabCurrentIsland');
      worldBtn?.setAttribute('aria-pressed', 'false'); islandBtn?.setAttribute('aria-pressed', 'true');

      this.selectIsland(currentIslandKey);
      this.renderIslandMap();
    }
  }

  /** Isla en la que está el jugador (la marca isCurrent la mantiene WorldMapManager). */
  _currentKey() {
    const cur = Object.values(ISLANDS_REGISTRY).find((i) => i && i.isCurrent);
    return cur?.id || 'island_forest';
  }

  /** Emblema dibujado de cada bioma (trazo marfil, sin emojis). */
  _biomeGlyph(biome) {
    const G = {
      forest: '<path d="M32 10l-11 15h6l-9 12h7l-9 12h32l-9-12h7l-9-12h6z"/><path d="M32 49v7"/>',
      arctic: '<path d="M32 10v44M13 21l38 22M13 43l38-22"/><path d="M26 13l6 6 6-6M26 51l6-6 6 6M12 28l8-1-3-7M52 36l-8 1 3 7M12 36l8 1-3 7M52 28l-8-1 3-7"/>',
      savannah: '<circle cx="32" cy="24" r="8"/><path d="M32 9v3M32 36v0M19 24h-3M48 24h-3M22.8 14.8l2.1 2.1M41.2 14.8l-2.1 2.1"/><path d="M8 48c6-6 12-6 18-1s12 5 18 0 10-5 12-3"/><path d="M8 55h48"/>',
      mystic: '<path d="M38 11a19 19 0 1 0 15 30 15 15 0 1 1-15-30z"/><path d="M45 15l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="currentColor"/>',
      dungeon: '<path d="M12 22h40M15 16h34"/><path d="M19 22v32M45 22v32M19 32h26"/><path d="M32 36l3 5-3 5-3-5z" fill="currentColor"/><path d="M10 54h44"/>'
    };
    return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[biome] || G.forest}</svg>`;
  }

  /** «Isla de la Sabana» → «Sabana»: en las tarjetas basta con el bioma (la ficha mantiene el nombre completo). */
  _shortName(island) {
    const n = String(island?.name || '').replace(/^isla\s+(?:de\s+la|de\s+los|de\s+las|del|de)?\s*/i, '').replace(/\s+island$/i, '').trim();
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : (island?.name || '');
  }

  /** Nivel del Sapidae (para comparar con el nivel recomendado de cada isla). */
  _playerLevel() {
    try { return this.wmm?.om?.equipmentManager?.getProgression?.('sapidae')?.level || 1; } catch { return 1; }
  }

  /** «Nivel 1 - 3» → { min: 1, max: 3, label: '1–3' }; «Nivel > 10» → { min: 11, max: Infinity, label: '10+' }. */
  _levelInfo(island) {
    const t = String(island?.levelRange || '');
    const nums = (t.match(/\d+/g) || []).map(Number);
    if (/>/.test(t) && nums.length) return { min: nums[0] + 1, max: Infinity, label: `${nums[0]}+` };
    if (nums.length >= 2) return { min: nums[0], max: nums[1], label: `${nums[0]}–${nums[1]}` };
    if (nums.length === 1) return { min: nums[0], max: nums[0], label: `${nums[0]}` };
    return { min: 1, max: Infinity, label: '—' };
  }

  _dirLabel(island) {
    const d = String(island?.direction || '').toUpperCase();
    if (d.includes('NORTE')) return i18n.t('worldMap.dirNorth');
    if (d.includes('SUR')) return i18n.t('worldMap.dirSouth');
    if (d.includes('OESTE')) return i18n.t('worldMap.dirWest'); // antes que «ESTE», que está contenido en «OESTE»
    if (d.includes('ESTE')) return i18n.t('worldMap.dirEast');
    return i18n.t('worldMap.dirCenter');
  }

  renderIslandsCross() {
    if (!this.crossGridEl) return;
    this.crossGridEl.innerHTML = '';
    const lvl = this._playerLevel();

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const islandId = ISLANDS_LAYOUT[r][c];
        if (!islandId) {
          const sea = document.createElement('div');
          sea.className = 'island-cell island-cell-ocean lk-wmap__sea-cell';
          this.crossGridEl.appendChild(sea);
          continue;
        }

        const island = ISLANDS_REGISTRY[islandId];
        const isCurrent = island.isCurrent;
        const isSelected = this.selectedIslandKey === island.id;
        const li = this._levelInfo(island);
        const under = lvl < li.min;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `lk-isle biome-${island.biome} ${isCurrent ? 'lk-is-here' : ''} ${isSelected ? 'lk-is-sel' : ''} ${under ? 'lk-is-hard' : ''}`;
        cell.dataset.islandId = island.id;
        cell.style.setProperty('--ic', island.color);
        cell.setAttribute('aria-label', `${i18n.t('worldMap.cellAria', { name: island.name, lv: li.label })}${isCurrent ? ', ' + i18n.t('worldMap.youAreHereLower') : ''}`);
        cell.innerHTML = `
          ${isCurrent ? `<span class="lk-isle__here"><i></i>${i18n.t('worldMap.youAreHere')}</span>` : ''}
          <span class="lk-isle__dir">${this._dirLabel(island)}</span>
          <span class="lk-isle__med">${this._biomeGlyph(island.biome)}</span>
          <b class="lk-isle__name">${this._shortName(island)}</b>
          <span class="lk-isle__tag">${island.tagline}</span>
          <span class="lk-isle__lvl ${under ? 'lk-is-hard' : ''}">${i18n.t('worldMap.lvN', { n: li.label })}</span>`;

        // Clic: ver la ficha. Doble clic en la isla actual: abrir su mapa
        cell.addEventListener('click', () => this.selectIsland(island.id));
        cell.addEventListener('dblclick', () => { if (island.isCurrent) this.switchTab('island'); });
        this.crossGridEl.appendChild(cell);
      }
    }
  }

  selectIsland(islandId) {
    const island = ISLANDS_REGISTRY[islandId];
    if (!island) return;
    this.selectedIslandKey = islandId;

    // Highlight card in grid
    document.querySelectorAll('#world-map-modal .lk-isle').forEach(c => {
      c.classList.toggle('lk-is-sel', c.dataset.islandId === islandId);
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

    const li = this._levelInfo(island);
    const lvl = this._playerLevel();
    const under = lvl < li.min;
    const page = document.getElementById('world-map-detail');
    if (page) page.style.setProperty('--ic', island.color);
    if (badgeEl) {
      badgeEl.textContent = ({ forest: i18n.t('worldMap.biomeForest'), arctic: i18n.t('worldMap.biomeArctic'), savannah: i18n.t('worldMap.biomeSavannah'), mystic: i18n.t('worldMap.biomeMystic'), dungeon: 'Genesis' })[island.biome] || BIOME_LABELS[island.biome] || island.biome;
      badgeEl.style.removeProperty('color');
      badgeEl.style.removeProperty('border-color');
    }
    if (nameEl) nameEl.textContent = island.name;
    if (coordEl) coordEl.textContent = `${this._dirLabel(island)} · ${island.tagline}`;
    if (levelRangeEl) levelRangeEl.textContent = i18n.t('worldMap.lvN', { n: li.label });
    if (statusEl) {
      statusEl.textContent = island.isCurrent ? i18n.t('worldMap.youAreHere') : (under ? i18n.t('worldMap.dangerous') : i18n.t('worldMap.explorable'));
      statusEl.className = `meta-val ${island.isCurrent ? 'lk-is-here' : under ? 'lk-is-hard' : 'lk-is-ok'}`;
    }
    const warn = document.getElementById('detail-level-warn');
    if (warn) {
      warn.hidden = !under;
      if (under) warn.textContent = i18n.t('worldMap.levelWarn', { lvl, min: li.min });
    }
    if (descEl) descEl.textContent = island.description;

    // Populate landmarks list
    if (landmarksList) {
      landmarksList.innerHTML = '';
      (island.landmarks || []).forEach(lm => {
        const row = document.createElement('div');
        row.className = 'landmark-row lk-wmap__poi';
        row.innerHTML = `
          <div class="landmark-icon">◆</div>
          <div class="landmark-info">
            <span class="landmark-name">${lm.name}</span>
            <span class="landmark-desc">${lm.desc}</span>
          </div>
          ${island.isCurrent && lm.coords ? `<span class="lk-wmap__poi-go" aria-hidden="true">${i18n.t('worldMap.follow')}</span>` : ''}
        `;
        row.dataset.chartId = 'poi_' + lm.id;
        if (island.isCurrent) {
          row.style.cursor = 'pointer';
          row.title = i18n.t('worldMap.followOnMap');
          row.addEventListener('click', () => {
            if (this.currentTab !== 'island') this.switchTab('island');
            if (lm.coords && this.chart) {
              if (this.chart.follow !== row.dataset.chartId) this.chart.setFollow(row.dataset.chartId);
              this.chart.focus(lm.coords.x, lm.coords.z, 160);
            }
          });
          row.addEventListener('mouseenter', () => this.chart?.highlight(row.dataset.chartId));
          row.addEventListener('mouseleave', () => this.chart?.highlight(null));
        }
        landmarksList.appendChild(row);
      });
    }

    const travelNote = document.getElementById('detail-travel-note');
    if (travelNote) {
      travelNote.hidden = island.isCurrent;
      if (!island.isCurrent) {
        travelNote.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l2 3h14l2-3"/><path d="M12 3v11"/><path d="M12 4l6 9H12"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/></svg><span>${i18n.t('worldMap.travelNote', { name: island.name })}</span>`;
      }
    }
    // Sin botón de cambio de vista: las pestañas Archipiélago / Isla actual ya cumplen esa función
  }

  /** Carta del cartógrafo: se crea la primera vez que se abre la pestaña de la isla. */
  _ensureChart() {
    if (this.chart || !this.wmm?.om) return this.chart;
    const host = document.getElementById('island-chart-host');
    if (!host) return null;
    this.chart = new IslandChart(host, this.wmm.om);
    this.chart.onFollow = () => this._renderChartTrack();
    this.chart.onHover = (id) => {
      document.querySelectorAll('#detail-landmarks-list .lk-wmap__poi').forEach((r) => r.classList.toggle('lk-is-hot', Boolean(id) && r.dataset.chartId === id));
    };
    return this.chart;
  }

  _showChartSide(on) {
    const tr = document.getElementById('detail-chart-track');
    const ex = document.getElementById('detail-chart-explored');
    if (tr) tr.hidden = !on;
    if (ex) ex.hidden = !on;
  }

  _renderChartTrack() {
    const box = document.getElementById('detail-chart-track');
    if (!box || !this.chart) return;
    const t = this.chart.target();
    const p = this.wmm?.om?.player?.position;
    if (!t) { box.innerHTML = `<small>${i18n.t('worldMap.destination')}</small><b>${i18n.t('worldMap.noDestination')}</b><span>${i18n.t('worldMap.clickToFollow')}</span>`; }
    else {
      const d = p ? Math.round(Math.hypot(t.x - p.x, t.z - p.z)) : null;
      box.innerHTML = `<small>${t.label}</small><b>${t.title}</b><span>${d !== null ? `${i18n.t('worldMap.distM', { n: d })} · ` : ''}${i18n.t('worldMap.followGolden')}</span>`;
    }
    document.querySelectorAll('#detail-landmarks-list .lk-wmap__poi').forEach((r) => {
      const on = Boolean(this.chart.follow) && r.dataset.chartId === this.chart.follow;
      r.classList.toggle('lk-is-follow', on);
      const go = r.querySelector('.lk-wmap__poi-go'); if (go) go.textContent = on ? i18n.t('worldMap.following') : i18n.t('worldMap.follow');
    });
  }

  renderIslandMap() {
    if (this._ensureChart()) {
      const pct = this.chart.open();
      this._showChartSide(true);
      const ex = document.getElementById('detail-chart-explored');
      if (ex) { ex.querySelector('[data-ref="pct"]').textContent = `${Math.round(pct * 100)} %`; ex.querySelector('[data-ref="bar"]').style.width = `${Math.round(pct * 100)}%`; }
      this._renderChartTrack();
      return;
    }
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
      watermarkTitleEl.textContent = `${isSavannah ? i18n.t('places.islandSavannah') : i18n.t('places.islandForest')} · Lunacia`;
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
        ctx.fillStyle = '#4ade80'; ctx.fillText('●', oasisX + Math.cos(a) * (oasisR + 3 * scale), oasisY + Math.sin(a) * (oasisR + 3 * scale));
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

    // (El sendero al antiguo Dojō Secreto se retiró en el Hito 51: el dojo está ahora en el pueblo del camino)

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
      ctx.fillStyle = '#facc15'; ctx.fillText('◆', px, py);

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
      ctx.fillStyle = '#ffffff'; ctx.fillText('!', qx, qy);
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
      ctx.fillText(i18n.t('worldMap.you'), ppx, ppy - 14);
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
    void this.modalEl.offsetWidth; // la ventana entra con la transición del sistema
    this.modalEl.classList.add('lk-is-open');

    if (this.currentTab === 'world') {
      // Al abrir, la ficha muestra la isla en la que estás
      this.selectedIslandKey = this._currentKey();
      this.renderIslandsCross();
      this.selectIsland(this.selectedIslandKey);
    } else {
      this.renderIslandMap();
      this.selectIsland(this._currentKey());
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
    this.chart?.close();
    this.modalEl.classList.remove('lk-is-open');
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
