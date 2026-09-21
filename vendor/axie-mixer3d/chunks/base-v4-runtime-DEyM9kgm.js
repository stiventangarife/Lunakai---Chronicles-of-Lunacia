import * as e from "three";
//#region src/render-pass-registry.ts
var t = 0, n = 2500;
function r(e, t) {
	let n = Object.freeze({
		...t,
		depthNormals: t.depthNormals ? Object.freeze({ ...t.depthNormals }) : void 0
	});
	return e.userData.axieSourceRenderPasses = n, e;
}
function i(e) {
	return e.userData.axieSourceRenderPasses;
}
function a(e) {
	let t = i(e);
	return e.visible && t?.depthNormals !== void 0 && t.sourceRenderQueue >= 0 && t.sourceRenderQueue <= 2500;
}
//#endregion
//#region src/base-v4-material.ts
var o = .5209957, s = .7490196, c = .4633656, l = .7106918, u = .6980392, d = .5, f = .01, p = .5;
function m(e) {
	let t = e ?? .5;
	if (t !== .5) throw RangeError(`S_Axie_Mixer_V4 hard-codes its alpha threshold to ${d}; received ${t}.`);
	return d;
}
function h(t, n, r) {
	let i = e.MathUtils.clamp((r - t) / (n - t), 0, 1);
	return i * i * (3 - 2 * i);
}
function g(t) {
	return e.MathUtils.clamp(t, 0, 1);
}
function _(e, t, n) {
	return e + (t - e) * n;
}
function v(e) {
	let t = m(e.alphaMaskCutoff), n = +(e.textureAlpha >= t);
	if (e.alphaClipEnabled === !0 && n === 0) return {
		rgb: [
			0,
			0,
			0
		],
		alpha: n,
		discarded: !0
	};
	let r = e.gammaSpace === !0, i = r ? s : o, a = r ? l : c, d = h(.7, .5, e.textureAlpha), f = h(1, .9, e.textureAlpha), p = h(-.25, .55, e.fakeLightDot), v = .2 * (1 - e.normalViewDot) ** 5, y = u * g(h(.9, 1, e.fakeLightDot * v));
	return {
		rgb: e.textureRgb.map((t, n) => {
			let r = _(t, g(_(t, _(e.primaryColor[n], e.secondaryColor[n], d) * t, f)), f), o = g(_(r, i * r, 1 - p));
			return g(_(o, a > .5 ? o + 2 * a - 1 : o + 2 * (a - .5), y));
		}),
		alpha: n,
		discarded: !1
	};
}
function y(e) {
	return [
		e.x,
		e.y,
		e.z
	];
}
function b(t, n) {
	if (n === "orthographic") return [
		0,
		0,
		1
	];
	let r = new e.Vector3(...t).negate();
	if (r.lengthSq() === 0) throw RangeError("Perspective Base V4 view direction is undefined at the camera origin.");
	return y(r.normalize());
}
function x(t, n) {
	let r = new e.Vector3(...t.normalOS), i = n === "base-v4-extra-prepass" ? r.applyMatrix3(new e.Matrix3().setFromMatrix4(t.objectToWorld)).normalize() : r.applyMatrix3(new e.Matrix3().getNormalMatrix(t.objectToWorld)).normalize(), a = i.clone().multiplyScalar(t.thickness), o = t.objectToWorld.clone().invert(), s = a.clone().applyMatrix3(new e.Matrix3().setFromMatrix4(o));
	return {
		worldDirection: y(i),
		worldOffset: y(a),
		objectOffset: y(s)
	};
}
var S = "\n  varying vec2 vAxieUv;\n  varying vec3 vAxieNormalVS;\n  varying vec3 vAxiePositionVS;\n  uniform vec4 uMainTexTransform;\n\n  #include <common>\n  #include <batching_pars_vertex>\n  #include <morphtarget_pars_vertex>\n  #include <skinning_pars_vertex>\n\n  void main() {\n    vAxieUv = uv * uMainTexTransform.xy + uMainTexTransform.zw;\n\n    #include <morphinstance_vertex>\n    #include <batching_vertex>\n    #include <beginnormal_vertex>\n    #include <morphnormal_vertex>\n    #include <skinbase_vertex>\n    #include <skinnormal_vertex>\n    #include <defaultnormal_vertex>\n    #include <begin_vertex>\n    #include <morphtarget_vertex>\n    #include <skinning_vertex>\n    #include <project_vertex>\n\n    // Unity TransformObjectToWorldNormal normalizes per vertex, then the\n    // generated fragment graph consumes the raw interpolated varying.\n    vAxieNormalVS = normalize(transformedNormal);\n    vAxiePositionVS = mvPosition.xyz;\n  }\n", C = "\n  #include <common>\n\n  uniform mat4 projectionMatrix;\n  uniform sampler2D uMainTex;\n  uniform vec3 uPrimaryColor;\n  uniform vec3 uSecondaryColor;\n  uniform float uAlphaMaskCutoff;\n  uniform float uAlphaClipEnabled;\n  uniform float uShadowMultiplier;\n  uniform float uRimColor;\n  uniform float uUnityGammaWorkflow;\n\n  varying vec2 vAxieUv;\n  varying vec3 vAxieNormalVS;\n  varying vec3 vAxiePositionVS;\n\n  vec3 unityWorldViewDirectionVS() {\n    return isPerspectiveMatrix(projectionMatrix)\n      ? normalize(-vAxiePositionVS)\n      : vec3(0.0, 0.0, 1.0);\n  }\n\n  float unityHlslSmoothstep(float edge0, float edge1, float value) {\n    float t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);\n    return t * t * (3.0 - 2.0 * t);\n  }\n\n  vec3 unityLinearToSrgb(vec3 value) {\n    vec3 low = value * 12.92;\n    vec3 high = 1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;\n    return mix(low, high, step(vec3(0.0031308), value));\n  }\n\n  vec3 unitySrgbToLinear(vec3 value) {\n    vec3 low = value / 12.92;\n    vec3 high = pow((max(value, vec3(0.0)) + 0.055) / 1.055, vec3(2.4));\n    return mix(low, high, step(vec3(0.04045), value));\n  }\n\n  void main() {\n    vec4 sampled = texture2D(uMainTex, vAxieUv);\n    float alpha = step(uAlphaMaskCutoff, sampled.a);\n    if (uAlphaClipEnabled > 0.5 && alpha < 0.01) discard;\n\n    vec3 textureRgb = sampled.rgb;\n    vec3 primaryColor = uPrimaryColor;\n    vec3 secondaryColor = uSecondaryColor;\n    if (uUnityGammaWorkflow > 0.5) {\n      primaryColor = unityLinearToSrgb(primaryColor);\n      secondaryColor = unityLinearToSrgb(secondaryColor);\n    }\n\n    float secondaryWeight = unityHlslSmoothstep(0.7, 0.5, sampled.a);\n    vec3 tint = mix(primaryColor, secondaryColor, secondaryWeight);\n    float tintWeight = unityHlslSmoothstep(1.0, 0.9, sampled.a);\n    vec3 multiplied = mix(textureRgb, tint * textureRgb, tintWeight);\n    vec3 tinted = mix(textureRgb, clamp(multiplied, 0.0, 1.0), tintWeight);\n\n    // Deliberately do not normalize here. The pinned generated Unity shader\n    // uses input.ase_texcoord6.xyz directly at lines 762-770.\n    vec3 normalVS = vAxieNormalVS;\n    vec3 fakeLightVS = mat3(viewMatrix) * vec3(15.0, 80.0, -30.0);\n    float fakeLightDot = dot(fakeLightVS, normalVS);\n    float lightWeight = unityHlslSmoothstep(-0.25, 0.55, fakeLightDot);\n    vec3 shadowed = clamp(mix(tinted, vec3(uShadowMultiplier) * tinted, 1.0 - lightWeight), 0.0, 1.0);\n\n    float normalViewDot = dot(normalVS, unityWorldViewDirectionVS());\n    float fresnel = 0.2 * pow(1.0 - normalViewDot, 5.0);\n    float rimWeight = 0.6980392 * clamp(unityHlslSmoothstep(0.9, 1.0, fakeLightDot * fresnel), 0.0, 1.0);\n    vec3 rimSource = vec3(uRimColor);\n    vec3 overlayLow = shadowed + 2.0 * (rimSource - 0.5);\n    vec3 overlayHigh = shadowed + 2.0 * rimSource - 1.0;\n    vec3 overlay = mix(overlayLow, overlayHigh, step(vec3(0.5), rimSource));\n    vec3 color = clamp(mix(shadowed, overlay, rimWeight), 0.0, 1.0);\n    if (uUnityGammaWorkflow > 0.5) color = unitySrgbToLinear(color);\n\n    gl_FragColor = vec4(color, alpha);\n    #include <colorspace_fragment>\n  }\n", w = "\n  uniform float uOutlineThickness;\n\n  #include <common>\n  #include <batching_pars_vertex>\n  #include <morphtarget_pars_vertex>\n  #include <skinning_pars_vertex>\n\n  void main() {\n    #include <morphinstance_vertex>\n    #include <batching_vertex>\n    #include <beginnormal_vertex>\n    #include <morphnormal_vertex>\n    #include <skinbase_vertex>\n    #include <skinnormal_vertex>\n    #include <begin_vertex>\n    #include <morphtarget_vertex>\n    #include <skinning_vertex>\n\n    // Pinned S_Axie_Mixer_V4.shader ExtraPrePass lines 255-256 do not use\n    // the inverse-transpose normal matrix. They forward-transform normalOS,\n    // normalize in world space, and then apply the equivalent world offset.\n    vec3 outlineNormalOS = objectNormal;\n    #ifdef USE_BATCHING\n      outlineNormalOS = mat3(batchingMatrix) * outlineNormalOS;\n    #endif\n    #ifdef USE_INSTANCING\n      outlineNormalOS = mat3(instanceMatrix) * outlineNormalOS;\n    #endif\n    vec3 outlineNormalWS = normalize(mat3(modelMatrix) * outlineNormalOS);\n\n    vec4 localPosition = vec4(transformed, 1.0);\n    #ifdef USE_BATCHING\n      localPosition = batchingMatrix * localPosition;\n    #endif\n    #ifdef USE_INSTANCING\n      localPosition = instanceMatrix * localPosition;\n    #endif\n    vec4 worldPosition = modelMatrix * localPosition;\n    worldPosition.xyz += outlineNormalWS * uOutlineThickness;\n    vec4 mvPosition = viewMatrix * worldPosition;\n    gl_Position = projectionMatrix * mvPosition;\n  }\n", T = "\n  uniform float uOutlineThickness;\n\n  #include <common>\n  #include <batching_pars_vertex>\n  #include <morphtarget_pars_vertex>\n  #include <skinning_pars_vertex>\n\n  void main() {\n    #include <morphinstance_vertex>\n    #include <batching_vertex>\n    #include <beginnormal_vertex>\n    #include <morphnormal_vertex>\n    #include <skinbase_vertex>\n    #include <skinnormal_vertex>\n    #include <defaultnormal_vertex>\n    #include <begin_vertex>\n    #include <morphtarget_vertex>\n    #include <skinning_vertex>\n\n    vec4 mvPosition = vec4(transformed, 1.0);\n    #ifdef USE_BATCHING\n      mvPosition = batchingMatrix * mvPosition;\n    #endif\n    #ifdef USE_INSTANCING\n      mvPosition = instanceMatrix * mvPosition;\n    #endif\n    mvPosition = modelViewMatrix * mvPosition;\n\n    // BackSide sets FLIP_SIDED in Three; cancel that raster-side convention\n    // because Shader Graph's World Normal node reads the authored normal.\n    vec3 outlineNormalVS = transformedNormal;\n    #ifdef FLIP_SIDED\n      outlineNormalVS = -outlineNormalVS;\n    #endif\n    mvPosition.xyz += normalize(outlineNormalVS) * uOutlineThickness;\n    gl_Position = projectionMatrix * mvPosition;\n  }\n", E = "\n  uniform vec3 uOutlineColor;\n\n  void main() {\n    // Unity's ExtraPrePass ignores _OutlineColor.a and writes alpha 1.\n    gl_FragColor = vec4(uOutlineColor, 1.0);\n    #include <colorspace_fragment>\n  }\n";
function D(t) {
	return t instanceof e.Vector4 ? t.clone() : t ? new e.Vector4(...t) : new e.Vector4(1, 1, 0, 0);
}
var O = class extends e.ShaderMaterial {
	gammaSpace;
	constructor(t) {
		let n = t.gammaSpace ?? !0, i = t.alphaClipEnabled === !0, a = m(t.alphaMaskCutoff), u = t.map;
		n && u.colorSpace !== e.NoColorSpace && (u.colorSpace = e.NoColorSpace, u.needsUpdate = !0);
		let p = new e.Color(t.primaryColor), h = new e.Color(t.secondaryColor);
		super({
			name: t.name ?? "AxieMixer3D/S_Axie_Mixer_V4",
			vertexShader: S,
			fragmentShader: C,
			uniforms: {
				uMainTex: { value: u },
				uMainTexTransform: { value: D(t.mainTexTransform) },
				uPrimaryColor: { value: p },
				uSecondaryColor: { value: h },
				uAlphaMaskCutoff: { value: a },
				uAlphaClipEnabled: { value: +!!i },
				uShadowMultiplier: { value: n ? s : o },
				uRimColor: { value: n ? l : c },
				uUnityGammaWorkflow: { value: +!!n }
			},
			side: e.FrontSide,
			transparent: !1,
			depthTest: !0,
			depthWrite: !0,
			fog: !1,
			toneMapped: !1
		}), this.gammaSpace = n, this.alphaTest = i ? f : 0, this.userData.axieMixerV4 = Object.freeze({
			gammaSpace: n,
			alphaClipEnabled: i,
			faithful: !0
		}), r(this, {
			schemaVersion: 1,
			sourceShaderGuid: "ac091e58a97d048649b904d4e60d5aea",
			sourceShaderName: "AxieMixer3D/S_Axie_Mixer_V4",
			sourceShaderPath: "Resources/AxieMixer3D/BuiltAssets/S_Axie_Mixer_V4.shader",
			sourceRenderQueue: 2e3,
			depthNormals: {
				lightMode: "DepthNormalsOnly",
				cull: "Back",
				zTest: "LEqual",
				zWrite: !0,
				alphaClipEnabled: i,
				alphaThreshold: d,
				alphaClipThreshold: f
			}
		});
	}
	setColors(e, t) {
		let n = this.uniforms.uPrimaryColor.value, r = this.uniforms.uSecondaryColor.value;
		n.set(e), r.set(t);
	}
	setMainTexTransform(e, t, n, r) {
		this.uniforms.uMainTexTransform.value.set(e, t, n, r);
	}
}, k = class extends e.ShaderMaterial {
	source;
	constructor(t = {}) {
		let n = t.source ?? (t.name?.includes("RenderObjectsOutline") ? "render-objects-shadergraph" : "base-v4-extra-prepass"), r = t.color === void 0 ? new e.Color().setRGB(.09803922, .09803922, .09803922, e.SRGBColorSpace) : new e.Color(t.color);
		super({
			name: t.name ?? "AxieMixer3D/S_Axie_Mixer_V4:ExtraPrePass",
			vertexShader: n === "render-objects-shadergraph" ? T : w,
			fragmentShader: E,
			uniforms: {
				uOutlineThickness: { value: t.thickness ?? .02 },
				uOutlineColor: { value: r }
			},
			side: e.BackSide,
			transparent: !1,
			depthTest: !0,
			depthWrite: !0,
			fog: !1,
			toneMapped: !1
		}), this.source = n, this.userData.axieMixerV4Outline = Object.freeze({
			faithful: !0,
			alphaIgnoredLikeUnity: !0,
			source: n
		});
	}
	set thickness(e) {
		this.uniforms.uOutlineThickness.value = e;
	}
	get thickness() {
		return this.uniforms.uOutlineThickness.value;
	}
}, A = class extends k {
	constructor(e = {}) {
		super({
			...e,
			source: "render-objects-shadergraph"
		});
	}
}, j = class {
	createSurface(e) {
		return new O(e);
	}
	createOutline(e = {}) {
		return new k({
			...e,
			source: "base-v4-extra-prepass"
		});
	}
	createBundle(t, n = {}) {
		m(t.alphaMaskCutoff);
		let r = t.alphaClipEnabled === !0, i = this.createSurface(t), a = r ? t.map : null, o = new e.MeshDepthMaterial({
			name: `${t.name ?? "AxieMixer3D/S_Axie_Mixer_V4"}:ShadowCaster`,
			map: a,
			alphaTest: r ? p : 0,
			depthPacking: e.RGBADepthPacking,
			side: e.FrontSide
		}), s = new e.MeshDistanceMaterial({
			name: `${t.name ?? "AxieMixer3D/S_Axie_Mixer_V4"}:DistanceShadowCaster`,
			map: a,
			alphaTest: r ? p : 0,
			side: e.FrontSide
		});
		return {
			surface: i,
			outline: n.enabled === !1 ? void 0 : this.createOutline(n),
			depth: o,
			distance: s
		};
	}
}, M = Object.freeze(new j()), N = "gamma", P = "ac091e58a97d048649b904d4e60d5aea", F = "AxieMixer3D/S_Axie_Mixer_V4", I = class extends Error {
	materialId;
	shaderId;
	shaderName;
	name = "UnsupportedAxieShaderError";
	constructor(e, t, n) {
		super(`Axie material ${e} uses ${n || t}; register its exact Three.js shader extension before rendering it.`), this.materialId = e, this.shaderId = t, this.shaderName = n;
	}
};
function L(e, t) {
	if (!Array.isArray(e) || e.length < t) return;
	let n = e.slice(0, t).map((e) => typeof e == "number" ? e : NaN);
	return n.every(Number.isFinite) ? n : void 0;
}
function R(e, t) {
	return typeof e == "number" && Number.isFinite(e) ? e : t;
}
function z(t) {
	let n = L(t.material.properties._MainTex_ST, 4) ?? L(t.material.properties.mainTexTransform, 4);
	if (n) return new e.Vector4(n[0], n[1], n[2], n[3]);
	let r = t.material.properties._MainTex;
	if (r && typeof r == "object" && !Array.isArray(r)) {
		let t = r, n = L(t.scale, 2), i = L(t.offset, 2);
		if (n && i) return new e.Vector4(n[0], n[1], i[0], i[1]);
	}
	return new e.Vector4(1, 1, 0, 0);
}
function B(e) {
	let t = e.manifest.assets.shaders[e.material.shaderId];
	return e.material.shaderId === "ac091e58a97d048649b904d4e60d5aea" || t?.sourceName === "AxieMixer3D/S_Axie_Mixer_V4" || /(?:^|\/)S_Axie_Mixer_V4$/i.test(t?.sourceName ?? "") || /axie[-_ ]?mixer[-_ ]?v4/i.test(t?.runtimeImplementation ?? "");
}
var V = class {
	create(e) {
		this.#t(e);
		let t = this.#e(e);
		return M.createSurface({
			map: t,
			primaryColor: e.primaryColor,
			secondaryColor: e.secondaryColor,
			gammaSpace: N === "gamma",
			alphaClipEnabled: e.material.keywords.includes("_ALPHATEST_ON"),
			mainTexTransform: z(e),
			alphaMaskCutoff: e.material.renderState.alphaCutoff,
			name: e.material.sourceName
		});
	}
	createGeometryOutline(t) {
		if (this.#t(t), !t.material.geometryOutline.enabled || t.quality.outlineMode !== "unity-geometry") return;
		let [n, r, i] = t.material.geometryOutline.color;
		return M.createOutline({
			thickness: t.material.geometryOutline.thickness,
			color: new e.Color().setRGB(n, r, i, e.SRGBColorSpace),
			name: `${t.material.sourceName}:ExtraPrePass`
		});
	}
	createBundle(t) {
		this.#t(t);
		let [n, r, i] = t.material.geometryOutline.color;
		return {
			...M.createBundle({
				map: this.#e(t),
				primaryColor: t.primaryColor,
				secondaryColor: t.secondaryColor,
				gammaSpace: N === "gamma",
				alphaClipEnabled: t.material.keywords.includes("_ALPHATEST_ON"),
				mainTexTransform: z(t),
				alphaMaskCutoff: R(t.material.properties._AlphaCutoff, t.material.renderState.alphaCutoff),
				name: t.material.sourceName
			}, {
				enabled: t.material.geometryOutline.enabled && t.quality.outlineMode === "unity-geometry",
				thickness: t.material.geometryOutline.thickness,
				color: new e.Color().setRGB(n, r, i, e.SRGBColorSpace),
				name: `${t.material.sourceName}:ExtraPrePass`
			}),
			castShadow: !0,
			fidelity: "exact",
			fallbackUsed: !1
		};
	}
	#e(e) {
		let t = e.material.textures._MainTex, n = t ? e.textures[t] : void 0;
		if (!n) throw Error(`Base V4 material ${e.material.id} is missing _MainTex.`);
		return n;
	}
	#t(e) {
		if (B(e)) return;
		let t = e.manifest.assets.shaders[e.material.shaderId];
		throw new I(e.material.id, e.material.shaderId, t?.sourceName ?? "");
	}
}, H = Object.freeze(new V());
function U(e) {
	return typeof e.createBundle == "function";
}
//#endregion
export { h as C, i as D, a as E, r as O, x as S, t as T, k as _, I as a, v as b, f as c, E as d, w as f, O as g, T as h, V as i, C as l, S as m, P as n, U as o, p, F as r, d as s, H as t, M as u, j as v, n as w, b as x, A as y };

//# sourceMappingURL=base-v4-runtime-DEyM9kgm.js.map