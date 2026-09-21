import { c as e, d as t, i as n, l as r, s as i, t as a } from "./chunks/domain-Bk-35ubC.js";
import { a as o, h as s, m as c } from "./chunks/genes-decoder-eQ2QL6UT.js";
import { n as l, o as ee, t as u } from "./chunks/character3d-BUT2sJB3.js";
import * as d from "three";
//#region src/character3d-behaviour.ts
function f() {
	let e = new d.WebGLRenderTarget(1, 1, {
		format: d.RGBAFormat,
		type: d.UnsignedByteType,
		depthBuffer: !0,
		stencilBuffer: !1
	});
	return e.depthTexture = new d.DepthTexture(1, 1, d.UnsignedShortType), e.depthTexture.format = d.DepthFormat, e.texture.name = "AxieAvatar:ARGB32", e.depthTexture.name = "AxieAvatar:Depth16", e.texture.userData.axieAvatarFormat = "ARGB32", e.depthTexture.userData.axieAvatarDepthBits = 16, e;
}
var te = class {
	axieGenes = "";
	axieDescriptor = {
		colorVariant: 0,
		body: "normal",
		parts: []
	};
	avatarRenderParams = [];
	transform;
	#e;
	#t;
	#n;
	#r = null;
	#i = [];
	#a = 0;
	#o = !1;
	constructor(e) {
		this.#e = e.renderer, this.transform = e.transform ?? new d.Group(), this.#t = e.factory, this.#n = e.createRenderTarget ?? f;
	}
	get Character() {
		return this.#r;
	}
	get Avatars() {
		return this.#i;
	}
	get disposed() {
		return this.#o;
	}
	async Start() {
		return this.#r ? this.#r : this.Rebuild();
	}
	Refresh() {
		return this.Rebuild();
	}
	async Rebuild() {
		if (this.#o) throw Error("AxieCharacter3DBehaviour is disposed.");
		let e = ++this.#a;
		this.#s();
		let t = this.axieGenes, n, r = [];
		try {
			let i = t.trim() ? await (this.#t ? this.#t.createFromGenes(t) : u.FromGenes(t)) : await (this.#t ? this.#t.createFromDescriptor(this.axieDescriptor) : u.FromDescriptor(this.axieDescriptor));
			if (!i) throw Error(`Cannot rebuild AxieCharacter3DBehaviour: body ${this.axieDescriptor.body} is missing.`);
			if (n = i, this.#o || e !== this.#a) return n.dispose(), null;
			t.trim() && (this.axieDescriptor = n.descriptor), this.#r = n, this.transform.add(n.Root);
			for (let e of this.avatarRenderParams) {
				let t = this.#n();
				r.push(t), n.RenderAvatar(this.#e, t, e);
			}
			return this.#o || e !== this.#a ? (r.forEach((e) => e.dispose()), n.dispose(), null) : (this.#i = r, n);
		} catch (e) {
			throw r.forEach((e) => e.dispose()), this.#r === n && (this.#r = null), n?.dispose(), e;
		}
	}
	OnDestroy() {
		this.dispose();
	}
	dispose() {
		this.#o || (this.#o = !0, this.#a += 1, this.#s());
	}
	#s() {
		this.#r?.dispose(), this.#r = null, this.#i.forEach((e) => e.dispose()), this.#i = [];
	}
}, ne = "public-content-v1", p = "AxieMixer3D/AxieFactory", m = "AxieMixer3D/Data", h = "_PrimaryColor", g = "_SecondaryColor", re = Object.freeze({
	nullParts: "throw-during-unity-coercion",
	coercion: "preserve-source-no-op",
	unsupportedPart: "omit-missing-resource-key",
	missingEyeMouth: "preserve-48-known-absences",
	classCase: "resource-key-is-case-sensitive",
	missingBody: "return-null-from-compatibility-factory",
	bodyLodThree: "retain-prefab-body-and-clamp-parts; public-quality-range-0-2",
	animationTrackMismatch: "warn-and-keep-playable-tracks",
	missingColor: "preserve-authored-material-when-palette-row-is-absent",
	obsoleteAnimations: "never-type-plus-runtime-error",
	readmeConstructor: "reject-source-readme-constructor-shape",
	readmeClips: "exact-dictionary-lookup-throws-for-absent-names",
	stackalloc: "deterministically-zero-initialize-web-decoder",
	overlongGenes: "deterministic-too-long-error-at-129-contiguous-hex-digits",
	invalidGeneCharacter: "truncate-higher-prefix-like-source",
	noSourceTests: "use-source-pinned-web-oracles-and-retained-evidence"
}), ie = Object.freeze({
	normal: "Normal",
	spiky: "Spiky",
	fuzzy: "Fuzzy",
	curly: "Curly",
	sumo: "Sumo",
	wetdog: "Wetdog",
	bigyak: "Bigyak",
	frosty: "Frosty"
}), ae = Object.freeze({
	AxieBodyType: a,
	AxiePartType: n,
	AxieRigType: e
});
function _(e) {
	let t = i[e];
	if (!t) throw Error(`Unknown AxieRigType: ${String(e)}`);
	return t;
}
var oe = Object.freeze({ ToAxiePartType: _ }), se = class {
	kind = "layer-field";
}, ce = class {
	OnGUI(e, t) {
		return typeof e != "number" || !Number.isInteger(e) || t === void 0 ? e : Math.trunc(t);
	}
}, v = class {
	type;
	skin;
	class;
	variant;
	level;
	constructor(e = {}) {
		this.type = e.type ?? "back", this.skin = e.skin ?? 0, this.class = e.class ?? null, this.variant = e.variant ?? 0, this.level = e.level ?? 0;
	}
}, y = class e {
	colorVariant;
	body;
	parts;
	constructor(e = {}) {
		this.colorVariant = e.colorVariant ?? 0, this.body = e.body ?? "normal", this.parts = (e.parts ?? []).map((e) => new v(e));
	}
	static FromGenes(t) {
		return new e(o(t).descriptor);
	}
}, le = class {
	name;
	clip;
	constructor(e = "", t = null) {
		this.name = e, this.clip = t;
	}
}, ue = class {
	prefab;
	lodMeshes;
	liteAnimations;
	fullAnimations;
	LiteAnimations;
	FullAnimations;
	constructor(e = {}) {
		this.prefab = e.prefab ?? null, this.lodMeshes = [...e.lodMeshes ?? []], this.liteAnimations = [...e.liteAnimations ?? []], this.fullAnimations = [...e.fullAnimations ?? []], this.LiteAnimations = new Map(this.liteAnimations.map((e) => [e.name, e])), this.FullAnimations = new Map(this.fullAnimations.map((e) => [e.name, e]));
	}
}, b = class {
	type;
	prefab;
	lodMeshes;
	constructor(e = {}) {
		this.type = e.type ?? "Back_L", this.prefab = e.prefab ?? null, this.lodMeshes = [...e.lodMeshes ?? []];
	}
}, x = class {
	rigs;
	constructor(e = []) {
		this.rigs = [...e];
	}
}, S = class {
	index = 0;
	key = null;
	skin = 0;
	class = null;
	color_value = 0;
	primary1 = null;
	primary2 = null;
	constructor(e = {}) {
		typeof e.index == "number" && (this.index = Math.trunc(e.index)), typeof e.key == "string" && (this.key = e.key), typeof e.skin == "number" && (this.skin = Math.trunc(e.skin)), typeof e.class == "string" && (this.class = e.class), typeof e.color_value == "number" && (this.color_value = Math.trunc(e.color_value)), typeof e.primary1 == "string" && (this.primary1 = e.primary1), typeof e.primary2 == "string" && (this.primary2 = e.primary2);
	}
}, C = class {
	colors;
	constructor(e = null) {
		this.colors = e ? [...e] : null;
	}
}, w = class {
	items;
	constructor(e = new C()) {
		this.items = e;
	}
};
function T(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : void 0;
}
function E(e) {
	let t = T(T(JSON.parse(e))?.items);
	return new w(new C((Array.isArray(t?.colors) ? t.colors : null)?.map((e) => new S(T(e))) ?? null));
}
function de(e) {
	return new w(new C(e.creator.colorVariants.map((e) => new S({
		index: e.index,
		key: e.key,
		skin: e.skin,
		class: e.class,
		color_value: e.colorValue,
		primary1: e.primary1,
		primary2: e.primary2
	}))));
}
function D(e, t, n) {
	return e && /^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(e) ? `#${(e.length === 3 || e.length === 4 ? e.split("").map((e) => `${e}${e}`).join("") : e).slice(0, 6).toLowerCase()}` : (n.push(`Cannot parse ${t} color #${e ?? ""}`), "#ffffff");
}
function O(e, t) {
	let n = [], r = e?.items.colors?.find((e) => e.index === t);
	return r ? {
		variant: r,
		primary: D(r.primary1, h, n),
		secondary: D(r.primary2, g, n),
		warnings: n
	} : {
		variant: void 0,
		primary: void 0,
		secondary: void 0,
		warnings: n
	};
}
function fe(e, t) {
	e.userData.axieSourceColorProperties = Object.freeze({
		[h]: t.primary,
		[g]: t.secondary
	});
}
function pe(e, t, n, r) {
	let i = O(t, n), a = [];
	if (!i.variant) return {
		...i,
		propertyValues: void 0,
		ownedMaterials: a
	};
	let o = Object.freeze({
		[h]: i.primary,
		[g]: i.secondary
	});
	return e.forEach((e) => {
		if (r) {
			e.userData.axieMaterialPropertyBlock = o;
			return;
		}
		let t = (Array.isArray(e.material) ? e.material : [e.material]).map((e) => {
			let t = e.clone();
			return fe(t, i), a.push(t), t;
		});
		e.material = Array.isArray(e.material) ? t : t[0];
	}), {
		...i,
		propertyValues: o,
		ownedMaterials: a
	};
}
var me = class {
	#e = /* @__PURE__ */ new Map();
	get size() {
		return this.#e.size;
	}
	GetAddons(e, t, n) {
		let r = this.#e.get(e);
		if (r) return r;
		let i = /* @__PURE__ */ new Map(), a = [];
		t.forEach((t) => {
			n(t, e).forEach((e) => {
				e.kind === "material" ? i.set(e.name, e.value) : a.push(e.value);
			});
		});
		let o = Object.freeze({
			materials: i,
			prefabs: Object.freeze(a)
		});
		return this.#e.set(e, o), o;
	}
	ClearCache() {
		this.#e.clear();
	}
};
function he(e) {
	return `${m}/Bodies/${ie[e]}`;
}
function k(e, t) {
	return e.assets.bodies[t] ?? null;
}
var ge = Object.freeze({
	formatPartKey: t,
	formatAddonKey: r,
	resolveBodyLod: c,
	resolvePartLod: s
});
function _e(t) {
	let n = /* @__PURE__ */ new Map(), r, i;
	return t.traverse((t) => {
		let a = /^Root_(\w+)_JNT$/u.exec(t.name);
		if (!a) return;
		let o = a[1];
		if (e.includes(o)) {
			n.set(o, t);
			return;
		}
		o === "Weapon_R" ? i = t : o === "Weapon_L" && (r = t);
	}), {
		attachPoints: n,
		leftWeaponAttachPoint: r,
		rightWeaponAttachPoint: i
	};
}
function A(e, t) {
	let n = [];
	return e.forEach((e, r) => {
		e.materials.forEach((e, i) => {
			for (let a of ["ExtraPrePass", "Forward"]) {
				let o = e.FindPass(a);
				if (o < 0) continue;
				let s = {
					rendererIndex: r,
					subMeshIndex: i,
					passName: a,
					passIndex: o
				};
				n.push(s), t(s);
			}
		});
	}), n;
}
function j(e) {
	let t = [...e.parts].map((e) => ({ ...e }));
	for (let e = 0; e < t.length; e += 1) {
		let n = { ...t[e] };
		n.skin = +(n.skin === 1 && n.variant === 2), n.level = 1;
	}
	return {
		...e,
		parts: t
	};
}
var M = class {
	manifest;
	adapter;
	static DefaultResourcePath = p;
	static #e;
	static get Default() {
		return this.#e;
	}
	static InstallDefault(e) {
		let t = this.#e;
		this.#e = e;
		let n = !1;
		return () => {
			n || (n = !0, this.#e === e && (this.#e = t));
		};
	}
	defaultInstantiationParams;
	constructor(e, t, n = new l({ lodLevel: 2 })) {
		this.manifest = e, this.adapter = t, this.defaultInstantiationParams = new l(n);
	}
	async CreateCharacter(e, t = null) {
		let n = j(e);
		if (!k(this.manifest, n.body)) return null;
		let r = this.defaultInstantiationParams.Merge(t);
		return this.adapter.create(n, r);
	}
	ClearCache() {
		this.adapter.clearCache?.();
	}
}, N = "/api/axies/{id}", P = N, F = class {
	query;
	constructor(e = "") {
		this.query = e;
	}
}, I = class {
	newGenes;
	constructor(e = null) {
		this.newGenes = e;
	}
}, L = class {
	axie;
	constructor(e = null) {
		this.axie = e;
	}
}, ve = class {
	data;
	constructor(e = new L()) {
		this.data = e;
	}
};
function ye(e) {
	if (!e || typeof e != "object") return;
	let t = e.newGenes ?? e.genes;
	if (typeof t == "string") return t;
	let n = e.data;
	if (!n || typeof n != "object") return;
	let r = n.axie;
	if (!r || typeof r != "object") return;
	let i = r.newGenes;
	return typeof i == "string" ? i : void 0;
}
var be = class e {
	id = 0;
	genes = "";
	descriptor = new y();
	fetchGenes;
	constructor(e = (e, t) => fetch(e, t)) {
		this.fetchGenes = e;
	}
	static Open(t) {
		return new e(t);
	}
	BuildRequest(e = this.id) {
		return new F(`{ axie (axieId: "${Math.trunc(e)}") { id, genes, newGenes } }`);
	}
	DecodeGenes(e = this.genes) {
		return this.genes = e, this.descriptor = y.FromGenes(e), this.descriptor;
	}
	async FetchGenes(e = this.id) {
		this.id = Math.trunc(e);
		let t = N.replace("{id}", encodeURIComponent(String(this.id))), n = await this.fetchGenes(t, {
			method: "GET",
			headers: { accept: "application/json" }
		});
		if (!n.ok) return;
		let r = ye(await n.json());
		if (r !== void 0) return this.genes = r, this.DecodeGenes(r);
	}
}, xe = class {
	OnImportAsset(e) {
		return E(e);
	}
}, Se = class e {
	static Open() {
		return new e();
	}
	RenderSelection(e, t, n, r) {
		if (!e?.active || !e.character) return {
			rendered: !1,
			cachedAvatars: [],
			message: "Select an active Axie character to preview its avatar."
		};
		let i = e.character.RenderAvatar?.bind(e.character) ?? e.character.renderAvatar?.bind(e.character);
		return i ? {
			rendered: !0,
			renderResult: i(t, n, r),
			cachedAvatars: e.cachedAvatars ?? []
		} : {
			rendered: !1,
			cachedAvatars: e.cachedAvatars ?? [],
			message: "Selected Axie character does not expose avatar rendering."
		};
	}
}, R = Object.freeze([
	"Aquatic",
	"Beast",
	"Bird",
	"Bug",
	"Plant",
	"Reptile"
]), z = Object.freeze([
	2,
	4,
	6,
	8,
	10,
	12
]), B = Object.freeze({
	Aquatic: 14,
	Beast: 3,
	Bird: 25,
	Bug: 20,
	Plant: 9,
	Reptile: 30
}), Ce = class {
	body = "normal";
	classes = [...R];
	variants = [...z];
	skin = 0;
	level = 1;
	BuildEntries() {
		let e = [];
		return this.classes.forEach((t, r) => {
			let i = B[t] ?? 0;
			this.variants.forEach((a, o) => {
				let s = n.map((e) => ({
					class: t,
					variant: a,
					type: e,
					skin: this.skin,
					level: this.level
				}));
				e.push({
					descriptor: {
						body: this.body,
						colorVariant: i,
						parts: s
					},
					name: `${this.body}-${t}-${a.toString().padStart(2, "0")}`,
					grid: [r, o],
					sourcePosition: [
						2 * r,
						0,
						2 * o
					],
					rotationYDegrees: 180,
					animation: "Default.Idle",
					loop: !0
				});
			});
		}), e;
	}
}, we = class {
	sensitivity = [.2, .2];
	#e;
	Update(e, t) {
		if (!e.rightMouseHeld) return t;
		if (e.rightMousePressed || !this.#e) return this.#e = [e.x, e.y], t;
		let n = this.sensitivity[0] * (e.x - this.#e[0]), r = this.sensitivity[1] * (e.y - this.#e[1]);
		return this.#e = [e.x, e.y], {
			pitch: Math.min(75, Math.max(5, t.pitch - r)),
			yaw: t.yaw + n
		};
	}
}, V = Object.freeze([
	"Axe",
	"Bow",
	"Cannon",
	"Flag",
	"Gauntlet",
	"Mala",
	"Staff",
	"Sword",
	"Tome"
]), Te = Object.freeze([
	"Idle",
	"Walk",
	"Run",
	"Stun",
	"Dead"
]), H = class {
	runtimeAnimatorController;
	overrides = /* @__PURE__ */ new Map();
	constructor(e) {
		this.runtimeAnimatorController = e;
	}
	SetOverride(e, t) {
		this.overrides.set(e, t);
	}
	GetOverride(e) {
		return this.overrides.get(e);
	}
};
function U(e, t) {
	return {
		body: "normal",
		colorVariant: 0,
		parts: n.map((n) => ({
			class: e,
			variant: t,
			type: n,
			skin: 0,
			level: 1
		}))
	};
}
function W(e) {
	if (typeof e != "object" || !e) return;
	let t = e.name;
	return typeof t == "string" ? t.split("_")[1] : void 0;
}
function G(e, t) {
	e.setRuntimeAnimatorController ? e.setRuntimeAnimatorController(t) : e.runtimeAnimatorController = t;
}
function K(e, t) {
	if (!e) throw Error(`Animator sample requires its ${t} character behaviour.`);
	return e;
}
function q(e, t) {
	if (!e.Character) throw Error(`Animator sample ${t} character was not rebuilt.`);
	return e.Character;
}
function J(e, t, n, r, i) {
	if (!i) throw Error("Animator sample weapon selection requires a weapon runtime adapter.");
	let a = [], o = (n, r) => {
		if (t !== "Bow" && a.push({
			instance: i.instantiate(e, n.RightWeaponAttachPoint),
			character: r,
			side: "right",
			weaponName: t
		}), t === "Bow" || t === "Gauntlet") {
			let o = i.instantiate(e, n.LeftWeaponAttachPoint);
			a.push({
				instance: o,
				character: r,
				side: "left",
				weaponName: t
			}), t === "Gauntlet" && i.setLocalScale(o, 1, 1, -1);
		}
	};
	return o(n, "lite"), o(r, "full"), a;
}
var Ee = class {
	liteAnimator;
	fullAnimator;
	animatorController;
	liteCharacterBehaviour;
	fullCharacterBehaviour;
	weaponPrefabs;
	moveSpeed = 0;
	stunned = !1;
	axieClass = R[0];
	axieVariant = z[0];
	liteAnimatorController;
	fullAnimatorController;
	#e = null;
	#t = [];
	#n;
	#r;
	constructor(e, t, n = {}) {
		this.liteAnimator = e, this.fullAnimator = t, this.animatorController = n.animatorController, this.liteCharacterBehaviour = n.liteCharacterBehaviour, this.fullCharacterBehaviour = n.fullCharacterBehaviour, this.weaponPrefabs = [...n.weaponPrefabs ?? []], this.#n = n.weaponRuntime, this.#r = n.createAnimator;
	}
	get currentWeaponPrefab() {
		return this.#e;
	}
	get weapons() {
		return this.#t;
	}
	get canUseWeaponActions() {
		return this.#t.length > 0;
	}
	async Start() {
		return this.liteAnimatorController = new H(this.animatorController), this.fullAnimatorController = new H(this.animatorController), this.RebuildAxie();
	}
	Update() {
		for (let e of [this.liteAnimator, this.fullAnimator]) e.setFloat("Move Speed", this.moveSpeed), e.setBool("Stunned", this.stunned);
	}
	Trigger(e) {
		return (e === "Attack" || e === "Skill") && !this.canUseWeaponActions ? !1 : (this.liteAnimator.setTrigger(e), this.fullAnimator.setTrigger(e), !0);
	}
	Attack() {
		return this.Trigger("Attack");
	}
	Skill() {
		return this.Trigger("Skill");
	}
	Dead() {
		return this.Trigger("Dead");
	}
	Restart() {
		return this.Trigger("Restart");
	}
	async SelectAxieClass(e) {
		return this.axieClass = e, this.RebuildAxie();
	}
	async SelectAxieVariant(e) {
		return this.axieVariant = e, this.RebuildAxie();
	}
	UpdateAnimations(e) {
		let t = K(this.liteCharacterBehaviour, "lite"), n = K(this.fullCharacterBehaviour, "full"), r = q(t, "lite"), i = q(n, "full"), a = this.liteAnimatorController, o = this.fullAnimatorController;
		if (!a || !o) throw Error("Animator sample has not started.");
		let s = e ?? "Default";
		a.SetOverride("Idle", r.GetLiteAnimationClip(`${s}.Idle`)), a.SetOverride("Walk", r.GetLiteAnimationClip(`${s}.Walk`)), a.SetOverride("Run", r.GetLiteAnimationClip(`${s}.Run`)), a.SetOverride("Stun", r.GetLiteAnimationClip("Default.Stun")), a.SetOverride("Dead", r.GetLiteAnimationClip("Default.Dead")), o.SetOverride("Idle", i.GetFullAnimationClip(`${s}.Idle`)), o.SetOverride("Walk", i.GetFullAnimationClip(`${s}.Walk`)), o.SetOverride("Run", i.GetFullAnimationClip(`${s}.Run`)), o.SetOverride("Stun", i.GetFullAnimationClip("Default.Stun")), o.SetOverride("Dead", i.GetFullAnimationClip("Default.Dead")), e === void 0 ? this.Restart() : (a.SetOverride("Attack", r.GetLiteAnimationClip(`${e}.Attack`)), a.SetOverride("Skill", r.GetLiteAnimationClip(`${e}.Skill`)), o.SetOverride("Attack", i.GetFullAnimationClip(`${e}.Attack`)), o.SetOverride("Skill", i.GetFullAnimationClip(`${e}.Skill`)));
	}
	EquipWeapon(e) {
		this.#e = e;
		for (let e of this.#t) this.#n?.destroy(e.instance);
		this.#t = [];
		let t = W(e);
		if (t !== void 0 && e !== null) {
			let n = K(this.liteCharacterBehaviour, "lite"), r = K(this.fullCharacterBehaviour, "full");
			this.#t = J(e, t, q(n, "lite"), q(r, "full"), this.#n);
		}
		this.UpdateAnimations(t);
	}
	async RebuildAxie() {
		let e = K(this.liteCharacterBehaviour, "lite"), t = K(this.fullCharacterBehaviour, "full"), n = U(this.axieClass, this.axieVariant);
		e.axieDescriptor = n, await e.Rebuild();
		let r = q(e, "lite");
		if (this.#r) {
			if (!this.liteAnimatorController) throw Error("Animator sample has not started.");
			this.liteAnimator = this.#r(r, this.liteAnimatorController, "lite");
		}
		this.liteAnimatorController && G(this.liteAnimator, this.liteAnimatorController), t.axieDescriptor = n, await t.Rebuild();
		let i = q(t, "full");
		if (this.#r) {
			if (!this.fullAnimatorController) throw Error("Animator sample has not started.");
			this.fullAnimator = this.#r(i, this.fullAnimatorController, "full");
		}
		return this.fullAnimatorController && G(this.fullAnimator, this.fullAnimatorController), this.EquipWeapon(this.#e), n;
	}
}, De = class {
	liteCharacterBehaviour;
	fullCharacterBehaviour;
	weaponPrefabs;
	axieClass = R[0];
	axieVariant = z[0];
	currentAnimation = "Idle";
	liteAnimation;
	fullAnimation;
	#e = null;
	#t = [];
	#n = /* @__PURE__ */ new Map();
	#r = /* @__PURE__ */ new Map();
	#i;
	#a;
	#o;
	constructor(e, t, n = [], r = {}) {
		this.liteCharacterBehaviour = e, this.fullCharacterBehaviour = t, this.weaponPrefabs = n, this.#i = r.weaponRuntime, this.#a = r.createAnimation, this.#o = r.clipRuntime;
	}
	get currentWeaponPrefab() {
		return this.#e;
	}
	get weapons() {
		return this.#t;
	}
	get canUseWeaponActions() {
		return this.#t.length > 0;
	}
	async Start() {
		return this.RebuildAxie();
	}
	PlayAnimation(e) {
		let t = this.liteAnimation, n = this.fullAnimation;
		if (!t || !n) throw Error("Legacy animation sample has not started.");
		this.currentAnimation = e, t.play(e), n.play(e);
	}
	PlayWeaponAnimation(e) {
		return this.canUseWeaponActions ? (this.PlayAnimation(e), !0) : !1;
	}
	async SelectAxieClass(e) {
		return this.axieClass = e, this.RebuildAxie();
	}
	async SelectAxieVariant(e) {
		return this.axieVariant = e, this.RebuildAxie();
	}
	ReplaceClip(e, t, n, r) {
		let i = this.#o;
		if (!i) throw Error("Legacy animation sample requires a clip runtime adapter.");
		let a = i.instantiate(r);
		i.setLegacy(a, !0), e.addClip(a, n);
		let o = t.get(n);
		o !== void 0 && i.destroy(o), t.set(n, a);
	}
	UpdateAnimations(e) {
		let t = this.liteAnimation, n = this.fullAnimation;
		if (!t || !n) throw Error("Legacy animation sample has not started.");
		let r = q(this.liteCharacterBehaviour, "lite"), i = q(this.fullCharacterBehaviour, "full"), a = e ?? "Default";
		this.ReplaceClip(t, this.#n, "Idle", r.GetLiteAnimationClip(`${a}.Idle`)), this.ReplaceClip(t, this.#n, "Walk", r.GetLiteAnimationClip(`${a}.Walk`)), this.ReplaceClip(t, this.#n, "Run", r.GetLiteAnimationClip(`${a}.Run`)), this.ReplaceClip(t, this.#n, "Stun", r.GetLiteAnimationClip("Default.Stun")), this.ReplaceClip(t, this.#n, "Dead", r.GetLiteAnimationClip("Default.Dead")), this.ReplaceClip(n, this.#r, "Idle", i.GetFullAnimationClip(`${a}.Idle`)), this.ReplaceClip(n, this.#r, "Walk", i.GetFullAnimationClip(`${a}.Walk`)), this.ReplaceClip(n, this.#r, "Run", i.GetFullAnimationClip(`${a}.Run`)), this.ReplaceClip(n, this.#r, "Stun", i.GetFullAnimationClip("Default.Stun")), this.ReplaceClip(n, this.#r, "Dead", i.GetFullAnimationClip("Default.Dead")), e === void 0 ? (this.currentAnimation === "Attack" || this.currentAnimation === "Skill") && (this.currentAnimation = "Idle") : (this.ReplaceClip(t, this.#n, "Attack", r.GetLiteAnimationClip(`${e}.Attack`)), this.ReplaceClip(t, this.#n, "Skill", r.GetLiteAnimationClip(`${e}.Skill`)), this.ReplaceClip(n, this.#r, "Attack", i.GetFullAnimationClip(`${e}.Attack`)), this.ReplaceClip(n, this.#r, "Skill", i.GetFullAnimationClip(`${e}.Skill`))), this.PlayAnimation(this.currentAnimation);
	}
	EquipWeapon(e) {
		this.#e = e;
		for (let e of this.#t) this.#i?.destroy(e.instance);
		this.#t = [];
		let t = W(e);
		t !== void 0 && e !== null && (this.#t = J(e, t, q(this.liteCharacterBehaviour, "lite"), q(this.fullCharacterBehaviour, "full"), this.#i)), this.UpdateAnimations(t);
	}
	async RebuildAxie() {
		let e = U(this.axieClass, this.axieVariant);
		if (!this.#a) throw Error("Legacy animation sample requires an Animation component factory.");
		this.liteCharacterBehaviour.axieDescriptor = e, await this.liteCharacterBehaviour.Rebuild();
		let t = q(this.liteCharacterBehaviour, "lite");
		this.liteAnimation = this.#a(t, "lite"), this.liteAnimation.wrapMode = "Loop", this.fullCharacterBehaviour.axieDescriptor = e, await this.fullCharacterBehaviour.Rebuild();
		let n = q(this.fullCharacterBehaviour, "full");
		return this.fullAnimation = this.#a(n, "full"), this.fullAnimation.wrapMode = "Loop", this.EquipWeapon(this.#e), e;
	}
}, Y = Object.freeze([
	-.32139380484326957,
	-.3420201433256687,
	-.883022221559489
]), Oe = class {
	#e;
	#t = /* @__PURE__ */ new Map();
	constructor(e) {
		this.#e = new d.AnimationMixer(e);
	}
	addClip(e, t) {
		this.#t.set(t, e);
	}
	play(e) {
		let t = this.#t.get(e);
		t && this.#e.clipAction(t).reset().setLoop(d.LoopRepeat, Infinity).play();
	}
	update(e) {
		this.#e.update(e);
	}
}, ke = {
	instantiate(e) {
		return e.clone();
	},
	setLegacy(e, t) {
		e.legacy = t;
	},
	setWrapMode(e, t) {
		e.wrapMode = t;
	},
	create(e) {
		return new Oe(e);
	}
};
function Ae() {
	let e = new d.WebGLRenderTarget(512, 512, {
		format: d.RGBAFormat,
		type: d.UnsignedByteType,
		depthBuffer: !0,
		stencilBuffer: !1
	});
	return e.depthTexture = new d.DepthTexture(512, 512, d.UnsignedShortType), e.depthTexture.format = d.DepthFormat, e.texture.name = "AxieAvatars:Realtime:ARGB32", e.depthTexture.name = "AxieAvatars:Realtime:Depth16", e.texture.userData.axieAvatarFormat = "ARGB32", e.depthTexture.userData.axieAvatarDepthBits = 16, e;
}
var je = class {
	characterBehaviour;
	avatarImage0;
	avatarImage1;
	renderImage;
	realtimeAvatar = null;
	renderParams = null;
	animationClip = null;
	animation = null;
	#e = 0;
	#t = !1;
	#n = !1;
	#r = !1;
	#i = new d.Clock(!1);
	#a;
	#o;
	#s;
	constructor(e, t, n, r, i = {}) {
		this.characterBehaviour = e, this.avatarImage0 = t, this.avatarImage1 = n, this.renderImage = r, this.#a = i.renderer, this.#o = i.animationRuntime ?? ke, this.#s = i.createRenderTarget ?? Ae;
	}
	get initialized() {
		return this.#n;
	}
	get delayedFrame() {
		return this.#e;
	}
	Start() {
		if (this.#r) throw Error("Axie avatars sample is destroyed.");
		this.#t = !0, this.#e = 0;
	}
	async AdvanceFrame() {
		if (!this.#t || this.#n || this.#r) return !1;
		if (this.#e += 1, this.#e === 3) return this.characterBehaviour.enabled = !0, await this.characterBehaviour.Start?.(), !1;
		if (this.#e < 4) return !1;
		let e = this.characterBehaviour.Character;
		if (!e) throw Error("Axie avatars sample character was not initialized.");
		let t = e.GetLiteAnimationClip("Default.Run"), n = this.#o.instantiate(t);
		this.#o.setLegacy(n, !0), this.#o.setWrapMode(n, "Loop");
		let r = this.#o.create(e.Root);
		r.addClip(n, "Run"), r.play("Run");
		let i = this.#s(), a = new ee({
			width: 512,
			height: 512,
			viewDirection: new d.Vector3(...Y)
		});
		return this.animationClip = n, this.animation = r, this.realtimeAvatar = i, this.renderParams = a, this.avatarImage0.texture = this.characterBehaviour.Avatars[0], this.avatarImage1.texture = this.characterBehaviour.Avatars[1], this.renderImage.texture = i, this.#n = !0, this.#i.start(), !0;
	}
	Update(e) {
		let t = this.realtimeAvatar, n = this.renderParams, r = this.characterBehaviour.Character;
		if (!(!t || !n || !r)) {
			if (!this.#a) throw Error("Axie avatars sample requires a renderer for Update().");
			return this.animation?.update?.(e ?? this.#i.getDelta()), r.RenderAvatar(this.#a, t, n);
		}
	}
	OnDestroy() {
		this.#r || (this.#r = !0, this.#i.stop(), this.realtimeAvatar?.dispose(), this.realtimeAvatar = null, this.renderParams = null, this.renderImage.texture = void 0);
	}
}, X = "Axie Mixer 3D/Outline/PostProcess", Z = Object.freeze(["Normal", "Depth"]), Q = class {
	outlineColor = [
		0,
		0,
		0,
		1
	];
	thickness = 1;
	depthScale = 50;
	depthBias = 50;
	normalScale = .7;
	normalBias = 10;
	renderPassEvent = "AfterRenderingPostProcessing";
	constructor(e = {}) {
		e.outlineColor && (this.outlineColor = [...e.outlineColor]), e.thickness !== void 0 && (this.thickness = Math.trunc(e.thickness)), e.depthScale !== void 0 && (this.depthScale = e.depthScale), e.depthBias !== void 0 && (this.depthBias = e.depthBias), e.normalScale !== void 0 && (this.normalScale = e.normalScale), e.normalBias !== void 0 && (this.normalBias = e.normalBias), e.renderPassEvent !== void 0 && (this.renderPassEvent = e.renderPassEvent);
	}
}, $ = class {
	material;
	renderPassEvent = "AfterRenderingPostProcessing";
	configuredInputs = [];
	constructor(e) {
		this.material = e;
	}
	ConfigureInput(e) {
		this.configuredInputs = Object.freeze([...e]);
	}
	Execute(e, t) {
		let n = Object.freeze({
			name: "AxieMixer3D.OutlinePostProcessRendererFeature",
			source: "None",
			target: t.cameraColorTarget,
			material: this.material,
			materialPass: 0
		});
		try {
			e.executeCommand(n);
		} finally {
			e.releaseCommand?.(n);
		}
		return n;
	}
}, Me = class {
	createMaterial;
	static Settings = Q;
	static OutlinePass = $;
	static ShaderName = X;
	settings;
	material;
	outlinePass;
	constructor(e = {}, t = () => {
		throw Error("An outline material factory is required in the browser runtime.");
	}) {
		this.createMaterial = t, this.settings = e instanceof Q ? e : new Q(e);
	}
	Create() {
		return this.material = this.createMaterial(X), this.outlinePass = new $(this.material), this.outlinePass;
	}
	AddRenderPasses(e, t) {
		return !this.material || !this.outlinePass || t.cameraType === "Preview" ? !1 : (this.material.setFloat("_Thickness", this.settings.thickness), this.material.setColor("_Color", this.settings.outlineColor), this.material.setFloat("_DepthScale", this.settings.depthScale), this.material.setFloat("_DepthBias", this.settings.depthBias), this.material.setFloat("_NormalScale", this.settings.normalScale), this.material.setFloat("_NormalBias", this.settings.normalBias), this.outlinePass.renderPassEvent = this.settings.renderPassEvent, this.outlinePass.ConfigureInput(Z), e.enqueuePass(this.outlinePass), !0);
	}
	Dispose(e = !0) {
		e && this.material?.dispose?.(), this.material = void 0, this.outlinePass = void 0;
	}
};
//#endregion
export { Y as AXIE_AVATAR_SAMPLE_VIEW_DIRECTION, B as AXIE_COLLECTION_CLASS_COLOR_MAP, m as AXIE_DATA_RESOURCE_PATH, p as AXIE_FACTORY_RESOURCE_PATH, N as AXIE_GENES_API_ENDPOINT, P as AXIE_GENES_GRAPHQL_URL, Z as AXIE_OUTLINE_INPUTS, X as AXIE_OUTLINE_POST_PROCESS_SHADER_NAME, h as AXIE_PRIMARY_COLOR_PROPERTY, R as AXIE_SAMPLE_CLASSES, Te as AXIE_SAMPLE_LEGACY_ANIMATION_NAMES, z as AXIE_SAMPLE_VARIANTS, V as AXIE_SAMPLE_WEAPON_NAMES, g as AXIE_SECONDARY_COLOR_PROPERTY, ne as AXIE_SOURCE_COMPATIBILITY_COMMIT, re as AXIE_SOURCE_EDGE_POLICIES, ae as AXIE_SOURCE_ENUMS, Ee as AnimatorSample, me as AxieAddonCacheCompatibility, le as AxieAnimationDataCompatibility, Se as AxieAvatarPreview, je as AxieAvatars, ue as AxieBodyDataCompatibility, u as AxieCharacter3D, te as AxieCharacter3DBehaviour, Ce as AxieCollection, y as AxieDescriptorCompatibility, M as AxieFactoryCompatibility, ge as AxieFactorySemantics, I as AxieGenesDecoderAxie, L as AxieGenesDecoderData, be as AxieGenesDecoderEditor, F as AxieGenesFetchRequest, ve as AxieGenesFetchResponse, l as AxieInstantiationParams, S as AxieMixerColorVariantCompatibility, w as AxieMixerConfigCompatibility, xe as AxieMixerConfigImporter, C as AxieMixerItemsCompatibility, x as AxiePartDataCompatibility, v as AxiePartDescriptorCompatibility, b as AxieRigDataCompatibility, oe as AxieRigTypeExtensions, H as AxieSampleAnimatorOverrideController, we as CameraController, se as LayerFieldAttribute, ce as LayerFieldAttributeDrawer, De as LegacyAnimationSample, $ as OutlinePass, Me as OutlinePostProcessRendererFeature, Q as OutlinePostProcessSettings, _ as ToAxiePartType, pe as applyAxieUnityColorization, j as coerceAxieDescriptorUnityCompatible, _e as collectAxieAttachPoints, f as createAxieAvatarRenderTarget, A as executeAxieAvatarShaderPasses, he as formatAxieBodyResourceKey, E as importAxieMixerConfigJson, de as projectManifestToAxieMixerConfig, k as resolveAxieBodyOrNull, O as resolveAxieUnityColors };

//# sourceMappingURL=compat.js.map