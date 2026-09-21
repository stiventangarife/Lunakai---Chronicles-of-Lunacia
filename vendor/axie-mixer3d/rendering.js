import { _ as e, a as t, b as n, c as r, d as i, f as a, g as o, h as s, i as c, l, m as u, n as d, o as f, p, r as m, s as h, t as ee, v as te, x as ne, y as re } from "./chunks/mystic-material-factory-ZyStOYbU.js";
import { D as g, E as ie } from "./chunks/base-v4-runtime-DEyM9kgm.js";
import { a as ae, c as oe, i as _, l as se, n as ce, o as v, s as le, t as ue, u as de } from "./chunks/addon-prefab-adapter-CCsSglX2.js";
import * as y from "three";
//#region src/mystic-gamma-compositor.ts
var b = "\n  varying vec2 vUv;\n  void main() {\n    vUv = uv;\n    gl_Position = vec4(position.xy, 0.0, 1.0);\n  }\n", fe = "\n  precision highp float;\n  uniform sampler2D uSource;\n  varying vec2 vUv;\n\n  vec3 linearToSrgb(vec3 value) {\n    vec3 low = value * 12.92;\n    vec3 high = 1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;\n    return mix(low, high, step(vec3(0.0031308), value));\n  }\n\n  void main() {\n    vec4 source = texture2D(uSource, vUv);\n    gl_FragColor = vec4(linearToSrgb(source.rgb), source.a);\n  }\n", pe = "\n  precision highp float;\n  uniform sampler2D uSource;\n  uniform int uPresentToneMapping;\n  varying vec2 vUv;\n\n  // Use Three r178's own NeutralToneMapping implementation and\n  // toneMappingExposure uniform rather than maintaining a local approximation.\n  #include <tonemapping_pars_fragment>\n\n  vec3 srgbToLinear(vec3 value) {\n    vec3 low = value / 12.92;\n    vec3 high = pow((max(value, vec3(0.0)) + 0.055) / 1.055, vec3(2.4));\n    return mix(low, high, step(vec3(0.04045), value));\n  }\n\n  void main() {\n    vec4 source = texture2D(uSource, vUv);\n    vec3 linearColor = srgbToLinear(source.rgb);\n    if (uPresentToneMapping == 1) {\n      linearColor = NeutralToneMapping(linearColor);\n    }\n    gl_FragColor = vec4(linearColor, source.a);\n    #include <colorspace_fragment>\n  }\n", x = 0, S = 1;
function me(e, t) {
	let n = e.toneMapping;
	if (n !== y.NoToneMapping && n !== y.NeutralToneMapping) throw Error(`Mystic Gamma encoded composition supports only Three r178 NoToneMapping (${y.NoToneMapping}) or NeutralToneMapping (${y.NeutralToneMapping}); received unproved tone-mapping mode ${n}.`);
	let r = e.toneMappingExposure;
	if (!Number.isFinite(r) || r < 0) throw Error(`Mystic Gamma encoded composition requires a finite non-negative tone-mapping exposure; received ${r}.`);
	t.uniforms.uPresentToneMapping.value = n === y.NeutralToneMapping ? S : x, t.uniforms.toneMappingExposure.value = r;
}
function he(e) {
	let t = e, n = t.userData?.axieMystic;
	return t.isShaderMaterial === !0 && n?.faithful === !0 && typeof n.shaderFamily == "string" && n.requiresGammaComposition === !0 && typeof t.setTime == "function" && t.uniforms?.uMysticGammaBlendPass !== void 0;
}
function C(e) {
	let t = e;
	if (he(e)) return t.uniforms.uMysticGammaBlendPass;
	let n = e.userData?.unityGammaBlend;
	return t.isShaderMaterial !== !0 || n?.faithful !== !0 || n.activeColorSpace !== "Gamma" || typeof n.family != "string" || t.uniforms?.uUnityGammaBlendPass === void 0 ? null : t.uniforms.uUnityGammaBlendPass;
}
function w(e) {
	return e.transparent && C(e) !== null;
}
function T(e) {
	return {
		target: e.getRenderTarget(),
		faceOrLayer: e.getActiveCubeFace(),
		mipmapLevel: e.getActiveMipmapLevel()
	};
}
function E(e, t) {
	e.setRenderTarget(t.target, t.faceOrLayer, t.mipmapLevel);
}
function D(e) {
	let t = [];
	return e.traverseVisible((e) => {
		let n = e;
		if (!n.material) return;
		let r = Array.isArray(n.material) ? n.material : [n.material], i = r.map((e) => e.visible && w(e));
		t.push({
			object: n,
			original: n.material,
			slots: r,
			target: i
		});
	}), t;
}
function O(e, t, n) {
	e.forEach(({ object: e, original: r, slots: i, target: a }) => {
		let o = i.map((e, r) => a[r] === t ? e : n);
		e.material = Array.isArray(r) ? o : o[0];
	});
}
function ge(e) {
	e.forEach(({ object: e, original: t }) => {
		e.material = t;
	});
}
function k(e) {
	let t = /* @__PURE__ */ new Set();
	return e.forEach(({ slots: e, target: n }) => e.forEach((e, r) => {
		n[r] && t.add(e);
	})), t;
}
function _e(e) {
	return k(D(e)).size > 0;
}
function ve(e) {
	let t = /* @__PURE__ */ new Set();
	return e.forEach(({ slots: e, target: n }) => e.forEach((e, r) => {
		e.visible && e.transparent && !n[r] && t.add(e);
	})), t;
}
function ye(e) {
	return new Set(e.flatMap(({ slots: e }) => e));
}
function A(e, t, n, r = !0) {
	let i = new y.WebGLRenderTarget(1, 1, {
		format: y.RGBAFormat,
		type: y.UnsignedByteType,
		depthBuffer: !0,
		stencilBuffer: r,
		minFilter: y.NearestFilter,
		magFilter: y.NearestFilter,
		generateMipmaps: !1,
		samples: n
	});
	return i.texture.name = e, i.texture.colorSpace = t, i;
}
function be(e) {
	let t = new y.DepthTexture(1, 1, y.UnsignedIntType);
	return t.name = `${e.texture.name}:SceneDepth`, t.format = y.DepthFormat, t.minFilter = y.NearestFilter, t.magFilter = y.NearestFilter, t.generateMipmaps = !1, e.depthTexture = t, e;
}
function xe(e, t) {
	if (!e) throw Error("Unity scene-depth composition has no sampleable camera-depth texture.");
	if (e === t.depthTexture || e === t.texture) throw Error("Unity scene-depth composition refused a read/write feedback loop on the active Gamma target.");
}
function Se(e) {
	let t = e.userData?.vfxRequiresUnitySceneDepth === !0, n = e.uniforms, r = n.uUnityCameraDepthTexture !== void 0 && n.uUnityDepthViewport !== void 0 && n.uUnityCameraNearFar !== void 0 && n.uUnityCameraOrthographic !== void 0 && n.uUnityHasSceneDepth !== void 0;
	if (t && !r) throw Error(`Unity Gamma material ${e.name || e.uuid} requires scene depth without the exact uniform contract.`);
	return t && r;
}
function j(e, t, n, r, i, a) {
	let o = n;
	e.forEach((e) => {
		if (!Se(e)) return;
		let s = o.near, c = o.far;
		if (a && (!t || typeof s != "number" || typeof c != "number" || !Number.isFinite(s) || !Number.isFinite(c) || s <= 0 || c <= s)) throw Error(`Unity scene-depth material ${e.name || e.uuid} has no exact camera depth input.`);
		e.uniforms.uUnityCameraDepthTexture.value = a ? t : null, e.uniforms.uUnityDepthViewport.value.set(Math.max(1, r), Math.max(1, i)), e.uniforms.uUnityCameraNearFar.value.set(s ?? .1, c ?? 1e3), e.uniforms.uUnityCameraOrthographic.value = +!!n.isOrthographicCamera, e.uniforms.uUnityHasSceneDepth.value = +!!a;
	});
}
function M(e, t, n, r) {
	let i = T(e), a = r !== i.target;
	try {
		return a && e.setRenderTarget(r), e.render(t, n), !1;
	} finally {
		a && E(e, i);
	}
}
var Ce = class {
	#e;
	#t;
	#n;
	#r = new y.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#i = new y.Scene();
	#a = new y.Scene();
	#o = new y.PlaneGeometry(2, 2);
	#s = new y.ShaderMaterial({
		name: "AxieMysticGamma:CopyEncoded",
		vertexShader: b,
		fragmentShader: fe,
		uniforms: { uSource: { value: null } },
		depthTest: !1,
		depthWrite: !1,
		blending: y.NoBlending,
		toneMapped: !1
	});
	#c = new y.ShaderMaterial({
		name: "AxieMysticGamma:Present",
		vertexShader: b,
		fragmentShader: pe,
		uniforms: {
			uSource: { value: null },
			uPresentToneMapping: { value: x },
			toneMappingExposure: { value: 1 }
		},
		depthTest: !1,
		depthWrite: !1,
		blending: y.NoBlending,
		toneMapped: !1,
		transparent: !1
	});
	#l = new y.MeshBasicMaterial({ visible: !1 });
	#u = new y.Vector2();
	#d;
	#f;
	#p;
	#m;
	#h = !1;
	#g = "direct";
	#_ = !1;
	constructor(e = {}) {
		this.#m = Math.max(0, Math.trunc(e.samples ?? 0)), this.#p = Math.max(0, e.maxSamplePixels ?? Infinity), this.#e = A("AxieMysticGamma:Base-sRGB8", y.SRGBColorSpace, 0), this.#t = A("AxieMysticGamma:Encoded-RGBA8", y.NoColorSpace, 0), this.#n = be(A("AxieMysticGamma:CameraDepth", y.NoColorSpace, 0, !1)), this.#d = e.strictGlobalTransparentOrder === !0, this.#f = e.onDiagnostic, this.#i.add(new y.Mesh(this.#o, this.#s)), this.#a.add(new y.Mesh(this.#o, this.#c));
	}
	setSamples(e) {
		if (this.#_) throw Error("Mystic Gamma compositor is disposed.");
		return this.#m = Math.max(0, Math.trunc(e)), this;
	}
	get lastRoute() {
		return this.#g;
	}
	get disposed() {
		return this.#_;
	}
	#v(e, t) {
		let n = Math.floor(this.#p / Math.max(1, e * t)), r = Math.min(this.#m, n), i = r >= 4 ? 4 : r >= 2 ? 2 : 0;
		for (let e of [this.#e, this.#t]) e.samples !== i && (e.samples = i, e.dispose());
	}
	render(e, t, n, r = e.getRenderTarget(), i = {}) {
		if (this.#_) throw Error("Mystic Gamma compositor is disposed.");
		let a = D(t), o = k(a);
		if (!(o.size > 0 || i.forceEncodedGamma === !0 || i.beforePresent !== void 0)) return this.#g = "direct", M(e, t, n, r);
		let s = [...ve(a)];
		if (s.length > 0) {
			let i = s.map((e) => e.name || e.type).join(", "), a = `Mystic Gamma composition cannot split the global transparent order; found ${s.length} visible non-Mystic transparent material(s): ${i}`;
			if (this.#d) throw Error(a);
			return this.#h || (this.#h = !0, this.#f?.(a, s)), this.#g = "direct-fallback", M(e, t, n, r);
		}
		me(e, this.#c), r ? this.#u.set(r.width, r.height) : e.getDrawingBufferSize(this.#u);
		let c = Math.max(1, Math.floor(this.#u.x)), l = Math.max(1, Math.floor(this.#u.y));
		this.#v(c, l), this.#e.setSize(c, l), this.#t.setSize(c, l), this.#n.setSize(c, l);
		let u = T(e), d = e.autoClear, f = t.background, p = e.shadowMap.autoUpdate, m = e.xr.enabled, h = /* @__PURE__ */ new Map();
		try {
			e.xr.enabled = !1, i.beforeColor?.(), O(a, !1, this.#l), e.setRenderTarget(this.#e), e.autoClear = !0, e.render(t, n), this.#s.uniforms.uSource.value = this.#e.texture, e.setRenderTarget(this.#t), e.autoClear = !1, e.clear(!0, !0, !0), e.render(this.#i, this.#r), t.background = null, e.shadowMap.autoUpdate = !1;
			for (let e of ye(a)) h.set(e, e.colorWrite), e.colorWrite = !1;
			return e.setRenderTarget(this.#n), e.clear(!0, !0, !0), e.render(t, n), e.setRenderTarget(this.#t), e.clear(!1, !0, !0), e.render(t, n), h.forEach((e, t) => {
				t.colorWrite = e;
			}), h.clear(), O(a, !0, this.#l), o.forEach((e) => {
				C(e).value = 1;
			}), xe(this.#n.depthTexture, this.#t), j(o, this.#n.depthTexture, n, c, l, !0), e.render(t, n), j(o, null, n, c, l, !1), o.forEach((e) => {
				C(e).value = 0;
			}), i.beforePresent?.(this.#t), this.#c.uniforms.uSource.value = this.#t.texture, r === u.target ? E(e, u) : e.setRenderTarget(r), e.render(this.#a, this.#r), this.#g = "encoded", !0;
		} finally {
			j(o, null, n, this.#t.width, this.#t.height, !1), o.forEach((e) => {
				C(e).value = 0;
			}), h.forEach((e, t) => {
				t.colorWrite = e;
			}), ge(a), t.background = f, e.shadowMap.autoUpdate = p, e.xr.enabled = m, e.autoClear = d, E(e, u);
		}
	}
	dispose() {
		this.#_ || (this.#_ = !0, this.#e.dispose(), this.#t.dispose(), this.#n.dispose(), this.#o.dispose(), this.#s.dispose(), this.#c.dispose(), this.#l.dispose());
	}
}, we = "Resources/AxieMixer3D/Shaders/Outline/PostProcess.shader", Te = "Axie Mixer 3D/Outline/PostProcess", N = "AfterRenderingPostProcessing", P = Object.freeze(["Normal", "Depth"]), F = Object.freeze({
	outlineColor: "#000000",
	thickness: 1,
	depthScale: 50,
	depthBias: 50,
	normalScale: .7,
	normalBias: 10
}), I = "\nprecision highp float;\n\nattribute vec3 position;\nvarying vec2 vUv;\n\nvoid main() {\n  gl_Position = vec4(position.xy, 0.0, 1.0);\n  vUv = position.xy * 0.5 + 0.5;\n}\n", L = "\nprecision highp float;\n\nuniform sampler2D _CameraDepthTexture;\nuniform sampler2D _CameraNormalsTexture;\nuniform vec4 _ScreenParams;\nuniform float _Thickness;\nuniform vec3 _Color;\nuniform float _DepthScale;\nuniform float _DepthBias;\nuniform float _NormalScale;\nuniform float _NormalBias;\nuniform float _UnityOrthoParamX;\nuniform float _ReversedZ;\nuniform vec4 _ZBufferParams;\n\nvarying vec2 vUv;\n\nfloat LinearizeDepth(float z) {\n  // The pinned source checks unity_OrthoParams.x rather than the projection\n  // type in .w. Preserve that authored branch, including its perspective-camera\n  // behavior, instead of silently correcting the shader.\n  if (_UnityOrthoParamX > 0.5) {\n    return _ReversedZ > 0.5 ? 1.0 - z : z;\n  }\n  return 1.0 / (_ZBufferParams.x * z + _ZBufferParams.y);\n}\n\nfloat SampleLinearDepth(vec2 uv) {\n  return LinearizeDepth(texture2D(_CameraDepthTexture, uv).r);\n}\n\nvec3 SampleSceneNormals(vec2 uv) {\n  return texture2D(_CameraNormalsTexture, uv).xyz;\n}\n\nfloat SobelDepth(vec2 uv, vec2 adjacentUVs[4]) {\n  float dc = SampleLinearDepth(uv);\n  vec4 d = vec4(\n    SampleLinearDepth(adjacentUVs[0]),\n    SampleLinearDepth(adjacentUVs[1]),\n    SampleLinearDepth(adjacentUVs[2]),\n    SampleLinearDepth(adjacentUVs[3])\n  );\n  return pow(length(d - vec4(dc)) * _DepthScale, _DepthBias);\n}\n\nfloat SobelNormal(vec2 uv, vec2 adjacentUVs[4]) {\n  vec3 nc = SampleSceneNormals(uv);\n  vec3 n0 = SampleSceneNormals(adjacentUVs[0]) - nc;\n  vec3 n1 = SampleSceneNormals(adjacentUVs[1]) - nc;\n  vec3 n2 = SampleSceneNormals(adjacentUVs[2]) - nc;\n  vec3 n3 = SampleSceneNormals(adjacentUVs[3]) - nc;\n  float n = sqrt(dot(n0, n0) + dot(n1, n1) + dot(n2, n2) + dot(n3, n3));\n  return pow(n * _NormalScale, _NormalBias);\n}\n\nvoid main() {\n  vec3 offset = vec3(_Thickness / _ScreenParams.xy, 0.0) * _Thickness;\n  vec2 adjacentUVs[4];\n  adjacentUVs[0] = vUv + offset.xz;\n  adjacentUVs[1] = vUv - offset.xz;\n  adjacentUVs[2] = vUv + offset.zy;\n  adjacentUVs[3] = vUv - offset.zy;\n  float sobelDepth = SobelDepth(vUv, adjacentUVs);\n  float sobelNormal = SobelNormal(vUv, adjacentUVs);\n  float sobelAlpha = clamp(max(sobelDepth, sobelNormal), 0.0, 1.0);\n  gl_FragColor = vec4(_Color, sobelAlpha);\n}\n";
function R(e, t) {
	return Number.isFinite(e) && e >= 0 ? e : t;
}
function z(e, t, n) {
	if (n) {
		let n = -1 + t / e;
		return new y.Vector4(n, 1, n / t, 1 / t);
	}
	let r = 1 - t / e, i = t / e;
	return new y.Vector4(r, i, r / t, i / t);
}
function B(e) {
	return new y.Color(e).convertLinearToSRGB();
}
function Ee(e, t, n) {
	let r = R(e, F.thickness), i = Math.max(1, R(t, 1)), a = Math.max(1, R(n, 1));
	return [r * r / i, r * r / a];
}
function V(e, t) {
	let n = y.MathUtils.clamp(e, 0, 1);
	if (t.unityOrthoParamX > .5) return t.reversedZ ? 1 - n : n;
	let r = Math.max(2 ** -52, t.near ?? .1), i = z(r, Math.max(r + 2 ** -52, t.far ?? 1e3), t.reversedZ ?? !1);
	return 1 / (i.x * n + i.y);
}
var De = 5, H = "axieUnityOrthographicSize";
function U(e, t, n) {
	let r = Math.max(2 ** -52, t) / Math.max(1, n);
	if (e instanceof y.OrthographicCamera) {
		let t = Math.max(2 ** -52, Math.abs(e.zoom));
		return Math.abs(e.top - e.bottom) / (2 * t) * r;
	}
	let i = Number(e.userData[H]);
	return (Number.isFinite(i) && i >= 0 ? i : 5) * r;
}
function Oe(e, t) {
	let n = e[0] - t[0], r = e[1] - t[1], i = e[2] - t[2];
	return n * n + r * r + i * i;
}
function ke(e, t = {}) {
	let n = R(t.depthScale ?? F.depthScale, F.depthScale), r = R(t.depthBias ?? F.depthBias, F.depthBias), i = R(t.normalScale ?? F.normalScale, F.normalScale), a = R(t.normalBias ?? F.normalBias, F.normalBias), o = Math.sqrt(e.adjacentDepths.reduce((t, n) => t + (n - e.centerDepth) ** 2, 0)), s = Math.sqrt(e.adjacentNormals.reduce((t, n) => t + Oe(n, e.centerNormal), 0)), c = (o * n) ** +r, l = (s * i) ** +a;
	return {
		depth: c,
		normal: l,
		alpha: y.MathUtils.clamp(Math.max(c, l), 0, 1)
	};
}
var W = class extends y.RawShaderMaterial {
	constructor(e = {}) {
		let t = F;
		super({
			name: "AxieOutlinePostProcessMaterial",
			uniforms: {
				_CameraDepthTexture: { value: null },
				_CameraNormalsTexture: { value: null },
				_ScreenParams: { value: new y.Vector4(1, 1, 2, 2) },
				_Thickness: { value: e.thickness ?? t.thickness },
				_Color: { value: B(e.outlineColor ?? t.outlineColor) },
				_DepthScale: { value: e.depthScale ?? t.depthScale },
				_DepthBias: { value: e.depthBias ?? t.depthBias },
				_NormalScale: { value: e.normalScale ?? t.normalScale },
				_NormalBias: { value: e.normalBias ?? t.normalBias },
				_UnityOrthoParamX: { value: 1 },
				_ReversedZ: { value: 0 },
				_ZBufferParams: { value: z(.1, 1e3, !1) }
			},
			vertexShader: I,
			fragmentShader: L,
			transparent: !0,
			depthTest: !1,
			depthWrite: !1,
			side: y.FrontSide,
			toneMapped: !1,
			fog: !1,
			blending: y.CustomBlending,
			blendEquation: y.AddEquation,
			blendSrc: y.SrcAlphaFactor,
			blendDst: y.OneMinusSrcAlphaFactor,
			blendEquationAlpha: y.AddEquation,
			blendSrcAlpha: y.SrcAlphaFactor,
			blendDstAlpha: y.OneMinusSrcAlphaFactor
		});
	}
	setParameters(e) {
		return e.outlineColor !== void 0 && this.uniforms._Color.value.copy(B(e.outlineColor)), e.thickness !== void 0 && (this.uniforms._Thickness.value = e.thickness), e.depthScale !== void 0 && (this.uniforms._DepthScale.value = e.depthScale), e.depthBias !== void 0 && (this.uniforms._DepthBias.value = e.depthBias), e.normalScale !== void 0 && (this.uniforms._NormalScale.value = e.normalScale), e.normalBias !== void 0 && (this.uniforms._NormalBias.value = e.normalBias), this;
	}
	setInputTextures(e, t) {
		return this.uniforms._CameraDepthTexture.value = e, this.uniforms._CameraNormalsTexture.value = t, this;
	}
	setSize(e, t) {
		let n = Math.max(1, e), r = Math.max(1, t);
		return this.uniforms._ScreenParams.value.set(n, r, 1 + 1 / n, 1 + 1 / r), this;
	}
	setProjection(e) {
		let t = Math.max(2 ** -52, e.near ?? .1), n = Math.max(t + 2 ** -52, e.far ?? 1e3), r = e.reversedZ ?? !1;
		return this.uniforms._UnityOrthoParamX.value = e.unityOrthoParamX, this.uniforms._ReversedZ.value = +!!r, this.uniforms._ZBufferParams.value.copy(z(t, n, r)), this;
	}
}, G = "\nvarying vec2 vAxieDepthNormalUv;\nvarying vec3 vAxieWorldNormal;\nuniform vec4 uMainTexTransform;\nuniform mat3 uCameraToWorldNormal;\n\n#include <common>\n#include <batching_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n\nvoid main() {\n  vAxieDepthNormalUv = uv * uMainTexTransform.xy + uMainTexTransform.zw;\n\n  #include <morphinstance_vertex>\n  #include <batching_vertex>\n  #include <beginnormal_vertex>\n  #include <morphnormal_vertex>\n  #include <skinbase_vertex>\n  #include <skinnormal_vertex>\n  #include <defaultnormal_vertex>\n  #include <begin_vertex>\n  #include <morphtarget_vertex>\n  #include <skinning_vertex>\n  #include <project_vertex>\n\n  // Three's transformedNormal is view-space after skinning, morphing,\n  // batching/instancing, and inverse-transpose normal handling. Rotate it back\n  // to world space to match URP's TransformObjectToWorldNormal output.\n  vAxieWorldNormal = normalize(uCameraToWorldNormal * transformedNormal);\n}\n", K = "\nprecision highp float;\n\nvarying vec2 vAxieDepthNormalUv;\nvarying vec3 vAxieWorldNormal;\nuniform sampler2D uMainTex;\nuniform float uAlphaClipEnabled;\nuniform float uQuantizeSnorm8;\n\nvec3 QuantizeSnorm8(vec3 value) {\n  vec3 clamped = clamp(value, -1.0, 1.0);\n  return sign(clamped) * floor(abs(clamped) * 127.0 + 0.5) / 127.0;\n}\n\nvoid main() {\n  // The generated V4 pass uses step(0.5, alpha), then clips against 0.01.\n  float sourceAlpha = step(0.5, texture2D(uMainTex, vAxieDepthNormalUv).a);\n  if (uAlphaClipEnabled > 0.5 && sourceAlpha < 0.01) discard;\n\n  vec3 worldNormal = normalize(vAxieWorldNormal);\n  if (uQuantizeSnorm8 > 0.5) worldNormal = QuantizeSnorm8(worldNormal);\n  gl_FragColor = vec4(worldNormal, 0.0);\n}\n";
function q(e, t) {
	let n = e, r = n.isShaderMaterial ? n.uniforms[t] : void 0;
	if (!r) throw Error(`${e.name || e.uuid} declares DepthNormals but is missing ${t}.`);
	return r;
}
var Ae = class extends y.ShaderMaterial {
	sourceMaterial;
	#e;
	constructor(e) {
		let t = g(e);
		if (!t?.depthNormals) throw Error(`${e.name || e.uuid} has no registered DepthNormals source pass.`);
		let n = e.uniforms?.uAlphaClipEnabled, r = new y.Matrix3();
		super({
			name: `${e.name || e.uuid}:DepthNormalsOnly`,
			vertexShader: G,
			fragmentShader: K,
			uniforms: {
				uMainTex: q(e, "uMainTex"),
				uMainTexTransform: q(e, "uMainTexTransform"),
				uAlphaClipEnabled: n ?? { value: +!!t.depthNormals.alphaClipEnabled },
				uQuantizeSnorm8: { value: 1 },
				uCameraToWorldNormal: { value: r }
			},
			side: y.FrontSide,
			transparent: !1,
			depthTest: !0,
			depthWrite: !0,
			depthFunc: y.LessEqualDepth,
			blending: y.NoBlending,
			fog: !1,
			toneMapped: !1
		}), this.#e = r, this.sourceMaterial = e, this.userData.axieDepthNormalsOnly = Object.freeze({
			sourceShaderGuid: t.sourceShaderGuid,
			sourceShaderPath: t.sourceShaderPath,
			sourceRenderQueue: t.sourceRenderQueue,
			lightMode: t.depthNormals.lightMode,
			normalSpace: "world",
			storageFallback: "RGBA16F with explicit SNORM8 quantization",
			faithful: !0
		});
	}
	setCamera(e) {
		return e.updateMatrixWorld(), this.#e.setFromMatrix4(e.matrixWorld), this;
	}
};
function J(e) {
	return {
		target: e.getRenderTarget(),
		activeCubeFace: e.getActiveCubeFace(),
		activeMipmapLevel: e.getActiveMipmapLevel()
	};
}
function Y(e, t) {
	e.setRenderTarget(t.target, t.activeCubeFace, t.activeMipmapLevel);
}
function X(e) {
	for (let t = e.length - 1; t >= 0; --t) {
		let n = e[t];
		n.object.visible = n.visible, n.material !== void 0 && (n.object.material = n.material);
	}
}
function je(e, t) {
	if (!Array.isArray(e.material)) return /* @__PURE__ */ new Set([0]);
	let n = /* @__PURE__ */ new Set();
	for (let r of e.geometry.groups) {
		let e = r.materialIndex, i = typeof e == "number" && Number.isInteger(e) ? e : 0;
		i >= 0 && i < t && r.count > 0 && n.add(i);
	}
	return n;
}
var Me = class {
	renderPassEvent = N;
	configuredInputs = P;
	material;
	#e = new y.Scene();
	#t = new y.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	#n = new y.PlaneGeometry(2, 2);
	#r;
	#i = /* @__PURE__ */ new WeakMap();
	#a = /* @__PURE__ */ new Set();
	#o = new y.MeshBasicMaterial({ visible: !1 });
	#s;
	#c;
	#l;
	#u = null;
	constructor(e = {}) {
		this.#c = Math.max(1, Math.trunc(e.width ?? 1)), this.#l = Math.max(1, Math.trunc(e.height ?? 1)), this.material = new W(e).setSize(this.#c, this.#l), this.#o.name = "AxieOutlinePostProcess:IneligibleSourcePass", this.#r = new y.Mesh(this.#n, this.material), this.#r.name = "AxieOutlinePostProcess:Overlay", this.#r.frustumCulled = !1, this.#e.add(this.#r), this.#s = this.#d(this.#c, this.#l);
	}
	#d(e, t) {
		let n = new y.WebGLRenderTarget(e, t, {
			format: y.RGBAFormat,
			type: y.HalfFloatType,
			minFilter: y.NearestFilter,
			magFilter: y.NearestFilter,
			generateMipmaps: !1,
			depthBuffer: !0,
			stencilBuffer: !1,
			samples: 0
		});
		return n.texture.name = "AxieOutlinePostProcess:CameraNormals", n.texture.colorSpace = y.NoColorSpace, n.depthTexture = new y.DepthTexture(e, t, y.UnsignedIntType), n.depthTexture.name = "AxieOutlinePostProcess:CameraDepth", n.depthTexture.format = y.DepthFormat, n.depthTexture.minFilter = y.NearestFilter, n.depthTexture.magFilter = y.NearestFilter, n;
	}
	get normalTexture() {
		return this.#s.texture;
	}
	get depthTexture() {
		let e = this.#s.depthTexture;
		if (!e) throw Error("Axie outline normal target lost its required depth texture.");
		return e;
	}
	get diagnostics() {
		return this.#u;
	}
	setParameters(e) {
		return this.material.setParameters(e), this;
	}
	setSize(e, t) {
		let n = Math.max(1, Math.trunc(e)), r = Math.max(1, Math.trunc(t));
		return n === this.#c && r === this.#l ? this : (this.#c = n, this.#l = r, this.#s.dispose(), this.#s = this.#d(n, r), this.material.setSize(n, r), this);
	}
	#f(e, t) {
		let n = this.#i.get(e);
		return n || (n = new Ae(e), this.#i.set(e, n), this.#a.add(n)), n.setCamera(t);
	}
	#p(e, t) {
		let n = [], r = [];
		e.traverseVisible((e) => {
			let t = e;
			t.material !== void 0 && r.push(t);
		});
		let i = 0, a = 0, o = 0, s = 0, c = 0, l = 0, u = 0;
		try {
			for (let e of r) {
				let r = e, d = r.material;
				if (d === void 0) continue;
				if (n.push({
					object: e,
					visible: e.visible,
					material: d
				}), !r.isMesh) {
					r.material = Array.isArray(d) ? d.map(() => this.#o) : this.#o, s += 1;
					continue;
				}
				if (e.userData.axieOutline === !0) {
					r.material = Array.isArray(d) ? d.map(() => this.#o) : this.#o, o += 1;
					continue;
				}
				if (e.userData.axieDepthNormalsExcluded === !0) {
					e.visible = !1, u += 1;
					continue;
				}
				let f = Array.isArray(d) ? d : [d], p = je(r, f.length), m = f.map((e, n) => {
					if (!p.has(n)) return this.#o;
					if (!e.visible) return u += 1, this.#o;
					let r = g(e);
					return r?.depthNormals ? r.sourceRenderQueue < 0 || r.sourceRenderQueue > 2500 ? (l += 1, this.#o) : ie(e) ? (a += 1, this.#f(e, t)) : (c += 1, this.#o) : (c += 1, this.#o);
				});
				m.every((e) => e === this.#o) ? r.material = Array.isArray(d) ? m : m[0] : (r.material = Array.isArray(d) ? m : m[0], i += 1);
			}
		} catch (e) {
			throw X(n), e;
		}
		return {
			mutations: n,
			diagnostics: {
				sourceRenderersVisited: r.length,
				eligibleRenderers: i,
				eligibleSubmeshes: a,
				excludedOutlineRenderers: o,
				excludedNonMeshRenderers: s,
				excludedWithoutDepthNormalsPass: c,
				excludedByRenderQueue: l,
				excludedInvisibleMaterials: u
			}
		};
	}
	renderInputs(e, t, n) {
		if (!e.capabilities.isWebGL2 || !e.extensions.has("EXT_color_buffer_float")) throw Error("Faithful Axie DepthNormals requires WebGL2 EXT_color_buffer_float for signed RGBA16F storage.");
		let r = J(e), i = e.autoClear, a = e.getClearColor(new y.Color()).clone(), o = e.getClearAlpha(), s = t.overrideMaterial, c = t.background, l = t.environment, u = e.shadowMap.enabled, d = e.xr.enabled, f;
		try {
			f = this.#p(t, n), t.overrideMaterial = null, t.background = null, t.environment = null, e.shadowMap.enabled = !1, e.xr.enabled = !1, e.autoClear = !0, e.setClearColor(new y.Color(0, 0, 0), 0), e.setRenderTarget(this.#s), e.clear(!0, !0, !1), e.render(t, n);
			let r = e.getContext(), i = r.checkFramebufferStatus(r.FRAMEBUFFER);
			if (i !== r.FRAMEBUFFER_COMPLETE) throw Error(`Axie DepthNormals framebuffer is incomplete: ${i}.`);
			return this.material.setInputTextures(this.depthTexture, this.#s.texture).setSize(this.#c, this.#l).setProjection({
				orthographic: n instanceof y.OrthographicCamera,
				unityOrthoParamX: U(n, this.#c, this.#l),
				reversedZ: e.capabilities.reverseDepthBuffer,
				near: n instanceof y.PerspectiveCamera || n instanceof y.OrthographicCamera ? n.near : .1,
				far: n instanceof y.PerspectiveCamera || n instanceof y.OrthographicCamera ? n.far : 1e3
			}), this.#u = Object.freeze({
				...f.diagnostics,
				normalStorage: "rgba16f-snorm8-quantized",
				normalEncoding: "signed-world-normal",
				snorm8Quantized: !0,
				framebufferStatus: i
			}), this.#u;
		} finally {
			f && X(f.mutations), t.overrideMaterial = s, t.background = c, t.environment = l, e.shadowMap.enabled = u, e.xr.enabled = d, e.autoClear = i, e.setClearColor(a, o), Y(e, r);
		}
	}
	renderOverlay(e, t = e.getRenderTarget()) {
		let n = J(e), r = e.autoClear, i = t !== n.target;
		try {
			return e.autoClear = !1, i && e.setRenderTarget(t), e.render(this.#e, this.#t), !0;
		} finally {
			e.autoClear = r, i && Y(e, n);
		}
	}
	render(e, t, n, r = e.getRenderTarget()) {
		return this.renderInputs(e, t, n), this.renderOverlay(e, r);
	}
	dispose() {
		this.#r.removeFromParent(), this.#n.dispose(), this.#o.dispose(), this.#a.forEach((e) => e.dispose()), this.#a.clear(), this.#s.dispose(), this.material.dispose();
	}
}, Z = Object.freeze({
	shaders: 10,
	materials: 50,
	prefabs: 47,
	particles: 85
});
function Q(e) {
	let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
	return e.forEach((e) => t.has(e) ? n.add(e) : t.add(e)), [...n];
}
function $(e = u, t = _) {
	let n = [], r = (e, t) => n.push({
		severity: "error",
		code: "mystic-catalog-invalid",
		message: e,
		assetId: t
	}), i = t.prefabs.flatMap((e) => e.particles), a = {
		shaders: e.shaders.length,
		materials: e.materials.length,
		prefabs: t.prefabs.length,
		particles: i.length
	};
	for (let e of Object.keys(Z)) a[e] !== Z[e] && r(`${e} coverage is ${a[e]}; expected ${Z[e]}.`);
	e.sourceCommit !== t.sourceCommit && r(`Mystic and add-on catalogs use different commits: ${e.sourceCommit} vs ${t.sourceCommit}.`);
	let s = new Set(e.shaders.map((e) => e.guid));
	e.shaders.forEach((e) => {
		let t = o.get(e.guid);
		t ? t.sourceName !== e.name && r(`Shader name mismatch for ${e.guid}: ${t.sourceName} vs ${e.name}.`, e.guid) : r(`Shader ${e.name} has no Three.js factory.`, e.guid);
	}), o.forEach((e, t) => {
		s.has(t) || r(`Runtime shader ${e.sourceName} is absent from source catalog.`, t);
	});
	let c = new Set(e.materials.map((e) => e.id));
	return e.materials.forEach((e) => {
		o.has(e.shaderGuid) || r(`Material ${e.id} has no shader factory for ${e.shaderGuid}.`, e.id);
	}), Q(e.materials.map((e) => e.id)).forEach((e) => {
		r(`Duplicate material id ${e}.`, e);
	}), Q(t.prefabs.map((e) => e.id)).forEach((e) => {
		r(`Duplicate prefab id ${e}.`, e);
	}), Q(i.map((e) => e.id)).forEach((e) => {
		r(`Duplicate particle id ${e}.`, e);
	}), t.prefabs.forEach((e) => {
		let t = new Set(e.transforms.map((e) => e.gameObjectId)), n = new Set(e.transforms.map((e) => e.fileId));
		e.transforms.forEach((t) => {
			t.parentFileId !== "0" && !n.has(t.parentFileId) && r(`Transform ${t.fileId} has unresolved parent ${t.parentFileId}.`, e.id);
		}), e.particles.forEach((e) => {
			t.has(e.gameObjectId) || r(`Particle ${e.id} has no GameObject transform.`, e.id), e.renderer.materialIds.forEach((t) => {
				c.has(t) || r(`Particle ${e.id} references unresolved material ${t}.`, e.id);
			}), e.enabledModules.forEach((t) => {
				v.has(t) || r(`Particle ${e.id} enables unsupported module ${t}.`, e.id);
			}), e.renderer.renderMode !== 0 && r(`Particle ${e.id} uses unsupported renderer mode ${e.renderer.renderMode}.`, e.id), e.shape.enabled && e.shape.type !== 0 && r(`Particle ${e.id} uses unsupported shape ${e.shape.type}.`, e.id);
		});
	}), {
		sourceCommit: e.sourceCommit,
		counts: a,
		expected: Z,
		diagnostics: n,
		complete: n.length === 0
	};
}
function Ne(e = u, t = _) {
	let n = $(e, t);
	if (!n.complete) throw Error(n.diagnostics.map((e) => e.message).join("\n"));
	return n;
}
//#endregion
export { ae as ADDON_PARTICLE_VERTEX_SHADER, v as ADDON_SUPPORTED_PARTICLE_MODULES, K as AXIE_DEPTH_NORMALS_FRAGMENT_SHADER, G as AXIE_DEPTH_NORMALS_VERTEX_SHADER, ee as AXIE_EXACT_MYSTIC_MATERIAL_FACTORY, d as AXIE_EXACT_PRODUCTION_MATERIAL_FACTORY, ue as AXIE_EXPORTED_BONE_UNIT_SCALE, Z as AXIE_MYSTIC_EXPECTED_COVERAGE, m as AXIE_MYSTIC_MATERIAL_FACTORY, Te as AXIE_OUTLINE_POSTPROCESS_SHADER_NAME, F as AXIE_OUTLINE_POST_PROCESS_DEFAULTS, N as AXIE_OUTLINE_POST_PROCESS_EVENT, L as AXIE_OUTLINE_POST_PROCESS_FRAGMENT_SHADER, P as AXIE_OUTLINE_POST_PROCESS_INPUTS, we as AXIE_OUTLINE_POST_PROCESS_SOURCE, I as AXIE_OUTLINE_POST_PROCESS_VERTEX_SHADER, De as AXIE_UNITY_DEFAULT_ORTHOGRAPHIC_SIZE, H as AXIE_UNITY_ORTHOGRAPHIC_SIZE_USER_DATA, W as AxieOutlinePostProcessMaterial, Me as AxieOutlinePostProcessPass, c as ExactAxieMysticMaterialFactory, t as ExactAxieProductionMaterialFactory, s as MYSTIC_MESH_VERTEX_SHADER, re as MYSTIC_QUALITY_PROFILES, o as MYSTIC_SHADER_DEFINITIONS, e as MYSTIC_VERTEX_VARYINGS, a as MysticCelOutlineMaterial, Ce as MysticGammaCompositor, p as MysticObjectOutlineMaterial, f as MysticSourceMaterial, h as MysticSourceMaterialFactory, le as ThreeAddonParticleRuntime, ce as ThreeAddonPrefabFactory, Ne as assertMysticAddonCoverage, V as axieOutlineLinear01Depth, Ee as axieOutlineUvOffset, U as axieUnityOrthoParamX, r as createMysticSourceDefaultMaterialSchema, ke as evaluateAxieOutlineSobel, oe as evaluateMysticCurve, se as evaluateMysticMinMaxCurve, de as evaluateMysticMinMaxGradient, l as isMysticSourceMaterial, w as isUnityGammaCompositorTargetMaterial, n as mysticQualityFromAxieQuality, ne as resolveMysticQuality, te as resolveMysticShaderDefinition, _e as sceneRequiresUnityGammaComposition, i as setMysticMaterialTime, $ as validateMysticAddonCoverage };

//# sourceMappingURL=rendering.js.map