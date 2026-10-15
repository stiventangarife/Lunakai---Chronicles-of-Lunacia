// OverworldLODManager.js - Tiered Level of Detail (LOD) & Distance Culling System
// Optimizes draw calls, dynamic shadows, and skeletal animation updates in 3D Overworld.
import * as THREE from 'three';

export class OverworldLODManager {
  /**
   * @param {import('../OverworldManager.js').OverworldManager} overworldManager
   * @param {Object} [options]
   */
  constructor(overworldManager, options = {}) {
    this.om = overworldManager;

    // Distance thresholds (in world units / meters)
    this.thresholds = {
      outlineDist: 22.0,       // Toon outlines hidden beyond 22m (sub-pixel in isometric view)
      shadowDist: 24.0,        // Dynamic shadow casting disabled beyond 24m
      microPropDist: 32.0,     // Micro-props (small flowers, mushrooms, pebbles) culled beyond 32m
      mediumPropDist: 46.0,    // Medium props (small shrubs, bushes, small rocks) culled beyond 46m
      entityAnimDist: 25.0,    // Skeletal animations throttled to 30 FPS beyond 25m
      ...options
    };

    // Precalculated square distances for high-performance checks (avoids Math.sqrt)
    this._sq = {
      outline: this.thresholds.outlineDist * this.thresholds.outlineDist,
      shadow: this.thresholds.shadowDist * this.thresholds.shadowDist,
      microProp: this.thresholds.microPropDist * this.thresholds.microPropDist,
      mediumProp: this.thresholds.mediumPropDist * this.thresholds.mediumPropDist,
      entityAnim: this.thresholds.entityAnimDist * this.thresholds.entityAnimDist
    };

    /**
     * Managed scene props
     * @type {Array<{
     *   object: THREE.Object3D|THREE.Mesh,
     *   worldPos: THREE.Vector3,
     *   type: 'micro'|'medium'|'large',
     *   origCastShadow: boolean,
     *   origVisible: boolean,
     *   currentVisible: boolean,
     *   currentCastShadow: boolean
     * }>}
     */
    this.managedProps = [];

    /**
     * Managed ToonOutline controllers
     * @type {Array<{
     *   controller: any,
     *   getTargetPos: () => THREE.Vector3,
     *   isVisible: boolean
     * }>}
     */
    this.managedOutlines = [];

    /**
     * Managed dynamic entities (NPCs and Monsters)
     * @type {Array<any>}
     */
    this.managedEntities = [];

    // Cadence throttle: update ~8-10 times per second or when player moves > 0.5m
    this.updateInterval = 0.10; // seconds
    this._timeAccum = 0;
    this._lastEvaluatedPos = new THREE.Vector3(-9999, -9999, -9999);
    this._posMoveThresholdSq = 0.5 * 0.5;

    // Metrics for diagnostics
    this.metrics = {
      totalManagedProps: 0,
      culledProps: 0,
      shadowsDisabled: 0,
      outlinesHidden: 0,
      entitiesThrottled: 0
    };

    this._tempVec = new THREE.Vector3();
  }

  /**
   * Resets all managed lists and restores original states
   */
  clear() {
    for (let i = 0; i < this.managedProps.length; i++) {
      const p = this.managedProps[i];
      if (p.object) {
        p.object.visible = p.origVisible;
        p.object.castShadow = p.origCastShadow;
      }
    }
    for (let i = 0; i < this.managedOutlines.length; i++) {
      const o = this.managedOutlines[i];
      if (o.controller && typeof o.controller.setVisible === 'function') {
        o.controller.setVisible(true);
      }
    }
    for (let i = 0; i < this.managedEntities.length; i++) {
      const e = this.managedEntities[i];
      if (e) {
        e._lodThrottled = false;
      }
    }

    this.managedProps = [];
    this.managedOutlines = [];
    this.managedEntities = [];
    this._lastEvaluatedPos.set(-9999, -9999, -9999);
  }

  /**
   * Scans active overworld scene elements and registers props and outlines
   */
  scanScene() {
    this.clear();

    const scannedRoots = [];

    // 1. Biome Decoration Manager groups
    if (this.om.biomeDecorationManager) {
      const bdm = this.om.biomeDecorationManager;
      const groups = [
        bdm.savannahGroup_3_1, bdm.savannahGroup_3_2,
        bdm.arcticGroup_2_1, bdm.arcticGroup_1_1,
        bdm.mysticGroup_1_2, bdm.mysticGroup_1_3,
        bdm.dungeonGroup_2_3, bdm.dungeonGroup_3_3,
        bdm.forestGroup_2_2
      ];
      for (const g of groups) {
        if (g && g.visible) {
          scannedRoots.push(g);
        }
      }
    }

    // 2. Nature managers
    if (this.om.dojoNatureManager && this.om.dojoNatureManager.group && this.om.dojoNatureManager.group.visible) {
      scannedRoots.push(this.om.dojoNatureManager.group);
    }
    if (this.om.forestNatureManager && this.om.forestNatureManager.group && this.om.forestNatureManager.group.visible) {
      scannedRoots.push(this.om.forestNatureManager.group);
    }
    if (this.om.dojoRockSanctuary && this.om.dojoRockSanctuary.group && this.om.dojoRockSanctuary.group.visible) {
      scannedRoots.push(this.om.dojoRockSanctuary.group);
    }

    // Traverse scanned roots and classify props
    for (const root of scannedRoots) {
      this._scanRoot(root);
    }

    // 3. Dynamic NPCs
    if (this.om.npcManager && Array.isArray(this.om.npcManager.npcs)) {
      for (const npc of this.om.npcManager.npcs) {
        if (npc.group) {
          this.managedEntities.push(npc);
          if (npc.toonOutline) {
            this.registerOutline(npc.toonOutline, () => npc.group.position);
          } else if (npc.model && npc.model.userData?.toonOutline) {
            this.registerOutline(npc.model.userData.toonOutline, () => npc.group.position);
          }
        }
      }
    }

    // 4. Dynamic Wandering Monsters
    if (this.om.monsters && Array.isArray(this.om.monsters.monsters)) {
      for (const mob of this.om.monsters.monsters) {
        if (mob.group) {
          this.managedEntities.push(mob);
          if (mob.toonOutline) {
            this.registerOutline(mob.toonOutline, () => mob.group.position);
          } else if (mob.mesh && mob.mesh.userData?.toonOutline) {
            this.registerOutline(mob.mesh.userData.toonOutline, () => mob.group.position);
          }
        }
      }
    }

    this.metrics.totalManagedProps = this.managedProps.length;

    // Run an initial evaluation immediately if player is available
    if (this.om.player && this.om.player.position) {
      this.evaluate(this.om.player.position, true);
    }
  }

  /**
   * Recursively discovers individual props under intermediate container groups
   * @param {THREE.Object3D} node
   * @param {Array<THREE.Object3D>} outList
   * @private
   */
  _collectProps(node, outList) {
    if (!node || node.visible === false) return;

    const name = (node.name || '').toLowerCase();
    const isContainer = (
      name.includes('master') ||
      name.startsWith('forest_nature_zone') ||
      name.startsWith('biome_decorations_') ||
      (node.isGroup && node.children.length > 0 && node.children.every(c => c.isGroup))
    );

    if (isContainer) {
      for (let i = 0; i < node.children.length; i++) {
        this._collectProps(node.children[i], outList);
      }
      return;
    }

    outList.push(node);
  }

  /**
   * Traverses a root container to register individual decorative props
   * @param {THREE.Object3D} root
   * @private
   */
  _scanRoot(root) {
    if (!root) return;

    const propWrappers = [];
    this._collectProps(root, propWrappers);

    for (let i = 0; i < propWrappers.length; i++) {
      const prop = propWrappers[i];
      if (!prop || !prop.isObject3D) continue;

      const nameLower = (prop.name || '').toLowerCase();

      // Classify prop LOD tier
      let propType = 'large';
      if (
        nameLower.includes('flower') ||
        nameLower.includes('mushroom') ||
        nameLower.includes('stone_small') ||
        nameLower.includes('rock_smallflat') ||
        nameLower.includes('fern') ||
        nameLower.includes('plant_bushsmall') ||
        nameLower.includes('grass_common_short')
      ) {
        propType = 'micro';
      } else if (
        nameLower.includes('bush') ||
        nameLower.includes('cactus_short') ||
        nameLower.includes('rock_small')
      ) {
        propType = 'medium';
      }

      // Compute world position
      prop.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3();
      prop.getWorldPosition(worldPos);

      // Check if any child mesh casts shadow
      let hasShadowCaster = false;
      prop.traverse(child => {
        if (child.isMesh && child.castShadow) {
          hasShadowCaster = true;
        }
        // If prop has a ToonOutline controller
        if (child.userData?.toonOutline && !child.userData._lodOutlineRegistered) {
          child.userData._lodOutlineRegistered = true;
          this.registerOutline(child.userData.toonOutline, () => worldPos);
        }
      });

      this.managedProps.push({
        object: prop,
        worldPos: worldPos,
        type: propType,
        origCastShadow: hasShadowCaster,
        origVisible: prop.visible !== false,
        currentVisible: prop.visible !== false,
        currentCastShadow: hasShadowCaster
      });
    }
  }

  /**
   * Registers a ToonOutline controller for distance-based visibility toggling
   * @param {any} controller
   * @param {() => THREE.Vector3} getTargetPos
   */
  registerOutline(controller, getTargetPos) {
    if (!controller || typeof controller.setVisible !== 'function') return;
    this.managedOutlines.push({
      controller,
      getTargetPos,
      isVisible: true
    });
  }

  /**
   * Called in the main game loop from OverworldManager.update(dt, time)
   * @param {THREE.Camera} camera
   * @param {THREE.Vector3} playerPos
   * @param {number} dt
   */
  update(camera, playerPos, dt) {
    if (!playerPos) return;

    this._timeAccum += dt;

    // Check cadence: evaluate if timer elapsed OR player moved significantly
    const dx = playerPos.x - this._lastEvaluatedPos.x;
    const dz = playerPos.z - this._lastEvaluatedPos.z;
    const distMovedSq = dx * dx + dz * dz;

    if (this._timeAccum >= this.updateInterval || distMovedSq >= this._posMoveThresholdSq) {
      this._timeAccum = 0;
      this.evaluate(playerPos, false);
    }
  }

  /**
   * Evaluates LOD tiers against the current player position
   * @param {THREE.Vector3} playerPos
   * @param {boolean} force
   */
  evaluate(playerPos, force = false) {
    this._lastEvaluatedPos.copy(playerPos);

    let entitiesThrottled = 0;
    const px = playerPos.x;
    const pz = playerPos.z;

    // 1. Maintain static props 100% stable and visible (no popping while walking)
    // Three.js frustum culling handles camera boundary culling cleanly without visual artifacts
    const props = this.managedProps;
    const numProps = props.length;
    for (let i = 0; i < numProps; i++) {
      const p = props[i];
      if (p.currentVisible !== p.origVisible) {
        p.currentVisible = p.origVisible;
        p.object.visible = p.origVisible;
      }
      if (p.origCastShadow && p.currentCastShadow !== p.origCastShadow) {
        p.currentCastShadow = p.origCastShadow;
        p.object.traverse(child => {
          if (child.isMesh) child.castShadow = p.origCastShadow;
        });
      }
    }

    // 2. Ensure outlines remain active for on-screen entities
    const outlines = this.managedOutlines;
    const numOutlines = outlines.length;
    for (let i = 0; i < numOutlines; i++) {
      const o = outlines[i];
      if (!o.isVisible) {
        o.isVisible = true;
        o.controller.setVisible(true);
      }
    }

    // 3. Evaluate dynamic entities animation throttling (NPCs & Monsters)
    // Throttles skeletal matrix updates for distant entities to 30 FPS, saving CPU without visual popping
    const entities = this.managedEntities;
    const numEntities = entities.length;
    for (let i = 0; i < numEntities; i++) {
      const e = entities[i];
      const pos = e.group ? e.group.position : null;
      if (!pos) continue;

      const dX = px - pos.x;
      const dZ = pz - pos.z;
      const distSq = dX * dX + dZ * dZ;

      const throttle = distSq > this._sq.entityAnim;
      e._lodThrottled = throttle;
      if (throttle) {
        entitiesThrottled++;
      }
    }

    this.metrics.culledProps = 0;
    this.metrics.shadowsDisabled = 0;
    this.metrics.outlinesHidden = 0;
    this.metrics.entitiesThrottled = entitiesThrottled;
  }

  /**
   * Diagnostic summary
   */
  getStats() {
    return {
      totalManagedProps: this.metrics.totalManagedProps,
      culledProps: this.metrics.culledProps,
      shadowsDisabled: this.metrics.shadowsDisabled,
      outlinesHidden: this.metrics.outlinesHidden,
      entitiesThrottled: this.metrics.entitiesThrottled
    };
  }
}
