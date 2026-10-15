import * as THREE from 'three';

/**
 * SavannaLandmarksManager.js - Key Landmarks of the Savannah Island:
 * 1. Desierto del Sol Naciente: Ancient sandstone Sun Altar facing the eastern ocean sunrise with solar obelisks.
 * 2. Campamento de Bing: Nomad outpost with bedouin tent, archery targets, campfire, and wind banner on the oasis overlook.
 * 3. Fragua Nómada de Baruk: Heavy basalt forge with anvil, glowing coals, water trough, and hammered steel ingots.
 */
export class SavannaLandmarksManager {
  constructor(parentGroup, terrain, assetManager) {
    this.parentGroup = parentGroup;
    this.terrain = terrain;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.group.name = 'SavannaLandmarksGroup';
    if (this.parentGroup) {
      this.parentGroup.add(this.group);
    }

    this.time = 0;
    this.animatedObjects = [];

    this.buildSunAltarLandmark();
    this.buildBingCampLandmark();
    this.buildBarukForgeLandmark();
  }

  // =========================================================================
  // 1. DESIERTO DEL SOL NACIENTE: SANTUARIO Y ALTAR SOLAR
  // Coordenadas: X: 68.0, Z: -30.0 (Meseta Este)
  // =========================================================================
  buildSunAltarLandmark() {
    const x = 68.0;
    const z = -30.0;
    const y = this.terrain ? this.terrain.getHeight(x, z) : 26.0;

    const altarGroup = new THREE.Group();
    altarGroup.position.set(x, y, z);
    altarGroup.name = 'Landmark_DesiertoDelSolNaciente';

    // 1. Base escalonada de arenisca dorada (Plataforma circular)
    const baseGeo = new THREE.CylinderGeometry(8.5, 9.5, 0.8, 16);
    const sandstoneMat = new THREE.MeshLambertMaterial({ color: 0xdeb06e });
    const baseMesh = new THREE.Mesh(baseGeo, sandstoneMat);
    baseMesh.position.y = 0.4;
    baseMesh.receiveShadow = true;
    altarGroup.add(baseMesh);

    const step2Geo = new THREE.CylinderGeometry(6.5, 7.2, 0.6, 16);
    const step2Mesh = new THREE.Mesh(step2Geo, sandstoneMat);
    step2Mesh.position.y = 1.0;
    step2Mesh.receiveShadow = true;
    altarGroup.add(step2Mesh);

    // 2. Disco Solar Central Flotante y Giratorio
    const discGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.25, 24);
    discGeo.rotateX(Math.PI / 2);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfcc744,
      metalness: 0.65,
      roughness: 0.25,
      emissive: 0x7a520e,
      emissiveIntensity: 0.45
    });
    const sunDisc = new THREE.Mesh(discGeo, goldMat);
    sunDisc.position.y = 3.6;
    altarGroup.add(sunDisc);

    // 3. Cuatro Obeliscos de Arenisca con Runas Solares
    const obeliskGeo = new THREE.CylinderGeometry(0.4, 0.85, 4.5, 4);
    const obeliskMat = new THREE.MeshLambertMaterial({ color: 0xc89855 });

    const obeliskPositions = [
      { ox: 5.2, oz: 0 },
      { ox: -5.2, oz: 0 },
      { ox: 0, oz: 5.2 },
      { ox: 0, oz: -5.2 }
    ];

    obeliskPositions.forEach(p => {
      const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
      obelisk.position.set(p.ox, 2.25, p.oz);
      obelisk.castShadow = true;
      obelisk.receiveShadow = true;
      altarGroup.add(obelisk);

      // Pequeña gema ámbar en la punta
      const crystalGeo = new THREE.OctahedronGeometry(0.35);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffea78 });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(p.ox, 4.7, p.oz);
      altarGroup.add(crystal);
    });

    // Luz dorada tenue del altar
    const sunLight = new THREE.PointLight(0xffdf88, 1.8, 18);
    sunLight.position.set(0, 3.8, 0);
    altarGroup.add(sunLight);

    this.group.add(altarGroup);

    this.animatedObjects.push({
      update: (time) => {
        sunDisc.rotation.z = time * 0.4;
        sunDisc.position.y = 3.6 + Math.sin(time * 1.5) * 0.15;
      }
    });
  }

  // =========================================================================
  // 2. CAMPAMENTO DE BING: PUESTO NÓMADA Y VIGÍA DEL OASIS
  // Coordenadas: X: -28.0, Z: -35.0 (Risco sobre el Oasis)
  // =========================================================================
  buildBingCampLandmark() {
    const x = -28.0;
    const z = -35.0;
    const y = this.terrain ? this.terrain.getHeight(x, z) : 25.5;

    const campGroup = new THREE.Group();
    campGroup.position.set(x, y, z);
    campGroup.name = 'Landmark_CampamentoDeBing';

    // 1. Tienda Nómada Beduina (Pabellón de campaña cónico/piramidal)
    const tentGeo = new THREE.ConeGeometry(3.8, 4.2, 6);
    const tentMat = new THREE.MeshLambertMaterial({
      color: 0xd9b37a,
      side: THREE.DoubleSide
    });
    const tentMesh = new THREE.Mesh(tentGeo, tentMat);
    tentMesh.position.set(0, 2.1, 0);
    tentMesh.castShadow = true;
    tentMesh.receiveShadow = true;
    campGroup.add(tentMesh);

    // Mástil central de madera
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.0, 6);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a391e });
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(0, 2.5, 0);
    campGroup.add(pole);

    // 2. Hoguera de Campamento con brasas
    const fireGeo = new THREE.DodecahedronGeometry(0.35);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6611 });
    const fireMesh = new THREE.Mesh(fireGeo, fireMat);
    fireMesh.position.set(3.8, 0.3, 1.8);
    campGroup.add(fireMesh);

    // Rocas alrededor de la hoguera
    const rockGeo = new THREE.DodecahedronGeometry(0.22);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x82705b });
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const rock = new THREE.Mesh(rockGeo, stoneMat);
      rock.position.set(3.8 + Math.cos(ang) * 0.7, 0.15, 1.8 + Math.sin(ang) * 0.7);
      campGroup.add(rock);
    }

    // Luz cálida de fogata
    const fireLight = new THREE.PointLight(0xff7722, 1.6, 12);
    fireLight.position.set(3.8, 0.8, 1.8);
    campGroup.add(fireLight);

    // 3. Diana de Práctica de Tiro con Arco (Target Dummy)
    const targetStandGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 5);
    const targetStand = new THREE.Mesh(targetStandGeo, woodMat);
    targetStand.position.set(-3.5, 1.0, 2.4);
    campGroup.add(targetStand);

    const targetDiscGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16);
    targetDiscGeo.rotateX(Math.PI / 2);
    const targetMat = new THREE.MeshLambertMaterial({ color: 0xcc3322 });
    const targetDisc = new THREE.Mesh(targetDiscGeo, targetMat);
    targetDisc.position.set(-3.5, 1.4, 2.4);
    campGroup.add(targetDisc);

    // 4. Mástil con Bandera / Estandarte Nómada ondeante
    const bannerPole = new THREE.Mesh(poleGeo, woodMat);
    bannerPole.position.set(4.8, 2.5, -2.5);
    campGroup.add(bannerPole);

    const bannerGeo = new THREE.PlaneGeometry(1.6, 0.8);
    const bannerMat = new THREE.MeshLambertMaterial({
      color: 0x3388bb,
      side: THREE.DoubleSide
    });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(4.8 + 0.8, 4.4, -2.5);
    campGroup.add(bannerMesh);

    this.group.add(campGroup);

    this.animatedObjects.push({
      update: (time) => {
        // Flickering campfire
        fireLight.intensity = 1.4 + Math.sin(time * 9.0) * 0.35 + Math.cos(time * 14.0) * 0.2;
        // Waving banner
        bannerMesh.rotation.y = Math.sin(time * 4.0) * 0.25;
      }
    });
  }

  // =========================================================================
  // 3. FRAGUA NÓMADA DE BARUK: HERRERÍA DEL CAÑÓN
  // Coordenadas: X: 42.0, Z: 48.0 (Albergue del Cañón)
  // =========================================================================
  buildBarukForgeLandmark() {
    const x = 42.0;
    const z = 48.0;
    const y = this.terrain ? this.terrain.getHeight(x, z) : 25.0;

    const forgeGroup = new THREE.Group();
    forgeGroup.position.set(x, y, z);
    forgeGroup.name = 'Landmark_FraguaNomadaDeBaruk';

    // 1. Horno de Piedra / Fragua con cámara ardiente
    const furnaceBaseGeo = new THREE.BoxGeometry(2.8, 1.8, 2.2);
    const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x4a423a });
    const furnace = new THREE.Mesh(furnaceBaseGeo, darkStoneMat);
    furnace.position.set(0, 0.9, 0);
    furnace.castShadow = true;
    furnace.receiveShadow = true;
    forgeGroup.add(furnace);

    // Chimenea cónica
    const chimneyGeo = new THREE.CylinderGeometry(0.4, 0.8, 2.5, 8);
    const chimney = new THREE.Mesh(chimneyGeo, darkStoneMat);
    chimney.position.set(0, 2.8, 0);
    forgeGroup.add(chimney);

    // Carbones encendidos dentro del fogón
    const coalsGeo = new THREE.BoxGeometry(1.4, 0.4, 0.8);
    const coalsMat = new THREE.MeshBasicMaterial({ color: 0xff3b0a });
    const coals = new THREE.Mesh(coalsGeo, coalsMat);
    coals.position.set(0, 1.1, 0.7);
    forgeGroup.add(coals);

    const forgeLight = new THREE.PointLight(0xff4411, 2.2, 14);
    forgeLight.position.set(0, 1.4, 1.1);
    forgeGroup.add(forgeLight);

    // 2. Gran Yunque sobre Bloque de Madera/Basalto
    const plinthGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.9, 8);
    const plinthMat = new THREE.MeshLambertMaterial({ color: 0x332822 });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(2.4, 0.45, 1.6);
    forgeGroup.add(plinth);

    const anvilGeo = new THREE.BoxGeometry(0.9, 0.5, 1.4);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x777f88,
      metalness: 0.85,
      roughness: 0.35
    });
    const anvil = new THREE.Mesh(anvilGeo, steelMat);
    anvil.position.set(2.4, 1.15, 1.6);
    anvil.castShadow = true;
    forgeGroup.add(anvil);

    // 3. Tina de Agua para Templar Acero
    const tubGeo = new THREE.CylinderGeometry(0.8, 0.7, 1.1, 10);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5a3e26 });
    const tub = new THREE.Mesh(tubGeo, woodMat);
    tub.position.set(-2.2, 0.55, 1.4);
    forgeGroup.add(tub);

    const waterGeo = new THREE.CircleGeometry(0.72, 10);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x1d5869 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(-2.2, 0.95, 1.4);
    forgeGroup.add(water);

    // 4. Lingotes de Acero de Atia apilados
    const ingotGeo = new THREE.BoxGeometry(0.3, 0.15, 0.7);
    for (let i = 0; i < 4; i++) {
      const ingot = new THREE.Mesh(ingotGeo, steelMat);
      ingot.position.set(1.4 + (i % 2) * 0.35, 0.1 + Math.floor(i / 2) * 0.16, 2.5);
      forgeGroup.add(ingot);
    }

    this.group.add(forgeGroup);

    this.animatedObjects.push({
      update: (time) => {
        forgeLight.intensity = 1.9 + Math.sin(time * 8.0) * 0.45;
      }
    });
  }

  update(delta) {
    this.time += delta;
    for (let i = 0; i < this.animatedObjects.length; i++) {
      this.animatedObjects[i].update(this.time);
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
