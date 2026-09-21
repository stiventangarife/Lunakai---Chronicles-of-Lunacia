// OverworldCollisions.js - 2D Spatial Collision System for Overworld Exploration
import * as THREE from 'three';

export class OverworldCollisions {
  constructor() {
    this.circles = []; // { x, z, radius, tag }
    this.boxes = [];   // { minX, maxX, minZ, maxZ, tag }
    this.segments = []; // { x1, z1, x2, z2, thickness, tag }

    // World Exploration Boundaries (80x80 macro-zone ground with safe margin)
    this.bounds = {
      minX: -38.5,
      maxX: 38.5,
      minZ: -38.5,
      maxZ: 38.5
    };
  }

  clear() {
    this.circles = [];
    this.boxes = [];
    this.segments = [];
  }

  addCircle(x, z, radius, tag = 'obstacle') {
    this.circles.push({ x, z, radius, tag });
  }

  removeCirclesByTag(tagPrefix) {
    this.circles = this.circles.filter(c => !(c.tag && c.tag.startsWith(tagPrefix)));
  }

  removeCircleAt(x, z, threshold = 2.0) {
    const threshSq = threshold * threshold;
    this.circles = this.circles.filter(c => {
      const dx = c.x - x;
      const dz = c.z - z;
      return (dx * dx + dz * dz) > threshSq;
    });
  }

  addBox(minX, maxX, minZ, maxZ, tag = 'building') {
    this.boxes.push({ minX, maxX, minZ, maxZ, tag });
  }

  removeBoxesByTag(tagPrefix) {
    this.boxes = this.boxes.filter(b => !(b.tag && b.tag.startsWith(tagPrefix)));
  }

  addSegment(x1, z1, x2, z2, thickness = 0.4, tag = 'fence') {
    this.segments.push({ x1, z1, x2, z2, thickness, tag });
  }

  isPointBlocked(px, pz, radius = 0.5) {
    // 1. Check world boundaries
    if (px - radius < this.bounds.minX || px + radius > this.bounds.maxX ||
        pz - radius < this.bounds.minZ || pz + radius > this.bounds.maxZ) {
      return true;
    }

    // 2. Check Circles
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      const dx = px - c.x;
      const dz = pz - c.z;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + c.radius;
      if (distSq < minDist * minDist) {
        return true;
      }
    }

    // 3. Check Boxes (AABB expanded by radius)
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (px + radius > b.minX && px - radius < b.maxX &&
          pz + radius > b.minZ && pz - radius < b.maxZ) {
        return true;
      }
    }

    // 4. Check Segments
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      const dist = this._pointToSegmentDist(px, pz, s.x1, s.z1, s.x2, s.z2);
      if (dist < radius + s.thickness) {
        return true;
      }
    }

    return false;
  }

  _pointToSegmentDist(px, pz, x1, z1, x2, z2) {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.hypot(px - projX, pz - projZ);
  }

  /**
   * Resolves player movement from oldPos by delta, allowing smooth sliding along obstacles and walls.
   * @param {THREE.Vector3} oldPos 
   * @param {THREE.Vector3} delta 
   * @param {number} radius 
   * @returns {THREE.Vector3} resolved new position
   */
  resolveMovement(oldPos, delta, radius = 0.55) {
    const candidateX = oldPos.x + delta.x;
    const candidateZ = oldPos.z + delta.z;

    // Direct unobstructed move test
    if (!this.isPointBlocked(candidateX, candidateZ, radius)) {
      return new THREE.Vector3(candidateX, oldPos.y, candidateZ);
    }

    // Continuous iterative repulsion / slide resolution
    // Allows the player to glide smoothly along curved surfaces (rocks, trees, riverbanks) and box walls
    let curX = candidateX;
    let curZ = candidateZ;
    const iterations = 3;
    const maxAllowedDist = Math.max(0.1, Math.hypot(delta.x, delta.z) * 1.35 + 0.05);

    for (let iter = 0; iter < iterations; iter++) {
      // 1. Repel from circles
      for (let i = 0; i < this.circles.length; i++) {
        const c = this.circles[i];
        const dx = curX - c.x;
        const dz = curZ - c.z;
        const distSq = dx * dx + dz * dz;
        const minDist = radius + c.radius;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 1e-4) {
            const overlap = minDist - dist;
            curX += (dx / dist) * overlap;
            curZ += (dz / dist) * overlap;
          } else {
            curX += minDist;
          }
        }
      }

      // 2. Repel from boxes
      for (let i = 0; i < this.boxes.length; i++) {
        const b = this.boxes[i];
        const minX = b.minX - radius;
        const maxX = b.maxX + radius;
        const minZ = b.minZ - radius;
        const maxZ = b.maxZ + radius;
        if (curX > minX && curX < maxX && curZ > minZ && curZ < maxZ) {
          const pushLeft = curX - minX;
          const pushRight = maxX - curX;
          const pushBottom = curZ - minZ;
          const pushTop = maxZ - curZ;
          const minPush = Math.min(pushLeft, pushRight, pushBottom, pushTop);
          if (minPush === pushLeft) curX = minX;
          else if (minPush === pushRight) curX = maxX;
          else if (minPush === pushBottom) curZ = minZ;
          else curZ = maxZ;
        }
      }

      // 3. Repel from segments
      for (let i = 0; i < this.segments.length; i++) {
        const s = this.segments[i];
        const l2 = (s.x2 - s.x1) * (s.x2 - s.x1) + (s.z2 - s.z1) * (s.z2 - s.z1);
        if (l2 > 0) {
          let t = ((curX - s.x1) * (s.x2 - s.x1) + (curZ - s.z1) * (s.z2 - s.z1)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = s.x1 + t * (s.x2 - s.x1);
          const projZ = s.z1 + t * (s.z2 - s.z1);
          const dx = curX - projX;
          const dz = curZ - projZ;
          const distSq = dx * dx + dz * dz;
          const minDist = radius + s.thickness;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist > 1e-4) {
              const overlap = minDist - dist;
              curX += (dx / dist) * overlap;
              curZ += (dz / dist) * overlap;
            }
          }
        }
      }

      // 4. Clamp within world boundaries
      curX = Math.max(this.bounds.minX + radius, Math.min(this.bounds.maxX - radius, curX));
      curZ = Math.max(this.bounds.minZ + radius, Math.min(this.bounds.maxZ - radius, curZ));
    }

    // Check if continuous slide reached an unblocked position
    const travelDist = Math.hypot(curX - oldPos.x, curZ - oldPos.z);
    if (travelDist <= maxAllowedDist && !this.isPointBlocked(curX, curZ, radius * 0.95)) {
      return new THREE.Vector3(curX, oldPos.y, curZ);
    }

    // Fallback: Try sliding along X only
    const slideXBlocked = this.isPointBlocked(candidateX, oldPos.z, radius);
    // Fallback: Try sliding along Z only
    const slideZBlocked = this.isPointBlocked(oldPos.x, candidateZ, radius);

    if (!slideXBlocked && slideZBlocked) {
      return new THREE.Vector3(candidateX, oldPos.y, oldPos.z);
    }
    if (!slideZBlocked && slideXBlocked) {
      return new THREE.Vector3(oldPos.x, oldPos.y, candidateZ);
    }

    // If both slide axes are partially clear, choose the one with greater delta component
    if (!slideXBlocked && !slideZBlocked) {
      if (Math.abs(delta.x) > Math.abs(delta.z)) {
        return new THREE.Vector3(candidateX, oldPos.y, oldPos.z);
      } else {
        return new THREE.Vector3(oldPos.x, oldPos.y, candidateZ);
      }
    }

    // Fully blocked, stay in place
    return new THREE.Vector3(oldPos.x, oldPos.y, oldPos.z);
  }
}
