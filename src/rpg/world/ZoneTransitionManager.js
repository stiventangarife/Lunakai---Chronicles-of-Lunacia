// ZoneTransitionManager.js - Dofus-style edge arrows, directional curtains and zone heraldic banners
import { showZoneBanner as showLkZoneBanner } from '../ui/ZoneBanner.js';
import * as THREE from 'three';
import { MAP_REGISTRY } from './MapRegistry.js';

export function createQuestBeaconArrow3D(baseHeight = 2.0) {
  const root = new THREE.Group();
  root.name = 'quest_target_arrow_3d';

  // 1. Floating 3D Arrow Group
  const arrowGroup = new THREE.Group();
  arrowGroup.name = 'arrow_mesh_group';
  arrowGroup.position.y = baseHeight;

  // Golden glowing material matching TutorialManager
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xff9900,
    emissiveIntensity: 1.25,
    roughness: 0.2,
    metalness: 0.6
  });

  // Downward-pointing cone (arrow tip pointing directly at target)
  const coneGeo = new THREE.ConeGeometry(0.38, 0.75, 16);
  const cone = new THREE.Mesh(coneGeo, arrowMat);
  cone.rotation.x = Math.PI; // point downwards
  cone.position.y = 0.38;
  cone.castShadow = true;
  arrowGroup.add(cone);

  // Shaft / stem cylinder above cone
  const stemGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 16);
  const stem = new THREE.Mesh(stemGeo, arrowMat);
  stem.position.y = 0.95;
  stem.castShadow = true;
  arrowGroup.add(stem);

  // Sin PointLight: al mostrarse/ocultarse o crearse en mitad del juego cambia el número de luces
  // y three.js recompila TODOS los shaders iluminados (tirón). El brillo lo dan el material emisivo y el bloom.

  root.add(arrowGroup);

  root.userData = {
    arrowGroup,
    baseY: baseHeight,
    animTime: 0
  };

  root.updateAnimation = (dt) => {
    root.userData.animTime += dt;
    const t = root.userData.animTime;
    // Sinusoidal vertical bounce in the air
    arrowGroup.position.y = root.userData.baseY + Math.sin(t * 3.5) * 0.25;
    // Gentle rotation
    arrowGroup.rotation.y += dt * 2.0;
  };

  return root;
}

export class ZoneTransitionManager {
  constructor(scene, audio, overworldManager = null) {
    this.scene = scene;
    this.audio = audio;
    this.om = overworldManager;
    this.portalsGroup = new THREE.Group();
    this.scene.add(this.portalsGroup);

    this.activePortals = [];
    this.rawPortalsMap = null;
    this.portalsLocked = true; // Blocked by default until quest 1 is completed
    this.lockMessage = 'The cardinal pass is sealed by Master Paladill! Complete your first quest before leaving the Dojo.';
    this.onPortalBlocked = null;
    this.onPortalUnblocked = null;
    this.isStandingOnLockedPortal = false;
    this.isTransitioning = false;
    this.teleportCooldown = 0;
    this.onPortalTrigger = null;
    this.highlightedDirection = null;

    this._createDOM();
  }

  _createDOM() {
    // 1. Directional Screen Curtain & Biome Loading Screen
    let curtain = document.getElementById('zone-transition-curtain');
    if (!curtain) {
      curtain = document.createElement('div');
      curtain.id = 'zone-transition-curtain';
      curtain.className = 'zone-curtain hidden';
      document.body.appendChild(curtain);
    }
    if (!curtain.querySelector('.zone-loading-container')) {
      curtain.innerHTML = `
        <div class="zone-loading-container">
          <div class="zone-loading-runic-emblem">
            <div class="zone-loading-orb"></div>
            <div class="zone-loading-glow"></div>
            <div id="zone-loading-icon" class="zone-loading-icon"></div>
          </div>
          <div id="zone-loading-badge" class="zone-loading-badge">LUNAKAI</div>
          <h2 id="zone-loading-title" class="zone-loading-title">Loading Biome...</h2>
          <div id="zone-loading-subtitle" class="zone-loading-subtitle">Dojo Valley [2, 2]</div>
          <div class="zone-loading-bar-track">
            <div class="zone-loading-bar-fill"></div>
          </div>
          <div id="zone-loading-hint" class="zone-loading-hint">Preparing 3D environment and textures...</div>
        </div>
      `;
    }
    this.curtainEl = curtain;

    // 2. El rótulo de zona vive en ui/ZoneBanner.js (Crónica Celeste)

    // Inject CSS styles for Biome loading, Dofus transitions and banners
    if (!document.getElementById('zone-transition-styles')) {
      const style = document.createElement('style');
      style.id = 'zone-transition-styles';
      style.textContent = `
        .zone-curtain {
          position: fixed;
          inset: 0;
          z-index: 99999;
          pointer-events: none;
          background: radial-gradient(circle at center, #111827 0%, #030712 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .zone-curtain.hidden {
          display: none !important;
        }
        .zone-curtain.active {
          opacity: 1;
          pointer-events: all;
        }
        .zone-curtain.slide-north {
          transform: translateY(-100%);
        }
        .zone-curtain.slide-south {
          transform: translateY(100%);
        }
        .zone-curtain.slide-east {
          transform: translateX(100%);
        }
        .zone-curtain.slide-west {
          transform: translateX(-100%);
        }

        .zone-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #fff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          user-select: none;
          max-width: 440px;
          width: 90%;
          animation: zoneCurtainFloat 2.4s ease-in-out infinite alternate;
        }
        @keyframes zoneCurtainFloat {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-6px); }
        }
        .zone-loading-runic-emblem {
          position: relative;
          width: 84px;
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .zone-loading-orb {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #22c55e;
          border-bottom-color: #38bdf8;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
          contain: strict;
          animation: zoneSpinnerRotate 1.0s linear infinite;
        }
        @keyframes zoneSpinnerRotate {
          0% { transform: rotate(0deg) translateZ(0); }
          100% { transform: rotate(360deg) translateZ(0); }
        }
        .zone-loading-glow {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%);
          filter: blur(10px);
        }
        .zone-loading-icon {
          font-size: 38px;
          z-index: 2;
          filter: drop-shadow(0 2px 10px rgba(0,0,0,0.6));
        }
        .zone-loading-badge {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #22c55e;
          margin-bottom: 6px;
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
        }
        .zone-loading-title {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #f8fafc;
          margin: 0 0 6px 0;
          text-shadow: 0 4px 16px rgba(0,0,0,0.8);
        }
        .zone-loading-subtitle {
          font-size: 15px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 22px;
        }
        .zone-loading-bar-track {
          width: 240px;
          height: 6px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
          margin-bottom: 12px;
        }
        .zone-loading-bar-fill {
          position: absolute;
          inset: 0;
          width: 50%;
          background: linear-gradient(90deg, #22c55e, #38bdf8);
          border-radius: 999px;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
          animation: zoneLoadingBarSweep 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes zoneLoadingBarSweep {
          0% { transform: translateX(-100%) scaleX(0.7) translateZ(0); }
          50% { transform: translateX(50%) scaleX(1.1) translateZ(0); }
          100% { transform: translateX(200%) scaleX(0.7) translateZ(0); }
        }
        .zone-loading-hint {
          font-size: 12px;
          color: #64748b;
          letter-spacing: 0.3px;
        }

        .zone-discovery-banner {
          position: fixed;
          top: 32px;
          left: 50%;
          transform: translateX(-50%) translateY(-20px);
          z-index: 2500;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .zone-discovery-banner.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .banner-content {
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(56, 189, 248, 0.25);
          padding: 10px 32px;
          border-radius: 999px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .zone-biome-badge {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          padding: 2px 10px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.2);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.4);
        }
        .zone-name-title {
          margin: 2px 0;
          font-size: 20px;
          font-weight: 900;
          color: #f8fafc;
          letter-spacing: 0.5px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }
        .zone-subtext {
          font-size: 10px;
          color: #94a3b8;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `;
      document.head.appendChild(style);
    }
  }

  showLoading(zoneTitle = 'Dojo Valley [2, 2]', hint = 'Preparing 3D environment and textures...') {
    if (!this.curtainEl) return;
    const badgeEl = document.getElementById('zone-loading-badge');
    const titleEl = document.getElementById('zone-loading-title');
    const subtitleEl = document.getElementById('zone-loading-subtitle');
    const iconEl = document.getElementById('zone-loading-icon');
    const hintEl = document.getElementById('zone-loading-hint');

    if (badgeEl) badgeEl.textContent = 'LUNAKAI';
    if (titleEl) titleEl.textContent = 'Loading Biome...';
    if (subtitleEl) subtitleEl.textContent = zoneTitle;
    if (iconEl) iconEl.textContent = '';
    if (hintEl) hintEl.textContent = hint;

    this.curtainEl.classList.remove('hidden');
    this.curtainEl.classList.add('active');
  }

  hideLoading(delayMs = 500) {
    return new Promise((resolve) => {
      if (!this.curtainEl) {
        resolve();
        return;
      }
      this.curtainEl.classList.remove('active');
      setTimeout(() => {
        this.curtainEl.classList.add('hidden');
        resolve();
      }, delayMs);
    });
  }

  setPortals(portalsMap) {
    this.rawPortalsMap = portalsMap;
    // Cooldown prevents immediate re-trigger upon spawning
    this.teleportCooldown = 2.0;

    // Clear previous visual markers with deep disposal of meshes, geometries and materials
    while (this.portalsGroup.children.length > 0) {
      const obj = this.portalsGroup.children[0];
      this.portalsGroup.remove(obj);
      obj.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m && m.dispose && m.dispose());
            } else if (child.material.dispose) {
              child.material.dispose();
            }
          }
        }
      });
    }

    this.activePortals = Object.values(portalsMap || {});

    // Visual styles depending on locked state
    const ringColor = this.portalsLocked ? 0xf59e0b : 0x38bdf8;
    const ringOpacity = this.portalsLocked ? 0.35 : 0.65;
    const arrowColor = this.portalsLocked ? 0xd97706 : 0xffffff;
    const arrowOpacity = this.portalsLocked ? 0.45 : 0.85;

    // Create 3D Dofus-style edge markers on ground
    this.activePortals.forEach((portal) => {
      const pGroup = new THREE.Group();
      let groundY = portal.position.y || 0.0;
      if (this.om) {
        if (typeof this.om.getGroundHeight === 'function') {
          groundY = this.om.getGroundHeight(portal.position.x, portal.position.z);
        } else if (this.om.demoScenaZone && this.om.demoScenaZone.isActive && typeof this.om.demoScenaZone.getHeight === 'function') {
          groundY = this.om.demoScenaZone.getHeight(portal.position.x, portal.position.z);
        }
      }
      portal.calculatedY = groundY;
      pGroup.position.set(portal.position.x, groundY + 0.05, portal.position.z);

      // 1. Pulsing Outer Ring
      const ringGeo = new THREE.RingGeometry(1.2, 1.6, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: ringOpacity,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      pGroup.add(ringMesh);

      // 2. Cardinal Arrow Indicator
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 0.8);
      arrowShape.lineTo(0.5, -0.4);
      arrowShape.lineTo(0.2, -0.2);
      arrowShape.lineTo(0.2, -0.7);
      arrowShape.lineTo(-0.2, -0.7);
      arrowShape.lineTo(-0.2, -0.2);
      arrowShape.lineTo(-0.5, -0.4);
      arrowShape.closePath();

      const arrowGeo = new THREE.ShapeGeometry(arrowShape);
      arrowGeo.rotateX(-Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: arrowColor,
        transparent: true,
        opacity: arrowOpacity,
        side: THREE.DoubleSide
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      arrowMesh.rotation.y = portal.arrowHeading || 0;
      arrowMesh.position.y = 0.02;
      pGroup.add(arrowMesh);

      pGroup.userData = { portal, ringMesh, baseScale: 1.0, time: Math.random() * 10, isHighlighted: false, beacon: null };
      this.portalsGroup.add(pGroup);
    });

    if (this.highlightedDirection) {
      this.setHighlightedPortal(this.highlightedDirection);
    }
  }

  setHighlightedPortal(direction) {
    this.highlightedDirection = direction;
    this.portalsGroup.children.forEach((pGroup) => {
      const data = pGroup.userData;
      if (!data || !data.portal) return;

      const isTarget = (data.portal.direction === direction);
      data.isHighlighted = isTarget;

      if (isTarget) {
        if (!data.beacon) {
          data.beacon = createQuestBeaconArrow3D(2.0);
          data.beacon.position.set(0, 0, 0);
          pGroup.add(data.beacon);
        }
        data.beacon.visible = true;
        if (data.ringMesh) {
          data.ringMesh.material.color.setHex(0xfbbf24);
          data.ringMesh.material.opacity = 0.95;
        }
      } else {
        if (data.beacon) {
          data.beacon.visible = false;
        }
        if (data.ringMesh) {
          data.ringMesh.material.color.setHex(this.portalsLocked ? 0xf59e0b : 0x38bdf8);
          data.ringMesh.material.opacity = this.portalsLocked ? 0.35 : 0.65;
        }
      }
    });
  }

  setPortalsLocked(locked = true, reason = null) {
    this.portalsLocked = locked;
    if (reason) this.lockMessage = reason;
    if (!locked && this.isStandingOnLockedPortal) {
      this.isStandingOnLockedPortal = false;
      if (this.onPortalUnblocked) {
        this.onPortalUnblocked();
      }
    }
    if (this.rawPortalsMap) {
      this.setPortals(this.rawPortalsMap);
    }
  }

  update(dt, playerPosition) {
    if (!playerPosition || this.isTransitioning) return;

    // Animate portal rings pulsation and quest beacon
    this.portalsGroup.children.forEach((pGroup) => {
      if (pGroup.userData) {
        const speed = pGroup.userData.isHighlighted ? 4.5 : 3.0;
        pGroup.userData.time += dt * speed;
        const amp = pGroup.userData.isHighlighted ? 0.16 : 0.08;
        const scale = 1.0 + Math.sin(pGroup.userData.time) * amp;
        pGroup.scale.set(scale, 1.0, scale);

        if (pGroup.userData.beacon && pGroup.userData.isHighlighted) {
          if (typeof pGroup.userData.beacon.updateAnimation === 'function') {
            pGroup.userData.beacon.updateAnimation(dt);
          }
        }
      }
    });

    // Cooldown check for portal entry
    if (this.teleportCooldown > 0) {
      this.teleportCooldown -= dt;
      return;
    }

    // Proximity check
    let standingOnLocked = false;
    for (const portal of this.activePortals) {
      const dx = playerPosition.x - portal.position.x;
      const dz = playerPosition.z - portal.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const targetY = (portal.calculatedY !== undefined) ? portal.calculatedY : (portal.position.y || 0);
      const dy = Math.abs(playerPosition.y - targetY);

      if (dist <= portal.triggerRadius && dy <= 3.5) {
        if (this.portalsLocked) {
          standingOnLocked = true;
          if (!this.isStandingOnLockedPortal) {
            this.isStandingOnLockedPortal = true;
            if (this.onPortalBlocked) {
              this.onPortalBlocked(portal, this.lockMessage, true);
            }
          }
          break;
        }
        this._triggerTransition(portal);
        break;
      }
    }

    if (this.portalsLocked && !standingOnLocked && this.isStandingOnLockedPortal) {
      const nearAny = this.activePortals.some(portal => {
        const dx = playerPosition.x - portal.position.x;
        const dz = playerPosition.z - portal.position.z;
        return Math.sqrt(dx * dx + dz * dz) <= portal.triggerRadius + 0.6;
      });
      if (!nearAny) {
        this.isStandingOnLockedPortal = false;
        if (this.onPortalUnblocked) {
          this.onPortalUnblocked();
        }
      }
    }
  }

  async _triggerTransition(portal) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    if (this.om) this.om.isLoadingZone = true;

    console.log(`[ZoneTransitionManager] Teleport triggered: ${portal.direction} -> ${portal.targetMap}`);

    if (this.onTransitionStart) {
      this.onTransitionStart(portal);
    }

    if (this.audio && typeof this.audio.playSfx === 'function') {
      this.audio.playSfx('menu_confirm');
    }

    const targetDef = MAP_REGISTRY[portal.targetMap];
    const targetName = targetDef?.name || portal.label || 'New Biome';

    // 1. Show loading screen with "Loading Biome..."
    this.showLoading(targetName, 'Synchronizing 3D meshes and textures...');

    // Wait until the curtain has fully covered the viewport before starting heavy map rebuilding
    await new Promise((r) => setTimeout(r, 450));
    await new Promise((r) => requestAnimationFrame(r));

    // 2. Perform map change callback
    if (this.onPortalTrigger) {
      await this.onPortalTrigger(portal);
    }

    // 3. Wait until the first useful frame of the new zone is rendered by Three.js
    if (this.om && typeof this.om.waitForNextRenderFrame === 'function') {
      await this.om.waitForNextRenderFrame(2);
    } else {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    // 4. Smooth fade out of the loading curtain (CSS opacity transition)
    await this.hideLoading(500);

    // 5. Hand control back to the player and release teleport cooldown
    if (this.om) this.om.isLoadingZone = false;
    this.isTransitioning = false;
    this.teleportCooldown = 2.0;
    if (this.onTransitionEnd) {
      this.onTransitionEnd(portal);
    }
  }

  showZoneBanner(zoneName, biomeBadge) {
    showLkZoneBanner(zoneName, biomeBadge);
  }

}
