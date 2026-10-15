import * as THREE from 'three';

/**
 * FootstepEffectsManager.js - Sistema de Game Feel para Huellas y Polvo al Caminar
 *
 * Características:
 * 1. Huellas de Botas de Explorador para Sapidae (alternando pie izquierdo/derecho).
 * 2. Huellas de Patitas adorables (Paws) para el Axie Compañero.
 * 3. Bocanadas de Polvo Stylized Anime (Dust Puffs) que se expanden y desvanecen al dar cada paso.
 * 4. Orientación conforme a la normal del terreno en colinas, cuestas y senderos.
 * 5. Sistema 100% optimizado mediante InstancedMesh con frustumCulled=false y shaders ligeros.
 */

// =========================================================================
// 1. GENERADORES DE TEXTURAS PROCEDURALES EN CANVAS 2D
// =========================================================================

function createBootPrintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 256);

  // Pigmento tierra oscura / huella prensada
  ctx.fillStyle = '#1c1209';

  // 1. Tacón (Heel Pad)
  ctx.beginPath();
  ctx.ellipse(64, 195, 26, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Arco y planta del pie (Sole Pad)
  ctx.beginPath();
  ctx.ellipse(64, 92, 36, 56, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Hendiduras de agarre / suela de bota de aventurero
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 4;
  for (let y = 60; y <= 125; y += 16) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(92, y);
    ctx.stroke();
  }

  // 4. Borde suave exterior
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createPawPrintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 128);

  // Pigmento tierra oscura
  ctx.fillStyle = '#1e130a';

  // 1. Almohadilla central de Axie (forma de corazón redondeado)
  ctx.beginPath();
  ctx.ellipse(64, 78, 32, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 3 deditos en arco superior
  const toes = [
    { x: 36, y: 38, rx: 12, ry: 16, rot: -0.35 },
    { x: 64, y: 28, rx: 13, ry: 17, rot: 0.00 },
    { x: 92, y: 38, rx: 12, ry: 16, rot: 0.35 }
  ];

  for (const t of toes) {
    ctx.beginPath();
    ctx.ellipse(t.x, t.y, t.rx, t.ry, t.rot, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createDustPuffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 128);

  // Nube de polvo suave anime con gradiente esférico
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(245, 235, 215, 0.88)');
  grad.addColorStop(0.65, 'rgba(225, 210, 180, 0.45)');
  grad.addColorStop(1.0, 'rgba(200, 180, 150, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();

  // Lóbulos secundarios para apariencia esponjosa estilo Genshin / BotW
  const lobes = [
    { x: 48, y: 46, r: 30 },
    { x: 80, y: 50, r: 28 },
    { x: 64, y: 78, r: 32 }
  ];
  for (const lb of lobes) {
    const lGrad = ctx.createRadialGradient(lb.x, lb.y, 4, lb.x, lb.y, lb.r);
    lGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    lGrad.addColorStop(1, 'rgba(230, 215, 190, 0.0)');
    ctx.fillStyle = lGrad;
    ctx.beginPath();
    ctx.arc(lb.x, lb.y, lb.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// =========================================================================
// 2. GESTOR PRINCIPAL
// =========================================================================

export class FootstepEffectsManager {
  constructor(parentGroup, terrain) {
    this.terrain = terrain;

    this.group = new THREE.Group();
    this.group.name = 'FootstepEffects_Group';
    parentGroup.add(this.group);

    // Texturas
    this.bootTex = createBootPrintTexture();
    this.pawTex = createPawPrintTexture();
    this.dustTex = createDustPuffTexture();

    // Capacidades de pools
    this.maxBootPrints = 60;
    this.maxPawPrints = 60;
    this.maxDustPuffs = 64;

    this.bootIndex = 0;
    this.pawIndex = 0;
    this.dustIndex = 0;

    this.bootData = [];
    this.pawData = [];
    this.dustData = [];

    // Tracking de zancadas
    this.lastPlayerPos = new THREE.Vector3(-9999, -9999, -9999);
    this.playerStepAccum = 0;
    this.playerLeftFoot = false;

    this.lastAxiePos = new THREE.Vector3(-9999, -9999, -9999);
    this.axieStepAccum = 0;
    this.axieLeftPaw = false;

    // Herramientas matemáticas reutilizables
    this._dummy = new THREE.Object3D();
    this._normal = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._scratchVec = new THREE.Vector3();
    this._tangent = new THREE.Vector3();
    this._bitangent = new THREE.Vector3();
    this._negTangent = new THREE.Vector3();
    this._negBitangent = new THREE.Vector3();
    this._basisMatrix = new THREE.Matrix4();

    this._hasLoggedFirstStep = false;

    this._initBootMesh();
    this._initPawMesh();
    this._initDustMesh();

    console.log('[FootstepEffectsManager] 👣 Sistema de Huellas y Polvo inicializado correctamente.');
  }

  // -----------------------------------------------------------------------
  // Inicialización de Huellas de Botas (Sapidae)
  // -----------------------------------------------------------------------
  _initBootMesh() {
    const geo = new THREE.PlaneGeometry(0.26, 0.46);
    geo.rotateX(-Math.PI / 2);

    this.bootAlphas = new Float32Array(this.maxBootPrints);
    this.bootAlphaAttr = new THREE.InstancedBufferAttribute(this.bootAlphas, 1);
    this.bootAlphaAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aAlpha', this.bootAlphaAttr);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2.5,
      polygonOffsetUnits: -4.0,
      uniforms: {
        uTexture: { value: this.bootTex },
        uColor: { value: new THREE.Color('#1c130a') }
      },
      vertexShader: `
        attribute float aAlpha;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.005) discard;
          vec4 tex = texture2D(uTexture, vUv);
          if (tex.a < 0.04) discard;
          gl_FragColor = vec4(uColor, tex.a * vAlpha);
        }
      `
    });

    this.bootMesh = new THREE.InstancedMesh(geo, mat, this.maxBootPrints);
    this.bootMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bootMesh.frustumCulled = false;
    this.bootMesh.renderOrder = 15;
    this.group.add(this.bootMesh);

    for (let i = 0; i < this.maxBootPrints; i++) {
      this.bootData.push({ active: false, life: 0, maxLife: 5.2 });
      this._dummy.position.set(0, -9999, 0);
      this._dummy.scale.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.bootMesh.setMatrixAt(i, this._dummy.matrix);
      this.bootAlphas[i] = 0.0;
    }
    this.bootMesh.instanceMatrix.needsUpdate = true;
    this.bootAlphaAttr.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Inicialización de Huellas de Patitas (Axie)
  // -----------------------------------------------------------------------
  _initPawMesh() {
    const geo = new THREE.PlaneGeometry(0.24, 0.24);
    geo.rotateX(-Math.PI / 2);

    this.pawAlphas = new Float32Array(this.maxPawPrints);
    this.pawAlphaAttr = new THREE.InstancedBufferAttribute(this.pawAlphas, 1);
    this.pawAlphaAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aAlpha', this.pawAlphaAttr);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2.5,
      polygonOffsetUnits: -4.0,
      uniforms: {
        uTexture: { value: this.pawTex },
        uColor: { value: new THREE.Color('#1c130a') }
      },
      vertexShader: `
        attribute float aAlpha;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.005) discard;
          vec4 tex = texture2D(uTexture, vUv);
          if (tex.a < 0.04) discard;
          gl_FragColor = vec4(uColor, tex.a * vAlpha);
        }
      `
    });

    this.pawMesh = new THREE.InstancedMesh(geo, mat, this.maxPawPrints);
    this.pawMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pawMesh.frustumCulled = false;
    this.pawMesh.renderOrder = 15;
    this.group.add(this.pawMesh);

    for (let i = 0; i < this.maxPawPrints; i++) {
      this.pawData.push({ active: false, life: 0, maxLife: 5.2 });
      this._dummy.position.set(0, -9999, 0);
      this._dummy.scale.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.pawMesh.setMatrixAt(i, this._dummy.matrix);
      this.pawAlphas[i] = 0.0;
    }
    this.pawMesh.instanceMatrix.needsUpdate = true;
    this.pawAlphaAttr.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Inicialización de Polvo (Dust Puffs) con Billboarding en View Space
  // -----------------------------------------------------------------------
  _initDustMesh() {
    const geo = new THREE.PlaneGeometry(1.0, 1.0);

    this.dustAlphas = new Float32Array(this.maxDustPuffs);
    this.dustScales = new Float32Array(this.maxDustPuffs);
    this.dustAlphaAttr = new THREE.InstancedBufferAttribute(this.dustAlphas, 1);
    this.dustScaleAttr = new THREE.InstancedBufferAttribute(this.dustScales, 1);
    this.dustAlphaAttr.setUsage(THREE.DynamicDrawUsage);
    this.dustScaleAttr.setUsage(THREE.DynamicDrawUsage);

    geo.setAttribute('aAlpha', this.dustAlphaAttr);
    geo.setAttribute('aScale', this.dustScaleAttr);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTexture: { value: this.dustTex },
        uColor: { value: new THREE.Color('#ede4d0') }
      },
      vertexShader: `
        attribute float aAlpha;
        attribute float aScale;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          // Billboarding perfecto en View Space
          vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mvPos.xy += position.xy * aScale;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.005) discard;
          vec4 tex = texture2D(uTexture, vUv);
          if (tex.a < 0.02) discard;
          gl_FragColor = vec4(uColor * (0.85 + 0.15 * tex.r), tex.a * vAlpha);
        }
      `
    });

    this.dustMesh = new THREE.InstancedMesh(geo, mat, this.maxDustPuffs);
    this.dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dustMesh.frustumCulled = false;
    this.dustMesh.renderOrder = 25;
    this.group.add(this.dustMesh);

    for (let i = 0; i < this.maxDustPuffs; i++) {
      this.dustData.push({
        active: false,
        pos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 0.45,
        baseScale: 0.35
      });
      this._dummy.position.set(0, -9999, 0);
      this._dummy.scale.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this._dummy.matrix);
      this.dustAlphas[i] = 0.0;
      this.dustScales[i] = 0.0;
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.dustAlphaAttr.needsUpdate = true;
    this.dustScaleAttr.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Estampar Huella de Bota (Sapidae)
  // -----------------------------------------------------------------------
  addBootPrint(x, z, yaw, isLeftFoot = false) {
    const groundY = this.terrain ? this.terrain.getHeight(x, z) : 0;
    const norm = this.terrain ? this.terrain.getNormal(x, z) : new THREE.Vector3(0, 1, 0);

    const idx = this.bootIndex;
    this.bootIndex = (this.bootIndex + 1) % this.maxBootPrints;

    // Ángulo de avance con ligera apertura natural del pie (toe-out)
    const footAngle = yaw + (isLeftFoot ? -0.05 : 0.05);
    this._fwd.set(Math.sin(footAngle), 0, Math.cos(footAngle));
    this._normal.copy(norm);
    const dotB = this._fwd.dot(this._normal);
    this._scratchVec.copy(this._normal).multiplyScalar(dotB);
    this._tangent.copy(this._fwd).sub(this._scratchVec).normalize();
    this._bitangent.crossVectors(this._normal, this._tangent).normalize();

    // Orientar hacia adelante en la dirección de la marcha (puntera al frente)
    this._negBitangent.copy(this._bitangent).negate();
    this._negTangent.copy(this._tangent).negate();
    this._basisMatrix.makeBasis(this._negBitangent, this._normal, this._negTangent);
    this._basisMatrix.setPosition(
      x + norm.x * 0.035,
      groundY + norm.y * 0.035,
      z + norm.z * 0.035
    );

    this.bootMesh.setMatrixAt(idx, this._basisMatrix);
    this.bootAlphas[idx] = 0.78; // Opacidad nítida inicial

    const d = this.bootData[idx];
    d.active = true;
    d.life = 0;
    d.maxLife = 5.2;

    this.bootMesh.instanceMatrix.needsUpdate = true;
    this.bootAlphaAttr.needsUpdate = true;

    if (!this._hasLoggedFirstStep) {
      this._hasLoggedFirstStep = true;
      console.log('[FootstepEffectsManager] 👣 Primera huella de Sapidae estampada en:', x.toFixed(1), groundY.toFixed(1), z.toFixed(1));
    }
  }

  // -----------------------------------------------------------------------
  // Estampar Huella de Patita (Axie)
  // -----------------------------------------------------------------------
  addPawPrint(x, z, yaw) {
    const groundY = this.terrain ? this.terrain.getHeight(x, z) : 0;
    const norm = this.terrain ? this.terrain.getNormal(x, z) : new THREE.Vector3(0, 1, 0);

    const idx = this.pawIndex;
    this.pawIndex = (this.pawIndex + 1) % this.maxPawPrints;

    this._fwd.set(Math.sin(yaw), 0, Math.cos(yaw));
    this._normal.copy(norm);
    const dotP = this._fwd.dot(this._normal);
    this._scratchVec.copy(this._normal).multiplyScalar(dotP);
    this._tangent.copy(this._fwd).sub(this._scratchVec).normalize();
    this._bitangent.crossVectors(this._normal, this._tangent).normalize();

    // Orientar patitas hacia adelante en la dirección de la marcha (deditos al frente)
    this._negBitangent.copy(this._bitangent).negate();
    this._negTangent.copy(this._tangent).negate();
    this._basisMatrix.makeBasis(this._negBitangent, this._normal, this._negTangent);
    this._basisMatrix.setPosition(
      x + norm.x * 0.035,
      groundY + norm.y * 0.035,
      z + norm.z * 0.035
    );

    this.pawMesh.setMatrixAt(idx, this._basisMatrix);
    this.pawAlphas[idx] = 0.75;

    const d = this.pawData[idx];
    d.active = true;
    d.life = 0;
    d.maxLife = 5.2;

    this.pawMesh.instanceMatrix.needsUpdate = true;
    this.pawAlphaAttr.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Levantar Bocanada de Polvo (Dust Puff)
  // -----------------------------------------------------------------------
  addDustPuff(x, y, z, moveFwdX, moveFwdZ, scaleMultiplier = 1.0) {
    const idx = this.dustIndex;
    this.dustIndex = (this.dustIndex + 1) % this.maxDustPuffs;

    const d = this.dustData[idx];
    d.active = true;
    d.life = 0;
    d.maxLife = 0.44 + Math.random() * 0.10;
    d.baseScale = (0.32 + Math.random() * 0.08) * scaleMultiplier;

    d.pos.set(
      x + (Math.random() - 0.5) * 0.10,
      y + 0.07,
      z + (Math.random() - 0.5) * 0.10
    );

    // Impulso hacia arriba y sutil retroceso
    d.vel.set(
      -moveFwdX * 0.35 + (Math.random() - 0.5) * 0.20,
      0.35 + Math.random() * 0.20,
      -moveFwdZ * 0.35 + (Math.random() - 0.5) * 0.20
    );

    this._dummy.position.copy(d.pos);
    this._dummy.scale.set(1, 1, 1);
    this._dummy.updateMatrix();
    this.dustMesh.setMatrixAt(idx, this._dummy.matrix);

    this.dustAlphas[idx] = 0.80;
    this.dustScales[idx] = d.baseScale * 0.35;

    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.dustAlphaAttr.needsUpdate = true;
    this.dustScaleAttr.needsUpdate = true;
  }

  // -----------------------------------------------------------------------
  // Ciclo de Actualización por Frame
  // -----------------------------------------------------------------------
  update(delta, player) {
    if (!player) return;

    // =====================================================================
    // 1. DETECCIÓN DE ZANCADA PARA SAPIDAE
    // =====================================================================
    if (this.lastPlayerPos.x === -9999) {
      this.lastPlayerPos.copy(player.position);
    }

    const distMovedPlayer = Math.hypot(
      player.position.x - this.lastPlayerPos.x,
      player.position.z - this.lastPlayerPos.z
    );

    const isMovingPlayer = distMovedPlayer > 0.004 || (player.currentAnim === 'run' || player.currentAnim === 'walk');

    if (isMovingPlayer && distMovedPlayer > 0.001) {
      this.playerStepAccum += distMovedPlayer;

      const strideDist = player.currentAnim === 'run' ? 0.95 : 0.72;
      if (this.playerStepAccum >= strideDist) {
        this.playerStepAccum -= strideDist;
        this.playerLeftFoot = !this.playerLeftFoot;

        const rightX = Math.cos(player.yaw);
        const rightZ = -Math.sin(player.yaw);
        const fwdX = Math.sin(player.yaw);
        const fwdZ = Math.cos(player.yaw);

        // Separación lateral del pie
        const sideOffset = this.playerLeftFoot ? -0.18 : 0.18;
        const footX = player.position.x + rightX * sideOffset;
        const footZ = player.position.z + rightZ * sideOffset;

        // Estampar huella orientada al frente con inclinación natural de pie
        this.addBootPrint(footX, footZ, player.yaw, this.playerLeftFoot);

        // Levantar polvo más discreto y proporcionado
        const dustScale = player.currentAnim === 'run' ? 1.10 : 0.60;
        this.addDustPuff(footX, player.position.y, footZ, fwdX, fwdZ, dustScale);
      }
    } else if (!isMovingPlayer) {
      this.playerStepAccum = 0;
    }
    this.lastPlayerPos.copy(player.position);

    // =====================================================================
    // 2. DETECCIÓN DE ZANCADA PARA AXIE COMPAÑERO
    // =====================================================================
    if (player.companionGroup) {
      if (this.lastAxiePos.x === -9999) {
        this.lastAxiePos.copy(player.companionGroup.position);
      }

      const distMovedAxie = Math.hypot(
        player.companionGroup.position.x - this.lastAxiePos.x,
        player.companionGroup.position.z - this.lastAxiePos.z
      );

      const isMovingAxie = distMovedAxie > 0.004 || (player.companionState && player.companionState !== 'idle');

      if (isMovingAxie && distMovedAxie > 0.001) {
        this.axieStepAccum += distMovedAxie;

        const axieStride = player.companionState === 'run' ? 0.80 : 0.58;
        if (this.axieStepAccum >= axieStride) {
          this.axieStepAccum -= axieStride;
          this.axieLeftPaw = !this.axieLeftPaw;

          const cYaw = player.companionYaw || player.yaw;
          const rightCX = Math.cos(cYaw);
          const rightCZ = -Math.sin(cYaw);
          const fwdCX = Math.sin(cYaw);
          const fwdCZ = Math.cos(cYaw);

          const sideOffset = this.axieLeftPaw ? -0.13 : 0.13;
          const pawX = player.companionGroup.position.x + rightCX * sideOffset;
          const pawZ = player.companionGroup.position.z + rightCZ * sideOffset;

          // Estampar huellita
          this.addPawPrint(pawX, pawZ, cYaw);

          // Polvito pequeño para el Axie
          const axieDustScale = player.companionState === 'run' ? 0.65 : 0.38;
          this.addDustPuff(pawX, player.companionGroup.position.y, pawZ, fwdCX, fwdCZ, axieDustScale);
        }
      } else if (!isMovingAxie) {
        this.axieStepAccum = 0;
      }
      this.lastAxiePos.copy(player.companionGroup.position);
    }

    // =====================================================================
    // 3. ACTUALIZACIÓN Y DESVANECIMIENTO DE HUELLAS (Botas)
    // =====================================================================
    let bootNeedsUpdate = false;
    for (let i = 0; i < this.maxBootPrints; i++) {
      const d = this.bootData[i];
      if (!d.active) continue;

      d.life += delta;
      if (d.life >= d.maxLife) {
        d.active = false;
        this.bootAlphas[i] = 0.0;
        bootNeedsUpdate = true;
      } else {
        const fadeStart = 2.8;
        if (d.life > fadeStart) {
          const t = (d.life - fadeStart) / (d.maxLife - fadeStart);
          this.bootAlphas[i] = 0.78 * (1.0 - t);
          bootNeedsUpdate = true;
        }
      }
    }
    if (bootNeedsUpdate) {
      this.bootAlphaAttr.needsUpdate = true;
    }

    // =====================================================================
    // 4. ACTUALIZACIÓN Y DESVANECIMIENTO DE HUELLAS (Patitas)
    // =====================================================================
    let pawNeedsUpdate = false;
    for (let i = 0; i < this.maxPawPrints; i++) {
      const d = this.pawData[i];
      if (!d.active) continue;

      d.life += delta;
      if (d.life >= d.maxLife) {
        d.active = false;
        this.pawAlphas[i] = 0.0;
        pawNeedsUpdate = true;
      } else {
        const fadeStart = 2.8;
        if (d.life > fadeStart) {
          const t = (d.life - fadeStart) / (d.maxLife - fadeStart);
          this.pawAlphas[i] = 0.75 * (1.0 - t);
          pawNeedsUpdate = true;
        }
      }
    }
    if (pawNeedsUpdate) {
      this.pawAlphaAttr.needsUpdate = true;
    }

    // =====================================================================
    // 5. ANIMACIÓN Y DISPERSIÓN DE POLVO (Dust Puffs)
    // =====================================================================
    let dustNeedsUpdate = false;
    for (let i = 0; i < this.maxDustPuffs; i++) {
      const d = this.dustData[i];
      if (!d.active) continue;

      d.life += delta;
      if (d.life >= d.maxLife) {
        d.active = false;
        this.dustAlphas[i] = 0.0;
        this.dustScales[i] = 0.0;
        this._dummy.position.set(0, -9999, 0);
        this._dummy.scale.set(0, 0, 0);
        this._dummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, this._dummy.matrix);
        dustNeedsUpdate = true;
      } else {
        const progress = d.life / d.maxLife;

        d.pos.x += d.vel.x * delta;
        d.pos.y += d.vel.y * delta;
        d.pos.z += d.vel.z * delta;
        d.vel.multiplyScalar(Math.max(0.0, 1.0 - 2.8 * delta));

        this._dummy.position.copy(d.pos);
        this._dummy.scale.set(1, 1, 1);
        this._dummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, this._dummy.matrix);

        // Expansión suave y disipación final proporcionada
        const scaleNorm = Math.sin(Math.min(1.0, progress * 1.5) * Math.PI * 0.5);
        this.dustScales[i] = d.baseScale * (0.35 + scaleNorm * 0.65);
        this.dustAlphas[i] = 0.78 * (1.0 - Math.pow(progress, 1.3));

        dustNeedsUpdate = true;
      }
    }
    if (dustNeedsUpdate) {
      this.dustMesh.instanceMatrix.needsUpdate = true;
      this.dustAlphaAttr.needsUpdate = true;
      this.dustScaleAttr.needsUpdate = true;
    }
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }
}
