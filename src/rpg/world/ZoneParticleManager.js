// ZoneParticleManager.js - Environmental Particle System for Lunacia's 5 Biomes
import * as THREE from 'three';

export class ZoneParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.activeBiome = 'forest';
    this.targetBiome = 'forest';
    this.fadeSpeed = 2.0;

    this.group = new THREE.Group();
    this.group.name = 'ZoneParticleGroup';
    this.scene.add(this.group);

    // Textures generated procedurally on Canvas (0 network latency, 0 external assets)
    this.textures = {
      leaf: this._createLeafTexture(),
      sand: this._createSandTexture(),
      snowflake: this._createSnowflakeTexture(),
      firefly: this._createFireflyTexture(),
      mist: this._createMistTexture(),
      ember: this._createEmberTexture()
    };

    this.emitters = {};
    this._initForestEmitter();
    this._initSavannahEmitter();
    this._initArcticEmitter();
    this._initMysticEmitter();
    this._initDungeonEmitter();

    // Set initial active biome
    this.setBiome('forest', 0);
  }

  // ========================================================
  // 1. PROCEDURAL TEXTURE GENERATION
  // ========================================================

  _createLeafTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);

    // Stylized teardrop leaf silhouette
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.42);
    ctx.bezierCurveTo(size * 0.28, -size * 0.22, size * 0.32, size * 0.18, 0, size * 0.40);
    ctx.bezierCurveTo(-size * 0.32, size * 0.18, -size * 0.28, -size * 0.22, 0, -size * 0.42);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, -size * 0.4, 0, size * 0.4);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.7, 'rgba(235, 235, 235, 0.88)');
    grad.addColorStop(1, 'rgba(190, 190, 190, 0.75)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Central vein
    ctx.strokeStyle = 'rgba(120, 120, 120, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.35);
    ctx.lineTo(0, size * 0.32);
    ctx.stroke();

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createSandTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Horizontal elongated streak with soft falloff
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * 0.42);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, size * 0.44, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createSnowflakeTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;

    // Glowing core
    const coreGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 0.45);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    coreGrad.addColorStop(1, 'rgba(220, 245, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // 6 branches with crosslets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x2 = cx + Math.cos(angle) * r;
      const y2 = cy + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Branchlet
      const bx = cx + Math.cos(angle) * (r * 0.62);
      const by = cy + Math.sin(angle) * (r * 0.62);
      const bAngle1 = angle + Math.PI / 4;
      const bAngle2 = angle - Math.PI / 4;
      const blen = r * 0.28;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(bAngle1) * blen, by + Math.sin(bAngle1) * blen);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(bAngle2) * blen, by + Math.sin(bAngle2) * blen);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createFireflyTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 1.5, cx, cy, size * 0.46);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.90)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.80, 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createMistTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.45);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.32)');
    grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.10)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _createEmberTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cx = size / 2;
    const cy = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 0.42);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.3, 'rgba(255, 200, 100, 0.85)');
    grad.addColorStop(0.65, 'rgba(255, 80, 20, 0.35)');
    grad.addColorStop(1, 'rgba(100, 20, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ========================================================
  // 2. EMITTER INITIALIZATIONS
  // ========================================================

  _initForestEmitter() {
    // Floating leaves in the forest breeze
    const count = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    const leafPalette = [
      new THREE.Color(0x84cc16), // Fresh lime green
      new THREE.Color(0x22c55e), // Emerald forest green
      new THREE.Color(0xeab308), // Golden autumn leaf
      new THREE.Color(0xa3e635), // Spring sprout
      new THREE.Color(0xca8a04)  // Ochre leaf
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = 0.5 + Math.random() * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 40;

      const col = leafPalette[Math.floor(Math.random() * leafPalette.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      velocities[i3] = 0.4 + Math.random() * 0.6;          // Slight east wind
      velocities[i3 + 1] = -(0.55 + Math.random() * 0.65); // Gentle downward glide
      velocities[i3 + 2] = 0.3 + Math.random() * 0.5;

      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.65,
      map: this.textures.leaf,
      transparent: true,
      opacity: 0.0,
      vertexColors: true,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    this.emitters.forest = {
      points,
      mat,
      geo,
      velocities,
      phases,
      count,
      targetOpacity: 0.90,
      currentOpacity: 0.0,
      update: (dt, pPos) => {
        const pos = geo.attributes.position.array;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          phases[i] += dt * 2.2;

          // Fluttering oscillation
          const swayX = Math.sin(phases[i]) * 0.85;
          const swayZ = Math.cos(phases[i] * 0.8) * 0.85;

          pos[i3] += (velocities[i3] + swayX) * dt;
          pos[i3 + 1] += velocities[i3 + 1] * dt;
          pos[i3 + 2] += (velocities[i3 + 2] + swayZ) * dt;

          // Wrap horizontally around player (±20m)
          if (pos[i3] < pPos.x - 20) pos[i3] += 40;
          if (pos[i3] > pPos.x + 20) pos[i3] -= 40;
          if (pos[i3 + 2] < pPos.z - 20) pos[i3 + 2] += 40;
          if (pos[i3 + 2] > pPos.z + 20) pos[i3 + 2] -= 40;

          // Respawn at canopy top if touching ground
          if (pos[i3 + 1] < 0.2) {
            pos[i3 + 1] = 9.5 + Math.random() * 3.0;
            pos[i3] = pPos.x + (Math.random() - 0.5) * 36;
            pos[i3 + 2] = pPos.z + (Math.random() - 0.5) * 36;
          }
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  _initSavannahEmitter() {
    // Blowing desert sand gusts
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    const sandPalette = [
      new THREE.Color(0xf59e0b), // Golden amber
      new THREE.Color(0xfbbf24), // Radiant sand
      new THREE.Color(0xd97706), // Warm ochre
      new THREE.Color(0xfde68a)  // Sunlit desert dust
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 44;
      positions[i3 + 1] = 0.2 + Math.random() * 3.6;
      positions[i3 + 2] = (Math.random() - 0.5) * 44;

      const col = sandPalette[Math.floor(Math.random() * sandPalette.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      velocities[i3] = 4.8 + Math.random() * 3.5;          // Fast horizontal desert wind
      velocities[i3 + 1] = (Math.random() - 0.45) * 0.4;   // Ground turbulence
      velocities[i3 + 2] = 1.2 + Math.random() * 1.5;

      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.48,
      map: this.textures.sand,
      transparent: true,
      opacity: 0.0,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    this.emitters.savannah = {
      points,
      mat,
      geo,
      velocities,
      phases,
      count,
      targetOpacity: 0.85,
      currentOpacity: 0.0,
      update: (dt, pPos) => {
        const pos = geo.attributes.position.array;
        // Periodic wind gust surge (wind intensifies every ~3.6s)
        const gust = 1.0 + Math.pow(Math.max(0, Math.sin(this.time * 1.75)), 2.0) * 2.2;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          phases[i] += dt * 4.0;
          const turbY = Math.sin(phases[i]) * 0.35;

          pos[i3] += velocities[i3] * gust * dt;
          pos[i3 + 1] += (velocities[i3 + 1] + turbY) * dt;
          pos[i3 + 2] += velocities[i3 + 2] * gust * dt;

          // Keep sand near ground level
          if (pos[i3 + 1] < 0.15) pos[i3 + 1] = 0.2 + Math.random() * 0.4;
          if (pos[i3 + 1] > 3.8) pos[i3 + 1] = 0.3 + Math.random() * 1.5;

          // Wrap around player
          if (pos[i3] < pPos.x - 22) pos[i3] += 44;
          if (pos[i3] > pPos.x + 22) pos[i3] -= 44;
          if (pos[i3 + 2] < pPos.z - 22) pos[i3 + 2] += 44;
          if (pos[i3 + 2] > pPos.z + 22) pos[i3 + 2] -= 44;
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  _initArcticEmitter() {
    // Gentle falling snow & crystalline snowflakes
    const count = 380;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    const snowPalette = [
      new THREE.Color(0xffffff), // Pure crystalline snow
      new THREE.Color(0xe0f2fe), // Glacier ice blue
      new THREE.Color(0xbae6fd)  // Diamond frosty blue
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 44;
      positions[i3 + 1] = 0.5 + Math.random() * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 44;

      const col = snowPalette[Math.floor(Math.random() * snowPalette.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      velocities[i3] = (Math.random() - 0.5) * 0.8;
      velocities[i3 + 1] = -(1.6 + Math.random() * 1.6); // Falling snow velocity
      velocities[i3 + 2] = 0.4 + Math.random() * 0.6;

      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.44,
      map: this.textures.snowflake,
      transparent: true,
      opacity: 0.0,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    this.emitters.arctic = {
      points,
      mat,
      geo,
      velocities,
      phases,
      count,
      targetOpacity: 0.92,
      currentOpacity: 0.0,
      update: (dt, pPos) => {
        const pos = geo.attributes.position.array;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          phases[i] += dt * 1.8;
          const swayX = Math.sin(phases[i]) * 0.6;
          const swayZ = Math.cos(phases[i] * 0.7) * 0.4;

          pos[i3] += (velocities[i3] + swayX) * dt;
          pos[i3 + 1] += velocities[i3 + 1] * dt;
          pos[i3 + 2] += (velocities[i3 + 2] + swayZ) * dt;

          // Wrap horizontally around player
          if (pos[i3] < pPos.x - 22) pos[i3] += 44;
          if (pos[i3] > pPos.x + 22) pos[i3] -= 44;
          if (pos[i3 + 2] < pPos.z - 22) pos[i3 + 2] += 44;
          if (pos[i3 + 2] > pPos.z + 22) pos[i3 + 2] -= 44;

          // Respawn at polar clouds when reaching ground
          if (pos[i3 + 1] < 0.15) {
            pos[i3 + 1] = 11.5 + Math.random() * 2.5;
            pos[i3] = pPos.x + (Math.random() - 0.5) * 40;
            pos[i3 + 2] = pPos.z + (Math.random() - 0.5) * 40;
          }
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  _initMysticEmitter() {
    // Enchanted glowing fireflies (luciérnagas mágicas) with pulsating breathing
    const count = 190;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const pulseRates = new Float32Array(count);

    const fireflyPalette = [
      new THREE.Color(0x38bdf8), // Mystic astral cyan
      new THREE.Color(0xc084fc), // Radiant lavender
      new THREE.Color(0xa3e635), // Fairy lime
      new THREE.Color(0xf472b6), // Celestial rose pink
      new THREE.Color(0x67e8f9)  // Luminous turquoise
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = 0.6 + Math.random() * 5.5;
      positions[i3 + 2] = (Math.random() - 0.5) * 40;

      const col = fireflyPalette[Math.floor(Math.random() * fireflyPalette.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      phases[i] = Math.random() * Math.PI * 2;
      pulseRates[i] = 1.8 + Math.random() * 2.4;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.75,
      map: this.textures.firefly,
      transparent: true,
      opacity: 0.0,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    this.group.add(points);

    this.emitters.mystic = {
      points,
      mat,
      geo,
      phases,
      pulseRates,
      count,
      targetOpacity: 0.95,
      currentOpacity: 0.0,
      update: (dt, pPos) => {
        const pos = geo.attributes.position.array;

        // Global pulsating breathing effect
        const pulse = 0.72 + 0.28 * Math.sin(this.time * 3.0);
        mat.opacity = this.emitters.mystic.currentOpacity * pulse;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          phases[i] += dt * pulseRates[i];

          // 3D smooth organic Brownian wandering
          const vx = Math.sin(this.time * 0.9 + phases[i] * 1.5) * 0.45;
          const vy = Math.cos(this.time * 0.7 + phases[i] * 1.2) * 0.32;
          const vz = Math.sin(this.time * 0.8 + phases[i] * 2.1) * 0.45;

          pos[i3] += vx * dt;
          pos[i3 + 1] += vy * dt;
          pos[i3 + 2] += vz * dt;

          // Height bounds
          if (pos[i3 + 1] < 0.4) pos[i3 + 1] = 0.5 + Math.random() * 0.5;
          if (pos[i3 + 1] > 6.2) pos[i3 + 1] = 5.5 - Math.random() * 0.5;

          // Wrap horizontally around player
          if (pos[i3] < pPos.x - 20) pos[i3] += 40;
          if (pos[i3] > pPos.x + 20) pos[i3] -= 40;
          if (pos[i3 + 2] < pPos.z - 20) pos[i3 + 2] += 40;
          if (pos[i3 + 2] > pPos.z + 20) pos[i3 + 2] -= 40;
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  _initDungeonEmitter() {
    // Low-lying dark mist wisps + floating dry leaves & smoldering embers
    // Sub-emitter A: Low ground mist wisps
    const mistCount = 80;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(mistCount * 3);
    const mistPhases = new Float32Array(mistCount);

    for (let i = 0; i < mistCount; i++) {
      const i3 = i * 3;
      mistPositions[i3] = (Math.random() - 0.5) * 38;
      mistPositions[i3 + 1] = 0.2 + Math.random() * 1.6; // Close to ground
      mistPositions[i3 + 2] = (Math.random() - 0.5) * 38;
      mistPhases[i] = Math.random() * Math.PI * 2;
    }

    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      size: 4.8,
      map: this.textures.mist,
      transparent: true,
      opacity: 0.0,
      color: 0x5b4766, // Dark slate/violet catacomb mist
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const mistPoints = new THREE.Points(mistGeo, mistMat);
    this.group.add(mistPoints);

    // Sub-emitter B: Withered dry leaves and rising embers
    const cinderCount = 110;
    const cinderGeo = new THREE.BufferGeometry();
    const cinderPositions = new Float32Array(cinderCount * 3);
    const cinderColors = new Float32Array(cinderCount * 3);
    const cinderPhases = new Float32Array(cinderCount);

    const cinderPalette = [
      new THREE.Color(0x381e10), // Dry brown leaf
      new THREE.Color(0x522912), // Withered crunchy leaf
      new THREE.Color(0xea580c), // Glowing orange cinder
      new THREE.Color(0xb91c1c), // Smoldering ember
      new THREE.Color(0x78350f)  // Ash brown leaf
    ];

    for (let i = 0; i < cinderCount; i++) {
      const i3 = i * 3;
      cinderPositions[i3] = (Math.random() - 0.5) * 38;
      cinderPositions[i3 + 1] = 0.2 + Math.random() * 4.5;
      cinderPositions[i3 + 2] = (Math.random() - 0.5) * 38;

      const col = cinderPalette[Math.floor(Math.random() * cinderPalette.length)];
      cinderColors[i3] = col.r;
      cinderColors[i3 + 1] = col.g;
      cinderColors[i3 + 2] = col.b;

      cinderPhases[i] = Math.random() * Math.PI * 2;
    }

    cinderGeo.setAttribute('position', new THREE.BufferAttribute(cinderPositions, 3));
    cinderGeo.setAttribute('color', new THREE.BufferAttribute(cinderColors, 3));

    const cinderMat = new THREE.PointsMaterial({
      size: 0.52,
      map: this.textures.ember,
      transparent: true,
      opacity: 0.0,
      vertexColors: true,
      depthWrite: false
    });

    const cinderPoints = new THREE.Points(cinderGeo, cinderMat);
    this.group.add(cinderPoints);

    this.emitters.dungeon = {
      mistPoints,
      mistMat,
      mistGeo,
      cinderPoints,
      cinderMat,
      cinderGeo,
      mistCount,
      cinderCount,
      targetOpacity: 0.88,
      currentOpacity: 0.0,
      update: (dt, pPos) => {
        // 1. Update ground mist
        const mPos = mistGeo.attributes.position.array;
        mistMat.opacity = this.emitters.dungeon.currentOpacity * 0.36;
        for (let i = 0; i < mistCount; i++) {
          const i3 = i * 3;
          mistPhases[i] += dt * 0.6;
          mPos[i3] += (0.35 + Math.sin(mistPhases[i]) * 0.15) * dt;
          mPos[i3 + 2] += (0.25 + Math.cos(mistPhases[i]) * 0.15) * dt;

          if (mPos[i3] < pPos.x - 19) mPos[i3] += 38;
          if (mPos[i3] > pPos.x + 19) mPos[i3] -= 38;
          if (mPos[i3 + 2] < pPos.z - 19) mPos[i3 + 2] += 38;
          if (mPos[i3 + 2] > pPos.z + 19) mPos[i3 + 2] -= 38;
        }
        mistGeo.attributes.position.needsUpdate = true;

        // 2. Update dry leaves & rising embers
        const cPos = cinderGeo.attributes.position.array;
        cinderMat.opacity = this.emitters.dungeon.currentOpacity * 0.85;
        for (let i = 0; i < cinderCount; i++) {
          const i3 = i * 3;
          cinderPhases[i] += dt * 2.0;

          cPos[i3] += Math.sin(cinderPhases[i]) * 0.4 * dt;
          cPos[i3 + 1] += (0.35 + Math.sin(cinderPhases[i] * 1.5) * 0.15) * dt; // Rising draft
          cPos[i3 + 2] += Math.cos(cinderPhases[i]) * 0.4 * dt;

          // Respawn at floor when rising too high
          if (cPos[i3 + 1] > 4.8) {
            cPos[i3 + 1] = 0.2 + Math.random() * 0.6;
            cPos[i3] = pPos.x + (Math.random() - 0.5) * 36;
            cPos[i3 + 2] = pPos.z + (Math.random() - 0.5) * 36;
          }

          if (cPos[i3] < pPos.x - 19) cPos[i3] += 38;
          if (cPos[i3] > pPos.x + 19) cPos[i3] -= 38;
          if (cPos[i3 + 2] < pPos.z - 19) cPos[i3 + 2] += 38;
          if (cPos[i3 + 2] > pPos.z + 19) cPos[i3 + 2] -= 38;
        }
        cinderGeo.attributes.position.needsUpdate = true;
      }
    };
  }

  // ========================================================
  // 3. BIOME TRANSITIONS & UPDATE
  // ========================================================

  setBiome(biomeKey, fadeTime = 1.2) {
    const validBiome = this.emitters[biomeKey] ? biomeKey : 'forest';
    this.targetBiome = validBiome;
    this.activeBiome = validBiome;

    console.log(`[ZoneParticleManager] Switched active weather/particle system to: ${validBiome}`);

    // If immediate change requested
    if (fadeTime <= 0) {
      Object.keys(this.emitters).forEach((key) => {
        const em = this.emitters[key];
        const isActive = (key === validBiome);
        em.currentOpacity = isActive ? em.targetOpacity : 0.0;
        if (em.mat) em.mat.opacity = em.currentOpacity;
        if (em.mistMat) em.mistMat.opacity = isActive ? 0.36 : 0.0;
        if (em.cinderMat) em.cinderMat.opacity = isActive ? 0.85 : 0.0;
      });
    }
  }

  update(dt, playerPosition = null, camera = null) {
    this.time += dt;
    const pPos = playerPosition || (camera ? camera.position : { x: 0, y: 0, z: 0 });

    // Smooth opacity cross-fade between biomes
    Object.keys(this.emitters).forEach((key) => {
      const em = this.emitters[key];
      const isTarget = (key === this.targetBiome);
      const targetOp = isTarget ? em.targetOpacity : 0.0;

      if (Math.abs(em.currentOpacity - targetOp) > 0.01) {
        em.currentOpacity = THREE.MathUtils.lerp(em.currentOpacity, targetOp, dt * this.fadeSpeed);
        if (em.mat) em.mat.opacity = em.currentOpacity;
      } else {
        em.currentOpacity = targetOp;
        if (em.mat) em.mat.opacity = targetOp;
      }

      // Only update positions if emitter is currently visible
      if (em.currentOpacity > 0.005) {
        em.update(dt, pPos);
      }
    });
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }

  destroy() {
    Object.keys(this.emitters).forEach((key) => {
      const em = this.emitters[key];
      if (em.geo) em.geo.dispose();
      if (em.mat) em.mat.dispose();
      if (em.mistGeo) em.mistGeo.dispose();
      if (em.mistMat) em.mistMat.dispose();
      if (em.cinderGeo) em.cinderGeo.dispose();
      if (em.cinderMat) em.cinderMat.dispose();
    });
    this.scene.remove(this.group);
  }
}
