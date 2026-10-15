import * as THREE from 'three';

/**
 * Gestor de Atmósfera: Niebla atmosférica cálida estilo Demo_Scena, domo celeste fantasy y ambientación
 * para Macro-Zona [2, 2].
 */
export class AtmosphereManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.group.name = 'DemoScenaAtmosphereGroup';
    this.scene.add(this.group);

    this.skyDome = null;
    this.skyMaterial = null;
    this.fogEnabled = true;
    this.isActive = true;

    this.currentFogColor = 0xe6b993; // Cálido melocotón atardecer
    this.currentFogNear = 65;
    this.currentFogFar = 290;

    this.savedFog = null;
    this.savedBackground = null;

    this.initSky();
    this.initAtmosphericFog();
  }

  initSky() {
    // Domo de cielo semiesférico estilizado con shader de gradiente (ampliado para cubrir horizonte oceánico e islas a >1.5km)
    const skyGeo = new THREE.SphereGeometry(3400, 32, 24);
    skyGeo.scale(-1, 1, 1);

    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x487ba6) },
        uBottomColor: { value: new THREE.Color(0xffb785) },
        uSunPosition: { value: new THREE.Vector3(0.5, 0.4, -0.6).normalize() },
        uSunColor: { value: new THREE.Color(0xfff1cf) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunPosition;
        uniform vec3 uSunColor;
        varying vec3 vWorldPosition;

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float factor = clamp((dir.y + 0.05) * 1.6, 0.0, 1.0);
          vec3 skyColor = mix(uBottomColor, uTopColor, factor);

          // Resplandor del sol estilizado
          float sunDot = clamp(dot(dir, uSunPosition), 0.0, 1.0);
          float sunGlow = (sunDot > 0.001) ? pow(sunDot, 64.0) * 0.9 : 0.0;
          float sunHalo = (sunDot > 0.001) ? pow(sunDot, 8.0) * 0.25 : 0.0;
          skyColor += uSunColor * (sunGlow + sunHalo);

          gl_FragColor = vec4(skyColor, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.group.add(this.skyDome);
  }

  initAtmosphericFog() {
    this.applyAtmosphereToScene();
  }

  applyPresetAtmosphere(presetData) {
    if (!presetData) return;

    if (presetData.fogColor !== undefined) this.currentFogColor = presetData.fogColor;
    if (presetData.fogNear !== undefined) this.currentFogNear = presetData.fogNear;
    if (presetData.fogFar !== undefined) this.currentFogFar = presetData.fogFar;

    if (this.skyMaterial) {
      if (presetData.skyTop !== undefined) this.skyMaterial.uniforms.uTopColor.value.setHex(presetData.skyTop);
      if (presetData.skyBottom !== undefined) this.skyMaterial.uniforms.uBottomColor.value.setHex(presetData.skyBottom);
    }

    this.applyAtmosphereToScene();
  }

  applyAtmosphereToScene() {
    if (!this.isActive) return;

    // Despejar el fondo sólido para que el skyDome y clearColor sean visibles limpiamente
    if (this.scene) {
      this.scene.background = null;
      if (this.fogEnabled) {
        if (!this.scene.fog || !(this.scene.fog instanceof THREE.Fog)) {
          this.scene.fog = new THREE.Fog(this.currentFogColor, this.currentFogNear, this.currentFogFar);
        } else {
          this.scene.fog.color.setHex(this.currentFogColor);
          this.scene.fog.near = this.currentFogNear;
          this.scene.fog.far = this.currentFogFar;
        }
      } else if (this.scene.fog) {
        this.scene.fog.far = 999999;
      }
    }

    if (this.renderer) {
      this.renderer.setClearColor(this.currentFogColor);
    }
  }

  setFog(enabled) {
    this.fogEnabled = enabled;
    if (this.scene && this.scene.fog) {
      if (enabled) {
        this.scene.fog.far = this.currentFogFar || 280;
      } else {
        this.scene.fog.far = 999999;
      }
    }
  }

  update(delta, playerPos) {
    if (this.skyDome && playerPos) {
      this.skyDome.position.x = playerPos.x;
      this.skyDome.position.z = playerPos.z;
    }
  }

  setVisible(visible) {
    this.isActive = visible;
    this.group.visible = visible;
    if (this.skyDome) {
      this.skyDome.visible = visible;
    }

    if (visible) {
      if (this.scene) {
        if (this.scene.fog && !(this.scene.fog instanceof THREE.Fog)) {
          this.savedFog = this.scene.fog;
        }
        if (this.scene.background) {
          this.savedBackground = this.scene.background;
        }
      }
      this.applyAtmosphereToScene();
    } else {
      if (this.savedFog && this.scene) {
        this.scene.fog = this.savedFog;
      }
      if (this.savedBackground && this.scene) {
        this.scene.background = this.savedBackground;
      }
    }
  }
}
