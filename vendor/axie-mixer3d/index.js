import { a as e, c as t, d as n, i as r, l as i, n as a, o, r as s, s as c, t as l, u } from "./chunks/domain-Bk-35ubC.js";
import { C as d, c as f, d as p, n as m, r as h, t as g, w as _ } from "./chunks/clear-eye-gaze-planner-D5F64TO_.js";
import { a as v, c as y, d as b, f as x, h as S, i as ee, l as C, m as te, n as ne, o as re, p as ie, r as ae, s as oe, t as se, u as ce } from "./chunks/genes-decoder-eQ2QL6UT.js";
import { n as w, t as le } from "./chunks/character3d-BUT2sJB3.js";
//#region src/runtime.ts
var ue = "faithful", T = class extends Error {
	diagnostic;
	name = "AxieMixPlanError";
	constructor(e, t) {
		super(e), this.diagnostic = t;
	}
};
function de(e) {
	if (typeof e.quality != "string") return e.quality;
	let t = y[e.quality];
	if (t) return t;
	throw Error(`Unknown Axie quality profile: ${e.quality}`);
}
function E(e, t) {
	return e[t];
}
function D(e) {
	throw new T(e.message, e);
}
function fe(e, t, n) {
	t && D({
		...n,
		severity: "error"
	}), e.push(n);
}
function pe(e, t) {
	let n = e.creator.colorVariants.find((e) => e.index === t);
	return n ? {
		variant: n,
		primary: `#${n.primary1}`,
		secondary: `#${n.primary2}`,
		applyUnityColorVariant: !0
	} : { applyUnityColorVariant: !1 };
}
var me = class {
	build(e, t) {
		let r = t.strict === !0, i = [], a = [], o = de(t), s = t.animationSet ?? o.animationSet, c = t.artMode ?? "faithful", l = e.assets.bodies[t.descriptor.body];
		l || D({
			severity: "error",
			code: "body-missing",
			message: `Cannot find Axie body ${t.descriptor.body}.`,
			assetId: t.descriptor.body
		});
		let d = te(o.requestedLod, l.lods.length, l.prefabLod), f = E(l.lods, d);
		f || D({
			severity: "error",
			code: "body-missing",
			message: `Axie body ${l.id} has no prefab/LOD mesh at list index ${d}.`,
			assetId: l.id
		});
		let p = {
			requestedLod: o.requestedLod,
			resolvedLod: d,
			asset: f
		};
		d !== o.requestedLod && i.push({
			severity: "info",
			code: "lod-clamped",
			message: `Body ${l.id} kept prefab LOD ${d} for out-of-range request ${o.requestedLod}.`,
			assetId: l.id,
			details: {
				requested: o.requestedLod,
				resolved: d,
				policy: "unity-body-prefab"
			}
		});
		let m = pe(e, t.descriptor.colorVariant), h = [];
		return t.descriptor.parts.forEach((t) => {
			let s = n(t), c = e.assets.parts[s];
			if (!c) {
				a.push(s);
				return;
			}
			let u = /* @__PURE__ */ new Set();
			c.rigs.forEach((n) => {
				let a = l.attachNodes[n.type];
				if (!a) {
					i.push({
						severity: "error",
						code: "attach-node-missing",
						message: `Body ${l.id} has no attach point for ${n.type}; skipping ${s}.`,
						assetId: s,
						details: { rigType: n.type }
					});
					return;
				}
				let c = S(o.requestedLod, n.lods.length), d = E(n.lods, c);
				if (!d) {
					fe(i, r, {
						severity: "warning",
						code: "part-missing",
						message: `Part ${s}/${n.type} has no LOD meshes.`,
						assetId: s,
						details: { rigType: n.type }
					});
					return;
				}
				c !== o.requestedLod && i.push({
					severity: "info",
					code: "lod-clamped",
					message: `Part ${s}/${n.type} clamped LOD ${o.requestedLod} to ${c}.`,
					assetId: s,
					details: {
						requested: o.requestedLod,
						resolved: c,
						policy: "unity-part-clamp"
					}
				});
				let f = n.addonId ? e.assets.addons[n.addonId] : void 0;
				n.addonId && !f && fe(i, r, {
					severity: "warning",
					code: "addon-missing",
					message: `Cannot find Axie add-on ${n.addonId}.`,
					assetId: n.addonId
				});
				let p = f?.materialOverrides[n.sourcePrefabName] ?? n.materialId, m = !u.has(n.type);
				u.add(n.type), h.push({
					partId: s,
					partType: t.type,
					rigType: n.type,
					attachNode: a,
					rig: n,
					lod: {
						requestedLod: o.requestedLod,
						resolvedLod: c,
						asset: d
					},
					materialId: p,
					addonId: f ? n.addonId : void 0,
					instantiateAddonAttachments: m
				});
			});
		}), {
			key: `${u(t.descriptor)}|q:${o.id}|a:${s}|art:${c}`,
			descriptor: t.descriptor,
			quality: o,
			animationSet: s,
			artMode: c,
			body: l,
			bodyLod: p,
			partRigs: h,
			missingParts: a,
			warnings: i,
			colors: m
		};
	}
}, O = Object.freeze(new me()), k = [
	"eyes",
	"mouth",
	"ears",
	"horn",
	"back",
	"tail"
], A = class extends Error {
	code;
	axieId;
	status;
	name = "AxieLookupError";
	constructor(e, t, n, r, i) {
		super(t, i), this.code = e, this.axieId = n, this.status = r;
	}
}, he = /^\d{1,12}$/u, ge = "/api/axies/{id}";
function j(e) {
	return !!e && typeof e == "object" && !Array.isArray(e);
}
function M(e) {
	let t;
	if (typeof e == "bigint") t = e.toString();
	else if (typeof e == "number") {
		if (!Number.isSafeInteger(e)) throw new A("invalid-id", "Axie ID numbers must be safe integers. Pass larger IDs as decimal strings.");
		t = String(e);
	} else t = e.trim();
	if (!he.test(t) || t === "0" || t.startsWith("0")) throw new A("invalid-id", "Axie ID must be a positive decimal number using at most 12 digits.");
	return t;
}
function _e(e) {
	try {
		return M(e), !0;
	} catch {
		return !1;
	}
}
function ve(e, t) {
	if (typeof e == "function") return String(e(t));
	let n = String(e);
	return n.includes("{id}") ? n.replaceAll("{id}", encodeURIComponent(t)) : `${n.replace(/\/$/u, "")}/${encodeURIComponent(t)}`;
}
function N(e) {
	return typeof e == "string" && e.trim() ? e.trim() : null;
}
function P(e) {
	if (typeof e == "number" && Number.isFinite(e)) return e;
	if (typeof e == "string" && e.trim()) {
		let t = Number(e);
		if (Number.isFinite(t)) return t;
	}
	return null;
}
function F(e, t) {
	return j(e) ? Object.freeze(Object.fromEntries(k.map((n) => [n, t(e[n])]))) : null;
}
function I(e) {
	if (j(e)) return N(e.error) ?? N(e.message) ?? void 0;
}
function L(e, t) {
	let n = M(t);
	if (!j(e)) throw new A("invalid-response", `Axie #${n} lookup returned a non-object response.`, n);
	let r = n, i = e.axieId ?? e.id;
	if (i != null) try {
		r = M(typeof i == "number" ? i : String(i));
	} catch (e) {
		throw new A("invalid-response", `Axie #${n} lookup returned an invalid Axie ID.`, n, void 0, { cause: e });
	}
	let a = N(e.newGenes) ?? N(e.genes);
	if (!a) throw new A("missing-genes", I(e) ?? `Axie #${n} lookup did not return 512-bit genes.`, n);
	let o;
	try {
		o = re(a, { mode: "strict" });
	} catch (e) {
		throw new A("invalid-response", `Axie #${n} lookup returned invalid genes.`, n, void 0, { cause: e });
	}
	let s = P(e.axieStage ?? e.stage);
	if (s !== null && s !== 4) throw new A("unsupported-stage", `Axie #${n} is stage ${s}; this 3D mixer currently supports adult stage 4 Axies.`, n);
	return Object.freeze({
		axieId: r,
		name: N(e.name) ?? `Axie #${r}`,
		image: N(e.image),
		genes: o,
		class: N(e.class),
		axieStage: s,
		bodyShape: N(e.bodyShape),
		parts: F(e.parts, N),
		partNames: F(e.partNames, N),
		partClasses: F(e.partClasses, N),
		partSkins: F(e.partSkins, N),
		partStages: F(e.partStages, P),
		source: N(e.source) ?? "application-resolver",
		cacheTtlSeconds: P(e.cacheTtlSeconds)
	});
}
async function ye(e) {
	try {
		return await e.json();
	} catch {
		return;
	}
}
function be(e) {
	return typeof e == "object" && !!e && "name" in e && e.name === "AbortError";
}
function R(e = {}) {
	let t = e.endpoint ?? ge, n = e.fetcher ?? fetch, r = new Headers(e.headers);
	return r.has("Accept") || r.set("Accept", "application/json"), Object.freeze({ async resolve(e, i = {}) {
		let a = M(e), o;
		try {
			o = await n(ve(t, a), {
				method: "GET",
				headers: r,
				signal: i.signal
			});
		} catch (e) {
			throw be(e) ? e : new A("network", `Could not reach the Axie #${a} resolver.`, a, void 0, { cause: e });
		}
		let s = await ye(o);
		if (!o.ok) throw new A(o.status === 404 ? "not-found" : "http", I(s) ?? `Axie #${a} lookup failed with HTTP ${o.status}.`, a, o.status);
		return L(s, a);
	} });
}
async function xe(e, t, n) {
	return (await e.resolve(t, n)).genes;
}
//#endregion
//#region src/mixer3d.ts
function z(e) {
	let t = Math.trunc(e.lodLevel);
	return Object.freeze({
		...C,
		requestedLod: t
	});
}
function B(e) {
	let t = e.extensions;
	return {
		descriptor: e.descriptor,
		quality: t?.quality ?? e.quality ?? C,
		artMode: t?.artMode ?? e.artMode ?? "faithful",
		strict: t?.strict ?? e.strict ?? !1,
		animationSet: t?.animationSet ?? e.animationSet,
		signal: e.signal,
		onProgress: e.onProgress
	};
}
function V(e) {
	let t = e.parts.map((e) => ({ ...e }));
	return t.forEach((e) => {
		let t = { ...e };
		t.skin = +(t.skin === 1 && t.variant === 2), t.level = 1;
	}), {
		...e,
		parts: t
	};
}
function H(e) {
	for (let t = e.addonRuntimes.length - 1; t >= 0; --t) e.addonRuntimes[t].dispose();
	e.ownedMaterials.forEach((e) => e.dispose());
	for (let t = e.leases.length - 1; t >= 0; --t) e.leases[t].release();
	e.wrapper.removeFromParent(), e.wrapper.clear();
}
var Se = class {
	manifest;
	genes;
	axieResolver;
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	#o = /* @__PURE__ */ new Set();
	#s = !1;
	constructor(e) {
		this.manifest = e.manifest, this.genes = e.genes ?? se, this.axieResolver = e.axieResolver ?? R(), this.#e = e.planBuilder ?? O, this.#i = e.onDiagnostic;
		let t = e.assetStoreOptions?.onDiagnostic;
		if (this.#t = e.assetStore ?? new h({
			...e.assetStoreOptions,
			onDiagnostic: (n) => {
				t?.(n), e.onDiagnostic?.(n);
			}
		}), this.#r = !e.assetStore || e.disposeSuppliedAssetStore === !0, this.#n = e.assembler ?? new f({
			manifest: this.manifest,
			assets: this.#t,
			materials: e.materialFactory,
			addons: e.extensions?.addons ?? e.addons,
			animations: e.animationLoader,
			onDiagnostic: e.onDiagnostic
		}), e.registerAsDefaultCharacterFactory === !0) {
			let e = new w({
				lodLevel: C.requestedLod,
				useMaterialPropertyBlocks: !1,
				partLayerOverrides: []
			});
			this.#a = le.InstallDefaultFactory({
				createFromDescriptor: async (t, n) => {
					let r = V(t), i = e.Merge(n);
					return this.manifest.assets.bodies[r.body] ? this.#c({
						descriptor: r,
						quality: z(i),
						artMode: "faithful",
						animationSet: "full"
					}, i) : (this.#i?.({
						severity: "error",
						code: "body-missing",
						message: `Cannot find body ${r.body}.`,
						assetId: r.body
					}), null);
				},
				createFromGenes: async (t, n) => {
					let r = V(this.decodeGenes(t).descriptor), i = e.Merge(n);
					return this.manifest.assets.bodies[r.body] ? this.#c({
						descriptor: r,
						quality: z(i),
						artMode: "faithful",
						animationSet: "full"
					}, i) : (this.#i?.({
						severity: "error",
						code: "body-missing",
						message: `Cannot find body ${r.body}.`,
						assetId: r.body
					}), null);
				}
			});
		}
	}
	plan(e) {
		this.#u();
		let t = B(e);
		return this.#l(t);
	}
	create(e) {
		return this.#c(e);
	}
	async #c(e, t) {
		this.#u();
		let n = B(e), r = this.#l(n), i = t ?? new w({
			lodLevel: r.quality.requestedLod,
			useMaterialPropertyBlocks: !1,
			partLayerOverrides: []
		}), a = await this.#n.assemble(r, n, { useMaterialPropertyBlocks: i.useMaterialPropertyBlocks });
		if (this.#s) throw H(a), Error("Axie mixer was disposed during character creation.");
		try {
			let e = new le(a, r, i, {
				manifest: this.manifest,
				assets: this.#t,
				onDiagnostic: this.#i,
				onDispose: (e) => {
					this.#o.delete(e);
				}
			});
			return this.#o.add(e), e;
		} catch (e) {
			throw H(a), e;
		}
	}
	createFromGenes(e) {
		this.#u();
		let t = this.genes.decode(e.genes), { genes: n, ...r } = e;
		return this.#c({
			...r,
			descriptor: t.descriptor
		});
	}
	resolveAxieId(e) {
		return this.#u(), (e.resolver ?? this.axieResolver).resolve(e.axieId, { signal: e.signal });
	}
	async createFromAxieId(e) {
		this.#u();
		let t = await (e.resolver ?? this.axieResolver).resolve(e.axieId, { signal: e.signal });
		this.#u();
		let { axieId: n, resolver: r, ...i } = e;
		return this.createFromGenes({
			...i,
			genes: t.genes
		});
	}
	decodeGenes(e) {
		return this.#u(), this.genes.decode(e);
	}
	cacheDiagnostics() {
		return this.#t.diagnostics();
	}
	clearCache() {
		this.#u(), this.#n.clearCache?.(), this.#t.evictUnused(0);
	}
	#l(e) {
		e.onProgress?.({
			stage: "plan",
			completed: 0,
			total: 1
		});
		let t = this.#e.build(this.manifest, e);
		return e.onProgress?.({
			stage: "plan",
			completed: 1,
			total: 1,
			assetId: t.key
		}), t;
	}
	dispose() {
		this.#s || (this.#s = !0, this.#a?.(), [...this.#o].forEach((e) => e.dispose()), this.#o.clear(), this.#n.clearCache?.(), this.#r && this.#t.dispose());
	}
	#u() {
		if (this.#s) throw Error("Axie mixer is disposed.");
	}
}, Ce = "/assets/axie/", we = "public-content-v1";
function Te(e) {
	let t = e.trim();
	if (!t) throw TypeError("Axie assetBaseUrl cannot be empty.");
	return t.endsWith("/") ? t : `${t}/`;
}
function U(e = {}) {
	let t = Te(e.assetBaseUrl ?? "/assets/axie/"), n = (n, r) => {
		let i = n;
		if (r && !n.startsWith("/") && !/^[a-z][a-z\d+.-]*:/iu.test(n)) try {
			i = new URL(n, r).toString();
		} catch {
			let e = r.lastIndexOf("/");
			i = e >= 0 ? `${r.slice(0, e + 1)}${n}` : n;
		}
		let a = i.startsWith("/assets/axie/") ? `${t}${i.slice(13)}` : i;
		return e.resolveAssetUrl?.(a) ?? a;
	};
	return Object.freeze({
		baseUrl: t,
		manifestUrl: n(`${Ce}manifest.json`),
		resolve: n
	});
}
//#endregion
//#region src/load.ts
function W(e) {
	return !!e && typeof e == "object" && !Array.isArray(e);
}
function Ee(e) {
	return W(e) ? Object.keys(e).length : -1;
}
var De = /^[0-9a-f]{64}$/u, Oe = Object.freeze({
	Axe: Object.freeze({
		sampleOrder: 0,
		attach: "right",
		mirrorLeft: !1
	}),
	Bow: Object.freeze({
		sampleOrder: 1,
		attach: "left",
		mirrorLeft: !1
	}),
	Cannon: Object.freeze({
		sampleOrder: 2,
		attach: "right",
		mirrorLeft: !1
	}),
	Flag: Object.freeze({
		sampleOrder: 3,
		attach: "right",
		mirrorLeft: !1
	}),
	Gauntlet: Object.freeze({
		sampleOrder: 4,
		attach: "both",
		mirrorLeft: !0
	}),
	Mala: Object.freeze({
		sampleOrder: 5,
		attach: "right",
		mirrorLeft: !1
	}),
	Staff: Object.freeze({
		sampleOrder: 6,
		attach: "right",
		mirrorLeft: !1
	}),
	Sword: Object.freeze({
		sampleOrder: 7,
		attach: "right",
		mirrorLeft: !1
	}),
	Tome: Object.freeze({
		sampleOrder: 8,
		attach: "right",
		mirrorLeft: !1
	})
}), ke = Object.freeze(Object.keys(Oe)), Ae = /* @__PURE__ */ new Set([
	"Flag",
	"Talisman",
	"Tome"
]), je = Object.freeze([
	"Idle",
	"Walk",
	"Run",
	"Attack",
	"Skill"
]), Me = /* @__PURE__ */ new Set([
	"Idle",
	"Walk",
	"Run"
]), Ne = /* @__PURE__ */ new Set([
	"unity-sample-rig",
	"expanded-rigid",
	"source-static"
]), Pe = new Set(l), Fe = /* @__PURE__ */ new Set(["unity-source-local-v1", "target-glb-local-v1"]);
function G(e, t) {
	if (typeof e != "string" || e.length === 0) throw TypeError(`${t} must be a non-empty string.`);
	return e;
}
function K(e, t) {
	let n = G(e, t);
	if (!De.test(n)) throw TypeError(`${t} must be a lowercase SHA-256 hash.`);
	return n;
}
function q(e, t, n = {}) {
	if (!Array.isArray(e)) throw TypeError(`${t} must be an array.`);
	if (!n.allowEmpty && e.length === 0) throw TypeError(`${t} must not be empty.`);
	let r = [], i = /* @__PURE__ */ new Set();
	for (let a of e) {
		let e = G(a, `${t} entry`);
		if (i.has(e)) throw TypeError(`${t} repeats ${e}.`);
		if (n.allowed && !n.allowed.has(e)) throw TypeError(`${t} contains unsupported value ${e}.`);
		i.add(e), r.push(e);
	}
	return r;
}
function J(e, t, n = !1) {
	return q(e, t, {
		allowEmpty: n,
		allowed: Pe
	});
}
function Y(e, t) {
	if (!Number.isInteger(e) || e < 0) throw TypeError(`${t} must be a non-negative integer.`);
	return e;
}
function X(e, t) {
	let n = G(e, t);
	if (!n.startsWith("/assets/axie/weapons/") || !n.endsWith(".glb") || n.includes("..") || n.includes("%") || n.includes("\\") || n.includes("?") || n.includes("#")) throw TypeError(`${t} must be a portable Axie weapon GLB URL.`);
	return n;
}
function Ie(e, t, n, r) {
	for (let i of t) {
		let t = e[i];
		if (!W(t)) throw TypeError(`${r} references missing body ${i}.`);
		if (t.weaponAttachNodes !== void 0 && !W(t.weaponAttachNodes)) throw TypeError(`${r} body ${i} has malformed weapon socket metadata.`);
		if (!W(t.weaponAttachNodes)) {
			if (typeof t.restPoseUrl == "string" && t.restPoseUrl.length > 0) throw TypeError(`${r} body ${i} has no weapon socket metadata.`);
			continue;
		}
		for (let e of n) {
			let n = t.weaponAttachNodes[e];
			if (n === void 0 && typeof t.restPoseUrl == "string" && t.restPoseUrl.length > 0) throw TypeError(`${r} body ${i} has no ${e} weapon socket.`);
			n !== void 0 && G(n, `${r} ${i} ${e} weapon socket`);
		}
	}
}
function Le(e) {
	if (!W(e.animations)) return [];
	let t = [];
	for (let n of Object.values(e.animations)) if (!(!W(n) || !Array.isArray(n.clips))) for (let e of n.clips) W(e) && typeof e.sourceName == "string" && t.push(e.sourceName);
	return t;
}
function Re(e) {
	if (!W(e.bodies)) throw TypeError("Axie manifest is missing its body catalog.");
	for (let t of l) {
		let n = e.bodies[t];
		if (!W(n) || !W(n.animations)) throw TypeError(`Axie manifest body ${t} is missing animation bundles.`);
		for (let e of ["lite", "full"]) {
			let r = n.animations[e], i = `Axie manifest body ${t} ${e} animation bundle`;
			if (!W(r)) throw TypeError(`${i} is required.`);
			if (r.set !== e) throw TypeError(`${i} set must be ${e}.`);
			if (!Fe.has(String(r.coordinateSpace))) throw TypeError(`${i} has unsupported coordinateSpace ${String(r.coordinateSpace)}.`);
			if (G(r.url, `${i} URL`) !== `/assets/axie/animations/${t}/${e}/index.json`) throw TypeError(`${i} URL must target its canonical index.`);
			if (K(r.contentHash, `${i} contentHash`), !Array.isArray(r.clips) || r.clips.length === 0) throw TypeError(`${i} clips must be a non-empty array.`);
			for (let [e, t] of r.clips.entries()) {
				if (!W(t)) throw TypeError(`${i} clip ${e} must be an object.`);
				G(t.sourceName, `${i} clip ${e} sourceName`), G(t.runtimeName, `${i} clip ${e} runtimeName`), K(t.contentHash, `${i} clip ${e} contentHash`);
			}
		}
	}
}
function Z(e, t, n) {
	let r = [...e].sort(), i = [...t].sort();
	if (r.length !== i.length || r.some((e, t) => e !== i[t])) throw TypeError(`${n} does not match the weapon catalog.`);
}
function Q(e, t) {
	if (!W(e)) throw TypeError(`${t} must be an object.`);
	G(e.path, `${t} path`), K(e.sha256, `${t} sha256`);
}
function ze(e, t) {
	let n = "Axie manifest latest Unity weapon source provenance";
	if (!W(e)) throw TypeError(`${n} is required.`);
	if (e.schemaVersion !== 1) throw TypeError(`${n} schemaVersion must be 1.`);
	if (G(e.generatedBy, `${n} generatedBy`), K(e.contentHash, `${n} contentHash`), !W(e.sourceCatalog)) throw TypeError(`${n} sourceCatalog must be an object.`);
	if (G(e.sourceCatalog.path, `${n} sourceCatalog path`), K(e.sourceCatalog.fileSha256, `${n} sourceCatalog fileSha256`), K(e.sourceCatalog.contentHash, `${n} sourceCatalog contentHash`), G(e.sourceCatalog.snapshot, `${n} sourceCatalog snapshot`), !W(e.sourceCatalog.sourceArchives)) throw TypeError(`${n} sourceCatalog sourceArchives must be an object.`);
	let r = Object.keys(e.sourceCatalog.sourceArchives).sort();
	if (r.length !== 2 || r[0] !== "body" || r[1] !== "weapon") throw TypeError(`${n} sourceCatalog sourceArchives must contain exactly body and weapon.`);
	for (let t of r) {
		let r = e.sourceCatalog.sourceArchives[t];
		if (!W(r)) throw TypeError(`${n} source archive ${t} must be an object.`);
		G(r.fileName, `${n} source archive ${t} fileName`), Y(r.bytes, `${n} source archive ${t} bytes`), K(r.sha256, `${n} source archive ${t} sha256`);
	}
	if (!Array.isArray(e.conversionReports) || e.conversionReports.length === 0) throw TypeError(`${n} conversionReports must be a non-empty array.`);
	if (e.conversionReports.forEach((e, t) => Q(e, `${n} conversion report ${t}`)), Object.hasOwn(e, "flagSkillReport")) throw TypeError(`${n} must not promote a derived paired Flag animation.`);
	if (Q(e.attachmentConfig, `${n} attachmentConfig`), Q(e.inputManifest, `${n} inputManifest`), !W(e.coverage)) throw TypeError(`${n} coverage must be an object.`);
	let i = q(e.coverage.riggedFamilies, `${n} coverage riggedFamilies`, { allowEmpty: !0 }), a = q(e.coverage.staticFamilies, `${n} coverage staticFamilies`, { allowEmpty: !0 }), o = Y(e.coverage.totalFamilies, `${n} coverage totalFamilies`), s = Y(e.coverage.totalVariants, `${n} coverage totalVariants`);
	if (Object.hasOwn(e.coverage, "pairedActions") || Object.hasOwn(e.coverage, "actionInstanceRules")) throw TypeError(`${n} coverage must not claim inferred paired actions or action-instance rules.`);
	if (!W(e.generated)) throw TypeError(`${n} generated must be an object.`);
	let c = q(e.generated.familyIds, `${n} generated familyIds`), l = q(e.generated.variantIds, `${n} generated variantIds`), u = q(e.generated.urls, `${n} generated URLs`);
	u.forEach((e, t) => X(e, `${n} generated URL ${t}`));
	let d = q(e.generated.contentHashes, `${n} generated contentHashes`);
	d.forEach((e, t) => K(e, `${n} generated contentHash ${t}`));
	let f = Object.entries(t), p = f.flatMap(([, e]) => W(e) && Array.isArray(e.variants) ? e.variants : []).filter(W), m = f.map(([e]) => e), h = p.map((e) => G(e.id, `${n} catalog variant id`)), g = p.map((e) => G(e.url, `${n} catalog variant URL`)), _ = p.map((e) => K(e.contentHash, `${n} catalog variant contentHash`));
	Z(c, m, `${n} generated familyIds`), Z(l, h, `${n} generated variantIds`), Z(u, g, `${n} generated URLs`), Z(d, _, `${n} generated contentHashes`);
	let v = f.filter(([, e]) => W(e) && e.sourceKind !== "source-static").map(([e]) => e), y = f.filter(([, e]) => W(e) && e.sourceKind === "source-static").map(([e]) => e);
	if (Z(i, v, `${n} coverage riggedFamilies`), Z(a, y, `${n} coverage staticFamilies`), o !== f.length) throw TypeError(`${n} coverage totalFamilies does not match the weapon catalog.`);
	if (s !== p.length) throw TypeError(`${n} coverage totalVariants does not match the weapon catalog.`);
}
function Be(e) {
	if (!W(e.weapons) || !W(e.bodies)) throw TypeError("Axie manifest is missing weapon or body catalogs.");
	let t = e.weapons, n = Object.keys(t), r = ke.filter((e) => !Object.prototype.hasOwnProperty.call(t, e));
	if (r.length > 0) throw TypeError(`Axie manifest is missing official Unity AnimatorSample weapon${r.length === 1 ? "" : "s"} ${r.join(", ")}.`);
	let i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set();
	for (let r of n) {
		let n = t[r];
		if (!W(n)) throw TypeError(`Weapon family ${r} must be an object.`);
		let c = `Weapon family ${r}`, l = G(n.id, `${c} id`);
		if (l !== r) throw TypeError(`${c} id must match its catalog key.`);
		if (i.has(l)) throw TypeError(`Weapon family id ${l} is duplicated.`);
		i.add(l);
		let u = X(n.url, `${c} URL`);
		if (a.has(u)) throw TypeError(`Weapon family URL ${u} is duplicated.`);
		a.add(u), G(n.label, `${c} label`);
		let d = G(n.animationPrefix, `${c} animationPrefix`), f = q(n.clipPrefixes, `${c} clipPrefixes`);
		if (G(n.sourceFile, `${c} sourceFile`), G(n.textureSourceFile, `${c} textureSourceFile`), K(n.sourceSha256, `${c} sourceSha256`), K(n.textureSha256, `${c} textureSha256`), K(n.contentHash, `${c} contentHash`), typeof n.textureEmbedded != "boolean") throw TypeError(`${c} textureEmbedded must be boolean.`);
		q(n.meshNames, `${c} meshNames`);
		let p = Y(n.armatureCount, `${c} armatureCount`);
		Y(n.sourceClipCount, `${c} sourceClipCount`);
		let m = G(n.sourceKind, `${c} sourceKind`);
		if (!Ne.has(m)) throw TypeError(`${c} has unsupported sourceKind ${m}.`);
		if (m === "unity-sample-rig" && p === 0) throw TypeError(`${c} unity-sample-rig must contain an armature.`);
		if ((m === "expanded-rigid" || m === "source-static") && p !== 0) throw TypeError(`${c} ${m} must remain armature-free.`);
		if (n.attach !== "left" && n.attach !== "right" && n.attach !== "both") throw TypeError(`${c} has unsupported attachment side ${String(n.attach)}.`);
		if (typeof n.mirrorLeft != "boolean") throw TypeError(`${c} mirrorLeft must be boolean.`);
		if (n.locomotionStyle !== "controller" && n.locomotionStyle !== "action") throw TypeError(`${c} has unsupported locomotionStyle ${String(n.locomotionStyle)}.`);
		if (Object.hasOwn(n, "actionInstances")) throw TypeError(`${c} must not expose inferred action-instance rules.`);
		if (Ae.has(r)) {
			if (!W(n.pairedAnimations) || n.pairedAnimations.schemaVersion !== 1) throw TypeError(`${c} must declare its exact source pairedAnimations.`);
			if (!W(n.pairedAnimations.clips)) throw TypeError(`${c} pairedAnimations clips must be an object.`);
			let e = Object.keys(n.pairedAnimations.clips).sort(), t = [...je].sort();
			if (e.length !== t.length || e.some((e, n) => e !== t[n])) throw TypeError(`${c} pairedAnimations must contain exactly ${t.join(", ")}.`);
			for (let e of je) {
				let t = n.pairedAnimations.clips[e], r = `${c} paired animation ${e}`;
				if (!W(t)) throw TypeError(`${r} must be an object.`);
				if (X(t.url, `${r} URL`), K(t.contentHash, `${r} contentHash`), G(t.sourceFile, `${r} sourceFile`), K(t.sourceSha256, `${r} sourceSha256`), typeof t.duration != "number" || !Number.isFinite(t.duration) || t.duration <= 0) throw TypeError(`${r} duration must be finite and positive.`);
				if (t.looping !== Me.has(e)) throw TypeError(`${r} looping does not match the source controller state.`);
				q(t.requiredBones, `${r} requiredBones`), q(t.animatedBones, `${r} animatedBones`);
			}
		} else if (n.pairedAnimations !== void 0) throw TypeError(`${c} has no source-authored weapon-local animation and must not declare pairedAnimations.`);
		n.sampleOrder !== null && Y(n.sampleOrder, `${c} sampleOrder`);
		let h = J(n.supportedBodyIds, `${c} supportedBodyIds`, !0), g = n.attach === "both" ? ["left", "right"] : [n.attach], _ = Oe[r];
		if (_) {
			if (m !== "unity-sample-rig") throw TypeError(`${c} official Unity sample sourceKind must be unity-sample-rig.`);
			if (u !== `/assets/axie/weapons/${r}.glb`) throw TypeError(`${c} official Unity sample URL must reference its base prefab GLB.`);
			if (n.sampleOrder !== _.sampleOrder) throw TypeError(`${c} official Unity sampleOrder must be ${_.sampleOrder}.`);
			if (n.attach !== _.attach || n.mirrorLeft !== _.mirrorLeft) throw TypeError(`${c} official Unity sample attachment must be ${_.attach}${_.mirrorLeft ? " with mirrored left instance" : ""}.`);
			if (d !== r || n.locomotionStyle !== "controller") throw TypeError(`${c} official Unity sample must use the exact ${r} controller overrides.`);
			if (!h.includes("normal")) throw TypeError(`${c} must retain the Normal clips used by the official Unity sample.`);
		} else if (n.sampleOrder !== null) throw TypeError(`${c} is source inventory only and must not claim an AnimatorSample order.`);
		Ie(e.bodies, h, g, c);
		for (let t of h) {
			let n = e.bodies[t];
			if (!(W(n) && Le(n).some((e) => e === d || e.startsWith(`${d}.`) || f.some((t) => e.startsWith(t))))) throw TypeError(`${c} body ${t} has no clip matching its animationPrefix or clipPrefixes.`);
		}
		if (!Array.isArray(n.variants) || n.variants.length === 0) throw TypeError(`${c} must declare source-authored variants.`);
		let v = G(n.defaultVariantId, `${c} defaultVariantId`), y = /* @__PURE__ */ new Set(), b;
		for (let t of n.variants) {
			if (!W(t)) throw TypeError(`${c} variant must be an object.`);
			let n = G(t.id, `${c} variant id`), r = `${c} variant ${n}`;
			if (Object.hasOwn(t, "animations")) throw TypeError(`${r} must not expose an inferred paired animation.`);
			let i = n.toLowerCase();
			if (y.has(n) || o.has(i)) throw TypeError(`Weapon variant id ${n} is duplicated.`);
			y.add(n), o.add(i);
			let a = X(t.url, `${r} URL`);
			if (s.has(a)) throw TypeError(`Weapon variant URL ${a} is duplicated.`);
			s.add(a), K(t.contentHash, `${r} contentHash`), G(t.sourceFile, `${r} sourceFile`), K(t.sourceSha256, `${r} sourceSha256`), G(t.textureSourceFile, `${r} textureSourceFile`), K(t.textureSha256, `${r} textureSha256`), q(t.meshNames, `${r} meshNames`);
			let l = J(t.supportedBodyIds, `${r} supportedBodyIds`, !0);
			n === v && (b = l), Ie(e.bodies, l, g, r);
			let u = Y(t.armatureCount, `${r} armatureCount`), d = u > 0 ? q(t.requiredBones, `${r} requiredBones`) : q(t.requiredBones ?? [], `${r} requiredBones`, { allowEmpty: !0 });
			if (u > 0) K(t.skeletonSignature, `${r} skeletonSignature`);
			else if (t.skeletonSignature !== void 0 || d.length > 0) throw TypeError(`${r} armature-free payload must not claim a skeleton or required bones.`);
			if (m === "source-static" && u !== 0) throw TypeError(`${r} source-static payload must remain armature-free.`);
			if (t.level !== void 0 && (typeof t.level != "number" || !Number.isInteger(t.level) || t.level <= 0)) throw TypeError(`${r} level must be a positive integer.`);
			if (t.outlineMode !== void 0 && t.outlineMode !== "outline" && t.outlineMode !== "no-outline") throw TypeError(`${r} has unsupported outlineMode ${String(t.outlineMode)}.`);
		}
		if (!y.has(v)) throw TypeError(`${c} defaultVariantId ${v} does not resolve to a declared variant.`);
		let x = h.filter((e) => !b?.includes(e));
		if (x.length > 0) throw TypeError(`${c} default variant must support every family body; missing ${x.join(", ")}.`);
	}
}
function $(e, t = {}) {
	if (!W(e)) throw TypeError("Axie manifest must be an object.");
	if (e.schemaVersion !== 2) throw TypeError(`Unsupported Axie manifest schema ${String(e.schemaVersion)}.`);
	if (!W(e.source) || typeof e.source.commit != "string") throw TypeError("Axie manifest is missing its source identity.");
	let n = t.expectedSourceCommit ?? "public-content-v1";
	if ((t.mode ?? "source-pinned") === "source-pinned" && e.source.commit !== n) throw TypeError(`Axie manifest source commit ${e.source.commit} does not match ${n}.`);
	if (!W(e.assets) || !W(e.creator)) throw TypeError("Axie manifest is missing assets or creator catalogs.");
	if (!W(e.source.finalUnityParity) || !W(e.source.finalUnityStandardParity)) throw TypeError("Axie manifest is missing its final art-team source provenance.");
	let r = Object.freeze({
		bodies: 8,
		parts: 576,
		textures: 1088,
		materials: 1001,
		shaders: 13,
		addons: 46
	});
	for (let [t, n] of Object.entries(r)) {
		let r = Ee(e.assets[t]);
		if (r !== n) throw TypeError(`Axie manifest expected ${n} ${t}; received ${r}.`);
	}
	if (!Array.isArray(e.creator.colorVariants) || e.creator.colorVariants.length !== 67) throw TypeError("Axie manifest must expose all 67 source color variants.");
	if (!Array.isArray(e.creator.bodyIds) || e.creator.bodyIds.length !== 8) throw TypeError("Axie manifest must expose all eight source bodies.");
	let i = J(e.creator.bodyIds, "Axie creator bodyIds");
	if (l.some((e) => !i.includes(e))) throw TypeError("Axie manifest must expose each canonical source body exactly once.");
	Re(e.assets), Be(e.assets), ze(e.source.latestUnityWeaponParity, e.assets.weapons);
}
async function Ve(e = {}) {
	let t = U(e), n = e.manifestUrl ?? t.manifestUrl, r = await (e.fetcher ?? fetch)(n, { signal: e.signal });
	if (!r.ok) throw Error(`Could not load Axie manifest ${n}: HTTP ${r.status}.`);
	let i = await r.json();
	return $(i, e), i;
}
async function He(e = {}) {
	let t = U(e), n = e.manifest ?? await Ve({
		...e,
		manifestUrl: e.manifestUrl ?? t.manifestUrl
	});
	$(n, e);
	let r = e.fetcher ?? fetch, i = new p({
		resolveUrl: t.resolve,
		fetchJson: async (e, t) => {
			let n = await r(e, { signal: t });
			if (!n.ok) throw Error(`Could not load Axie animation ${e}: HTTP ${n.status}.`);
			return n.json();
		},
		fetchArrayBuffer: async (e, t) => {
			let n = await r(e, { signal: t });
			if (!n.ok) throw Error(`Could not load Axie animation ${e}: HTTP ${n.status}.`);
			return n.arrayBuffer();
		},
		onDiagnostic: e.onDiagnostic
	});
	return new Se({
		manifest: n,
		genes: e.genes,
		planBuilder: e.planBuilder,
		assetStore: e.assetStore,
		materialFactory: e.materialFactory,
		addons: e.addons,
		assembler: e.assembler,
		onDiagnostic: e.onDiagnostic,
		disposeSuppliedAssetStore: e.disposeSuppliedAssetStore,
		registerAsDefaultCharacterFactory: e.registerAsDefaultCharacterFactory ?? !1,
		animationLoader: i,
		assetStoreOptions: {
			renderer: e.renderer,
			fetcher: (e) => r(e),
			maxUnusedEntries: e.maxUnusedEntries,
			preferRawUnityS3tc: e.preferRawUnityS3tc,
			resolveUrl: t.resolve,
			onDiagnostic: e.onDiagnostic
		}
	});
}
//#endregion
export { l as AXIE_BODY_TYPES, Ce as AXIE_CANONICAL_ASSET_PREFIX, se as AXIE_GENES_DECODER, a as AXIE_GENE_CLASSES, s as AXIE_GENE_PART_ORDER, d as AXIE_MANIFEST_SCHEMA_VERSION, k as AXIE_PART_SLOTS, r as AXIE_PART_TYPES, e as AXIE_PART_TYPE_SOURCE_NAMES, we as AXIE_PINNED_SOURCE_COMMIT, O as AXIE_PLAN_BUILDER, oe as AXIE_QUALITY_IDS, y as AXIE_QUALITY_PROFILES, o as AXIE_RESOURCE_CLASSES, c as AXIE_RIG_TO_PART_TYPE, t as AXIE_RIG_TYPES, ue as AXIE_SOURCE_ART_MODE, ne as AXIE_STRICT_GENES_DECODER, C as AXIE_UNITY_COMPATIBILITY_QUALITY, ce as AXIE_UNITY_COMPATIBILITY_QUALITY_ID, b as AXIE_UNITY_LOD_LEVELS, x as AXIE_WEB_EXTENSION_QUALITY_IDS, ie as AXIE_WEB_EXTENSION_QUALITY_PROFILES, g as AxieAmbientGazePlanner, ae as AxieGenesValidationError, A as AxieLookupError, T as AxieMixPlanError, me as DeterministicAxiePlanBuilder, Se as ThreeAxieMixer3D, ee as UnityAxieGenesDecoder, m as clampAxieEyeGaze, U as createAxieAssetLocator, He as createAxieMixer3D, R as createHttpAxieResolver, v as decodeAxieGenes, i as formatAxieAddonId, u as formatAxieDescriptorKey, n as formatAxiePartAssetId, _e as isValidAxieId, Ve as loadAxieManifest, re as normalizeAxieGenes, M as normalizeAxieId, L as parseAxieLookup, te as resolveAxieBodyLodIndex, _ as resolveAxieBodyRestReferenceBody, xe as resolveAxieGenes, S as resolveAxiePartLodIndex, $ as validateAxieMixerManifest };

//# sourceMappingURL=index.js.map