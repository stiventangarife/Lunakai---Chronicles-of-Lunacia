// SpellPresentation.js — Presentación por defecto de los hechizos: VFX, sonidos, textos flotantes y sacudidas.
//
// Escucha los eventos de CombatEvents y reproduce exactamente los efectos que antes estaban
// mezclados dentro de SpellManager.castSpell. Para usar otro motor de VFX basta con no instalar
// esta clase (o desinstalarla con uninstall()) y suscribir el motor nuevo a los mismos eventos.

import * as THREE from 'three';
import * as i18n from '../../i18n/i18n.js';
import { STATUS_DEFS } from './StatusSystem.js';
import { TILE_SIZE } from '../GridManager.js';

// Hito 95 · marcas en el suelo de las zonas (tierra estable, grieta corrupta…). Geometría y materiales compartidos
// por todas las marcas y combates (no se crean materiales en cada lanzamiento).
const ZONE_DECAL_COLORS = { stable_ground: 0xa6e37a, corrupt_rift: 0x9b5cf0, gravity_well: 0x6fb7ff };
let _zoneGeo = null;
const _zoneMats = {};
function zoneDecalGeo() {
  if (!_zoneGeo) { _zoneGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.86, TILE_SIZE * 0.86); _zoneGeo.rotateX(-Math.PI / 2); }
  return _zoneGeo;
}
function zoneDecalMat(kind) {
  const color = ZONE_DECAL_COLORS[kind] ?? 0x7fe3d0;
  if (!_zoneMats[color]) {
    _zoneMats[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  return _zoneMats[color];
}

export class SpellPresentation {
  constructor({ sceneManager, gridManager, audio, combatText, vfx }) {
    this.sceneManager = sceneManager;
    this.gridManager = gridManager;
    this.audio = audio;
    this.combatText = combatText;
    this.vfx = vfx;
    this._offs = [];
  }

  _posOf(unit) { return this.gridManager.gridToWorld(unit.gridX, unit.gridZ); }

  /** Registra los oyentes en el bus de eventos. */
  install(events) {
    const on = (evt, fn) => this._offs.push(events.on(evt, fn));

    // --- Lanzamiento: texto de coste, orientación del lanzador y sonido
    on('spell:cast', ({ caster, spell, casterPos, targetPos, spent }) => {
      this.combatText.spawn(casterPos, i18n.t('combatFx.paMinus', { n: spent ?? spell.paCost }), 'pa'); // lo realmente pagado (descuentos de charms)
      const dirX = targetPos.x - casterPos.x;
      const dirZ = targetPos.z - casterPos.z;
      if (caster.mesh && (dirX !== 0 || dirZ !== 0)) {
        caster.mesh.rotation.y = Math.atan2(dirX, dirZ);
      }
      // Hito 88: barrido de aire por peso (cuerpo a cuerpo), cura y potenciar; el resto, el sonido de siempre
      if (!this.audio?.combat?.cast?.(caster, spell)) this.playSpellSound(spell.sound);
    });

    // --- Mecánicas especiales de Sapidae
    on('spell:barricade', ({ pos }) => {
      this.spawnImpactVFX(pos, { id: 'barricade' });
      this.combatText.spawn(pos, i18n.t('combatFx.barricade'), 'shield');
    });
    on('spell:transpose', ({ casterPos, targetPos }) => {
      this.vfx.playHealPillar(casterPos);
      this.vfx.playHealPillar(targetPos);
      this.combatText.spawn(casterPos, i18n.t('combatFx.transpose'), 'buff');
      this.combatText.spawn(targetPos, i18n.t('combatFx.transpose'), 'buff');
    });
    on('spell:aura', ({ casterPos }) => {
      this.vfx.playSonicBellow(casterPos, casterPos);
    });

    // --- Salto
    on('spell:landing', ({ pos }) => { this.spawnImpactVFX(pos, { id: 'jump_landing' }); });
    on('spell:jumpImpact', () => { this.sceneManager.shake(0.24); });

    // --- Animación de ataque
    on('spell:windup', ({ caster }) => {
      if (typeof caster.playAttackAnimation === 'function') {
        caster.playAttackAnimation();
      } else if (caster.attackClip) {
        caster.attackClip.reset().fadeIn(0.08).play();
        setTimeout(() => {
          if (caster.idleClip) caster.idleClip.reset().fadeIn(0.15).play();
          if (caster.attackClip) caster.attackClip.fadeOut(0.15);
        }, 350);
      }
    });

    // --- Proyectil (se espera a que llegue antes de aplicar el daño)
    on('spell:projectile', ({ spell, casterPos, targetPos }) => this.spawnProjectile(casterPos, targetPos, spell));

    // --- Impacto: anillo + chispas + decal, y el efecto propio de la habilidad
    on('spell:impact', ({ spell, casterPos, targetPos, affectedCells, vfx }) => {
      if (vfx) return; // Fase 6: el motor de VFX ya dibuja el impacto de esta carta
      this.spawnImpactVFX(targetPos, spell);
      this.playSkillVFX(spell, casterPos, targetPos, affectedCells);
    });

    // --- Resultados sobre unidades
    on('unit:healed', ({ unit, amount }) => {
      this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.hpPlus', { n: amount }), 'heal');
    });
    on('unit:shielded', ({ unit, amount, pos, variant }) => {
      const p = pos || this._posOf(unit);
      this.combatText.spawn(p, i18n.t('combatFx.shieldPlus', { n: amount }), 'shield');
    });
    on('unit:resourceGained', ({ unit, pa, pm }) => {
      const p = this._posOf(unit);
      if (pa && pm) this.combatText.spawn(p, i18n.t('combatFx.pmPaPlus', { pm, pa }), 'buff');
      else if (pa) this.combatText.spawn(p, i18n.t('combatFx.paPlus', { n: pa }), 'buff');
      else if (pm) this.combatText.spawn(p, i18n.t('combatFx.pmPlus', { n: pm }), 'buff');
    });
    on('unit:resourceLost', ({ unit, pa, pm }) => {
      const p = this._posOf(unit);
      if (pm) this.combatText.spawn(p, i18n.t('combatFx.pmMinus', { n: pm }), 'pm');
      if (pa) this.combatText.spawn(p, i18n.t('combatFx.paMinus', { n: pa }), 'pa');
    });
    on('unit:damaged', ({ unit, spell, actual, shieldAbsorbed, isCrit, plain }) => {
      const wPos = this._posOf(unit);
      // Hito 89: cuánto pesa el golpe (0–1) según la parte de la vida máxima que quita: decide el tamaño del número,
      // el temblor y la pausa de impacto. Un golpe del 40 % de la vida ya es «máximo».
      const frac = Math.min(1, (actual + (shieldAbsorbed || 0)) / Math.max(1, unit.maxHP || 1) / 0.4);
      const size = 0.85 + 0.45 * frac + (isCrit ? 0.1 : 0);   // 0,85 (rasguño) … 1,3 (golpe enorme) · 1,4 crítico enorme
      if (plain) { this.combatText.spawn(wPos, '-' + actual, 'damage', { size: 0.85 + 0.4 * frac }); return; }
      const killed = unit.currentHP <= 0;
      if (shieldAbsorbed > 0 && actual === 0) {
        this.combatText.spawn(wPos, i18n.t('combatFx.shieldMinus', { n: shieldAbsorbed }), 'shield', { size: 0.9 + 0.3 * frac });
        this.sceneManager.shake(0.08 + 0.1 * frac);
      } else if (shieldAbsorbed > 0 && actual > 0) {
        this.combatText.spawn(wPos, i18n.t('combatFx.shieldMinus', { n: shieldAbsorbed }) + '  -' + actual, 'damage', { size });
        this.sceneManager.shake(0.1 + 0.2 * frac);
      } else if (isCrit) {
        this.combatText.spawn(wPos, i18n.t('combatFx.critical', { n: actual }), 'crit', { size });
        this.sceneManager.shake(0.24 + 0.2 * frac);
      } else {
        this.combatText.spawn(wPos, '-' + actual, 'damage', { size });
        this.sceneManager.shake(0.08 + 0.22 * frac);
      }
      // Pausa de impacto: 35–90 ms según el peso de la carta, +30 ms crítico, +50 ms si lo derriba
      const w = spell ? (spell.isUltimate ? 3 : Math.min(3, Math.max(1, Number(spell.paCost) || 1))) : 1;
      if (actual > 0) this.sceneManager.hitStop?.(0.035 + (w - 1) * 0.0275 + (isCrit ? 0.03 : 0) + (killed ? 0.05 : 0));
    });

    // --- Empuje y colisión
    on('unit:pushStart', () => { this.audio.playPushback(); });
    on('unit:collision', ({ unit, damage, first }) => {
      if (first) {
        this.audio.playCollision();
        this.sceneManager.shake(0.35);
      }
      const p = this._posOf(unit);
      this.spawnImpactVFX(p, { id: 'collision' });
      this.combatText.spawn(p, damage > 0 ? i18n.t('combatFx.collision', { n: damage }) : i18n.t('combatFx.collisionImmune'), 'collision'); // 0 = inmune (Sturdy Fighter)
    });

    // --- Fase 1: triángulo elemental, estados y objetos del tablero
    on('unit:damaged', ({ unit, elemental }) => {
      if (!elemental || elemental === 1) return;
      this.combatText.spawn(this._posOf(unit), elemental > 1 ? i18n.t('combatFx.effective') : i18n.t('combatFx.resisted'), elemental > 1 ? 'crit' : 'shield');
    });
    // Hito 81: los avisos de un estado llevan su icono delante (sin el símbolo de texto); sin imagen, el símbolo de siempre
    const stIco = (def) => (def?.img ? { icon: def.img, alt: def.icon } : null);
    const stTxt = (def, txt) => (def?.img ? txt : `${def?.icon || ''} ${txt}`.trim());
    on('unit:healBlocked', ({ unit }) => {
      const d = STATUS_DEFS.healBlock;
      this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.healBlocked'), 'pm', stIco(d) || {});
    });
    on('status:applied', ({ unit, def, duration }) => {
      this.combatText.spawn(this._posOf(unit), stTxt(def, `${def.label.toUpperCase()} (${duration})`), def.kind === 'buff' ? 'buff' : 'pm', stIco(def) || {});
    });
    on('status:resisted', ({ unit }) => {
      this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.immune'), 'buff');
    });
    on('status:expired', ({ unit, status, reason }) => {
      if (reason === 'woke') this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.wokeUp'), 'buff', stIco(STATUS_DEFS.sleep) || {});
      else if (reason === 'cleansed') this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.cleansed'), 'heal');
    });
    on('status:tick', ({ unit, damage, heal, def }) => {
      if (damage > 0) this.combatText.spawn(this._posOf(unit), stTxt(def, `-${damage}`), 'damage', stIco(def) || {});
      if (heal > 0) this.combatText.spawn(this._posOf(unit), stTxt(def, i18n.t('combatFx.hpPlus', { n: heal })), 'heal', stIco(def) || {});
    });
    on('unit:damaged', ({ unit, linked }) => {
      if (linked) this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.link'), 'shield', stIco(STATUS_DEFS.soulLink) || {});
    });
    on('status:skipTurn', ({ unit, def }) => {
      this.combatText.spawn(this._posOf(unit), stTxt(def, i18n.t('combatFx.skipTurn')), 'pm', stIco(def) || {});
    });
    on('unit:teleported', ({ pos }) => { this.spawnImpactVFX(pos, { id: 'jump_landing' }); });
    on('field:obstaclePlaced', ({ pos, rounds }) => {
      this.spawnImpactVFX(pos, { id: 'barricade' });
    });
    on('field:obstacleExpired', ({ pos }) => {
      this.combatText.spawn(pos, i18n.t('combatFx.obstacleGone'), 'buff');
    });
    on('ultimate:used', ({ caster, spell }) => {
      this.combatText.spawn(this._posOf(caster), `✦ ${String(spell.name).toUpperCase()} ✦`, 'crit');
      this.sceneManager.shake(0.42);
    });
    // --- Runas y charms (RuneCharmEffects)
    on('unit:evaded', ({ unit }) => {
      this.combatText.spawn(this._posOf(unit), i18n.t('combatFx.evaded'), 'buff');
    });
    on('runeCharm:proc', ({ unit, label }) => {
      if (unit && label) this.combatText.spawn(this._posOf(unit), `✦ ${label}`, 'buff');
    });
    on('field:zonePlaced', (zone) => {
      const { positions, kind } = zone;
      if (positions[0]) this.combatText.spawn(positions[0], kind === 'stable_ground' ? i18n.t('golems.stable') : i18n.t('combatFx.zone'), 'buff');
      this._addZoneDecal(zone);
    });
    on('field:zoneExpired', (zone) => this._removeZoneDecal(zone));
    // Hito 95 · gólems del Sapidae
    on('golem:summoned', ({ golem, pos }) => {
      this.combatText.spawn(pos || this._posOf(golem), i18n.t('golems.summoned', { name: golem.name }), 'buff');
      this.sceneManager.shake?.(0.12);
    });
    on('golem:broken', ({ golem, pos }) => {
      this.combatText.spawn(pos || this._posOf(golem), i18n.t('golems.broken'), 'pm');
    });
    on('golem:pulse', ({ golem, kind }) => {
      if (kind === 'bell') this.combatText.spawn(this._posOf(golem), i18n.t('golems.toll'), 'heal');
    });

    // Hito 88: sonidos de golpes por clase y peso, escudos, estados, caídas, Ultimate y latido (CombatSfx)
    if (this.audio?.combat?.install) this._offs.push(...this.audio.combat.install(events));

    return this;
  }

  uninstall() {
    this._offs.forEach((off) => off());
    this._offs = [];
    this.clearZoneDecals();
  }

  // ---------------------------------------------- marcas de zona (Hito 95)
  _zoneKey(z) { return `${z.kind}|${z.expiresAtRound}|${(z.cells || []).map((c) => `${c.x},${c.z}`).join(';')}`; }

  _addZoneDecal(zone) {
    const scene = this.sceneManager?.scene;
    if (!scene || !zone?.positions?.length) return;
    this._zoneDecals ||= new Map();
    const group = new THREE.Group();
    group.name = `zone_${zone.kind}`;
    for (const p of zone.positions) {
      const m = new THREE.Mesh(zoneDecalGeo(), zoneDecalMat(zone.kind));
      m.position.set(p.x, 0.045, p.z);
      m.renderOrder = 2;
      group.add(m);
    }
    scene.add(group);
    this._zoneDecals.set(this._zoneKey(zone), group);
  }

  _removeZoneDecal(zone) {
    const key = this._zoneKey(zone);
    const g = this._zoneDecals?.get(key);
    if (!g) return;
    g.parent?.remove(g);
    this._zoneDecals.delete(key);
  }

  /** Quita todas las marcas de zona (al empezar otro combate o al desinstalar). */
  clearZoneDecals() {
    if (!this._zoneDecals) return;
    for (const g of this._zoneDecals.values()) g.parent?.remove(g);
    this._zoneDecals.clear();
  }

  /** Efecto propio de cada habilidad (tajo, ondas, raíces, pilar de cura, explosión, hielo). */
  playSkillVFX(spell, worldCasterPos, targetWorldPos, affectedCells) {
    const sid = spell.id;
    const isMeleeHit = sid === 'kotaro_slash' || sid === 'chimera_bite' || sid === 'plant_cactus' ||
      spell.sound === 'melee' || sid.includes('bite') || sid.includes('slash') || sid.includes('strike') ||
      sid.includes('claw') || sid.includes('slam') || sid.includes('punch') || sid.includes('swipe') ||
      sid.includes('goo') || sid.includes('root') || sid.includes('bash');

    const isBellowHit = sid === 'kotaro_push' || sid === 'chimera_bellow' || sid === 'bird_owl' ||
      spell.sound === 'push' || sid.includes('bellow') || sid.includes('roar') || sid.includes('dance');

    if (isMeleeHit) {
      const slashColor = sid === 'plant_cactus' ? 0x22c55e : (sid === 'kotaro_slash' ? 0xfbbf24 : 0xef4444);
      this.vfx.playMeleeSlash(worldCasterPos, targetWorldPos, slashColor);
    } else if (isBellowHit) {
      this.vfx.playSonicBellow(worldCasterPos, targetWorldPos);
    } else if (sid === 'plant_drain' || sid === 'pomodoro_bramble' || sid.includes('thorn')) {
      this.vfx.playEarthBramble(targetWorldPos);
    } else if (sid === 'plant_shield' || sid === 'pomodoro_heal' || sid === 'chimera_heal' || spell.sound === 'heal' || spell.baseMinHeal || spell.shieldAmount) {
      this.vfx.playHealPillar(targetWorldPos);
    } else if (sid === 'bing_explosive' || spell.sound === 'explosion' || sid.includes('cataclysm') || sid.includes('burst')) {
      this.vfx.playFireDetonation(targetWorldPos, affectedCells);
    } else if (sid === 'bing_slow' || spell.sound === 'ice' || sid.includes('frost') || sid.includes('nova')) {
      this.vfx.playIceSpikes(targetWorldPos);
    }
  }

  spawnProjectile(fromPos, toPos, spell) {
    return new Promise(resolve => {
      const scene = this.sceneManager.scene;
      const group = new THREE.Group();

      let mainColor = 0xffffff;
      let emissiveColor = 0xffffff;
      let particleColor = 0xffffff;
      let lightColor = 0xffffff;
      let geo;

      if (spell.id === 'bird_cupid') {
        mainColor = 0xf43f5e;
        emissiveColor = 0xfb7185;
        particleColor = 0xfecdd3;
        lightColor = 0xf43f5e;
        geo = new THREE.ConeGeometry(0.15, 0.45, 8);
      } else if (spell.id === 'bird_owl') {
        mainColor = 0xa855f7;
        emissiveColor = 0x9333ea;
        particleColor = 0xd8b4fe;
        lightColor = 0xc084fc;
        geo = new THREE.OctahedronGeometry(0.22, 0);
      } else if (spell.id === 'plant_shield') {
        mainColor = 0x22c55e;
        emissiveColor = 0x16a34a;
        particleColor = 0xbbf7d0;
        lightColor = 0x4ade80;
        geo = new THREE.OctahedronGeometry(0.24, 0);
      } else if (spell.id === 'plant_drain') {
        mainColor = 0x15803d;
        emissiveColor = 0x166534;
        particleColor = 0x4ade80;
        lightColor = 0x22c55e;
        geo = new THREE.DodecahedronGeometry(0.22, 0);
      } else if (spell.id === 'bing_explosive') {
        mainColor = 0xff4500;
        emissiveColor = 0xff8800;
        particleColor = 0xffaa00;
        lightColor = 0xff5500;
        geo = new THREE.SphereGeometry(0.25, 16, 16);
      } else if (spell.id === 'bing_slow') {
        mainColor = 0x38bdf8;
        emissiveColor = 0x0284c7;
        particleColor = 0xbae6fd;
        lightColor = 0x0ea5e9;
        geo = new THREE.OctahedronGeometry(0.24, 0);
      } else if (spell.id === 'chimera_spit') {
        mainColor = 0x84cc16;
        emissiveColor = 0x65a30d;
        particleColor = 0xa3e635;
        lightColor = 0x84cc16;
        geo = new THREE.DodecahedronGeometry(0.24, 1);
      } else if (spell.id === 'pomodoro_heal') {
        mainColor = 0x22c55e;
        emissiveColor = 0x16a34a;
        particleColor = 0x86efac;
        lightColor = 0x22c55e;
        geo = new THREE.SphereGeometry(0.22, 16, 16);
      } else if (spell.id === 'pomodoro_stim') {
        mainColor = 0xfacc15;
        emissiveColor = 0xeab308;
        particleColor = 0xfef08a;
        lightColor = 0xfacc15;
        geo = new THREE.OctahedronGeometry(0.22, 0);
      } else if (spell.id === 'pomodoro_bramble') {
        mainColor = 0x15803d;
        emissiveColor = 0x166534;
        particleColor = 0x4ade80;
        lightColor = 0x22c55e;
        geo = new THREE.DodecahedronGeometry(0.22, 0);
      } else {
        mainColor = 0xf59e0b;
        emissiveColor = 0xd97706;
        particleColor = 0xfde68a;
        lightColor = 0xf59e0b;
        geo = new THREE.SphereGeometry(0.22, 16, 16);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: mainColor,
        emissive: emissiveColor,
        emissiveIntensity: 2.2,
        roughness: 0.15
      });
      const projectileMesh = new THREE.Mesh(geo, mat);
      group.add(projectileMesh);

      // Luz prestada del conjunto fijo (crear una PointLight nueva recompilaría todos los shaders)
      this.sceneManager.lightPool?.acquire({ color: lightColor, intensity: 2.2, distance: 4.2, decay: 2, follow: group, maxLife: 2 });

      // Glowing aura shell around projectile
      const glowGeo = new THREE.SphereGeometry(0.34, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: emissiveColor,
        transparent: true,
        opacity: 0.45,
        wireframe: true
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      group.add(glowMesh);

      const startVec = new THREE.Vector3(fromPos.x, fromPos.y + 0.95, fromPos.z);
      const endVec = new THREE.Vector3(toPos.x, toPos.y + 0.85, toPos.z);
      group.position.copy(startVec);
      scene.add(group);

      const dist = startVec.distanceTo(endVec);
      const duration = Math.min(360, Math.max(180, dist * 50));
      const startTime = performance.now();
      const peakY = Math.min(2.5, 0.65 + dist * 0.22);

      const trails = [];

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);

        const currentX = THREE.MathUtils.lerp(startVec.x, endVec.x, progress);
        const currentZ = THREE.MathUtils.lerp(startVec.z, endVec.z, progress);
        const arc = Math.sin(progress * Math.PI) * peakY;
        const currentY = THREE.MathUtils.lerp(startVec.y, endVec.y, progress) + arc;

        group.position.set(currentX, currentY, currentZ);
        group.rotation.x += 0.25;
        group.rotation.y += 0.35;

        // Trailing luminous particle
        if (Math.random() < 0.75 && progress < 0.95) {
          // geometría compartida por todas las estelas (antes una esfera nueva ~45 veces por segundo)
          const trailGeo = (SpellPresentation._trailGeo ||= new THREE.SphereGeometry(0.08, 6, 6));
          const trailMat = new THREE.MeshBasicMaterial({
            color: particleColor,
            transparent: true,
            opacity: 0.85
          });
          const trailMesh = new THREE.Mesh(trailGeo, trailMat);
          trailMesh.position.set(
            currentX + (Math.random() - 0.5) * 0.15,
            currentY + (Math.random() - 0.5) * 0.15,
            currentZ + (Math.random() - 0.5) * 0.15
          );
          scene.add(trailMesh);
          trails.push({ mesh: trailMesh, mat: trailMat, born: performance.now(), life: 180 });
        }

        // Update active trails
        for (let i = trails.length - 1; i >= 0; i--) {
          const t = trails[i];
          const age = now - t.born;
          if (age >= t.life) {
            scene.remove(t.mesh);
            t.mat.dispose();
            trails.splice(i, 1);
          } else {
            const factor = 1.0 - age / t.life;
            t.mat.opacity = factor * 0.85;
            t.mesh.scale.setScalar(factor);
          }
        }

        if (progress < 1.0) {
          requestAnimationFrame(animate);
        } else {
          scene.remove(group);
          geo.dispose();
          mat.dispose();
          glowGeo.dispose();
          glowMat.dispose();

          trails.forEach(t => {
            scene.remove(t.mesh);
            t.mat.dispose();
          });

          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  spawnImpactVFX(worldPos, spell) {
    const scene = this.sceneManager.scene;

    // Determine color palette & decal type
    let fxColor = 0xff5500;
    let decalType = 'scorch';

    if (spell.id === 'bird_cupid') {
      fxColor = 0xf43f5e;
      decalType = 'arcane';
    } else if (spell.id === 'bird_owl') {
      fxColor = 0xa855f7;
      decalType = 'arcane';
    } else if (spell.id === 'plant_cactus' || spell.id === 'plant_drain') {
      fxColor = 0x22c55e;
      decalType = 'nature';
    } else if (spell.id === 'plant_shield') {
      fxColor = 0x4ade80;
      decalType = 'arcane';
    } else if (spell.id === 'bing_explosive') {
      fxColor = 0xff4500;
      decalType = 'scorch';
    } else if (spell.id === 'bing_slow') {
      fxColor = 0x38bdf8;
      decalType = 'ice';
    } else if (spell.id === 'chimera_spit') {
      fxColor = 0x84cc16;
      decalType = 'poison';
    } else if (spell.id === 'pomodoro_bramble') {
      fxColor = 0x22c55e;
      decalType = 'nature';
    } else if (spell.id && (spell.id.includes('heal') || spell.id.includes('stim'))) {
      fxColor = 0x34d399;
      decalType = 'arcane';
    } else {
      fxColor = 0xf59e0b;
      decalType = 'crater';
    }

    // 1. Trigger ground decal
    this.gridManager.spawnImpactDecal(worldPos, decalType);

    // 2. Shockwave expanding ring
    const ringGeo = new THREE.RingGeometry(0.12, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: fxColor,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(worldPos.x, 0.05, worldPos.z);
    scene.add(ringMesh);

    // 3. 3D Spark Particle Explosion (16 sparks)
    const sparks = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.09, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: fxColor, transparent: true, opacity: 1.0 });

    for (let i = 0; i < 16; i++) {
      const pMesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
      pMesh.position.set(worldPos.x, 0.65, worldPos.z);
      scene.add(pMesh);

      const angle = Math.random() * Math.PI * 2;
      const speedHoriz = 2.0 + Math.random() * 3.8;
      const speedVert = 3.5 + Math.random() * 4.5;

      sparks.push({
        mesh: pMesh,
        mat: pMesh.material,
        vx: Math.cos(angle) * speedHoriz,
        vy: speedVert,
        vz: Math.sin(angle) * speedHoriz
      });
    }

    const startTime = performance.now();
    const duration = 380; // ms

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      const dt = 0.016;

      // Expand ring
      const scale = 0.4 + progress * 2.8;
      ringMesh.scale.set(scale, scale, 1);
      ringMat.opacity = Math.max(0, (1.0 - progress) * 0.95);

      // Update sparks with gravity
      sparks.forEach(s => {
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.vy -= 18.0 * dt;

        s.mat.opacity = Math.max(0, 1.0 - progress);
        s.mesh.scale.setScalar(Math.max(0.1, 1.0 - progress * 0.8));
      });

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(ringMesh);
        ringGeo.dispose();
        ringMat.dispose();

        sparks.forEach(s => {
          scene.remove(s.mesh);
          s.mat.dispose();
        });
        sparkGeo.dispose();
      }
    };

    requestAnimationFrame(animate);
  }

  playSpellSound(soundType) {
    switch (soundType) {
      case 'melee':
        this.audio.playAttackMelee();
        break;
      case 'push':
        this.audio.playShootBow();
        break;
      case 'bow':
        this.audio.playShootBow();
        break;
      case 'explosion':
        this.audio.playExplosion();
        break;
      case 'heal':
        this.audio.playHeal();
        break;
      case 'buff':
        this.audio.playBuff();
        break;
      default:
        this.audio.playAttackMelee();
    }
  }
}
