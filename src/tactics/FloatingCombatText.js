// FloatingCombatText.js - Juicy 3D Ballistic Combat Numbers & Status Popups
import * as THREE from 'three';

export class FloatingCombatText {
  constructor(camera, container) {
    this.camera = camera;
    this.container = container;
    this.items = [];
    this.tempVec = new THREE.Vector3();
  }

  /**
   * @param {{ icon?: string, alt?: string }} [opts] Hito 81: icono delante del texto (avisos de estados). `alt` es el
   *   símbolo de texto, que se ve si la imagen no carga.
   *   `size` (Hito 89): tamaño relativo (0,8–1,7) según lo fuerte que fue el golpe.
   */
  spawn(worldPos, text, type = 'damage', opts = {}) {
    const el = document.createElement('div');
    const isCrit = type === 'crit' || (type === 'damage' && (text.includes('CRIT') || text.includes('CRÍTICO')));
    const isCollision = type === 'collision';
    el.className = 'floating-text float-' + (isCrit ? 'crit' : (isCollision ? 'collision' : type));
    if (opts.icon) {
      const img = document.createElement('img');
      img.className = 'float-st-ico';
      img.src = opts.icon; img.alt = opts.alt || ''; img.draggable = false;
      el.append(img, document.createTextNode(text));
    } else el.textContent = text;
    el.style.display = 'none';
    this.container.appendChild(el);

    // Initial upward velocity with slight random spread
    const spreadX = (Math.random() - 0.5) * 1.0;
    const spreadZ = (Math.random() - 0.5) * 1.0;
    const upwardSpeed = isCrit ? 4.8 : (isCollision ? 4.5 : 4.1);
    const startY = isCollision ? worldPos.y + 2.75 : worldPos.y + 2.35;

    const item = {
      el,
      isCrit,
      pos: new THREE.Vector3(worldPos.x + spreadX * 0.4, startY, worldPos.z + spreadZ * 0.4),
      velocity: new THREE.Vector3(spreadX * 0.9, upwardSpeed, spreadZ * 0.9),
      gravity: 7.2, // Pulls number down after apex
      opacity: 1.0,
      life: 0,
      maxLife: (isCrit ? 1.6 : (isCollision ? 1.5 : 1.4)) + Math.max(0, (opts.size || 1) - 1) * 0.5,
      scale: 0.3,
      size: Math.max(0.7, Math.min(1.45, opts.size || 1)),   // Hito 89: golpes grandes, números grandes
    };

    this.items.push(item);
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life += dt;

      if (item.life >= item.maxLife) {
        item.el.remove();
        this.items.splice(i, 1);
        continue;
      }

      // 1. Ballistic trajectory with gravity (rises, slows to apex, falls)
      item.pos.x += item.velocity.x * dt;
      item.pos.y += item.velocity.y * dt;
      item.pos.z += item.velocity.z * dt;
      item.velocity.y -= item.gravity * dt;

      const progress = item.life / item.maxLife;

      // 2. Juicy Scale Animation: Explosive pop -> settle at apex -> gentle shrink
      if (progress < 0.15) {
        const p = progress / 0.15;
        item.scale = 0.3 + (1.45 - 0.3) * Math.sin(p * Math.PI * 0.5);
      } else if (progress < 0.35) {
        const p = (progress - 0.15) / 0.20;
        item.scale = 1.45 - 0.45 * p;
      } else if (progress < 0.65) {
        // Apex suspension / hang in the air
        item.scale = 1.0;
      } else {
        // Falling down & shrinking slightly
        const p = (progress - 0.65) / 0.35;
        item.scale = 1.0 - 0.2 * p;
      }

      // 3. Opacity: Solid through the apex, then dissolves smoothly during descent
      if (progress > 0.65) {
        item.opacity = Math.max(0, 1.0 - (progress - 0.65) / 0.35);
      } else {
        item.opacity = 1.0;
      }

      // 4. Project 3D coordinate to 2D screen pixels
      this.tempVec.copy(item.pos);
      this.tempVec.project(this.camera);

      if (this.tempVec.z > 1) {
        item.el.style.display = 'none';
        continue;
      }

      const x = (this.tempVec.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(this.tempVec.y * 0.5) + 0.5) * window.innerHeight;

      const tilt = item.isCrit ? (Math.sin(item.life * 16) * 7 * Math.max(0, 1 - progress * 1.8)) : 0;
      item.el.style.display = 'block';
      item.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${item.scale * item.size}) rotate(${tilt}deg)`;
      item.el.style.opacity = item.opacity;
    }
  }

  clear() {
    this.items.forEach(item => item.el.remove());
    this.items = [];
  }
}
