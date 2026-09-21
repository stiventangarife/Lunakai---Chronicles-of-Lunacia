import { d as e, i as t, r as n, t as r } from "./domain-Bk-35ubC.js";
import { r as i, s as a, t as o } from "./genes-decoder-eQ2QL6UT.js";
//#region src/creator-state.ts
var s = 1, c = Object.freeze({
	character: "character",
	version: "axieV",
	genes: "axieGenes",
	body: "axieBody",
	color: "axieColor",
	back: "axieBack",
	ear: "axieEar",
	eye: "axieEye",
	horn: "axieHorn",
	mouth: "axieMouth",
	tail: "axieTail",
	quality: "axieQuality",
	art: "axieArt",
	studio: "axieStudio"
}), l = Object.freeze({
	back: c.back,
	ear: c.ear,
	eye: c.eye,
	horn: c.horn,
	mouth: c.mouth,
	tail: c.tail
}), u = Object.freeze({
	quality: "unity-default",
	artMode: "faithful",
	studioOpen: !1
}), d = Object.freeze({
	0: "Standard",
	1: "Mystic",
	2: "Agamo",
	3: "Japanese",
	4: "Xmas I",
	5: "Xmas II",
	6: "Summer S06",
	7: "Summer S07",
	8: "Summer S08",
	9: "Summer S09",
	10: "Summer S10",
	11: "Summer S11",
	12: "Nightmare",
	13: "Nightmare Shiny"
}), f = [
	"nightmare-body",
	"nightmare-parts",
	"japanese-parts",
	"xmas-i-parts",
	"xmas-ii-parts"
], p = Object.freeze({
	"nightmare-body": Object.freeze({
		id: "nightmare-body",
		label: "Nightmare Body",
		description: "Official Beast Nightmare body skin on the animated Normal rig; current parts stay selected.",
		body: "normal",
		colorVariant: 58,
		skin: 12
	}),
	"nightmare-parts": Object.freeze({
		id: "nightmare-parts",
		label: "Nightmare Parts",
		description: "Representative source-authored Nightmare L2 set with the Beast Nightmare body palette.",
		body: "normal",
		colorVariant: 58,
		skin: 12,
		parts: Object.freeze({
			back: "S12_Beast06_L2_Back",
			ear: "S12_Bug06_L2_Ear",
			eye: "S12_Beast04_L2_Eye",
			horn: "S12_Bug04_L2_Horn",
			mouth: "S12_Beast04_L2_Mouth",
			tail: "S12_Beast04_L2_Tail"
		})
	}),
	"japanese-parts": Object.freeze({
		id: "japanese-parts",
		label: "Japanese Parts",
		description: "Representative source-authored Japanese S03 L2 set.",
		body: "normal",
		colorVariant: 2,
		skin: 3,
		parts: Object.freeze({
			back: "S03_Beast08_L2_Back",
			ear: "S03_Bug12_L2_Ear",
			eye: "S03_Reptile08_L2_Eye",
			horn: "S03_Beast08_L2_Horn",
			mouth: "S03_Bug08_L2_Mouth",
			tail: "S03_Bug06_L2_Tail"
		})
	}),
	"xmas-i-parts": Object.freeze({
		id: "xmas-i-parts",
		label: "Xmas I Parts",
		description: "Complete source-authored Xmas I S04 L2 set on Frosty.",
		body: "frosty",
		colorVariant: 48,
		skin: 4,
		parts: Object.freeze({
			back: "S04_Bug04_L2_Back",
			ear: "S04_Beast06_L2_Ear",
			eye: "S04_Beast04_L2_Eye",
			horn: "S04_Bird12_L2_Horn",
			mouth: "S04_Plant04_L2_Mouth",
			tail: "S04_Reptile08_L2_Tail"
		})
	}),
	"xmas-ii-parts": Object.freeze({
		id: "xmas-ii-parts",
		label: "Xmas II Parts",
		description: "Complete source-authored Xmas II S05 L2 set on Frosty.",
		body: "frosty",
		colorVariant: 48,
		skin: 5,
		parts: Object.freeze({
			back: "S05_Reptile08_L2_Back",
			ear: "S05_Plant10_L2_Ear",
			eye: "S05_Bird04_L2_Eye",
			horn: "S05_Plant10_L2_Horn",
			mouth: "S05_Reptile10_L2_Mouth",
			tail: "S05_Reptile06_L2_Tail"
		})
	})
});
function m(e) {
	return d[e] ?? `Skin S${Math.max(0, Math.trunc(e)).toString().padStart(2, "0")}`;
}
function h(e) {
	return e.length === 0 ? e : `${e[0].toUpperCase()}${e.slice(1)}`;
}
function g(e) {
	return e !== null && a.includes(e);
}
function _(e) {
	return e === "faithful" || e === "enhanced";
}
function v(e) {
	if (e === null || !/^-?\d+$/u.test(e)) return;
	let t = Number(e);
	return Number.isSafeInteger(t) ? t : void 0;
}
function y(e) {
	return Object.freeze({
		colorVariant: Math.trunc(e.colorVariant),
		body: e.body,
		parts: Object.freeze(e.parts.map((e) => Object.freeze({ ...e })))
	});
}
function b(e) {
	return Object.freeze({ ...e });
}
function x(e) {
	let t = e?.quality ?? u.quality, n = e?.artMode ?? u.artMode;
	if (!g(t)) throw TypeError(`Unknown Axie quality profile "${t}".`);
	if (!_(n)) throw TypeError(`Unknown Axie art mode "${n}".`);
	return Object.freeze({
		quality: t,
		artMode: n,
		studioOpen: e?.studioOpen ?? u.studioOpen
	});
}
function S(e, t) {
	let n = t[e].descriptor, r = n.variant.toString().padStart(2, "0"), i = m(n.skin);
	return `${n.class} ${r} · ${i} · L${n.level}`;
}
function C(e) {
	let n = [...new Set(e.creator.bodyIds)], i = r.filter((t) => !n.includes(t) || e.assets.bodies[t] === void 0);
	if (i.length > 0 || n.length !== r.length) throw Error(`Axie Creator requires the eight backed body manifests; missing or duplicated: ${i.join(", ") || "unknown"}.`);
	let a = e.creator.colorVariants.map((e) => Object.freeze({
		...e,
		available: !0
	}));
	if (a.length !== 67 || new Set(a.map((e) => e.index)).size !== a.length) throw Error(`Axie Creator expected 67 unique manifest colors, received ${a.length}.`);
	let o = {};
	return t.forEach((t) => {
		let n = e.creator.partIdsByType[t], r = [...new Set(n)];
		if (r.length !== n.length) throw Error(`Axie Creator ${t} catalog contains duplicate manifest asset ids.`);
		if (r.length === 0) throw Error(`Axie Creator has no manifest-backed ${t} options.`);
		let i = r.map((n) => {
			let r = e.assets.parts[n];
			if (!r) throw Error(`Axie Creator part catalog references missing asset "${n}".`);
			if (r.descriptor.type !== t) throw Error(`Axie Creator catalog placed ${n} in ${t}, but its descriptor is ${r.descriptor.type}.`);
			return Object.freeze({
				id: n,
				asset: r,
				label: S(n, e.assets.parts),
				available: !0
			});
		});
		o[t] = Object.freeze(i);
	}), Object.freeze({
		bodies: Object.freeze(n.map((e) => Object.freeze({
			id: e,
			label: h(e),
			available: !0
		}))),
		colors: Object.freeze(a),
		parts: Object.freeze(o)
	});
}
function w(e, t, n) {
	return e.parts[t].find((e) => e.id === n && e.available);
}
function T(e, t, r, i) {
	return y({
		body: t,
		colorVariant: r,
		parts: n.map((t) => {
			let n = w(e, t, i[t]);
			if (!n) throw TypeError(`Unknown manifest-backed ${t} part "${i[t]}".`);
			return n.asset.descriptor;
		})
	});
}
function E(e, t, n) {
	if (!e.bodies.some((e) => e.id === t.body && e.available)) throw TypeError(`Unknown backed Axie body "${t.body}".`);
	if (!e.colors.some((e) => e.index === t.colorVariant && e.available)) throw TypeError(`Unknown available Axie color variant ${t.colorVariant}.`);
	let r = x(n), i = b({ ...t.parts });
	return Object.freeze({
		mode: "manual",
		...r,
		parts: i,
		descriptor: T(e, t.body, t.colorVariant, i)
	});
}
function D(e, n) {
	let r = e.bodies.find((e) => e.id === "normal" && e.available)?.id ?? e.bodies.find((e) => e.available)?.id, i = e.colors.find((e) => e.available)?.index;
	if (!r || i === void 0) throw Error("Axie Creator catalog has no selectable body or color.");
	let a = {};
	return t.forEach((t) => {
		let n = e.parts[t].find((e) => e.available);
		if (!n) throw Error(`Axie Creator catalog has no selectable ${t}.`);
		a[t] = n.id;
	}), E(e, {
		body: r,
		colorVariant: i,
		parts: b(a)
	}, n);
}
function O(t, n) {
	let r = {};
	return n.parts.forEach((n) => {
		let i = e(n);
		w(t, n.type, i) && (r[n.type] = i);
	}), Object.freeze(r);
}
function k(e, t) {
	let n = x(e);
	if (e.mode === "manual") return E(t, {
		body: e.descriptor.body,
		colorVariant: e.descriptor.colorVariant,
		parts: e.parts
	}, n);
	let r = o.decode(e.genes);
	return Object.freeze({
		mode: "genes",
		...n,
		genes: r.genes,
		descriptor: y(r.descriptor),
		unsupportedClasses: r.unsupportedClasses,
		resolvedParts: O(t, r.descriptor)
	});
}
function A(e, n) {
	if (e.mode === "manual") return k(e, n);
	let r = D(n, e), i = { ...r.parts };
	return t.forEach((t) => {
		let r = e.resolvedParts[t];
		r && w(n, t, r) && (i[t] = r);
	}), E(n, {
		body: n.bodies.some((t) => t.id === e.descriptor.body && t.available) ? e.descriptor.body : r.descriptor.body,
		colorVariant: n.colors.some((t) => t.index === e.descriptor.colorVariant && t.available) ? e.descriptor.colorVariant : r.descriptor.colorVariant,
		parts: b(i)
	}, e);
}
function j(e, t, n) {
	let r = p[n];
	if (!r) throw TypeError(`Unknown Axie special showcase preset "${n}".`);
	let i = A(t, e);
	return E(e, {
		body: r.body,
		colorVariant: r.colorVariant,
		parts: r.parts ?? i.parts
	}, i);
}
function M(e, t) {
	if (e.length === 0) throw Error("Cannot randomize from an empty Axie Creator option list.");
	let n = t();
	return e[Math.floor((Number.isFinite(n) ? Math.max(0, Math.min(.999999999, n)) : 0) * e.length)];
}
function N(e, n, r = Math.random) {
	let i = e.bodies.filter((e) => e.available), a = e.colors.filter((e) => e.available), o = {};
	return t.forEach((t) => {
		o[t] = M(e.parts[t].filter((e) => e.available), r).id;
	}), E(e, {
		body: M(i, r).id,
		colorVariant: M(a, r).index,
		parts: b(o)
	}, n);
}
function P(e) {
	let n = (e, t, n = {}) => Object.freeze({
		ok: !1,
		code: e,
		message: t,
		...n
	}), r = (r) => {
		if (r.get(c.character) !== "axie") return n("not-axie", "The URL does not select the Axie character.", { queryKey: c.character });
		let a = r.get(c.version);
		if (a !== null && a !== "1") return n("unsupported-version", `Unsupported Axie creator URL version "${a}".`, { queryKey: c.version });
		let s = r.get(c.quality), d = r.get(c.art);
		if (s !== null && !g(s)) return n("invalid-quality", `Unknown Axie quality profile "${s}".`, { queryKey: c.quality });
		if (d !== null && !_(d)) return n("invalid-art-mode", `Unknown Axie art mode "${d}".`, { queryKey: c.art });
		let f = {
			quality: s ?? u.quality,
			artMode: d ?? u.artMode,
			studioOpen: r.get(c.studio) === "1"
		};
		if (r.has(c.genes)) {
			let t = r.get(c.genes) ?? "";
			if (!t) return n("invalid-genes", "The Axie genes URL value is empty.", {
				queryKey: c.genes,
				genesErrorCode: "empty"
			});
			try {
				let n = o.decode(t);
				return Object.freeze({
					ok: !0,
					state: Object.freeze({
						mode: "genes",
						...f,
						genes: n.genes,
						descriptor: y(n.descriptor),
						unsupportedClasses: n.unsupportedClasses,
						resolvedParts: O(e, n.descriptor)
					})
				});
			} catch (e) {
				return n("invalid-genes", e instanceof Error ? e.message : "Axie genes could not be decoded.", {
					queryKey: c.genes,
					...e instanceof i ? { genesErrorCode: e.code } : {}
				});
			}
		}
		let p = r.get(c.body), m = r.get(c.color);
		if (p === null || m === null) return n("incomplete-manual-state", "The Axie URL is missing a manual body or color selection.");
		let h = p;
		if (!e.bodies.some((e) => e.id === h && e.available)) return n("invalid-body", `Unknown backed Axie body "${p}".`, { queryKey: c.body });
		let x = v(m);
		if (x === void 0 || !e.colors.some((e) => e.index === x && e.available)) return n("invalid-color", `Unknown available Axie color variant "${m}".`, { queryKey: c.color });
		let S = {};
		for (let i of t) {
			let t = l[i], a = r.get(t);
			if (!a) return n("incomplete-manual-state", `The Axie URL is missing its ${i} selection.`, { queryKey: t });
			if (!w(e, i, a)) return n("invalid-part", `Unknown manifest-backed ${i} part "${a}".`, { queryKey: t });
			S[i] = a;
		}
		return Object.freeze({
			ok: !0,
			state: E(e, {
				body: h,
				colorVariant: x,
				parts: b(S)
			}, f)
		});
	};
	return Object.freeze({
		read(e) {
			let t = r(e);
			return t.ok ? t.state : void 0;
		},
		readDetailed: r,
		write(n, r) {
			let i = k(r, e), a = new URLSearchParams(n);
			return Object.values(c).forEach((e) => a.delete(e)), a.set(c.character, "axie"), a.set(c.version, "1"), a.set(c.quality, i.quality), a.set(c.art, i.artMode), i.studioOpen && a.set(c.studio, "1"), i.mode === "genes" ? a.set(c.genes, i.genes) : (a.set(c.body, i.descriptor.body), a.set(c.color, String(i.descriptor.colorVariant)), t.forEach((e) => a.set(l[e], i.parts[e]))), a;
		}
	});
}
//#endregion
export { j as a, m as c, N as d, O as f, P as i, A as l, s as m, f as n, D as o, c as p, C as r, E as s, p as t, k as u };

//# sourceMappingURL=creator-model-BV83gJKH.js.map