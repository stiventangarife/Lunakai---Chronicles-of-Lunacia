// CharacterPreviewDiorama.js - 3D Diorama Viewport for Character Creation (Dofus Style)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { SapidaeModularController } from '../SapidaeModularController.js';
import { axieMixerService } from '../AxieMixerService.js';
import { applyToonOutline } from '../stylized/ToonOutline.js';
import { sapidaeModelUrl } from '../SapidaeModels.js';
import { disposeAxieWeapons } from '../WeaponVisuals.js';
import { releaseClone } from '../../render/ReleaseGltf.js';
import { cloneGLTF, holdGLTF, unholdGLTF } from '../../render/ModelCache.js';
import { perfMark } from '../../debug/PerfProbe.js';

export class CharacterPreviewDiorama {
  constructor(containerEl) {
    this.container = containerEl;
    this.modularController = new SapidaeModularController();
    this.toonOutline = null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.loader = new GLTFLoader();

    // Scene groups
    this.dioramaGroup = null;
    this.characterGroup = null;
    this.companionGroup = null;

    // Active models and animation
    this.currentModelName = null;
    this.currentModel = null;
    this.currentCompanion = null;
    this.mixer = null;
    this.activeAction = null;

    // Interaction state (Rotation)
    this.isDragging = false;
    this.previousMouseX = 0;
    this.rotationVelocity = 0;
    this.characterRotationY = 0;
    this.targetRotationY = 0;

    // Anim loop
    this.animFrameId = null;
    this.clock = new THREE.Clock();
    this.isRunning = false;

    // Pedestal runes pulse
    this.runeMaterial = null;
    this.pedestalBase = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onResize = this._onResize.bind(this);

    this._initScene();
  }

  _initScene() {
    if (!this.container) return;

    const width = this.container.clientWidth || 450;
    const height = this.container.clientHeight || 550;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060d1f, 0.04);

    // 2. Camera: Symmetrical cinematic angle looking at character and pedestal
    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    this.camera.position.set(0, 1.45, 4.65);
    this.camera.lookAt(0, 0.92, 0);

    // 3. Renderer with transparent background and high quality
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    // Hito 140: como el juego (SceneManager) y los retratos: sin la comprobación de errores de shader en el primer uso
    // de cada programa (getProgramInfoLog espera a la tarjeta gráfica: 41 ms medidos al equipar la espada en la Mochila)
    this.renderer.debug.checkShaderErrors = false;
    // Mismo tope que el juego (1,5): cuesta mucho menos que 2 mientras el mundo sigue dibujándose
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lights - Warm, balanced fantasy studio lighting (matching Axie cel-shading)
    // Key Light (Warm sunlight from upper right)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(2.8, 5.5, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Fill Light (Soft neutral fill light from left, eliminating harsh cyan)
    const fillLight = new THREE.DirectionalLight(0xf8fafc, 1.2);
    fillLight.position.set(-2.8, 4.0, 2.8);
    this.scene.add(fillLight);

    // Rim Light (Golden edge highlight)
    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.4);
    rimLight.position.set(0, 4.0, -3.2);
    this.scene.add(rimLight);

    // Ambient (Warm soft fantasy fill)
    const ambient = new THREE.AmbientLight(0x383548, 1.6);
    this.scene.add(ambient);

    // 5. Clean Ground Contact Shadow (No rigid platform)
    this._createGroundShadow();

    // 6. Character groups - Separated symmetrically around x = 0 (exact distance 1.40)
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.set(-0.70, 0.08, 0.0);
    this.scene.add(this.characterGroup);

    this.companionGroup = new THREE.Group();
    this.companionGroup.position.set(0.70, 0.08, 0.22);
    this.scene.add(this.companionGroup);

    // 7. Event listeners for drag rotation
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this._onResize());
      this.resizeObserver.observe(this.container);
    }
  }



  _createShadowTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 240);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  _createGroundShadow() {
    this.dioramaGroup = new THREE.Group();

    // Soft realistic circular contact shadow directly beneath characters on the floor
    const shadowGeom = new THREE.PlaneGeometry(3.6, 2.6);
    const shadowTex = this._createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    this.contactShadow = new THREE.Mesh(shadowGeom, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.set(0, 0.005, 0.1);
    this.dioramaGroup.add(this.contactShadow);

    this.scene.add(this.dioramaGroup);
  }

  /**
   * Loads or updates the 3D Sapidae model
   */
  async loadSapidae(modelName = 'sapidae-f-a', customization = {}) {
    if (this.currentModel && this.currentModelName === modelName) {
      // Model is already in scene, apply real-time customization instantly!
      this.modularController.applyCustomization(this.currentModel, customization);
      return;
    }

    this.currentModelName = modelName;
    // Cada carga lleva su número: si mientras tanto se pidió otro modelo (Femenina ↔ Masculina seguido),
    // al terminar se descarta en lugar de añadirse encima del otro.
    const token = (this._loadToken = (this._loadToken || 0) + 1);

    // Clear old model from group
    if (this.mixer) {
      this.mixer.stopAllAction();
      try { if (this.currentModel) this.mixer.uncacheRoot(this.currentModel); } catch (_) { /* opcional */ }
      this.mixer = null;
    }
    // Hito 113 (memoria): el Sapidae anterior se libera de verdad (antes solo se quitaba del grupo y cada cambio
    // Ema ↔ Kai dejaba ~150 MB de imágenes decodificadas en el navegador hasta que el recolector decidía)
    if (this.currentModel) this._releaseCurrentSapidae();

    try {
      // Hito 113 (memoria): la copia sale de ModelCache, la misma caché del mundo y del combate. Las imágenes del GLB
      // (~150–165 MB decodificadas) existen una sola vez y las comparten el mundo, el visor de la Mochila y el creador;
      // antes cada diorama cargaba y decodificaba su propio GLB. Geometría propia (aquí se quitan los colores de vértice).
      // Se reserva ANTES de pedirla: mientras este diorama use la copia, evictGLTF no puede cerrar las imágenes compartidas
      const url = sapidaeModelUrl(modelName);
      holdGLTF(url);
      let gltf;
      try { gltf = await cloneGLTF(url, { cloneGeometry: true }); } catch (e) { unholdGLTF(url); throw e; }
      gltf.__lkPath = url;
      if (token !== this._loadToken) { unholdGLTF(url); releaseClone(gltf); return; } // ya se pidió otro modelo: este no se usa
      const model = gltf.scene;

      // 1. Create a discrete cartoon ramp gradient map for MeshToonMaterial (3-step cel-shading matching Axie)
      if (!this.toonGradientMap) {
        const colors = new Uint8Array([ 125, 205, 255 ]);
        this.toonGradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
        this.toonGradientMap.minFilter = THREE.NearestFilter;
        this.toonGradientMap.magFilter = THREE.NearestFilter;
        this.toonGradientMap.generateMipmaps = false;
        this.toonGradientMap.needsUpdate = true;
      }

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Remove vertex colors to prevent dark blotches/facets on skin mask
          if (child.geometry) {
            if (child.geometry.attributes.color) {
              child.geometry.deleteAttribute('color');
            }
            if (child.geometry.attributes.color_1) {
              child.geometry.deleteAttribute('color_1');
            }
            // Cache original smooth authored normals and positions
            if (child.geometry.attributes.normal && !child.geometry.userData.origNormals) {
              child.geometry.userData.origNormals = new Float32Array(child.geometry.attributes.normal.array);
            }
            if (child.geometry.attributes.position && !child.geometry.userData.origHornPositions) {
              child.geometry.userData.origHornPositions = new Float32Array(child.geometry.attributes.position.array);
            }
          }

          // Apply Stylized Cel / Toon Material
          const name = (child.name || '').toLowerCase();
          const origMat = Array.isArray(child.material) ? child.material[0] : child.material;

          if (origMat) {
            origMat.vertexColors = false;

            if (name.includes('eye') || name.includes('mouth') || (name.includes('cheek') || name.includes('blush'))) {
              // 2D anime facial decals (eyes, mouth, blush) -> crisp unlit decal with depth offset
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
              // Main body, hair, head, clothing, legs, hat -> crisp discrete cel-shading matching Axie
              const toonMat = new THREE.MeshToonMaterial({
                map: origMat.map,
                color: origMat.color,
                gradientMap: this.toonGradientMap,
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

      // Default scale & orientation
      model.scale.set(1.0, 1.0, 1.0);
      model.position.set(0, 0, 0);

      // Por si acaso: nunca más de un Sapidae en el diorama
      if (this.currentModel && this.currentModel !== model) this._releaseCurrentSapidae();
      if (this.mixer) { this.mixer.stopAllAction(); this.mixer = null; }
      this.currentModel = model;
      this._currentGltf = gltf;
      this.characterGroup.add(model);

      // Play Idle Animation
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        const idleClip = gltf.animations.find(c => c.name.toLowerCase().includes('idle')) || gltf.animations[0];
        if (idleClip) {
          this.activeAction = this.mixer.clipAction(idleClip);
          this.activeAction.play();
        }
      }

      // Apply initial modular customization (horns, hair, eyes, suit color)
      this.modularController.applyCustomization(this.currentModel, customization);

      // Apply Inverted Hull Toon Outline (fine cartoon line art, excluding 2D facial decals)
      if (this.toonOutline) {
        this.toonOutline.dispose();
        this.toonOutline = null;
      }
      this.toonOutline = applyToonOutline(this.currentModel, {
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

    } catch (err) {
      console.warn(`[CharacterPreviewDiorama] Failed to load Sapidae model ${modelName}:`, err);
    }
  }

  /**
   * Applies modular customization (hair, eyes, horns, suit) in real time
   */
  applyCustomization(customization = {}) {
    if (this.currentModel) {
      this.modularController.applyCustomization(this.currentModel, customization);
      if (this.toonOutline) {
        this.toonOutline.apply();
      }
    }
  }

  /**
   * Loads or swaps companion Axie beside the Sapidae hero
   */
  /**
   * Hito 113 — Devuelve un compañero a la librería del mixer. Antes loadCompanion solo lo sacaba del grupo: la librería
   * guarda cada Axie que crea hasta que se le llama a dispose() (lo dice Unit.dispose), así que cada cambio de compañero
   * en el selector dejaba un Axie entero en memoria (~110 MB; 20 cambios entre los dos iniciales llevaron el heap de
   * ~0,6 a ~2,9 GB). Mismo orden que Unit.dispose: armas, dispose() del Axie y esqueletos.
   */
  _disposeCompanion(comp = this.currentCompanion) {
    if (!comp) return;
    const root = comp.wrapper || comp.model || null;
    try {
      const skels = new Set();
      if (root) root.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) skels.add(o.skeleton); });
      if (root) disposeAxieWeapons(root);
      if (comp.axie) comp.axie.__lkDisposed = true; // AxieMixerService.loadAxieHero lo mira antes de hacer el retrato
      if (comp.axie && typeof comp.axie.dispose === 'function') comp.axie.dispose();
      skels.forEach((s) => { try { s.dispose(); } catch (_) { /* opcional */ } });
    } catch (e) {
      console.warn('[CharacterPreviewDiorama] No se pudo liberar el compañero:', e);
    }
    if (root && root.parent) root.parent.remove(root);
    if (comp === this.currentCompanion) this.currentCompanion = null;
  }

  async loadCompanion(axieId = '10455', genes = null) {
    // Cada petición lleva su número: con cambios rápidos, solo vale la última (las demás se liberan al llegar)
    const token = (this._companionToken = (this._companionToken || 0) + 1);
    // Retira y libera el compañero anterior
    this._disposeCompanion();
    while (this.companionGroup.children.length > 0) {
      this.companionGroup.remove(this.companionGroup.children[0]);
    }
    this.currentCompanion = null;

    try {
      const res = await axieMixerService.loadAxieHero({
        axieId: String(axieId),
        genes: genes,
        renderer: this.renderer,
        scene: this.scene
      });

      // Se pidió otro compañero (o se cerró el visor) mientras este cargaba: ya no hace falta
      if (token !== this._companionToken || !this.renderer) { this._disposeCompanion(res); return; }

      const companionObj = res?.wrapper || res?.model;
      if (res && companionObj) {
        this.currentCompanion = res;
        companionObj.scale.set(0.58, 0.58, 0.58);
        companionObj.position.set(0, 0, 0);
        companionObj.rotation.y = -Math.PI / 5;

        this.companionGroup.add(companionObj);

        // Native Axie Mixer outline is already tuned to 0.005 in axieMixerService

        if (res.axie && typeof res.axie.playAnimation === 'function') {
          res.axie.playAnimation('Default.Idle');
        } else if (typeof res.playAnimation === 'function') {
          res.playAnimation('Default.Idle');
        }
      }
    } catch (err) {
      console.warn('[CharacterPreviewDiorama] Could not load 3D Axie companion:', err);
    }
  }

  // --- Rotations & Controls ---
  rotateBy(angleDelta) {
    this.targetRotationY += angleDelta;
  }

  _onPointerDown(e) {
    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.rotationVelocity = 0;
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.previousMouseX;
    this.previousMouseX = e.clientX;
    this.rotationVelocity = deltaX * 0.012;
    this.characterRotationY += this.rotationVelocity;
    this.targetRotationY = this.characterRotationY;
  }

  _onPointerUp() {
    this.isDragging = false;
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || 450;
    const height = this.container.clientHeight || 550;
    // setSize() reserva de nuevo el búfer del canvas aunque el tamaño sea el mismo: solo si cambia
    if (width === this._lastW && height === this._lastH) return;
    this._lastW = width; this._lastH = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this._animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  _animate() {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(() => this._animate());

    const dt = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update character animations (idle breathing and lively poses)
    if (this.mixer) {
      this.mixer.update(dt);
    }
    if (this.currentCompanion?.axie && typeof this.currentCompanion.axie.update === 'function') {
      this.currentCompanion.axie.update(dt);
    }

    // 2. Smooth rotation lerp
    if (!this.isDragging) {
      // Smooth decay of inertia or slow idle turntable
      this.characterRotationY += (this.targetRotationY - this.characterRotationY) * 0.12;
    }

    if (this.characterGroup) {
      this.characterGroup.rotation.y = this.characterRotationY;
    }
    if (this.companionGroup) {
      this.companionGroup.rotation.y = this.characterRotationY - Math.PI / 6;
    }

    // 3. No platform animation

    // 5. Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Captura un retrato 3D centrado en el busto y rostro del Sapidae
   * con la personalización y pose idle activas en el diorama
   */
  capturePortrait() {
    if (!this.renderer || !this.scene || !this.currentModel) return null;

    const compVis = this.companionGroup ? this.companionGroup.visible : true;
    const pedVis = this.pedestalBase ? this.pedestalBase.visible : true;
    const shadowVis = this.contactShadow ? this.contactShadow.visible : true;

    if (this.companionGroup) this.companionGroup.visible = false;
    if (this.pedestalBase) this.pedestalBase.visible = false;
    if (this.contactShadow) this.contactShadow.visible = false;

    const origPos = this.camera.position.clone();
    const origRotY = this.characterGroup ? this.characterGroup.rotation.y : 0;

    // Orientación heroica 3/4 hacia la cámara
    if (this.characterGroup) {
      this.characterGroup.rotation.y = -0.15;
    }

    // Encuadre de cuerpo entero parado: desde los cuernos/cabeza hasta los pies
    this.camera.position.set(0, 0.95, 3.4);
    this.camera.lookAt(0, 0.88, 0);
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restaurar encuadre general del diorama
    this.camera.position.copy(origPos);
    this.camera.lookAt(0, 0.92, 0);
    this.camera.updateProjectionMatrix();

    if (this.characterGroup) {
      this.characterGroup.rotation.y = origRotY;
    }
    if (this.companionGroup) this.companionGroup.visible = compVis;
    if (this.pedestalBase) this.pedestalBase.visible = pedVis;
    if (this.contactShadow) this.contactShadow.visible = shadowVis;

    return dataUrl;
  }

  /**
   * Hito 113 (memoria): quita del visor el Sapidae mostrado y lo libera (GPU e imágenes decodificadas). Cancela antes sus
   * repintados pendientes (leen las imágenes originales, que se cierran aquí) y su contorno.
   */
  _releaseCurrentSapidae() {
    const model = this.currentModel;
    const gltf = this._currentGltf;
    this.currentModel = null;
    this._currentGltf = null;
    this.activeAction = null;
    if (this.toonOutline) { try { this.toonOutline.dispose(); } catch (_) { /* opcional */ } this.toonOutline = null; }
    if (model) {
      if (model.parent) model.parent.remove(model);
      const timers = model.userData && model.userData._deferTimers;
      if (timers) Object.values(timers).forEach((t) => { if (t) clearTimeout(t); });
    }
    if (gltf && gltf.__lkPath) { unholdGLTF(gltf.__lkPath); gltf.__lkPath = null; }
    const st = releaseClone(gltf); // solo lo propio de la copia: las texturas e imágenes son de la caché y las usa también el mundo
    if (st) perfMark(`memoria: copia del Sapidae liberada (${st.geometrias} geometrías, ${st.esqueletos} esqueletos)`);
  }

  dispose() {
    this.stop();
    this._companionToken = (this._companionToken || 0) + 1; // una carga en curso se libera al llegar
    this._disposeCompanion();
    this._releaseCurrentSapidae();
    // Hito 113 (memoria): cada diorama tiene su propio controlador de teñido y sus cachés (~120 MB en el creador)
    try { this.modularController?.releaseCaches?.(); } catch (_) { /* opcional */ }

    if (this.toonOutline) {
      this.toonOutline.dispose();
      this.toonOutline = null;
    }
    if (this.companionToonOutline) {
      this.companionToonOutline.dispose();
      this.companionToonOutline = null;
    }

    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    if (this.renderer) {
      this.renderer.dispose();
      // Hito 135: cerrar el contexto WebGL ya. Sin esto queda vivo hasta que el navegador lo recoge y, tras unas cuantas
      // aperturas del creador / visor, Chrome supera su límite (~16) y cierra el MÁS ANTIGUO: el del juego (pantalla negra).
      try { this.renderer.forceContextLoss(); } catch (_) { /* opcional */ }
      this.renderer = null;
    }
  }
}
