//#region src/domain.ts
var e = [
	"normal",
	"spiky",
	"fuzzy",
	"curly",
	"sumo",
	"wetdog",
	"bigyak",
	"frosty"
], t = [
	"back",
	"ear",
	"eye",
	"horn",
	"mouth",
	"tail"
], n = [
	"eye",
	"mouth",
	"ear",
	"horn",
	"back",
	"tail"
], r = [
	"Aquatic",
	"Beast",
	"Bird",
	"Bug",
	"Plant",
	"Reptile"
], i = [
	...r,
	"Mech",
	"Dawn",
	"Dusk"
], a = [
	"Back_L",
	"Back_M",
	"Back_R",
	"Ear_L",
	"Ear_R",
	"Eye_L",
	"Eye_M",
	"Eye_R",
	"Eye_Accessory_L",
	"Eye_Accessory_R",
	"Horn_L",
	"Horn_M",
	"Horn_R",
	"Horn_T",
	"Mouth_M",
	"Mouth_Accessory_L",
	"Mouth_Accessory_R",
	"Tail_L",
	"Tail_M",
	"Tail_R"
], o = Object.freeze({
	Back_L: "back",
	Back_M: "back",
	Back_R: "back",
	Ear_L: "ear",
	Ear_R: "ear",
	Eye_L: "eye",
	Eye_M: "eye",
	Eye_R: "eye",
	Eye_Accessory_L: "eye",
	Eye_Accessory_R: "eye",
	Horn_L: "horn",
	Horn_M: "horn",
	Horn_R: "horn",
	Horn_T: "horn",
	Mouth_M: "mouth",
	Mouth_Accessory_L: "mouth",
	Mouth_Accessory_R: "mouth",
	Tail_L: "tail",
	Tail_M: "tail",
	Tail_R: "tail"
}), s = Object.freeze({
	back: "Back",
	ear: "Ear",
	eye: "Eye",
	horn: "Horn",
	mouth: "Mouth",
	tail: "Tail"
});
function c(e) {
	let t = Math.trunc(e.skin).toString().padStart(2, "0"), n = Math.trunc(e.variant).toString().padStart(2, "0"), r = Math.trunc(e.level);
	return `S${t}_${e.class ?? ""}${n}_L${r}_${s[e.type]}`;
}
function l(e, t) {
	let n = Math.trunc(e.skin).toString().padStart(2, "0"), r = Math.trunc(e.variant).toString().padStart(2, "0");
	return `S${n}_${e.class ?? ""}${r}_L${Math.trunc(e.level)}_${t}`;
}
function u(e) {
	let t = e.parts.map((e) => c(e)).join(",");
	return `${e.body}|c${Math.trunc(e.colorVariant)}|${t}`;
}
//#endregion
export { s as a, a as c, c as d, t as i, l, i as n, r as o, n as r, o as s, e as t, u };

//# sourceMappingURL=domain-Bk-35ubC.js.map