// AxieMixerService.js - Service for Sky Mavis API queries and 3D Axie character assembly
import * as THREE from 'three';
import { createAxieMixer3D } from '@jaatster/threejs-axie-mixer3d-public';
import { portraitService } from '../tactics/CharacterPortraitService.js';

// Polyfill for Three.js r160 compatibility with Axie Mixer shaders
if (THREE.ShaderChunk && !THREE.ShaderChunk.morphinstance_vertex) {
  THREE.ShaderChunk.morphinstance_vertex = '';
}

export const SKY_MAVIS_API_KEY = 'w7u78plqZO8kF5T46XK4nzcDPbbrXyM7';
const GRAPHQL_ENDPOINT = 'https://api-gateway.skymavis.com/graphql/axie-marketplace';

const AXIE_QUERY = `query GetAxieDetail($axieId: ID!) {
  axie(axieId: $axieId) {
    id
    name
    class
    image
    genes
    newGenes
    parts {
      id
      name
      class
      type
    }
  }
}`;

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
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': SKY_MAVIS_API_KEY
        },
        body: JSON.stringify({
          query: AXIE_QUERY,
          variables: { axieId: String(axieId) }
        })
      });

      if (!res.ok) {
        throw new Error(`Sky Mavis API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
      }

      const data = json.data?.axie;
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
    const axie = await mixer.createFromGenes({
      axieId: normalizedId,
      genes: finalGenes,
      quality: 'balanced',
      artMode: 'faithful'
    });

    // Configure model properties
    if (axie.wrapper) {
      axie.wrapper.scale.set(scale, scale, scale);

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

    // Generate high-quality 2D portrait in real time for UI frames
    if (axie.wrapper) {
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
}

export const axieMixerService = new AxieMixerService();
