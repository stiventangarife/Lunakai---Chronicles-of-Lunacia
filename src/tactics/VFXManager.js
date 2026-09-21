// VFXManager.js - Advanced 3D Particle Systems & Elemental Skill Effects
import * as THREE from 'three';

export class VFXManager {
  constructor(scene, gridManager) {
    this.scene = scene;
    this.gridManager = gridManager;
  }

  /**
   * 1. Melee Slash Arc: Sweeping 3D curved blade trail with sparks
   */
  playMeleeSlash(casterPos, targetPos, colorHex = 0xfbbf24) {
    const dirX = targetPos.x - casterPos.x;
    const dirZ = targetPos.z - casterPos.z;
    const angle = Math.atan2(dirX, dirZ);

    // Curved crescent arc geometry
    const arcGeo = new THREE.RingGeometry(0.6, 1.35, 24, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const arcMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const slashMesh = new THREE.Mesh(arcGeo, arcMat);
    slashMesh.rotation.x = -Math.PI / 2.3;
    slashMesh.rotation.z = -angle;
    slashMesh.position.set(
      casterPos.x + dirX * 0.45,
      0.9,
      casterPos.z + dirZ * 0.45
    );
    this.scene.add(slashMesh);

    // Directional slash sparks
    const sparks = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
    for (let i = 0; i < 12; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
      const p = new THREE.Mesh(sparkGeo, sparkMat);
      p.position.copy(slashMesh.position);
      this.scene.add(p);

      const sprayAngle = angle + (Math.random() - 0.5) * 1.2;
      const speed = 3.5 + Math.random() * 3.5;
      sparks.push({
        mesh: p,
        mat: sparkMat,
        vx: Math.sin(sprayAngle) * speed,
        vy: 1.5 + Math.random() * 2.5,
        vz: Math.cos(sprayAngle) * speed
      });
    }

    const startTime = performance.now();
    const duration = 240; // ms

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const dt = 0.016;

      // Expand and fade slash blade
      const scale = 0.8 + progress * 0.6;
      slashMesh.scale.set(scale, scale, 1);
      arcMat.opacity = Math.max(0, (1.0 - progress) * 0.95);

      sparks.forEach(s => {
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.vy -= 12 * dt;
        s.mat.opacity = Math.max(0, 1.0 - progress);
        s.mesh.scale.setScalar(Math.max(0.1, 1.0 - progress));
      });

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(slashMesh);
        arcGeo.dispose();
        arcMat.dispose();

        sparks.forEach(s => {
          this.scene.remove(s.mesh);
          s.mat.dispose();
        });
        sparkGeo.dispose();
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * 2. Heal Pillar: Ascending celestial light beam with spiraling sacred glyphs
   */
  playHealPillar(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0, worldPos.z);

    // Rising ethereal light cylinder
    const pillarGeo = new THREE.CylinderGeometry(0.7, 0.7, 3.8, 20, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.position.y = 1.9;
    group.add(pillarMesh);

    // Inner bright core
    const coreGeo = new THREE.CylinderGeometry(0.35, 0.35, 4.0, 16, 1, true);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 2.0;
    group.add(coreMesh);

    // Ground celestial ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.9, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    this.scene.add(group);

    // Rising sparkle motes
    const particles = [];
    const pGeo = new THREE.SphereGeometry(0.08, 8, 8);
    for (let i = 0; i < 16; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.9 });
      const p = new THREE.Mesh(pGeo, pMat);
      const angle = (i / 16) * Math.PI * 2;
      const r = 0.45 + Math.random() * 0.35;
      p.position.set(Math.cos(angle) * r, 0.2 + Math.random() * 0.4, Math.sin(angle) * r);
      group.add(p);

      particles.push({
        mesh: p,
        mat: pMat,
        angle,
        radius: r,
        vSpeed: 2.5 + Math.random() * 2.0,
        spinSpeed: 4.0 + Math.random() * 3.0
      });
    }

    const startTime = performance.now();
    const duration = 550; // ms

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const dt = 0.016;

      pillarMesh.rotation.y += 0.05;
      coreMesh.rotation.y -= 0.07;
      pillarMat.opacity = Math.max(0, (1.0 - progress) * 0.65);
      coreMat.opacity = Math.max(0, (1.0 - progress) * 0.8);
      ringMat.opacity = Math.max(0, (1.0 - progress) * 0.9);

      particles.forEach(p => {
        p.angle += p.spinSpeed * dt;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius;
        p.mesh.position.y += p.vSpeed * dt;
        p.mat.opacity = Math.max(0, 1.0 - progress);
        p.mesh.scale.setScalar(Math.max(0.1, 1.0 - progress * 0.7));
      });

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        pillarGeo.dispose();
        pillarMat.dispose();
        coreGeo.dispose();
        coreMat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        pGeo.dispose();
        particles.forEach(p => p.mat.dispose());
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * 3. Earth Bramble Vines: Spiked thorn vines erupting from earth
   */
  playEarthBramble(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0, worldPos.z);

    const vineGeo = new THREE.CylinderGeometry(0.06, 0.12, 1.1, 7);
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });

    const vines = [];
    for (let i = 0; i < 5; i++) {
      const v = new THREE.Mesh(vineGeo, vineMat);
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 0.45;
      v.position.set(Math.cos(angle) * dist, 0.0, Math.sin(angle) * dist);
      v.rotation.z = (Math.random() - 0.5) * 0.6;
      v.rotation.x = (Math.random() - 0.5) * 0.6;
      v.scale.set(0.1, 0.1, 0.1);
      group.add(v);
      vines.push({ mesh: v, targetY: 0.55 });
    }

    this.scene.add(group);

    const startTime = performance.now();
    const duration = 600;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      if (progress < 0.3) {
        // Erupting upward
        const p = progress / 0.3;
        vines.forEach(v => {
          v.mesh.position.y = v.targetY * p;
          v.mesh.scale.set(1.0, p, 1.0);
        });
      } else if (progress > 0.75) {
        // Dissolving back
        const p = (progress - 0.75) / 0.25;
        group.scale.setScalar(Math.max(0.01, 1.0 - p));
      }

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        vineGeo.dispose();
        vineMat.dispose();
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * 4. Ice Spikes: Jagged frosty crystal spikes bursting from ground
   */
  playIceSpikes(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0, worldPos.z);

    const spikeGeo = new THREE.ConeGeometry(0.24, 1.3, 5);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      transparent: true,
      opacity: 0.95
    });

    const spikes = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(spikeGeo, spikeMat);
      const angle = (i / 5) * Math.PI * 2;
      const r = 0.45;
      s.position.set(Math.cos(angle) * r, -0.4, Math.sin(angle) * r);
      s.rotation.z = Math.sin(angle) * 0.35;
      s.rotation.x = Math.cos(angle) * 0.35;
      group.add(s);
      spikes.push(s);
    }

    this.scene.add(group);

    const startTime = performance.now();
    const duration = 500;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      if (progress < 0.25) {
        const p = progress / 0.25;
        spikes.forEach(s => {
          s.position.y = -0.4 + 0.95 * p;
        });
      } else if (progress > 0.7) {
        const p = (progress - 0.7) / 0.3;
        spikeMat.opacity = (1.0 - p) * 0.95;
        group.scale.setScalar(Math.max(0.01, 1.0 - p * 0.5));
      }

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        spikeGeo.dispose();
        spikeMat.dispose();
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * 5. Fiery Explosion Detonation: Volumetric expanding fireball dome with AoE tongues
   */
  playFireDetonation(centerPos, affectedCells = []) {
    const group = new THREE.Group();
    group.position.set(centerPos.x, 0.6, centerPos.z);

    // Fiery core sphere
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.95 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Outer plasma fireball shell
    const shellGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const shellMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.75, wireframe: true });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    group.add(shellMesh);

    // Point Light flash
    const fireLight = new THREE.PointLight(0xff5500, 3.5, 6.0);
    group.add(fireLight);

    this.scene.add(group);

    const startTime = performance.now();
    const duration = 320;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      const s = 0.5 + progress * 2.8;
      coreMesh.scale.set(s, s * 0.85, s);
      shellMesh.scale.set(s * 1.2, s * 1.1, s * 1.2);
      shellMesh.rotation.y += 0.2;

      coreMat.opacity = Math.max(0, (1.0 - progress) * 0.95);
      shellMat.opacity = Math.max(0, (1.0 - progress) * 0.75);
      fireLight.intensity = Math.max(0, (1.0 - progress) * 3.5);

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        coreGeo.dispose();
        coreMat.dispose();
        shellGeo.dispose();
        shellMat.dispose();
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * 6. Sonic Bellow: Expanding acoustic rings pushing outward
   */
  playSonicBellow(casterPos, targetPos) {
    const dirX = targetPos.x - casterPos.x;
    const dirZ = targetPos.z - casterPos.z;
    const angle = Math.atan2(dirX, dirZ);

    const ringGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 });

    const rings = [];
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(ringGeo, ringMat);
      r.rotation.y = angle;
      r.position.set(casterPos.x, 0.8, casterPos.z);
      this.scene.add(r);
      rings.push({ mesh: r, delay: i * 70, born: performance.now() + i * 70 });
    }

    const duration = 380;
    const animate = (now) => {
      let aliveCount = 0;
      rings.forEach(r => {
        if (now < r.born) {
          aliveCount++;
          return;
        }
        const progress = Math.min(1.0, (now - r.born) / duration);
        if (progress < 1.0) {
          aliveCount++;
          const dist = progress * 2.8;
          r.mesh.position.set(
            casterPos.x + Math.sin(angle) * dist,
            0.8,
            casterPos.z + Math.cos(angle) * dist
          );
          const s = 0.6 + progress * 2.0;
          r.mesh.scale.set(s, s, 1);
          r.mesh.material.opacity = (1.0 - progress) * 0.85;
        } else {
          this.scene.remove(r.mesh);
        }
      });

      if (aliveCount > 0) {
        requestAnimationFrame(animate);
      } else {
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    requestAnimationFrame(animate);
  }

  /**
   * 7. Cinematic Finisher VFX: Grand explosion of celestial light, expanding golden ground shockwave rings, and soaring sparks
   */
  playCinematicFinisher(worldPos) {
    const group = new THREE.Group();
    group.position.set(worldPos.x, 0.05, worldPos.z);
    this.scene.add(group);

    // 1. High-intensity point light burst
    const burstLight = new THREE.PointLight(0xfffbeb, 8.0, 15);
    burstLight.position.set(0, 1.2, 0);
    group.add(burstLight);

    // 2. Ascending celestial pillar of light
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.9, 14, 16, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.position.y = 7;
    group.add(pillarMesh);

    // 3. Expanding horizontal ground shockwave rings
    const ringGeo = new THREE.RingGeometry(0.3, 0.65, 32);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    
    const ring1 = new THREE.Mesh(ringGeo, ringMat1);
    ring1.rotation.x = -Math.PI / 2;
    group.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.rotation.x = -Math.PI / 2;
    group.add(ring2);

    // 4. Particle spark burst
    const sparkCount = 45;
    const sparkGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const sparks = [];

    for (let i = 0; i < sparkCount; i++) {
      const sp = new THREE.Mesh(sparkGeo, sparkMat);
      const theta = Math.random() * Math.PI * 2;
      const speedH = 1.5 + Math.random() * 3.5;
      const speedY = 2.0 + Math.random() * 4.5;
      sp.position.set(0, 0.8, 0);
      group.add(sp);
      sparks.push({
        mesh: sp,
        vx: Math.cos(theta) * speedH,
        vz: Math.sin(theta) * speedH,
        vy: speedY
      });
    }

    const startTime = performance.now();
    const duration = 1400; // 1.4s duration

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      // Light burst fade
      burstLight.intensity = Math.max(0, 8.0 * (1.0 - progress));

      // Pillar scale and fade
      pillarMesh.rotation.y += 0.05;
      const pScale = 1.0 + progress * 1.5;
      pillarMesh.scale.set(pScale, 1.0, pScale);
      pillarMat.opacity = Math.max(0, (1.0 - progress) * 0.85);

      // Expanding rings
      const r1Scale = 1.0 + progress * 7.5;
      ring1.scale.set(r1Scale, r1Scale, 1);
      ringMat1.opacity = Math.max(0, (1.0 - progress) * 0.95);

      const r2Progress = Math.max(0, progress - 0.15) / 0.85;
      const r2Scale = 1.0 + r2Progress * 9.0;
      ring2.scale.set(r2Scale, r2Scale, 1);
      ringMat2.opacity = Math.max(0, (1.0 - r2Progress) * 0.8);

      // Sparks physics
      const dt = 0.016;
      sparks.forEach(s => {
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.z += s.vz * dt;
        s.mesh.position.y += s.vy * dt;
        s.vy -= 4.0 * dt; // slight gravity
        const sparkFade = Math.max(0.01, 1.0 - progress);
        s.mesh.scale.setScalar(sparkFade);
      });

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(group);
        pillarGeo.dispose();
        pillarMat.dispose();
        ringGeo.dispose();
        ringMat1.dispose();
        ringMat2.dispose();
        sparkGeo.dispose();
        sparkMat.dispose();
      }
    };
    requestAnimationFrame(animate);
  }
}
