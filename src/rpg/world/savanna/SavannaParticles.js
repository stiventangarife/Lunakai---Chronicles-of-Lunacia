import * as THREE from 'three';

/**
 * SavannaParticles.js - Atmospheric desert particles replacing falling forest leaves:
 * 1. Sand Drafts & Swirling Dust Eddies: 150 instanced golden sand grains swirling close to the plateau surface.
 * 2. Aerodynamic Desert Wind Gusts: 70 warm wind streaks sweeping across clifftops and canyon passes.
 * 3. Heat Shimmer Motes: Subtle glistening particles over the sunlit sand dunes.
 */
export class SavannaParticles {
  constructor(parentGroup, terrain) {
    this.parentGroup = parentGroup;
    this.terrain = terrain;

    this.group = new THREE.Group();
    this.group.name = 'SavannaParticlesGroup';
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }

    this.time = 0;
    this.sandMesh = null;
    this.sandData = [];
    this.windGustsMesh = null;
    this.windGustsData = [];

    this._dummy = new THREE.Object3D();

    this.initSandDust();
    this.initDesertWindGusts();
  }

  // ==========================================
  // 1. RÁFAGAS DE ARENA Y POLVO DORADO
  // ==========================================
  initSandDust() {
    const count = 160;
    // Small diamond / flake geometry for sand grains
    const sandGeo = new THREE.PlaneGeometry(0.18, 0.18);

    const sandMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });

    this.sandMesh = new THREE.InstancedMesh(sandGeo, sandMat, count);
    this.sandMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.sandMesh);

    const colors = [
      new THREE.Color(0xf6d475), // Bright golden sand
      new THREE.Color(0xe5a342), // Warm amber sand
      new THREE.Color(0xd18635), // Terracotta dust
      new THREE.Color(0xfce8a2)  // Sunlit sand grain
    ];

    for (let i = 0; i < count; i++) {
      const x = -110 + Math.random() * 220;
      const z = -110 + Math.random() * 220;
      const groundH = this.terrain ? this.terrain.getHeight(x, z) : 25.0;
      const y = groundH + 0.3 + Math.random() * 3.5;

      this.sandData.push({
        baseX: x,
        baseZ: z,
        x: x,
        y: y,
        z: z,
        groundH: groundH,
        speedX: 5.5 + Math.random() * 4.5, // Fast desert wind draft
        speedZ: 2.2 + Math.random() * 3.0,
        swirlSpeed: 2.0 + Math.random() * 3.0,
        swirlRadius: 0.4 + Math.random() * 0.8,
        rotSpeed: (Math.random() - 0.5) * 6.0,
        rot: Math.random() * Math.PI,
        scale: 0.7 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2
      });

      this._dummy.position.set(x, y, z);
      this._dummy.scale.setScalar(this.sandData[i].scale);
      this._dummy.updateMatrix();

      this.sandMesh.setMatrixAt(i, this._dummy.matrix);
      this.sandMesh.setColorAt(i, colors[i % colors.length]);
    }

    this.sandMesh.instanceMatrix.needsUpdate = true;
    if (this.sandMesh.instanceColor) {
      this.sandMesh.instanceColor.needsUpdate = true;
    }
  }

  // ==========================================
  // 2. RÁFAGAS DE VIENTO AERODINÁMICAS (Líneas anime)
  // ==========================================
  initDesertWindGusts() {
    const count = 65;
    const gustGeo = new THREE.PlaneGeometry(4.2, 0.14);

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
          float alpha = edgeX * edgeY * 0.55;
          // Warm golden/amber anime streak
          gl_FragColor = vec4(1.0, 0.92, 0.72, alpha);
        }
      `
    });

    this.windGustsMesh = new THREE.InstancedMesh(gustGeo, gustMat, count);
    this.windGustsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.windGustsMesh);

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * 115;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      const groundH = this.terrain ? this.terrain.getHeight(x, z) : 25.0;
      const y = groundH + 1.2 + Math.random() * 7.0;

      this.windGustsData.push({
        baseX: x,
        baseZ: z,
        x: x,
        y: y,
        z: z,
        groundH: groundH,
        speedX: 14.0 + Math.random() * 10.0,
        speedZ: 4.0 + Math.random() * 4.0,
        bobSpeed: 1.5 + Math.random() * 2.0,
        lengthScale: 0.8 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      });

      this._dummy.position.set(x, y, z);
      this._dummy.updateMatrix();
      this.windGustsMesh.setMatrixAt(i, this._dummy.matrix);
    }

    this.windGustsMesh.instanceMatrix.needsUpdate = true;
  }

  update(delta) {
    this.time += delta;

    // 1. Update Sand Grains
    if (this.sandMesh && this.sandData.length > 0) {
      for (let i = 0; i < this.sandData.length; i++) {
        const p = this.sandData[i];
        p.x += p.speedX * delta;
        p.z += p.speedZ * delta;

        // Swirling eddy motion
        const swirlX = Math.cos(this.time * p.swirlSpeed + p.phase) * p.swirlRadius;
        const swirlY = Math.sin(this.time * p.swirlSpeed * 1.5 + p.phase) * 0.35;

        // Reset if blown out of island bounds
        if (p.x > 140.0) p.x = -140.0;
        if (p.z > 140.0) p.z = -140.0;

        const gh = this.terrain ? this.terrain.getHeight(p.x, p.z) : 25.0;
        p.y = THREE.MathUtils.lerp(p.y, gh + 0.6 + swirlY, delta * 3.0);
        p.rot += p.rotSpeed * delta;

        this._dummy.position.set(p.x + swirlX, p.y, p.z);
        this._dummy.rotation.set(0, p.rot, 0);
        this._dummy.scale.setScalar(p.scale);
        this._dummy.updateMatrix();

        this.sandMesh.setMatrixAt(i, this._dummy.matrix);
      }
      this.sandMesh.instanceMatrix.needsUpdate = true;
    }

    // 2. Update Hot Wind Streaks
    if (this.windGustsMesh && this.windGustsData.length > 0) {
      for (let i = 0; i < this.windGustsData.length; i++) {
        const g = this.windGustsData[i];
        g.x += g.speedX * delta;
        g.z += g.speedZ * delta;

        if (g.x > 145.0) {
          g.x = -145.0;
          g.z = -120.0 + Math.random() * 240.0;
        }

        const gh = this.terrain ? this.terrain.getHeight(g.x, g.z) : 25.0;
        g.y = gh + 2.0 + Math.sin(this.time * g.bobSpeed + g.phase) * 1.2;

        this._dummy.position.set(g.x, g.y, g.z);
        // Align streak with travel direction
        const yaw = Math.atan2(g.speedZ, g.speedX);
        this._dummy.rotation.set(0, -yaw, 0);
        this._dummy.scale.set(g.lengthScale, 1.0, 1.0);
        this._dummy.updateMatrix();

        this.windGustsMesh.setMatrixAt(i, this._dummy.matrix);
      }
      this.windGustsMesh.instanceMatrix.needsUpdate = true;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
