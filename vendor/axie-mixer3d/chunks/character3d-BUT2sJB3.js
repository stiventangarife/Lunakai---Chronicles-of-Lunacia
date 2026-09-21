import * as e from "three";
import { clone as t } from "three/examples/jsm/utils/SkeletonUtils.js";
//#region src/avatar.ts
var n = class {
	width = 128;
	height = 128;
	modelHeading = 180;
	viewCenter = new e.Vector3(0, .75, 0);
	viewDirection = new e.Vector3(-1, -1, -1);
	constructor(e = {}) {
		e.width !== void 0 && (this.width = e.width), e.height !== void 0 && (this.height = e.height), e.modelHeading !== void 0 && (this.modelHeading = e.modelHeading), e.viewCenter !== void 0 && this.viewCenter.copy(e.viewCenter), e.viewDirection !== void 0 && this.viewDirection.copy(e.viewDirection);
	}
};
function r(e) {
	let t = new n(e);
	if (t.width === 0) throw Error("Render width cannot be zero!");
	if (t.height === 0) throw Error("Render height cannot be zero!");
	return t;
}
function i(t, n = {}) {
	let i = r(n), a = i.height / i.width, o = new e.OrthographicCamera(-1, 1, a, -a, -2, 2);
	t.updateWorldMatrix(!0, !0), o.position.copy(i.viewCenter).applyMatrix4(t.matrixWorld);
	let s = i.viewCenter.clone().add(i.viewDirection).applyMatrix4(t.matrixWorld);
	return o.up.set(0, 1, 0).transformDirection(t.matrixWorld), o.lookAt(s), o.updateMatrixWorld(!0), o.updateProjectionMatrix(), o.userData.axieAvatar = {
		width: i.width,
		height: i.height,
		modelHeading: i.modelHeading,
		aspect: a
	}, o;
}
function a(e) {
	let t = e;
	return !!(t.isMesh || t.isPoints || t.isLine || t.isSprite);
}
function o(t, n, o, s = {}) {
	let c = r(s), l = s.mode ?? "unity-skinned-only";
	(o.width !== c.width || o.height !== c.height) && o.setSize(c.width, c.height);
	let u = n.quaternion.clone(), d = n.rotation.order, f = [], p = 0, m = 0, h = t.getRenderTarget(), g = t.getClearColor(new e.Color()).clone(), _ = t.getClearAlpha(), v = t.autoClear;
	try {
		n.rotation.set(0, e.MathUtils.degToRad(c.modelHeading), 0, d), n.updateWorldMatrix(!0, !0), n.traverse((e) => {
			if (!a(e)) return;
			let t = e.isSkinnedMesh === !0;
			l === "unity-skinned-only" && !t ? (f.push({
				object: e,
				visible: e.visible
			}), e.visible = !1, m += 1) : e.visible && (p += 1);
		});
		let r = i(n, c);
		return t.autoClear = !1, t.setRenderTarget(o), t.setClearColor(0, 0), t.clear(!0, !0, !0), t.render(n, r), {
			target: o,
			camera: r,
			mode: l,
			renderedObjects: p,
			omittedObjects: m
		};
	} finally {
		f.forEach(({ object: e, visible: t }) => {
			e.visible = t;
		}), n.quaternion.copy(u), n.updateWorldMatrix(!0, !0), t.setRenderTarget(h), t.setClearColor(g, _), t.autoClear = v;
	}
}
//#endregion
//#region src/weapon-runtime.ts
var s = Object.freeze(["right", "left"]), c = Object.freeze({
	Axe: Object.freeze({
		sampleOrder: 0,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	}),
	Bow: Object.freeze({
		sampleOrder: 1,
		sides: Object.freeze(["left"]),
		mirrorLeft: !1
	}),
	Cannon: Object.freeze({
		sampleOrder: 2,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	}),
	Flag: Object.freeze({
		sampleOrder: 3,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	}),
	Gauntlet: Object.freeze({
		sampleOrder: 4,
		sides: s,
		mirrorLeft: !0
	}),
	Mala: Object.freeze({
		sampleOrder: 5,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	}),
	Staff: Object.freeze({
		sampleOrder: 6,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	}),
	Sword: Object.freeze({
		sampleOrder: 7,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	}),
	Tome: Object.freeze({
		sampleOrder: 8,
		sides: Object.freeze(["right"]),
		mirrorLeft: !1
	})
}), l = Object.freeze([
	"Idle",
	"Walk",
	"Run",
	"Attack",
	"Skill"
]);
function u(e) {
	let t = c[e.id];
	if (!t || e.sourceKind !== "unity-sample-rig" || e.sampleOrder !== t.sampleOrder || e.animationPrefix !== e.id || e.locomotionStyle !== "controller") return;
	let n = t.sides.length === 2 ? "both" : t.sides[0];
	if (!(e.attach !== n || e.mirrorLeft !== t.mirrorLeft)) return t;
}
function d(e) {
	let t = u(e);
	if (t) return t;
	if (!(e.id in c) && !(e.animationPrefix !== e.id || e.locomotionStyle !== "controller" || !e.clipPrefixes.some((t) => t === `${e.id}.`))) return {
		sides: e.attach === "both" ? s : Object.freeze([e.attach]),
		mirrorLeft: e.mirrorLeft
	};
}
function f(e) {
	return e === "left" ? "Root_Weapon_L_JNT" : "Root_Weapon_R_JNT";
}
function p(e, t) {
	return t === "left" ? e.leftWeapon : e.rightWeapon;
}
function m(e, t) {
	let n = f(t), r;
	return e.traverse((e) => {
		e.name === n && (r = e);
	}), r;
}
function h(e) {
	let t = e.cameraTarget.parent ?? e.leftWeapon?.parent ?? e.rightWeapon?.parent;
	return t ? {
		cameraTarget: e.cameraTarget,
		leftWeapon: m(t, "left") ?? e.leftWeapon,
		rightWeapon: m(t, "right") ?? e.rightWeapon
	} : e;
}
function g(e) {
	return d(e)?.sides ?? Object.freeze([]);
}
function _(e, t, n) {
	let r = d(e);
	if (!r) return `No exact source-authored runtime contract for ${e.id}`;
	if (!e.supportedBodyIds.includes(n)) return `No exact ${e.id} source clips for ${n}`;
	let i = r.sides.filter((e) => !p(t, e));
	if (i.length > 0) return `Missing ${i.join(" + ")} weapon anchor`;
	let a = r.sides.filter((e) => p(t, e)?.name !== f(e));
	if (a.length > 0) return `Expected exact ${a.map(f).join(" + ")} weapon anchor`;
}
function v(e, n, r) {
	let i = t(e);
	i.name = `AxieWeapon:${n.id}:${r}`;
	let a = r === "left" && d(n)?.mirrorLeft === !0;
	return i.position.set(0, 0, 0), i.quaternion.identity(), i.scale.set(1, 1, a ? -1 : 1), i.updateMatrix(), i.userData.axieWeaponId = n.id, i.userData.axieWeaponSide = r, i.userData.axieWeaponMirrorLeft = a, i;
}
var y = class {
	capabilities;
	#e;
	#t;
	#n;
	#r = /* @__PURE__ */ new Map();
	#i = /* @__PURE__ */ new Map();
	#a;
	#o;
	#s;
	#c = [];
	#l = [];
	#u = [];
	#d = /* @__PURE__ */ new Map();
	#f = [];
	#p;
	#m;
	#h;
	#g;
	#_;
	#v;
	#y;
	#b;
	#x = 0;
	#S = !1;
	constructor(e) {
		let t = h(e.anchors);
		this.#e = e.assets, this.#t = t, this.#n = e.body, this.#a = e.onDiagnostic, this.#o = e.onStateChange, this.capabilities = Object.values(e.manifest.assets.weapons).sort((e, t) => (e.sampleOrder ?? 2 ** 53 - 1) - (t.sampleOrder ?? 2 ** 53 - 1) || e.label.localeCompare(t.label)).map((n) => {
			let r = _(n, t, e.body);
			return Object.freeze({
				id: n.id,
				label: n.label,
				manifest: n,
				available: r === void 0,
				...r ? { unavailableReason: r } : {}
			});
		}), this.capabilities.forEach((e) => {
			this.#r.set(e.id, e), (e.manifest.variants ?? []).forEach((t) => {
				this.#i.set(t.id, {
					capability: e,
					variant: t
				});
			});
		});
	}
	get active() {
		return this.#m;
	}
	get activeSelection() {
		return this.#h;
	}
	get loading() {
		return this.#_;
	}
	get loadingSelection() {
		return this.#v;
	}
	inspectPairedAnimation() {
		let e = this.#p ? this.#d.get(this.#p) : void 0, t = this.#m && this.#p ? this.#r.get(this.#m)?.manifest.pairedAnimations?.clips[this.#p] : void 0, n = this.#f[0], r = t?.requiredBones ?? Object.freeze([]), i = this.#l.flatMap((e) => {
			let t = e.userData.axieWeaponSide, n = t === "left" || t === "right" ? t : "";
			return r.flatMap((t) => {
				let r = e.getObjectByName(t);
				return r ? [Object.freeze({
					side: n,
					name: t,
					position: Object.freeze(r.position.toArray()),
					quaternion: Object.freeze(r.quaternion.toArray()),
					scale: Object.freeze(r.scale.toArray())
				})] : [];
			});
		});
		return Object.freeze({
			family: this.#m,
			selection: this.#h,
			paired: this.#d.size > 0,
			state: this.#p,
			clipName: e?.name,
			duration: e?.duration,
			time: n?.time,
			timeScale: n?.getEffectiveTimeScale(),
			looping: t?.looping,
			mixerCount: this.#u.length,
			instanceCount: this.#l.length,
			bones: Object.freeze(i)
		});
	}
	capability(e) {
		return this.#r.get(e);
	}
	capabilityForSelection(e) {
		return this.#r.get(e) ?? this.#i.get(e)?.capability;
	}
	isSelectionAvailable(e) {
		return this.#E(e) !== void 0;
	}
	isActiveSelection(e) {
		let t = this.#E(e);
		return t !== void 0 && t.key === this.#g;
	}
	isLoadingSelection(e) {
		let t = this.#E(e);
		return t !== void 0 && t.key === this.#y;
	}
	weaponForClip(e) {
		let t = e.indexOf(".");
		if (t <= 0 || t !== e.lastIndexOf(".")) return;
		let n = e.slice(0, t), r = e.slice(t + 1);
		if (!l.includes(r)) return;
		let i = this.capability(n);
		return i?.id === n && d(i.manifest) ? i : void 0;
	}
	locomotionName(e, t) {
		let n = this.capability(e);
		if (!(!n?.available || !d(n.manifest))) return `${n.id}.${t}`;
	}
	playPairedAnimation(t, n = {}) {
		if (this.#S || this.#u.length === 0) return !1;
		let r = this.#d.get(t);
		if (!r) return !1;
		let i = Math.max(0, n.transition ?? 0), a = n.timeScale ?? 1;
		if (!Number.isFinite(a)) return !1;
		let o = n.restart ?? t !== this.#p;
		if (t === this.#p && !o && this.#f.length === this.#u.length) return this.#f.forEach((e) => e.setEffectiveTimeScale(a)), !0;
		let s = this.#f, c = t === "Idle" || t === "Walk" || t === "Run", l = this.#u.map((t) => {
			let n = t.clipAction(r);
			return n.enabled = !0, n.clampWhenFinished = !c, n.setLoop(c ? e.LoopRepeat : e.LoopOnce, c ? Infinity : 1), n.setEffectiveTimeScale(a), n.setEffectiveWeight(1), o && n.reset(), n.play(), i > 0 && n.fadeIn(i), n;
		});
		return s.forEach((e) => {
			l.includes(e) || (i > 0 ? e.fadeOut(i) : e.stop());
		}), this.#f = l, this.#p = t, !0;
	}
	update(e) {
		this.#S || !Number.isFinite(e) || e <= 0 || this.#u.forEach((t) => t.update(e));
	}
	async equip(e) {
		if (this.#S) return !1;
		if (e == null || e === "") {
			let e = ++this.#x;
			return this.#_ = void 0, this.#v = void 0, this.#y = void 0, this.#b = void 0, this.#T(), this.#D(), await Promise.resolve(), !this.#S && e === this.#x && this.#g === void 0 && this.#y === void 0;
		}
		if (typeof e != "string") return this.#O("warning", "weapon-missing", "An Axie weapon selection requires a family or variant string.", ""), !1;
		let t = this.capabilityForSelection(e);
		if (!t) return this.#O("warning", "weapon-missing", `Unknown Axie weapon ${e}.`, e), !1;
		if (!t.available) return this.#O("warning", t.unavailableReason?.startsWith("Missing") ? "weapon-anchor-missing" : "animation-missing", `Cannot equip ${t.id}: ${t.unavailableReason}.`, t.id), !1;
		let n = this.#E(e);
		if (!n) {
			let t = this.#i.get(e), n = t && !t.variant.supportedBodyIds.includes(this.#n) ? `No exact ${t.capability.id} source clips for ${this.#n}` : `No exact source-authored runtime selection for ${e}`;
			return this.#O("warning", "animation-missing", `Cannot equip ${e}: ${n}.`, e), !1;
		}
		let r = this.#C(n);
		if (r) return this.#O("error", r.code, `Cannot equip ${t.id}: ${r.message}.`, t.id), !1;
		if (this.#g === n.key && !this.#_) {
			let e = this.#x;
			return await Promise.resolve(), !this.#S && e === this.#x && this.#g === n.key && this.#y === void 0;
		}
		if (this.#y === n.key && this.#b) {
			let e = this.#x;
			return await this.#b && !this.#S && e === this.#x && this.#g === n.key && this.#y === void 0;
		}
		let i = ++this.#x;
		this.#T(), this.#_ = t.id, this.#v = n.selectionId, this.#y = n.key, this.#D();
		let a = this.#w(n, i);
		this.#b = a;
		let o = await a;
		return this.#b === a && (this.#b = void 0), o && !this.#S && i === this.#x && this.#g === n.key && this.#y === void 0;
	}
	cancelPending() {
		return this.#S || !this.#_ ? !1 : (this.#x += 1, this.#_ = void 0, this.#v = void 0, this.#y = void 0, this.#b = void 0, this.#D(), !0);
	}
	dispose() {
		this.#S || (this.#S = !0, this.#x += 1, this.#_ = void 0, this.#v = void 0, this.#y = void 0, this.#b = void 0, this.#T());
	}
	#C(e) {
		let t = g(e.capability.manifest), n = t.filter((e) => !p(this.#t, e));
		if (n.length > 0) return {
			code: "weapon-anchor-missing",
			message: `Missing ${n.join(" + ")} weapon anchor`
		};
		let r = t.filter((e) => p(this.#t, e)?.name !== f(e));
		if (r.length > 0) return {
			code: "weapon-anchor-missing",
			message: `Expected exact ${r.map(f).join(" + ")} weapon anchor`
		};
	}
	async #w(t, n) {
		let { capability: r } = t, i, a = [], o = [];
		try {
			i = await this.#e.acquireGlb(t.url);
			let s = r.manifest.pairedAnimations;
			if (s) {
				let e = await Promise.allSettled(l.map((e) => this.#e.acquireGlb(s.clips[e].url))), t = e.flatMap((e) => e.status === "fulfilled" ? [e.value] : []), n = e.find((e) => e.status === "rejected");
				if (n?.status === "rejected") throw t.forEach((e) => e.release()), n.reason;
				a = t;
			}
			if (this.#S || n !== this.#x) return i.release(), a.forEach((e) => e.release()), !1;
			o = g(r.manifest).map((e) => {
				let t = p(this.#t, e);
				if (!t) throw Error(`${e} weapon anchor disappeared during equip`);
				let n = v(i.value.scene, r.manifest, e);
				return t.add(n), n;
			});
			let c = /* @__PURE__ */ new Map();
			return s && l.forEach((e, t) => {
				let n = s.clips[e], i = a[t].value.animations;
				if (i.length !== 1) throw Error(`${r.id}.${e} expected one weapon-local clip`);
				let l = i[0];
				if (l.name !== `${r.id}.${e}` || Math.abs(l.duration - n.duration) > 1e-5) throw Error(`${r.id}.${e} does not match its source manifest`);
				let u = n.requiredBones.filter((e) => o.some((t) => t.getObjectByName(e) === void 0));
				if (u.length > 0) throw Error(`${r.id}.${e} requires missing bones ${u.join(", ")}`);
				c.set(e, l);
			}), this.#s = i, this.#c = a, this.#l = o, this.#u = s ? o.map((t) => new e.AnimationMixer(t)) : [], o.forEach((e) => {
				s && (e.userData.axieWeaponPairedAnimator = !0);
			}), this.#d = c, this.#m = r.id, this.#h = t.selectionId, this.#g = t.key, this.#_ = void 0, this.#v = void 0, this.#y = void 0, this.#D(), !0;
		} catch (e) {
			return o.forEach((e) => e.removeFromParent()), i?.release(), a.forEach((e) => e.release()), n === this.#x && (this.#_ = void 0, this.#v = void 0, this.#y = void 0, this.#O("error", "weapon-load-failed", `Failed to equip ${r.id}: ${e instanceof Error ? e.message : String(e)}.`, r.id), this.#D()), !1;
		}
	}
	#T() {
		this.#f.forEach((e) => e.stop()), this.#f = [], this.#p = void 0, this.#u.forEach((e, t) => {
			e.stopAllAction(), this.#d.forEach((t) => e.uncacheClip(t));
			let n = this.#l[t];
			n && e.uncacheRoot(n);
		}), this.#u = [], this.#d.clear(), this.#l.forEach((e) => e.removeFromParent()), this.#l = [], this.#c.forEach((e) => e.release()), this.#c = [], this.#s?.release(), this.#s = void 0, this.#m = void 0, this.#h = void 0, this.#g = void 0;
	}
	#E(e) {
		if (typeof e != "string" || e === "") return;
		let t = this.capability(e);
		if (t?.available) {
			let e = this.#i.get(t.manifest.defaultVariantId);
			return !e?.capability.available || !e.variant.supportedBodyIds.includes(this.#n) || !d(e.capability.manifest) ? void 0 : {
				capability: t,
				selectionId: e.variant.id,
				variant: e.variant,
				url: e.variant.url,
				key: `variant:${e.variant.id}`
			};
		}
		let n = this.#i.get(e);
		if (!(!n?.capability.available || !n.variant.supportedBodyIds.includes(this.#n) || !d(n.capability.manifest))) return {
			capability: n.capability,
			selectionId: n.variant.id,
			variant: n.variant,
			url: n.variant.url,
			key: `variant:${n.variant.id}`
		};
	}
	#D() {
		this.#o?.();
	}
	#O(e, t, n, r) {
		this.#a?.({
			severity: e,
			code: t,
			message: n,
			assetId: r
		});
	}
}, b = .1, x = .25, S = .25, C = Object.freeze([
	"Idle",
	"Walk",
	"Run"
]);
function w(e) {
	if (e <= 2) {
		let t = e / 2;
		return Object.freeze({
			Idle: 1 - t,
			Walk: t,
			Run: 0
		});
	}
	let t = e - 2;
	return Object.freeze({
		Idle: 0,
		Walk: 1 - t,
		Run: t
	});
}
function T(e, t) {
	let n = w(t);
	return e.reduce((e, t) => e + t.action.getClip().duration * n[t.state], 0);
}
function E(e) {
	return e - Math.floor(e);
}
var D = Object.freeze({
	layers: Object.freeze([Object.freeze({
		name: "Base Layer",
		ikPass: !1
	})]),
	states: Object.freeze([
		"Locomotion",
		"Attack",
		"Skill",
		"Stun",
		"Dead"
	]),
	stateDefaults: Object.freeze({
		speed: 1,
		writeDefaultValues: !0,
		footIk: !1
	}),
	parameters: Object.freeze([
		Object.freeze({
			name: "Move Speed",
			type: "float",
			defaultValue: 0
		}),
		Object.freeze({
			name: "Attack",
			type: "trigger"
		}),
		Object.freeze({
			name: "Skill",
			type: "trigger"
		}),
		Object.freeze({
			name: "Stunned",
			type: "bool",
			defaultValue: !1
		}),
		Object.freeze({
			name: "Dead",
			type: "trigger"
		}),
		Object.freeze({
			name: "Restart",
			type: "trigger"
		})
	]),
	anyStateOrder: Object.freeze([
		"Restart",
		"Dead",
		"Stun"
	]),
	locomotion: Object.freeze({
		parameter: "Move Speed",
		blendType: "1D Simple",
		minimum: 0,
		maximum: 3,
		childTimeScale: 1,
		thresholds: Object.freeze([
			Object.freeze({
				state: "Idle",
				value: 0
			}),
			Object.freeze({
				state: "Walk",
				value: 2
			}),
			Object.freeze({
				state: "Run",
				value: 3
			})
		])
	}),
	overrides: Object.freeze({
		weaponSpecific: Object.freeze([
			"Idle",
			"Walk",
			"Run",
			"Attack",
			"Skill"
		]),
		stun: "Default.Stun",
		dead: "Default.Dead"
	}),
	transitions: Object.freeze([
		Object.freeze({
			from: "Locomotion",
			to: "Attack",
			condition: "Attack",
			duration: b,
			hasExitTime: !1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		}),
		Object.freeze({
			from: "Locomotion",
			to: "Skill",
			condition: "Skill",
			duration: b,
			hasExitTime: !0,
			exitTime: 1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		}),
		Object.freeze({
			from: "Attack",
			to: "Locomotion",
			duration: b,
			hasExitTime: !0,
			exitTime: 1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		}),
		Object.freeze({
			from: "Skill",
			to: "Locomotion",
			duration: b,
			hasExitTime: !0,
			exitTime: 1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		}),
		Object.freeze({
			from: "Any State",
			to: "Locomotion",
			condition: "Restart",
			duration: 0,
			hasExitTime: !1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		}),
		Object.freeze({
			from: "Any State",
			to: "Dead",
			condition: "Dead",
			duration: b,
			hasExitTime: !1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "Current State",
			orderedInterruption: !0,
			canTransitionToSelf: !1
		}),
		Object.freeze({
			from: "Any State",
			to: "Stun",
			condition: "Stunned == true",
			duration: x,
			hasExitTime: !1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "Current State",
			orderedInterruption: !0,
			canTransitionToSelf: !1
		}),
		Object.freeze({
			from: "Stun",
			to: "Locomotion",
			condition: "Stunned == false",
			duration: x,
			hasExitTime: !1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		}),
		Object.freeze({
			from: "Dead",
			to: "Exit",
			duration: S,
			hasExitTime: !0,
			exitTime: 1,
			fixedDuration: !0,
			transitionOffset: 0,
			interruptionSource: "None",
			orderedInterruption: !0,
			canTransitionToSelf: !0
		})
	])
});
function O(e) {
	if (e) try {
		return JSON.parse(e);
	} catch {
		return;
	}
}
function k(e) {
	let t = e.userData;
	if (!Array.isArray(t?.axieEvents)) return Object.freeze([]);
	let n = Math.max(0, e.duration), r = t.axieEvents.flatMap((e, t) => {
		if (!e || typeof e != "object") return [];
		let r = e;
		if (typeof r.time != "number" || !Number.isFinite(r.time) || r.time < 0 || r.time > n) return [];
		let i = Object.freeze({
			time: r.time,
			functionName: typeof r.functionName == "string" ? r.functionName : "",
			stringParameter: typeof r.stringParameter == "string" ? r.stringParameter : "",
			floatParameter: typeof r.floatParameter == "number" && Number.isFinite(r.floatParameter) ? r.floatParameter : 0,
			intParameter: typeof r.intParameter == "number" && Number.isFinite(r.intParameter) ? r.intParameter : 0,
			objectParameterId: typeof r.objectParameterId == "string" ? r.objectParameterId : ""
		});
		return [{
			eventIndex: t,
			sourceEvent: i,
			payload: O(i.stringParameter)
		}];
	});
	return r.sort((e, t) => e.sourceEvent.time - t.sourceEvent.time || e.eventIndex - t.eventIndex), Object.freeze(r);
}
function A(e) {
	let t = e.userData, n = typeof t?.axieSourceName == "string" ? t.axieSourceName : e.name.replace(/^(?:lite|full):/, "");
	return {
		sourceName: n,
		looping: typeof t?.axieLooping == "boolean" ? t.axieLooping : /\.(?:Idle|Walk|Run)$/.test(n)
	};
}
function j(e, t) {
	let n = e.map((e) => {
		let t = A(e);
		return Object.freeze({
			name: t.sourceName,
			runtimeName: e.name,
			group: t.sourceName.includes(".") ? t.sourceName.slice(0, t.sourceName.indexOf(".")) : "Other",
			duration: e.duration,
			looping: t.looping
		});
	}), r = [...new Set(n.map((e) => e.name))], i = [...new Set(r.map((e) => e.includes(".") ? e.slice(0, e.indexOf(".")) : "").filter((e) => e && e !== "Default" && e !== "Action"))];
	return {
		set: t,
		names: r,
		clips: n,
		hasIdle: r.includes("Default.Idle"),
		hasWalk: r.includes("Default.Walk"),
		hasRun: r.includes("Default.Run"),
		hasStun: r.includes("Default.Stun"),
		hasDead: r.includes("Default.Dead"),
		weaponPrefixes: i
	};
}
function M(e) {
	let t = /* @__PURE__ */ new Map();
	return e.forEach((e) => t.set(A(e).sourceName, e)), t;
}
function N(e) {
	let t = e.body.bounds.min, n = e.body.bounds.max;
	return {
		min: t,
		max: n,
		width: Math.max(.01, n[0] - t[0]),
		height: Math.max(.01, n[1] - t[1]),
		depth: Math.max(.01, n[2] - t[2])
	};
}
function P(e, t) {
	let n;
	return e.traverse((e) => {
		e.name === t && (n = e);
	}), n;
}
var F = class {
	kind = "axie";
	key;
	descriptor;
	wrapper;
	model;
	quality;
	animations;
	animationNames;
	anchors;
	collision;
	diagnostics;
	weapons;
	#e;
	#t;
	#n = /* @__PURE__ */ new Map();
	#r;
	#i = /* @__PURE__ */ new Map();
	#a;
	#o;
	#s = /* @__PURE__ */ new Set();
	#c;
	#l;
	#u;
	#d;
	#f;
	#p;
	#m = /* @__PURE__ */ new Set();
	#h;
	#g;
	#_;
	#v = !1;
	#y = 0;
	#b = 0;
	#x;
	#S;
	#C;
	#w;
	#T = !1;
	#E = 0;
	constructor(t, n, r) {
		this.#e = t, this.#l = r?.onDispose, this.key = n.key, this.descriptor = n.descriptor, this.wrapper = t.wrapper, this.model = t.model, this.quality = n.quality, this.diagnostics = t.diagnostics, this.animations = j(t.clips, n.animationSet), this.#r = Object.freeze({
			lite: M(t.clipSets.lite),
			full: M(t.clipSets.full)
		}), this.animationNames = Object.freeze(t.clipSets.lite.map((e) => A(e).sourceName));
		let i = N(n), a = new e.Object3D();
		a.name = "AxieCameraTarget", a.position.set((i.min[0] + i.max[0]) / 2, i.min[1] + i.height * .62, (i.min[2] + i.max[2]) / 2), this.wrapper.add(a), this.anchors = {
			cameraTarget: a,
			leftWeapon: P(this.model, "Root_Weapon_L_JNT"),
			rightWeapon: P(this.model, "Root_Weapon_R_JNT")
		}, this.#t = new e.AnimationMixer(this.model), this.#c = r ? new y({
			manifest: r.manifest,
			assets: r.assets,
			anchors: this.anchors,
			body: n.descriptor.body,
			onDiagnostic: r.onDiagnostic
		}) : void 0, this.weapons = this.#c?.capabilities ?? Object.freeze([]), this.collision = {
			type: "capsule",
			radius: Math.max(i.width, i.depth) * .42,
			height: i.height,
			centerY: (i.min[1] + i.max[1]) / 2
		}, t.clips.forEach((t) => {
			let n = A(t), r = this.#t.clipAction(t);
			r.enabled = !0, r.clampWhenFinished = !n.looping, r.setLoop(n.looping ? e.LoopRepeat : e.LoopOnce, n.looping ? Infinity : 1), this.#i.set(r, n), [t.name, n.sourceName].forEach((e) => this.#n.set(e, r));
		}), this.#a = (e) => {
			if (!(!e.action || e.action !== this.#u)) {
				if (e.action === this.#g) {
					if (this.#h === "Dead") {
						this.#h = "Exit", this.#_ = {
							action: e.action,
							remaining: S
						}, e.action.fadeOut(S);
						return;
					}
					if (this.#h === "Attack" || this.#h === "Skill") {
						this.#f = void 0, this.#g = void 0, this.#h = "Locomotion", this.setMoveSpeed(this.#b, b);
						return;
					}
				}
				e.action === this.#f && (this.#f = void 0), this.setMoveSpeed(this.#b, 0);
			}
		}, this.#o = (e) => {
			let t = this.#w;
			if (t && e.action === t.action) {
				let n = e.loopDelta;
				t.loopDelta += typeof n == "number" && Number.isFinite(n) ? Math.trunc(n) : 1;
			}
		}, this.#t.addEventListener("finished", this.#a), this.#t.addEventListener("loop", this.#o), this.setMoveSpeed(0, 0);
	}
	get disposed() {
		return this.#T;
	}
	get activeAnimation() {
		return this.#d;
	}
	get animationOverrideActive() {
		return this.#f !== void 0 || this.#p !== void 0;
	}
	get activeWeapon() {
		return this.#c?.active;
	}
	get activeWeaponSelection() {
		return this.#c?.activeSelection;
	}
	get weaponLoading() {
		return this.#c?.loading;
	}
	get weaponLoadingSelection() {
		return this.#c?.loadingSelection;
	}
	inspectPairedWeaponAnimation() {
		return this.#c?.inspectPairedAnimation() ?? Object.freeze({
			family: void 0,
			selection: void 0,
			paired: !1,
			state: void 0,
			clipName: void 0,
			duration: void 0,
			time: void 0,
			timeScale: void 0,
			looping: void 0,
			mixerCount: 0,
			instanceCount: 0,
			bones: Object.freeze([])
		});
	}
	resetAddonParticles(e = {}) {
		this.#T || this.#e.addonRuntimes.forEach((t) => t.resetParticles(e));
	}
	setLocomotion(e, t = 0) {
		this.setMoveSpeed(e === "run" ? 3 : e === "walk" ? 2 : 0, t);
	}
	setMoveSpeed(e, t = 0) {
		if (this.#T) return;
		let n = Math.min(3, Math.max(0, e));
		Number.isFinite(n) && (this.#b = n, !this.#f && this.#P(Math.max(0, t), !1));
	}
	playAnimation(e, t = {}) {
		return this.#D(e, t).accepted;
	}
	subscribeAnimationCues(e) {
		if (typeof e != "function") throw TypeError("Animation cue listener must be a function.");
		if (this.#T) return () => {};
		this.#s.add(e);
		let t = !0;
		return () => {
			t && (t = !1, this.#s.delete(e));
		};
	}
	async playAnimationAsync(e, t = {}) {
		let n = this.#D(e, t);
		return n.ready ?? n.accepted;
	}
	#D(e, t) {
		if (this.#T) return { accepted: !1 };
		let n = this.#R(e, t);
		if (n) return n;
		let r = this.#Y(e, t);
		return r.accepted ? (this.#q(), this.#h = void 0, this.#g = void 0, this.#J(), r) : r;
	}
	#O(e) {
		return this.#n.get(e);
	}
	#k(e) {
		let t = e === "Idle" || e === "Walk" || e === "Run" ? this.#S : this.#C;
		if (!t) return e === "Idle" || e === "Walk" || e === "Run" ? `Default.${e}` : void 0;
		if (e === "Idle" || e === "Walk" || e === "Run") return this.#c?.active === t ? this.#c.locomotionName(t, e) : void 0;
		let n = `${t}.${e}`;
		return this.#c?.weaponForClip(n)?.id === t ? n : void 0;
	}
	#A() {
		let e = [];
		for (let t of C) {
			let n = this.#k(t), r = n ? this.#n.get(n) : void 0;
			if (!n || !r) return;
			e.push({
				state: t,
				sourceName: n,
				action: r
			});
		}
		return e;
	}
	#j(e) {
		let t = this.#x?.entries;
		return t?.length === e.length && t.every((t, n) => t.sourceName === e[n].sourceName && t.action === e[n].action);
	}
	#M(e) {
		let t = E(e.normalizedTime);
		e.entries.forEach((e) => {
			e.action.time = e.action.getClip().duration * t;
		});
	}
	#N(t) {
		let { entries: n } = t, r = w(this.#b), i = n[0], a = -1;
		n.forEach((t) => {
			let n = r[t.state];
			t.action.enabled = !0, t.action.paused = !0, t.action.clampWhenFinished = !1, t.action.setLoop(e.LoopRepeat, Infinity), t.action.setEffectiveTimeScale(1), t.action.setEffectiveWeight(n), t.action.isRunning() || t.action.play(), n >= a && (i = t, a = n);
		}), this.#u !== i.action && this.#Z(i.action, i.sourceName), this.#u = i.action, this.#d = i.sourceName, this.#h = "Locomotion", this.#g = i.action, this.#M(t), this.#c?.playPairedAnimation(i.state, { restart: !1 });
	}
	#P(t, n) {
		let r = this.#A();
		if (!r) return !1;
		if (this.#j(r)) {
			let e = this.#x;
			if (n && (e.normalizedTime = 0, r.forEach((e) => e.action.reset().play())), this.#N(e), n) {
				let e = w(this.#b), n = r.reduce((t, n) => e[n.state] >= e[t.state] ? n : t, r[0]);
				this.#c?.playPairedAnimation(n.state, {
					transition: t,
					restart: !0
				});
			}
			return n && this.#u && this.#d && this.#Z(this.#u, this.#d), !0;
		}
		let i = this.#u, a = this.#x, o = n ? 0 : a?.normalizedTime ?? 0, s = w(this.#b), c = r.reduce((e, t) => s[t.state] >= s[e.state] ? t : e, r[0]), l = new Set(r.map((e) => e.action));
		a?.entries.forEach((e) => {
			e.action === i || l.has(e.action) || (t > 0 ? e.action.fadeOut(t) : e.action.stop());
		}), r.forEach((r) => {
			let o = a?.entries.some((e) => e.action === r.action) === !0;
			(!o || n) && r.action.reset(), r.action.enabled = !0, r.action.paused = !0, r.action.clampWhenFinished = !1, r.action.setLoop(e.LoopRepeat, Infinity), r.action.setEffectiveTimeScale(1), r.action.setEffectiveWeight(s[r.state]), r.action.play(), t > 0 && i && r.action !== c.action && !o && r.action.fadeIn(t);
		}), i && i !== c.action && (t > 0 ? i.crossFadeTo(c.action, t, !1) : i.stop());
		let u = {
			entries: r,
			normalizedTime: o
		};
		return this.#x = u, this.#u = c.action, this.#d = c.sourceName, this.#h = "Locomotion", this.#g = c.action, this.#f = void 0, this.#M(u), this.#Z(c.action, c.sourceName), this.#c?.playPairedAnimation(c.state, {
			transition: t,
			restart: n
		}), !0;
	}
	#F(e) {
		let t = this.#x;
		if (this.#h !== "Locomotion" || !t) return !1;
		let n = T(t.entries, this.#b);
		if (!(n > 0) || !Number.isFinite(n)) return !1;
		let r = Math.floor(t.normalizedTime);
		t.normalizedTime += e / n;
		let i = Math.max(0, Math.floor(t.normalizedTime) - r);
		return this.#M(t), i > 0 && this.#w && (this.#w.loopDelta += i), i > 0 && this.#m.has("Skill");
	}
	#I(e, t) {
		let n = this.#x;
		return n ? (this.#x = void 0, n.entries.forEach((n) => {
			n.action === this.#u || n.action === t || (e > 0 ? n.action.fadeOut(e) : n.action.stop());
		}), !0) : !1;
	}
	#L() {
		return this.#h === "Locomotion" && this.#x !== void 0 && this.#u !== void 0 && this.#g === this.#u && this.#x.entries.some((e) => e.action === this.#u);
	}
	#R(e, t) {
		switch (e) {
			case "Attack": return this.#z(t);
			case "Skill": return this.#B(t);
			case "Stunned": return this.#V(t);
			case "Dead": return this.#H(t);
			case "Restart": return this.#U(t);
			default: return;
		}
	}
	#z(e) {
		if (!this.#c?.active) return { accepted: !1 };
		let t = this.#k("Attack");
		return !t || !this.#n.get(t) ? { accepted: !1 } : (this.#m.add("Attack"), { accepted: !0 });
	}
	#B(e) {
		if (!this.#c?.active) return { accepted: !1 };
		let t = this.#k("Skill"), n = t ? this.#n.get(t) : void 0;
		if (!t || !n) return { accepted: !1 };
		let r = this.#p;
		if (r?.state === "Skill") return {
			accepted: !0,
			ready: r.ready
		};
		let i, a = new Promise((e) => {
			i = e;
		});
		return this.#p = {
			state: "Skill",
			ready: a,
			resolve: i
		}, this.#m.add("Skill"), {
			accepted: !0,
			ready: a
		};
	}
	#V(e) {
		let t = D.overrides.stun;
		return this.#n.get(t) ? (this.#v = !0, { accepted: !0 }) : { accepted: !1 };
	}
	#H(e) {
		let t = D.overrides.dead;
		return this.#n.get(t) ? (this.#m.add("Dead"), { accepted: !0 }) : { accepted: !1 };
	}
	#U(e) {
		return this.#A() ? (this.#m.add("Restart"), { accepted: !0 }) : { accepted: !1 };
	}
	#W(e, t, n, r) {
		let i = this.#n.get(t);
		return !i || !this.#X(i, this.#i.get(i), t, {
			transition: n,
			loop: r,
			restart: !0,
			lockLocomotion: !0
		}) ? !1 : (this.#h = e, this.#g = this.#u, !0);
	}
	#G() {
		if (!this.#m.has("Skill") || !this.#L()) return !1;
		let e = this.#k("Skill");
		if (!e || !this.#W("Skill", e, b, !1)) return !1;
		this.#m.delete("Skill");
		let t = this.#p;
		return this.#p = void 0, t?.resolve(!0), !0;
	}
	#K() {
		if (this.#m.has("Restart") && this.#A()) {
			this.#m.delete("Restart"), this.#J(), this.#f = void 0, this.#g = void 0, this.#h = "Locomotion", this.#P(0, !0);
			return;
		}
		if (this.#m.has("Dead") && this.#h !== "Dead") {
			let e = D.overrides.dead;
			if (this.#J(), this.#W("Dead", e, b, !1)) {
				this.#m.delete("Dead");
				return;
			}
		}
		if (this.#v && this.#h !== "Stun") {
			let e = D.overrides.stun;
			if (this.#J(), this.#W("Stun", e, x, !0)) return;
		}
		if (this.#h === "Stun" && !this.#v) {
			this.#f = void 0, this.#g = void 0, this.#h = "Locomotion", this.#P(x, !1);
			return;
		}
		if (this.#L() && this.#m.has("Attack")) {
			let e = this.#k("Attack");
			e && this.#W("Attack", e, b, !1) && this.#m.delete("Attack");
		}
	}
	#q() {
		let e = this.#p, t = this.#m.delete("Skill");
		return e ? (this.#p = void 0, e.resolve(!1), !0) : t;
	}
	#J() {
		let e = this.#_;
		return e ? (this.#_ = void 0, e.action.stop(), this.#u === e.action && (this.#u = void 0, this.#d = void 0, this.#w = void 0), this.#f === e.action && (this.#f = void 0), this.#g === e.action && (this.#g = void 0), this.#h === "Exit" && (this.#h = void 0), !0) : !1;
	}
	#Y(e, t) {
		let n = this.#O(e);
		if (!n) return { accepted: !1 };
		let r = this.#i.get(n), i = r?.sourceName ?? e, a = this.#c?.weaponForClip(i);
		return a && (!a.available || a.id !== this.#c?.active) ? { accepted: !1 } : { accepted: this.#X(n, r, i, t) };
	}
	#X(t, n, r, i) {
		let a = i.restart ?? t !== this.#u, o = t === this.#u && !a, s = i.loop ?? n?.looping ?? !1, c = o && i.loop === void 0 ? t.loop : s ? e.LoopRepeat : e.LoopOnce, l = o && i.loop === void 0 ? t.repetitions : s ? Infinity : 1, u = o && i.loop === void 0 ? t.clampWhenFinished : !s, d = i.timeScale ?? (o ? t.timeScale : 1), f = Math.max(0, i.transition ?? 0), p = this.#u;
		this.#I(f, t), t.enabled = !0, t.paused = !1, t.setEffectiveTimeScale(d), t.setEffectiveWeight(1), t.clampWhenFinished = u, t.setLoop(c, l), this.#f && this.#f !== t && (this.#f = void 0), i.lockLocomotion === !0 && (this.#f = t);
		let m = this.#c?.weaponForClip(r), h = m && m.id === this.#c?.active ? r.slice(m.id.length + 1) : void 0;
		return (h === "Idle" || h === "Walk" || h === "Run" || h === "Attack" || h === "Skill") && this.#c?.playPairedAnimation(h, {
			transition: f,
			timeScale: d,
			restart: a
		}), o ? (this.#d = r, !0) : (a && t.reset(), this.#Z(t, r), t.play(), this.#u = t, this.#d = r, p && p !== t && (f > 0 ? p.crossFadeTo(t, f, !1) : p.stop()), !0);
	}
	#Z(e, t) {
		let n = e.getClip();
		this.#w = {
			action: e,
			sourceName: t,
			runtimeName: n.name,
			duration: Math.max(0, n.duration),
			events: k(n),
			previousTime: e.time,
			loop: 0,
			includePreviousTime: !0,
			loopDelta: 0
		};
	}
	#Q(e, t, n, r, i) {
		this.#s.size === 0 || n < t || e.events.forEach((a) => {
			let o = a.sourceEvent.time;
			if ((o > t || i && o === t) && o <= n) {
				let t = Object.freeze({
					sourceName: e.sourceName,
					runtimeName: e.runtimeName,
					clipDuration: e.duration,
					clipTime: o,
					loop: r,
					eventIndex: a.eventIndex,
					sourceEvent: a.sourceEvent,
					payload: a.payload
				});
				[...this.#s].forEach((e) => e(t));
			}
		});
	}
	#$(e, t, n) {
		if (n <= 0 || e.duration <= 0) {
			e.previousTime = t, e.includePreviousTime = !1, e.loopDelta = 0;
			return;
		}
		let r = Math.max(0, e.loopDelta);
		if (r === 0 && t < e.previousTime && (r = 1), r === 0) this.#Q(e, e.previousTime, t, e.loop, e.includePreviousTime);
		else {
			this.#Q(e, e.previousTime, e.duration, e.loop, e.includePreviousTime);
			for (let t = 1; t < r; t += 1) this.#Q(e, 0, e.duration, e.loop + t, !0);
			this.#Q(e, 0, t, e.loop + r, !0), e.loop += r;
		}
		e.previousTime = t, e.includePreviousTime = !1, e.loopDelta = 0;
	}
	async equipWeapon(e) {
		if (this.#T || !this.#c) return e == null || e === "";
		let t = e == null || e === "" ? void 0 : this.#c.capabilityForSelection(e), n = e == null || e === "", r = !n && t?.available === !0 && this.#c.isSelectionAvailable(e);
		if (!n && !r) return this.#c.equip(e);
		let i = ++this.#y;
		if (!n && this.#c.isActiveSelection(e) && (!await this.#c.equip(null) || this.#T || i !== this.#y)) return !1;
		let a = await this.#c.equip(e), o = e == null || e === "" ? this.#c.active === void 0 && this.#c.loading === void 0 : this.#c.isActiveSelection(e);
		return !a || this.#T || i !== this.#y || !o ? !1 : n ? (this.#S = void 0, this.#m.add("Restart"), !0) : (this.#S = this.#c.active, this.#C = this.#c.active, this.#L() && this.#P(0, !1), !0);
	}
	getLiteAnimationClip(e) {
		return this.#ee("lite", e);
	}
	getFullAnimationClip(e) {
		return this.#ee("full", e);
	}
	renderAvatar(e, t, n = {}) {
		if (this.#T) throw Error("Cannot render an avatar for a disposed Axie character.");
		return o(e, this.model, t, n);
	}
	resumeLocomotion(e) {
		this.#T || (this.#v = !1);
	}
	update(e) {
		if (this.#T || !Number.isFinite(e) || e <= 0) return;
		let t = e;
		this.#E += t, this.#K();
		let n = this.#w, r = this.#_;
		n && (n.loopDelta = 0);
		let i = this.#F(t), a = n ? this.#h === "Locomotion" ? 1 : n.action.getEffectiveTimeScale() : 0;
		this.#t.update(t), this.#c?.update(t), n && this.#$(n, n.action.time, a), i && this.#G(), r && r === this.#_ && (r.remaining -= t, r.remaining <= 0 && this.#J()), this.#e.setMysticMaterialTime?.(this.model, this.#E), this.#e.addonRuntimes.forEach((e) => e.update(t));
	}
	setVisible(e) {
		this.#T || (this.wrapper.visible = e);
	}
	dispose() {
		if (!this.#T) {
			this.#q(), this.#J(), this.#T = !0, this.#t.removeEventListener("finished", this.#a), this.#t.removeEventListener("loop", this.#o), this.#c?.dispose(), this.#t.stopAllAction(), (/* @__PURE__ */ new Set([...this.#e.clipSets.lite, ...this.#e.clipSets.full])).forEach((e) => this.#t.uncacheClip(e)), this.#t.uncacheRoot(this.model);
			for (let e = this.#e.addonRuntimes.length - 1; e >= 0; --e) this.#e.addonRuntimes[e].dispose();
			this.wrapper.removeFromParent(), this.#e.ownedMaterials.forEach((e) => e.dispose());
			for (let e = this.#e.leases.length - 1; e >= 0; --e) this.#e.leases[e].release();
			this.wrapper.clear(), this.#n.clear(), this.#i.clear(), this.#u = void 0, this.#d = void 0, this.#f = void 0, this.#p = void 0, this.#m.clear(), this.#h = void 0, this.#g = void 0, this.#_ = void 0, this.#x = void 0, this.#y += 1, this.#S = void 0, this.#C = void 0, this.#w = void 0, this.#s.clear(), this.#l?.(this);
		}
	}
	#ee(e, t) {
		if (this.#T) throw Error("Axie character is disposed.");
		let n = this.#r[e].get(t);
		if (!n) throw Error(`Animation ${t} is not available in the ${e} set.`);
		return n;
	}
}, I = class e {
	lodLevel = 0;
	useMaterialPropertyBlocks = !1;
	partLayerOverrides = [];
	constructor(e = {}) {
		e.lodLevel !== void 0 && (this.lodLevel = e.lodLevel), e.useMaterialPropertyBlocks !== void 0 && (this.useMaterialPropertyBlocks = e.useMaterialPropertyBlocks), e.partLayerOverrides !== void 0 && (this.partLayerOverrides = e.partLayerOverrides.map((e) => ({ ...e })));
	}
	Merge(t) {
		if (t == null) return this;
		let n = this.partLayerOverrides.map((e) => ({ ...e }));
		return t.partLayerOverrides.forEach((e) => {
			let t = n.findIndex((t) => t.type === e.type);
			t >= 0 ? n[t] = { ...e } : n.push({ ...e });
		}), new e({
			lodLevel: t.lodLevel < 0 ? this.lodLevel : t.lodLevel,
			useMaterialPropertyBlocks: t.useMaterialPropertyBlocks,
			partLayerOverrides: n
		});
	}
	merge(e) {
		return this.Merge(e);
	}
}, L = [];
function R() {
	let e = L.at(-1)?.factory;
	if (!e) throw Error("AxieCharacter3D default factory is not initialized. Install a factory or construct ThreeAxieMixer3D with registerAsDefaultCharacterFactory: true.");
	return e;
}
function z(e) {
	let t = e;
	return !!(t.isMesh || t.isPoints || t.isLine || t.isSprite);
}
var B = class extends F {
	InstantiationParams;
	Root;
	RightWeaponAttachPoint;
	LeftWeaponAttachPoint;
	AnimationNames;
	constructor(e, t, n = new I({ lodLevel: t.quality.requestedLod }), r) {
		super(e, t, r), this.InstantiationParams = new I(n), this.Root = this.model, this.RightWeaponAttachPoint = this.anchors.rightWeapon, this.LeftWeaponAttachPoint = this.anchors.leftWeapon, this.AnimationNames = this.animationNames, this.#e(t);
	}
	static InstallDefaultFactory(e) {
		let t = {
			token: Symbol("AxieCharacter3DFactory"),
			factory: e
		};
		L.push(t);
		let n = !1;
		return () => {
			if (n) return;
			n = !0;
			let e = L.findIndex((e) => e.token === t.token);
			e >= 0 && L.splice(e, 1);
		};
	}
	static FromDescriptor(e, t = null) {
		return R().createFromDescriptor(e, t);
	}
	static FromGenes(e, t = null) {
		return R().createFromGenes(e, t);
	}
	get Animations() {
		throw Error("Animations is obsolete. Use GetLiteAnimationClip(name) or GetFullAnimationClip(name) instead.");
	}
	GetLiteAnimationClip(e) {
		return this.getLiteAnimationClip(e);
	}
	GetFullAnimationClip(e) {
		return this.getFullAnimationClip(e);
	}
	RenderAvatar(e, t, n) {
		if (this.disposed) throw Error("Cannot render an avatar for a disposed Axie character.");
		return o(e, this.Root, t, n);
	}
	Dispose() {
		this.dispose();
	}
	setVisible(e) {
		this.disposed || (this.Root.visible = e, this.wrapper.visible = e);
	}
	dispose() {
		this.disposed || (this.Root.removeFromParent(), super.dispose(), this.Root.clear());
	}
	#e(e) {
		if (this.InstantiationParams.partLayerOverrides.length === 0) return;
		let t = new Map(e.partRigs.map((e) => [`${e.partId}:${e.rigType}`, e.partType]));
		this.model.traverse((e) => {
			let n = typeof e.userData.axiePartId == "string" ? e.userData.axiePartId : void 0, r = typeof e.userData.axieRigType == "string" ? e.userData.axieRigType : void 0;
			if (!n || !r || typeof e.userData.axieAddonId == "string") return;
			let i = t.get(`${n}:${r}`), a = this.InstantiationParams.partLayerOverrides.find((e) => e.type === i);
			a && e.traverse((e) => {
				z(e) && e.layers.set(Math.max(0, Math.min(31, Math.trunc(a.layer))));
			});
		});
	}
};
//#endregion
export { y as a, o as c, F as i, I as n, n as o, D as r, i as s, B as t };

//# sourceMappingURL=character3d-BUT2sJB3.js.map