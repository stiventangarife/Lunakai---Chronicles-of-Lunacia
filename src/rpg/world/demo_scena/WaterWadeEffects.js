// WaterWadeEffects.js — Ondas y salpicaduras al caminar por agua poco profunda (Hito 66).
//
// · Ondas: anillos planos sobre la superficie que se abren y se apagan (InstancedMesh, 48 en reserva).
// · Salpicaduras: gotitas que saltan y caen (Points, 120 en reserva).
// Mezcla aditiva: para apagar una pieza basta con oscurecer su color, sin shader propio. Las dos mallas se ocultan
// cuando no hay nada activo, así no cuestan nada fuera del agua.
import * as THREE from 'three';

const RINGS = 48;
const DROPS = 120;
const RING_TINT = [0.78, 0.9, 1.0];
const DROP_TINT = [0.85, 0.95, 1.0];

function ringTexture() {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(N / 2, N / 2, N * 0.30, N / 2, N / 2, N * 0.5);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.15)');
  g.addColorStop(0.78, 'rgba(255,255,255,1)');
  g.addColorStop(0.9, 'rgba(255,255,255,0.35)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dropTexture() {
  const N = 32, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class WaterWadeEffects {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.name = 'WaterWadeEffects';
    parent.add(this.group);

    // Ondas
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.ringMesh = new THREE.InstancedMesh(geo, this.ringMat, RINGS);
    this.ringMesh.name = 'WaterWadeRings';
    this.ringMesh.frustumCulled = false;
    this.ringMesh.renderOrder = 3;
    this.ringMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ringMesh.setColorAt(0, new THREE.Color(0, 0, 0));
    this.ringMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.rings = [];
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < RINGS; i++) { this.rings.push({ on: false, x: 0, y: 0, z: 0, life: 0, max: 1, r0: 0, r1: 1, a: 1 }); this.ringMesh.setMatrixAt(i, hide); }
    this.ringMesh.visible = false;
    this.group.add(this.ringMesh);
    this._ri = 0;

    // Gotitas
    const pg = new THREE.BufferGeometry();
    this.dPos = new Float32Array(DROPS * 3).fill(0);
    this.dCol = new Float32Array(DROPS * 3).fill(0);
    pg.setAttribute('position', new THREE.BufferAttribute(this.dPos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('color', new THREE.BufferAttribute(this.dCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.dropMat = new THREE.PointsMaterial({ size: 0.16, map: dropTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
    this.dropPts = new THREE.Points(pg, this.dropMat);
    this.dropPts.name = 'WaterWadeDrops';
    this.dropPts.frustumCulled = false;
    this.dropPts.visible = false;
    this.group.add(this.dropPts);
    this.drops = [];
    for (let i = 0; i < DROPS; i++) this.drops.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, floor: 0, life: 0, max: 1 });
    this._di = 0;

    this._m = new THREE.Matrix4();
    this._c = new THREE.Color();
  }

  /** Onda en (x, y, z): radio r0 → r1 en `life` s, con intensidad a (0–1). */
  ring(x, y, z, r0 = 0.15, r1 = 0.9, life = 1.1, a = 0.8) {
    const r = this.rings[this._ri]; this._ri = (this._ri + 1) % RINGS;
    r.on = true; r.x = x; r.y = y + 0.02; r.z = z; r.life = 0; r.max = life; r.r0 = r0; r.r1 = r1; r.a = a;
    this.ringMesh.visible = true;
  }

  /** Salpicadura de n gotitas desde (x, y, z), empujadas un poco hacia (fx, fz). */
  splash(x, y, z, fx = 0, fz = 0, n = 8, power = 1) {
    for (let k = 0; k < n; k++) {
      const d = this.drops[this._di]; this._di = (this._di + 1) % DROPS;
      const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random() * 0.8) * power;
      d.on = true; d.x = x; d.y = y + 0.03; d.z = z; d.floor = y;
      d.vx = Math.cos(a) * s + fx * 0.9 * power; d.vz = Math.sin(a) * s + fz * 0.9 * power;
      d.vy = (1.4 + Math.random() * 1.4) * power;
      d.life = 0; d.max = 0.45 + Math.random() * 0.3;
    }
    this.dropPts.visible = true;
  }

  update(dt) {
    if (this.ringMesh.visible) {
      let any = false;
      for (let i = 0; i < RINGS; i++) {
        const r = this.rings[i];
        if (!r.on) continue;
        r.life += dt;
        if (r.life >= r.max) {
          r.on = false;
          this._m.makeScale(0, 0, 0); this.ringMesh.setMatrixAt(i, this._m);
          continue;
        }
        any = true;
        const t = r.life / r.max, e = 1 - (1 - t) * (1 - t); // sale rápido y frena
        const s = (r.r0 + (r.r1 - r.r0) * e) * 2;
        this._m.makeScale(s, 1, s).setPosition(r.x, r.y, r.z);
        this.ringMesh.setMatrixAt(i, this._m);
        const f = r.a * (1 - t) * (t < 0.12 ? t / 0.12 : 1);
        this.ringMesh.setColorAt(i, this._c.setRGB(RING_TINT[0] * f, RING_TINT[1] * f, RING_TINT[2] * f));
      }
      this.ringMesh.instanceMatrix.needsUpdate = true;
      this.ringMesh.instanceColor.needsUpdate = true;
      this.ringMesh.visible = any;
    }
    if (this.dropPts.visible) {
      let any = false;
      for (let i = 0; i < DROPS; i++) {
        const d = this.drops[i], k = i * 3;
        if (!d.on) continue;
        d.life += dt;
        d.vy -= 9.8 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        if (d.life >= d.max || d.y < d.floor) {
          d.on = false;
          this.dCol[k] = this.dCol[k + 1] = this.dCol[k + 2] = 0;
          this.dPos[k + 1] = -9999;
          continue;
        }
        any = true;
        const f = 0.9 * (1 - d.life / d.max);
        this.dPos[k] = d.x; this.dPos[k + 1] = d.y; this.dPos[k + 2] = d.z;
        this.dCol[k] = DROP_TINT[0] * f; this.dCol[k + 1] = DROP_TINT[1] * f; this.dCol[k + 2] = DROP_TINT[2] * f;
      }
      this.dropPts.geometry.attributes.position.needsUpdate = true;
      this.dropPts.geometry.attributes.color.needsUpdate = true;
      this.dropPts.visible = any;
    }
  }
}
