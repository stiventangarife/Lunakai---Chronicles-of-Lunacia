import { r as e } from "./domain-Bk-35ubC.js";
//#region src/quality.ts
var t = "unity-default", n = [
	"ultra",
	"balanced",
	"performance"
], r = [t, ...n], i = [
	0,
	1,
	2
], a = Object.freeze({
	id: t,
	label: "Unity default",
	requestedLod: 2,
	textureVariant: "unity-import",
	maxTextureDimension: 512,
	pixelRatioCap: 2,
	anisotropy: 1,
	animationSet: "full",
	outlineMode: "unity-geometry",
	mysticFx: "full",
	shadowMapSize: 2048
}), o = Object.freeze({
	ultra: Object.freeze({
		id: "ultra",
		label: "Ultra",
		requestedLod: 0,
		textureVariant: "source",
		maxTextureDimension: 2048,
		pixelRatioCap: 2,
		anisotropy: 8,
		animationSet: "full",
		outlineMode: "unity-geometry",
		mysticFx: "full",
		shadowMapSize: 4096
	}),
	balanced: Object.freeze({
		id: "balanced",
		label: "Balanced",
		requestedLod: 1,
		textureVariant: "source",
		maxTextureDimension: 1024,
		pixelRatioCap: 1.5,
		anisotropy: 4,
		animationSet: "full",
		outlineMode: "unity-geometry",
		mysticFx: "full",
		shadowMapSize: 2048
	}),
	performance: Object.freeze({
		id: "performance",
		label: "Performance (lite)",
		requestedLod: 2,
		textureVariant: "unity-import",
		maxTextureDimension: 512,
		pixelRatioCap: 1,
		anisotropy: 2,
		animationSet: "lite",
		outlineMode: "unity-geometry",
		mysticFx: "reduced",
		shadowMapSize: 1024
	})
}), s = Object.freeze({
	[t]: a,
	...o
});
function c(e, t) {
	return !Number.isInteger(t) || t <= 0 ? -1 : Math.min(Math.max(Math.trunc(e), 0), t - 1);
}
function l(e, t, n) {
	let r = Math.trunc(e);
	return r >= 0 && r < t ? r : n;
}
//#endregion
//#region src/genes-decoder.ts
var u = 512, d = u / 4, f = /^[0-9a-f]+$/iu, p = Object.freeze({
	0: "Beast",
	1: "Bug",
	2: "Bird",
	3: "Plant",
	4: "Aquatic",
	5: "Reptile",
	16: "Mech",
	17: "Dawn",
	18: "Dusk"
}), m = Object.freeze({
	1: "spiky",
	2: "fuzzy",
	3: "curly",
	256: "sumo",
	257: "wetdog",
	384: "bigyak"
}), h = Object.freeze({
	"Beast:0": 0,
	"Beast:1": 1,
	"Beast:2": 2,
	"Beast:3": 3,
	"Beast:4": 4,
	"Beast:6": 5,
	"Plant:0": 6,
	"Plant:1": 7,
	"Plant:2": 8,
	"Plant:3": 9,
	"Plant:4": 10,
	"Aquatic:0": 11,
	"Aquatic:1": 12,
	"Aquatic:2": 13,
	"Aquatic:3": 14,
	"Aquatic:4": 15,
	"Aquatic:6": 16,
	"Bug:0": 17,
	"Bug:1": 18,
	"Bug:2": 19,
	"Bug:3": 20,
	"Bug:4": 21,
	"Bird:0": 22,
	"Bird:1": 23,
	"Bird:2": 24,
	"Bird:3": 25,
	"Bird:4": 26,
	"Reptile:0": 27,
	"Reptile:1": 28,
	"Reptile:2": 29,
	"Reptile:3": 30,
	"Reptile:4": 31,
	"Reptile:6": 32,
	"Dawn:0": 33,
	"Dawn:1": 34,
	"Dawn:2": 35,
	"Dawn:3": 36,
	"Dawn:4": 37,
	"Dusk:0": 38,
	"Dusk:1": 39,
	"Dusk:2": 40,
	"Dusk:3": 41,
	"Dusk:4": 42,
	"Mech:0": 43,
	"Mech:1": 44,
	"Mech:2": 45,
	"Mech:3": 46,
	"Mech:4": 47
}), g = class extends Error {
	code;
	bitOffset;
	name = "AxieGenesValidationError";
	constructor(e, t, n) {
		super(t), this.code = e, this.bitOffset = n;
	}
}, _ = class {
	value;
	bitOffset = 0;
	constructor(e) {
		this.value = e;
	}
	get offset() {
		return this.bitOffset;
	}
	read(e) {
		if (!Number.isInteger(e) || e <= 0 || this.bitOffset + e > u) throw new g("layout-overflow", `Cannot read ${e} bits at Axie genes offset ${this.bitOffset}.`, this.bitOffset);
		let t = BigInt(u - this.bitOffset - e), n = (1n << BigInt(e)) - 1n, r = Number(this.value >> t & n);
		return this.bitOffset += e, r;
	}
	skip(e) {
		this.read(e);
	}
};
function v(e) {
	return e?.mode ?? "unity-compatible";
}
function y(e) {
	let t = e.charCodeAt(0);
	return t >= 48 && t <= 57 ? t - 48 : t >= 65 && t <= 70 ? t - 65 + 10 : t >= 97 && t <= 102 ? t - 97 + 10 : -1;
}
function b(e) {
	let t = [];
	for (let n = e.length - 1; n >= 0; --n) {
		let r = e[n];
		if (y(r) < 0) break;
		if (t.length === d) throw new g("too-long", `Axie genes contain more than ${d} contiguous hexadecimal suffix digits; Unity overflows its 512-bit buffer.`);
		t.push(r.toLowerCase());
	}
	return `0x${t.reverse().join("").padStart(d, "0")}`;
}
function x(e) {
	let t = e.trim(), n = /^0x/iu.test(t) ? t.slice(2) : t;
	if (n.length === 0) throw new g("empty", "Axie genes cannot be empty.");
	if (n.length > d) throw new g("too-long", `Axie genes contain ${n.length} hex digits; the strict 512-bit layout accepts at most ${d}.`);
	if (!f.test(n)) throw new g("invalid-hex", "Axie genes must contain hexadecimal digits only.");
	return `0x${n.toLowerCase().padStart(d, "0")}`;
}
function S(e, t) {
	return v(t) === "strict" ? x(e) : b(e);
}
function C(t, n) {
	let r = v(n), i = S(t, { mode: r }), a = new _(BigInt(i)), o = [], s = (e, t, n, i) => {
		let a = p[e];
		if (a) return a;
		if (r === "strict") throw new g(t === "main" ? "unknown-main-class" : "unknown-part-class", `Unknown Axie ${t} class code ${e} at bit offset ${n}.`, n);
		return o.push(Object.freeze({
			field: t,
			code: e,
			bitOffset: n,
			...i ? { partType: i } : {}
		})), null;
	}, c = a.offset, l = s(a.read(5), "main", c);
	a.skip(45), a.skip(5), a.skip(1);
	let d = a.read(9), f = a.read(9);
	a.skip(9), a.skip(9);
	let y = a.read(6);
	a.skip(6), a.skip(6), a.skip(6), a.skip(6), a.skip(6);
	let b = d === 1 ? "frosty" : m[f] ?? "normal", x = d === 1 ? 48 : h[`${l}:${y}`] ?? 0, C = [];
	if (e.forEach((e) => {
		let t = a.read(2);
		a.skip(13), a.skip(1);
		let n = a.read(9), r = a.offset, i = s(a.read(5), "part", r, e), o = a.read(8);
		a.skip(5), a.skip(8), a.skip(5), a.skip(8), C.push({
			type: e,
			skin: n,
			class: i,
			variant: o,
			level: t + 1
		});
	}), a.offset !== u) throw new g("layout-overflow", `Axie genes decoder consumed ${a.offset} of ${u} bits.`, a.offset);
	return {
		genes: i,
		descriptor: {
			colorVariant: x,
			body: b,
			parts: C
		},
		mode: r,
		unsupportedClasses: Object.freeze(o)
	};
}
var w = class {
	defaultMode;
	constructor(e = "unity-compatible") {
		this.defaultMode = e;
	}
	normalize(e, t) {
		return S(e, { mode: t?.mode ?? this.defaultMode });
	}
	decode(e, t) {
		return C(e, { mode: t?.mode ?? this.defaultMode });
	}
}, T = Object.freeze(new w()), E = Object.freeze(new w("strict"));
//#endregion
export { C as a, s as c, i as d, n as f, c as h, w as i, a as l, l as m, E as n, S as o, o as p, g as r, r as s, T as t, t as u };

//# sourceMappingURL=genes-decoder-eQ2QL6UT.js.map