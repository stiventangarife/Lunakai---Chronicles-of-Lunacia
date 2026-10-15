import * as THREE from 'three';

/**
 * Gestor Avanzado de Sistemas de Partículas Atmosféricas y Mágicas para el Mundo MMORPG:
 * - Pradera: Hojas mecidas por el viento
 * - Bosque: Hojas multicolores en espiral
 * - Mirador y Riscos: Ráfagas de viento y estelas aerodinámicas
 * - Árbol Vital: Partículas mágicas verdes y luciérnagas titilantes
 * - Santuario Atia: Partículas de energía verde ascendentes
 * - Templo Dojō: Pétalos de cerezo (Sakura)
 */
export class ParticleSystemManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.enabled = true;
    this.time = 0;
    this._dummy = new THREE.Object3D();

    // Inicializar cada subsistema
    this.initPrairieLeaves();
    this.initForestLeaves();
    this.initWindGusts();
    this.initElderTreeParticles();
    this.initAtiaShrineParticles();
    this.initDojoSakuraPetals();
  }

  // ==========================================
  // 1. PRADERA: Hojas volando en el aire
  // ==========================================
  initPrairieLeaves() {
    const count = 180;
    const leafGeo = this.createLeafGeometry(0.36, 0.22);

    const leafMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    this.prairieLeavesMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
    this.prairieLeavesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.prairieLeavesMesh);

    this.prairieLeavesData = [];
    const colors = [
      new THREE.Color(0x6fe03d),
      new THREE.Color(0x9df545),
      new THREE.Color(0xc7ef45),
      new THREE.Color(0xf0d548)
    ];

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const x = -135 + Math.random() * 110;
      const z = -90 + Math.random() * 115;
      const groundH = this.terrain.getHeight(x, z);
      const y = groundH + 0.5 + Math.random() * 5.0;

      this.prairieLeavesData.push({
        baseX: x,
        baseZ: z,
        x: x,
        y: y,
        z: z,
        groundH: groundH,
        speedX: 3.5 + Math.random() * 2.5,
        speedZ: 2.0 + Math.random() * 2.0,
        rotSpeedX: (Math.random() - 0.5) * 5.0,
        rotSpeedY: (Math.random() - 0.5) * 4.0,
        rotSpeedZ: (Math.random() - 0.5) * 6.0,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        scale: 0.9 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.prairieLeavesMesh.setMatrixAt(i, dummy.matrix);
      this.prairieLeavesMesh.setColorAt(i, colors[i % colors.length]);
    }

    this.prairieLeavesMesh.instanceMatrix.needsUpdate = true;
    if (this.prairieLeavesMesh.instanceColor) {
      this.prairieLeavesMesh.instanceColor.needsUpdate = true;
    }
  }

  // ==========================================
  // 2. BOSQUE: Hojas de diferentes colores
  // ==========================================
  initForestLeaves() {
    const count = 320;
    const leafGeo = this.createLeafGeometry(0.38, 0.24);

    const leafMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    this.forestLeavesMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
    this.forestLeavesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.forestLeavesMesh);

    this.forestLeavesData = [];
    const colors = [
      new THREE.Color(0xf24a2e),
      new THREE.Color(0xf28b29),
      new THREE.Color(0xf5c338),
      new THREE.Color(0x56a633),
      new THREE.Color(0x8cb837)
    ];

    const forestCenterX = -70;
    const forestCenterZ = 105;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 65;
      const ang = Math.random() * Math.PI * 2;
      const x = forestCenterX + Math.cos(ang) * r;
      const z = forestCenterZ + Math.sin(ang) * r;
      const groundH = this.terrain.getHeight(x, z);
      const y = groundH + 1.0 + Math.random() * 12.0;

      this.forestLeavesData.push({
        baseX: x,
        baseZ: z,
        x: x,
        y: y,
        z: z,
        groundH: groundH,
        fallSpeed: 0.8 + Math.random() * 0.9,
        driftSpeedX: (Math.random() - 0.2) * 2.0,
        driftSpeedZ: (Math.random() - 0.2) * 2.0,
        rotSpeedX: (Math.random() - 0.5) * 4.0,
        rotSpeedY: (Math.random() - 0.5) * 4.0,
        rotSpeedZ: (Math.random() - 0.5) * 5.0,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        scale: 0.9 + Math.random() * 0.7,
        spiralFreq: 1.5 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2
      });

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.forestLeavesMesh.setMatrixAt(i, dummy.matrix);
      this.forestLeavesMesh.setColorAt(i, colors[i % colors.length]);
    }

    this.forestLeavesMesh.instanceMatrix.needsUpdate = true;
    if (this.forestLeavesMesh.instanceColor) {
      this.forestLeavesMesh.instanceColor.needsUpdate = true;
    }
  }

  // ==========================================
  // 3 & 4. MIRADOR Y RISCOS: Ráfagas de viento
  // ==========================================
  initWindGusts() {
    const count = 70;
    const gustGeo = new THREE.PlaneGeometry(3.6, 0.12);

    const gustMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float edgeX = sin(vUv.x * 3.14159);
          float edgeY = sin(vUv.y * 3.14159);
          float alpha = edgeX * edgeY * 0.65;
          gl_FragColor = vec4(0.85, 0.96, 1.0, alpha);
        }
      `
    });

    this.windGustsMesh = new THREE.InstancedMesh(gustGeo, gustMat, count);
    this.windGustsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.windGustsMesh);

    this.windGustsData = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const isOverlook = i < count * 0.5;
      let x, z, y;

      if (isOverlook) {
        x = 85 + Math.random() * 50;
        z = -95 + Math.random() * 50;
        y = this.terrain.getHeight(x, z) + 1.5 + Math.random() * 6.0;
      } else {
        x = 105 + Math.random() * 50;
        z = 55 + Math.random() * 60;
        y = this.terrain.getHeight(x, z) + 2.0 + Math.random() * 8.0;
      }

      this.windGustsData.push({
        isOverlook: isOverlook,
        x: x,
        y: y,
        z: z,
        speed: 18.0 + Math.random() * 12.0,
        curveFreq: 1.5 + Math.random() * 2.0,
        phase: Math.random() * Math.PI * 2
      });

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.windGustsMesh.setMatrixAt(i, dummy.matrix);
    }

    this.windGustsMesh.instanceMatrix.needsUpdate = true;
  }

  // ==========================================
  // 6. ÁRBOL VITAL: Partículas mágicas verdes y luciérnagas
  // ==========================================
  initElderTreeParticles() {
    const treeX = -8;
    const treeZ = -25;
    const treeY = this.terrain.getHeight(treeX, treeZ);

    const magicCount = 220;
    const magicGeo = new THREE.BufferGeometry();
    const magicPos = new Float32Array(magicCount * 3);
    const magicData = [];

    for (let i = 0; i < magicCount; i++) {
      const rad = 2.0 + Math.random() * 14.0;
      const ang = Math.random() * Math.PI * 2;
      const x = treeX + Math.cos(ang) * rad;
      const z = treeZ + Math.sin(ang) * rad;
      const y = treeY + 1.0 + Math.random() * 22.0;

      magicPos[i * 3 + 0] = x;
      magicPos[i * 3 + 1] = y;
      magicPos[i * 3 + 2] = z;

      magicData.push({
        rad: rad,
        ang: ang,
        y: y,
        vy: 1.2 + Math.random() * 1.8,
        orbitSpeed: 0.4 + Math.random() * 0.6
      });
    }

    magicGeo.setAttribute('position', new THREE.BufferAttribute(magicPos, 3));

    const magicMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 200.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = pow(max(0.0, 1.0 - dist * 2.0), 2.2);
          vec3 col = mix(vec3(0.35, 1.0, 0.55), vec3(0.85, 1.0, 0.9), glow * 0.7);
          gl_FragColor = vec4(col, glow * 0.95);
        }
      `
    });

    this.elderMagicParticles = new THREE.Points(magicGeo, magicMat);
    this.elderMagicData = magicData;
    this.elderTreePos = { x: treeX, y: treeY, z: treeZ };
    this.group.add(this.elderMagicParticles);

    // Luciérnagas titilantes
    const fireflyCount = 75;
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyPos = new Float32Array(fireflyCount * 3);
    const fireflySizes = new Float32Array(fireflyCount);
    const fireflyData = [];

    for (let i = 0; i < fireflyCount; i++) {
      const rad = 1.5 + Math.random() * 18.0;
      const ang = Math.random() * Math.PI * 2;
      const x = treeX + Math.cos(ang) * rad;
      const z = treeZ + Math.sin(ang) * rad;
      const y = treeY + 0.8 + Math.random() * 8.0;

      fireflyPos[i * 3 + 0] = x;
      fireflyPos[i * 3 + 1] = y;
      fireflyPos[i * 3 + 2] = z;
      fireflySizes[i] = 0.8;

      fireflyData.push({
        baseX: x,
        baseZ: z,
        y: y,
        pulseFreq: 2.0 + Math.random() * 4.0,
        wanderSpeed: 0.8 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2
      });
    }

    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
    fireflyGeo.setAttribute('size', new THREE.BufferAttribute(fireflySizes, 1));

    const fireflyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float size;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (260.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = pow(max(0.0, 1.0 - dist * 2.0), 2.0);
          vec3 col = mix(vec3(0.5, 1.0, 0.4), vec3(0.9, 1.0, 0.6), glow);
          gl_FragColor = vec4(col, glow * 0.95);
        }
      `
    });

    this.elderFireflies = new THREE.Points(fireflyGeo, fireflyMat);
    this.elderFirefliesData = fireflyData;
    this.group.add(this.elderFireflies);
  }

  // ==========================================
  // 7. SANTUARIO ATIA: Partículas verdes saliendo hacia el cielo
  // ==========================================
  initAtiaShrineParticles() {
    const shrineX = 115;
    const shrineZ = 65;
    const shrineY = this.terrain.getHeight(shrineX, shrineZ);

    const count = 180;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const data = [];

    for (let i = 0; i < count; i++) {
      const rad = Math.random() * 8.0;
      const ang = Math.random() * Math.PI * 2;
      const x = shrineX + Math.cos(ang) * rad;
      const z = shrineZ + Math.sin(ang) * rad;
      const y = shrineY + Math.random() * 26.0;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      data.push({
        rad: rad,
        ang: ang,
        y: y,
        vy: 2.2 + Math.random() * 2.8,
        swayFreq: 1.5 + Math.random() * 2.5
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 240.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = pow(max(0.0, 1.0 - dist * 2.0), 2.0);
          vec3 col = mix(vec3(0.28, 0.96, 0.62), vec3(0.75, 1.0, 0.88), glow * 0.6);
          gl_FragColor = vec4(col, glow * 0.9);
        }
      `
    });

    this.shrineParticles = new THREE.Points(geom, mat);
    this.shrineData = data;
    this.shrinePos = { x: shrineX, y: shrineY, z: shrineZ };
    this.group.add(this.shrineParticles);
  }

  // ==========================================
  // 8. TEMPLO DOJŌ: Hojas / Pétalos tipo Cerezo (Sakura)
  // ==========================================
  initDojoSakuraPetals() {
    const dojoX = -87.9;
    const dojoZ = 74.0;
    const dojoY = this.terrain.getHeight(dojoX, dojoZ);

    const count = 200;
    const petalGeo = this.createSakuraPetalGeometry();

    const petalMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    this.sakuraMesh = new THREE.InstancedMesh(petalGeo, petalMat, count);
    this.sakuraMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.sakuraMesh);

    this.sakuraData = [];
    const colors = [
      new THREE.Color(0xff9ebd),
      new THREE.Color(0xff80a6),
      new THREE.Color(0xffb8cf),
      new THREE.Color(0xffe0eb)
    ];

    const dummy = this._dummy;

    for (let i = 0; i < count; i++) {
      const rad = 3.0 + Math.random() * 26.0;
      const ang = Math.random() * Math.PI * 2;
      const x = dojoX + Math.cos(ang) * rad;
      const z = dojoZ + Math.sin(ang) * rad;
      const y = dojoY + 2.5 + Math.random() * 14.0;

      this.sakuraData.push({
        centerX: dojoX,
        centerZ: dojoZ,
        rad: rad,
        ang: ang,
        x: x,
        y: y,
        z: z,
        groundH: dojoY,
        fallSpeed: 0.9 + Math.random() * 0.8,
        swaySpeed: 1.8 + Math.random() * 2.2,
        rotSpeedX: (Math.random() - 0.5) * 4.5,
        rotSpeedY: (Math.random() - 0.5) * 3.5,
        rotSpeedZ: (Math.random() - 0.5) * 5.0,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        scale: 0.85 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      this.sakuraMesh.setMatrixAt(i, dummy.matrix);
      this.sakuraMesh.setColorAt(i, colors[i % colors.length]);
    }

    this.sakuraMesh.instanceMatrix.needsUpdate = true;
    if (this.sakuraMesh.instanceColor) {
      this.sakuraMesh.instanceColor.needsUpdate = true;
    }
  }

  createLeafGeometry(length = 0.35, width = 0.20) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(width, length * 0.45, 0, length);
    shape.quadraticCurveTo(-width, length * 0.45, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 4);
    geom.center();
    return geom;
  }

  createSakuraPetalGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.14, 0.10, 0.18, 0.26, 0.05, 0.38);
    shape.quadraticCurveTo(0.0, 0.32, -0.05, 0.38);
    shape.bezierCurveTo(-0.18, 0.26, -0.14, 0.10, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 4);
    geom.center();
    return geom;
  }

  update(delta) {
    if (!this.enabled || !this.group.visible) return;
    this.time += delta;

    const dummy = this._dummy;

    // 1. Pradera: Hojas mecidas
    if (this.prairieLeavesMesh) {
      for (let i = 0; i < this.prairieLeavesData.length; i++) {
        const d = this.prairieLeavesData[i];
        d.x += d.speedX * delta;
        d.z += d.speedZ * delta;
        d.y += Math.sin(this.time * 2.5 + d.phase) * delta * 0.8;

        d.rotX += d.rotSpeedX * delta;
        d.rotY += d.rotSpeedY * delta;
        d.rotZ += d.rotSpeedZ * delta;

        if (d.x > -20 || d.z > 50) {
          d.x = -135 + Math.random() * 20;
          d.z = -90 + Math.random() * 80;
          d.y = this.terrain.getHeight(d.x, d.z) + 0.5 + Math.random() * 4.0;
        }

        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
        dummy.scale.set(d.scale, d.scale, d.scale);
        dummy.updateMatrix();
        this.prairieLeavesMesh.setMatrixAt(i, dummy.matrix);
      }
      this.prairieLeavesMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Bosque: Hojas multicolores en espiral (CPU Optimizada: getHeight solo al reaparecer)
    if (this.forestLeavesMesh) {
      for (let i = 0; i < this.forestLeavesData.length; i++) {
        const d = this.forestLeavesData[i];
        d.y -= d.fallSpeed * delta;
        d.x += (Math.cos(this.time * d.spiralFreq + d.phase) * 1.5 + d.driftSpeedX) * delta;
        d.z += (Math.sin(this.time * d.spiralFreq + d.phase) * 1.5 + d.driftSpeedZ) * delta;

        d.rotX += d.rotSpeedX * delta;
        d.rotY += d.rotSpeedY * delta;
        d.rotZ += d.rotSpeedZ * delta;

        const limitH = (d.groundH !== undefined ? d.groundH : 2.0) + 0.2;
        if (d.y < limitH) {
          const forestCenterX = -70;
          const forestCenterZ = 105;
          const r = Math.sqrt(Math.random()) * 65;
          const ang = Math.random() * Math.PI * 2;
          d.x = forestCenterX + Math.cos(ang) * r;
          d.z = forestCenterZ + Math.sin(ang) * r;
          d.groundH = this.terrain.getHeight(d.x, d.z);
          d.y = d.groundH + 8.0 + Math.random() * 8.0;
        }

        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
        dummy.scale.set(d.scale, d.scale, d.scale);
        dummy.updateMatrix();
        this.forestLeavesMesh.setMatrixAt(i, dummy.matrix);
      }
      this.forestLeavesMesh.instanceMatrix.needsUpdate = true;
    }

    // 3 & 4. Mirador y Riscos: Ráfagas de viento
    if (this.windGustsMesh) {
      for (let i = 0; i < this.windGustsData.length; i++) {
        const d = this.windGustsData[i];
        d.x += d.speed * delta;
        d.z += d.speed * 0.6 * delta;

        if (d.isOverlook) {
          if (d.x > 140 || d.z > -40) {
            d.x = 80 + Math.random() * 15;
            d.z = -100 + Math.random() * 20;
            d.y = this.terrain.getHeight(d.x, d.z) + 1.5 + Math.random() * 5.0;
          }
        } else {
          if (d.x > 160 || d.z > 120) {
            d.x = 100 + Math.random() * 15;
            d.z = 50 + Math.random() * 20;
            d.y = this.terrain.getHeight(d.x, d.z) + 2.0 + Math.random() * 7.0;
          }
        }

        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(0, Math.PI * 0.2, 0);
        dummy.updateMatrix();
        this.windGustsMesh.setMatrixAt(i, dummy.matrix);
      }
      this.windGustsMesh.instanceMatrix.needsUpdate = true;
    }

    // 6. Árbol Vital: Esporas mágicas y luciérnagas
    if (this.elderMagicParticles) {
      const posAttr = this.elderMagicParticles.geometry.attributes.position;
      for (let i = 0; i < this.elderMagicData.length; i++) {
        const d = this.elderMagicData[i];
        d.y += d.vy * delta;
        d.ang += d.orbitSpeed * delta;

        if (d.y > this.elderTreePos.y + 24.0) {
          d.y = this.elderTreePos.y + 1.0;
        }

        const x = this.elderTreePos.x + Math.cos(d.ang) * d.rad;
        const z = this.elderTreePos.z + Math.sin(d.ang) * d.rad;
        posAttr.setXYZ(i, x, d.y, z);
      }
      posAttr.needsUpdate = true;
    }

    if (this.elderFireflies) {
      const posAttr = this.elderFireflies.geometry.attributes.position;
      const sizeAttr = this.elderFireflies.geometry.attributes.size;
      for (let i = 0; i < this.elderFirefliesData.length; i++) {
        const d = this.elderFirefliesData[i];
        const wx = Math.sin(this.time * d.wanderSpeed + d.phase) * 1.5;
        const wz = Math.cos(this.time * d.wanderSpeed * 0.8 + d.phase) * 1.5;
        const wy = Math.sin(this.time * 1.2 + d.phase) * 0.8;

        const pulse = Math.pow(Math.sin(this.time * d.pulseFreq + d.phase) * 0.5 + 0.5, 2.0);
        sizeAttr.setX(i, 0.4 + pulse * 0.8);

        posAttr.setXYZ(i, d.baseX + wx, d.y + wy, d.baseZ + wz);
      }
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    // 7. Santuario Atia: Columnas de energía verde sagrada
    if (this.shrineParticles) {
      const posAttr = this.shrineParticles.geometry.attributes.position;
      for (let i = 0; i < this.shrineData.length; i++) {
        const d = this.shrineData[i];
        d.y += d.vy * delta;

        if (d.y > this.shrinePos.y + 28.0) {
          d.y = this.shrinePos.y + 0.2;
        }

        const sway = Math.sin(this.time * d.swayFreq + d.ang) * 0.35;
        const x = this.shrinePos.x + Math.cos(d.ang) * (d.rad + sway);
        const z = this.shrinePos.z + Math.sin(d.ang) * (d.rad + sway);
        posAttr.setXYZ(i, x, d.y, z);
      }
      posAttr.needsUpdate = true;
    }

    // 8. Templo Dojō: Pétalos de cerezo (Sakura)
    if (this.sakuraMesh) {
      for (let i = 0; i < this.sakuraData.length; i++) {
        const d = this.sakuraData[i];
        d.y -= d.fallSpeed * delta;
        d.x += Math.sin(this.time * d.swaySpeed + d.phase) * delta * 1.8 + delta * 0.8;
        d.z += Math.cos(this.time * d.swaySpeed * 0.7 + d.phase) * delta * 1.5 + delta * 0.6;

        d.rotX += d.rotSpeedX * delta;
        d.rotY += d.rotSpeedY * delta;
        d.rotZ += d.rotSpeedZ * delta;

        if (d.y < d.groundH + 0.2) {
          d.y = d.groundH + 9.5 + Math.random() * 6.5;
          const rad = 3.0 + Math.random() * 26.0;
          const ang = Math.random() * Math.PI * 2;
          d.x = d.centerX + Math.cos(ang) * rad;
          d.z = d.centerZ + Math.sin(ang) * rad;
        }

        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
        dummy.scale.set(d.scale, d.scale, d.scale);
        dummy.updateMatrix();
        this.sakuraMesh.setMatrixAt(i, dummy.matrix);
      }
      this.sakuraMesh.instanceMatrix.needsUpdate = true;
    }
  }

  setVisible(visible) {
    this.enabled = visible;
    this.group.visible = visible;
  }
}
