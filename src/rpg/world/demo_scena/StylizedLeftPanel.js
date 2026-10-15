import * as THREE from 'three';

/**
 * Panel Izquierdo Idéntico al de stylized-components-main.
 * Réplica exacta de la cabecera tipográfica, el dock inferior de selección de Seasons/Sky
 * (OverlaySwitcher) y la suite completa de controles en tiempo real (Leva Controls)
 * para manipular todos los uniforms de césped, flores, viento, tierra y contraluz.
 */
export class StylizedLeftPanel {
  constructor(app) {
    this.app = app;
    this.visible = true;
    this.controlsExpanded = false;
    this.activeSeason = 'default';
    this.activeSky = 'day';

    this.container = null;
    this.buildPanel();
    this.bindEvents();
  }

  buildPanel() {
    this.container = document.createElement('div');
    this.container.id = 'stylized-left-panel-container';
    this.container.innerHTML = `
      <style>
        #stylized-left-panel-container {
          position: fixed;
          top: 20px;
          left: 24px;
          z-index: 1100;
          user-select: none;
          pointer-events: auto;
          font-family: 'Barlow Condensed', sans-serif;
          color: #d4cfc8;
        }

        .slp-panel {
          background: rgba(26, 24, 22, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid #3a3836;
          border-radius: 6px;
          padding: 16px 18px;
          width: 320px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7);
          scrollbar-width: thin;
          scrollbar-color: #5c5854 transparent;
          transition: transform 0.25s ease, opacity 0.25s ease;
        }

        .slp-panel::-webkit-scrollbar {
          width: 4px;
        }
        .slp-panel::-webkit-scrollbar-thumb {
          background: #5c5854;
          border-radius: 2px;
        }

        /* Cabecera estilizada */
        .slp-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .slp-classification {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #9a8e78;
        }
        .slp-btn-minimize {
          background: transparent;
          border: 1px solid #3a3836;
          color: #9a8e78;
          border-radius: 3px;
          width: 22px;
          height: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          line-height: 1;
          transition: 0.15s;
        }
        .slp-btn-minimize:hover {
          border-color: #c8b89a;
          color: #f0ece6;
        }

        .slp-hr {
          height: 1px;
          background: #3a3836;
          margin-bottom: 8px;
          opacity: 0.7;
        }

        .slp-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 38px;
          line-height: 0.95;
          letter-spacing: 0.05em;
          color: #f0ece6;
          margin: 0 0 3px 0;
        }

        .slp-subtitle {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12.5px;
          font-weight: 300;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8a847a;
          margin-bottom: 8px;
        }

        .slp-meta {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: #9a8e78;
          opacity: 0.8;
          margin-bottom: 14px;
        }

        /* Botón de activación directa */
        .slp-activate-btn {
          width: 100%;
          padding: 8px 10px;
          background: #2a2826;
          border: 1px solid #5c5854;
          border-radius: 4px;
          color: #f0ece6;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 12px;
          transition: 0.2s;
        }
        .slp-activate-btn.active {
          background: #35332f;
          border-color: #c8b89a;
          color: #ffd875;
          box-shadow: 0 0 10px rgba(200, 184, 154, 0.2);
        }
        .slp-activate-btn:hover {
          border-color: #c8b89a;
        }

        /* Docks de Season & Sky (OverlaySwitcher) */
        .slp-switcher-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid #3a3836;
        }
        .slp-switcher-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .slp-switcher-label {
          width: 52px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c8b89a;
          opacity: 0.75;
        }
        .slp-switcher-btn {
          flex: 1;
          height: 28px;
          padding: 0 8px;
          border: 1px solid #3a3836;
          border-radius: 4px;
          background: #1a1816;
          color: #d4cfc8;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: 0.65;
          transition: border-color 0.2s, background 0.2s, opacity 0.2s, color 0.2s;
        }
        .slp-switcher-btn:hover {
          border-color: #c8b89a;
          opacity: 1;
        }
        .slp-switcher-btn.active {
          border-color: #c8b89a;
          background: #2a2826;
          color: #f0ece6;
          opacity: 1;
          font-weight: 600;
        }

        /* Sección de Controles en tiempo real */
        .slp-controls-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #c8b89a;
          border-bottom: 1px solid #3a3836;
          margin-bottom: 8px;
        }
        .slp-controls-header:hover {
          color: #f0ece6;
        }

        .slp-controls-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Folders / Acordeones */
        .slp-folder {
          border: 1px solid #2e2b28;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(22, 20, 18, 0.6);
        }
        .slp-folder-title {
          padding: 5px 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #c8b89a;
          background: #242220;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .slp-folder-title:hover {
          background: #2c2926;
        }
        .slp-folder-content {
          padding: 7px 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Controles individuales */
        .slp-ctrl-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
        }
        .slp-ctrl-label {
          color: #a8a29a;
          font-weight: 400;
        }
        .slp-ctrl-val {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: #c8b89a;
        }
        .slp-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: #3a3836;
          outline: none;
          margin-top: 3px;
        }
        .slp-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #c8b89a;
          cursor: pointer;
          transition: 0.15s;
        }
        .slp-slider::-webkit-slider-thumb:hover {
          background: #f0ece6;
          transform: scale(1.2);
        }

        .slp-color-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .slp-color-input {
          -webkit-appearance: none;
          border: 1px solid #3a3836;
          width: 20px;
          height: 18px;
          border-radius: 2px;
          cursor: pointer;
          background: transparent;
          padding: 0;
        }
        .slp-color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .slp-color-input::-webkit-color-swatch {
          border: none;
          border-radius: 2px;
        }

        .slp-num-input {
          flex: 1;
          height: 28px;
          background: #141210;
          border: 1px solid #3a3836;
          border-radius: 4px;
          color: #f0ece6;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          padding: 0 8px;
          outline: none;
          transition: border-color 0.2s;
        }
        .slp-num-input:focus {
          border-color: #c8b89a;
        }

        .slp-mini-num {
          background: #141210;
          border: 1px solid #38e8a6;
          border-radius: 3px;
          color: #a8ffd9;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 4px;
          width: 58px;
          text-align: right;
          outline: none;
        }
        .slp-mini-num:focus {
          border-color: #ffd875;
          color: #ffffff;
        }

        .slp-mini-hex {
          background: #141210;
          border: 1px solid #5c5854;
          border-radius: 3px;
          color: #f0ece6;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          padding: 1px 3px;
          width: 54px;
          text-align: center;
          outline: none;
          text-transform: uppercase;
        }
        .slp-mini-hex:focus {
          border-color: #38e8a6;
          color: #ffffff;
        }
        .slp-apply-btn {
          height: 28px;
          padding: 0 10px;
          background: #2a2826;
          border: 1px solid #5c5854;
          border-radius: 4px;
          color: #c8b89a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          font-weight: 600;
          cursor: pointer;
          transition: 0.18s;
        }
        .slp-apply-btn:hover {
          background: #35332f;
          border-color: #c8b89a;
          color: #ffffff;
        }
        .slp-quick-count-btn {
          height: 22px;
          background: #1a1816;
          border: 1px solid #3a3836;
          border-radius: 3px;
          color: #a8a29a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          cursor: pointer;
          transition: 0.15s;
        }
        .slp-quick-count-btn:hover {
          border-color: #c8b89a;
          color: #f0ece6;
        }
        .slp-quick-count-btn.active {
          background: #2a2826;
          border-color: #c8b89a;
          color: #ffd875;
          font-weight: 600;
        }

        /* Botones de presets V3 */
        .slp-v3-preset-btn {
          background: #142a1e;
          border: 1px solid #235d3d;
          color: #a8ffd9;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          padding: 5px 6px;
          cursor: pointer;
          border-radius: 3px;
          transition: 0.15s;
          text-align: center;
        }
        .slp-v3-preset-btn:hover {
          background: #1d4530;
          border-color: #38e8a6;
          color: #ffffff;
        }
        .slp-v3-preset-btn.active {
          background: #25704a;
          border-color: #38e8a6;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 0 8px rgba(56, 232, 166, 0.4);
        }

        /* Botón de reapertura si está minimizado */
        #slp-minimized-badge {
          display: none;
          position: fixed;
          top: 20px;
          left: 24px;
          z-index: 1100;
          background: #1a1816;
          border: 1px solid #3a3836;
          border-radius: 4px;
          padding: 6px 12px;
          color: #c8b89a;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          transition: 0.2s;
        }
        #slp-minimized-badge:hover {
          border-color: #c8b89a;
          color: #f0ece6;
        }
      </style>

      <div class="slp-panel" id="slp-main-panel">
        <!-- Encabezado con estética Open Source Workspace -->
        <div class="slp-header-top">
          <span class="slp-classification">OPEN SOURCE WORKSPACE</span>
          <button class="slp-btn-minimize" id="btn-slp-min" title="Minimizar panel">–</button>
        </div>
        <div class="slp-hr"></div>

        <h1 class="slp-title">STYLIZED GRASS</h1>
        <div class="slp-subtitle">Wind-animated stylized grass field</div>
        <div class="slp-meta">V 1.01 &mdash; THREE.JS / LEVA PIPELINE</div>

        <!-- Selector de Tipo de Césped -->
        <div class="slp-switcher-row" style="margin-bottom: 8px;">
          <span class="slp-switcher-label">Grass</span>
          <button class="slp-switcher-btn active" data-grasstype="stylized_v3">🌱 Césped V3</button>
          <button class="slp-switcher-btn" data-grasstype="stylized">🌾 Field</button>
          <button class="slp-switcher-btn" data-grasstype="genshin">🍃 Genshin</button>
        </div>

        <!-- Botón de estado activo -->
        <button class="slp-activate-btn active" id="btn-slp-toggle-type">
          <span>🌱 Césped Estilizado V3: ACTIVO</span>
        </button>

        <!-- Switcher inferior / lateral (OverlaySwitcher) -->
        <div class="slp-switcher-group">
          <!-- Fila Season -->
          <div class="slp-switcher-row">
            <span class="slp-switcher-label">Season</span>
            <button class="slp-switcher-btn active" data-season="default">Spring</button>
            <button class="slp-switcher-btn" data-season="autumn">Autumn</button>
            <button class="slp-switcher-btn" data-season="mars">Mars</button>
          </div>
          <!-- Fila Sky -->
          <div class="slp-switcher-row">
            <span class="slp-switcher-label">Sky</span>
            <button class="slp-switcher-btn active" data-sky="day">Day</button>
            <button class="slp-switcher-btn" data-sky="sunset">Sunset</button>
            <button class="slp-switcher-btn" data-sky="night">Night</button>
          </div>
        </div>

        <!-- Suite de Controles interactivos (Leva Folders) -->
        <div class="slp-controls-header" id="btn-slp-toggle-controls">
          <span>⚙️ Controles GPU (Leva)</span>
          <span id="slp-controls-arrow">▼</span>
        </div>

        <div class="slp-controls-body" id="slp-controls-body">
          <!-- 0. CÉSPED ESTILIZADO V3 (ZELDA: BOTW) -->
          <div class="slp-folder" id="folder-v3" style="border: 1px solid #38e8a6; border-radius: 4px; margin-bottom: 8px;">
            <div class="slp-folder-title" data-folder="v3" style="background: #153828; color: #a8ffd9; font-weight: bold;">
              <span>🍃 CÉSPED ZELDA: BOTW</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content" id="content-folder-v3" style="display: flex; flex-direction: column; gap: 8px;">
              
              <!-- Presets Rápidos V3 -->
              <div style="border-bottom: 1px dashed #276344; padding-bottom: 6px;">
                <span class="slp-ctrl-label" style="color: #a8ffd9; font-weight: 600;">Presets de Estilo & Paleta:</span>
                <button class="slp-v3-preset-btn active" data-v3preset="botw" style="width: 100%; margin-top: 4px; margin-bottom: 4px; background: #1c6b52; border-color: #38e8a6; color: #a8ffd9; font-weight: bold;">🍃 Zelda: Breath of the Wild (Hyrule)</button>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                  <button class="slp-v3-preset-btn" data-v3preset="mondstadt">🌿 Mondstadt</button>
                  <button class="slp-v3-preset-btn" data-v3preset="autumn">🍂 Otoño Dorado</button>
                  <button class="slp-v3-preset-btn" data-v3preset="sakura">🌸 Sakura Rosa</button>
                  <button class="slp-v3-preset-btn" data-v3preset="mystic">🌌 Místico Cyan</button>
                  <button class="slp-v3-preset-btn" data-v3preset="savannah" style="grid-column: span 2;">🌾 Savanna / Dorada</button>
                </div>
              </div>

              <!-- DENSIDAD & CANTIDAD -->
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label" style="color: #f0ece6; font-weight: 600;">Instancias 3D Activas:</span>
                  <input type="number" class="slp-mini-num" id="num-slp-v3-count" min="500" max="75000" step="500" value="50000">
                </div>
                <input type="range" class="slp-slider" id="slp-v3-count" min="500" max="75000" step="500" value="50000">
              </div>

              <!-- TAMAÑO & FORMA DE CLUMPS -->
              <div style="border-top: 1px dashed #276344; padding-top: 6px;">
                <span class="slp-ctrl-label" style="color: #a8ffd9; font-weight: 600;">Tamaño y Forma de Mata:</span>
                <div style="margin-top: 4px;">
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Altura (Y-Scale):</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-height" min="0.10" max="3.00" step="0.05" value="0.85">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-height" min="0.10" max="3.00" step="0.05" value="0.85">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Grosor (X/Z-Scale):</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-width" min="0.20" max="3.50" step="0.05" value="1.00">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-width" min="0.20" max="3.50" step="0.05" value="1.00">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Glow Contraluz Solar (BotW):</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-backlight" min="0.00" max="2.00" step="0.05" value="0.85">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-backlight" min="0.00" max="2.00" step="0.05" value="0.85">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Suavidad Half-Lambert:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-half-lambert" min="0.10" max="1.00" step="0.05" value="0.55">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-half-lambert" min="0.10" max="1.00" step="0.05" value="0.55">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Normales Unificadas:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-normal-up" min="0.0" max="1.0" step="0.05" value="0.78">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-normal-up" min="0.0" max="1.0" step="0.05" value="0.78">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Curva Gradiente:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-grad-curve" min="0.5" max="4.0" step="0.1" value="1.65">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-grad-curve" min="0.5" max="4.0" step="0.1" value="1.65">
                </div>
              </div>

              <!-- AGRUPACIÓN POR COLONIAS (BIOMA MMO) -->
              <div style="border-top: 1px dashed #276344; padding-top: 6px;">
                <span class="slp-ctrl-label" style="color: #a8ffd9; font-weight: 600;">Distribución en Colonias (Grupos):</span>
                <div style="margin-top: 4px;">
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Escala Islas (Cluster):</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-cluster-scale" min="0.010" max="0.300" step="0.005" value="0.150">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-cluster-scale" min="0.010" max="0.300" step="0.005" value="0.150">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Cobertura Pradera:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-coverage" min="0.10" max="0.99" step="0.01" value="0.95">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-coverage" min="0.10" max="0.99" step="0.01" value="0.95">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Filtro Anti-Solitarios:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-min-weight" min="0.05" max="0.65" step="0.01" value="0.28">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-min-weight" min="0.05" max="0.65" step="0.01" value="0.28">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Refuerzo Senderos:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-road-boost" min="0.00" max="1.00" step="0.05" value="0.25">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-road-boost" min="0.00" max="1.00" step="0.05" value="0.25">
                </div>
                <button id="btn-slp-v3-regen-colonies" class="slp-apply-btn" style="width: 100%; margin-top: 5px; background: #1c6b52; border-color: #38e8a6;">🔄 REGENERAR COLONIAS</button>
              </div>

              <!-- PALETA DE COLORES DE TEXTURAS Y SHADERS -->
              <div style="border-top: 1px dashed #276344; padding-top: 6px;">
                <span class="slp-ctrl-label" style="color: #a8ffd9; font-weight: 600;">Colores de Césped & Terreno Gouache:</span>
                
                <div class="slp-ctrl-row" style="margin-top: 4px;">
                  <span class="slp-ctrl-label">Sombra Raíz:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-base" value="#183b1d">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-base" value="#183b1d" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Verde Medio:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-mid" value="#48962c">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-mid" value="#48962c" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Puntas Luz:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-tip" value="#a2e742">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-tip" value="#a2e742" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Verde Soleado:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-sun" value="#5ea832">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-sun" value="#5ea832" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Verde Húmedo:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-wet" value="#1a441e">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-wet" value="#1a441e" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Borde Oliva:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-dry" value="#788d38">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-dry" value="#788d38" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Humus Oscuro:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-soil-h" value="#382413">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-soil-h" value="#382413" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Arcilla Cálida:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-soil-c" value="#7a522a">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-soil-c" value="#7a522a" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Arena Calcárea:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-soil-d" value="#c2a26c">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-soil-d" value="#c2a26c" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Musgo Borde:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-moss" value="#557329">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-moss" value="#557329" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Cresta Viento:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-wind" value="#e0f866">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-wind" value="#e0f866" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Pradera Claros:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-clearing" value="#5a9e3e">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-clearing" value="#5a9e3e" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Tierra Centro:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-dirt-c" value="#d1a872">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-dirt-c" value="#d1a872" maxlength="7">
                  </div>
                </div>

                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Tierra Borde:</span>
                  <div class="slp-color-box">
                    <input type="color" class="slp-color-input" id="slp-v3-col-dirt-e" value="#9b7346">
                    <input type="text" class="slp-mini-hex" id="text-slp-v3-col-dirt-e" value="#9b7346" maxlength="7">
                  </div>
                </div>
              </div>

              <!-- SUELO GOUACHE & VIENTO -->
              <div style="border-top: 1px dashed #276344; padding-top: 6px;">
                <span class="slp-ctrl-label" style="color: #a8ffd9; font-weight: 600;">Suelo Gouache & Viento:</span>
                <div style="margin-top: 4px;">
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Escala Textura Suelo:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-ground-scale" min="0.05" max="1.00" step="0.01" value="0.25">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-ground-scale" min="0.05" max="1.00" step="0.01" value="0.25">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Cobertura Parches Tierra:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-soil-cov" min="0.00" max="0.95" step="0.01" value="0.84">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-soil-cov" min="0.00" max="0.95" step="0.01" value="0.84">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Escala Parches Tierra:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-soil-scale" min="0.010" max="0.200" step="0.005" value="0.100">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-soil-scale" min="0.010" max="0.200" step="0.005" value="0.100">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Escala Textura Tierra:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-soil-tex-scale" min="0.05" max="1.00" step="0.01" value="0.15">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-soil-tex-scale" min="0.05" max="1.00" step="0.01" value="0.15">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Variación Macro Terreno:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-macro-scale" min="0.005" max="0.080" step="0.002" value="0.045">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-macro-scale" min="0.005" max="0.080" step="0.002" value="0.045">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Fuerza Viento V3:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-wind-str" min="0.0" max="1.50" step="0.02" value="0.30">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-wind-str" min="0.0" max="1.50" step="0.02" value="0.30">
                </div>
                <div>
                  <div class="slp-ctrl-row">
                    <span class="slp-ctrl-label">Velocidad Viento:</span>
                    <input type="number" class="slp-mini-num" id="num-slp-v3-wind-spd" min="0.1" max="3.0" step="0.1" value="1.00">
                  </div>
                  <input type="range" class="slp-slider" id="slp-v3-wind-spd" min="0.1" max="3.0" step="0.1" value="1.00">
                </div>
              </div>

            </div>
          </div>

          <!-- 1. BLADES -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="blades">
              <span>Blades (Briznas)</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <!-- Densidad / Cantidad directa de briznas -->
              <div style="border-bottom: 1px dashed #3a3836; padding-bottom: 8px; margin-bottom: 8px;">
                <div class="slp-ctrl-row" style="margin-bottom: 5px;">
                  <span class="slp-ctrl-label" style="font-weight: 600; color: #f0ece6;">Cantidad de briznas:</span>
                  <span class="slp-ctrl-val" id="val-slp-blade-count">3.000.000</span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
                  <input type="number" id="input-slp-blade-count" class="slp-num-input" min="1000" max="3500000" step="10000" value="3000000" placeholder="Ej: 3000000">
                  <button id="btn-slp-apply-count" class="slp-apply-btn">APLICAR</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px;">
                  <button class="slp-quick-count-btn" data-count="80000">80k</button>
                  <button class="slp-quick-count-btn" data-count="500000">500k</button>
                  <button class="slp-quick-count-btn" data-count="1000000">1M</button>
                  <button class="slp-quick-count-btn active" data-count="3000000">3M 🔥</button>
                </div>
              </div>

              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Ancho de brizna:</span>
                  <span class="slp-ctrl-val" id="val-slp-width">0.110m</span>
                </div>
                <input type="range" class="slp-slider" id="slp-width" min="0.02" max="0.25" step="0.005" value="0.110">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Largo de brizna:</span>
                  <span class="slp-ctrl-val" id="val-slp-length">0.50m</span>
                </div>
                <input type="range" class="slp-slider" id="slp-length" min="0.08" max="0.80" step="0.01" value="0.50">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Inclinación máx (tilt):</span>
                  <span class="slp-ctrl-val" id="val-slp-tilt">0.16</span>
                </div>
                <input type="range" class="slp-slider" id="slp-tilt" min="0.0" max="0.6" step="0.02" value="0.16">
              </div>
            </div>
          </div>

          <!-- 2. COLOR -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="color">
              <span>Color & Gradiente</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color raíz (suelo):</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-col-bottom" value="#3d7216">
                  <span class="slp-ctrl-val" id="val-slp-col-bottom">#3d7216</span>
                </div>
              </div>
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color punta:</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-col-top" value="#7bb822">
                  <span class="slp-ctrl-val" id="val-slp-col-top">#7bb822</span>
                </div>
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Brillo (Brightness):</span>
                  <span class="slp-ctrl-val" id="val-slp-brightness">0.85</span>
                </div>
                <input type="range" class="slp-slider" id="slp-brightness" min="0.3" max="1.8" step="0.05" value="0.85">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Gradiente inicio (base):</span>
                  <span class="slp-ctrl-val" id="val-slp-grad-start">0.15</span>
                </div>
                <input type="range" class="slp-slider" id="slp-grad-start" min="0.0" max="0.8" step="0.02" value="0.15">
              </div>
            </div>
          </div>

          <!-- 3. TRANSLUCENCY -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="trans">
              <span>Translucency (Contraluz)</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color resplandor:</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-col-trans" value="#c1e54d">
                  <span class="slp-ctrl-val" id="val-slp-col-trans">#c1e54d</span>
                </div>
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Fuerza traslucidez:</span>
                  <span class="slp-ctrl-val" id="val-slp-trans-str">2.50</span>
                </div>
                <input type="range" class="slp-slider" id="slp-trans-str" min="0.0" max="6.0" step="0.1" value="2.50">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Potencia de lóbulo:</span>
                  <span class="slp-ctrl-val" id="val-slp-trans-pow">3.00</span>
                </div>
                <input type="range" class="slp-slider" id="slp-trans-pow" min="1.0" max="8.0" step="0.2" value="3.00">
              </div>
            </div>
          </div>

          <!-- 4. DIRT & PATCHES -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="dirt">
              <span>Tierra & Parches</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color tierra:</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-col-dirt" value="#baa179">
                  <span class="slp-ctrl-val" id="val-slp-col-dirt">#baa179</span>
                </div>
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Cobertura tierra:</span>
                  <span class="slp-ctrl-val" id="val-slp-dirt-cov">0.16</span>
                </div>
                <input type="range" class="slp-slider" id="slp-dirt-cov" min="0.0" max="0.7" step="0.02" value="0.16">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Escala ruido tierra:</span>
                  <span class="slp-ctrl-val" id="val-slp-dirt-scale">0.40</span>
                </div>
                <input type="range" class="slp-slider" id="slp-dirt-scale" min="0.05" max="1.0" step="0.02" value="0.40">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Fuerza parches:</span>
                  <span class="slp-ctrl-val" id="val-slp-patch-str">0.36</span>
                </div>
                <input type="range" class="slp-slider" id="slp-patch-str" min="0.0" max="1.0" step="0.05" value="0.36">
              </div>
            </div>
          </div>

          <!-- 5. WIND -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="wind">
              <span>Viento (Wind)</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Fuerza viento:</span>
                  <span class="slp-ctrl-val" id="val-slp-wind-str">0.12</span>
                </div>
                <input type="range" class="slp-slider" id="slp-wind-str" min="0.0" max="0.6" step="0.02" value="0.12">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Velocidad viento:</span>
                  <span class="slp-ctrl-val" id="val-slp-wind-spd">1.30</span>
                </div>
                <input type="range" class="slp-slider" id="slp-wind-spd" min="0.2" max="3.5" step="0.1" value="1.30">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Frecuencia ondas:</span>
                  <span class="slp-ctrl-val" id="val-slp-wind-freq">0.45</span>
                </div>
                <input type="range" class="slp-slider" id="slp-wind-freq" min="0.1" max="1.5" step="0.05" value="0.45">
              </div>
            </div>
          </div>

          <!-- 6. FLOWERS -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="flowers">
              <span>Flores en Cruz (Flowers)</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Tamaño flores:</span>
                  <span class="slp-ctrl-val" id="val-slp-fl-size">0.30m</span>
                </div>
                <input type="range" class="slp-slider" id="slp-fl-size" min="0.15" max="0.65" step="0.02" value="0.30">
              </div>
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color pétalos R:</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-fl-col-r" value="#b084c7">
                  <span class="slp-ctrl-val" id="val-slp-fl-col-r">#b084c7</span>
                </div>
              </div>
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color pétalos G:</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-fl-col-g" value="#cbb36a">
                  <span class="slp-ctrl-val" id="val-slp-fl-col-g">#cbb36a</span>
                </div>
              </div>
              <div class="slp-ctrl-row">
                <span class="slp-ctrl-label">Color pétalos B:</span>
                <div class="slp-color-box">
                  <input type="color" class="slp-color-input" id="slp-fl-col-b" value="#9287ff">
                  <span class="slp-ctrl-val" id="val-slp-fl-col-b">#9287ff</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 7. ROCKS -->
          <div class="slp-folder">
            <div class="slp-folder-title" data-folder="rocks">
              <span>Pisoteo por Rocas (Rocks)</span>
              <span>▾</span>
            </div>
            <div class="slp-folder-content">
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Aplanar césped (Flatten):</span>
                  <span class="slp-ctrl-val" id="val-slp-rock-flat">0.20</span>
                </div>
                <input type="range" class="slp-slider" id="slp-rock-flat" min="0.0" max="1.0" step="0.05" value="0.20">
              </div>
              <div>
                <div class="slp-ctrl-row">
                  <span class="slp-ctrl-label">Doblar hacia fuera (Bend):</span>
                  <span class="slp-ctrl-val" id="val-slp-rock-bend">0.80</span>
                </div>
                <input type="range" class="slp-slider" id="slp-rock-bend" min="0.0" max="0.8" step="0.05" value="0.80">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Badge para restaurar cuando se minimiza -->
      <button id="slp-minimized-badge">STYLIZED GRASS [ + ]</button>
    `;

    document.body.appendChild(this.container);
  }

  bindEvents() {
    const mainPanel = document.getElementById('slp-main-panel');
    const minBadge = document.getElementById('slp-minimized-badge');
    const btnMin = document.getElementById('btn-slp-min');

    // Minimizar / Restaurar panel
    if (btnMin && minBadge && mainPanel) {
      btnMin.addEventListener('click', () => {
        mainPanel.style.display = 'none';
        minBadge.style.display = 'block';
      });
      minBadge.addEventListener('click', () => {
        minBadge.style.display = 'none';
        mainPanel.style.display = 'block';
      });
    }

    // Toggle de modo Césped Stylized V3 vs Field vs Genshin
    const btnToggleType = document.getElementById('btn-slp-toggle-type');
    if (btnToggleType) {
      btnToggleType.addEventListener('click', () => {
        const current = this.app.vegetationManager ? this.app.vegetationManager.grassType : 'stylized_v3';
        let next = 'stylized_v3';
        if (current === 'stylized_v3') next = 'stylized';
        else if (current === 'stylized') next = 'genshin';
        else next = 'stylized_v3';
        this.setGrassType(next);
      });
    }

    const grassTypeBtns = document.querySelectorAll('.slp-switcher-btn[data-grasstype]');
    grassTypeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetType = btn.getAttribute('data-grasstype');
        this.setGrassType(targetType);
      });
    });

    // Season switcher (OverlaySwitcher de stylized-components)
    const seasonBtns = document.querySelectorAll('.slp-switcher-btn[data-season]');
    seasonBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const season = btn.getAttribute('data-season');
        this.applySeasonPreset(season);
        seasonBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Sky switcher
    const skyBtns = document.querySelectorAll('.slp-switcher-btn[data-sky]');
    skyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const sky = btn.getAttribute('data-sky');
        this.applySkyPreset(sky);
        skyBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Desplegar/Colapsar sección de Controles
    const btnControls = document.getElementById('btn-slp-toggle-controls');
    const bodyControls = document.getElementById('slp-controls-body');
    const arrowControls = document.getElementById('slp-controls-arrow');
    if (btnControls && bodyControls && arrowControls) {
      btnControls.addEventListener('click', () => {
        this.controlsExpanded = !this.controlsExpanded;
        bodyControls.style.display = this.controlsExpanded ? 'flex' : 'none';
        arrowControls.textContent = this.controlsExpanded ? '▲' : '▼';
      });
      // Iniciar desplegado para facilidad de inspección
      this.controlsExpanded = true;
      bodyControls.style.display = 'flex';
      arrowControls.textContent = '▲';
    }

    // Vincular sliders a los uniforms en tiempo real
    this.bindUniformControls();
    this.syncControlsToUniforms();
  }

  setGrassType(type) {
    const btnToggleType = document.getElementById('btn-slp-toggle-type');
    if (this.app.vegetationManager) {
      this.app.vegetationManager.setGrassType(type);
    }
    if (this.app.terrain) {
      this.app.terrain.setGrassType(type);
    }

    const grassTypeBtns = document.querySelectorAll('.slp-switcher-btn[data-grasstype]');
    grassTypeBtns.forEach((btn) => {
      if (btn.getAttribute('data-grasstype') === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (btnToggleType) {
      if (type === 'stylized_v3') {
        btnToggleType.classList.add('active');
        btnToggleType.innerHTML = '<span>🌱 Césped Estilizado V3: ACTIVO</span>';
      } else if (type === 'stylized') {
        btnToggleType.classList.add('active');
        btnToggleType.innerHTML = '<span>🌾 Césped Stylized Field: ACTIVO</span>';
      } else {
        btnToggleType.classList.remove('active');
        btnToggleType.innerHTML = '<span>🍃 Césped Genshin: ACTIVO</span>';
      }
    }
  }

  applySeasonPreset(seasonKey) {
    this.activeSeason = seasonKey;
    const vm = this.app.vegetationManager;
    if (!vm || !vm.stylizedUniforms) return;
    const u = vm.stylizedUniforms;

    // Si aún no está en modo stylized, activarlo al cambiar de estación
    if (vm.grassType !== 'stylized') {
      this.setGrassType('stylized');
    }

    if (seasonKey === 'default') {
      // Spring Lush (Genshin / Anime references)
      u.uGrassBottom.value.set('#3d7216');
      u.uGrassTop.value.set('#7bb822');
      u.uBrightness.value = 0.85;
      u.uDirtColor.value.set('#baa179');
      u.uDirtCoverage.value = 0.16;
      u.uDirtScale.value = 0.40;
      u.uPatchStrength.value = 0.36;
      u.uRockFlatten.value = 0.20;
      u.uRockBend.value = 0.80;
      u.uTransColor.value.set('#c1e54d');
      u.uTransStrength.value = 2.5;
      u.uWindStrength.value = 0.12;
      u.uPatchLush.value.set('#4fa01e');
      u.uPatchDry.value.set('#98ca2e');
      if (vm.setStylizedBladeWidth) vm.setStylizedBladeWidth(0.110);
      if (vm.setStylizedBladeLength) vm.setStylizedBladeLength(0.50);
    } else if (seasonKey === 'autumn') {
      // Autumn
      u.uGrassBottom.value.set('#7e8005');
      u.uGrassTop.value.set('#d2db18');
      u.uBrightness.value = 0.85;
      u.uDirtColor.value.set('#e2b329');
      u.uDirtCoverage.value = 0.48;
      u.uDirtScale.value = 0.26;
      u.uTransColor.value.set('#f8f454');
      u.uTransStrength.value = 3.0;
      u.uWindStrength.value = 0.12;
      u.uWindSpeed.value = 1.3;
      u.uPatchLush.value.set('#a09630');
      u.uPatchDry.value.set('#c49420');
      if (vm.setStylizedBladeWidth) vm.setStylizedBladeWidth(0.06);
      if (vm.setStylizedBladeLength) vm.setStylizedBladeLength(0.24);
    } else if (seasonKey === 'mars') {
      // Mars
      u.uGrassBottom.value.set('#c7611a');
      u.uGrassTop.value.set('#f879e7');
      u.uBrightness.value = 0.90;
      u.uDirtColor.value.set('#66cde5');
      u.uDirtCoverage.value = 0.44;
      u.uDirtScale.value = 0.28;
      u.uTransColor.value.set('#ffffff');
      u.uTransStrength.value = 2.5;
      u.uWindStrength.value = 0.16;
      u.uWindSpeed.value = 2.2;
      u.uPatchLush.value.set('#d84a7e');
      u.uPatchDry.value.set('#8386ff');
      if (vm.setStylizedBladeWidth) vm.setStylizedBladeWidth(0.04);
      if (vm.setStylizedBladeLength) vm.setStylizedBladeLength(0.36);
    }

    this.syncControlsToUniforms();
  }

  applySkyPreset(skyKey) {
    this.activeSky = skyKey;
    if (this.app.setLightingPreset) {
      if (skyKey === 'day') this.app.setLightingPreset('daylight');
      else if (skyKey === 'sunset') this.app.setLightingPreset('sunset');
      else if (skyKey === 'night') this.app.setLightingPreset('night');
    }
  }

  syncControlsToUniforms() {
    const vm = this.app.vegetationManager;
    if (!vm || !vm.stylizedUniforms) return;
    const u = vm.stylizedUniforms;

    const setVal = (id, val, text) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById('val-' + id);
      if (el) el.value = val;
      if (valEl) valEl.textContent = text !== undefined ? text : val;
    };

    const setCol = (id, hex) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById('val-' + id);
      if (el) el.value = hex;
      if (valEl) valEl.textContent = hex;
    };

    setCol('slp-col-bottom', '#' + u.uGrassBottom.value.getHexString());
    setCol('slp-col-top', '#' + u.uGrassTop.value.getHexString());
    setVal('slp-brightness', u.uBrightness.value, u.uBrightness.value.toFixed(2));
    setCol('slp-col-dirt', '#' + u.uDirtColor.value.getHexString());
    setVal('slp-dirt-cov', u.uDirtCoverage.value, u.uDirtCoverage.value.toFixed(2));
    setVal('slp-dirt-scale', u.uDirtScale.value, u.uDirtScale.value.toFixed(2));
    setCol('slp-col-trans', '#' + u.uTransColor.value.getHexString());
    setVal('slp-trans-str', u.uTransStrength.value, u.uTransStrength.value.toFixed(2));
    setVal('slp-wind-str', u.uWindStrength.value, u.uWindStrength.value.toFixed(2));
    setVal('slp-wind-spd', u.uWindSpeed.value, u.uWindSpeed.value.toFixed(2));

    if (u.uBladeWidthScale) {
      const w = 0.06 * u.uBladeWidthScale.value;
      setVal('slp-width', w, w.toFixed(3) + 'm');
    }
    if (u.uBladeLengthScale) {
      const l = 0.22 * u.uBladeLengthScale.value;
      setVal('slp-length', l, l.toFixed(2) + 'm');
    }
    if (u.uPatchStrength) {
      setVal('slp-patch-str', u.uPatchStrength.value, u.uPatchStrength.value.toFixed(2));
    }
    if (u.uRockFlatten) {
      setVal('slp-rock-flat', u.uRockFlatten.value, u.uRockFlatten.value.toFixed(2));
    }
    if (u.uRockBend) {
      setVal('slp-rock-bend', u.uRockBend.value, u.uRockBend.value.toFixed(2));
    }
    if (vm.stylizedBladeCount) {
      const cntEl = document.getElementById('val-slp-blade-count');
      const inputEl = document.getElementById('input-slp-blade-count');
      if (cntEl) cntEl.textContent = vm.stylizedBladeCount.toLocaleString('es-ES');
      if (inputEl) inputEl.value = vm.stylizedBladeCount;
    }
  }

  bindUniformControls() {
    const vm = this.app.vegetationManager;
    if (!vm) return;

    const bindSlider = (id, onVal) => {
      const s = document.getElementById(id);
      const v = document.getElementById('val-' + id);
      if (s && v) {
        s.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          onVal(val, v);
        });
      }
    };

    const bindColor = (id, onVal) => {
      const c = document.getElementById(id);
      const v = document.getElementById('val-' + id);
      if (c && v) {
        c.addEventListener('input', (e) => {
          v.textContent = e.target.value;
          onVal(e.target.value);
        });
      }
    };

    // Blades - Blade Count (Densidad numérica directa)
    const bladeCountInput = document.getElementById('input-slp-blade-count');
    const bladeCountApplyBtn = document.getElementById('btn-slp-apply-count');
    const bladeCountVal = document.getElementById('val-slp-blade-count');
    const quickCountBtns = this.container.querySelectorAll('.slp-quick-count-btn');

    const applyCount = (val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num <= 0) return;
      if (vm.setStylizedBladeCount) {
        vm.setStylizedBladeCount(num);
      }
      if (bladeCountVal) {
        bladeCountVal.textContent = num.toLocaleString('es-ES');
      }
      if (bladeCountInput) {
        bladeCountInput.value = num;
      }
      quickCountBtns.forEach((b) => {
        b.classList.toggle('active', parseInt(b.dataset.count, 10) === num);
      });
    };

    if (bladeCountApplyBtn && bladeCountInput) {
      bladeCountApplyBtn.addEventListener('click', () => {
        applyCount(bladeCountInput.value);
      });
      bladeCountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          applyCount(bladeCountInput.value);
        }
      });
    }

    quickCountBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const count = parseInt(btn.dataset.count, 10);
        applyCount(count);
      });
    });

    // Blades
    bindSlider('slp-width', (val, label) => {
      label.textContent = val.toFixed(3) + 'm';
      if (vm.setStylizedBladeWidth) vm.setStylizedBladeWidth(val);
    });

    bindSlider('slp-length', (val, label) => {
      label.textContent = val.toFixed(2) + 'm';
      if (vm.setStylizedBladeLength) vm.setStylizedBladeLength(val);
    });

    bindSlider('slp-tilt', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.setStylizedBladeTilt) vm.setStylizedBladeTilt(val);
    });

    // Color
    bindColor('slp-col-bottom', (hex) => {
      if (vm.stylizedUniforms) vm.stylizedUniforms.uGrassBottom.value.set(hex);
      if (this.app.terrain && this.app.terrain.terrainShader) {
        this.app.terrain.terrainShader.uniforms.uGrassBottom.value.set(hex);
      }
    });

    bindColor('slp-col-top', (hex) => {
      if (vm.stylizedUniforms) vm.stylizedUniforms.uGrassTop.value.set(hex);
    });

    bindSlider('slp-brightness', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uBrightness.value = val;
      if (this.app.terrain && this.app.terrain.terrainShader) {
        this.app.terrain.terrainShader.uniforms.uBrightness.value = val;
      }
    });

    bindSlider('slp-grad-start', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uGradStart.value = val;
    });

    // Translucency
    bindColor('slp-col-trans', (hex) => {
      if (vm.stylizedUniforms) vm.stylizedUniforms.uTransColor.value.set(hex);
    });

    bindSlider('slp-trans-str', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uTransStrength.value = val;
    });

    bindSlider('slp-trans-pow', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uTransPower.value = val;
    });

    // Dirt
    bindColor('slp-col-dirt', (hex) => {
      if (vm.stylizedUniforms) vm.stylizedUniforms.uDirtColor.value.set(hex);
      if (this.app.terrain && this.app.terrain.terrainShader) {
        this.app.terrain.terrainShader.uniforms.uDirtColor.value.set(hex);
      }
    });

    bindSlider('slp-dirt-cov', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uDirtCoverage.value = val;
      if (this.app.terrain && this.app.terrain.terrainShader) {
        this.app.terrain.terrainShader.uniforms.uDirtCoverage.value = val;
      }
    });

    bindSlider('slp-dirt-scale', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uDirtScale.value = val;
      if (this.app.terrain && this.app.terrain.terrainShader) {
        this.app.terrain.terrainShader.uniforms.uDirtScale.value = val;
      }
    });

    bindSlider('slp-patch-str', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uPatchStrength.value = val;
      if (this.app.terrain && this.app.terrain.terrainShader) {
        this.app.terrain.terrainShader.uniforms.uPatchStrength.value = val;
      }
    });

    // Wind
    bindSlider('slp-wind-str', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uWindStrength.value = val;
    });

    bindSlider('slp-wind-spd', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uWindSpeed.value = val;
    });

    bindSlider('slp-wind-freq', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uWindFreq.value = val;
    });

    // Flowers
    bindSlider('slp-fl-size', (val, label) => {
      label.textContent = val.toFixed(2) + 'm';
      if (vm.setStylizedFlowerSize) {
        vm.setStylizedFlowerSize(val);
      }
    });

    bindColor('slp-fl-col-r', (hex) => {
      if (vm.stylizedFlowerUniforms) vm.stylizedFlowerUniforms.uColorR.value.set(hex);
    });
    bindColor('slp-fl-col-g', (hex) => {
      if (vm.stylizedFlowerUniforms) vm.stylizedFlowerUniforms.uColorG.value.set(hex);
    });
    bindColor('slp-fl-col-b', (hex) => {
      if (vm.stylizedFlowerUniforms) vm.stylizedFlowerUniforms.uColorB.value.set(hex);
    });

    // Rocks
    bindSlider('slp-rock-flat', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uRockFlatten.value = val;
    });

    bindSlider('slp-rock-bend', (val, label) => {
      label.textContent = val.toFixed(2);
      if (vm.stylizedUniforms) vm.stylizedUniforms.uRockBend.value = val;
    });

    // =========================================================================
    // V3 BINDINGS (CÉSPED ESTILIZADO V3 - CONFIGURACIÓN TOTAL)
    // =========================================================================

    // 1. Presets de Paleta V3
    const v3PresetBtns = this.container.querySelectorAll('.slp-v3-preset-btn');
    v3PresetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pKey = btn.getAttribute('data-v3preset');
        if (vm.applyV3Preset) {
          vm.applyV3Preset(pKey);
        }
        v3PresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Sincronizar inputs de color
        if (vm.v3GrassUniforms) {
          const u = vm.v3GrassUniforms;
          const syncCol = (pickerId, textId, color) => {
            const p = document.getElementById(pickerId);
            const t = document.getElementById(textId);
            if (p && color) {
              const hex = '#' + color.getHexString();
              p.value = hex;
              if (t) t.value = hex;
            }
          };
          syncCol('slp-v3-col-base', 'text-slp-v3-col-base', u.uBaseColor.value);
          syncCol('slp-v3-col-mid', 'text-slp-v3-col-mid', u.uMidColor.value);
          syncCol('slp-v3-col-tip', 'text-slp-v3-col-tip', u.uTipColor.value);
          syncCol('slp-v3-col-sun', 'text-slp-v3-col-sun', u.uSunGrassColor ? u.uSunGrassColor.value : null);
          syncCol('slp-v3-col-wet', 'text-slp-v3-col-wet', u.uWetGrassColor ? u.uWetGrassColor.value : null);
          syncCol('slp-v3-col-dry', 'text-slp-v3-col-dry', u.uDryGrassColor ? u.uDryGrassColor.value : null);
          syncCol('slp-v3-col-moss', 'text-slp-v3-col-moss', u.uMossColor ? u.uMossColor.value : null);
          syncCol('slp-v3-col-soil-h', 'text-slp-v3-col-soil-h', u.uSoilHumusColor ? u.uSoilHumusColor.value : null);
          syncCol('slp-v3-col-soil-c', 'text-slp-v3-col-soil-c', u.uSoilClayColor ? u.uSoilClayColor.value : null);
          syncCol('slp-v3-col-soil-d', 'text-slp-v3-col-soil-d', u.uSoilDryColor ? u.uSoilDryColor.value : null);
          syncCol('slp-v3-col-wind', 'text-slp-v3-col-wind', u.uWindHighlightColor.value);
          syncCol('slp-v3-col-clearing', 'text-slp-v3-col-clearing', u.uClearingGrassColor.value);
          syncCol('slp-v3-col-dirt-c', 'text-slp-v3-col-dirt-c', u.uDirtCenterColor.value);
          syncCol('slp-v3-col-dirt-e', 'text-slp-v3-col-dirt-e', u.uDirtEdgeColor.value);
        }
      });
    });

    // 2. Helper Bidireccional Número + Slider V3
    const bindSlpNumSlider = (numId, sliderId, onVal, parseFn = parseFloat) => {
      const numEl = document.getElementById(numId);
      const sliderEl = document.getElementById(sliderId);
      if (!numEl || !sliderEl) return;

      const update = (val, fromSlider) => {
        if (fromSlider) {
          numEl.value = val;
        } else {
          sliderEl.value = val;
        }
        onVal(val);
      };

      sliderEl.addEventListener('input', (e) => {
        const val = parseFn(e.target.value);
        update(val, true);
      });
      numEl.addEventListener('input', (e) => {
        const val = parseFn(e.target.value);
        if (!isNaN(val)) update(val, false);
      });
      numEl.addEventListener('change', (e) => {
        const val = parseFn(e.target.value);
        if (!isNaN(val)) update(val, false);
      });
    };

    // Helper Color Picker + Hex Input V3
    const bindSlpColorHex = (pickerId, textId, onVal) => {
      const p = document.getElementById(pickerId);
      const t = document.getElementById(textId);
      if (!p || !t) return;

      const apply = (hex) => {
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          p.value = hex;
          t.value = hex;
          onVal(hex);
        }
      };

      p.addEventListener('input', (e) => {
        t.value = e.target.value;
        onVal(e.target.value);
      });
      t.addEventListener('input', (e) => apply(e.target.value));
      t.addEventListener('change', (e) => apply(e.target.value));
    };

    // Densidad / Instancias V3
    bindSlpNumSlider('num-slp-v3-count', 'slp-v3-count', (val) => {
      if (vm.setV3Params) vm.setV3Params({ count: val });
    }, parseInt);

    // Tamaño y Cel-Shading V3
    bindSlpNumSlider('num-slp-v3-height', 'slp-v3-height', (val) => {
      if (vm.setV3Params) vm.setV3Params({ height: val });
    });
    bindSlpNumSlider('num-slp-v3-width', 'slp-v3-width', (val) => {
      if (vm.setV3Params) vm.setV3Params({ width: val });
    });
    bindSlpNumSlider('num-slp-v3-grad-curve', 'slp-v3-grad-curve', (val) => {
      if (vm.setV3Params) vm.setV3Params({ gradientCurve: val });
    });
    bindSlpNumSlider('num-slp-v3-normal-up', 'slp-v3-normal-up', (val) => {
      if (vm.setV3Params) vm.setV3Params({ normalUpBlend: val });
    });
    bindSlpNumSlider('num-slp-v3-backlight', 'slp-v3-backlight', (val) => {
      if (vm.setV3Params) vm.setV3Params({ backlightStrength: val });
    });
    bindSlpNumSlider('num-slp-v3-half-lambert', 'slp-v3-half-lambert', (val) => {
      if (vm.setV3Params) vm.setV3Params({ halfLambertBias: val });
    });

    // Parámetros de Agrupación en Colonias (con Auto-Regeneración)
    let slpRegenTimer = null;
    const triggerSlpDebouncedRegen = () => {
      clearTimeout(slpRegenTimer);
      slpRegenTimer = setTimeout(() => {
        const btn = document.getElementById('btn-slp-v3-regen-colonies');
        if (btn) btn.click();
      }, 350);
    };

    bindSlpNumSlider('num-slp-v3-cluster-scale', 'slp-v3-cluster-scale', () => triggerSlpDebouncedRegen());
    bindSlpNumSlider('num-slp-v3-coverage', 'slp-v3-coverage', () => triggerSlpDebouncedRegen());
    bindSlpNumSlider('num-slp-v3-min-weight', 'slp-v3-min-weight', () => triggerDebouncedRegen());
    bindSlpNumSlider('num-slp-v3-road-boost', 'slp-v3-road-boost', () => triggerDebouncedRegen());

    const btnRegenColonies = document.getElementById('btn-slp-v3-regen-colonies');
    if (btnRegenColonies) {
      btnRegenColonies.addEventListener('click', () => {
        const cScale = parseFloat(document.getElementById('num-slp-v3-cluster-scale')?.value || '0.15');
        const cCov = parseFloat(document.getElementById('num-slp-v3-coverage')?.value || '0.95');
        const cMin = parseFloat(document.getElementById('num-slp-v3-min-weight')?.value || '0.28');
        const cBoost = parseFloat(document.getElementById('num-slp-v3-road-boost')?.value || '0.25');
        const count = parseInt(document.getElementById('num-slp-v3-count')?.value || '50000', 10);

        if (vm.rebuildV3Colonies) {
          const act = vm.rebuildV3Colonies({
            clusterScale: cScale,
            islandCoverage: cCov,
            minClusterWeight: cMin,
            roadsideBoostFactor: cBoost,
            targetCount: count
          });
          if (act) {
            const nEl = document.getElementById('num-slp-v3-count');
            const sEl = document.getElementById('slp-v3-count');
            if (nEl) nEl.value = act;
            if (sEl) sEl.value = act;
          }
        }
      });
    }

    // Colores V3
    bindSlpColorHex('slp-v3-col-base', 'text-slp-v3-col-base', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ baseColor: hex });
    });
    bindSlpColorHex('slp-v3-col-mid', 'text-slp-v3-col-mid', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ midColor: hex });
    });
    bindSlpColorHex('slp-v3-col-tip', 'text-slp-v3-col-tip', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ tipColor: hex });
    });
    bindSlpColorHex('slp-v3-col-wind', 'text-slp-v3-col-wind', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ windHighlightColor: hex });
    });
    bindSlpColorHex('slp-v3-col-sun', 'text-slp-v3-col-sun', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ sunGrassColor: hex });
    });
    bindSlpColorHex('slp-v3-col-wet', 'text-slp-v3-col-wet', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ wetGrassColor: hex });
    });
    bindSlpColorHex('slp-v3-col-dry', 'text-slp-v3-col-dry', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ dryGrassColor: hex });
    });
    bindSlpColorHex('slp-v3-col-moss', 'text-slp-v3-col-moss', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ mossColor: hex });
    });
    bindSlpColorHex('slp-v3-col-soil-h', 'text-slp-v3-col-soil-h', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ soilHumusColor: hex });
    });
    bindSlpColorHex('slp-v3-col-soil-c', 'text-slp-v3-col-soil-c', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ soilClayColor: hex });
    });
    bindSlpColorHex('slp-v3-col-soil-d', 'text-slp-v3-col-soil-d', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ soilDryColor: hex });
    });
    bindSlpColorHex('slp-v3-col-clearing', 'text-slp-v3-col-clearing', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ clearingColor: hex });
    });
    bindSlpColorHex('slp-v3-col-dirt-c', 'text-slp-v3-col-dirt-c', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ dirtCenterColor: hex });
    });
    bindSlpColorHex('slp-v3-col-dirt-e', 'text-slp-v3-col-dirt-e', (hex) => {
      if (vm.setV3Params) vm.setV3Params({ dirtEdgeColor: hex });
    });

    // Suelo Gouache y Viento V3
    bindSlpNumSlider('num-slp-v3-ground-scale', 'slp-v3-ground-scale', (val) => {
      if (vm.setV3Params) vm.setV3Params({ groundTexScale: val });
    });
    bindSlpNumSlider('num-slp-v3-soil-cov', 'slp-v3-soil-cov', (val) => {
      if (vm.setV3Params) vm.setV3Params({ soilPatchCoverage: val });
    });
    bindSlpNumSlider('num-slp-v3-soil-scale', 'slp-v3-soil-scale', (val) => {
      if (vm.setV3Params) vm.setV3Params({ soilPatchScale: val });
    });
    bindSlpNumSlider('num-slp-v3-soil-tex-scale', 'slp-v3-soil-tex-scale', (val) => {
      if (vm.setV3Params) vm.setV3Params({ soilTexScale: val });
    });
    bindSlpNumSlider('num-slp-v3-macro-scale', 'slp-v3-macro-scale', (val) => {
      if (vm.setV3Params) vm.setV3Params({ macroNoiseScale: val });
    });
    bindSlpNumSlider('num-slp-v3-wind-str', 'slp-v3-wind-str', (val) => {
      if (vm.setV3Params) vm.setV3Params({ windStrength: val });
    });
    bindSlpNumSlider('num-slp-v3-wind-spd', 'slp-v3-wind-spd', (val) => {
      if (vm.setV3Params) vm.setV3Params({ windSpeed: val });
    });

    // Acordeón para abrir/cerrar cualquier carpeta de controles
    const folderTitles = this.container.querySelectorAll('.slp-folder-title');
    folderTitles.forEach((ft) => {
      ft.addEventListener('click', () => {
        const content = ft.nextElementSibling;
        if (content) {
          const isHidden = content.style.display === 'none';
          content.style.display = isHidden ? 'flex' : 'none';
          const arrow = ft.querySelector('span:last-child');
          if (arrow) arrow.textContent = isHidden ? '▾' : '▸';
        }
      });
    });
  }
}
