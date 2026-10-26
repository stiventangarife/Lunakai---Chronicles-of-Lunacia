import * as THREE from 'three';
import { createSeededRandom } from './MathUtils.js';

/**
 * Gestor de Landmarks con modelos texturizados de alta calidad (Genshin style)
 * para Macro-Zona [2, 2]:
 * - Gran Árbol Ancestral en la orilla del río (X: -8, Z: -25)
 * - Santuario del Portal Antiguo (X: 115, Z: 65) con estatua Atia y columnas
 * - 3 Rocas Monolíticas flotantes con levitación mágica y partículas
 * - Dojō Secreto (X: -87.9, Z: 74.0)
 * - Gran Puente de madera rústico cruzando el río (X: 22, Z: 20)
 */
export class LandmarksManager {
  constructor(scene, terrain, assetManager) {
    this.scene = scene;
    this.terrain = terrain;
    this.assetManager = assetManager;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.particles = null;
    this.time = 0;

    this.buildElderTree();
    this.buildAncientShrine();
    // Dojō Secreto retirado (Hito 51): Paladill está en el dojo del pueblo del Bosque (ForestVillage)
    this.buildFloatingShrineMonoliths();
    // Puente de madera removido a petición del usuario
  }

  buildElderTree() {
    // Landmark 1: Gran Árbol Ancestral en la orilla del río (X: -8, Z: -25)
    const treeX = -8;
    const treeZ = -25;
    const treeY = this.terrain.getHeight(treeX, treeZ);

    const elderGroup = new THREE.Group();
    elderGroup.position.set(treeX, treeY, treeZ);

    // Árbol retorcido estilizado de alta calidad a escala monumental
    const elderTree = this.assetManager.cloneModel('tree_twisted_1') || this.assetManager.cloneModel('tree_common_1');
    if (elderTree) {
      elderTree.scale.set(4.8, 4.8, 4.8);
      elderTree.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            const name = (m.name || '').toLowerCase();
            if (name.includes('leaves') || name.includes('foliage')) {
              m.side = THREE.DoubleSide;
              m.roughness = 0.88;
              m.metalness = 0.0;
              m.emissive = new THREE.Color(0x281006); // Relleno cálido sutil otoñal sin brillo especular
              m.emissiveIntensity = 0.15;
            } else if (name.includes('bark') || name.includes('wood') || name.includes('trunk')) {
              m.roughness = 0.92;
              m.metalness = 0.0;
            }
          });
        }
      });
      elderGroup.add(elderTree);
    }

    // Helechos y flores al pie del árbol sagrado
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const fern = this.assetManager.cloneModel('fern_1');
      if (fern) {
        fern.scale.set(2.0, 2.0, 2.0);
        fern.position.set(Math.cos(ang) * 5.0, 0, Math.sin(ang) * 5.0);
        elderGroup.add(fern);
      }

      const flower = this.assetManager.cloneModel('flower_group_3');
      if (flower) {
        flower.scale.set(1.6, 1.6, 1.6);
        flower.position.set(Math.cos(ang + 0.3) * 6.0, 0, Math.sin(ang + 0.3) * 6.0);
        elderGroup.add(flower);
      }
    }

    // Luz mística dorada interior
    const mysticLight = new THREE.PointLight(0xffe285, 4.2, 45, 1.5);
    mysticLight.position.set(0, 18, 0);
    elderGroup.add(mysticLight);

    this.group.add(elderGroup);
  }

  buildAncientShrine() {
    // Landmark 2: Santuario del Portal Antiguo (X: 115, Z: 65)
    const shrineX = 115;
    const shrineZ = 65;
    const shrineY = this.terrain.getHeight(shrineX, shrineZ);

    const shrineGroup = new THREE.Group();
    shrineGroup.position.set(shrineX, shrineY, shrineZ);
    shrineGroup.rotation.y = -Math.PI * 0.25;

    const arch = this.assetManager.cloneModel('ancient_archway');
    if (arch) {
      arch.scale.set(1.8, 1.8, 1.8);
      shrineGroup.add(arch);
    }

    const statue = this.assetManager.cloneModel('statue_atia');
    if (statue) {
      statue.scale.set(1.5, 1.5, 1.5);
      statue.position.set(0, 0, -3.5);
      shrineGroup.add(statue);
    }

    const col1 = this.assetManager.cloneModel('column_1');
    if (col1) {
      col1.scale.set(1.5, 1.5, 1.5);
      col1.position.set(-7, 0, 0);
      shrineGroup.add(col1);
    }

    const col2 = this.assetManager.cloneModel('column_1');
    if (col2) {
      col2.scale.set(1.5, 1.5, 1.5);
      col2.position.set(7, 0, 0);
      shrineGroup.add(col2);
    }

    const portalLight = new THREE.PointLight(0x78d4ff, 3.2, 32, 1.6);
    portalLight.position.set(0, 6, 0);
    shrineGroup.add(portalLight);

    this.group.add(shrineGroup);
  }

  buildFloatingShrineMonoliths() {
    const rng = createSeededRandom(99001);
    // 3 Rocas Monolíticas StylisedRockCollection1 con levitación mágica alrededor del Santuario
    this.floatingRocks = [];

    const gltf = this.assetManager.getModel('rock_col_1');
    if (!gltf || !gltf.scene) return;

    // Extraer los pilares de roca del glb
    const rockMeshes = {};
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.name) {
        rockMeshes[child.name] = child;
      }
    });

    const configs = [
      {
        meshName: 'Rock1_1',
        x: 102,
        z: 56,
        heightAboveGround: 6.8,
        scale: 1.35,
        rotY: 0.45,
        bobSpeed: 1.15,
        bobAmp: 0.85,
        phase: 0.0,
        tiltAmp: 0.05
      },
      {
        meshName: 'Rock1_2',
        x: 129,
        z: 76,
        heightAboveGround: 7.8,
        scale: 1.45,
        rotY: -1.2,
        bobSpeed: 0.95,
        bobAmp: 1.10,
        phase: 2.1,
        tiltAmp: 0.06
      },
      {
        meshName: 'Rock1_3',
        x: 118,
        z: 46,
        heightAboveGround: 9.8,
        scale: 1.55,
        rotY: 2.3,
        bobSpeed: 0.82,
        bobAmp: 0.95,
        phase: 4.2,
        tiltAmp: 0.05
      }
    ];

    configs.forEach((cfg) => {
      const sourceMesh = rockMeshes[cfg.meshName] || Object.values(rockMeshes)[0];
      if (!sourceMesh) return;

      const rockMesh = sourceMesh.clone(true);
      rockMesh.position.set(0, 0, 0);
      rockMesh.rotation.set(0, 0, 0);

      const groundY = this.terrain.getHeight(cfg.x, cfg.z);
      const baseY = groundY + cfg.heightAboveGround;

      const holder = new THREE.Group();
      holder.position.set(cfg.x, baseY, cfg.z);
      holder.scale.set(cfg.scale, cfg.scale, cfg.scale);
      holder.rotation.set((rng() - 0.5) * 0.1, cfg.rotY, (rng() - 0.5) * 0.1);
      holder.add(rockMesh);

      // Resplandor de aura mágica arcana bajo cada roca levitante
      const auraLight = new THREE.PointLight(0x6ee7f7, 2.5, 20, 1.8);
      auraLight.position.set(0, -3.2, 0);
      holder.add(auraLight);

      // Chispas de energía mística en órbita
      const sparkCount = 28;
      const sparkPos = new Float32Array(sparkCount * 3);
      for (let s = 0; s < sparkCount; s++) {
        const theta = (s / sparkCount) * Math.PI * 2;
        const rad = 1.2 + rng() * 1.5;
        sparkPos[s * 3] = Math.cos(theta) * rad;
        sparkPos[s * 3 + 1] = -2.2 - rng() * 2.2;
        sparkPos[s * 3 + 2] = Math.sin(theta) * rad;
      }
      const sparkGeo = new THREE.BufferGeometry();
      sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: 0x99f6e4,
        size: 0.4,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
      holder.add(sparkPoints);

      this.group.add(holder);

      this.floatingRocks.push({
        holder,
        baseY,
        baseRotX: holder.rotation.x,
        baseRotY: cfg.rotY,
        baseRotZ: holder.rotation.z,
        bobSpeed: cfg.bobSpeed,
        bobAmp: cfg.bobAmp,
        phase: cfg.phase,
        tiltAmp: cfg.tiltAmp,
        light: auraLight,
        sparks: sparkPoints
      });
    });
  }

  buildForestDojo() {
    // Landmark 3: Dojō Secreto (X: -87.9, Z: 74.0)
    const dojoX = -94.9;
    const dojoZ = 74.0;
    const dojoY = this.terrain.getHeight(dojoX, dojoZ);

    const dojoGroup = new THREE.Group();
    dojoGroup.position.set(dojoX, dojoY + 1.0, dojoZ);
    dojoGroup.rotation.y = Math.PI * 0.01;

    const dojo = this.assetManager.cloneModel('stylized_dojo');
    if (dojo) {
      dojo.scale.set(5, 5, 5);
      dojo.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      dojoGroup.add(dojo);
    }

    const dojoLight = new THREE.PointLight(0xff9944, 2.8, 32, 1.5);
    dojoLight.position.set(0, 6.0, 0);
    dojoGroup.add(dojoLight);

    this.group.add(dojoGroup);
  }

  buildRiverBridge() {
    // Puente de madera removido a petición del usuario
  }

  update(delta) {
    this.time += delta;

    if (this.floatingRocks) {
      for (let i = 0; i < this.floatingRocks.length; i++) {
        const fr = this.floatingRocks[i];
        const t = this.time * fr.bobSpeed + fr.phase;

        fr.holder.position.y = fr.baseY + Math.sin(t) * fr.bobAmp;
        fr.holder.rotation.y = fr.baseRotY + this.time * 0.12 * (i % 2 === 0 ? 1 : -1) + Math.sin(t * 0.5) * 0.1;
        fr.holder.rotation.x = fr.baseRotX + Math.sin(t * 0.7) * fr.tiltAmp;
        fr.holder.rotation.z = fr.baseRotZ + Math.cos(t * 0.6) * fr.tiltAmp;

        if (fr.light) {
          fr.light.intensity = 2.2 + Math.sin(t * 1.8) * 0.6;
        }

        if (fr.sparks) {
          fr.sparks.rotation.y = this.time * 0.4;
        }
      }
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
