/**
 * DemoScenaDebugUI.js - Interfaz de Personalización y Comparador Visual idéntico al proyecto Demo_Scena.
 * Permite alternar con un solo clic entre el "Modo Genshin Impact" y el "Modo Clásico",
 * y ajustar al milímetro cada parámetro gráfico para encontrar el punto estético perfecto en Macro-Zona [2, 2].
 */
export class DemoScenaDebugUI {
  constructor(overworldManager) {
    this.om = overworldManager;
    this.visible = true;
    this.isCollapsed = true;

    this.fpsCount = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();

    this.container = null;
    this.cardBody = null;
    this.fabBtn = null;
    this.zoneLabel = null;
    this.coordsLabel = null;
    this.fpsLabel = null;

    // Estado actual de personalización (valores configurados por defecto según Demo_Scena)
    this.state = {
      bloom: true,
      bloomStrength: 0.80,    // Resplandor Bloom = 0.80
      rimLight: false,        // Rim light = off
      rimStrength: 0.0,
      paths: 0.20,            // Visibilidad sendero = 20%
      grassHeight: 0.40,      // Altura césped = 0.40x
      flowerScale: 2.50,      // Escala de las flores = 2.50x
      waterFoam: 1.10,        // Espuma contacto = 110%
      windStrength: 0.10,     // Fuerza del viento = 0.10 por defecto
      perlinWind: false,      // Viento Perlin desactivado por defecto
      crestGlow: 0.35,
      flowers: true,
      toonSpec: true,
      slimes: true,
      slimeGlow: 0.65,
      // Propiedades Césped Estilizado V3 - Estilo The Legend of Zelda: Breath of the Wild (BotW)
      v3Count: 50000,
      v3Height: 0.85,
      v3Width: 1.00,
      v3ClusterScale: 0.15,
      v3Coverage: 0.95,
      v3MinWeight: 0.28,
      v3RoadBoost: 0.25,
      v3GradCurve: 1.65,
      v3NormalUp: 0.78,
      v3Backlight: 0.85,
      v3HalfLambert: 0.55,
      v3GroundScale: 0.25,
      v3SoilCoverage: 0.84,
      v3SoilScale: 0.1,
      v3SoilTexScale: 0.15,
      v3MacroNoiseScale: 0.045,
      v3WindStrength: 0.30,
      v3WindSpeed: 1.25,
      v3ColBase: '#183b1d',
      v3ColMid: '#48962c',
      v3ColTip: '#a2e742',
      v3ColWind: '#e0f866',
      v3ColClearing: '#5a9e3e',
      v3ColDirtC: '#d1a872',
      v3ColDirtE: '#9b7346'
    };

    this.buildUI();
  }

  get zone() {
    return this.om?.demoScenaZone;
  }

  get terrain() {
    return this.zone?.terrain;
  }

  get vegetationManager() {
    return this.zone?.vegetationManager;
  }

  get waterManager() {
    return this.zone?.waterManager;
  }

  get slimeCreaturesManager() {
    return this.zone?.slimeCreaturesManager;
  }

  get environmentSystem() {
    return this.om?.environmentSystem;
  }

  get cameraController() {
    return this.om?.cameraController;
  }

  buildUI() {
    if (document.getElementById('demo-ui-container')) {
      const existing = document.getElementById('demo-ui-container');
      existing.remove();
    }

    this.container = document.createElement('div');
    this.container.id = 'demo-ui-container';
    this.container.innerHTML = `
      <style>
        #demo-ui-container {
          position: fixed;
          top: 125px;
          right: 14px;
          z-index: 9999;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          font-size: 11.5px;
          color: #f0f4f8;
          user-select: none;
          pointer-events: auto;
          transition: top 0.25s ease;
        }

        .hud-fab-toggle {
          display: none !important;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 36px;
          height: 36px;
          background: rgba(14, 20, 34, 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1.5px solid rgba(118, 239, 255, 0.45);
          border-radius: 9px;
          color: #9fe2bf;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.65), 0 0 10px rgba(118, 239, 255, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 0;
          outline: none;
        }

        .hud-fab-toggle:hover {
          background: rgba(22, 34, 58, 0.98);
          border-color: #76efff;
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.75), 0 0 16px rgba(118, 239, 255, 0.5);
        }

        .hud-fab-toggle:active {
          transform: scale(0.96);
        }

        .hud-fab-icon {
          font-size: 13px;
          line-height: 1;
        }

        .hud-fab-plus {
          font-size: 14px;
          font-weight: 800;
          color: #76efff;
          line-height: 1;
        }

        .hud-card {
          background: rgba(14, 20, 34, 0.90);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 10px 36px rgba(0, 0, 0, 0.55);
          width: 340px;
          max-height: 92vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(118, 239, 255, 0.45) transparent;
          transition: all 0.25s ease;
        }

        .hud-card::-webkit-scrollbar {
          width: 5px;
        }
        .hud-card::-webkit-scrollbar-thumb {
          background: rgba(118, 239, 255, 0.35);
          border-radius: 3px;
        }

        .hud-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          color: #9fe2bf;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 5px;
        }

        .hud-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hud-btn-icon {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #cbd5e1;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          padding: 2px 6px;
          transition: 0.15s;
        }
        .hud-btn-icon:hover {
          background: rgba(118, 239, 255, 0.25);
          color: #fff;
          border-color: #76efff;
        }

        .hud-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .hud-label {
          color: #94a3b8;
          font-size: 10.5px;
          margin-top: 7px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .hud-value {
          font-weight: 500;
          color: #ffffff;
        }

        .hud-badge {
          background: rgba(86, 214, 219, 0.22);
          color: #76efff;
          padding: 2px 7px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        /* Banner de Comparativa */
        .compare-box {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(86, 214, 219, 0.12));
          border: 1px solid rgba(255, 215, 0, 0.35);
          border-radius: 8px;
          padding: 7px;
          margin-bottom: 10px;
        }
        .compare-title {
          font-size: 11px;
          font-weight: 700;
          color: #ffd875;
          margin-bottom: 5px;
          text-align: center;
        }
        .compare-btn-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }
        .btn-compare {
          padding: 6px 4px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: 0.18s;
          text-align: center;
        }
        .btn-compare.genshin {
          background: #1c6b52;
          color: #a8ffd9;
          border-color: #38e8a6;
        }
        .btn-compare.genshin.active {
          background: #25a17a;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(56, 232, 166, 0.6);
        }
        .btn-compare.classic {
          background: #475569;
          color: #cbd5e1;
          border-color: #64748b;
        }
        .btn-compare.classic.active {
          background: #64748b;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(148, 163, 184, 0.6);
        }

        .btn-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-bottom: 5px;
        }

        .hud-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e2e8f0;
          padding: 4px 6px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 10.5px;
          font-weight: 500;
          transition: all 0.15s ease;
          text-align: center;
          white-space: nowrap;
        }

        .hud-btn:hover {
          background: rgba(118, 239, 255, 0.2);
          border-color: #76efff;
          color: #ffffff;
        }

        .hud-btn.active {
          background: #258dbd;
          border-color: #76efff;
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 0 8px rgba(118, 239, 255, 0.35);
        }

        .slider-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 7px;
          padding: 5px 8px;
          margin-bottom: 5px;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: #cbd5e1;
          margin-bottom: 3px;
        }

        .hud-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.18);
          outline: none;
          transition: 0.15s;
        }

        .hud-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #76efff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(118, 239, 255, 0.7);
        }

        .teleport-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-top: 4px;
        }

        .teleport-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          padding: 4px 6px;
          border-radius: 5px;
          font-size: 10px;
          cursor: pointer;
          transition: 0.15s;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .teleport-btn:hover {
          background: rgba(159, 226, 191, 0.22);
          color: #9fe2bf;
          border-color: rgba(159, 226, 191, 0.45);
        }

        .hud-num-input {
          background: rgba(0, 0, 0, 0.70);
          border: 1px solid rgba(56, 232, 166, 0.5);
          border-radius: 4px;
          color: #a8ffd9;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 4px;
          width: 68px;
          text-align: right;
          outline: none;
          transition: all 0.15s ease;
        }
        .hud-num-input:focus {
          border-color: #38e8a6;
          box-shadow: 0 0 8px rgba(56, 232, 166, 0.6);
          background: rgba(0, 0, 0, 0.90);
          color: #ffffff;
        }
        .hud-num-input::-webkit-inner-spin-button,
        .hud-num-input::-webkit-outer-spin-button {
          opacity: 0.85;
          height: 18px;
        }

        .hud-hex-input {
          background: rgba(0, 0, 0, 0.70);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 4px;
          color: #e2e8f0;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 10px;
          font-weight: 600;
          width: 62px;
          padding: 2px 3px;
          text-align: center;
          outline: none;
          text-transform: uppercase;
          transition: all 0.15s ease;
        }
        .hud-hex-input:focus {
          border-color: #38e8a6;
          box-shadow: 0 0 6px rgba(56, 232, 166, 0.5);
          color: #ffffff;
        }

        .hud-color-pickers {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .hud-color-input {
          -webkit-appearance: none;
          appearance: none;
          border: none;
          width: 22px;
          height: 20px;
          border-radius: 4px;
          cursor: pointer;
          background: none;
          padding: 0;
        }
        .hud-color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .hud-color-input::-webkit-color-swatch {
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 4px;
        }

        .hud-pill-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #cbd5e1;
          border-radius: 3px;
          font-size: 9.5px;
          padding: 2px 5px;
          cursor: pointer;
          font-family: monospace;
          font-weight: 600;
          transition: 0.15s;
        }
        .hud-pill-btn:hover {
          background: rgba(56, 232, 166, 0.3);
          color: #fff;
          border-color: #38e8a6;
        }
        .hud-pill-btn.active {
          background: #1c6b52;
          color: #a8ffd9;
          border-color: #38e8a6;
          box-shadow: 0 0 6px rgba(56, 232, 166, 0.4);
        }

        .hud-v3-container {
          background: linear-gradient(180deg, rgba(16, 44, 32, 0.88) 0%, rgba(12, 28, 22, 0.94) 100%);
          border: 1.5px solid #38e8a6;
          border-radius: 8px;
          padding: 8px 10px;
          margin: 6px 0 10px 0;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55), inset 0 0 14px rgba(56, 232, 166, 0.15);
        }
      </style>

      <button class="hud-fab-toggle" id="btn-fab-open" title="🌿 Evaluador & Comparador [+]" style="display: none !important;">
        <span class="hud-fab-icon">🌿</span>
        <span class="hud-fab-plus">+</span>
      </button>

      <div class="hud-card" id="hud-card-body" style="display: none;">
        <div class="hud-title">
          <span>🌿 EVALUADOR & COMPARADOR</span>
          <div class="hud-header-actions">
            <span class="hud-badge" id="hud-fps">60 FPS</span>
            <button class="hud-btn-icon" id="btn-minimize-hud" title="Cerrar / Minimizar panel (H)">✕</button>
          </div>
        </div>

        <div id="hud-content-sections">
          <div class="hud-row">
            <span style="color: #94a3b8;">Zona:</span>
            <span class="hud-value" id="hud-zone" style="color: #9fe2bf;">Pradera Verde</span>
          </div>

          <div class="hud-row">
            <span style="color: #94a3b8;">Coords:</span>
            <span class="hud-value" id="hud-coords" style="font-family: monospace; font-size: 10.5px;">X: 0 Y: 0 Z: 0</span>
          </div>

          <!-- 1. COMPARADOR RÁPIDO (1 CLIC) -->
          <div class="compare-box">
            <div class="compare-title">⚡ COMPARATIVA RÁPIDA (A/B)</div>
            <div class="compare-btn-group" style="grid-template-columns: 1fr 1fr 1fr;">
              <button class="btn-compare active" id="btn-mode-v3" style="background: #1c6b52; color: #a8ffd9; border-color: #38e8a6;">🍃 Zelda BotW</button>
              <button class="btn-compare genshin" id="btn-mode-genshin">🌟 Genshin</button>
              <button class="btn-compare classic" id="btn-mode-classic">🏛️ Clásico</button>
            </div>
          </div>

          <!-- 2. SHADING & POST-PROCESO -->
          <div class="hud-label" style="color: #ffd875;">✨ Post-Proceso & Shading Anime:</div>
          
          <div class="slider-box">
            <div class="slider-header">
              <span>Resplandor Bloom:</span>
              <span id="val-bloom-strength" style="color: #ffd875; font-family: monospace;">0.80</span>
            </div>
            <input type="range" class="hud-slider" id="slider-bloom-strength" min="0.0" max="1.5" step="0.02" value="0.80">
          </div>

          <div class="slider-box">
            <div class="slider-header">
              <span>Rim Light (Contorno Hero / Axie):</span>
              <span id="val-rim-strength" style="color: #76efff; font-family: monospace;">0.00</span>
            </div>
            <input type="range" class="hud-slider" id="slider-rim-strength" min="0.0" max="2.0" step="0.05" value="0.00">
          </div>

          <div class="btn-group">
            <button class="hud-btn active" id="btn-toggle-bloom">Bloom: ON</button>
            <button class="hud-btn" id="btn-toggle-rim">Rim Light: OFF</button>
          </div>

          <!-- 3. TERRENO & SENDEROS -->
          <div class="hud-label" style="color: #d4a373;">🛤️ Senderos Suaves (Tierra & Arena):</div>
          
          <div class="slider-box">
            <div class="slider-header">
              <span>Visibilidad Sendero (Gradiente Arena / Tierra):</span>
              <span id="val-path-intensity" style="color: #d4a373; font-family: monospace;">20%</span>
            </div>
            <input type="range" class="hud-slider" id="slider-path-intensity" min="0.0" max="1.0" step="0.05" value="0.20">
          </div>

          <!-- 4. CÉSPED & VEGETACIÓN -->
          <div class="hud-label" style="color: #76efff;">🌾 Césped, Viento y Flores:</div>

          <!-- SUITE COMPLETA DE CONTROLES CÉSPED ESTILIZADO V3 - ZELDA: BOTW -->
          <div class="hud-v3-container" id="box-v3-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(56, 232, 166, 0.35); padding-bottom: 4px;">
              <span style="font-weight: 700; color: #a8ffd9; font-size: 11px;">🍃 CÉSPED ZELDA: BOTW</span>
              <span class="hud-badge" style="background: rgba(56, 232, 166, 0.25); color: #a8ffd9; font-size: 9.5px; padding: 1px 5px;">GHIBLI SHADING</span>
            </div>

            <!-- PRESETS DE PALETA V3 (1 CLIC) -->
            <div style="margin-bottom: 8px;">
              <div style="font-size: 10px; color: #a8ffd9; margin-bottom: 4px; font-weight: 600;">🎨 Presets de Estilo & Paleta:</div>
              <button class="hud-btn active" id="btn-v3-p-botw" style="width: 100%; font-size: 10px; padding: 4px 2px; margin-bottom: 4px; background: #1c6b52; border-color: #38e8a6; color: #a8ffd9; font-weight: 700;">🍃 Zelda: Breath of the Wild (Hyrule)</button>
              <div class="btn-group" style="grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 3px;">
                <button class="hud-btn" id="btn-v3-p-mondstadt" style="font-size: 9.5px; padding: 3px 2px;">🌿 Mondstadt</button>
                <button class="hud-btn" id="btn-v3-p-autumn" style="font-size: 9.5px; padding: 3px 2px;">🍂 Otoño</button>
                <button class="hud-btn" id="btn-v3-p-sakura" style="font-size: 9.5px; padding: 3px 2px;">🌸 Sakura</button>
                <button class="hud-btn" id="btn-v3-p-mystic" style="font-size: 9.5px; padding: 3px 2px;">🌌 Místico</button>
              </div>
              <button class="hud-btn" id="btn-v3-p-savannah" style="width: 100%; font-size: 9.5px; padding: 3px 2px;">🌾 Savanna / Dorada</button>
            </div>

            <!-- DENSIDAD (INSTANCIAS 3D CON INPUT NUMÉRICO DIRECTO) -->
            <div class="slider-box" style="border-color: rgba(56, 232, 166, 0.35);">
              <div class="slider-header" style="align-items: center;">
                <span style="color: #a8ffd9; font-weight: 600;">Densidad (Instancias 3D):</span>
                <input type="number" class="hud-num-input" id="num-v3-count" min="500" max="75000" step="500" value="50000" title="Escribe directamente el número exacto de briznas">
              </div>
              <input type="range" class="hud-slider" id="slider-v3-count" min="500" max="75000" step="500" value="50000">
              <div style="display: flex; justify-content: space-between; margin-top: 4px; gap: 2px;">
                <button class="hud-pill-btn" data-v3count="5000">5k</button>
                <button class="hud-pill-btn" data-v3count="12000">12k</button>
                <button class="hud-pill-btn" data-v3count="22000">22k</button>
                <button class="hud-pill-btn" data-v3count="35000">35k</button>
                <button class="hud-pill-btn active" data-v3count="50000">50k</button>
              </div>
            </div>

            <!-- ALTURA DE LA MATA -->
            <div class="slider-box">
              <div class="slider-header" style="align-items: center;">
                <span>Altura de la Mata (m):</span>
                <input type="number" class="hud-num-input" id="num-v3-height" min="0.10" max="3.00" step="0.05" value="0.85">
              </div>
              <input type="range" class="hud-slider" id="slider-v3-height" min="0.10" max="3.00" step="0.05" value="0.85">
            </div>

            <!-- GROSOR DE LA MATA (ANCHO X/Z) -->
            <div class="slider-box">
              <div class="slider-header" style="align-items: center;">
                <span>Grosor de la Mata (x):</span>
                <input type="number" class="hud-num-input" id="num-v3-width" min="0.20" max="3.50" step="0.05" value="1.00" title="Grosor y amplitud horizontal del racimo">
              </div>
              <input type="range" class="hud-slider" id="slider-v3-width" min="0.20" max="3.50" step="0.05" value="1.00">
            </div>

            <!-- DISTRIBUCIÓN EN COLONIAS (GRUPOS MMO) -->
            <div style="border-top: 1px dashed rgba(56, 232, 166, 0.35); padding-top: 5px; margin-top: 5px;">
              <div style="font-size: 10px; color: #a8ffd9; font-weight: 600; margin-bottom: 4px;">🏝️ Distribución en Colonias (Grupos):</div>
              
              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Escala de Islas (Cluster):</span>
                  <input type="number" class="hud-num-input" id="num-v3-cluster-scale" min="0.010" max="0.300" step="0.005" value="0.150">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-cluster-scale" min="0.010" max="0.300" step="0.005" value="0.150">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Cobertura de Pradera (0-1):</span>
                  <input type="number" class="hud-num-input" id="num-v3-coverage" min="0.10" max="0.99" step="0.01" value="0.95">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-coverage" min="0.10" max="0.99" step="0.01" value="0.95">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Filtro Anti-Solitarios (Min):</span>
                  <input type="number" class="hud-num-input" id="num-v3-min-weight" min="0.05" max="0.65" step="0.01" value="0.28">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-min-weight" min="0.05" max="0.65" step="0.01" value="0.28">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Refuerzo Orillas Senderos:</span>
                  <input type="number" class="hud-num-input" id="num-v3-road-boost" min="0.00" max="1.00" step="0.05" value="0.25">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-road-boost" min="0.00" max="1.00" step="0.05" value="0.25">
              </div>

              <button id="btn-v3-regen-colonies" class="hud-btn" style="width: 100%; margin: 4px 0 6px 0; background: #1c6b52; border-color: #38e8a6; color: #a8ffd9; font-weight: 700;">
                🔄 REGENERAR COLONIAS V3
              </button>
            </div>

            <!-- SHADING GHIBLI & ILUMINACIÓN BOTW -->
            <div style="border-top: 1px dashed rgba(56, 232, 166, 0.35); padding-top: 5px; margin-top: 5px;">
              <div style="font-size: 10px; color: #a8ffd9; font-weight: 600; margin-bottom: 4px;">✨ Shading Ghibli & Resplandor Solar BotW:</div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Glow Contraluz Solar (BotW SSS):</span>
                  <input type="number" class="hud-num-input" id="num-v3-backlight" min="0.00" max="2.00" step="0.05" value="0.85">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-backlight" min="0.00" max="2.00" step="0.05" value="0.85">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Suavidad Half-Lambert (Ghibli):</span>
                  <input type="number" class="hud-num-input" id="num-v3-half-lambert" min="0.10" max="1.00" step="0.05" value="0.55">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-half-lambert" min="0.10" max="1.00" step="0.05" value="0.55">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Normales Unificadas (Normal Up):</span>
                  <input type="number" class="hud-num-input" id="num-v3-normal-up" min="0.00" max="1.00" step="0.05" value="0.78">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-normal-up" min="0.00" max="1.00" step="0.05" value="0.78">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Curva Gradiente Vertical:</span>
                  <input type="number" class="hud-num-input" id="num-v3-grad-curve" min="0.50" max="4.00" step="0.10" value="1.65">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-grad-curve" min="0.50" max="4.00" step="0.10" value="1.65">
              </div>
            </div>

            <!-- SUELO GOUACHE & VIENTO V3 -->
            <div style="border-top: 1px dashed rgba(56, 232, 166, 0.35); padding-top: 5px; margin-top: 5px;">
              <div style="font-size: 10px; color: #a8ffd9; font-weight: 600; margin-bottom: 4px;">🍃 Suelo Gouache & Viento V3:</div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Escala Textura Suelo Gouache:</span>
                  <input type="number" class="hud-num-input" id="num-v3-ground-scale" min="0.05" max="1.00" step="0.01" value="0.25">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-ground-scale" min="0.05" max="1.00" step="0.01" value="0.25">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Cobertura Parches Tierra:</span>
                  <input type="number" class="hud-num-input" id="num-v3-soil-coverage" min="0.00" max="0.95" step="0.01" value="0.84">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-soil-coverage" min="0.00" max="0.95" step="0.01" value="0.84">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Escala Parches Tierra:</span>
                  <input type="number" class="hud-num-input" id="num-v3-soil-scale" min="0.010" max="0.200" step="0.005" value="0.100">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-soil-scale" min="0.010" max="0.200" step="0.005" value="0.100">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Escala Textura Tierra:</span>
                  <input type="number" class="hud-num-input" id="num-v3-soil-tex-scale" min="0.05" max="1.00" step="0.01" value="0.15">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-soil-tex-scale" min="0.05" max="1.00" step="0.01" value="0.15">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Variación Macro Terreno:</span>
                  <input type="number" class="hud-num-input" id="num-v3-macro-noise-scale" min="0.005" max="0.080" step="0.002" value="0.045">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-macro-noise-scale" min="0.005" max="0.080" step="0.002" value="0.045">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Fuerza del Viento V3:</span>
                  <input type="number" class="hud-num-input" id="num-v3-wind-strength" min="0.00" max="1.50" step="0.02" value="0.30">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-wind-strength" min="0.00" max="1.50" step="0.02" value="0.30">
              </div>

              <div class="slider-box">
                <div class="slider-header" style="align-items: center;">
                  <span>Velocidad del Viento V3:</span>
                  <input type="number" class="hud-num-input" id="num-v3-wind-speed" min="0.10" max="3.00" step="0.10" value="1.25">
                </div>
                <input type="range" class="hud-slider" id="slider-v3-wind-speed" min="0.10" max="3.00" step="0.10" value="1.25">
              </div>
            </div>

            <!-- PALETA DE COLORES EDITABLE (COLOR PICKER + TEXTO HEX) -->
            <div style="border-top: 1px dashed rgba(56, 232, 166, 0.35); padding-top: 5px; margin-top: 5px;">
              <div style="font-size: 10px; color: #a8ffd9; font-weight: 600; margin-bottom: 6px;">🖌️ Colores de Texturas y Shaders:</div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Sombra Raíz:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-base" value="#183b1d">
                  <input type="text" class="hud-hex-input" id="text-v3-col-base" value="#183b1d" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Cuerpo Verde Medio:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-mid" value="#48962c">
                  <input type="text" class="hud-hex-input" id="text-v3-col-mid" value="#48962c" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Puntas Iluminadas:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-tip" value="#a2e742">
                  <input type="text" class="hud-hex-input" id="text-v3-col-tip" value="#a2e742" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Verde Soleado (Lomas):</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-sun" value="#5ea832">
                  <input type="text" class="hud-hex-input" id="text-v3-col-sun" value="#5ea832" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Verde Húmedo (Valles):</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-wet" value="#1a441e">
                  <input type="text" class="hud-hex-input" id="text-v3-col-wet" value="#1a441e" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Borde Seco Oliva:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-dry" value="#788d38">
                  <input type="text" class="hud-hex-input" id="text-v3-col-dry" value="#788d38" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Humus Oscuro (Tierra):</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-soil-h" value="#382413">
                  <input type="text" class="hud-hex-input" id="text-v3-col-soil-h" value="#382413" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Arcilla Cálida (Cuerpo):</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-soil-c" value="#7a522a">
                  <input type="text" class="hud-hex-input" id="text-v3-col-soil-c" value="#7a522a" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Arena Seca Calcárea:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-soil-d" value="#c2a26c">
                  <input type="text" class="hud-hex-input" id="text-v3-col-soil-d" value="#c2a26c" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Musgo Intermedio (Borde):</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-moss" value="#557329">
                  <input type="text" class="hud-hex-input" id="text-v3-col-moss" value="#557329" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Cresta de Viento:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-wind" value="#e0f866">
                  <input type="text" class="hud-hex-input" id="text-v3-col-wind" value="#e0f866" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Pradera en Claros:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-clearing" value="#5a9e3e">
                  <input type="text" class="hud-hex-input" id="text-v3-col-clearing" value="#5a9e3e" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Tierra Centro Camino:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-dirt-c" value="#d1a872">
                  <input type="text" class="hud-hex-input" id="text-v3-col-dirt-c" value="#d1a872" maxlength="7">
                </div>
              </div>

              <div class="hud-row" style="margin-bottom: 4px;">
                <span style="font-size: 10px; color: #cbd5e1;">Tierra Borde Camino:</span>
                <div class="hud-color-pickers">
                  <input type="color" class="hud-color-input" id="picker-v3-col-dirt-e" value="#9b7346">
                  <input type="text" class="hud-hex-input" id="text-v3-col-dirt-e" value="#9b7346" maxlength="7">
                </div>
              </div>
            </div>
          </div>
          
          <div class="slider-box">
            <div class="slider-header">
              <span>Altura del césped:</span>
              <span id="val-grass-height" style="color: #9fe2bf; font-family: monospace;">0.40x</span>
            </div>
            <input type="range" class="hud-slider" id="slider-grass-height" min="0.2" max="2.4" step="0.05" value="0.40">
          </div>

          <div class="slider-box">
            <div class="slider-header">
              <span>Fuerza del viento:</span>
              <span id="val-grass-wind-strength" style="color: #9fe2bf; font-family: monospace;">0.10</span>
            </div>
            <input type="range" class="hud-slider" id="slider-grass-wind-strength" min="0.0" max="1.0" step="0.02" value="0.10">
          </div>

          <div class="slider-box">
            <div class="slider-header">
              <span>Brillo solar en crestas:</span>
              <span id="val-grass-crest" style="color: #9fe2bf; font-family: monospace;">0.35</span>
            </div>
            <input type="range" class="hud-slider" id="slider-grass-crest" min="0.0" max="1.0" step="0.05" value="0.35">
          </div>

          <div class="slider-box">
            <div class="slider-header">
              <span>Escala de flores 3D:</span>
              <span id="val-flower-scale" style="color: #ffb7b2; font-family: monospace;">2.50x</span>
            </div>
            <input type="range" class="hud-slider" id="slider-flower-scale" min="0.3" max="3.5" step="0.05" value="2.50">
          </div>

          <div class="btn-group">
            <button class="hud-btn" id="btn-toggle-perlin-wind">Viento Perlin: OFF</button>
            <button class="hud-btn active" id="btn-toggle-flowers">Flores 3D: ON</button>
          </div>

          <!-- Tonalidad y Densidad -->
          <div class="hud-label">Tonalidad Césped:</div>
          <div class="btn-group" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
            <button class="hud-btn active" id="btn-col-genshin">🍃 Genshin</button>
            <button class="hud-btn" id="btn-col-autumn">🌾 Otoño</button>
            <button class="hud-btn" id="btn-col-mystic">🔮 Místico</button>
            <button class="hud-btn" id="btn-col-spring">🌸 Trébol</button>
          </div>

          <!-- 5. AGUA & CRIATURAS -->
          <div class="hud-label" style="color: #56d6db;">💧 Agua & Criaturas:</div>
          
          <div class="slider-box">
            <div class="slider-header">
              <span>Espuma de contacto río:</span>
              <span id="val-water-foam" style="color: #56d6db; font-family: monospace;">110%</span>
            </div>
            <input type="range" class="hud-slider" id="slider-water-foam" min="0.0" max="2.0" step="0.05" value="1.10">
          </div>

          <div class="slider-box">
            <div class="slider-header">
              <span>Resplandor Gelatina Slimes:</span>
              <span id="val-slime-glow" style="color: #6edbf5; font-family: monospace;">65%</span>
            </div>
            <input type="range" class="hud-slider" id="slider-slime-glow" min="0.0" max="1.5" step="0.05" value="0.65">
          </div>

          <div class="btn-group">
            <button class="hud-btn active" id="btn-toggle-toon-spec">Destello Toon: ON</button>
            <button class="hud-btn active" id="btn-toggle-slimes">Slimes: ON</button>
          </div>

          <!-- Modo de Cámara & Iluminación -->
          <div class="hud-label">Cámara & Hora del Día:</div>
          <div class="btn-group">
            <button class="hud-btn active" id="btn-cam-tp">Tercera Persona (C)</button>
            <button class="hud-btn" id="btn-cam-free">Modo Elevado (C)</button>
          </div>
          <div class="btn-group" style="grid-template-columns: 1fr 1fr 1fr;">
            <button class="hud-btn active" id="btn-preset-sunset">Atardecer</button>
            <button class="hud-btn" id="btn-preset-daylight">Mediodía</button>
            <button class="hud-btn" id="btn-preset-morning">Mañana</button>
          </div>

          <!-- Teleport a Zonas -->
          <div class="hud-label">Teletransporte Rápido:</div>
          <div class="teleport-grid">
            <button class="teleport-btn" data-tp="-90,-30">🌱 Pradera</button>
            <button class="teleport-btn" data-tp="-65,100">🌲 Bosque</button>
            <button class="teleport-btn" data-tp="22,20">🌉 Puente / Río</button>
            <button class="teleport-btn" data-tp="105,-65">⛰️ Mirador</button>
            <button class="teleport-btn" data-tp="125,85">🪨 Riscos</button>
            <button class="teleport-btn" data-tp="-8,-25">✨ Árbol Vital</button>
            <button class="teleport-btn" data-tp="115,65">🏛️ Santuario</button>
            <button class="teleport-btn" data-tp="-87.9,74.0">⛩️ Templo Dojō</button>
            <button class="teleport-btn" data-tp="-90.3,63.3">🥋 M. Paladill</button>
            <button class="teleport-btn" data-tp="0,2">🏁 Inicio</button>
            <button class="teleport-btn" data-tp="8,15">💧 Hydro Slimes</button>
            <button class="teleport-btn" data-tp="-65,-35">🌿 Dendro Slimes</button>
          </div>

          <div class="controls-hint">
            <strong>Teclas:</strong> WASD: Moverse · <strong>C</strong>: Alternar Cámara Tercera Persona / Elevada · <strong>H</strong>: Ocultar / Mostrar este panel
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.cardBody = document.getElementById('hud-card-body');
    this.fabBtn = document.getElementById('btn-fab-open');
    this.zoneLabel = document.getElementById('hud-zone');
    this.coordsLabel = document.getElementById('hud-coords');
    this.fpsLabel = document.getElementById('hud-fps');

    this.bindButtons();
    this.syncAllSystems();
    this.updateUIElements();
    this.applyCollapseState();
    this.updatePosition();

    window.addEventListener('resize', () => this.updatePosition());

    // Hotkey [H] to toggle panel visibility
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      // [H] desactivado (20-oct): el panel «Evaluador & Comparador» es una herramienta de desarrollo.
      // Para abrirlo desde la consola: window.game?.overworldManager?.demoScenaDebugUI?.toggleCollapse()
      if (e.code === 'KeyC') {
        if (this.cameraController && typeof this.cameraController.toggleMode === 'function') {
          this.cameraController.toggleMode();
          this.updateCameraButtons();
        }
      }
    });
  }

  updatePosition() {
    if (!this.container) return;
    const tutBanner = document.getElementById('overworld-tutorial-banner');
    if (tutBanner && !tutBanner.classList.contains('hidden') && tutBanner.offsetHeight > 0) {
      const rect = tutBanner.getBoundingClientRect();
      const topPos = Math.max(122, Math.round(rect.bottom + 8));
      this.container.style.top = `${topPos}px`;
      if (this.cardBody) {
        this.cardBody.style.maxHeight = `calc(100vh - ${topPos + 18}px)`;
      }
    } else {
      this.container.style.top = '18px';
      if (this.cardBody) {
        this.cardBody.style.maxHeight = '92vh';
      }
    }
  }

  applyCollapseState() {
    if (this.isCollapsed) {
      if (this.cardBody) this.cardBody.style.display = 'none';
      if (this.fabBtn) this.fabBtn.style.display = 'none';
    } else {
      if (this.cardBody) this.cardBody.style.display = 'block';
      if (this.fabBtn) this.fabBtn.style.display = 'none';
      this.updatePosition();
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.applyCollapseState();
  }

  applyGrassV3Mode() {
    if (this.vegetationManager && typeof this.vegetationManager.setGrassType === 'function') {
      this.vegetationManager.setGrassType('stylized_v3');
      if (typeof this.vegetationManager.applyV3Preset === 'function') {
        this.vegetationManager.applyV3Preset('botw');
      }
    }
    this.state.bloom = true;
    this.state.bloomStrength = 0.80;
    this.state.rimLight = false;
    this.state.rimStrength = 0.0;
    this.state.paths = 0.20;
    this.state.grassHeight = 0.40;
    this.state.windStrength = 0.48;
    this.state.perlinWind = true;
    this.state.crestGlow = 0.45;
    this.state.flowers = true;
    this.state.flowerScale = 2.50;
    this.state.waterFoam = 1.10;
    this.state.toonSpec = true;
    this.state.slimes = true;
    this.state.slimeGlow = 0.65;

    this.syncAllSystems();
    this.updateUIElements();
  }

  applyGenshinMode() {
    if (this.vegetationManager && typeof this.vegetationManager.setGrassType === 'function') {
      this.vegetationManager.setGrassType('genshin');
    }
    this.state.bloom = true;
    this.state.bloomStrength = 0.80;
    this.state.rimLight = false;
    this.state.rimStrength = 0.0;
    this.state.paths = 0.20;
    this.state.grassHeight = 0.40;
    this.state.windStrength = 0.10;
    this.state.perlinWind = true;
    this.state.crestGlow = 0.35;
    this.state.flowers = true;
    this.state.flowerScale = 2.50;
    this.state.waterFoam = 1.10;
    this.state.toonSpec = true;
    this.state.slimes = true;
    this.state.slimeGlow = 0.65;

    this.syncAllSystems();
    this.updateUIElements();
  }

  applyClassicMode() {
    this.state.bloom = false;
    this.state.bloomStrength = 0.0;
    this.state.rimLight = false;
    this.state.rimStrength = 0.0;
    this.state.paths = 0.0; // Oculta los senderos de tierra pintados
    this.state.grassHeight = 0.40;
    this.state.windStrength = 0.10;
    this.state.perlinWind = false; // Viento uniforme simple previo
    this.state.crestGlow = 0.0; // Sin cresta brillante
    this.state.flowers = false; // Sin flores 3D
    this.state.flowerScale = 1.0;
    this.state.waterFoam = 0.15; // Espuma mínima clásica
    this.state.toonSpec = false; // Sin destello toon
    this.state.slimes = false; // Sin slimes
    this.state.slimeGlow = 0.20;

    this.syncAllSystems();
    this.updateUIElements();
  }

  syncAllSystems() {
    // 1. Post-proceso Bloom
    if (this.environmentSystem) {
      if (typeof this.environmentSystem.setBloomEnabled === 'function') {
        this.environmentSystem.setBloomEnabled(this.state.bloom);
      }
      if (typeof this.environmentSystem.setBloomStrength === 'function') {
        this.environmentSystem.setBloomStrength(this.state.bloomStrength);
      }
    }

    // 2. Senderos de tierra
    if (this.terrain && typeof this.terrain.setPathIntensity === 'function') {
      this.terrain.setPathIntensity(this.state.paths);
    }

    // 3. Césped, viento y flores
    if (this.vegetationManager) {
      if (typeof this.vegetationManager.setGlobalWindWave === 'function') {
        this.vegetationManager.setGlobalWindWave(this.state.perlinWind);
      }
      if (this.vegetationManager.grassType === 'genshin') {
        if (typeof this.vegetationManager.setWindStrength === 'function') {
          this.vegetationManager.setWindStrength(this.state.windStrength);
        }
        if (typeof this.vegetationManager.setHeight === 'function') {
          this.vegetationManager.setHeight(this.state.grassHeight);
        }
      } else if (this.vegetationManager.grassType === 'stylized_v3') {
        if (typeof this.vegetationManager.setV3Params === 'function') {
          this.vegetationManager.setV3Params({
            height: this.state.v3Height,
            width: this.state.v3Width,
            windStrength: this.state.v3WindStrength
          });
        }
      }
      if (typeof this.vegetationManager.setFlowerScale === 'function') {
        this.vegetationManager.setFlowerScale(this.state.flowerScale);
      }
    }

    // 4. Agua
    if (this.waterManager) {
      if (typeof this.waterManager.setFoamIntensity === 'function') {
        this.waterManager.setFoamIntensity(this.state.waterFoam);
      }
      if (typeof this.waterManager.setToonSpecEnabled === 'function') {
        this.waterManager.setToonSpecEnabled(this.state.toonSpec);
      }
    }

    // 5. Slimes
    if (this.slimeCreaturesManager) {
      if (typeof this.slimeCreaturesManager.setEnabled === 'function') {
        this.slimeCreaturesManager.setEnabled(this.state.slimes);
      }
      if (typeof this.slimeCreaturesManager.setGlowIntensity === 'function') {
        this.slimeCreaturesManager.setGlowIntensity(this.state.slimeGlow);
      }
    }
  }

  updateUIElements() {
    const sBloom = document.getElementById('slider-bloom-strength');
    const vBloom = document.getElementById('val-bloom-strength');
    if (sBloom) sBloom.value = this.state.bloomStrength;
    if (vBloom) vBloom.textContent = this.state.bloomStrength.toFixed(2);

    const sRim = document.getElementById('slider-rim-strength');
    const vRim = document.getElementById('val-rim-strength');
    if (sRim) sRim.value = this.state.rimStrength;
    if (vRim) vRim.textContent = this.state.rimStrength.toFixed(2);

    const sPath = document.getElementById('slider-path-intensity');
    const vPath = document.getElementById('val-path-intensity');
    if (sPath) sPath.value = this.state.paths;
    if (vPath) vPath.textContent = `${Math.round(this.state.paths * 100)}%`;

    const sGrassHeight = document.getElementById('slider-grass-height');
    const vGrassHeight = document.getElementById('val-grass-height');
    if (sGrassHeight) sGrassHeight.value = this.state.grassHeight;
    if (vGrassHeight) vGrassHeight.textContent = `${this.state.grassHeight.toFixed(2)}x`;

    const sWind = document.getElementById('slider-grass-wind-strength');
    const vWind = document.getElementById('val-grass-wind-strength');
    if (sWind) sWind.value = this.state.windStrength;
    if (vWind) vWind.textContent = this.state.windStrength.toFixed(2);

    const sCrest = document.getElementById('slider-grass-crest');
    const vCrest = document.getElementById('val-grass-crest');
    if (sCrest) sCrest.value = this.state.crestGlow;
    if (vCrest) vCrest.textContent = this.state.crestGlow.toFixed(2);

    const sFlowerScale = document.getElementById('slider-flower-scale');
    const vFlowerScale = document.getElementById('val-flower-scale');
    if (sFlowerScale) sFlowerScale.value = this.state.flowerScale;
    if (vFlowerScale) vFlowerScale.textContent = `${this.state.flowerScale.toFixed(2)}x`;

    const sFoam = document.getElementById('slider-water-foam');
    const vFoam = document.getElementById('val-water-foam');
    if (sFoam) sFoam.value = this.state.waterFoam;
    if (vFoam) vFoam.textContent = `${Math.round(this.state.waterFoam * 100)}%`;

    const sSlime = document.getElementById('slider-slime-glow');
    const vSlime = document.getElementById('val-slime-glow');
    if (sSlime) sSlime.value = this.state.slimeGlow;
    if (vSlime) vSlime.textContent = `${Math.round(this.state.slimeGlow * 100)}%`;

    const btnBloom = document.getElementById('btn-toggle-bloom');
    if (btnBloom) {
      btnBloom.textContent = `Bloom: ${this.state.bloom ? 'ON' : 'OFF'}`;
      btnBloom.classList.toggle('active', this.state.bloom);
    }

    const btnRim = document.getElementById('btn-toggle-rim');
    if (btnRim) {
      btnRim.textContent = `Rim Light: ${this.state.rimLight ? 'ON' : 'OFF'}`;
      btnRim.classList.toggle('active', this.state.rimLight);
    }

    const btnPWind = document.getElementById('btn-toggle-perlin-wind');
    if (btnPWind) {
      btnPWind.textContent = `Viento Perlin: ${this.state.perlinWind ? 'ON' : 'OFF'}`;
      btnPWind.classList.toggle('active', this.state.perlinWind);
    }

    const btnFlowers = document.getElementById('btn-toggle-flowers');
    if (btnFlowers) {
      btnFlowers.textContent = `Flores 3D: ${this.state.flowers ? 'ON' : 'OFF'}`;
      btnFlowers.classList.toggle('active', this.state.flowers);
    }

    const btnSpec = document.getElementById('btn-toggle-toon-spec');
    if (btnSpec) {
      btnSpec.textContent = `Destello Toon: ${this.state.toonSpec ? 'ON' : 'OFF'}`;
      btnSpec.classList.toggle('active', this.state.toonSpec);
    }

    const btnSlimes = document.getElementById('btn-toggle-slimes');
    if (btnSlimes) {
      btnSlimes.textContent = `Slimes: ${this.state.slimes ? 'ON' : 'OFF'}`;
      btnSlimes.classList.toggle('active', this.state.slimes);
    }
  }

  updateCameraButtons() {
    const btnCamTP = document.getElementById('btn-cam-tp');
    const btnCamFree = document.getElementById('btn-cam-free');
    if (btnCamTP && btnCamFree && this.cameraController) {
      const isTP = (this.cameraController.mode === 'third_person');
      btnCamTP.classList.toggle('active', isTP);
      btnCamFree.classList.toggle('active', !isTP);
    }
  }

  bindButtons() {
    // Botón flotante [+] para abrir
    if (this.fabBtn) {
      this.fabBtn.addEventListener('click', () => this.toggleCollapse());
    }

    // Minimizar / Cerrar panel botón [✕]
    const btnMin = document.getElementById('btn-minimize-hud');
    if (btnMin) {
      btnMin.addEventListener('click', () => this.toggleCollapse());
    }

    // 1. Comparador Rápido V3 / Genshin / Clásico
    const btnV3Mode = document.getElementById('btn-mode-v3');
    const btnGenshinMode = document.getElementById('btn-mode-genshin');
    const btnClassicMode = document.getElementById('btn-mode-classic');

    const updateModeBtns = (activeBtn) => {
      [btnV3Mode, btnGenshinMode, btnClassicMode].forEach((b) => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnV3Mode) {
      btnV3Mode.addEventListener('click', () => {
        this.applyGrassV3Mode();
        updateModeBtns(btnV3Mode);
      });
    }

    if (btnGenshinMode) {
      btnGenshinMode.addEventListener('click', () => {
        this.applyGenshinMode();
        updateModeBtns(btnGenshinMode);
      });
    }

    if (btnClassicMode) {
      btnClassicMode.addEventListener('click', () => {
        this.applyClassicMode();
        updateModeBtns(btnClassicMode);
      });
    }

    // 2. Post-proceso Bloom
    const sBloom = document.getElementById('slider-bloom-strength');
    const valBloom = document.getElementById('val-bloom-strength');
    if (sBloom && valBloom) {
      sBloom.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.bloomStrength = val;
        this.state.bloom = val > 0.01;
        if (this.environmentSystem) {
          if (typeof this.environmentSystem.setBloomStrength === 'function') {
            this.environmentSystem.setBloomStrength(val);
          }
          if (typeof this.environmentSystem.setBloomEnabled === 'function') {
            this.environmentSystem.setBloomEnabled(this.state.bloom);
          }
        }
        valBloom.textContent = val.toFixed(2);
      });
    }

    const btnBloom = document.getElementById('btn-toggle-bloom');
    if (btnBloom) {
      btnBloom.addEventListener('click', () => {
        this.state.bloom = !this.state.bloom;
        if (this.environmentSystem && typeof this.environmentSystem.setBloomEnabled === 'function') {
          this.environmentSystem.setBloomEnabled(this.state.bloom);
        }
        btnBloom.textContent = `Bloom: ${this.state.bloom ? 'ON' : 'OFF'}`;
        btnBloom.classList.toggle('active', this.state.bloom);
      });
    }

    // 3. Rim Light
    const sRim = document.getElementById('slider-rim-strength');
    const valRim = document.getElementById('val-rim-strength');
    if (sRim && valRim) {
      sRim.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.rimStrength = val;
        this.state.rimLight = val > 0.01;
        valRim.textContent = val.toFixed(2);
      });
    }

    const btnRim = document.getElementById('btn-toggle-rim');
    if (btnRim) {
      btnRim.addEventListener('click', () => {
        this.state.rimLight = !this.state.rimLight;
        btnRim.textContent = `Rim Light: ${this.state.rimLight ? 'ON' : 'OFF'}`;
        btnRim.classList.toggle('active', this.state.rimLight);
      });
    }

    // 4. Senderos de tierra
    const sPath = document.getElementById('slider-path-intensity');
    const valPath = document.getElementById('val-path-intensity');
    if (sPath && valPath) {
      sPath.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.paths = val;
        if (this.terrain && typeof this.terrain.setPathIntensity === 'function') {
          this.terrain.setPathIntensity(val);
        }
        valPath.textContent = `${Math.round(val * 100)}%`;
      });
    }

    // 5. Césped & Viento
    const sHeight = document.getElementById('slider-grass-height');
    const valHeight = document.getElementById('val-grass-height');
    if (sHeight && valHeight) {
      sHeight.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.grassHeight = val;
        if (this.vegetationManager && typeof this.vegetationManager.setHeight === 'function') {
          this.vegetationManager.setHeight(val);
        }
        valHeight.textContent = `${val.toFixed(2)}x`;
      });
    }

    const sWind = document.getElementById('slider-grass-wind-strength');
    const valWind = document.getElementById('val-grass-wind-strength');
    if (sWind && valWind) {
      sWind.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.windStrength = val;
        if (this.vegetationManager && typeof this.vegetationManager.setWindStrength === 'function') {
          this.vegetationManager.setWindStrength(val);
        }
        valWind.textContent = val.toFixed(2);
      });
    }

    const sCrest = document.getElementById('slider-grass-crest');
    const valCrest = document.getElementById('val-grass-crest');
    if (sCrest && valCrest) {
      sCrest.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.crestGlow = val;
        if (this.vegetationManager && typeof this.vegetationManager.setCrestIntensity === 'function') {
          this.vegetationManager.setCrestIntensity(val);
        }
        valCrest.textContent = val.toFixed(2);
      });
    }

    const btnPWind = document.getElementById('btn-toggle-perlin-wind');
    if (btnPWind) {
      btnPWind.addEventListener('click', () => {
        this.state.perlinWind = !this.state.perlinWind;
        if (this.vegetationManager && typeof this.vegetationManager.setGlobalWindWave === 'function') {
          this.vegetationManager.setGlobalWindWave(this.state.perlinWind);
        }
        btnPWind.textContent = `Viento Perlin: ${this.state.perlinWind ? 'ON' : 'OFF'}`;
        btnPWind.classList.toggle('active', this.state.perlinWind);
      });
    }

    const btnFlowers = document.getElementById('btn-toggle-flowers');
    if (btnFlowers) {
      btnFlowers.addEventListener('click', () => {
        this.state.flowers = !this.state.flowers;
        if (this.vegetationManager && typeof this.vegetationManager.setFlowersEnabled === 'function') {
          this.vegetationManager.setFlowersEnabled(this.state.flowers);
        }
        btnFlowers.textContent = `Flores 3D: ${this.state.flowers ? 'ON' : 'OFF'}`;
        btnFlowers.classList.toggle('active', this.state.flowers);
      });
    }

    const sFlowerScale = document.getElementById('slider-flower-scale');
    const valFlowerScale = document.getElementById('val-flower-scale');
    if (sFlowerScale && valFlowerScale) {
      sFlowerScale.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.flowerScale = val;
        if (this.vegetationManager && typeof this.vegetationManager.setFlowerScale === 'function') {
          this.vegetationManager.setFlowerScale(val);
        }
        valFlowerScale.textContent = `${val.toFixed(2)}x`;
      });
    }

    // 6. Agua
    const sFoam = document.getElementById('slider-water-foam');
    const valFoam = document.getElementById('val-water-foam');
    if (sFoam && valFoam) {
      sFoam.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.waterFoam = val;
        if (this.waterManager && typeof this.waterManager.setFoamIntensity === 'function') {
          this.waterManager.setFoamIntensity(val);
        }
        valFoam.textContent = `${Math.round(val * 100)}%`;
      });
    }

    const btnSpec = document.getElementById('btn-toggle-toon-spec');
    if (btnSpec) {
      btnSpec.addEventListener('click', () => {
        this.state.toonSpec = !this.state.toonSpec;
        if (this.waterManager && typeof this.waterManager.setToonSpecEnabled === 'function') {
          this.waterManager.setToonSpecEnabled(this.state.toonSpec);
        }
        btnSpec.textContent = `Destello Toon: ${this.state.toonSpec ? 'ON' : 'OFF'}`;
        btnSpec.classList.toggle('active', this.state.toonSpec);
      });
    }

    // 7. Slimes
    const btnSlimes = document.getElementById('btn-toggle-slimes');
    if (btnSlimes) {
      btnSlimes.addEventListener('click', () => {
        this.state.slimes = !this.state.slimes;
        if (this.slimeCreaturesManager && typeof this.slimeCreaturesManager.setEnabled === 'function') {
          this.slimeCreaturesManager.setEnabled(this.state.slimes);
        }
        btnSlimes.textContent = `Slimes: ${this.state.slimes ? 'ON' : 'OFF'}`;
        btnSlimes.classList.toggle('active', this.state.slimes);
      });
    }

    const sSlime = document.getElementById('slider-slime-glow');
    const valSlime = document.getElementById('val-slime-glow');
    if (sSlime && valSlime) {
      sSlime.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.state.slimeGlow = val;
        if (this.slimeCreaturesManager && typeof this.slimeCreaturesManager.setGlowIntensity === 'function') {
          this.slimeCreaturesManager.setGlowIntensity(val);
        }
        valSlime.textContent = `${Math.round(val * 100)}%`;
      });
    }

    // 8. Paletas de Césped
    const btnGenshin = document.getElementById('btn-col-genshin');
    const btnAutumn = document.getElementById('btn-col-autumn');
    const btnMystic = document.getElementById('btn-col-mystic');
    const btnSpring = document.getElementById('btn-col-spring');

    const updateColorBtns = (activeBtn) => {
      [btnGenshin, btnAutumn, btnMystic, btnSpring].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    if (btnGenshin) {
      btnGenshin.addEventListener('click', () => {
        if (this.vegetationManager) {
          this.vegetationManager.setColorPreset('genshin');
          if (this.vegetationManager.applyV3Preset) this.vegetationManager.applyV3Preset('mondstadt');
        }
        updateColorBtns(btnGenshin);
      });
    }
    if (btnAutumn) {
      btnAutumn.addEventListener('click', () => {
        if (this.vegetationManager) {
          this.vegetationManager.setColorPreset('autumn');
          if (this.vegetationManager.applyV3Preset) this.vegetationManager.applyV3Preset('autumn');
        }
        updateColorBtns(btnAutumn);
      });
    }
    if (btnMystic) {
      btnMystic.addEventListener('click', () => {
        if (this.vegetationManager) {
          this.vegetationManager.setColorPreset('mystic');
          if (this.vegetationManager.applyV3Preset) this.vegetationManager.applyV3Preset('mystic');
        }
        updateColorBtns(btnMystic);
      });
    }
    if (btnSpring) {
      btnSpring.addEventListener('click', () => {
        if (this.vegetationManager) {
          this.vegetationManager.setColorPreset('spring');
          if (this.vegetationManager.applyV3Preset) this.vegetationManager.applyV3Preset('sakura');
        }
        updateColorBtns(btnSpring);
      });
    }
    // =========================================================================
    // 8b. CÉSPED ESTILIZADO V3 - BINDINGS NUMÉRICOS DIRECTOS Y SLIDERS
    // =========================================================================
    const ensureV3Active = () => {
      if (this.vegetationManager && typeof this.vegetationManager.setGrassType === 'function') {
        if (this.vegetationManager.grassType !== 'stylized_v3') {
          this.vegetationManager.setGrassType('stylized_v3');
          const btnV3 = document.getElementById('btn-mode-v3');
          const btnG = document.getElementById('btn-mode-genshin');
          const btnC = document.getElementById('btn-mode-classic');
          [btnV3, btnG, btnC].forEach(b => b?.classList.remove('active'));
          btnV3?.classList.add('active');
        }
      }
    };

    const bindNumSlider = (numId, sliderId, onVal, parseFn = parseFloat) => {
      const numEl = document.getElementById(numId);
      const sliderEl = document.getElementById(sliderId);
      if (!numEl || !sliderEl) return;

      const updateVal = (val, fromSlider) => {
        if (fromSlider) {
          numEl.value = val;
        } else {
          sliderEl.value = val;
        }
        ensureV3Active();
        onVal(val);
      };

      sliderEl.addEventListener('input', (e) => {
        const val = parseFn(e.target.value);
        updateVal(val, true);
      });

      numEl.addEventListener('input', (e) => {
        const val = parseFn(e.target.value);
        if (!isNaN(val)) {
          updateVal(val, false);
        }
      });
      numEl.addEventListener('change', (e) => {
        const val = parseFn(e.target.value);
        if (!isNaN(val)) {
          updateVal(val, false);
        }
      });
    };

    // 1. Densidad / Instancias 3D V3 (Direct numeric input + slider + pills)
    const numV3Count = document.getElementById('num-v3-count');
    const sliderV3Count = document.getElementById('slider-v3-count');
    const pillV3Counts = document.querySelectorAll('.hud-pill-btn[data-v3count]');

    const setV3Count = (count) => {
      const num = parseInt(count, 10);
      if (isNaN(num) || num <= 0) return;
      if (numV3Count) numV3Count.value = num;
      if (sliderV3Count) sliderV3Count.value = num;
      ensureV3Active();
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ count: num });
      }
      pillV3Counts.forEach(p => {
        p.classList.toggle('active', parseInt(p.dataset.v3count, 10) === num);
      });
    };

    bindNumSlider('num-v3-count', 'slider-v3-count', (val) => setV3Count(val), parseInt);

    pillV3Counts.forEach(btn => {
      btn.addEventListener('click', () => {
        const c = parseInt(btn.dataset.v3count, 10);
        setV3Count(c);
      });
    });

    // 2. Altura y Grosor Mata V3
    bindNumSlider('num-v3-height', 'slider-v3-height', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ height: val });
      }
    });

    bindNumSlider('num-v3-width', 'slider-v3-width', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ width: val });
      }
    });

    // 3. Distribución Colonias V3 (Escala, Cobertura, Anti-Solitarios, Orillas con Auto-Regeneración)
    let regenDebounceTimer = null;
    const triggerDebouncedRegen = () => {
      clearTimeout(regenDebounceTimer);
      regenDebounceTimer = setTimeout(() => {
        const btn = document.getElementById('btn-v3-regen-colonies');
        if (btn) btn.click();
      }, 350);
    };

    bindNumSlider('num-v3-cluster-scale', 'slider-v3-cluster-scale', () => triggerDebouncedRegen());
    bindNumSlider('num-v3-coverage', 'slider-v3-coverage', () => triggerDebouncedRegen());
    bindNumSlider('num-v3-min-weight', 'slider-v3-min-weight', () => triggerDebouncedRegen());
    bindNumSlider('num-v3-road-boost', 'slider-v3-road-boost', () => triggerDebouncedRegen());

    // Botón Regenerar Colonias V3
    const btnRegenV3 = document.getElementById('btn-v3-regen-colonies');
    if (btnRegenV3) {
      btnRegenV3.addEventListener('click', () => {
        ensureV3Active();
        const cScale = parseFloat(document.getElementById('num-v3-cluster-scale')?.value || 0.15);
        const cov = parseFloat(document.getElementById('num-v3-coverage')?.value || 0.95);
        const minW = parseFloat(document.getElementById('num-v3-min-weight')?.value || 0.28);
        const rBoost = parseFloat(document.getElementById('num-v3-road-boost')?.value || 0.25);
        const cnt = parseInt(document.getElementById('num-v3-count')?.value || 50000, 10);

        btnRegenV3.textContent = '⏳ REGENERANDO...';
        btnRegenV3.style.background = '#0e4231';

        setTimeout(() => {
          if (this.vegetationManager && this.vegetationManager.rebuildV3Colonies) {
            const actualCount = this.vegetationManager.rebuildV3Colonies({
              clusterScale: cScale,
              islandCoverage: cov,
              minClusterWeight: minW,
              roadsideBoostFactor: rBoost,
              targetCount: cnt
            });
            if (numV3Count && actualCount) numV3Count.value = actualCount;
            if (sliderV3Count && actualCount) sliderV3Count.value = actualCount;
          }
          btnRegenV3.textContent = '✓ COLONIAS ACTUALIZADAS!';
          btnRegenV3.style.background = '#25a17a';
          setTimeout(() => {
            btnRegenV3.textContent = '🔄 REGENERAR COLONIAS V3';
            btnRegenV3.style.background = '#1c6b52';
          }, 1500);
        }, 30);
      });
    }

    // 4. Shading Ghibli & Resplandor Solar BotW
    bindNumSlider('num-v3-backlight', 'slider-v3-backlight', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ backlightStrength: val });
      }
    });

    bindNumSlider('num-v3-half-lambert', 'slider-v3-half-lambert', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ halfLambertBias: val });
      }
    });

    bindNumSlider('num-v3-normal-up', 'slider-v3-normal-up', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ normalUpBlend: val });
      }
    });

    bindNumSlider('num-v3-grad-curve', 'slider-v3-grad-curve', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ gradientCurve: val });
      }
    });

    // 5. Suelo Gouache & Viento V3
    bindNumSlider('num-v3-ground-scale', 'slider-v3-ground-scale', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ groundTexScale: val });
      }
    });

    bindNumSlider('num-v3-soil-coverage', 'slider-v3-soil-coverage', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ soilPatchCoverage: val });
      }
    });

    bindNumSlider('num-v3-soil-scale', 'slider-v3-soil-scale', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ soilPatchScale: val });
      }
    });

    bindNumSlider('num-v3-soil-tex-scale', 'slider-v3-soil-tex-scale', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ soilTexScale: val });
      }
    });

    bindNumSlider('num-v3-macro-noise-scale', 'slider-v3-macro-noise-scale', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ macroNoiseScale: val });
      }
    });

    bindNumSlider('num-v3-wind-strength', 'slider-v3-wind-strength', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ windStrength: val });
      }
    });

    bindNumSlider('num-v3-wind-speed', 'slider-v3-wind-speed', (val) => {
      if (this.vegetationManager && this.vegetationManager.setV3Params) {
        this.vegetationManager.setV3Params({ windSpeed: val });
      }
    });

    // 6. Colores sincronizados (Color picker + Hex text)
    const colorFields = [
      { key: 'baseColor', picker: 'picker-v3-col-base', text: 'text-v3-col-base' },
      { key: 'midColor', picker: 'picker-v3-col-mid', text: 'text-v3-col-mid' },
      { key: 'tipColor', picker: 'picker-v3-col-tip', text: 'text-v3-col-tip' },
      { key: 'sunGrassColor', picker: 'picker-v3-col-sun', text: 'text-v3-col-sun' },
      { key: 'wetGrassColor', picker: 'picker-v3-col-wet', text: 'text-v3-col-wet' },
      { key: 'dryGrassColor', picker: 'picker-v3-col-dry', text: 'text-v3-col-dry' },
      { key: 'mossColor', picker: 'picker-v3-col-moss', text: 'text-v3-col-moss' },
      { key: 'soilHumusColor', picker: 'picker-v3-col-soil-h', text: 'text-v3-col-soil-h' },
      { key: 'soilClayColor', picker: 'picker-v3-col-soil-c', text: 'text-v3-col-soil-c' },
      { key: 'soilDryColor', picker: 'picker-v3-col-soil-d', text: 'text-v3-col-soil-d' },
      { key: 'windHighlightColor', picker: 'picker-v3-col-wind', text: 'text-v3-col-wind' },
      { key: 'clearingColor', picker: 'picker-v3-col-clearing', text: 'text-v3-col-clearing' },
      { key: 'dirtCenterColor', picker: 'picker-v3-col-dirt-c', text: 'text-v3-col-dirt-c' },
      { key: 'dirtEdgeColor', picker: 'picker-v3-col-dirt-e', text: 'text-v3-col-dirt-e' },
    ];

    colorFields.forEach(cf => {
      const pEl = document.getElementById(cf.picker);
      const tEl = document.getElementById(cf.text);
      if (!pEl || !tEl) return;

      const applyColor = (hex) => {
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          pEl.value = hex;
          tEl.value = hex;
          ensureV3Active();
          if (this.vegetationManager && this.vegetationManager.setV3Params) {
            this.vegetationManager.setV3Params({ [cf.key]: hex });
          }
        }
      };

      pEl.addEventListener('input', (e) => {
        tEl.value = e.target.value;
        applyColor(e.target.value);
      });

      tEl.addEventListener('input', (e) => {
        applyColor(e.target.value);
      });
      tEl.addEventListener('change', (e) => {
        applyColor(e.target.value);
      });
    });

    // 7. Presets Rápidos de Paleta V3
    const presetBtns = [
      { id: 'btn-v3-p-botw', name: 'botw' },
      { id: 'btn-v3-p-mondstadt', name: 'mondstadt' },
      { id: 'btn-v3-p-autumn', name: 'autumn' },
      { id: 'btn-v3-p-sakura', name: 'sakura' },
      { id: 'btn-v3-p-mystic', name: 'mystic' },
      { id: 'btn-v3-p-savannah', name: 'savannah' },
    ];

    const syncColorInputsFromManager = () => {
      if (!this.vegetationManager || !this.vegetationManager.v3GrassUniforms) return;
      const u = this.vegetationManager.v3GrassUniforms;
      const setHex = (pickerId, textId, color) => {
        const p = document.getElementById(pickerId);
        const t = document.getElementById(textId);
        if (p && t && color) {
          const hex = '#' + color.getHexString();
          p.value = hex;
          t.value = hex;
        }
      };
      setHex('picker-v3-col-base', 'text-v3-col-base', u.uBaseColor.value);
      setHex('picker-v3-col-mid', 'text-v3-col-mid', u.uMidColor.value);
      setHex('picker-v3-col-tip', 'text-v3-col-tip', u.uTipColor.value);
      setHex('picker-v3-col-sun', 'text-v3-col-sun', u.uSunGrassColor ? u.uSunGrassColor.value : null);
      setHex('picker-v3-col-wet', 'text-v3-col-wet', u.uWetGrassColor ? u.uWetGrassColor.value : null);
      setHex('picker-v3-col-dry', 'text-v3-col-dry', u.uDryGrassColor ? u.uDryGrassColor.value : null);
      setHex('picker-v3-col-moss', 'text-v3-col-moss', u.uMossColor ? u.uMossColor.value : null);
      setHex('picker-v3-col-soil-h', 'text-v3-col-soil-h', u.uSoilHumusColor ? u.uSoilHumusColor.value : null);
      setHex('picker-v3-col-soil-c', 'text-v3-col-soil-c', u.uSoilClayColor ? u.uSoilClayColor.value : null);
      setHex('picker-v3-col-soil-d', 'text-v3-col-soil-d', u.uSoilDryColor ? u.uSoilDryColor.value : null);
      setHex('picker-v3-col-wind', 'text-v3-col-wind', u.uWindHighlightColor.value);
      setHex('picker-v3-col-clearing', 'text-v3-col-clearing', u.uClearingGrassColor.value);
      setHex('picker-v3-col-dirt-c', 'text-v3-col-dirt-c', u.uDirtCenterColor.value);
      setHex('picker-v3-col-dirt-e', 'text-v3-col-dirt-e', u.uDirtEdgeColor.value);
    };

    presetBtns.forEach(pb => {
      const btn = document.getElementById(pb.id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        ensureV3Active();
        if (this.vegetationManager && this.vegetationManager.applyV3Preset) {
          this.vegetationManager.applyV3Preset(pb.name);
          syncColorInputsFromManager();
        }
        presetBtns.forEach(o => {
          const b = document.getElementById(o.id);
          if (b) b.classList.toggle('active', o.id === pb.id);
        });
      });
    });

    // 9. Presets de Iluminación
    const btnSunset = document.getElementById('btn-preset-sunset');
    const btnDaylight = document.getElementById('btn-preset-daylight');
    const btnMorning = document.getElementById('btn-preset-morning');

    const updatePresetButtons = (activeBtn) => {
      [btnSunset, btnDaylight, btnMorning].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    if (btnSunset) {
      btnSunset.addEventListener('click', () => {
        if (this.zone) this.zone.setLightingPreset('sunset');
        updatePresetButtons(btnSunset);
      });
    }
    if (btnDaylight) {
      btnDaylight.addEventListener('click', () => {
        if (this.zone) this.zone.setLightingPreset('daylight');
        updatePresetButtons(btnDaylight);
      });
    }
    if (btnMorning) {
      btnMorning.addEventListener('click', () => {
        if (this.zone) this.zone.setLightingPreset('morning');
        updatePresetButtons(btnMorning);
      });
    }

    // 10. Cámara
    const btnCamTP = document.getElementById('btn-cam-tp');
    const btnCamFree = document.getElementById('btn-cam-free');
    if (btnCamTP) {
      btnCamTP.addEventListener('click', () => {
        if (this.cameraController) this.cameraController.setMode('third_person');
        this.updateCameraButtons();
      });
    }
    if (btnCamFree) {
      btnCamFree.addEventListener('click', () => {
        if (this.cameraController) this.cameraController.setMode('isometric');
        this.updateCameraButtons();
      });
    }

    // 11. Teleports
    const tpButtons = document.querySelectorAll('.teleport-btn');
    tpButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const coords = btn.getAttribute('data-tp').split(',').map(Number);
        this.teleportTo(coords[0], coords[1]);
      });
    });
  }

  teleportTo(x, z) {
    if (this.om && this.om.player) {
      const h = (this.zone && typeof this.zone.getHeight === 'function') 
        ? this.zone.getHeight(x, z) 
        : 0;
      this.om.player.teleport(x, h + 0.1, z);
      if (this.cameraController) {
        this.cameraController.setFollowTarget(this.om.player, true);
      }
    }
  }

  getCurrentZone(x, z) {
    if (x > 75 && x < 155 && z > -125 && z < -20) {
      return 'Zona 4 - Colina Mirador';
    } else if (x > 85 && x < 165 && z > 40 && z < 145) {
      return 'Zona 5 - Formación Rocosa & Santuario';
    } else if (x > -145 && x < 5 && z > 35 && z < 165) {
      return 'Zona 2 - Bosque Antiguo & Dojo';
    } else if (Math.abs(x - (18 + Math.sin(z * 0.025) * 16)) < 16) {
      return 'Zona 3 - Río & Cascada';
    } else if (x > -145 && x < -10 && z > -110 && z < 45) {
      return 'Zona 1 - Pradera Verde';
    } else {
      return 'Valle Central';
    }
  }

  setVisible(visible) {
    this.visible = visible;
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  update() {
    if (!this.visible || !this.container) return;

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 500) {
      this.fpsCount = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
      if (this.fpsLabel) {
        this.fpsLabel.textContent = `${this.fpsCount} FPS`;
      }
      this.updatePosition();
    }

    if (this.om && this.om.player && this.om.player.position) {
      const pos = this.om.player.position;
      if (this.coordsLabel) {
        this.coordsLabel.textContent = `X: ${pos.x.toFixed(1)} Y: ${pos.y.toFixed(1)} Z: ${pos.z.toFixed(1)}`;
      }
      if (this.zoneLabel) {
        this.zoneLabel.textContent = this.getCurrentZone(pos.x, pos.z);
      }
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}
