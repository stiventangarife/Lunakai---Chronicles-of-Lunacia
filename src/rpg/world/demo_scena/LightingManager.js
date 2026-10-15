import * as THREE from 'three';
import { applyGenshinGoldenHour } from './genshin/GenshinArtDirection.js';

/**
 * Gestor de Iluminación estilizada Fantasy MMORPG para Demo_Scena en Macro-Zona [2, 2].
 * Soporta sombras suaves, luces hemisféricas y presets dinámicos de hora del día.
 */
export class LightingManager {
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.dirLight = null;
    this.hemiLight = null;
    this.ambientLight = null;

    this.currentPreset = 'sunset'; // 'sunset', 'daylight', 'morning'
    this._lightOffset = new THREE.Vector3(120, 75, -95).normalize().multiplyScalar(150);

    this.initLights();
    this.applyPreset(this.currentPreset);
  }

  initLights() {
    // 1. Sol DirectionalLight principal con sombras suaves
    this.dirLight = new THREE.DirectionalLight(0xfff3db, 2.2);
    this.dirLight.castShadow = true;

    // Configuración de resolución de sombras
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1.0;
    this.dirLight.shadow.camera.far = 380;

    // Área de sombra que cubre la región de exploración
    const shadowD = 130;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.dirLight.shadow.bias = 0.00002;
    this.dirLight.shadow.normalBias = 0.025;

    this.group.add(this.dirLight);
    this.group.add(this.dirLight.target);

    // 2. Luz Hemisférica: cielo azul pastel / suelo verde cálido reflejado
    this.hemiLight = new THREE.HemisphereLight(0xbadbff, 0x5a7a40, 1.1);
    this.group.add(this.hemiLight);

    // 3. Luz ambiental suave de relleno
    this.ambientLight = new THREE.AmbientLight(0xffeed6, 0.45);
    this.group.add(this.ambientLight);
  }

  applyPreset(presetKey) {
    this.currentPreset = presetKey;

    if (presetKey === 'sunset') {
      // Tarde Dorada / Atardecer Anime Cálido (Genshin style)
      this.dirLight.position.set(120, 75, -95);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffcb8a);
      this.dirLight.intensity = 2.4;
      this._lightOffset.set(120, 75, -95).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0xffd1b3); // Cielo dorado/ámbar
      this.hemiLight.groundColor.setHex(0x526b38);
      this.hemiLight.intensity = 1.25;

      this.ambientLight.color.setHex(0xffcca3);
      this.ambientLight.intensity = 0.55;

      return {
        fogColor: 0xe6b993,
        fogNear: 65,
        fogFar: 290,
        skyTop: 0x487ba6,
        skyBottom: 0xffb785
      };
    } else if (presetKey === 'daylight') {
      this.dirLight.position.set(60, 140, 40);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffffff);
      this.dirLight.intensity = 2.6;
      this._lightOffset.set(60, 140, 40).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0x9bd7ff);
      this.hemiLight.groundColor.setHex(0x608a40);
      this.hemiLight.intensity = 1.3;

      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.5;

      return {
        fogColor: 0xb5daf0,
        fogNear: 85,
        fogFar: 320,
        skyTop: 0x2475bd,
        skyBottom: 0xa4dcf5
      };
    } else if (presetKey === 'morning') {
      this.dirLight.position.set(-110, 55, -60);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffe5c2);
      this.dirLight.intensity = 1.8;
      this._lightOffset.set(-110, 55, -60).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0xa9cce8);
      this.hemiLight.groundColor.setHex(0x43623a);
      this.hemiLight.intensity = 1.0;

      this.ambientLight.color.setHex(0xccdbee);
      this.ambientLight.intensity = 0.6;

      return {
        fogColor: 0xa5c1d6,
        fogNear: 45,
        fogFar: 240,
        skyTop: 0x3d668c,
        skyBottom: 0xcbe2f2
      };
    } else if (presetKey === 'genshin_golden') {
      // Island 1 Genshin art pass: warm golden hour with cool blue shadows
      return applyGenshinGoldenHour(this);
    } else if (presetKey === 'savanna' || presetKey === 'desert_sun') {
      this.dirLight.position.set(130, 95, -70);
      this.dirLight.target.position.set(0, 0, 0);
      this.dirLight.color.setHex(0xffdf99);
      this.dirLight.intensity = 2.7;
      this._lightOffset.set(130, 95, -70).normalize().multiplyScalar(150);

      this.hemiLight.color.setHex(0xffe6a8); // Warm golden sky
      this.hemiLight.groundColor.setHex(0x995a2b); // Terracotta ground bounce
      this.hemiLight.intensity = 1.35;

      this.ambientLight.color.setHex(0xfce2b8);
      this.ambientLight.intensity = 0.55;

      return {
        fogColor: 0xe8be88,
        fogNear: 150,
        fogFar: 1400,
        skyTop: 0x367ea8,
        skyBottom: 0xffce8a
      };
    }
  }

  setShadows(enabled) {
    this.dirLight.castShadow = enabled;
  }

  updateLightTarget(targetPosition) {
    if (this.dirLight && targetPosition) {
      this.dirLight.position.copy(targetPosition).add(this._lightOffset);
      this.dirLight.target.position.copy(targetPosition);
      this.dirLight.target.updateMatrixWorld();
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (this.dirLight) this.dirLight.visible = visible;
    if (this.hemiLight) this.hemiLight.visible = visible;
    if (this.ambientLight) this.ambientLight.visible = visible;
  }
}
