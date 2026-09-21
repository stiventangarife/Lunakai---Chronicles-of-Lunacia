import { a as e, o as t } from "./base-v4-runtime-DEyM9kgm.js";
import * as n from "three";
import { clone as r } from "three/examples/jsm/utils/SkeletonUtils.js";
import { GLTFLoader as i } from "three/examples/jsm/loaders/GLTFLoader.js";
//#region src/manifest.ts
var a = 2;
function o(e, t) {
	if ((e.coordinateSpace ?? "part-export") !== "body-rest") throw Error(`Axie part ${t} is not body-rest geometry.`);
	if (!e.bodyRestReferenceBody) throw Error(`Axie body-rest part ${t} has no source reference body.`);
	return e.bodyRestReferenceBody;
}
//#endregion
//#region src/addon-basis.ts
var s = new n.Matrix4().makeScale(-1, 1, 1);
function c(e) {
	return new n.Matrix4().compose(new n.Vector3(...e.position), new n.Quaternion(...e.quaternion).normalize(), new n.Vector3(...e.scale));
}
function l(e, t) {
	let n = 0;
	for (let r = 0; r < 16; r += 1) n = Math.max(n, Math.abs(e.elements[r] - t.elements[r]));
	return n;
}
function u(e, t) {
	for (let n = e; n; n = n.parent) if (n === t) return !0;
	return !1;
}
function d(e) {
	let t = [...e.transforms].sort((e, t) => {
		let n = (e) => e ? e.split("/").length : 0;
		return n(e.path) - n(t.path) || e.path.localeCompare(t.path);
	}), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map();
	return t.forEach((e) => {
		if (r.has(e.path)) throw Error(`Axie rest pose repeats path ${e.path}.`);
		let t = e.path === "" ? new n.Matrix4() : r.get(e.parentPath);
		if (!t) throw Error(`Axie rest pose cannot resolve parent ${e.parentPath} for ${e.path}.`);
		r.set(e.path, t.clone().multiply(c(e)));
		let a = i.get(e.name) ?? [];
		a.push(e), i.set(e.name, a);
	}), {
		worlds: r,
		byName: i
	};
}
function f(e, t) {
	let { worlds: n, byName: r } = d(e), i = r.get(t) ?? [];
	if (i.length !== 1) throw Error(`Axie rest pose expected one ${t}; found ${i.length}.`);
	let a = i[0];
	return {
		matrix: n.get(a.path).clone(),
		sourcePath: a.path
	};
}
function p(e, t) {
	let n = f(e, t);
	return {
		matrix: s.clone().multiply(n.matrix).multiply(s),
		sourcePath: n.sourcePath
	};
}
function m(e, t, r, i = 100) {
	if (e.name !== t.rootName) throw Error(`Axie add-on basis expects root ${t.rootName}; received ${e.name}.`);
	if (!u(r, e)) throw Error(`Axie add-on attach node ${r.name} is outside body root ${e.name}.`);
	if (!Number.isFinite(i) || i <= 0) throw Error(`Axie add-on factory unit scale is invalid: ${i}.`);
	let a = p(t, r.name);
	e.updateWorldMatrix(!0, !0);
	let o = (e.parent ? e.parent.matrixWorld.clone().invert() : new n.Matrix4()).multiply(r.matrixWorld), s = a.matrix, c = o.clone().invert().multiply(s), d = c.clone().multiply(new n.Matrix4().makeScale(1 / i, 1 / i, 1 / i)), f = l(o.clone().multiply(c), s);
	if (!Number.isFinite(f) || f > 1e-5) throw Error(`Axie add-on basis for ${r.name} failed reconstruction (${f}).`);
	return {
		bridgeMatrix: c,
		factoryCorrectionMatrix: d,
		sourcePath: a.sourcePath,
		reconstructionError: f
	};
}
//#endregion
//#region src/part-basis.ts
var h = new n.Matrix4().makeScale(-1, 1, 1);
function g(e, t) {
	let n = 0;
	for (let r = 0; r < 16; r += 1) n = Math.max(n, Math.abs(e.elements[r] - t.elements[r]));
	return n;
}
function _(e, t) {
	for (let n = e; n; n = n.parent) if (n === t) return !0;
	return !1;
}
function v(e) {
	let t = e;
	for (; t.parent;) t = t.parent;
	return t;
}
function ee(e, t, r = 100) {
	if (!_(t, e)) throw Error(`Axie socket-local part node ${t.name} is outside its source GLB root.`);
	if (!Number.isFinite(r) || r <= 0) throw Error(`Axie socket-local part ${t.name} has invalid object units per meter ${r}.`);
	t.updateMatrix();
	let i = new n.Matrix4(), a = g(t.matrix, i);
	if (!Number.isFinite(a) || a > 1e-7) throw Error(`Axie socket-local part ${t.name} is not identity-local (${a}).`);
	return {
		localMatrix: i,
		sourceObjectUnitScale: r,
		unityObjectFromGeometry: new n.Matrix4(),
		sourcePath: `socket-local:${t.name}`,
		reconstructionError: a
	};
}
function y(e) {
	let t = e.elements, n = [
		Math.hypot(t[0], t[1], t[2]),
		Math.hypot(t[4], t[5], t[6]),
		Math.hypot(t[8], t[9], t[10])
	], r = Math.min(...n), i = Math.max(...n);
	if (!Number.isFinite(r) || r <= 0 || i / r > 1.00001) throw Error(`Axie standalone part export basis must have a finite uniform scale; received ${n.join(", ")}.`);
	return 1 / Math.cbrt(n[0] * n[1] * n[2]);
}
function te(e, t, r, i, a) {
	if (!_(r, e)) throw Error(`Axie part attach node ${r.name} is outside body root ${e.name}.`);
	if (!_(a, i)) throw Error(`Axie part node ${a.name} is outside its source GLB root.`);
	let o = t.transforms.filter((e) => e.name === r.name);
	if (o.length !== 1) throw Error(`Axie rest pose expected one ${r.name}; found ${o.length}.`);
	let s = o[0], c = m(e, t, r);
	i.updateWorldMatrix(!0, !0);
	let l = (i.parent ? i.parent.matrixWorld.clone().invert() : new n.Matrix4()).multiply(a.matrixWorld), u = y(l), d = h.clone().multiply(l), f = c.bridgeMatrix.clone().multiply(l), p = c.bridgeMatrix.clone().invert().multiply(f), v = Math.max(c.reconstructionError, g(p, l));
	if (!Number.isFinite(v) || v > 1e-5) throw Error(`Axie rigid part basis for ${a.name} failed reconstruction (${v}).`);
	return {
		localMatrix: f,
		partExportMatrix: l,
		attachBridgeMatrix: c.bridgeMatrix,
		sourceObjectUnitScale: u,
		unityObjectFromGeometry: d,
		sourcePath: s.path,
		reconstructionError: v
	};
}
function ne(e, t, r, i, a, o) {
	if (!_(t, e)) throw Error(`Axie body-rest attach node ${t.name} is outside body root ${e.name}.`);
	if (!_(i, r)) throw Error(`Axie body-rest part node ${i.name} is outside its source GLB root.`);
	if (!a || !o) throw Error(`Axie body-rest part ${i.name} requires authoritative source and target rest socket matrices.`);
	let s = v(e);
	s.updateWorldMatrix(!0, !0), r.updateWorldMatrix(!0, !0);
	let c = s.matrixWorld.clone().invert().multiply(t.matrixWorld), l = r.matrixWorld.clone().invert().multiply(i.matrixWorld), u = o.clone().multiply(a.clone().invert()).multiply(l), d = c.clone().invert().multiply(u), f = g(c.clone().multiply(d), u);
	if (!Number.isFinite(f) || f > 1e-5) throw Error(`Axie body-rest part basis for ${i.name} failed reconstruction (${f}).`);
	return {
		localMatrix: d,
		attachRestMatrix: c,
		referenceAttachRestMatrix: a.clone(),
		partRestMatrix: l,
		retargetedPartRestMatrix: u,
		sourceObjectUnitScale: 1,
		unityObjectFromGeometry: new n.Matrix4(),
		sourcePath: `body-rest:${i.name}`,
		reconstructionError: f
	};
}
//#endregion
//#region src/exporter-schema.ts
function b(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return t.schemaVersion === 1 && Array.isArray(t.sampleTimes) && Array.isArray(t.transformTracks) && !!t.metadata && typeof t.metadata.sourceName == "string";
}
//#endregion
//#region src/sampled-animation.ts
var x = new n.Matrix4().makeScale(-1, 1, 1), S = new n.Vector3(), C = new n.Vector3(1, 1, 1), w = 1e-5, T = Object.freeze({
	position: (e, t, n) => [
		e,
		t,
		n
	],
	quaternion: (e, t, n, r) => [
		e,
		t,
		n,
		r
	],
	scale: (e, t, n) => [
		e,
		t,
		n
	]
}), E = Object.freeze({
	position: (e, t, n) => [
		e,
		t,
		-n
	],
	quaternion: (e, t, n, r) => [
		-e,
		-t,
		n,
		r
	],
	scale: (e, t, n) => [
		e,
		t,
		n
	]
});
function D(e, t) {
	return Array.isArray(e) && e.length === t && e.every((e) => typeof e == "number" && Number.isFinite(e));
}
function O(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return t.schemaVersion === 1 && typeof t.body == "string" && typeof t.rootName == "string" && Array.isArray(t.transforms) && t.transforms.every((e) => !!e && typeof e.path == "string" && typeof e.parentPath == "string" && typeof e.name == "string" && D(e.position, 3) && D(e.quaternion, 4) && D(e.scale, 3));
}
function k() {
	return new DOMException("Axie animation load was aborted.", "AbortError");
}
function A(e) {
	if (e?.aborted) throw k();
}
function j(e, t) {
	return t ? (A(t), new Promise((n, r) => {
		let i = () => {
			a(), r(k());
		}, a = () => t.removeEventListener("abort", i);
		t.addEventListener("abort", i, { once: !0 }), e.then((e) => {
			a(), n(e);
		}, (e) => {
			a(), r(e);
		});
	})) : e;
}
async function M(e, t) {
	let n = await fetch(e, { signal: t });
	if (!n.ok) throw Error(`Could not load Axie animation ${e}: HTTP ${n.status}.`);
	return n.json();
}
async function N(e, t) {
	let n = await fetch(e, { signal: t });
	if (!n.ok) throw Error(`Could not load Axie animation ${e}: HTTP ${n.status}.`);
	return n.arrayBuffer();
}
function P(e, t) {
	e.forEach((e, n) => {
		if (!Number.isFinite(e)) throw Error(`${t}[${n}] is not finite.`);
	});
}
function F(e) {
	let t = e.sampleTimes;
	if (t.length === 0) throw Error(`${e.metadata.id} has no sample times.`);
	P(t, `${e.metadata.id}.sampleTimes`);
	for (let n = 1; n < t.length; n += 1) if (t[n] < t[n - 1]) throw Error(`${e.metadata.id} sample times are not monotonic.`);
	e.transformTracks.forEach((n) => {
		let r = `${e.metadata.id}:${n.path}`;
		if (!n.path) throw Error(`${r} has an empty Unity transform path.`);
		if (n.position.length !== t.length * 3) throw Error(`${r} has ${n.position.length} position scalars; expected ${t.length * 3}.`);
		if (n.quaternion.length !== t.length * 4) throw Error(`${r} has ${n.quaternion.length} quaternion scalars; expected ${t.length * 4}.`);
		if (n.scale.length !== t.length * 3) throw Error(`${r} has ${n.scale.length} scale scalars; expected ${t.length * 3}.`);
		P(n.position, `${r}.position`), P(n.quaternion, `${r}.quaternion`), P(n.scale, `${r}.scale`);
	});
}
function I(e, t, n) {
	let r = e;
	for (let e = n; e < t.length && r; e += 1) r = r.children.find((n) => n.name === t[e]);
	return r;
}
function L(e, t) {
	if (t === "") return e;
	let n = t.split("/");
	if (!n.some((e) => e.length === 0)) return I(e, n, 0);
}
function R(e, t) {
	let n = new Float32Array(e.length);
	for (let r = 0; r < e.length; r += 3) {
		let i = t(e[r], e[r + 1], e[r + 2]);
		n[r] = i[0], n[r + 1] = i[1], n[r + 2] = i[2];
	}
	return n;
}
function re(e, t) {
	let n = new Float32Array(e.length);
	for (let r = 0; r < e.length; r += 4) {
		let i = t(e[r], e[r + 1], e[r + 2], e[r + 3]), a = Math.hypot(i[0], i[1], i[2], i[3]);
		if (a < 1e-12) throw Error("Axie animation contains a zero-length quaternion.");
		n[r] = i[0] / a, n[r + 1] = i[1] / a, n[r + 2] = i[2] / a, n[r + 3] = i[3] / a;
	}
	return n;
}
function z(e) {
	return new n.Matrix4().compose(S, e.clone().normalize(), C);
}
function ie(e) {
	return x.clone().multiply(z(new n.Quaternion(...e.quaternion))).multiply(x);
}
function B(e) {
	let t = [
		e.scale.x,
		e.scale.y,
		e.scale.z
	], n = Math.min(...t), r = Math.max(...t);
	if (!Number.isFinite(n) || n <= 0 || r / n > 1.00001) throw Error(`Axie animation root ${e.name} must retain its finite uniform GLB exporter scale; received ${t.join(", ")}.`);
	if (e.position.length() > w) throw Error(`Axie animation root ${e.name} has a non-zero GLB exporter translation (${e.position.toArray().join(", ")}).`);
	return Math.cbrt(t[0] * t[1] * t[2]);
}
function V(e, t) {
	if (e.name !== t.rootName) throw Error(`Axie rest pose expects root ${t.rootName}; received ${e.name}.`);
	let r = [...t.transforms].sort((e, t) => {
		let n = (e) => e ? e.split("/").length : 0;
		return n(e.path) - n(t.path) || e.path.localeCompare(t.path);
	}), i = /* @__PURE__ */ new Set();
	if (r.forEach((e) => {
		if (i.has(e.path)) throw Error(`Axie rest pose repeats path ${e.path}.`);
		i.add(e.path);
	}), !i.has("")) throw Error("Axie rest pose is missing its prefab-root transform.");
	e.updateMatrixWorld(!0);
	let a = B(e), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = new n.Matrix4();
	return r.forEach((t) => {
		let r = L(e, t.path);
		if (!r) return;
		r.updateMatrix();
		let i = t.path === "" ? c : o.get(t.parentPath);
		if (!i) throw Error(`Axie rest pose cannot solve ${t.path}; parent ${t.parentPath} is unbound.`);
		let l = new n.Matrix4().extractRotation(i), u = z(r.quaternion), d = ie(t).clone().invert().multiply(l).multiply(u), f = new n.Quaternion().setFromRotationMatrix(d).normalize(), p = new n.Matrix4().compose(S, f, new n.Vector3(a, a, a));
		if (p.determinant() <= 0) throw Error(`Axie animation basis for ${t.path || e.name} changed coordinate parity.`);
		o.set(t.path, p), s.set(t.path, {
			parentInverse: i.clone().invert(),
			child: p
		});
	}), s;
}
function H(e, t) {
	let r = e.position.length / 3, i = new Float32Array(e.position.length), a = new Float32Array(e.quaternion.length), o = new Float32Array(e.scale.length), s = new n.Vector3(), c = new n.Quaternion(), l = new n.Vector3(), u = new n.Vector3(), d = new n.Quaternion(), f = new n.Vector3(), p = new n.Matrix4(), m = new n.Matrix4(), h = new n.Quaternion(), g = !1;
	for (let n = 0; n < r; n += 1) {
		let r = n * 3, _ = n * 4;
		s.fromArray(e.position, r), c.fromArray(e.quaternion, _).normalize(), l.fromArray(e.scale, r), p.compose(s, c, l), m.copy(t.parentInverse).multiply(x).multiply(p).multiply(x).multiply(t.child), m.decompose(u, d, f), d.normalize(), g && h.dot(d) < 0 && d.set(-d.x, -d.y, -d.z, -d.w), g = !0, h.copy(d), u.toArray(i, r), d.toArray(a, _), f.toArray(o, r);
	}
	return {
		position: i,
		quaternion: a,
		scale: o
	};
}
function U(e, t, r, i, a) {
	let o = a ? H(e, a) : void 0, s = t.uuid;
	return [
		new n.VectorKeyframeTrack(`${s}.position`, r, o?.position ?? R(e.position, i.position)),
		new n.QuaternionKeyframeTrack(`${s}.quaternion`, r, o?.quaternion ?? re(e.quaternion, i.quaternion)),
		new n.VectorKeyframeTrack(`${s}.scale`, r, o?.scale ?? R(e.scale, i.scale))
	];
}
function W(e, t) {
	if (e.startsWith("/") || /^[a-z][a-z\d+.-]*:/i.test(e)) return e;
	try {
		return new URL(e, t).toString();
	} catch {
		let n = t.lastIndexOf("/");
		return n >= 0 ? `${t.slice(0, n + 1)}${e}` : e;
	}
}
function G(e, t) {
	return t ? W(e, t) : e;
}
var K = "unity-source-local-v1", ae = "target-glb-local-v1";
function q(e, t) {
	if (e === void 0) return K;
	if (e === K || e === ae) return e;
	throw Error(`${t} has unsupported animation coordinate space ${String(e)}.`);
}
function oe(e) {
	if (!e || typeof e != "object") return !1;
	let t = e;
	return t.schemaVersion === 1 && typeof t.body == "string" && typeof t.set == "string" && Array.isArray(t.clips) && t.clips.every((e) => !!e && typeof e.sourceName == "string" && typeof e.runtimeName == "string" && typeof e.payloadUrl == "string");
}
function J(e, t, n) {
	if (!Number.isInteger(e.offset) || !Number.isInteger(e.length) || e.offset < 0 || e.length < 0 || e.offset + e.length > t) throw Error(`${n} points outside the AXANIM float payload.`);
}
function se(e) {
	if (e.byteLength < 12) throw Error("AXANIM payload is shorter than its fixed header.");
	let t = new Uint8Array(e);
	if (![
		65,
		88,
		65,
		78,
		73,
		77,
		49,
		0
	].every((e, n) => t[n] === e)) throw Error("AXANIM payload has an invalid magic header.");
	let n = new DataView(e).getUint32(8, !0);
	if (n === 0 || 12 + n > e.byteLength) throw Error("AXANIM JSON header length is invalid.");
	let r = JSON.parse(new TextDecoder().decode(t.subarray(12, 12 + n)));
	if (r.schemaVersion !== 1 || !Array.isArray(r.tracks)) throw Error("Unsupported AXANIM header schema.");
	let i = q(r.coordinateSpace, `AXANIM ${r.id ?? ""}`);
	if (!Number.isInteger(r.floatByteOffset) || r.floatByteOffset % 4 != 0 || !Number.isInteger(r.floatCount) || r.floatCount < 0 || r.floatByteOffset + r.floatCount * 4 !== e.byteLength) throw Error(`AXANIM ${r.id ?? ""} has an invalid Float32 payload range.`);
	if (J(r.sampleTimes, r.floatCount, `${r.id}.sampleTimes`), r.sampleTimes.length !== r.sampleCount) throw Error(`AXANIM ${r.id} sample count does not match its time span.`);
	let a = new Float32Array(e, r.floatByteOffset, r.floatCount), o = (e) => a.subarray(e.offset, e.offset + e.length), s = r.tracks.map((e) => {
		if (J(e.position, r.floatCount, `${r.id}:${e.path}.position`), J(e.quaternion, r.floatCount, `${r.id}:${e.path}.quaternion`), J(e.scale, r.floatCount, `${r.id}:${e.path}.scale`), e.position.length !== r.sampleCount * 3 || e.quaternion.length !== r.sampleCount * 4 || e.scale.length !== r.sampleCount * 3) throw Error(`AXANIM ${r.id}:${e.path} sample dimensions are invalid.`);
		return {
			path: e.path,
			position: o(e.position),
			quaternion: o(e.quaternion),
			scale: o(e.scale)
		};
	});
	return {
		schemaVersion: 1,
		metadata: {
			id: r.id,
			body: r.body,
			set: r.set,
			coordinateSpace: i,
			sourceName: r.sourceName,
			sourceAssetId: "",
			sourceAssetPath: "",
			duration: r.duration,
			sourceFrameRate: r.sourceFrameRate,
			sampleRate: r.sampleRate,
			wrapMode: r.looping ? "Loop" : "Default",
			legacy: !1,
			looping: r.looping,
			curveCount: 0,
			objectCurveCount: 0,
			eventCount: r.events?.length ?? 0,
			trackCount: s.length,
			file: "",
			contentHash: "",
			payloadHash: ""
		},
		sampleTimes: o(r.sampleTimes),
		transformTracks: s,
		curves: [],
		objectCurves: [],
		events: r.events ?? []
	};
}
function ce(e) {
	if (b(e)) return [e];
	if (Array.isArray(e) && e.every(b)) return e;
	if (e && typeof e == "object") {
		let t = e;
		if (Array.isArray(t.clips) && t.clips.every(b)) return t.clips;
	}
}
var le = class {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	#o = /* @__PURE__ */ new Map();
	#s = /* @__PURE__ */ new Map();
	constructor(e = {}) {
		this.#e = e.fetchJson ?? M, this.#t = e.fetchArrayBuffer ?? N, this.#n = e.resolveUrl ?? G, this.#r = e.coordinates ?? T, this.#i = e.onDiagnostic, this.#a = e.requireRestPoseForBinary ?? !0;
	}
	async loadClip(e, t, n, r) {
		let i = this.#n(e), a = await this.#l(i, n);
		if (!b(a)) throw Error(`${i} is not an AxieWebExporter animation payload.`);
		return this.compile([a], t, r ? /* @__PURE__ */ new Map([[a.metadata.sourceName, r]]) : void 0);
	}
	async loadRestPose(e, t, n) {
		let r = this.#n(e);
		return this.#c(r, t, n);
	}
	async #c(e, t, n) {
		let r = await this.#l(e, t);
		if (!O(r)) throw Error(`${e} is not an Axie exporter rest pose.`);
		if (n && r.body.toLowerCase() !== n.toLowerCase()) throw Error(`Rest pose ${r.body} does not match animation body ${n}.`);
		return r;
	}
	async loadBundle(e, t, n, r = [], i) {
		let a = this.#n(e), o = await this.#l(a, n), s = ce(o), c, l;
		if (!s && oe(o)) {
			let e = q(o.coordinateSpace, `AXANIM bundle ${a}`), t = i ?? o.restPoseUrl;
			if (t) l = await this.#c(this.#n(t, a), n, o.body);
			else if (this.#a) throw Error(`AXANIM bundle ${a} has no authoritative Unity rest pose; direct FBX/glTF track binding would be incorrect.`);
			c = new Map(o.clips.map((e) => [e.sourceName, e.runtimeName])), s = await Promise.all(o.clips.map(async (t) => {
				let r = this.#n(t.payloadUrl, a), i = se(await this.#u(r, n));
				if (q(i.metadata.coordinateSpace, `AXANIM payload ${r}`) !== e || i.metadata.sourceName !== t.sourceName || Math.abs(i.metadata.duration - t.duration) > 1e-4 || i.metadata.trackCount !== t.trackCount || i.metadata.looping !== t.looping) throw Error(`AXANIM payload ${r} does not match its index record.`);
				return i;
			}));
		}
		if (!s && o && typeof o == "object") {
			let e = o;
			Array.isArray(e.files) && e.files.every((e) => typeof e == "string") && (s = await Promise.all(e.files.map(async (e) => {
				let t = this.#n(e, a), r = await this.#l(t, n);
				if (!b(r)) throw Error(`${t} is not an AxieWebExporter animation payload.`);
				return r;
			})));
		}
		if (!s) throw Error(`${a} is not an Axie sampled-animation bundle or index.`);
		let u = new Map(c ?? []);
		return r.forEach((e) => u.set(e.sourceName, e.runtimeName)), this.compile(s, t, u, l);
	}
	compile(e, t, r, i) {
		let a = [], o = e.map((e) => q(e.metadata.coordinateSpace, `Animation ${e.metadata.id}`)), s = o.includes(K), c = i && s ? V(t, i) : void 0;
		return {
			clips: e.map((e, s) => {
				F(e);
				let l = o[s], u = l === ae, d = Float32Array.from(e.sampleTimes), f = [], p = 0;
				e.transformTracks.forEach((n) => {
					let r = L(t, n.path);
					if (!r) {
						if (u) throw Error(`Target-local animation ${e.metadata.sourceName} references missing shipped path ${n.path}.`);
						return;
					}
					let i = u ? void 0 : c?.get(n.path);
					if (!u && c && !i) {
						let t = {
							severity: "warning",
							code: "animation-track-unbound",
							message: `Animation ${e.metadata.sourceName} has no rest-pose basis for ${n.path}; the remaining tracks are still playable.`,
							assetId: e.metadata.id,
							details: { path: n.path }
						};
						a.push(t), this.#i?.(t);
						return;
					}
					f.push(...U(n, r, d, u ? T : this.#r, i)), p += 1;
				});
				let m = r?.get(e.metadata.sourceName) ?? `${e.metadata.set}:${e.metadata.sourceName}`, h = new n.AnimationClip(m, e.metadata.duration, f);
				if (h.userData = {
					axieSourceName: e.metadata.sourceName,
					axieAnimationSet: e.metadata.set,
					axieLooping: e.metadata.looping,
					axieWrapMode: e.metadata.wrapMode,
					axieEvents: e.events,
					axieObjectCurves: e.objectCurves,
					axieSourceTrackCount: e.metadata.trackCount,
					axieUnboundTrackCount: e.transformTracks.length - p,
					axieCoordinateSpace: l,
					axieRestPoseRetargeted: !u && !!i,
					axieWeaponSocketCorrectedTrackCount: 0,
					axieWeaponSocketSynthesizedTrackCount: 0
				}, !h.validate()) throw Error(`Compiled Axie animation ${e.metadata.id} is invalid.`);
				return h;
			}),
			events: a,
			payloads: e
		};
	}
	clearCache() {
		this.#o.forEach((e) => {
			e.settled || e.controller.abort();
		}), this.#s.forEach((e) => {
			e.settled || e.controller.abort();
		}), this.#o.clear(), this.#s.clear();
	}
	async #l(e, t) {
		A(t);
		let n = this.#o.get(e);
		return n ||= this.#d(e, this.#o, (t) => this.#e(e, t)), this.#f(e, n, this.#o, t);
	}
	async #u(e, t) {
		A(t);
		let n = this.#s.get(e);
		return n ||= this.#d(e, this.#s, (t) => this.#t(e, t)), this.#f(e, n, this.#s, t);
	}
	#d(e, t, n) {
		let r = new AbortController(), i;
		return i = {
			controller: r,
			promise: j(Promise.resolve().then(() => n(r.signal)), r.signal).catch((n) => {
				throw t.get(e) === i && t.delete(e), n;
			}).finally(() => {
				i.settled = !0;
			}),
			consumers: 0,
			settled: !1
		}, t.set(e, i), i;
	}
	async #f(e, t, n, r) {
		t.consumers += 1;
		try {
			return await j(t.promise, r);
		} finally {
			t.consumers = Math.max(0, t.consumers - 1), !t.settled && t.consumers === 0 && (n.get(e) === t && n.delete(e), t.controller.abort());
		}
	}
};
//#endregion
//#region src/assembler.ts
function ue() {
	return typeof performance < "u" ? performance.now() : Date.now();
}
function de() {
	return new DOMException("Axie assembly was aborted.", "AbortError");
}
function Y(e) {
	if (e?.aborted) throw de();
}
function X(e, t) {
	let n = [];
	return e.traverse((e) => {
		e.name === t && n.push(e);
	}), n;
}
function fe(e, t) {
	return Array.isArray(e) ? e.map(() => t) : t;
}
function pe(e) {
	return [
		e.surface,
		e.outline,
		e.depth,
		e.distance
	].filter((e) => !!e);
}
function me(e) {
	return e.instantiate();
}
function he(e, t) {
	let n = e.properties?.[t];
	return Array.isArray(n) && n.length >= 3 && n.slice(0, 3).every((e) => typeof e == "number" && Number.isFinite(e)) ? `#${n.slice(0, 3).map((e) => Math.round(Math.min(1, Math.max(0, e)) * 255).toString(16).padStart(2, "0")).join("")}` : "#ffffff";
}
function ge(e, t) {
	return e.colors?.applyUnityColorVariant ? {
		primary: e.colors.primary ?? "#ffffff",
		secondary: e.colors.secondary ?? "#ffffff"
	} : {
		primary: he(t, "_PrimaryColor"),
		secondary: he(t, "_SecondaryColor")
	};
}
function _e(e, t) {
	t.position.copy(e.position), t.quaternion.copy(e.quaternion), t.scale.copy(e.scale), t.matrix.copy(e.matrix), t.matrixAutoUpdate = e.matrixAutoUpdate, t.visible = e.visible, t.frustumCulled = e.frustumCulled, t.layers.mask = e.layers.mask;
}
function ve(e, t, r) {
	let i = fe(e.material, t), a;
	if (e.isSkinnedMesh) {
		let t = e, r = new n.SkinnedMesh(t.geometry, i);
		r.bindMode = t.bindMode, r.bind(t.skeleton, t.bindMatrix), r.morphTargetDictionary = t.morphTargetDictionary, r.morphTargetInfluences = t.morphTargetInfluences, a = r;
	} else a = new n.Mesh(e.geometry, i);
	return _e(e, a), a.name = `${e.name || e.uuid}:AxieOutline`, a.castShadow = !1, a.receiveShadow = !1, a.renderOrder = e.renderOrder - 1, a.userData.axieOutline = !0, a.userData.axieSourceObjectUnitScale = r, a.onBeforeRender = (e, t, n, i, a) => {
		let o = a.uniforms?.uOutlineSourceObjectUnitScale;
		o && (o.value = r);
	}, typeof e.userData.axiePartId == "string" && (a.userData.axiePartId = e.userData.axiePartId), typeof e.userData.axieRigType == "string" && (a.userData.axieRigType = e.userData.axieRigType), a;
}
function ye(e, t, r = 1, i = new n.Matrix4(), a) {
	let o = [];
	e.traverse((e) => {
		let t = e;
		t.isMesh && !t.userData.axieOutline && o.push(t);
	}), o.forEach((e) => {
		let n = a?.instantiatePerRenderer ? me(t) : t;
		a && (pe(n).forEach((e) => {
			a.ownedMaterials.add(e), a.instantiatePerRenderer || a.templateMaterials.delete(e);
		}), a.propertyBlock && (e.userData.axieMaterialPropertyBlock = a.propertyBlock));
		let o = e.material;
		e.material = fe(o, n.surface);
		let s = e.onBeforeRender;
		if (e.onBeforeRender = function(e, t, n, r, a, o) {
			s.call(this, e, t, n, r, a, o);
			let c = a.uniforms?.uMysticUnityObjectFromGeometry;
			c && c.value.copy(i);
		}, e.castShadow = n.castShadow ?? !0, e.receiveShadow = !0, e.renderOrder = n.material.renderState.renderOrder, n.depth && (e.customDepthMaterial = n.depth), n.distance && (e.customDistanceMaterial = n.distance), n.outline && e.parent) {
			let t = ve(e, n.outline, r);
			a?.propertyBlock && (t.userData.axieMaterialPropertyBlock = a.propertyBlock), e.parent.add(t);
		}
	});
}
function be(e) {
	e.dispose();
}
function xe(e) {
	for (let t = e.length - 1; t >= 0; --t) e[t].release();
}
function Se(e) {
	return e instanceof DOMException && e.name === "AbortError";
}
function Ce(e, t, r, i, a) {
	let o = new n.Group();
	o.name = `AxieAddonBasis:${e.id}`, o.matrixAutoUpdate = !1, o.matrix.copy(r), o.userData.axieAddonId = e.id, o.userData.axieAddonAttachNode = t.name, o.userData.axieAddonUnityRestPath = i, o.userData.axieAddonBasisError = a, t.add(o), o.add(e.object);
	let s = !1;
	return {
		id: e.id,
		object: o,
		resetParticles: (t) => {
			s || e.resetParticles(t);
		},
		update: (t) => {
			s || e.update(t);
		},
		dispose: () => {
			s || (s = !0, e.dispose(), o.removeFromParent(), o.clear());
		}
	};
}
function we(e) {
	let t = e.code.includes("texture") ? "texture-missing" : e.code.includes("material") ? "material-missing" : e.code.includes("prefab") ? "addon-missing" : "shader-fallback";
	return {
		severity: e.severity,
		code: t,
		message: e.message,
		assetId: e.assetId,
		details: {
			...e.details,
			mysticCode: e.code
		}
	};
}
async function Te() {
	return import("./mystic-material-factory-ZyStOYbU.js").then((e) => e.u);
}
var Ee = async (e) => {
	let [{ ThreeAddonPrefabFactory: t, AXIE_EXPORTED_BONE_UNIT_SCALE: n }] = await Promise.all([import("./addon-prefab-adapter-CCsSglX2.js").then((e) => e.r), Te()]);
	return {
		factory: new t({
			coordinateBasis: "exported-glb-bone",
			materialOptions: {
				resolveTexture: e.resolveTexture,
				primaryColor: e.primaryColor,
				secondaryColor: e.secondaryColor
			},
			quality: e.quality.mysticFx === "reduced" ? "reduced" : e.artMode === "enhanced" ? "enhanced" : "faithful",
			strict: e.strict,
			onDiagnostic: e.onDiagnostic
		}),
		factoryUnitScale: n
	};
}, De = class {
	#e;
	#t;
	#n;
	#r;
	#i;
	#a;
	constructor(e) {
		this.#e = e.manifest, this.#t = e.assets, this.#n = e.materials, this.#r = e.animations ?? new le({ onDiagnostic: e.onDiagnostic }), this.#i = e.addons === !1 ? !1 : e.addons ?? Ee, this.#a = e.onDiagnostic;
	}
	clearCache() {
		this.#r.clearCache?.();
	}
	async assemble(i, a, s = { useMaterialPropertyBlocks: !1 }) {
		let c = ue(), l = i, u = a.signal, d = [...i.warnings], p = [], h = [], g = [], _ = [], v = /* @__PURE__ */ new Set(), y = /* @__PURE__ */ new Set(), b = /* @__PURE__ */ new Map(), x = /* @__PURE__ */ new Map(), S = /* @__PURE__ */ new Map(), C = new n.Group();
		C.name = `Axie:${i.key}`;
		let w, T = (e) => {
			d.push(e), this.#a?.(e);
		}, E = (e, t, n, r) => a.onProgress?.({
			stage: e,
			completed: t,
			total: n,
			assetId: r
		});
		try {
			Y(u);
			let D = [...new Set([i.body.materialId, ...i.partRigs.map((e) => e.materialId)].filter(Boolean))].map((e) => {
				let t = this.#e.assets.materials[e];
				if (!t) throw Error(`Axie material ${e} is absent from the runtime manifest.`);
				return t;
			}), O = l.colors?.applyUnityColorVariant ? {
				primary: l.colors.primary ?? "#ffffff",
				secondary: l.colors.secondary ?? "#ffffff"
			} : void 0, k = {
				instantiatePerRenderer: !!O && !s.useMaterialPropertyBlocks,
				propertyBlock: O && s.useMaterialPropertyBlocks ? Object.freeze({
					_PrimaryColor: O.primary,
					_SecondaryColor: O.secondary
				}) : void 0,
				templateMaterials: y,
				ownedMaterials: v
			}, A = new Set(D.flatMap((e) => Object.values(e.textures)).filter(Boolean)), j = /* @__PURE__ */ new Map();
			Object.keys(this.#e.assets.textures).forEach((e) => {
				let t = e.split(":", 1)[0], n = j.get(t);
				if (n && n !== e) throw Error(`Axie texture GUID ${t} maps to both ${n} and ${e}.`);
				j.set(t, e);
			});
			let M = l.partRigs.filter((e) => e.addonId && e.instantiateAddonAttachments && (this.#e.assets.addons[e.addonId]?.attachments.length ?? 0) > 0), N;
			M.length > 0 && this.#i && (N = await this.#i({
				quality: i.quality,
				artMode: l.artMode ?? a.artMode ?? "faithful",
				primaryColor: O?.primary,
				secondaryColor: O?.secondary,
				strict: a.strict === !0,
				resolveTexture: (e) => {
					let t = j.get(e.guid);
					return t ? b.get(t)?.value : void 0;
				},
				onDiagnostic: (e) => T(we(e))
			}), new Set(M.flatMap((e) => N.factory.dependenciesForAddon(e.addonId).textureGuids)).forEach((e) => {
				let t = j.get(e);
				t && A.add(t);
			}));
			let P = [...A];
			E("textures", 0, P.length);
			for (let e = 0; e < P.length; e += 1) {
				Y(u);
				let t = P[e], n = this.#e.assets.textures[t];
				if (!n) throw Error(`Axie texture ${t} is absent from the runtime manifest.`);
				let r = await this.#t.acquireTexture(n, i.quality, u);
				g.push(r), b.set(t, r), E("textures", e + 1, P.length, t);
			}
			let F = this.#n;
			if (!F || N) {
				let e = await Te();
				F ??= e.AXIE_EXACT_PRODUCTION_MATERIAL_FACTORY, w = e.setMysticMaterialTime;
			}
			E("materials", 0, D.length), D.forEach((n, r) => {
				Y(u);
				let o = this.#e.assets.shaders[n.shaderId];
				if (!o) throw Error(`Axie shader ${n.shaderId} for ${n.id} is absent from the runtime manifest.`);
				let s = {};
				Object.entries(n.textures).forEach(([e, t]) => {
					let n = b.get(t)?.value;
					n && (s[t] = n, s[e] = n);
				});
				let c = ge(l, n), d = {
					manifest: this.#e,
					material: n,
					textures: s,
					primaryColor: c.primary,
					secondaryColor: c.secondary,
					quality: i.quality,
					artMode: l.artMode ?? a.artMode ?? "faithful"
				}, f = () => {
					let r;
					if (t(F)) r = F.createBundle(d);
					else {
						if (o.fidelity === "unsupported") throw new e(n.id, n.shaderId, o.sourceName);
						r = {
							surface: F.create(d),
							outline: F.createGeometryOutline(d),
							fidelity: o.fidelity,
							fallbackUsed: !1
						};
					}
					if (r.fidelity === "unsupported") throw new e(n.id, n.shaderId, o.sourceName);
					return r;
				}, p = () => ({
					...f(),
					material: n,
					instantiate: p
				}), m = f();
				pe(m).forEach((e) => y.add(e)), S.set(n.id, {
					...m,
					material: n,
					instantiate: p
				}), h.push({
					materialId: n.id,
					shaderId: n.shaderId,
					fidelity: m.fidelity,
					fallbackUsed: m.fallbackUsed
				}), m.fallbackUsed && T({
					severity: "warning",
					code: "shader-fallback",
					message: `Material ${n.id} used an explicit ${o.sourceName} fallback.`,
					assetId: n.id
				}), E("materials", r + 1, D.length, n.id);
			}), E("body", 0, 1, i.body.id);
			let I = await this.#t.acquireGlb(i.bodyLod.asset.url, u);
			g.push(I), x.set(i.bodyLod.asset.url, I);
			let L = r(I.value.scene);
			L.name = `AxieBodyScene:${i.body.body}`, L.userData.axieBodyLod = i.bodyLod.resolvedLod, L.traverse((e) => {
				e.isSkinnedMesh && (e.frustumCulled = !1);
			});
			let R = L;
			if (i.bodyLod.asset.sceneNode) {
				let e = X(L, i.bodyLod.asset.sceneNode);
				if (e.length !== 1) throw Error(`Body ${i.body.id} expected one scene node ${i.bodyLod.asset.sceneNode}; found ${e.length}.`);
				L.userData.axieSelectedBodySceneNode = e[0].uuid, R = e[0];
			}
			let re = S.get(i.body.materialId);
			if (!re) throw Error(`Body ${i.body.id} has no resolved material ${i.body.materialId}.`);
			ye(L, re, 1, new n.Matrix4(), k), C.add(L), E("body", 1, 1, i.body.id);
			let z;
			if (i.body.restPoseUrl) try {
				z = await this.#r.loadRestPose(i.body.restPoseUrl, u, i.body.body);
			} catch (e) {
				if (T({
					severity: a.strict ? "error" : "warning",
					code: "attach-node-missing",
					message: `Cannot solve exact rigid-part bases for ${i.body.body}: ${e instanceof Error ? e.message : String(e)}`,
					assetId: i.body.restPoseUrl
				}), a.strict) throw e;
			}
			let ie = /* @__PURE__ */ new Set();
			i.partRigs.forEach((e) => {
				(e.lod.asset.coordinateSpace ?? "part-export") === "body-rest" && ie.add(o(e.lod.asset, e.partId));
			});
			let B = /* @__PURE__ */ new Map();
			for (let e of ie) {
				if (e === i.body.body && z) {
					B.set(e, z);
					continue;
				}
				let t = this.#e.assets.bodies[e];
				try {
					if (!t?.restPoseUrl) throw Error(`Reference body ${e} has no rest pose.`);
					B.set(e, await this.#r.loadRestPose(t.restPoseUrl, u, e));
				} catch (n) {
					if (T({
						severity: a.strict ? "error" : "warning",
						code: "attach-node-missing",
						message: `Cannot retarget final body-rest parts from ${e} to ${i.body.body}: ${n instanceof Error ? n.message : String(n)}`,
						assetId: t?.restPoseUrl ?? e
					}), a.strict) throw n;
				}
			}
			let V = [...new Set(i.partRigs.map((e) => e.lod.asset.url))];
			for (let e of V) {
				if (Y(u), x.has(e)) continue;
				let t = await this.#t.acquireGlb(e, u);
				g.push(t), x.set(e, t);
			}
			if (E("parts", 0, i.partRigs.length), i.partRigs.forEach((e, t) => {
				Y(u);
				let r = {
					partId: e.partId,
					rigType: e.rigType,
					requestedLod: e.lod.requestedLod,
					resolvedLod: e.lod.resolvedLod,
					attachNode: e.attachNode,
					attached: !1
				}, s = X(L, e.attachNode), c = x.get(e.lod.asset.url)?.value.scene, l = c && e.lod.asset.sceneNode ? X(c, e.lod.asset.sceneNode) : [];
				if (s.length === 0 || l.length !== 1) {
					let n = s.length === 0, o = {
						severity: n || a.strict ? "error" : "warning",
						code: n ? "attach-node-missing" : "part-missing",
						message: n ? `Cannot find attach point for ${e.rigType}; skipping ${e.partId}.` : `Part ${e.partId}/${e.rigType} expected one GLB node ${e.lod.asset.sceneNode}; found ${l.length}.`,
						assetId: e.partId,
						details: {
							rigType: e.rigType,
							attachMatches: s.length,
							sourceMatches: l.length
						}
					};
					if (T(o), p.push(r), !n && a.strict) throw Error(o.message);
					E("parts", t + 1, i.partRigs.length, e.partId);
					return;
				}
				let d = s[s.length - 1], m = e.lod.asset.coordinateSpace ?? "part-export";
				if (m === "part-export" && i.body.restPoseUrl && !z) {
					p.push(r), E("parts", t + 1, i.partRigs.length, e.partId);
					return;
				}
				let h = l[0].clone(!0), g = 1, _ = new n.Matrix4();
				if (m === "socket-local" && c) {
					let n = e.lod.asset.socketLocalBake;
					if (!n) {
						let n = /* @__PURE__ */ Error(`Socket-local part ${e.partId}/${e.rigType} has no immutable bake receipt.`);
						if (T({
							severity: "error",
							code: "part-missing",
							message: n.message,
							assetId: e.partId,
							details: {
								rigType: e.rigType,
								attachNode: e.attachNode
							}
						}), p.push(r), a.strict) throw n;
						E("parts", t + 1, i.partRigs.length, e.partId);
						return;
					}
					let o = ee(c, l[0], n.objectUnitsPerMeter);
					h.matrixAutoUpdate = !1, h.matrix.copy(o.localMatrix), h.userData.axiePartUnityRestPath = o.sourcePath, h.userData.axiePartBasisError = o.reconstructionError, h.userData.axieSourceObjectUnitScale = o.sourceObjectUnitScale, h.userData.axieCoordinateSpace = m, h.userData.axiePartReferenceBody = n.referenceBody, h.userData.axiePartBodyRetargeted = !1, h.userData.axiePartSourceUrl = n.sourceUrl, h.userData.axiePartSourceSceneNode = n.sourceSceneNode, h.userData.axiePartBakeMatrixSha256 = n.bakeMatrixSha256, g = o.sourceObjectUnitScale, _ = o.unityObjectFromGeometry;
				} else if (m === "body-rest" && c) {
					let n, s, u;
					try {
						n = o(e.lod.asset, e.partId);
						let t = B.get(n);
						if (!t) throw Error(`Reference body ${n} has no authoritative rest pose.`);
						if (!z) throw Error(`Target body ${i.body.body} has no authoritative rest pose.`);
						s = f(t, e.attachNode), u = f(z, e.attachNode);
					} catch (n) {
						let o = {
							severity: a.strict ? "error" : "warning",
							code: "attach-node-missing",
							message: `Cannot attach body-rest part ${e.partId}/${e.rigType}: ${n instanceof Error ? n.message : String(n)}`,
							assetId: e.partId,
							details: {
								rigType: e.rigType,
								attachNode: e.attachNode,
								targetBody: i.body.body
							}
						};
						if (T(o), p.push(r), a.strict) throw n;
						E("parts", t + 1, i.partRigs.length, e.partId);
						return;
					}
					let v = ne(R, d, c, l[0], s.matrix, u.matrix);
					h.matrixAutoUpdate = !1, h.matrix.copy(v.localMatrix), h.userData.axiePartUnityRestPath = v.sourcePath, h.userData.axiePartBasisError = v.reconstructionError, h.userData.axieSourceObjectUnitScale = v.sourceObjectUnitScale, h.userData.axieCoordinateSpace = m, h.userData.axiePartReferenceBody = n, h.userData.axiePartReferenceRestPath = s.sourcePath, h.userData.axiePartBodyRetargeted = i.body.body !== n, g = v.sourceObjectUnitScale, _ = v.unityObjectFromGeometry;
				} else if (z && c) {
					let e = te(R, z, d, c, l[0]);
					h.matrixAutoUpdate = !1, h.matrix.copy(e.localMatrix), h.userData.axiePartUnityRestPath = e.sourcePath, h.userData.axiePartBasisError = e.reconstructionError, h.userData.axieSourceObjectUnitScale = e.sourceObjectUnitScale, h.userData.axieCoordinateSpace = m, g = e.sourceObjectUnitScale, _ = e.unityObjectFromGeometry;
				} else h.position.set(0, 0, 0), h.quaternion.identity(), h.scale.set(1, 1, 1), h.updateMatrix();
				h.name = e.lod.asset.sceneNode, h.traverse((t) => {
					t.userData.axiePartId = e.partId, t.userData.axieRigType = e.rigType;
				});
				let v = S.get(e.materialId);
				if (!v) throw Error(`Part ${e.partId} has no resolved material ${e.materialId}.`);
				d.add(h), ye(h, v, g, _, k), p.push({
					...r,
					attached: !0
				}), E("parts", t + 1, i.partRigs.length, e.partId);
			}), E("addons", 0, N ? M.length : 0), N && M.length > 0 && z) for (let e = 0; e < M.length; e += 1) {
				Y(u);
				let t = M[e], n = t.addonId, r = X(L, t.attachNode);
				if (r.length === 0) {
					T({
						severity: "error",
						code: "attach-node-missing",
						message: `Cannot find attach point for ${t.rigType}; skipping add-on ${n}.`,
						assetId: n,
						details: {
							rigType: t.rigType,
							attachMatches: r.length
						}
					}), E("addons", e + 1, M.length, n);
					continue;
				}
				let i = r[r.length - 1];
				try {
					let e = m(R, z, i, N.factoryUnitScale), r = Ce(N.factory.createAddon(n), i, e.factoryCorrectionMatrix, e.sourcePath, e.reconstructionError);
					r.object.userData.axiePartId = t.partId, r.object.userData.axieRigType = t.rigType, _.push(r);
				} catch (e) {
					if (T({
						severity: a.strict ? "error" : "warning",
						code: "addon-missing",
						message: `Could not instantiate exact add-on ${n}: ${e instanceof Error ? e.message : String(e)}`,
						assetId: n,
						details: {
							rigType: t.rigType,
							attachNode: t.attachNode
						}
					}), a.strict) throw e;
				}
				E("addons", e + 1, M.length, n);
			}
			let H = ["lite", "full"], U = H.length, W = {
				lite: [],
				full: []
			};
			I.value.animations.forEach((e) => {
				let t = e.userData?.axieAnimationSet;
				(t === "lite" || t === "full") && W[t].push(e);
			}), W.lite.length === 0 && W.full.length === 0 && (W[i.animationSet] = [...I.value.animations]);
			let G = {
				lite: W.lite,
				full: W.full
			};
			for (let e = 0; e < H.length; e += 1) {
				let t = H[e], n = i.body.animations[t];
				if (E("animations", e, U, n?.url), n?.url) try {
					let e = await this.#r.loadBundle(n.url, R, u, n.clips, i.body.restPoseUrl);
					e.events.forEach((e) => {
						d.includes(e) || d.push(e);
					}), G[t] = e.clips;
				} catch (e) {
					if (Se(e) || a.strict) throw e;
					T({
						severity: "warning",
						code: "animation-missing",
						message: `Could not load ${i.body.body}/${t} animations: ${e instanceof Error ? e.message : String(e)}`,
						assetId: n.url
					});
				}
				else G[t].length === 0 && t === i.animationSet && T({
					severity: "warning",
					code: "animation-missing",
					message: `Body ${i.body.body} has no ${t} animation bundle.`,
					assetId: i.body.id
				});
				E("animations", e + 1, U, n?.url);
			}
			let K = Object.freeze({
				lite: Object.freeze([...G.lite]),
				full: Object.freeze([...G.full])
			}), ae = K[i.animationSet];
			Y(u), y.forEach(be), y.clear(), E("finalize", 0, 1, i.key);
			let q = {
				descriptorKey: i.key,
				quality: i.quality.id,
				animationSet: i.animationSet,
				requestedLod: i.quality.requestedLod,
				bodyResolvedLod: i.bodyLod.resolvedLod,
				rigs: p,
				shaders: h,
				missingParts: i.missingParts,
				events: d,
				loadDurationMs: ue() - c,
				ready: !0
			};
			return E("finalize", 1, 1, i.key), {
				wrapper: C,
				model: L,
				clips: ae,
				clipSets: K,
				leases: g,
				ownedMaterials: [...v],
				addonRuntimes: _,
				setMysticMaterialTime: w,
				diagnostics: q
			};
		} catch (e) {
			Se(e) && this.#a?.({
				severity: "info",
				code: "load-aborted",
				message: `Axie assembly ${i.key} was aborted.`,
				assetId: i.key
			});
			for (let e = _.length - 1; e >= 0; --e) _[e].dispose();
			throw C.removeFromParent(), C.clear(), v.forEach(be), y.forEach(be), xe(g), e;
		}
	}
};
//#endregion
//#region src/texture-sampling.ts
function Oe(e) {
	if (e.filterMode === "point") return {
		minFilter: e.mipmaps ? n.NearestMipmapNearestFilter : n.NearestFilter,
		magFilter: n.NearestFilter
	};
	if (e.filterMode === "bilinear") return {
		minFilter: e.mipmaps ? n.LinearMipmapNearestFilter : n.LinearFilter,
		magFilter: n.LinearFilter
	};
	if (e.filterMode === "trilinear") return {
		minFilter: e.mipmaps ? n.LinearMipmapLinearFilter : n.LinearFilter,
		magFilter: n.LinearFilter
	};
	throw RangeError(`Unsupported Axie texture filter mode: ${String(e.filterMode)}`);
}
//#endregion
//#region src/unity-mip-chain.ts
function ke(e) {
	let t = e;
	return {
		width: Math.trunc(t?.width ?? 0),
		height: Math.trunc(t?.height ?? 0)
	};
}
function Ae(e, t, n) {
	let r = e === "bc1-rgb" ? 8 : 16;
	return Math.max(1, Math.ceil(t / 4)) * Math.max(1, Math.ceil(n / 4)) * r;
}
async function je(e) {
	if (!globalThis.crypto?.subtle) throw Error("SHA-256 is unavailable; Unity-authored mip payloads cannot be verified.");
	let t = await globalThis.crypto.subtle.digest("SHA-256", e);
	return [...new Uint8Array(t)].map((e) => e.toString(16).padStart(2, "0")).join("");
}
async function Me(e, t, n, r, i, a) {
	let o = await a(n);
	if (!o.ok) throw Error(`Could not load Unity mip payload ${e}/${t}: HTTP ${o.status}.`);
	let s = await o.arrayBuffer();
	if (s.byteLength !== r) throw Error(`Unity mip payload ${e}/${t} expected ${r} bytes, received ${s.byteLength}.`);
	let c = await je(s);
	if (c !== i) throw Error(`Unity mip payload ${e}/${t} failed SHA-256 verification (expected ${i}, received ${c}).`);
	return s;
}
function Ne(e, t) {
	if (t.colorSpace !== e.colorSpace) throw Error(`Unity mip chain color space mismatch for ${e.id}.`);
	if (t.levels.length === 0 || t.levels[0].level !== 0) throw Error(`Unity mip chain ${e.id} has no level zero.`);
	let n = t.sourceFormat === "bc1-rgb" ? "bc1-flip-y-block-and-selector-rows-v1" : t.sourceFormat === "bc3-rgba" ? "bc3-flip-y-block-alpha-and-color-selector-rows-v1" : "unity-decoded-png-levels-v1", r = t.sourceFormat !== "bc7-rgba";
	if (t.rawTransform !== n || t.rawTransport !== (r ? "s3tc-gpu" : "decoded-png-only") || r && (t.unityRawByteLength !== t.rawByteLength || !t.rawUrl || !t.rawContentHash) || !r && (t.rawUrl !== void 0 || t.rawByteLength !== void 0 || t.rawContentHash !== void 0)) throw Error(`Unity mip chain ${e.id} has invalid WebGL transform provenance.`);
	let i = e.width, a = e.height, o = 0;
	if (t.levels.forEach((n, r) => {
		if (n.level !== r || n.width !== i || n.height !== a || n.rawOffset !== o || n.rawByteLength !== Ae(t.sourceFormat, n.width, n.height)) throw Error(`Unity mip chain ${e.id} has an invalid level ${r}.`);
		o += n.rawByteLength, i = Math.max(1, i >> 1), a = Math.max(1, a >> 1);
	}), t.levels.at(-1)?.width !== 1 || t.levels.at(-1)?.height !== 1 || o !== t.unityRawByteLength) throw Error(`Unity mip chain ${e.id} is incomplete.`);
}
function Pe(e, t) {
	if (!e) return !1;
	let n = t === "srgb" ? "WEBGL_compressed_texture_s3tc_srgb" : "WEBGL_compressed_texture_s3tc";
	return e.extensions.has(n);
}
var Fe = Pe;
async function Ie(e, t, r, i) {
	if (!t.rawUrl || t.rawByteLength === void 0 || !t.rawContentHash) throw Error(`Unity mip chain ${e.id} has no raw S3TC payload.`);
	let a = await Me(e.id, t.sourceFormat === "bc1-rgb" ? "chain.bc1" : "chain.bc3", i(t.rawUrl), t.rawByteLength, t.rawContentHash, r), o = t.levels.map((e) => ({
		data: new Uint8Array(a, e.rawOffset, e.rawByteLength),
		width: e.width,
		height: e.height
	}));
	return new n.CompressedTexture(o, e.width, e.height, t.sourceFormat === "bc1-rgb" ? n.RGB_S3TC_DXT1_Format : n.RGBA_S3TC_DXT5_Format, n.UnsignedByteType);
}
async function Le(e, t, n, r, i) {
	let a = [], o = Array(t.levels.length), s = !1;
	try {
		let c = (await Promise.allSettled(t.levels.map(async (t, s) => {
			let c = await Me(e.id, `mip-${String(t.level).padStart(2, "0")}.png`, i(t.url), t.byteLength, t.contentHash, r), l = URL.createObjectURL(new Blob([c], { type: "image/png" }));
			a.push(l), o[s] = await n.loadAsync(l);
		}))).find((e) => e.status === "rejected");
		if (c) throw c.reason;
		let l = o;
		l.forEach((n, r) => {
			let i = t.levels[r], a = ke(n.image);
			if (a.width !== i.width || a.height !== i.height) throw Error(`Unity decoded mip ${e.id}/${r} expected ${i.width}x${i.height}, received ${a.width}x${a.height}.`);
		});
		let u = l[0];
		return u.image = l[0].image, u.mipmaps = l.map((e) => e.image), u.generateMipmaps = !1, s = !0, u;
	} finally {
		o.slice(+!!s).forEach((e) => e?.dispose()), a.forEach((e) => URL.revokeObjectURL(e));
	}
}
async function Re(e, t) {
	let n = e.unityMipChain;
	if (!n) return;
	Ne(e, n);
	let r = t.resolveUrl ?? ((e) => e), i = t.fetcher ?? fetch;
	if ((t.preferRawS3tc ?? t.preferRawBc1) !== !1 && n.rawTransport === "s3tc-gpu" && Pe(t.renderer, e.colorSpace)) {
		let t = await Ie(e, n, i, r), a = n.sourceFormat === "bc1-rgb" ? "bc1-gpu" : "bc3-gpu";
		return t.userData.axieUnityMipTransport = a, t.userData.axieUnityMipContentHash = n.contentHash, t.userData.axieUnityMipTransform = n.rawTransform, t.userData.axieUnitySourceRawContentHash = n.unityRawContentHash, {
			texture: t,
			transport: a
		};
	}
	let a = await Le(e, n, t.textureLoader, i, r);
	return a.userData.axieUnityMipTransport = "png-rgba8", a.userData.axieUnityMipContentHash = n.contentHash, a.userData.axieUnityMipTransform = n.rawTransform, a.userData.axieUnitySourceRawContentHash = n.unityRawContentHash, {
		texture: a,
		transport: "png-rgba8"
	};
}
//#endregion
//#region src/asset-store.ts
function ze() {
	return new DOMException("Axie asset load was aborted.", "AbortError");
}
function Be(e) {
	if (e?.aborted) throw ze();
}
function Ve(e, t) {
	return t ? (Be(t), new Promise((n, r) => {
		let i = () => {
			a(), r(ze());
		}, a = () => t.removeEventListener("abort", i);
		t.addEventListener("abort", i, { once: !0 }), e.then((e) => {
			a(), n(e);
		}, (e) => {
			a(), r(e);
		});
	})) : e;
}
function He(e) {
	return Array.isArray(e) ? e : [e];
}
function Ue(e) {
	let t = /* @__PURE__ */ new Set();
	return Object.values(e).forEach((e) => {
		e instanceof n.Texture && t.add(e);
	}), t;
}
function We(e) {
	let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
	e.scene.traverse((e) => {
		let i = e;
		i.isMesh && (i.geometry && t.add(i.geometry), He(i.material).forEach((e) => {
			n.add(e), Ue(e).forEach((e) => r.add(e));
		}));
	}), t.forEach((e) => e.dispose()), n.forEach((e) => e.dispose()), r.forEach((e) => e.dispose());
}
function Ge(e) {
	let t = /* @__PURE__ */ new Set(), n = 0, r = (e) => {
		!e || t.has(e.buffer) || (t.add(e.buffer), n += e.byteLength);
	};
	return Object.values(e.attributes).forEach((e) => r(e.array)), r(e.index?.array), Object.values(e.morphAttributes).flat().forEach((e) => r(e.array)), n;
}
function Ke(e) {
	let t = /* @__PURE__ */ new Set();
	e.scene.traverse((e) => {
		let n = e;
		n.isMesh && n.geometry && t.add(n.geometry);
	});
	let n = 0;
	return t.forEach((e) => {
		n += Ge(e);
	}), n;
}
function qe(e) {
	let t = e.image, n = Math.max(0, t?.width ?? 0), r = Math.max(0, t?.height ?? 0);
	return Math.ceil(n * r * 4 * (e.generateMipmaps ? 4 / 3 : 1));
}
function Je(e) {
	return e === "repeat" ? n.RepeatWrapping : e === "mirror" ? n.MirroredRepeatWrapping : n.ClampToEdgeWrapping;
}
var Ye = class {
	#e = /* @__PURE__ */ new Map();
	#t;
	#n;
	#r;
	#i;
	#a;
	#o;
	#s;
	#c;
	#l;
	#u = /* @__PURE__ */ new Set();
	#d = !1;
	#f = 0;
	#p = 0;
	#m = 0;
	#h = 0;
	#g = 0;
	#_ = 0;
	constructor(e = {}) {
		this.#t = e.gltfLoader ?? new i(), this.#n = e.textureLoader ?? new n.TextureLoader(), this.#r = e.ktx2Loader, this.#i = e.renderer, this.#a = e.fetcher, this.#o = (e.preferRawUnityS3tc ?? e.preferRawUnityBc1) !== !1, this.#s = e.resolveUrl ?? ((e) => e), this.#c = e.onDiagnostic, this.#l = Math.max(0, Math.trunc(e.maxUnusedEntries ?? 32));
	}
	async acquireGlb(e, t) {
		let n = this.#s(e), r = `glb:${n}`;
		return this.#b(r, "glb", async () => {
			let e = await this.#t.loadAsync(n), t = {
				scene: e.scene,
				animations: e.animations
			};
			return t.scene.userData.axieImmutableSource = !0, t;
		}, Ke, t);
	}
	async acquireTexture(e, t, r) {
		let i = this.#v(e, t.textureVariant), a = this.#s(i.url), o = [
			"texture",
			a,
			e.colorSpace,
			e.wrapS,
			e.wrapT,
			e.filterMode,
			e.mipmaps,
			e.unityMipChain?.contentHash ?? "",
			t.anisotropy
		].join(":"), s = i.compressed ? this.#r : this.#n;
		if (!s) throw Error(`No KTX2 loader is configured for Axie texture ${e.id}.`);
		return this.#b(o, "texture", async () => {
			let r = i.variant === "unity-import" ? await Re(e, {
				textureLoader: this.#n,
				renderer: this.#i,
				fetcher: this.#a,
				preferRawS3tc: this.#o,
				resolveUrl: this.#s
			}) : void 0, o = r?.texture ?? await s.loadAsync(a);
			o.name = e.id, o.colorSpace = e.colorSpace === "srgb" ? n.SRGBColorSpace : n.NoColorSpace, o.wrapS = Je(e.wrapS), o.wrapT = Je(e.wrapT), o.anisotropy = Math.max(1, t.anisotropy), o.generateMipmaps = e.mipmaps && !i.compressed && !r;
			let c = Oe(e);
			return o.minFilter = c.minFilter, o.magFilter = c.magFilter, o.flipY = !1, o.needsUpdate = !0, o;
		}, qe, r);
	}
	diagnostics() {
		let e = 0;
		return this.#e.forEach((t) => {
			e += t.estimatedBytes;
		}), {
			entries: this.#e.size,
			activeLeases: this.#f,
			inFlightLoads: this.#p,
			hits: this.#m,
			misses: this.#h,
			evictions: this.#g,
			estimatedBytes: e
		};
	}
	evictUnused(e = this.#l) {
		let t = Math.max(0, Math.trunc(e));
		if (this.#e.size <= t) return;
		let n = [...this.#e.values()].filter((e) => e.refs === 0 && e.waiters === 0 && e.value !== void 0).sort((e, t) => e.lastUsed - t.lastUsed);
		for (; this.#e.size > t && n.length > 0;) {
			let e = n.shift();
			this.#e.get(e.key) === e && (this.#x(e), this.#e.delete(e.key), this.#g += 1);
		}
	}
	dispose() {
		this.#d || (this.#d = !0, this.#e.forEach((e) => this.#x(e)), this.#e.clear(), this.#f = 0);
	}
	#v(e, t) {
		let n = e.variants[t], r = t.startsWith("ktx2-");
		if (n && (!r || this.#r)) return {
			variant: t,
			url: n,
			compressed: r
		};
		let i = e.variants["unity-import"];
		if (i) return this.#y(e, t, "unity-import"), {
			variant: "unity-import",
			url: i,
			compressed: !1
		};
		let a = e.variants.source;
		if (a) return this.#y(e, t, "source"), {
			variant: "source",
			url: a,
			compressed: !1
		};
		let o = ["ktx2-uastc", "ktx2-etc1s"].find((t) => e.variants[t] && this.#r);
		if (o) return this.#y(e, t, o), {
			variant: o,
			url: e.variants[o],
			compressed: !0
		};
		throw Error(`Axie texture ${e.id} has no loadable variants.`);
	}
	#y(e, t, n) {
		if (t === n) return;
		let r = `${e.id}:${t}:${n}`;
		this.#u.has(r) || (this.#u.add(r), this.#c?.({
			severity: "warning",
			code: "texture-variant-fallback",
			message: `Texture ${e.id} requested ${t} but loaded ${n}.`,
			assetId: e.id,
			details: {
				requested: t,
				resolved: n
			}
		}));
	}
	async #b(e, t, n, r, i) {
		if (this.#d) throw Error("Axie asset store is disposed.");
		Be(i);
		let a = this.#e.get(e);
		if (a) this.#m += 1;
		else {
			this.#h += 1, this.#p += 1;
			let i = {
				key: e,
				kind: t,
				promise: Promise.resolve(void 0),
				refs: 0,
				waiters: 0,
				lastUsed: ++this.#_,
				estimatedBytes: 0
			}, o = n().then((t) => {
				if (i.value = t, i.estimatedBytes = r(t), this.#d || this.#e.get(e) !== i) throw this.#x(i), Error("Axie asset store was disposed during a load.");
				return this.evictUnused(), t;
			}, (t) => {
				throw this.#e.get(e) === i && this.#e.delete(e), t;
			}).finally(() => {
				this.#p = Math.max(0, this.#p - 1);
			});
			Object.defineProperty(i, "promise", {
				value: o,
				enumerable: !0
			}), a = i, this.#e.set(e, a);
		}
		a.waiters += 1;
		let o;
		try {
			o = await Ve(a.promise, i);
		} catch (e) {
			throw a.waiters = Math.max(0, a.waiters - 1), a.lastUsed = ++this.#_, this.evictUnused(), e;
		}
		if (a.waiters = Math.max(0, a.waiters - 1), this.#d) throw Error("Axie asset store was disposed during a load.");
		if (i?.aborted) throw this.evictUnused(), ze();
		a.refs += 1, a.lastUsed = ++this.#_, this.#f += 1;
		let s = !1, c = this;
		return {
			key: e,
			value: o,
			get released() {
				return s;
			},
			release() {
				s || (s = !0, a.refs = Math.max(0, a.refs - 1), a.lastUsed = ++c.#_, c.#f = Math.max(0, c.#f - 1), c.evictUnused());
			}
		};
	}
	#x(e) {
		e.value && (e.kind === "texture" ? e.value.dispose() : We(e.value), e.value = void 0, e.estimatedBytes = 0);
	}
}, Xe = 1195465285, Ze = .028;
function Qe(e) {
	return Number.isFinite(e) ? e : 0;
}
function Z(e, t, n) {
	return Math.min(n, Math.max(t, Qe(e)));
}
function $e(e, t, n) {
	return e + (t - e) * n;
}
function et(e) {
	let t = Z(e, 0, 1);
	return t * t * t * (10 + t * (-15 + 6 * t));
}
function tt(e) {
	let t = Z(e, 0, 1);
	return t * t * (3 - 2 * t);
}
function Q(e) {
	return e() + e() - 1;
}
function nt(e) {
	let t = e >>> 0;
	return () => {
		t += 1831565813;
		let e = t;
		return e = Math.imul(e ^ e >>> 15, e | 1), e ^= e + Math.imul(e ^ e >>> 7, e | 61), ((e ^ e >>> 14) >>> 0) / 4294967296;
	};
}
function $(e, t) {
	let n = Z(e, -1, 1), r = Z(t, -1, 1), i = Math.hypot(n, r);
	return Object.freeze(i <= 1 || i === 0 ? {
		x: n,
		y: r
	} : {
		x: n / i,
		y: r / i
	});
}
var rt = class {
	#e;
	#t;
	#n;
	#r = 0;
	#i = "fixation";
	#a = 0;
	#o = 0;
	#s = {
		x: 0,
		y: 0
	};
	#c = {
		x: 0,
		y: 0
	};
	#l = {
		x: 0,
		y: 0
	};
	#u = 0;
	#d = 0;
	#f = 0;
	#p = [];
	#m = !1;
	constructor(e = Xe, t = {
		x: 0,
		y: 0
	}) {
		this.#e = nt(e), this.#t = this.#e() * Math.PI * 2, this.#n = this.#e() * Math.PI * 2;
		let n = $(t.x, t.y);
		this.#s = { ...n }, this.#c = { ...n }, this.#l = { ...n }, this.#h(!0);
	}
	update(e) {
		if (this.#m = !1, !Number.isFinite(e) || e <= 0) return this.inspect();
		let t = this.#r + Math.min(e, .25), n = 0;
		for (; t >= this.#o && n < 8;) this.#r = this.#o, this.#i === "fixation" ? (this.#f += this.#p.length, this.#g()) : (this.#s = { ...this.#l }, this.#h(!1)), n += 1;
		return this.#r = t, this.inspect();
	}
	inspect() {
		let e = this.#b(), t = this.#i === "saccade" ? Z((this.#r - this.#a) / (this.#o - this.#a), 0, 1) : 0, n = this.#i === "fixation" ? this.#p.filter((e) => this.#r - this.#a >= e.start).length : 0;
		return Object.freeze({
			phase: this.#i,
			gaze: Object.freeze({ ...e.gaze }),
			target: Object.freeze({ ...this.#l }),
			drift: Object.freeze({ ...e.drift }),
			microOffset: Object.freeze({ ...e.microOffset }),
			saccadeProgress: t,
			saccadeStarted: this.#m,
			saccadeDistance: this.#u,
			saccadeCount: this.#d,
			microSaccadeCount: this.#f + n
		});
	}
	#h(e) {
		this.#i = "fixation", this.#a = this.#r;
		let t = e ? .58 + this.#e() * .62 : this.#_();
		this.#o = this.#r + t, this.#l = { ...this.#s }, this.#p = this.#y(t);
	}
	#g() {
		let e = this.#b().gaze;
		this.#i = "saccade", this.#a = this.#r, this.#c = { ...e }, this.#l = this.#v(e), this.#u = Math.hypot(this.#l.x - e.x, this.#l.y - e.y);
		let t = Z(.045 + .055 * this.#u, .05, .115);
		this.#o = this.#r + t, this.#d += 1, this.#m = !0, this.#p = [];
	}
	#_() {
		let e = this.#e();
		return e < .62 ? .42 + this.#e() * .58 : e < .92 ? 1 + this.#e() * .9 : 1.9 + this.#e() * 1.6;
	}
	#v(e) {
		let t = e;
		for (let n = 0; n < 8; n += 1) {
			let n = this.#e();
			if (n < .58) t = $(Q(this.#e) * .28, Q(this.#e) * .16 + .02);
			else if (n < .88) t = $((this.#e() < .5 ? -1 : 1) * (.48 + this.#e() * .42), Q(this.#e) * .24 + .02);
			else {
				let e = this.#e() < .64 ? 1 : -1;
				t = $(Q(this.#e) * .42, e * (.24 + this.#e() * .28));
			}
			if (Math.hypot(t.x - e.x, t.y - e.y) >= .09) break;
		}
		return { ...t };
	}
	#y(e) {
		let t = [], n = .28 + this.#e() * .58;
		for (; n < e - .2;) {
			let r = this.#e() * Math.PI * 2, i = .006 + this.#e() * (Ze - .006), a = .032 + this.#e() * .018, o = .06 + this.#e() * .08, s = .04 + this.#e() * .025;
			if (n + a + o + s >= e - .025) break;
			t.push(Object.freeze({
				start: n,
				outward: a,
				hold: o,
				returning: s,
				offset: {
					x: Math.cos(r) * i,
					y: Math.sin(r) * i * .82
				}
			})), n += .65 + this.#e() * .95;
		}
		return Object.freeze(t);
	}
	#b() {
		if (this.#i === "saccade") {
			let e = et((this.#r - this.#a) / (this.#o - this.#a));
			return {
				gaze: $($e(this.#c.x, this.#l.x, e), $e(this.#c.y, this.#l.y, e)),
				drift: {
					x: 0,
					y: 0
				},
				microOffset: {
					x: 0,
					y: 0
				}
			};
		}
		let e = this.#r - this.#a, t = {
			x: (Math.sin(e * 2.17 + this.#t) - Math.sin(this.#t)) * .004,
			y: (Math.sin(e * 1.61 + this.#n) - Math.sin(this.#n)) * .003
		}, n = this.#x(e);
		return {
			gaze: $(this.#s.x + t.x + n.x, this.#s.y + t.y + n.y),
			drift: t,
			microOffset: n
		};
	}
	#x(e) {
		let t = this.#p.find((t) => e >= t.start && e <= t.start + t.outward + t.hold + t.returning);
		if (!t) return {
			x: 0,
			y: 0
		};
		let n = e - t.start, r = 1;
		return n < t.outward ? r = tt(n / t.outward) : n > t.outward + t.hold && (r = 1 - tt((n - t.outward - t.hold) / t.returning)), {
			x: t.offset.x * r,
			y: t.offset.y * r
		};
	}
};
//#endregion
export { a as C, f as S, ne as _, Pe as a, m as b, De as c, le as d, V as f, y as g, L as h, Re as i, T as l, O as m, $ as n, Fe as o, se as p, Ye as r, Oe as s, rt as t, E as u, te as v, o as w, p as x, ee as y };

//# sourceMappingURL=clear-eye-gaze-planner-D5F64TO_.js.map