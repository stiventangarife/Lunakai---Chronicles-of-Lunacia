// ZoneTransitionManager.js - Dofus-style edge arrows, directional curtains and zone heraldic banners
import * as THREE from 'three';

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
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.5
  });

  // Downward-pointing cone
  const coneGeo = new THREE.ConeGeometry(0.34, 0.65, 16);
  const cone = new THREE.Mesh(coneGeo, arrowMat);
  cone.rotation.x = Math.PI; // point downwards
  cone.position.y = 0.32;
  cone.castShadow = true;
  arrowGroup.add(cone);

  // Shaft / stem cylinder above cone
  const stemGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.45, 16);
  const stem = new THREE.Mesh(stemGeo, arrowMat);
  stem.position.y = 0.78;
  stem.castShadow = true;
  arrowGroup.add(stem);

  // Warm golden PointLight
  const arrowLight = new THREE.PointLight(0xffd700, 1.8, 3.8);
  arrowLight.position.y = 0.78;
  arrowGroup.add(arrowLight);

  root.add(arrowGroup);

  // 2. Glowing ground ring marker
  const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const groundRing = new THREE.Mesh(ringGeo, ringMat);
  groundRing.position.y = 0.02;
  root.add(groundRing);

  root.userData = {
    arrowGroup,
    groundRing,
    baseY: baseHeight,
    animTime: 0
  };

  root.updateAnimation = (dt) => {
    root.userData.animTime += dt;
    const t = root.userData.animTime;
    // Sinusoidal vertical bounce
    arrowGroup.position.y = root.userData.baseY + Math.sin(t * 3.5) * 0.22;
    // Gentle rotation
    arrowGroup.rotation.y += dt * 1.8;
    // Ground ring pulse
    if (groundRing) {
      const pulse = 1.0 + Math.sin(t * 4.5) * 0.14;
      groundRing.scale.set(pulse, 1.0, pulse);
    }
  };

  return root;
}

export class ZoneTransitionManager {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
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
    // 1. Directional Screen Curtain
    let curtain = document.getElementById('zone-transition-curtain');
    if (!curtain) {
      curtain = document.createElement('div');
      curtain.id = 'zone-transition-curtain';
      curtain.className = 'zone-curtain hidden';
      document.body.appendChild(curtain);
    }
    this.curtainEl = curtain;

    // 2. Zone Discovery Heraldic Banner
    let banner = document.getElementById('zone-discovery-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'zone-discovery-banner';
      banner.className = 'zone-discovery-banner hidden';
      banner.innerHTML = `
        <div class="banner-glow"></div>
        <div class="banner-content">
          <span id="zone-biome-badge" class="zone-biome-badge">🌲 FOREST</span>
          <h2 id="zone-name-title" class="zone-name-title">Dojo Valley</h2>
          <span class="zone-subtext">Lunacia Region Discovered</span>
        </div>
      `;
      document.body.appendChild(banner);
    }
    this.bannerEl = banner;
    this.badgeEl = document.getElementById('zone-biome-badge');
    this.titleEl = document.getElementById('zone-name-title');

    // Inject CSS styles for Dofus transitions and banners
    if (!document.getElementById('zone-transition-styles')) {
      const style = document.createElement('style');
      style.id = 'zone-transition-styles';
      style.textContent = `
        .zone-curtain {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          background: #0b0f19;
          opacity: 0;
          transition: opacity 0.35s ease-in-out, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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

  setPortals(portalsMap) {
    this.rawPortalsMap = portalsMap;
    // Cooldown prevents immediate re-trigger upon spawning
    this.teleportCooldown = 2.0;

    // Clear previous visual markers
    while (this.portalsGroup.children.length > 0) {
      const obj = this.portalsGroup.children[0];
      this.portalsGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
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
      pGroup.position.set(portal.position.x, 0.05, portal.position.z);

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

      if (dist <= portal.triggerRadius) {
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

    console.log(`[ZoneTransitionManager] Teleport triggered: ${portal.direction} -> ${portal.targetMap}`);

    if (this.onTransitionStart) {
      this.onTransitionStart(portal);
    }

    if (this.audio && typeof this.audio.playSfx === 'function') {
      this.audio.playSfx('menu_confirm');
    }

    // 1. Play directional slide/curtain in
    this.curtainEl.classList.remove('hidden');
    this.curtainEl.classList.add('active');

    await new Promise((r) => setTimeout(r, 380));

    // 2. Perform map change callback
    if (this.onPortalTrigger) {
      await this.onPortalTrigger(portal);
    }

    await new Promise((r) => setTimeout(r, 120));

    // 3. Fade out curtain
    this.curtainEl.classList.remove('active');
    setTimeout(() => {
      this.curtainEl.classList.add('hidden');
      this.isTransitioning = false;
      this.teleportCooldown = 2.0;
      if (this.onTransitionEnd) {
        this.onTransitionEnd(portal);
      }
    }, 380);
  }

  showZoneBanner(zoneName, biomeBadge) {
    if (!this.bannerEl) return;
    if (this.titleEl) this.titleEl.textContent = zoneName;
    if (this.badgeEl) this.badgeEl.textContent = biomeBadge;

    this.bannerEl.classList.remove('hidden');
    // Force reflow
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('visible');

    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this.bannerEl.classList.remove('visible');
      setTimeout(() => {
        this.bannerEl.classList.add('hidden');
      }, 500);
    }, 3200);
  }
}
