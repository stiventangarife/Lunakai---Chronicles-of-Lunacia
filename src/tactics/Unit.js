// Unit.js - Combatant Entity (Axie Heroes & Chimera Monsters)
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { axieMixerService } from '../rpg/AxieMixerService.js';
import { weaponVisual, equipAxieWeapon, disposeAxieWeapons } from '../rpg/WeaponVisuals.js';
import { applyToonOutline } from '../rpg/stylized/ToonOutline.js';
import { sapidaeModularController } from '../rpg/SapidaeModularController.js';
import { sapidaeModelUrl } from '../rpg/SapidaeModels.js';
import * as i18n from '../i18n/i18n.js';
import { cloneGLTF } from '../render/ModelCache.js'; // caché de GLB compartida con el mundo abierto
import { access, PALETTES } from '../ui/AccessPrefs.js';
import { TILE_SIZE } from './GridManager.js';
import { absorbDamage, refillTurn, walkPath, pushSteps, initUnitStats } from './combat/UnitRules.js'; // Arena PvP P0: reglas compartidas con LogicUnit

// Hito 94: los enemigos caben en su casilla. Distancia horizontal de los vértices al origen del modelo (el centro de la
// casilla), a escala 1; se mide una vez por GLB. Al ser un radio vale para cualquier dirección a la que mire.
//   - cuerpo: el 85 % de los vértices queda dentro del bloque visible de la casilla (GridManager lo dibuja al 94 %);
//   - extremos (brazos, colas, armas): pueden salir un poco, hasta el 115 % de media casilla (~17 cm del borde visible).
const BODY_PERCENTILE = 0.85;
const BODY_FILL = 0.94;
const SPILL_MAX = 1.15;
const _footprint = new Map();
function footprintRadii(key, root) {
  let f = _footprint.get(key);
  if (f) return f;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  const dist = [];
  root.traverse((o) => {
    const p = o.isMesh && !o.userData.isOutlineMesh && o.geometry?.attributes?.position;
    if (!p) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); dist.push(Math.hypot(v.x, v.z)); }
  });
  const d = Float32Array.from(dist).sort();
  f = d.length ? { body: d[Math.floor((d.length - 1) * BODY_PERCENTILE)], max: d[d.length - 1] } : { body: 0, max: 0 };
  _footprint.set(key, f);
  return f;
}

/**
 * Clona un material sin serializar su userData. Material.clone() copia userData con
 * JSON.parse(JSON.stringify(...)); si contiene texturas (origMap, exprTex… del Sapidae) eso las
 * convierte a imagen con canvas.toDataURL (decenas o cientos de ms por material) y deja en el clon
 * objetos JSON en lugar de texturas. Aquí se copia el userData tal cual (copia superficial).
 */
function cloneMaterialFast(mat) {
  const ud = mat.userData;
  mat.userData = {};
  let c;
  try { c = mat.clone(); } finally { mat.userData = ud; }
  c.userData = { ...ud };
  return c;
}


// Efecto de muerte (esfera blanca y estallido): geometrías y materiales compartidos y reutilizados. Antes cada muerte
// creaba 19–27 materiales nuevos y los destruía al acabar, y el primer KO de cada combate compilaba sus shaders
// (tirón). Ahora se crean una vez, se precalientan detrás del velo (Unit.deathFxWarmGroup) y se devuelven a un pool.
const DEATH_FX = { core: null, coreBig: null, coreMat: null, partGeo: null, sets: [] };
function deathFx() {
  if (!DEATH_FX.coreMat) {
    DEATH_FX.core = new THREE.SphereGeometry(0.65, 20, 20);
    DEATH_FX.coreBig = new THREE.SphereGeometry(0.85, 20, 20);
    DEATH_FX.coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    DEATH_FX.partGeo = new THREE.SphereGeometry(0.14, 12, 12);
  }
  return DEATH_FX;
}
function acquireDeathParticleMats(n) {
  const set = DEATH_FX.sets.pop() || [];
  while (set.length < n) set.push(new THREE.MeshBasicMaterial({ color: set.length % 3 === 0 ? 0xfffbeb : 0xffffff, transparent: true, opacity: 1.0 }));
  for (const m of set) m.opacity = 1.0;
  return set;
}
function releaseDeathParticleMats(set) { if (set && DEATH_FX.sets.length < 6) DEATH_FX.sets.push(set); }

export class Unit {
  constructor(config, gridManager, sceneManager, audio) {
    // Estadísticas y estado de combate: los mismos que la unidad lógica del motor sin gráficos (combat/UnitRules.js)
    initUnitStats(this, config);
    this.gridManager = gridManager;
    this.sceneManager = sceneManager;
    this.audio = audio;

    this.group = new THREE.Group();
    this.mesh = null;
    this.mixer = null;
    this.actions = {};
    this.idleClip = null;
    this.runClip = null;
    this.attackClip = null;

    this._flashTimeouts = [];
    this._shakeInterval = null;

    this.ringMesh = null;
    this.activeRuneMesh = null;

    this.hudSprite = null;
    this.hudCanvas = null;
    this.hudCtx = null;

    this._createTacticalRings();
    this._createOverheadHUD();

    this.sceneManager.scene.add(this.group);
    this.updateWorldPosition();

    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile) tile.unit = this;
  }

  /** Animación del Axie: la de su arma si la lleva ('Sword.Run') o la normal ('Default.Run'). */
  clip(base) { return this.weaponFamily ? `${this.weaponFamily}.${base}` : `Default.${base}`; }

  /**
   * Mallas del efecto de muerte para precalentar sus shaders detrás del velo (main._prewarmBattle las añade a la
   * escena, fuera de la vista, y las quita después del fotograma completo).
   */
  static deathFxWarmGroup() {
    const fx = deathFx();
    const g = new THREE.Group();
    g.name = 'death_fx_warmup';
    const set = acquireDeathParticleMats(1);
    // + MeshBasic transparente a dos caras: la variante del anillo de impacto (choques del empuje) y del
    // remate cinemático (pilar y anillos), que antes se compilaba al lanzar la Ultimate
    const twoSided = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(fx.core, fx.coreMat), new THREE.Mesh(fx.partGeo, set[0]), new THREE.Mesh(fx.partGeo, twoSided));
    g.position.set(0, -60, 0);
    g.userData.release = () => { releaseDeathParticleMats(set); twoSided.dispose(); };
    return g;
  }

  getSkillLevel(spellId) {
    return (this.skillLevels && this.skillLevels[spellId]) || 1;
  }

  async loadModel() {
    if (this.config.modelType === 'axie' || this.config.axieId) {
      try {
        const res = await axieMixerService.loadAxieHero({
          axieId: this.config.axieId || '10455',
          genes: this.config.genes,
          renderer: this.sceneManager.renderer,
          scale: this.config.scale || 0.88,
          heroId: this.id
        });

        this.axie = res.axie;
        this.mesh = res.wrapper;
        // Arma equipada: modelo del mixer en su mano y sus animaciones (Sword.Idle…). Hito 52
        this.weaponFamily = null;
        const wv = weaponVisual(this.config.equipped?.weapon);
        if (wv && typeof this.axie.equipWeapon === 'function') {
          if (await equipAxieWeapon(this.axie, this.mesh, wv.variant)) this.weaponFamily = wv.family;
          if (this.weaponFamily) this.axie.playAnimation(this.clip('Idle'));
        }
        this.mesh.position.set(0, 0, 0);
        this.baseScale = this.config.scale || 0.88;
        this.group.add(this.mesh);

        // Axie Mixer 3D native outline is already tuned to 0.005 in axieMixerService
        this.toonOutline = null;

        if (this.config.initialFacing !== undefined) {
          this.mesh.rotation.y = this.config.initialFacing;
        } else {
          this.mesh.rotation.y = this.team === 'player' ? Math.PI / 4 : -3 * Math.PI / 4;
        }

        console.log(`[Unit] Loaded 3D Axie character for unit: ${this.name} (#${this.config.axieId || '10455'})`);
        return true;
      } catch (err) {
        console.error(`[Unit] Failed to load Axie model for ${this.name}, falling back to GLTF:`, err);
      }
    }

    let modelType = this.config.modelType || this.type;
    // Model name alias resolution
    if (modelType === 'axie' || modelType === 'shinji' || !modelType) {
      modelType = (this.id === 'tripp') ? 'tripp' : 'kotaro';
    }
    if (modelType === 'slime_basic' || modelType === 'slime_forest') modelType = 'slime';
    else if (modelType === 'slime_attack') modelType = 'slime-attack';
    else if (modelType === 'slime_defese') modelType = 'slime-defese';
    else if (modelType === 'slime_support') modelType = 'slime-support';
    else if (modelType === 'slime_forest_a') modelType = 'slime-forest-a';
    else if (modelType === 'slime_forest_b') modelType = 'slime-forest-b';
    else if (modelType === 'slime_fusion') modelType = 'slime-fusion';
    else if (modelType === 'wolf_aquatic') modelType = 'wolf-aquatic';
    else if (modelType === 'wolf_aquatic_alpha') modelType = 'wolf-aquatic-alpha';
    else if (modelType === 'wolf_gray') modelType = 'wolf-gray';
    else if (modelType === 'wolf_alpha') modelType = 'wolf-alpha';
    else if (modelType === 'treant_flower') modelType = 'treant-flower';
    else if (modelType === 'dryad_fighter') modelType = 'dryad-fighter';
    else if (modelType === 'dryad_mage') modelType = 'dryad-mage';
    else if (modelType === 'dryad_range') modelType = 'dryad-range';
    else if (modelType === 'werewolf_boss') modelType = 'werewolf-boss';
    else if (modelType === 'bear_mom') modelType = 'bear-mom';
    else if (modelType === 'bear_dad') modelType = 'bear-dad';

    if (modelType === 'sapidae') {
      modelType = this.config.modelType || 'sapidae-f-a';
    }
    let modelPath = './assets/models/' + modelType + '.glb';
    if (modelType.startsWith('sapidae')) {
      modelPath = sapidaeModelUrl(modelType); // Ema / Kai (21-oct) y los modelos antiguos
    } else if (modelType.startsWith('chimera')) {
      modelPath = './assets/models/dryad-fighter.glb';
    }

    try {
      // El Sapidae modifica su geometría (atributos de color, cuernos): cada unidad lleva la suya
      const isSapModel = this.isSapidae || (this.config && this.config.isSapidae) || modelType.toLowerCase().startsWith('sapidae');
      const gltf = await cloneGLTF(modelPath, { cloneGeometry: isSapModel });
      this._ownedGeometries = gltf.ownedGeometries;
      this.mesh = gltf.scene;
      
      let scale = this.config.scale;
      if (!scale) {
        if (modelType === 'fox') scale = 0.018;
        else if (modelType.startsWith('sapidae')) scale = 1.05;
        else if (modelType === 'werewolf-boss') scale = 2.10;
        else if (modelType === 'bear-dad') scale = 2.05;
        else if (modelType === 'bear-mom') scale = 1.85;
        else if (modelType.startsWith('bear-')) scale = 1.90;
        else if (modelType === 'wolf-alpha') scale = 1.65;
        else if (modelType === 'wolf-aquatic-alpha') scale = 1.60;
        else if (modelType.startsWith('wolf-')) scale = 1.25;
        else if (modelType.startsWith('dryad-')) scale = 1.50;
        else if (modelType === 'treant-flower') scale = 1.25;
        else if (modelType === 'buba') scale = 1.15;
        else if (modelType === 'kibo') scale = 1.35;
        else if (modelType === 'puffy') scale = 1.3;
        else if (modelType === 'slime-forest-b') scale = 1.30;
        else if (modelType === 'slime-defese' || modelType === 'slime-fusion') scale = 1.12;
        else scale = 1.05;
      }
      // Safety guard: only 'fox' should EVER have scale < 0.1
      if (modelType !== 'fox' && scale < 0.1) {
        scale = 1.05;
      }
      // Hito 94: tan grande como pida su escala, pero el cuerpo dentro de la casilla y los extremos casi (gire hacia donde gire).
      if (!isSapModel && modelType !== 'fox') {
        const f = footprintRadii(modelPath, this.mesh), half = TILE_SIZE / 2;
        if (f.body > 0) scale = Math.min(scale, half * BODY_FILL / f.body);
        if (f.max > 0) scale = Math.min(scale, half * SPILL_MAX / f.max);
      }
      this.baseScale = scale;
      this.mesh.scale.set(scale, scale, scale);
      if (this.hudSprite) {
        this.hudSprite.position.y = Math.max(2.3, scale * 1.1 + 0.4);
      }

      // Apply Sapidae Customization Material Colors & Modular Equipment
      if (this.isSapidae || (this.config && this.config.isSapidae) || modelType.startsWith('sapidae')) {
        if (!Unit.toonGradientMap) {
          const colors = new Uint8Array([ 125, 205, 255 ]);
          Unit.toonGradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
          Unit.toonGradientMap.minFilter = THREE.NearestFilter;
          Unit.toonGradientMap.magFilter = THREE.NearestFilter;
          Unit.toonGradientMap.generateMipmaps = false;
          Unit.toonGradientMap.needsUpdate = true;
        }

        this.mesh.traverse(child => {
          if (child.isMesh) {
            if (child.geometry) {
              if (child.geometry.attributes.color) {
                child.geometry.deleteAttribute('color');
              }
              if (child.geometry.attributes.color_1) {
                child.geometry.deleteAttribute('color_1');
              }
              if (child.geometry.attributes.normal && !child.geometry.userData.origNormals) {
                child.geometry.userData.origNormals = new Float32Array(child.geometry.attributes.normal.array);
              }
              if (child.geometry.attributes.position && !child.geometry.userData.origHornPositions) {
                child.geometry.userData.origHornPositions = new Float32Array(child.geometry.attributes.position.array);
              }
            }

            const name = (child.name || '').toLowerCase();
            const origMat = Array.isArray(child.material) ? child.material[0] : child.material;
            if (origMat) {
              origMat.vertexColors = false;

              if (name.includes('eye') || name.includes('mouth') || (name.includes('cheek') || name.includes('blush'))) {
                const decalMat = new THREE.MeshBasicMaterial({
                  map: origMat.map,
                  color: origMat.color,
                  transparent: true,
                  opacity: 1.0,
                  depthWrite: false,
                  polygonOffset: true,
                  polygonOffsetFactor: -1,
                  polygonOffsetUnits: -1,
                  toneMapped: true
                });
                decalMat.userData = { ...origMat.userData, origMap: origMat.map };
                child.material = decalMat;
              } else {
                const toonMat = new THREE.MeshToonMaterial({
                  map: origMat.map,
                  color: origMat.color,
                  gradientMap: Unit.toonGradientMap,
                  transparent: Boolean(origMat.transparent),
                  alphaTest: origMat.alphaTest || 0,
                  side: origMat.side || THREE.FrontSide,
                  toneMapped: true
                });
                toonMat.userData = { ...origMat.userData, origMap: origMat.map };
                child.material = toonMat;
              }
            }
          }
        });

        const custom = Object.assign({ useOriginalTextures: true }, this.config.customization || {});
        sapidaeModularController.applyCustomization(this.mesh, custom);
        if (this.config.equipped) {
          sapidaeModularController.applyEquipment(this.mesh, this.config.equipped, custom);
        }
      }

      if (this.config.tintColor) {
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material = cloneMaterialFast(child.material);
            child.material.color.multiplyScalar(0.65).add(new THREE.Color(this.config.tintColor).multiplyScalar(0.45));
          }
        });
      }

      this.mesh.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = cloneMaterialFast(child.material);
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              if (mat) {
                mat.userData = mat.userData || {};
                mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
                mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0.0;
              }
            });
          }
        }
      });

      this.group.add(this.mesh);

      // Apply Inverted Hull Toon Style Outline to GLTF units (squad allies and enemy chimeras)
      this.toonOutline = applyToonOutline(this.mesh, {
        thickness: 0.012,
        color: 0x15161e,
        mode: 'view',
        filter: (mesh) => {
          const name = (mesh.name || '').toLowerCase();
          if (name.includes('eye') || name.includes('mouth') || (name.includes('cheek') || name.includes('blush')) || name.includes('decal')) {
            return false;
          }
          return true;
        }
      });

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.mesh);
        gltf.animations.forEach(clip => {
          this.actions[clip.name] = this.mixer.clipAction(clip);
        });

        const clipNames = Object.keys(this.actions);
        
        // Prioritized detection: Idle, Run, Walk, Attack, Skill
        const idleName = clipNames.find(n => {
          const ln = n.toLowerCase();
          return ln.endsWith('.idle') || ln === 'idle' || ln.includes('idle') || ln.includes('survey');
        }) || clipNames[0];

        const runName = clipNames.find(n => {
          const ln = n.toLowerCase();
          return ln.endsWith('.run') || ln === 'run' || ln.includes('run') || ln.endsWith('.walk') || ln === 'walk' || ln.includes('walk');
        }) || null;

        const attackName = clipNames.find(n => {
          const ln = n.toLowerCase();
          return ln.includes('attack') || ln.includes('skill');
        }) || runName;

        this.idleClip = this.actions[idleName];
        this.runClip = runName ? this.actions[runName] : null;
        this.attackClip = attackName ? this.actions[attackName] : null;

        // Flag indicating true run animation
        this.hasRunAnimation = Boolean(this.runClip && this.runClip !== this.idleClip);

        if (this.idleClip) {
          this.idleClip.play();
        }
      }

      if (this.config.initialFacing !== undefined) {
        this.mesh.rotation.y = this.config.initialFacing;
      } else {
        this.mesh.rotation.y = this.team === 'player' ? Math.PI / 4 : -3 * Math.PI / 4;
      }

      console.log('Unit ' + this.name + ' (' + this.type + ') loaded successfully.');
      return true;
    } catch (err) {
      console.warn('Failed loading model for ' + this.name + ', using fallback:', err);
      this._createProceduralFallback();
      return true;
    }
  }

  /**
   * Libera lo que es solo de esta unidad al terminar el combate (antes solo se quitaba de la
   * escena y su memoria de GPU se acumulaba combate tras combate). No toca lo compartido: las
   * texturas y geometrías del modelo en caché, ni los materiales (sus programas se reutilizan en
   * el siguiente combate y liberarlos obligaría a recompilar). El modelo de los Axies es de la
   * librería del mixer y tampoco se toca.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    try {
      // Axie de la librería del mixer (una instancia por unidad): su dispose() devuelve las piezas
      // compartidas por recuento y lo saca del registro de la librería, que si no lo guardaba para siempre
      if (this.axie && typeof this.axie.dispose === 'function') { disposeAxieWeapons(this.mesh); this.axie.dispose(); }
      if (this.mixer) {
        this.mixer.stopAllAction();
        if (this.mesh) this.mixer.uncacheRoot(this.mesh);
        this.mixer = null;
      }
      if (this.hudSprite && this.hudSprite.material) {
        if (this.hudSprite.material.map) this.hudSprite.material.map.dispose();
        this.hudSprite.material.dispose();
      }
      // Discos y anillos tácticos (geometrías creadas para esta unidad)
      for (const m of [this.ringMesh, this.activeRuneMesh]) if (m && m.geometry && !m.geometry.userData.lkShared) m.geometry.dispose();
      // Hito 85: anillo normal (puede no estar puesto con alto contraste), contorno y aviso de cambios de Opciones
      if (this._ringGeoNormal && this._ringGeoNormal !== this.ringMesh?.geometry) this._ringGeoNormal.dispose();
      if (this._ringOutline) this._ringOutline.material.dispose();
      if (this._accessOff) { this._accessOff(); this._accessOff = null; }
      for (const c of this.group.children) {
        if (c.isMesh && c.geometry && c.geometry.type === 'CircleGeometry') c.geometry.dispose();
      }
      if (this._ownedGeometries) for (const g of this._ownedGeometries) g.dispose();
      // Esqueletos de esta unidad (clon propio): cada uno tiene una textura de huesos en la GPU
      // que no se liberaba al terminar el combate (+12 texturas por combate)
      if (this.mesh) {
        const skels = new Set();
        this.mesh.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) skels.add(o.skeleton); });
        skels.forEach((s) => s.dispose());
      }
      this._ownedGeometries = null;
      // Texturas de expresión de la cara del Sapidae (SapidaeModularController._ownMap): son copias
      // creadas para los materiales de ESTA unidad (sus materiales son clones propios)
      if (this.mesh && !this.axie) {
        this.mesh.traverse((o) => {
          const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          for (const m of mats) {
            const t = m && m.userData && m.userData.exprTex;
            if (t && typeof t.dispose === 'function') { t.dispose(); m.userData.exprTex = null; }
          }
        });
      }
    } catch (e) {
      console.warn('[Unit] dispose', e);
    }
  }

  _createProceduralFallback() {
    const geo = new THREE.SphereGeometry(0.65, 16, 16);
    const color = this.team === 'player' ? 0x22c55e : 0xef4444;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    mat.userData = mat.userData || {};
    mat.userData.baseEmissive = new THREE.Color(0x000000);
    mat.userData.baseEmissiveIntensity = 0.0;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.65;
    this.mesh.castShadow = true;
    this.group.add(this.mesh);
  }

  _createTacticalRings() {
    // Soft contact shadow disc for grounded visual presence
    const shadowGeo = new THREE.CircleGeometry(0.55, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x051a08,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.015;
    this.group.add(shadowMesh);

    const ringGeo = new THREE.RingGeometry(0.55, 0.68, 32);
    const ringColor = this.team === 'player' ? 0x00d2ff : 0xff3b30;
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.035;
    this.group.add(this.ringMesh);
    // Hito 85: con alto contraste el anillo cambia de forma según el bando (aliado: círculo; enemigo: rombo) y
    // lleva contorno negro; con modo daltonismo, colores distinguibles. Hijo del anillo: se oculta con él.
    this._ringGeoNormal = ringGeo;
    this._ringOutline = new THREE.Mesh(Unit._sharedRingGeo('allyOut'), new THREE.MeshBasicMaterial({
      color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0.75, depthWrite: false
    }));
    this._ringOutline.position.z = -0.004;
    this._ringOutline.renderOrder = -1;
    this._ringOutline.visible = false;
    this.ringMesh.add(this._ringOutline);
    this.applyAccess();
    this._accessOff = access.onChange(() => this.applyAccess());

    const activeGeo = new THREE.RingGeometry(0.72, 0.86, 32);
    const activeMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    this.activeRuneMesh = new THREE.Mesh(activeGeo, activeMat);
    this.activeRuneMesh.rotation.x = -Math.PI / 2;
    this.activeRuneMesh.position.y = 0.04;
    this.activeRuneMesh.visible = false;
    this.group.add(this.activeRuneMesh);
  }

  /** Geometrías de anillo compartidas por todas las unidades (alto contraste). No se liberan con la unidad. */
  static _sharedRingGeo(kind) {
    Unit._ringGeos = Unit._ringGeos || {};
    if (!Unit._ringGeos[kind]) {
      const g = {
        allyHC: () => new THREE.RingGeometry(0.5, 0.72, 40),
        allyOut: () => new THREE.RingGeometry(0.46, 0.77, 40),
        enemyHC: () => new THREE.RingGeometry(0.52, 0.8, 4),  // 4 lados: rombo sobre la casilla
        enemyOut: () => new THREE.RingGeometry(0.46, 0.87, 4),
      }[kind]();
      g.userData.lkShared = true;
      Unit._ringGeos[kind] = g;
    }
    return Unit._ringGeos[kind];
  }

  /** Hito 85: forma, contorno y color del anillo de bando según Opciones › Accesibilidad. */
  applyAccess() {
    if (!this.ringMesh) return;
    const foe = this.team !== 'player';
    const pal = access.palette;
    this.ringMesh.material.color.set(foe ? pal.enemy : pal.ally);
    if (access.contrast) {
      this.ringMesh.geometry = Unit._sharedRingGeo(foe ? 'enemyHC' : 'allyHC');
      this.ringMesh.material.opacity = 0.95;
      this._ringOutline.geometry = Unit._sharedRingGeo(foe ? 'enemyOut' : 'allyOut');
      this._ringOutline.visible = true;
    } else {
      this.ringMesh.geometry = this._ringGeoNormal;
      this.ringMesh.material.opacity = 0.75;
      this._ringOutline.visible = false;
    }
  }

  _createOverheadHUD() {
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = 256;
    this.hudCanvas.height = 128;
    this.hudCtx = this.hudCanvas.getContext('2d');

    const texture = new THREE.CanvasTexture(this.hudCanvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.hudSprite = new THREE.Sprite(spriteMat);
    const hudY = this.baseScale ? Math.max(2.3, this.baseScale * 1.1 + 0.4) : 2.3;
    this.hudSprite.position.set(0, hudY, 0);
    this.hudSprite.scale.set(1.9, 0.95, 1);
    this.group.add(this.hudSprite);

    this.updateHUD();
  }

  updateHUD() {
    if (!this.hudCtx) return;
    const ctx = this.hudCtx;
    const w = 256;
    const h = 128;
    ctx.clearRect(0, 0, w, h);

    if (this.isDead) {
      this.hudSprite.material.map.needsUpdate = true;
      return;
    }

    ctx.fillStyle = 'rgba(12, 19, 31, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, 16, w - 32, h - 32, 12);
    ctx.fill();

    ctx.strokeStyle = this.isActiveTurn ? '#ffd700' : (this.team === 'player' ? '#00d2ff' : '#ff4d4d');
    ctx.lineWidth = this.isActiveTurn ? 4 : 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, w / 2, 44);

    const barX = 28;
    const barY = 56;
    const barW = w - 56;
    const barH = 16;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();

    const safeHP = typeof this.currentHP === 'number' && !isNaN(this.currentHP) ? Math.max(0, this.currentHP) : 0;
    const safeMaxHP = typeof this.maxHP === 'number' && !isNaN(this.maxHP) && this.maxHP > 0 ? this.maxHP : 1;
    const hpRatio = Math.max(0, Math.min(1, safeHP / safeMaxHP));
    const fillW = barW * hpRatio;
    // Hito 89: barra «fantasma». Lo que se acaba de perder queda en claro un momento y luego baja (update)
    if (this._ghostHP == null || safeHP >= this._ghostHP) { this._ghostHP = safeHP; this._ghostWait = 0; this._ghostDraining = false; }
    else if (safeHP < (this._ghostLast ?? Infinity)) { this._ghostWait = 0.45; this._ghostDraining = true; }   // golpe nuevo: vuelve a esperar
    this._ghostLast = safeHP;
    const ghostRatio = Math.max(0, Math.min(1, this._ghostHP / safeMaxHP));
    if (ghostRatio > hpRatio + 0.001) {
      ctx.fillStyle = 'rgba(254, 243, 199, 0.9)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * ghostRatio, barH, 8);
      ctx.fill();
    }
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (this.team === 'player') {
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(1, '#34d399');
    } else {
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(1, '#f87171');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 8);
    ctx.fill();

    if (this.shield > 0) {
      const shieldRatio = Math.min(1, this.shield / safeMaxHP);
      const shieldW = barW * shieldRatio;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, shieldW, barH, 8);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 8);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    const hpText = this.shield > 0 ? `${safeHP} (+${this.shield}) / ${safeMaxHP}` : `${safeHP} / ${safeMaxHP}`;
    ctx.fillText(hpText, w / 2, barY + 12);

    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('★ ' + i18n.t('combatFx.paN', { n: this.currentPA }), w / 2 - 46, 96);

    ctx.fillStyle = '#4ade80';
    ctx.fillText('◆ ' + i18n.t('combatFx.pmN', { n: this.currentPM }), w / 2 + 46, 96);

    // Estados alterados (icono + turnos restantes) bajo el panel
    if (this.statuses && this.statuses.length) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#f8fafc';
      const txt = this.statuses.slice(0, 6).map((st) => `${st.icon || '•'}${st.duration}`).join(' ');
      ctx.fillText(txt, w / 2, 125);
    }

    this.hudSprite.material.map.needsUpdate = true;
  }

  setActiveTurn(isActive) {
    this.isActiveTurn = isActive;
    if (this.activeRuneMesh) {
      this.activeRuneMesh.visible = isActive;
    }
    this.updateHUD();
  }

  startTurn() {
    this.clearDamageFlash();
    this.setActiveTurn(true);
    refillTurn(this);

    this.updateHUD();
    this.audio.playTurnStart(this.team === 'player');
  }

  endTurn() {
    this.clearDamageFlash();
    this.setActiveTurn(false);
    // Los escudos de habilidades duran hasta el final del turno del receptor en la ronda siguiente
    // (lo gestiona SpellManager); los demás (escudo inicial, depuración) caducan como siempre.
    if (this.shieldExpiresRound == null) this.shield = 0;
    this.updateHUD();
  }

  updateWorldPosition() {
    const worldPos = this.gridManager.gridToWorld(this.gridX, this.gridZ);
    this.group.position.set(worldPos.x, 0, worldPos.z);
  }

  async moveAlongPath(path) {
    if (!path || path.length <= 1) return;
    this.isMoving = true;

    // Trigger run animation if available
    if (this.axie && typeof this.axie.playAnimation === 'function') {
      this.axie.playAnimation(this.clip('Run'));
    } else if (this.hasRunAnimation && this.runClip) {
      this.runClip.timeScale = 1.35;
      this.runClip.reset().fadeIn(0.12).play();
      if (this.idleClip) this.idleClip.fadeOut(0.12);
    }

    // Pasos, PM y casillas: combat/UnitRules.walkPath (lo mismo que en el motor sin gráficos); aquí, la animación
    await walkPath(this, path, {
      step: (x, z) => this._slideOrHopToCell(x, z),
      afterStep: () => this.updateHUD(),
      snap: () => { const wp = this.gridManager.gridToWorld(this.gridX, this.gridZ); if (this.group?.position) { this.group.position.x = wp.x; this.group.position.z = wp.z; } },
    });

    // Return to idle animation
    if (this.axie && typeof this.axie.playAnimation === 'function') {
      this.axie.playAnimation(this.clip('Idle'));
    } else if (this.hasRunAnimation && this.runClip) {
      if (this.idleClip) this.idleClip.reset().fadeIn(0.15).play();
      this.runClip.fadeOut(0.15);
    }

    this.isMoving = false;
  }

  _slideOrHopToCell(targetX, targetZ, duration = 0.38) {
    if (this.gridManager?.fastForward) return this._ffSnap(targetX, targetZ); // Arena PvP: puesta al día sin animaciones
    return new Promise(resolve => {
      const startPos = this.group.position.clone();
      const endPos = this.gridManager.gridToWorld(targetX, targetZ);

      const dirX = endPos.x - startPos.x;
      const dirZ = endPos.z - startPos.z;
      const angle = Math.atan2(dirX, dirZ);
      if (this.mesh) this.mesh.rotation.y = angle;

      if (!this.audio?.combat?.step?.(this)) this.audio?.playStep?.();   // Hito 88: paso con el suelo de la isla

      const startTime = performance.now();
      // If the unit has running animation: hopHeight is 0 (runs naturally along the ground, NO saltitos!)
      // If the unit has no animation (e.g. procedural fallback), use subtle hop (0.2)
      const hopHeight = (this.hasRunAnimation || this.axie) ? 0.0 : 0.2;

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);

        // Smooth cubic ease-in-out for fluid translation
        const smoothT = t * t * (3 - 2 * t);
        const currentX = THREE.MathUtils.lerp(startPos.x, endPos.x, smoothT);
        const currentZ = THREE.MathUtils.lerp(startPos.z, endPos.z, smoothT);
        const currentY = hopHeight > 0 ? Math.sin(t * Math.PI) * hopHeight : 0.0;

        this.group.position.set(currentX, currentY, currentZ);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.position.set(endPos.x, 0, endPos.z);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  _hopToCell(targetX, targetZ, duration = 0.45) {
    if (this.gridManager?.fastForward) return this._ffSnap(targetX, targetZ); // Arena PvP: puesta al día sin animaciones
    return new Promise(resolve => {
      this.isMoving = true;
      const startPos = this.group.position.clone();
      const endPos = this.gridManager.gridToWorld(targetX, targetZ);

      const dirX = endPos.x - startPos.x;
      const dirZ = endPos.z - startPos.z;
      const angle = Math.atan2(dirX, dirZ);
      if (this.mesh) this.mesh.rotation.y = angle;

      if (this.audio && !this.audio.combat?.step?.(this)) this.audio.playStep();   // Hito 88

      // Trigger jump or attack animation
      const activeClip = this.attackClip || this.runClip;
      if (activeClip) {
        if (this.idleClip) this.idleClip.fadeOut(0.08);
        activeClip.reset().fadeIn(0.06).play();
      }

      const startTime = performance.now();
      const peakJumpHeight = 1.85; // Dynamic leap over obstacles

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);

        const smoothT = t * t * (3 - 2 * t);
        const currentX = THREE.MathUtils.lerp(startPos.x, endPos.x, smoothT);
        const currentZ = THREE.MathUtils.lerp(startPos.z, endPos.z, smoothT);
        const currentY = Math.sin(t * Math.PI) * peakJumpHeight;

        this.group.position.set(currentX, currentY, currentZ);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.position.set(endPos.x, 0, endPos.z);
          if (activeClip) {
            activeClip.fadeOut(0.12);
            if (this.idleClip) this.idleClip.reset().fadeIn(0.12).play();
          }
          this.isMoving = false;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /** Arena PvP (P3): coloca la malla en la casilla al momento (puesta al día de una partida tras recargar). */
  _ffSnap(x, z) {
    const p = this.gridManager.gridToWorld(x, z);
    this.group?.position.set(p.x, 0, p.z);
    return Promise.resolve();
  }

  jumpToCell(targetX, targetZ, duration = 0.45) {
    return this._hopToCell(targetX, targetZ, duration);
  }

  async pushback(dx, dz, distance) {
    // Reglas del empujón en combat/UnitRules.pushSteps (compartidas con el motor sin gráficos); aquí, el deslizamiento
    return pushSteps(this, dx, dz, distance, { step: (x, z) => this._slidePush(x, z, 0.12) });
  }

  /**
   * Hito 82: vuelve con suavidad al centro de su casilla (gridX, gridZ) si quedó desplazada (un efecto visual que
   * movía la malla se cortó, un empujón a mitad de animación…). No hace nada si ya está en el centro o si se mueve.
   */
  settleToTile(duration = 0.15) {
    if (!this.group || this.isMoving || this.isDead || !this.gridManager) return Promise.resolve(false);
    const end = this.gridManager.gridToWorld(this.gridX, this.gridZ);
    const p = this.group.position;
    if (Math.hypot(p.x - end.x, p.z - end.z) < 0.03 && Math.abs(p.y) < 0.03) return Promise.resolve(false);
    if (typeof document !== 'undefined' && document.hidden) { p.set(end.x, 0, end.z); return Promise.resolve(true); }
    const start = p.clone();
    const t0 = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 1000 / duration);
        const k = t * t * (3 - 2 * t);
        if (!this.isMoving) p.set(start.x + (end.x - start.x) * k, start.y * (1 - k), start.z + (end.z - start.z) * k);
        if (t < 1 && !this.isMoving) requestAnimationFrame(step);
        else { if (!this.isMoving) p.set(end.x, 0, end.z); resolve(true); }
      };
      requestAnimationFrame(step);
    });
  }

  _slidePush(targetX, targetZ, duration = 0.12) {
    if (this.gridManager?.fastForward) return this._ffSnap(targetX, targetZ); // Arena PvP: puesta al día sin animaciones
    return new Promise(resolve => {
      const startPos = this.group.position.clone();
      const endPos = this.gridManager.gridToWorld(targetX, targetZ);
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = (now - startTime) / 1000;
        const t = Math.min(1, elapsed / duration);
        this.group.position.lerpVectors(startPos, endPos, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.group.position.copy(endPos);
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }

  /** Expresión de Ema / Kai durante un momento (21-oct). Vuelve a la de su personalización al acabar. */
  _sapiFace(eyes, mouth, ms = 0) {
    if (this.type !== 'sapidae' || !this.mesh) return;
    if (!sapidaeModularController.setExpression(this.mesh, eyes, mouth)) return;
    clearTimeout(this._faceTimer);
    if (ms > 0) {
      const c = this.config.customization || {};
      this._faceTimer = setTimeout(() => { if (!this.isDead && this.mesh) sapidaeModularController.setExpression(this.mesh, c.eyeExpr || 'normal', c.mouthExpr || 'smile'); }, ms);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return 0;
    if ((Number(amount) || 0) > 0) this._sapiFace('happy', 'o', 650); // ojos cerrados y «o»: se queja del golpe
    const actualDamage = absorbDamage(this, amount); // escudo, vida, runas y charms (combat/UnitRules.js)
    this.updateHUD();
    this._flashDamage();

    if (this.currentHP <= 0) {
      this.isDead = true;
      if (typeof this.onDeath === 'function') {
        try { this.onDeath(this); } catch (err) { console.warn(`[Unit] onDeath ${this.id}:`, err); }
      }
      const g = window.tacticsGame;
      const isLastEnemy = this.team === 'enemy' && g && g.units && g.units.filter(u => u.team === 'enemy' && !u.isDead && u !== this).length === 0;
      try {
        if (isLastEnemy) {
          this.dieCinematic(this.sceneManager, this.audio, g.spellManager ? g.spellManager.vfxManager : null);
        } else {
          this.die();
        }
      } catch (err) {
        console.warn(`[Unit] Error executing death sequence for ${this.id}:`, err);
        this.die();
      }
    }

    return actualDamage;
  }

  heal(amount) {
    if (this.isDead) return 0;
    const prev = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    this.updateHUD();
    return this.currentHP - prev;
  }

  addShield(amount) {
    this.shield += amount;
    this.updateHUD();
  }

  _flashDamage() {
    if (!this.mesh) return;

    // Clear any active flash timeout so rapid overlapping hits don't conflict
    if (this._flashTimeouts && this._flashTimeouts.length > 0) {
      this._flashTimeouts.forEach(t => clearTimeout(t));
      this._flashTimeouts = [];
    } else {
      this._flashTimeouts = [];
    }

    // 1. White-hot emissive flash on all mesh components
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat && mat.emissive) {
            mat.userData = mat.userData || {};
            // Record pristine baseline emissive if not yet recorded
            if (!mat.userData.baseEmissive) {
              mat.userData.baseEmissive = mat.emissive.clone();
              mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0.0;
            }
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = access.reduceMotion ? 0.45 : 1.35; // Hito 85: destello suave con «Reducir movimiento»
          }
        });
      }
    });

    const restoreTimeout = setTimeout(() => {
      this.resetEmissive();
    }, 140);
    this._flashTimeouts.push(restoreTimeout);

    // 2. Squash & Stretch Recoil and Micro-shake
    if (this._shakeInterval) {
      clearInterval(this._shakeInterval);
      this._shakeInterval = null;
    }

    const baseScale = this.baseScale || this.config.scale || 1.15;
    if (access.reduceMotion) return; // Hito 85: sin aplastamiento ni sacudida de la unidad
    this.mesh.scale.set(baseScale * 1.25, baseScale * 0.75, baseScale * 1.25);

    let shakeStep = 0;
    this._shakeInterval = setInterval(() => {
      shakeStep++;
      const ox = (Math.random() - 0.5) * 0.16;
      const oz = (Math.random() - 0.5) * 0.16;
      this.mesh.position.set(ox, 0, oz);

      if (shakeStep >= 6) {
        clearInterval(this._shakeInterval);
        this._shakeInterval = null;
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(baseScale, baseScale, baseScale);
      }
    }, 22);
  }

  clearDamageFlash() {
    if (this._flashTimeouts && this._flashTimeouts.length > 0) {
      this._flashTimeouts.forEach(t => clearTimeout(t));
      this._flashTimeouts = [];
    }
    if (this._shakeInterval) {
      clearInterval(this._shakeInterval);
      this._shakeInterval = null;
      if (this.mesh) {
        const baseScale = this.baseScale || this.config.scale || 1.15;
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(baseScale, baseScale, baseScale);
      }
    }
    this.resetEmissive();
  }

  resetEmissive() {
    if (!this.mesh) return;
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat && mat.emissive) {
            const baseCol = (mat.userData && mat.userData.baseEmissive) ? mat.userData.baseEmissive : new THREE.Color(0x000000);
            const baseInt = (mat.userData && mat.userData.baseEmissiveIntensity !== undefined) ? mat.userData.baseEmissiveIntensity : 0.0;
            mat.emissive.copy(baseCol);
            mat.emissiveIntensity = baseInt;
          }
        });
      }
    });
  }

  die() {
    this.isDead = true;
    this.audio?.combat?.faint?.(this);   // Hito 88
    this._sapiFace('happy', 'o');
    this.clearDamageFlash();
    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile && tile.unit === this) tile.unit = null;

    return this._playArcadeDeathVFX(false);
  }

  async _playArcadeDeathVFX(isCinematic = false) {
    const scene = this.sceneManager.scene;
    const wPos = this.gridManager.gridToWorld(this.gridX, this.gridZ);

    if (this.ringMesh) this.ringMesh.visible = false;
    if (this.activeRuneMesh) this.activeRuneMesh.visible = false;

    this.deathVFXPhasesHistory = [];
    const setPhase = (phase) => {
      this.deathVFXPhase = phase;
      if (!this.deathVFXPhasesHistory.includes(phase)) {
        this.deathVFXPhasesHistory.push(phase);
      }
    };

    setPhase('blinking');

    // Helper to flash white
    const setWhiteFlash = (active) => {
      if (!this.mesh) return;
      this.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (active) {
              mat.userData = mat.userData || {};
              if (!mat.userData.baseEmissive) {
                mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
                mat.userData.baseEmissiveIntensity = (mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0.0;
              }
              if (mat.emissive) {
                mat.emissive.setHex(0xffffff);
                mat.emissiveIntensity = 2.8;
              }
            } else {
              if (mat.emissive) {
                const baseCol = (mat.userData && mat.userData.baseEmissive) ? mat.userData.baseEmissive : new THREE.Color(0x000000);
                const baseInt = (mat.userData && mat.userData.baseEmissiveIntensity !== undefined) ? mat.userData.baseEmissiveIntensity : 0.0;
                mat.emissive.copy(baseCol);
                mat.emissiveIntensity = baseInt;
              }
            }
          });
        }
      });
    };

    // Hito 140: en el remate cinemático del último enemigo los parpadeos son más rápidos (330 → 210 ms) para que la
    // secuencia no tenga un momento quieto; las muertes normales siguen igual
    const blink = isCinematic ? [60, 50, 60, 40] : [90, 80, 90, 70];
    // 1. Flash 1 (White blink)
    setWhiteFlash(true);
    if (this.audio && this.audio.playHit) this.audio.playHit();
    await new Promise(r => setTimeout(r, blink[0]));
    setWhiteFlash(false);
    await new Promise(r => setTimeout(r, blink[1]));

    // 2. Flash 2 (White blink)
    setWhiteFlash(true);
    await new Promise(r => setTimeout(r, blink[2]));
    setWhiteFlash(false);
    await new Promise(r => setTimeout(r, blink[3]));

    // 3. Third beat: Mesh disappears, replaced by a glowing white sphere
    setPhase('core_sphere');
    if (this.mesh) this.mesh.visible = false;
    if (this.toonOutline) this.toonOutline.setVisible(false);
    if (this.hudSprite) this.hudSprite.visible = false;

    const fx = deathFx();
    const coreSphere = new THREE.Mesh(isCinematic ? fx.coreBig : fx.core, fx.coreMat);
    coreSphere.position.set(wPos.x, 0.85, wPos.z);
    scene.add(coreSphere);

    // Luz prestada del conjunto fijo del combate (sin recompilar shaders); objeto vacío si no hay conjunto
    const lightPool = this.sceneManager?.lightPool;
    const flashLight = lightPool
      ? lightPool.acquire({ color: 0xffffff, intensity: isCinematic ? 4.5 : 3.0, distance: 6.0, decay: 2, position: { x: wPos.x, y: 0.9, z: wPos.z }, maxLife: 3 })
      : { intensity: 0 };

    if (this.audio) this.audio.playDisintegrationBurst();

    // Pulse & expand central sphere with perceptible radiance (180ms)
    const t0 = performance.now();
    await new Promise(resolve => {
      const expand = (now) => {
        const p = Math.min(1.0, (now - t0) / 180);
        const s = 1.0 + Math.sin(p * Math.PI * 0.5) * 0.5;
        coreSphere.scale.set(s, s, s);
        if (p < 1.0) {
          requestAnimationFrame(expand);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(expand);
    });

    scene.remove(coreSphere);

    // Shatter into multiple small glowing spheres bursting outward
    setPhase('particles');
    if (typeof this._onBurst === 'function') { this._onBurst(); this._onBurst = null; } // Hito 140: aviso a onVictory
    const numParticles = isCinematic ? 26 : 18;
    const particles = [];
    const sphereGeo = fx.partGeo;
    const particleMats = acquireDeathParticleMats(numParticles);
    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);

    for (let i = 0; i < numParticles; i++) {
      const pMat = particleMats[i];
      const pMesh = new THREE.Mesh(sphereGeo, pMat);
      pMesh.position.set(wPos.x, 0.85, wPos.z);

      const angle = (i / numParticles) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = (isCinematic ? 4.5 : 3.5) + Math.random() * 3.8;
      const velX = Math.cos(angle) * speed;
      const velZ = Math.sin(angle) * speed;
      const velY = 2.0 + Math.random() * 3.5;

      particlesGroup.add(pMesh);
      particles.push({
        mesh: pMesh,
        mat: pMat,
        vel: new THREE.Vector3(velX, velY, velZ),
        scale: 1.0
      });
    }

    // Animate shattered particles bursting and fading
    const burstStart = performance.now();
    const burstDuration = isCinematic ? 800 : 650;

    await new Promise(resolve => {
      let lastTime = burstStart;
      const updateParticles = (now) => {
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const p = Math.min(1.0, (now - burstStart) / burstDuration);

        particles.forEach(pt => {
          pt.mesh.position.x += pt.vel.x * dt;
          pt.mesh.position.y += pt.vel.y * dt;
          pt.mesh.position.z += pt.vel.z * dt;
          pt.vel.y -= 10.5 * dt;

          const lifeAlpha = Math.max(0, 1.0 - p);
          pt.mat.opacity = lifeAlpha;
          const sc = Math.max(0.01, (1.0 - p * 0.75));
          pt.mesh.scale.set(sc, sc, sc);
        });

        flashLight.intensity = Math.max(0, (isCinematic ? 4.5 : 3.0) * (1.0 - p));

        if (p < 1.0) {
          requestAnimationFrame(updateParticles);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(updateParticles);
    });

    scene.remove(particlesGroup);
    if (lightPool) lightPool.release(flashLight);
    releaseDeathParticleMats(particleMats); // compartidos: no se destruyen (sus shaders siguen compilados)

    this.group.visible = false;
    setPhase('completed');
  }

  async dieCinematic(sceneManager, audio, vfxManager) {
    this.isDead = true;
    // Hito 140: main.onVictory espera a que el estallido empiece (en vez de 450 ms fijos) para que el rótulo de victoria
    // no se pinte encima del destello
    this.burstStarted = new Promise((r) => { this._onBurst = r; });
    audio?.combat?.faint?.(this);   // Hito 88
    this.clearDamageFlash();
    const tile = this.gridManager.getTile(this.gridX, this.gridZ);
    if (tile && tile.unit === this) tile.unit = null;

    const wPos = this.gridManager.gridToWorld(this.gridX, this.gridZ);

    // 1. Hit Stop: Freeze time briefly + Sub-bass rumble
    if (audio) audio.playHitStopBass();
    if (sceneManager) {
      sceneManager.shake(0.65);
      sceneManager.startCinematicZoom(wPos, 13.0, 7.2);
    }

    if (vfxManager) vfxManager.playCinematicFinisher(wPos);

    // Pausa de impacto (Hito 140: 380 → 150 ms; con 380 el tablero se quedaba quieto y parecía un congelamiento).
    // La cámara sigue acercándose (startCinematicZoom) y el remate de luz ya está en marcha.
    await new Promise(r => setTimeout(r, 150));

    // Play arcade shatter VFX with cinematic scale
    await this._playArcadeDeathVFX(true);
  }

  playAttackAnimation() {
    if (this.axie && typeof this.axie.playAnimation === 'function') {
      try {
        this.axie.playAnimation(this.weaponFamily ? `${this.weaponFamily}.Attack` : 'Action.AttackCombo');
        setTimeout(() => {
          if (this.axie && !this.isDead && !this.isMoving) {
            this.axie.playAnimation(this.clip('Idle'));
          }
        }, 550);
      } catch (e) {
        console.warn('[Unit] Axie attack anim error:', e);
      }
    } else if (this.type === 'sapidae' && this.mesh) {
      this._sapiFace('angry', 'open', 900); // ceño fruncido al atacar
      // Dynamic martial lunge and casting flourish for humanoid Sapidae
      const origY = this.mesh.position.y;
      const origZ = this.mesh.position.z;
      const origRotX = this.mesh.rotation.x;
      const startTime = performance.now();
      const animDuration = 420;

      const strikeAnim = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / animDuration);
        if (t < 0.32) {
          const lungeT = t / 0.32;
          this.mesh.position.z = origZ + Math.sin(lungeT * Math.PI * 0.5) * 0.45;
          this.mesh.rotation.x = origRotX - Math.sin(lungeT * Math.PI * 0.5) * 0.28;
        } else {
          const recoilT = (t - 0.32) / 0.68;
          this.mesh.position.z = origZ + (1 - recoilT) * 0.45;
          this.mesh.rotation.x = origRotX - (1 - recoilT) * 0.28;
        }
        if (t < 1) {
          requestAnimationFrame(strikeAnim);
        } else {
          this.mesh.position.z = origZ;
          this.mesh.position.y = origY;
          this.mesh.rotation.x = origRotX;
        }
      };
      requestAnimationFrame(strikeAnim);

      if (this.runClip) {
        this.runClip.reset().fadeIn(0.06).play();
        setTimeout(() => {
          if (this.idleClip) this.idleClip.reset().fadeIn(0.12).play();
          if (this.runClip) this.runClip.fadeOut(0.12);
        }, 340);
      }
    } else if (this.attackClip) {
      this.attackClip.reset().fadeIn(0.08).play();
      setTimeout(() => {
        if (this.idleClip) this.idleClip.reset().fadeIn(0.15).play();
        if (this.attackClip) this.attackClip.fadeOut(0.15);
      }, 350);
    }
  }

  update(dt, time) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
    // Hito 89: la barra fantasma espera 0,45 s y luego baja al 60 % de la vida máxima por segundo
    if (this._ghostDraining) {
      const cur = Math.max(0, this.currentHP || 0);
      if (this._ghostWait > 0) this._ghostWait -= dt;
      else {
        this._ghostHP = Math.max(cur, this._ghostHP - (this.maxHP || 1) * 0.6 * dt);
        if (this._ghostHP <= cur + 0.001) { this._ghostHP = cur; this._ghostDraining = false; }
        if (this.hudSprite && this.hudSprite.visible !== false) this.updateHUD();
      }
    }
    if (this.toonOutline && typeof this.toonOutline.syncVisibility === 'function') {
      this.toonOutline.syncVisibility();
    }
    if (this.axie && typeof this.axie.update === 'function') {
      this.axie.update(dt);
    }

    // Procedural organic breathing for static 3D meshes (slimes, wolves, dryads, bears)
    if (!this.mixer && !this.axie && this.mesh && !this.isDead && !this.isMoving) {
      const breath = Math.sin(time * 3.0 + (this.gridX * 2.1 + this.gridZ * 1.3)) * 0.035;
      this.mesh.position.y = Math.max(0, breath);
      if (this.baseScale) {
        const squash = 1.0 + breath * 0.08;
        this.mesh.scale.set(this.baseScale * (2 - squash), this.baseScale * squash, this.baseScale * (2 - squash));
      }
    }

    if (this.activeRuneMesh && this.isActiveTurn) {
      this.activeRuneMesh.rotation.z += dt * 2.0;
      const pulse = 0.95 + Math.sin(time * 5.0) * 0.15;
      this.activeRuneMesh.scale.set(pulse, pulse, pulse);
    }
  }
}
