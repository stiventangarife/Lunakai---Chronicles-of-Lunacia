// AxieMixerService.js - Service for Sky Mavis API queries and 3D Axie character assembly
import * as THREE from 'three';
import { createAxieMixer3D, formatAxiePartAssetId } from '@jaatster/threejs-axie-mixer3d-public';
import { portraitService } from '../tactics/CharacterPortraitService.js';
import { partStage } from '../tactics/data/VariantCards.js';
import { supabaseFetch, authService } from '../net/AuthService.js';
import { NET_CONFIG, isCloudConfigured } from '../net/config.js';

// Polyfill for Three.js r160 compatibility with Axie Mixer shaders
if (THREE.ShaderChunk && !THREE.ShaderChunk.morphinstance_vertex) {
  THREE.ShaderChunk.morphinstance_vertex = '';
}

// Las consultas al marketplace de Sky Mavis pasan por la función de servidor `axie-data` (19-oct):
// la API key vive en los secretos de Supabase, nunca en el código del juego.

class AxieMixerService {
  constructor() {
    this.mixerInstance = null;
    this.axieCache = new Map();
  }

  /**
   * Fetch Axie metadata and genes from Sky Mavis GraphQL API
   * @param {string} axieId - e.g. '10455'
   * @returns {Promise<Object>} Axie details (name, class, newGenes, image, parts)
   */
  async fetchAxieData(axieId) {
    if (this.axieCache.has(axieId)) {
      return this.axieCache.get(axieId);
    }

    try {
      if (!isCloudConfigured()) throw new Error('servidor de Axies no configurado');
      const res = await supabaseFetch(NET_CONFIG.functions.axieData, { method: 'POST', body: { op: 'axie', id: String(axieId) } });
      const data = res?.axie;
      if (!data) {
        throw new Error(`Axie #${axieId} not found`);
      }

      this.axieCache.set(axieId, data);
      return data;
    } catch (err) {
      console.warn(`[AxieMixerService] Failed to fetch Axie #${axieId} from API:`, err);
      // Fallback for known hero Axies if offline or API error
      const FALLBACK_AXIES = {
        '10455': {
          id: '10455',
          name: 'Shinji',
          class: 'Beast',
          newGenes: '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c',
          image: './assets/portraits/shinji.png'
        },
        '11968787': {
          id: '11968787',
          name: 'Shinji',
          class: 'Beast',
          newGenes: '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c',
          image: './assets/portraits/shinji.png'
        },
        '3797905': {
          id: '3797905',
          name: 'Early Bird',
          class: 'Bird',
          newGenes: '0x10000000000001000241c0e0820800000001000020408202000100082820820a000100081040800a000100142040400400010008106183040001000818418204',
          image: './assets/portraits/bird-early.png'
        },
        '10830416': {
          id: '10830416',
          name: 'Big Yak',
          class: 'Plant',
          newGenes: '0x1800000000000100600180e0820800000001000c286085080001000c106085080001000c286082080001000c2800830a0001000c18614104000100141060c502',
          image: './assets/portraits/plant-yak.png'
        }
      };

      if (FALLBACK_AXIES[String(axieId)]) {
        const fallbackData = FALLBACK_AXIES[String(axieId)];
        this.axieCache.set(axieId, fallbackData);
        return fallbackData;
      }
      throw err;
    }
  }

  /**
   * Todos los Axies del jugador con sesión de Sky Mavis (sus direcciones Ronin las guarda el servidor al iniciar sesión).
   * Devuelve [{ id, name, class, image, genes, newGenes, parts }] y los deja en la caché de fetchAxieData.
   */
  async fetchOwnedAxies() {
    const token = await authService.getAccessToken();
    const res = await supabaseFetch(NET_CONFIG.functions.axieData, { method: 'POST', token, body: { op: 'owned' } });
    const list = Array.isArray(res?.axies) ? res.axies : [];
    list.forEach((a) => { if (a?.id) this.axieCache.set(String(a.id), a); });
    return list;
  }

  /**
   * Ajusta las partes del descriptor al catálogo 3D: si «S{skin}_{Clase}{variante}_L{nivel}_{Tipo}» no existe,
   * prueba el otro nivel, después la skin normal (0) y por último la skin normal de nivel 1.
   * Devuelve { descriptor, fixes: [{ type, requested, used }] } (used = null si no hay ninguna).
   */
  fitAxieDescriptor(mixer, descriptor) {
    const parts = mixer.manifest.assets.parts;
    const key = (p) => formatAxiePartAssetId(p);
    const fixes = [];
    // Piezas de nivel 2 mal catalogadas (19-oct): en la librería, las 18 partes Japan de nivel 2 comparten solo 6 modelos
    // («Japanese_04_lv2_*», uno por tipo de parte), así que la espalda de Bird 04 sale como la de Beast 08 y la boca de
    // Reptile 10 como la de Aquatic 10. Si el modelo de origen del nivel 2 lo usan varias partes distintas, se usa el
    // modelo de nivel 1 de la propia parte, que sí es único.
    const wrongL2 = (p) => {
      if (Number(p.level) !== 2) return false;
      const k1 = key({ ...p, level: 1 });
      if (!parts[k1]) return false;
      const src = parts[key(p)]?.rigs?.[0]?.sourcePrefabName || '';
      return src.includes('/') && (this._sharedSources(parts).get(src) || 0) > 1;
    };
    const fitted = (descriptor.parts || []).map((p) => {
      if (parts[key(p)] && wrongL2(p)) {
        const l1 = { ...p, level: 1 };
        fixes.push({ type: p.type, requested: key(p), used: key(l1), reason: 'modelo de nivel 2 mal catalogado' });
        return l1;
      }
      if (parts[key(p)]) return p;
      // Partes evolucionadas: el catálogo solo tiene niveles 1 y 2 (si los genes piden 3, se usa el 2)
      const tries = [{ ...p, level: 2 }, { ...p, level: 1 },
        { ...p, skin: 0 }, { ...p, skin: 0, level: 2 }, { ...p, skin: 0, level: 1 }];
      const hit = tries.find((t) => parts[key(t)] && !wrongL2(t)) || null;
      fixes.push({ type: p.type, requested: key(p), used: hit ? key(hit) : null });
      return hit || p;
    });
    return { descriptor: { ...descriptor, parts: fitted }, fixes };
  }

  /**
   * Nivel de las partes según Sky Mavis (19-oct): los genes del Axie no guardan bien el nivel de las partes
   * evolucionadas (el decodificador da nivel 1), pero la API las marca con «-2» al final del id.
   * Las partes de nivel 2 piden el modelo 3D de nivel 2. Devuelve un descriptor nuevo.
   */
  applyApiStages(descriptor, apiParts = []) {
    if (!apiParts?.length) return descriptor;
    const t = (s) => String(s || '').toLowerCase().replace(/s$/, '');
    const parts = (descriptor.parts || []).map((p) => {
      const a = apiParts.find((x) => t(x.type) === t(p.type));
      return a && partStage(a) >= 2 && Number(p.level || 1) < 2 ? { ...p, level: 2 } : p;
    });
    return { ...descriptor, parts };
  }

  /** Partes de Sky Mavis de un Axie para elegir el nivel del modelo (sin bloquear la carga si no hay conexión). */
  async _apiPartsFor(axieId) {
    if (!axieId) return [];
    const cached = this.axieCache.get(String(axieId)) || this.axieCache.get(axieId);
    if (cached) return cached.parts || [];
    if (!this._noApiParts) this._noApiParts = new Set();
    if (this._noApiParts.has(String(axieId))) return [];
    try {
      const data = await Promise.race([
        this.fetchAxieData(String(axieId)),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500)),
      ]);
      return data?.parts || [];
    } catch {
      this._noApiParts.add(String(axieId));
      return [];
    }
  }

  /** Cuántas partes del catálogo usan cada modelo de origen (se calcula una vez). */
  _sharedSources(parts) {
    if (this._srcCount && this._srcCountFor === parts) return this._srcCount;
    const count = new Map();
    for (const def of Object.values(parts)) {
      const src = def?.rigs?.[0]?.sourcePrefabName || '';
      if (src.includes('/')) count.set(src, (count.get(src) || 0) + 1);
    }
    this._srcCount = count;
    this._srcCountFor = parts;
    return count;
  }

  /** Claves de las 6 partes que pide un Axie y si existen en el catálogo 3D (para lkDebug.axieParts). */
  async partModelReport(genes, renderer = null, apiParts = []) {
    const mixer = await this.getMixer(renderer);
    const d = this.applyApiStages(mixer.decodeGenes(genes).descriptor, apiParts);
    const parts = mixer.manifest.assets.parts;
    const { fixes } = this.fitAxieDescriptor(mixer, d);
    return d.parts.map((p) => {
      const k = formatAxiePartAssetId(p);
      const f = fixes.find((x) => x.requested === k);
      return { tipo: p.type, clase: p.class, variante: p.variant, skin: p.skin, nivel: p.level, modelo: k, existe: Boolean(parts[k]), seUsa: f ? (f.used || 'ninguno') : k };
    });
  }

  /**
   * Gets or initializes the singleton 3D mixer instance
   * @param {THREE.WebGLRenderer} renderer - The active Three.js WebGLRenderer
   */
  async getMixer(renderer) {
    if (!this.mixerInstance) {
      this.mixerInstance = await createAxieMixer3D({
        assetBaseUrl: './assets/axie/',
        renderer: renderer
      });
      console.log('[AxieMixerService] Axie 3D Mixer initialized successfully');
    }
    return this.mixerInstance;
  }

  /**
   * Assembles and loads an Axie character model
   * @param {Object} options
   * @param {string} options.axieId - e.g. '10455'
   * @param {string} [options.genes] - 512-bit hex genes string
   * @param {THREE.WebGLRenderer} options.renderer - WebGLRenderer instance
   * @param {number} [options.scale=0.88] - Initial scale to match hero footprint
   * @param {string} [options.heroId] - Hero identifier alias (e.g. 'kotaro')
   * @returns {Promise<Object>} Axie playable character instance
   */
  async loadAxieHero({ axieId, genes, renderer, scale = 0.88, heroId = null }) {
    let finalGenes = genes;
    let axieData = null;

    const normalizedId = String(axieId || '10455');
    if (normalizedId === '10455' || normalizedId === '11968787') {
      if (!finalGenes || finalGenes.startsWith('0x10001c0e090020c0')) {
        finalGenes = '0x000000000000010001c180e1041000000001001020410304000100142841400a000100000800c30c0001000818614004000100141800c002000100141820400c';
      }
    }

    if (!finalGenes) {
      axieData = await this.fetchAxieData(normalizedId);
      finalGenes = axieData.newGenes || axieData.genes;
    }

    const mixer = await this.getMixer(renderer);
    // Partes que el catálogo 3D no tiene con ese nivel o skin (la librería las descartaría sin avisar):
    // se dibuja la combinación más cercana que sí exista (19-oct). Ver fitAxieDescriptor.
    let axie = null;
    try {
      if (typeof mixer.decodeGenes === 'function' && typeof mixer.create === 'function' && mixer.manifest?.assets?.parts) {
        const apiParts = axieData?.parts || await this._apiPartsFor(normalizedId);
        const staged = this.applyApiStages(mixer.decodeGenes(finalGenes).descriptor, apiParts);
        const { descriptor, fixes } = this.fitAxieDescriptor(mixer, staged);
        if (fixes.length) console.info(`[AxieMixerService] Axie #${normalizedId}: partes sin modelo exacto, se usa la más cercana`, fixes);
        this.lastFit = { axieId: normalizedId, fixes };
        axie = await mixer.create({ descriptor, quality: 'balanced', artMode: 'faithful' });
      }
    } catch (err) {
      console.warn('[AxieMixerService] Montaje por descriptor no disponible, se usan los genes tal cual:', err);
      axie = null;
    }
    if (!axie) {
      axie = await mixer.createFromGenes({
        axieId: normalizedId,
        genes: finalGenes,
        quality: 'balanced',
        artMode: 'faithful'
      });
    }

    // Configure model properties
    if (axie.wrapper) {
      axie.wrapper.scale.set(scale, scale, scale);

      // Directly calibrate the Axie Mixer 3D native outline thickness (:AxieOutline / ExtraPrePass)
      this.tuneOutline(axie.wrapper, 0.010);

      axie.wrapper.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Ensure frustum culling doesn't clip when camera rotates
          child.frustumCulled = false;
        }
      });
    }

    // Start in idle animation
    if (typeof axie.playAnimation === 'function') {
      axie.playAnimation('Default.Idle');
    }

    // Generate high-quality 2D portrait in real time for UI frames only if missing
    if (axie.wrapper) {
      // Retrato propio del Axie (por su ID). Antes también se miraba el del héroe («kotaro» tiene uno fijo),
      // y los Axies cargados por ID se quedaban sin retrato (19-oct).
      const existingPortrait = portraitService.getPortraitSync(String(axieId));
      if (!existingPortrait) {
        const captureTask = () => {
          try {
            const aliases = ['axie'];
            if (heroId) aliases.push(heroId);
            else aliases.push('kotaro');

            portraitService.captureAxieHero(String(axieId), axie.wrapper, {
              aliases,
              zoomFactor: 0.54,
              yaw: -0.22,
              pitch: 0.05,
              yTargetRatio: 0.08
            });
          } catch (err) {
            console.warn('[AxieMixerService] Could not auto-capture portrait:', err);
          }
        };
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(captureTask);
        } else {
          setTimeout(captureTask, 500);
        }
      }
    }

    if (axie.wrapper) {
      axie.wrapper.position.set(0, 0, 0);
    }

    console.log(`[AxieMixerService] Loaded 3D Axie character #${axieId} (${axieData?.name || 'Rage 5 Evo'})`);
    return {
      axie,
      axieData,
      wrapper: axie.wrapper
    };
  }

  /**
   * Directly modulates the Axie Mixer 3D native outline shader thickness (:AxieOutline / ExtraPrePass)
   * @param {THREE.Object3D} wrapper - Axie root model object
   * @param {number} [thickness=0.005] - Fine outline thickness matching Sapidae
   * @param {number|string|THREE.Color} [color=0x15161e] - Outline color
   */
  tuneOutline(wrapper, thickness = 0.005, color = 0x15161e) {
    if (!wrapper) return;
    const col = new THREE.Color(color);
    wrapper.traverse((child) => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat && mat.uniforms) {
            if (mat.uniforms.uOutlineThickness) {
              mat.uniforms.uOutlineThickness.value = thickness;
            }
            if (mat.uniforms.uOutlineColor) {
              mat.uniforms.uOutlineColor.value.copy(col);
            }
          }
        });
      }
    });
  }
}

export const axieMixerService = new AxieMixerService();
