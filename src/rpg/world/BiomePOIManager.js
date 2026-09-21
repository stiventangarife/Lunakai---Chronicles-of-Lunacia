// BiomePOIManager.js - Environmental Storytelling POIs (Rune Archway, Campsite, Waterway with Stepping Stones)
import * as THREE from 'three';

export class BiomePOIManager {
  constructor(scene, collisions = null) {
    this.scene = scene;
    this.collisions = collisions;

    this.group = new THREE.Group();
    this.group.name = 'biome_poi_manager';
    this.scene.add(this.group);

    this.currentBiome = 'forest';

    // Subgroups per biome
    this.biomeGroups = {
      forest: new THREE.Group(),
      savannah: new THREE.Group(),
      arctic: new THREE.Group(),
      mystic: new THREE.Group(),
      dungeon: new THREE.Group()
    };

    Object.entries(this.biomeGroups).forEach(([biomeId, grp]) => {
      grp.name = `poi_group_${biomeId}`;
      grp.visible = (biomeId === 'forest');
      this.group.add(grp);
    });

    // Dynamic animatable elements
    this.animatedFlames = [];
    this.animatedBanners = [];
    this.animatedLights = [];
    this.animatedRunes = [];
    this.waterMaterials = [];

    this._initAllBiomes();
  }

  _initAllBiomes() {
    this._buildForestPOIs(this.biomeGroups.forest);
    this._buildSavannahPOIs(this.biomeGroups.savannah);
    this._buildArcticPOIs(this.biomeGroups.arctic);
    this._buildMysticPOIs(this.biomeGroups.mystic);
    this._buildDungeonPOIs(this.biomeGroups.dungeon);
    this._updateCollisions('forest');
  }

  // =========================================================================
  // SHARED PROCEDURAL TEXTURES & HELPERS
  // =========================================================================

  _createRuneTexture(runeColor = '#48e5c2', bgColor = 'rgba(0,0,0,0)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 512);

    ctx.strokeStyle = runeColor;
    ctx.fillStyle = runeColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw vertical sequence of ancient fantasy runes
    const glyphs = [
      // Glyph 1: Diamond rune
      (y) => {
        ctx.beginPath();
        ctx.moveTo(128, y - 35);
        ctx.lineTo(168, y);
        ctx.lineTo(128, y + 35);
        ctx.lineTo(88, y);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(128, y, 8, 0, Math.PI * 2);
        ctx.fill();
      },
      // Glyph 2: Triskelion / Tri-rune
      (y) => {
        ctx.beginPath();
        ctx.moveTo(128, y - 40);
        ctx.lineTo(128, y + 40);
        ctx.moveTo(90, y - 10);
        ctx.lineTo(166, y + 20);
        ctx.moveTo(166, y - 10);
        ctx.lineTo(90, y + 20);
        ctx.stroke();
      },
      // Glyph 3: Solar / Wing rune
      (y) => {
        ctx.beginPath();
        ctx.arc(128, y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(78, y);
        ctx.lineTo(178, y);
        ctx.stroke();
      },
      // Glyph 4: Chevron spire rune
      (y) => {
        ctx.beginPath();
        ctx.moveTo(128, y - 35);
        ctx.lineTo(95, y + 10);
        ctx.lineTo(128, y - 5);
        ctx.lineTo(161, y + 10);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(128, y - 5);
        ctx.lineTo(128, y + 35);
        ctx.stroke();
      }
    ];

    glyphs.forEach((drawGlyph, idx) => {
      drawGlyph(70 + idx * 115);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  _createBannerTexture(primaryColor, accentColor, emblemType = 'crest') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fabric background with subtle texture
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 256, 512);

    // Border trim
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, 224, 480);

    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, 200, 456);

    // Emblem in center
    ctx.fillStyle = accentColor;
    ctx.strokeStyle = accentColor;

    if (emblemType === 'crest' || emblemType === 'forest') {
      // Golden Lunacia Leaf Emblem
      ctx.beginPath();
      ctx.moveTo(128, 160);
      ctx.bezierCurveTo(190, 210, 190, 310, 128, 360);
      ctx.bezierCurveTo(66, 310, 66, 210, 128, 160);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(128, 180);
      ctx.lineTo(128, 350);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (emblemType === 'sun' || emblemType === 'savannah') {
      // Radiant Sun Wheel Emblem
      ctx.beginPath();
      ctx.arc(128, 260, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 8;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(angle) * 58, 260 + Math.sin(angle) * 58);
        ctx.lineTo(128 + Math.cos(angle) * 88, 260 + Math.sin(angle) * 88);
        ctx.stroke();
      }
    } else if (emblemType === 'ice' || emblemType === 'arctic') {
      // Glacial Snowflake Rune
      ctx.lineWidth = 8;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(128, 260);
        ctx.lineTo(128 + Math.cos(angle) * 75, 260 + Math.sin(angle) * 75);
        ctx.stroke();
        // V branches
        const bx = 128 + Math.cos(angle) * 50;
        const by = 260 + Math.sin(angle) * 50;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(angle + 0.6) * 22, by + Math.sin(angle + 0.6) * 22);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + Math.cos(angle - 0.6) * 22, by + Math.sin(angle - 0.6) * 22);
        ctx.stroke();
      }
    } else if (emblemType === 'star' || emblemType === 'mystic') {
      // Crescent Moon & 4-Point Astral Star
      ctx.beginPath();
      ctx.arc(120, 260, 52, -Math.PI * 0.45, Math.PI * 0.45, false);
      ctx.arc(140, 260, 42, Math.PI * 0.45, -Math.PI * 0.45, true);
      ctx.fill();
      // Star
      ctx.beginPath();
      ctx.moveTo(165, 230);
      ctx.lineTo(170, 242);
      ctx.lineTo(182, 245);
      ctx.lineTo(170, 248);
      ctx.lineTo(165, 260);
      ctx.lineTo(160, 248);
      ctx.lineTo(148, 245);
      ctx.lineTo(160, 242);
      ctx.closePath();
      ctx.fill();
    } else {
      // Dungeon Twin Sword / Dragon Crest
      ctx.beginPath();
      ctx.moveTo(128, 170);
      ctx.lineTo(175, 220);
      ctx.lineTo(155, 340);
      ctx.lineTo(128, 370);
      ctx.lineTo(101, 340);
      ctx.lineTo(81, 220);
      ctx.closePath();
      ctx.fill();
    }

    // Triangular banner tail cutout at bottom
    ctx.clearRect(0, 470, 256, 42);
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    ctx.lineTo(128, 430);
    ctx.lineTo(256, 470);
    ctx.lineTo(256, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // =========================================================================
  // ARCHWAY BUILDER
  // =========================================================================

  _createRuneArchway({
    stoneColor = 0xdcd7c8,
    runeColorHex = '#48e5c2',
    bannerPrimary = '#1e482d',
    bannerAccent = '#fbbf24',
    bannerEmblem = 'crest',
    posX = 0,
    posZ = -16,
    rotY = 0,
    scale = 1.0,
    hasIvy = true,
    ivyColor = 0x4a7c2a
  }) {
    const archGroup = new THREE.Group();
    archGroup.position.set(posX, 0, posZ);
    archGroup.rotation.y = rotY;
    archGroup.scale.setScalar(scale);

    // Stone material
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.85,
      metalness: 0.05
    });

    // Rune emissive material
    const runeTex = this._createRuneTexture(runeColorHex);
    const runeMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.82,
      emissive: new THREE.Color(runeColorHex),
      emissiveMap: runeTex,
      emissiveIntensity: 1.8
    });
    this.animatedRunes.push({ material: runeMat, baseIntensity: 1.8 });

    // 1. Plinths / Bases
    const baseGeo = new THREE.BoxGeometry(2.0, 0.7, 2.0);
    const baseLeft = new THREE.Mesh(baseGeo, stoneMat);
    baseLeft.position.set(-3.0, 0.35, 0);
    baseLeft.castShadow = true;
    baseLeft.receiveShadow = true;
    archGroup.add(baseLeft);

    const baseRight = new THREE.Mesh(baseGeo, stoneMat);
    baseRight.position.set(3.0, 0.35, 0);
    baseRight.castShadow = true;
    baseRight.receiveShadow = true;
    archGroup.add(baseRight);

    // 2. Pillars
    const pillarGeo = new THREE.BoxGeometry(1.5, 5.2, 1.5);
    const pillarLeft = new THREE.Mesh(pillarGeo, runeMat);
    pillarLeft.position.set(-3.0, 3.3, 0);
    pillarLeft.castShadow = true;
    pillarLeft.receiveShadow = true;
    archGroup.add(pillarLeft);

    const pillarRight = new THREE.Mesh(pillarGeo, runeMat);
    pillarRight.position.set(3.0, 3.3, 0);
    pillarRight.castShadow = true;
    pillarRight.receiveShadow = true;
    archGroup.add(pillarRight);

    // 3. Capitals (Top of pillars)
    const capGeo = new THREE.BoxGeometry(1.8, 0.5, 1.8);
    const capLeft = new THREE.Mesh(capGeo, stoneMat);
    capLeft.position.set(-3.0, 6.15, 0);
    capLeft.castShadow = true;
    archGroup.add(capLeft);

    const capRight = new THREE.Mesh(capGeo, stoneMat);
    capRight.position.set(3.0, 6.15, 0);
    capRight.castShadow = true;
    archGroup.add(capRight);

    // 4. Lintel Beam (Horizontal top stone)
    const lintelGeo = new THREE.BoxGeometry(8.2, 1.1, 1.7);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.position.set(0, 6.95, 0);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    archGroup.add(lintel);

    // 5. Ornate Keystone on Top
    const keystoneGeo = new THREE.BoxGeometry(1.5, 1.4, 1.9);
    const keystone = new THREE.Mesh(keystoneGeo, stoneMat);
    keystone.position.set(0, 7.3, 0);
    keystone.castShadow = true;
    archGroup.add(keystone);

    // 6. Iron Crossbar for Banner
    const barGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.4, 8);
    barGeo.rotateZ(Math.PI / 2);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8, roughness: 0.4 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, 6.2, 0);
    archGroup.add(bar);

    // 7. Hanging Fabric Banner
    const bannerTex = this._createBannerTexture(bannerPrimary, bannerAccent, bannerEmblem);
    const bannerGeo = new THREE.PlaneGeometry(2.4, 4.2, 12, 16);
    bannerGeo.translate(0, -2.1, 0); // Origin at top rod
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      side: THREE.DoubleSide,
      roughness: 0.9,
      transparent: true,
      alphaTest: 0.1
    });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(0, 6.2, 0.05);
    bannerMesh.castShadow = true;
    archGroup.add(bannerMesh);

    this.animatedBanners.push({
      mesh: bannerMesh,
      baseRotX: 0,
      speed: 1.8 + Math.random() * 0.4,
      amplitude: 0.09
    });

    // 8. Ivy / Moss Fronds on Pillars (if enabled)
    if (hasIvy) {
      const ivyMat = new THREE.MeshStandardMaterial({ color: ivyColor, roughness: 0.9 });
      for (let i = 0; i < 7; i++) {
        const ivyGeo = new THREE.BoxGeometry(0.35 + (i % 3) * 0.15, 0.5 + (i % 2) * 0.3, 0.15);
        const ivy = new THREE.Mesh(ivyGeo, ivyMat);
        const side = i % 2 === 0 ? -2.2 : 2.2;
        ivy.position.set(side, 1.2 + i * 0.7, 0.76);
        ivy.rotation.z = (i * 0.4) - 0.8;
        archGroup.add(ivy);
      }
    }

    return archGroup;
  }

  // =========================================================================
  // CAMPSITE POI BUILDER
  // =========================================================================

  _createCampfirePOI({
    posX = 7.5,
    posZ = 3.5,
    rotY = 0.3,
    tentType = 'lean_to',
    flameColor = 0xff7722,
    hasCauldron = true,
    stoneColor = 0x8a8479,
    woodColor = 0x5a3e22
  }) {
    const campGroup = new THREE.Group();
    campGroup.position.set(posX, 0, posZ);
    campGroup.rotation.y = rotY;

    // 1. Stone Fire Ring (8 rocks in circle)
    const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.9 });
    const ringRadius = 1.05;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const rockGeo = new THREE.DodecahedronGeometry(0.24 + (i % 3) * 0.05, 0);
      const rock = new THREE.Mesh(rockGeo, stoneMat);
      rock.position.set(Math.cos(angle) * ringRadius, 0.16, Math.sin(angle) * ringRadius);
      rock.rotation.set(angle * 0.7, angle, 0.2);
      rock.castShadow = true;
      rock.receiveShadow = true;
      campGroup.add(rock);
    }

    // 2. Charred Fire Pit Base
    const ashGeo = new THREE.CircleGeometry(0.9, 16);
    ashGeo.rotateX(-Math.PI / 2);
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.95 });
    const ash = new THREE.Mesh(ashGeo, ashMat);
    ash.position.y = 0.02;
    ash.receiveShadow = true;
    campGroup.add(ash);

    // 3. Firewood Logs (Crossed)
    const logMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.85 });
    const logGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      const ang = (i * Math.PI) / 2;
      log.rotation.x = 0.3;
      log.rotation.y = ang;
      log.rotation.z = Math.PI / 2;
      log.position.set(Math.cos(ang) * 0.15, 0.12, Math.sin(ang) * 0.15);
      log.castShadow = true;
      campGroup.add(log);
    }

    // 4. Stylized 3D Animated Flame
    const flameGeo = new THREE.ConeGeometry(0.32, 0.75, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: flameColor });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.45, 0);
    campGroup.add(flame);

    const innerFlameGeo = new THREE.ConeGeometry(0.18, 0.52, 6);
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffea77 });
    const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
    innerFlame.position.set(0, 0.38, 0);
    campGroup.add(innerFlame);

    // 5. Warm Flickering Point Light
    const fireLight = new THREE.PointLight(flameColor, 2.6, 11.0);
    fireLight.position.set(0, 0.8, 0);
    fireLight.castShadow = true;
    campGroup.add(fireLight);

    this.animatedFlames.push({
      mesh: flame,
      innerMesh: innerFlame,
      light: fireLight,
      baseIntensity: 2.6
    });

    // 6. Cooking Tripod & Hanging Cauldron
    if (hasCauldron) {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.3, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9 });

      for (let i = 0; i < 3; i++) {
        const ang = (i * Math.PI * 2) / 3;
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(Math.cos(ang) * 0.55, 1.05, Math.sin(ang) * 0.55);
        pole.rotation.x = Math.sin(ang) * 0.28;
        pole.rotation.z = -Math.cos(ang) * 0.28;
        pole.castShadow = true;
        campGroup.add(pole);
      }

      // Iron Cauldron Pot
      const potMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.65, roughness: 0.5 });
      const potGeo = new THREE.SphereGeometry(0.32, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.7);
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(0, 0.88, 0);
      pot.castShadow = true;
      campGroup.add(pot);

      // Chain
      const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4);
      const chain = new THREE.Mesh(chainGeo, potMat);
      chain.position.set(0, 1.35, 0);
      campGroup.add(chain);
    }

    // 7. Rolled Bedroll / Sleeping Mat
    const bedrollGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.4, 12);
    bedrollGeo.rotateZ(Math.PI / 2);
    const bedrollMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
    const bedroll = new THREE.Mesh(bedrollGeo, bedrollMat);
    bedroll.position.set(-1.8, 0.22, 0.6);
    bedroll.rotation.y = 0.4;
    bedroll.castShadow = true;
    campGroup.add(bedroll);

    // 8. Supply Wooden Crate & Knapsack
    const crateGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x78532f, roughness: 0.8 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(-2.0, 0.3, -0.7);
    crate.rotation.y = 0.25;
    crate.castShadow = true;
    campGroup.add(crate);

    const packGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(-1.6, 0.25, -1.2);
    pack.scale.set(1.0, 1.2, 0.8);
    pack.castShadow = true;
    campGroup.add(pack);

    // 9. Stone Stump with Lit Brass Lantern
    const stumpGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.55, 8);
    const stumpMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.9 });
    const stump = new THREE.Mesh(stumpGeo, stumpMat);
    stump.position.set(1.9, 0.27, -0.8);
    stump.castShadow = true;
    campGroup.add(stump);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.7, roughness: 0.3 });
    const lanternGeo = new THREE.BoxGeometry(0.2, 0.35, 0.2);
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(1.9, 0.72, -0.8);
    campGroup.add(lantern);

    const lanternLight = new THREE.PointLight(0xffbe55, 1.2, 6.0);
    lanternLight.position.set(1.9, 0.75, -0.8);
    campGroup.add(lanternLight);

    return campGroup;
  }

  // =========================================================================
  // WATERWAY & STEPPING STONES BUILDER
  // =========================================================================

  _createWaterwayPOI({
    startX = -22,
    endX = -10,
    centerZ = 2,
    waterColor = 0x44b8d5,
    stoneColor = 0xd8d4c6,
    steppingStonesCount = 5,
    width = 4.2
  }) {
    const waterGroup = new THREE.Group();

    // 1. Shallow Riverbed Depression & Translucent Stylized Water Surface
    const waterLength = Math.abs(endX - startX) + 6.0;
    const waterGeo = new THREE.PlaneGeometry(waterLength, width, 16, 8);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: waterColor,
      transparent: true,
      opacity: 0.78,
      roughness: 0.12,
      metalness: 0.10
    });
    this.waterMaterials.push(waterMat);

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set((startX + endX) / 2, 0.04, centerZ);
    waterMesh.receiveShadow = true;
    waterGroup.add(waterMesh);

    // 2. Riverbed Pebbles & Submerged Boulders
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x6e685f, roughness: 0.85 });
    for (let i = 0; i < 18; i++) {
      const pGeo = new THREE.DodecahedronGeometry(0.15 + (i % 4) * 0.08, 0);
      const pebble = new THREE.Mesh(pGeo, pebbleMat);
      const px = startX + ((endX - startX) * (i / 18)) + (Math.sin(i * 1.7) * 1.5);
      const pz = centerZ + ((i % 3) - 1) * (width * 0.35);
      pebble.position.set(px, 0.03, pz);
      pebble.scale.set(1.2, 0.5, 1.0);
      pebble.receiveShadow = true;
      waterGroup.add(pebble);
    }

    // 3. Stepping Stones Crossing (Pasos de Piedra) across the water
    const stoneMat = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.88,
      metalness: 0.04
    });

    const steppingStonePositions = [];
    const stoneStep = width / (steppingStonesCount + 1);
    const crossX = (startX + endX) / 2;

    for (let s = 1; s <= steppingStonesCount; s++) {
      const sz = centerZ - (width / 2) + s * stoneStep;
      const sx = crossX + Math.sin(s * 1.2) * 0.45;

      const slabGeo = new THREE.CylinderGeometry(0.48 + (s % 2) * 0.08, 0.52 + (s % 2) * 0.08, 0.16, 7);
      const slab = new THREE.Mesh(slabGeo, stoneMat);
      slab.position.set(sx, 0.09, sz); // Protrudes just above water level!
      slab.rotation.y = s * 0.8;
      slab.castShadow = true;
      slab.receiveShadow = true;
      waterGroup.add(slab);

      steppingStonePositions.push({ x: sx, z: sz });
    }

    // 4. Riverbank Cattails / Reeds along edges
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x4d7c35, roughness: 0.9 });
    const stalkGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.2, 4);
    const headGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x50331e, roughness: 0.95 });

    for (let r = 0; r < 10; r++) {
      const reed = new THREE.Group();
      const stalk = new THREE.Mesh(stalkGeo, reedMat);
      stalk.position.y = 0.6;
      reed.add(stalk);
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.95;
      reed.add(head);

      const sideSign = r % 2 === 0 ? 1 : -1;
      const rx = startX + ((endX - startX) * (r / 10));
      const rz = centerZ + sideSign * (width * 0.52 + (r % 3) * 0.2);
      reed.position.set(rx, 0, rz);
      reed.rotation.z = (Math.random() - 0.5) * 0.2;
      waterGroup.add(reed);
    }

    return waterGroup;
  }

  // =========================================================================
  // BIOME-SPECIFIC ASSEMBLERS
  // =========================================================================

  _buildForestPOIs(parentGroup) {
    // 1. Forest Ancient Rune Archway
    const arch = this._createRuneArchway({
      stoneColor: 0xdcd7c8,
      runeColorHex: '#48e5c2',
      bannerPrimary: '#1e482d',
      bannerAccent: '#fbbf24',
      bannerEmblem: 'crest',
      posX: 0,
      posZ: -16,
      rotY: 0,
      scale: 1.0,
      hasIvy: true,
      ivyColor: 0x4a7c2a
    });
    parentGroup.add(arch);

    // 2. Cozy Forest Campsite
    const camp = this._createCampfirePOI({
      posX: 7.5,
      posZ: 3.5,
      rotY: 0.3,
      tentType: 'lean_to',
      flameColor: 0xff7722,
      hasCauldron: true,
      stoneColor: 0x8a8479,
      woodColor: 0x5a3e22
    });
    parentGroup.add(camp);

    // 3. Clear Bubbling Waterway with Stepping Stones
    const water = this._createWaterwayPOI({
      startX: -22,
      endX: -10,
      centerZ: 2,
      waterColor: 0x44b8d5,
      stoneColor: 0xd8d4c6,
      steppingStonesCount: 5,
      width: 4.2
    });
    parentGroup.add(water);
  }

  _buildSavannahPOIs(parentGroup) {
    // 1. Red Sandstone Sun Gate
    const arch = this._createRuneArchway({
      stoneColor: 0xc97b52,
      runeColorHex: '#ffaa22',
      bannerPrimary: '#b91c1c',
      bannerAccent: '#f59e0b',
      bannerEmblem: 'sun',
      posX: 0,
      posZ: -16,
      rotY: 0,
      scale: 1.05,
      hasIvy: false
    });
    parentGroup.add(arch);

    // 2. Nomad Expedition Camp
    const camp = this._createCampfirePOI({
      posX: 7.5,
      posZ: 3.5,
      rotY: 0.3,
      flameColor: 0xff8811,
      hasCauldron: true,
      stoneColor: 0xa86e48,
      woodColor: 0x4a2e16
    });
    parentGroup.add(camp);

    // 3. Oasis Spring Pool
    const water = this._createWaterwayPOI({
      startX: -22,
      endX: -10,
      centerZ: 2,
      waterColor: 0x2dd4bf,
      stoneColor: 0xe0a070,
      steppingStonesCount: 5,
      width: 4.5
    });
    parentGroup.add(water);
  }

  _buildArcticPOIs(parentGroup) {
    // 1. Glacial Frost Rune Monolith
    const arch = this._createRuneArchway({
      stoneColor: 0x9fb5c9,
      runeColorHex: '#38d9ff',
      bannerPrimary: '#1e3a8a',
      bannerAccent: '#93c5fd',
      bannerEmblem: 'ice',
      posX: 0,
      posZ: -16,
      rotY: 0,
      scale: 1.0,
      hasIvy: false
    });
    parentGroup.add(arch);

    // 2. Snow Explorer Shelter & Melting Campfire (Chef Boreal camp)
    const camp = this._createCampfirePOI({
      posX: -5.2,
      posZ: -21.8,
      rotY: 0.3,
      flameColor: 0xff6600,
      hasCauldron: true,
      stoneColor: 0x75889a,
      woodColor: 0x3e3228
    });
    parentGroup.add(camp);

    // 3. Steaming Meltwater Stream
    const water = this._createWaterwayPOI({
      startX: -22,
      endX: -10,
      centerZ: 2,
      waterColor: 0x67e8f9,
      stoneColor: 0xd2dce6,
      steppingStonesCount: 5,
      width: 4.2
    });
    parentGroup.add(water);
  }

  _buildMysticPOIs(parentGroup) {
    // 1. Floating Celestial Archway
    const arch = this._createRuneArchway({
      stoneColor: 0x443358,
      runeColorHex: '#e056fd',
      bannerPrimary: '#4c1d95',
      bannerAccent: '#f43f5e',
      bannerEmblem: 'star',
      posX: 0,
      posZ: -16,
      rotY: 0,
      scale: 1.0,
      hasIvy: true,
      ivyColor: 0x9333ea
    });
    parentGroup.add(arch);

    // 2. Alchemist / Sorcerer Cauldron Camp
    const camp = this._createCampfirePOI({
      posX: 7.5,
      posZ: 3.5,
      rotY: 0.3,
      flameColor: 0xc026d3,
      hasCauldron: true,
      stoneColor: 0x3d2b4f,
      woodColor: 0x2e183b
    });
    parentGroup.add(camp);

    // 3. Liquid Starlight Brook
    const water = this._createWaterwayPOI({
      startX: -22,
      endX: -10,
      centerZ: 2,
      waterColor: 0xa855f7,
      stoneColor: 0x583d73,
      steppingStonesCount: 5,
      width: 4.2
    });
    parentGroup.add(water);
  }

  _buildDungeonPOIs(parentGroup) {
    // 1. Ruined Gothic Basalt Portal
    const arch = this._createRuneArchway({
      stoneColor: 0x2b2432,
      runeColorHex: '#ff3b30',
      bannerPrimary: '#18181b',
      bannerAccent: '#991b1b',
      bannerEmblem: 'dungeon',
      posX: 0,
      posZ: -16,
      rotY: 0,
      scale: 1.0,
      hasIvy: false
    });
    parentGroup.add(arch);

    // 2. Dungeon Explorer Brazier Camp
    const camp = this._createCampfirePOI({
      posX: 7.5,
      posZ: 3.5,
      rotY: 0.3,
      flameColor: 0xff3b10,
      hasCauldron: true,
      stoneColor: 0x241d2a,
      woodColor: 0x1f1922
    });
    parentGroup.add(camp);

    // 3. Dark Canal / Trench
    const water = this._createWaterwayPOI({
      startX: -22,
      endX: -10,
      centerZ: 2,
      waterColor: 0x0f172a,
      stoneColor: 0x3a3242,
      steppingStonesCount: 5,
      width: 4.2
    });
    parentGroup.add(water);
  }

  // =========================================================================
  // COLLISIONS & BIOME SWITCHING
  // =========================================================================

  _updateCollisions(biomeId) {
    if (!this.collisions) return;

    this.collisions.removeCirclesByTag('poi_prop');

    // Pillars of Archway at (0, 0, -16)
    this.collisions.addCircle(-3.0, -16, 0.9, 'poi_prop_arch_left');
    this.collisions.addCircle(3.0, -16, 0.9, 'poi_prop_arch_right');

    // Campfire core & supply crate
    if (biomeId === 'arctic') {
      this.collisions.addCircle(-5.2, -21.8, 1.1, 'poi_prop_campfire');
      this.collisions.addCircle(-7.0, -23.8, 0.6, 'poi_prop_crate');
    } else {
      this.collisions.addCircle(7.5, 3.5, 1.1, 'poi_prop_campfire');
      this.collisions.addCircle(5.5, 2.8, 0.6, 'poi_prop_crate');
    }
  }

  setBiome(biomeId) {
    this.currentBiome = biomeId;
    Object.entries(this.biomeGroups).forEach(([bId, grp]) => {
      grp.visible = (bId === biomeId);
    });
    this._updateCollisions(biomeId);
  }

  // =========================================================================
  // FRAME UPDATE ANIMATIONS (Flames, Banners, Runes, Water)
  // =========================================================================

  update(delta, elapsed) {
    const t = elapsed || performance.now() * 0.001;

    // 1. Campfire Flame Flutter & Light Flickering
    this.animatedFlames.forEach(f => {
      const flicker = Math.sin(t * 12.0) * 0.15 + Math.cos(t * 18.0) * 0.10;
      if (f.light) {
        f.light.intensity = f.baseIntensity + flicker * 0.8;
      }
      if (f.mesh) {
        f.mesh.scale.set(1.0 + flicker * 0.25, 1.0 + flicker * 0.35, 1.0 + flicker * 0.25);
      }
      if (f.innerMesh) {
        f.innerMesh.scale.set(1.0 - flicker * 0.2, 1.0 + flicker * 0.4, 1.0 - flicker * 0.2);
      }
    });

    // 2. Banner Gentle Wind Sway
    this.animatedBanners.forEach(b => {
      if (b.mesh) {
        const sway = Math.sin(t * b.speed) * b.amplitude + Math.sin(t * (b.speed * 0.5)) * (b.amplitude * 0.4);
        b.mesh.rotation.x = b.baseRotX + sway;
      }
    });

    // 3. Magical Rune Glow Pulsing
    this.animatedRunes.forEach(r => {
      if (r.material) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
        r.material.emissiveIntensity = r.baseIntensity * (0.75 + 0.45 * pulse);
      }
    });
  }
}
