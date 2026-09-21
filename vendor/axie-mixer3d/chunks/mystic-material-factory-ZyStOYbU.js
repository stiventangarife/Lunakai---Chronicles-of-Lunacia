import { a as e, t } from "./base-v4-runtime-DEyM9kgm.js";
import * as n from "three";
//#region \0rolldown/runtime.js
var r = Object.defineProperty, i = (e, t) => {
	let n = {};
	for (var i in e) r(n, i, {
		get: e[i],
		enumerable: !0
	});
	return t || r(n, Symbol.toStringTag, { value: "Module" }), n;
}, a = Object.freeze({
	faithful: Object.freeze({
		id: "faithful",
		emissionScale: 1,
		particleCapacityScale: 1,
		perSystemParticleCap: 1e3,
		fixedStepSeconds: 1 / 60,
		maxCatchUpSteps: 8,
		prewarm: !0,
		shaderDetail: "full"
	}),
	enhanced: Object.freeze({
		id: "enhanced",
		emissionScale: 1,
		particleCapacityScale: 1.25,
		perSystemParticleCap: 1500,
		fixedStepSeconds: 1 / 120,
		maxCatchUpSteps: 16,
		prewarm: !0,
		shaderDetail: "full"
	}),
	reduced: Object.freeze({
		id: "reduced",
		emissionScale: .5,
		particleCapacityScale: .5,
		perSystemParticleCap: 256,
		fixedStepSeconds: 1 / 30,
		maxCatchUpSteps: 4,
		prewarm: !1,
		shaderDetail: "reduced"
	})
});
function o(e) {
	return e ? typeof e == "string" ? a[e] : e : a.faithful;
}
function s(e) {
	return e.mysticFx === "reduced" ? "reduced" : e.id === "ultra" ? "enhanced" : "faithful";
}
//#endregion
//#region src/mystic-shader-registry.ts
var c = "\n  varying vec2 vMysticUv;\n  varying vec2 vMysticUv0Zw;\n  varying vec2 vMysticUv2;\n  varying vec3 vMysticNormalWS;\n  varying vec3 vMysticNormalVS;\n  varying vec3 vMysticViewDirectionWS;\n  varying vec3 vMysticWorldPosition;\n  varying vec3 vMysticObjectPosition;\n  varying vec3 vMysticObjectNormal;\n  varying float vMysticEyeDepth;\n  varying vec4 vMysticScreenPosition;\n  varying vec4 vMysticColor;\n  varying vec4 vMysticCustom0;\n", l = `
  ${c}

  attribute vec2 uv1;
  uniform mat4 uMysticUnityObjectFromGeometry;

  #include <common>
  #include <batching_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  void main() {
    vMysticUv = uv;
    // A regular Mesh UV channel supplies TEXCOORD0.xy only. Particle vertex
    // streams may pack Custom1.xy into TEXCOORD0.zw; their dedicated vertex
    // program fills this varying explicitly.
    vMysticUv0Zw = vec2(0.0);
    vMysticUv2 = uv1;
    vMysticColor = vec4(1.0);
    vMysticCustom0 = vec4(uv1, 0.0, 0.0);

    #include <morphinstance_vertex>
    #include <batching_vertex>
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>

    vMysticObjectPosition = (
      uMysticUnityObjectFromGeometry * vec4(transformed, 1.0)
    ).xyz;
    vMysticObjectNormal = normalize(
      mat3(uMysticUnityObjectFromGeometry) * objectNormal
    );
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vMysticWorldPosition = worldPosition.xyz;
    vMysticNormalVS = normalize(transformedNormal);
    vMysticNormalWS = inverseTransformDirection(vMysticNormalVS, viewMatrix);
    vMysticViewDirectionWS = normalize(cameraPosition - worldPosition.xyz);
    vec4 mvPosition = viewMatrix * worldPosition;
    vMysticEyeDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    vMysticScreenPosition = gl_Position;
  }
`, u = `
  precision highp float;

  uniform float uMysticTime;
  uniform float uMysticDetail;
  uniform float uMysticGammaBlendPass;
  uniform float uAlphaClipEnabled;
  uniform float uAlphaCutoff;
  uniform float uAlpha;
  uniform float uBrightness;
  uniform float uEmission;
  uniform float uEdgeWidth;
  uniform float uMatcapStrength;
  uniform float uMatcap2Strength;
  uniform float uRimShadow;
  uniform float uRimOffset;
  uniform float uTopMidOffset;
  uniform float uUv2Threshold;
  uniform float uUv1Alpha;
  uniform float uScaleNoise;
  uniform float uColorTime;
  uniform float uColorSwitch;
  uniform float uShadowAmount;
  uniform float uShadowSmoothness;
  uniform float uIndoor;
  uniform float uSnowOnTop;
  uniform float uOnPoisoned;
  uniform float uOnBurned;
  uniform float uAlphaEmission;
  uniform float uAlphaMainTex;
  uniform float uAlphaMainTexKeyword;
  uniform float uUnityGammaWorkflow;
  uniform float uMysticCameraIsOrthographic;
  uniform float uMysticCameraNear;
  uniform float uCelLength;
  uniform float uCelOffset;

  uniform vec4 uMainTexTransform;
  uniform vec4 uMaskTransform;
  uniform vec4 uBodyMaskTransform;
  uniform vec4 uEmissionTransform;
  uniform vec4 uColor0;
  uniform vec4 uColor1;
  uniform vec4 uColor2;
  uniform vec4 uTop;
  uniform vec4 uMid;
  uniform vec4 uBottom;
  uniform vec4 uRimColor;
  uniform vec4 uBaseColor;
  uniform vec4 uPrimaryColor;
  uniform vec4 uSecondaryColor;
  uniform vec4 uUv2Color;
  uniform vec4 uSolidColor;
  uniform vec4 uMasterColor;
  uniform vec4 uEmissionColor;
  uniform vec4 uTopMidStep;
  uniform vec4 uRimFalloff;
  uniform vec4 uVector0;
  uniform vec4 uVector1;
  uniform vec4 uVector2;
  uniform vec4 uVector3;
  uniform vec3 uMysticCameraViewDirectionWS;
  uniform vec3 uMainLightPosition;

  uniform sampler2D uMainTex;
  uniform sampler2D uMaskTex;
  uniform sampler2D uMatcapTex;
  uniform sampler2D uMatcap2Tex;
  uniform sampler2D uNoiseTex;
  uniform sampler2D uNoise2Tex;
  uniform sampler2D uNoise3Tex;
  uniform sampler2D uUv2Tex;
  uniform sampler2D uBodyMaskTex;
  uniform sampler2D uGradientTex;
  uniform sampler2D uEmissionTex;
  uniform sampler2D uDissolveTex;

  ${c}

  vec2 transformedUv(vec2 source, vec4 transform) {
    return source * transform.xy + transform.zw;
  }

  vec2 screenUv() {
    vec2 ndc = vMysticScreenPosition.xy / max(vMysticScreenPosition.w, 0.00001);
    return ndc * 0.5 + 0.5;
  }

  vec2 matcapUv() {
    return vMysticNormalVS.xy * 0.5 + 0.5;
  }

  vec3 addonViewDirectionWS() {
    if (uMysticCameraIsOrthographic > 0.5) {
      return normalize(uMysticCameraViewDirectionWS);
    }
    return normalize(cameraPosition - vMysticWorldPosition);
  }

  vec2 importedProceduralUv(vec2 source) {
    // Unity-import PNGs are vertically reflected during the deterministic
    // export. Mesh TEXCOORDs carry the matching glTF reflection, but generated
    // screen/view UVs do not, so compensate only at procedural samplers.
    return vec2(source.x, 1.0 - source.y);
  }

  float safeSmoothstep(float edge0, float edge1, float value) {
    if (abs(edge1 - edge0) < 0.000001) return step(edge0, value);
    float t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  vec3 unitySrgbToLinear(vec3 value) {
    vec3 low = value / 12.92;
    vec3 high = pow((max(value, vec3(0.0)) + 0.055) / 1.055, vec3(2.4));
    return mix(low, high, step(vec3(0.04045), value));
  }

  vec4 sampleFiveColorMysticGradient(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(1.0, 0.1970911, 0.0);
    vec3 c1 = vec3(1.0, 0.8276376, 0.0);
    vec3 c2 = vec3(0.4292929, 1.0, 0.0);
    vec3 c3 = vec3(0.3527098, 0.0, 1.0);
    vec3 c4 = vec3(1.0, 0.1960784, 0.0);
    if (t < 0.1566033) return vec4(mix(c0, c1, t / 0.1566033), 1.0);
    if (t < 0.3773556) return vec4(mix(c1, c2, (t - 0.1566033) / 0.2207523), 1.0);
    if (t < 0.6490577) return vec4(mix(c2, c3, (t - 0.3773556) / 0.2717021), 1.0);
    return vec4(mix(c3, c4, (t - 0.6490577) / 0.3509423), 1.0);
  }

  vec4 mysticMatcap() {
    return texture2D(uMatcapTex, importedProceduralUv(matcapUv())) * uMatcapStrength;
  }

  float mysticRim() {
    // URP GetWorldSpaceNormalizeViewDir is per-fragment and returns the camera
    // forward direction for orthographic cameras.
    float ndv = dot(normalize(vMysticNormalWS), addonViewDirectionWS());
    float rim = 1.0 - clamp(ndv + uRimOffset, 0.0, 1.0);
    return (1.0 - uRimShadow) * safeSmoothstep(uRimFalloff.x, uRimFalloff.y, rim);
  }

  float addonRim() {
    float ndv = dot(normalize(vMysticNormalWS), addonViewDirectionWS());
    float rim = 1.0 - clamp(ndv + uRimOffset, 0.0, 1.0);
    return (1.0 - uRimShadow) * safeSmoothstep(uRimFalloff.x, uRimFalloff.y, rim);
  }

  float dither8x8Bayer(vec2 pixelPosition) {
    float x = mod(floor(pixelPosition.x), 8.0);
    float y = mod(floor(pixelPosition.y), 8.0);
    if (y < 0.5) {
      if (x < 0.5) return 1.0 / 64.0; if (x < 1.5) return 49.0 / 64.0;
      if (x < 2.5) return 13.0 / 64.0; if (x < 3.5) return 61.0 / 64.0;
      if (x < 4.5) return 4.0 / 64.0; if (x < 5.5) return 52.0 / 64.0;
      if (x < 6.5) return 16.0 / 64.0; return 64.0 / 64.0;
    }
    if (y < 1.5) {
      if (x < 0.5) return 33.0 / 64.0; if (x < 1.5) return 17.0 / 64.0;
      if (x < 2.5) return 45.0 / 64.0; if (x < 3.5) return 29.0 / 64.0;
      if (x < 4.5) return 36.0 / 64.0; if (x < 5.5) return 20.0 / 64.0;
      if (x < 6.5) return 48.0 / 64.0; return 32.0 / 64.0;
    }
    if (y < 2.5) {
      if (x < 0.5) return 9.0 / 64.0; if (x < 1.5) return 57.0 / 64.0;
      if (x < 2.5) return 5.0 / 64.0; if (x < 3.5) return 53.0 / 64.0;
      if (x < 4.5) return 12.0 / 64.0; if (x < 5.5) return 60.0 / 64.0;
      if (x < 6.5) return 8.0 / 64.0; return 56.0 / 64.0;
    }
    if (y < 3.5) {
      if (x < 0.5) return 41.0 / 64.0; if (x < 1.5) return 25.0 / 64.0;
      if (x < 2.5) return 37.0 / 64.0; if (x < 3.5) return 21.0 / 64.0;
      if (x < 4.5) return 44.0 / 64.0; if (x < 5.5) return 28.0 / 64.0;
      if (x < 6.5) return 40.0 / 64.0; return 24.0 / 64.0;
    }
    if (y < 4.5) {
      if (x < 0.5) return 3.0 / 64.0; if (x < 1.5) return 51.0 / 64.0;
      if (x < 2.5) return 15.0 / 64.0; if (x < 3.5) return 63.0 / 64.0;
      if (x < 4.5) return 2.0 / 64.0; if (x < 5.5) return 50.0 / 64.0;
      if (x < 6.5) return 14.0 / 64.0; return 62.0 / 64.0;
    }
    if (y < 5.5) {
      if (x < 0.5) return 35.0 / 64.0; if (x < 1.5) return 19.0 / 64.0;
      if (x < 2.5) return 47.0 / 64.0; if (x < 3.5) return 31.0 / 64.0;
      if (x < 4.5) return 34.0 / 64.0; if (x < 5.5) return 18.0 / 64.0;
      if (x < 6.5) return 46.0 / 64.0; return 30.0 / 64.0;
    }
    if (y < 6.5) {
      if (x < 0.5) return 11.0 / 64.0; if (x < 1.5) return 59.0 / 64.0;
      if (x < 2.5) return 7.0 / 64.0; if (x < 3.5) return 55.0 / 64.0;
      if (x < 4.5) return 10.0 / 64.0; if (x < 5.5) return 58.0 / 64.0;
      if (x < 6.5) return 6.0 / 64.0; return 54.0 / 64.0;
    }
    if (x < 0.5) return 43.0 / 64.0; if (x < 1.5) return 27.0 / 64.0;
    if (x < 2.5) return 39.0 / 64.0; if (x < 3.5) return 23.0 / 64.0;
    if (x < 4.5) return 42.0 / 64.0; if (x < 5.5) return 26.0 / 64.0;
    if (x < 6.5) return 38.0 / 64.0; return 22.0 / 64.0;
  }

  float celCameraDepthDither() {
    float numerator = vMysticEyeDepth - uMysticCameraNear - uCelOffset;
    float depthFade = abs(uCelLength) < 0.000001
      ? step(0.0, numerator)
      : clamp(numerator / uCelLength, 0.0, 1.0);
    return step(dither8x8Bayer(gl_FragCoord.xy), clamp(depthFade * 1.00001, 0.0, 1.0));
  }

  vec3 axieBodyShade() {
    // Mystic_Final copies the Base V4 body graph, which consumes the raw
    // interpolated TransformObjectToWorldNormal varying here.
    vec3 normalWS = vMysticNormalWS;
    float lightDot = dot(vec3(-15.0, 80.0, -30.0), normalWS);
    float lightWeight = safeSmoothstep(-0.25, 0.55, lightDot);
    // IsGammaSpace() branches from the pinned Unity project. The linear-space
    // alternatives are 0.5209957 and 0.4633656 respectively.
    vec3 shaded = clamp(mix(uPrimaryColor.rgb, vec3(0.7490196) * uPrimaryColor.rgb, 1.0 - lightWeight), 0.0, 1.0);
    float ndv = dot(normalWS, addonViewDirectionWS());
    float fresnel = 0.2 * pow(1.0 - ndv, 5.0);
    float rimWeight = 0.6980392 * clamp(safeSmoothstep(0.9, 1.0, lightDot * fresnel), 0.0, 1.0);
    vec3 source = vec3(0.7106918);
    vec3 overlay = mix(shaded + 2.0 * (source - 0.5), shaded + 2.0 * source - 1.0, step(vec3(0.5), source));
    return clamp(mix(shaded, overlay, rimWeight), 0.0, 1.0);
  }
`, d = "\n    if (uMysticGammaBlendPass > 0.5) {\n      gl_FragColor = vec4(clamp(color, 0.0, 1.0), clamp(alpha, 0.0, 1.0));\n      return;\n    }\n    if (uUnityGammaWorkflow > 0.5) color = unitySrgbToLinear(color);\n    gl_FragColor = vec4(color, alpha);\n    #include <colorspace_fragment>\n  }\n";
function f(e) {
	return `${u}\nvoid main() {\n${e}\n${d}`;
}
function p(e) {
	return `${u}\n#include <packing>\nvoid main() {\n${e}\n  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;\n  gl_FragColor = packDepthToRGBA(gl_FragCoord.z);\n}\n`;
}
var m = f("\n  vec4 baseSample = texture2D(uMainTex, transformedUv(vMysticUv, uMainTexTransform));\n  vec2 viewUv = addonViewDirectionWS().xy;\n  vec2 noiseUv = viewUv * uVector0.xy + uMysticTime * uVector0.zw;\n  vec2 secondUv = viewUv * uVector1.xy + uMysticTime * uVector1.zw;\n  vec4 noise = texture2D(uNoiseTex, noiseUv) * texture2D(uNoise2Tex, secondUv) * uEmission;\n  vec4 noiseColor = mix(vec4(0.0), uColor0, noise);\n  vec4 surface = mix(uColor1, baseSample, mix(vec4(0.0), noiseColor, noiseColor));\n  float vertical = safeSmoothstep(uTopMidStep.x, uTopMidStep.y, vMysticObjectPosition.y + uTopMidOffset);\n  vec4 gradient = mix(uTop, uMid, vertical);\n  vec3 color = (surface * gradient * mysticMatcap()).rgb + addonRim() * uRimColor.rgb;\n  float alpha = uAlpha;\n  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;\n"), h = "\n  vec4 source = texture2D(uMainTex, transformedUv(vMysticUv, uMainTexTransform));\n  vec2 gradientUv = screenUv() * uVector0.xy + uMysticTime * uVector0.zw;\n  float vertical = safeSmoothstep(uTopMidStep.x, uTopMidStep.y, vMysticObjectPosition.y + uTopMidOffset);\n  vec4 verticalColor = mix(uTop, uBottom, vertical);\n  vec3 color = (uColor0 * source * uBrightness * texture2D(uGradientTex, gradientUv) * verticalColor).rgb;\n  color += addonRim() * uRimColor.rgb;\n", g = f(`
  ${h}
  color += texture2D(uEmissionTex, transformedUv(vMysticUv, uEmissionTransform)).rgb * uEmissionColor.rgb;
  color *= mysticMatcap().rgb;
  float alpha = source.a;
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), _ = f(`
  ${h}
  float alpha = source.a * vertical;
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), v = "\n  vec2 uv = transformedUv(vMysticUv, uMainTexTransform);\n  vec4 matcap = mysticMatcap();\n  vec4 baseSurface = texture2D(uMainTex, uv) * matcap + mysticRim() * uRimColor;\n\n  vec2 centeredScreen = (screenUv() * 2.0 - 1.0) * uScaleNoise;\n  vec2 noiseUv1 = centeredScreen * uVector0.xy + uMysticTime * uVector0.zw;\n  vec2 noiseUv2 = centeredScreen * uVector1.xy + uMysticTime * uVector1.zw;\n  vec4 animatedNoise = texture2D(uNoiseTex, importedProceduralUv(noiseUv1))\n    * texture2D(uNoise2Tex, importedProceduralUv(noiseUv2)) * uEmission * uMysticDetail;\n  vec4 noiseColor = mix(vec4(0.0), uColor0, animatedNoise);\n  vec4 layeredNoise = mix(uColor1, noiseColor, noiseColor);\n\n  float vertical = safeSmoothstep(uTopMidStep.x, uTopMidStep.y, vMysticObjectPosition.y + uTopMidOffset);\n  float movingGradientPhase = fract(uMysticTime * uColorTime + 0.5);\n  // The generated graph multiplies by float4(gradient.rgb, 0); moving color's\n  // arbitrary gradient alpha must not leak into later mixes.\n  vec4 movingColor = vec4(sampleFiveColorMysticGradient(movingGradientPhase).rgb * 11.98431, 0.0);\n  vec4 middle = mix(uMid, movingColor, step(0.5, uColorSwitch));\n  vec4 verticalColor = mix(uTop, middle, vertical);\n\n  vec2 noise3Uv = centeredScreen * uVector2.xy + uMysticTime * uVector2.zw;\n  // glTF TEXCOORD_1 and the imported texture are both V-reflected relative to\n  // Unity. Transport the authored velocity through that basis exactly once.\n  vec2 uv2Animated = vMysticUv2 + uMysticTime * vec2(uVector3.x, -uVector3.y);\n  vec4 uv2Mask = texture2D(uUv2Tex, uv2Animated);\n  vec4 inner = layeredNoise * verticalColor * matcap;\n  inner += mysticRim() * uRimColor;\n  inner += vec4(uColor2.rgb * texture2D(uNoise3Tex, importedProceduralUv(noise3Uv)).rgb, 0.0) * uMysticDetail;\n  vec4 uv2Matcap = vec4(texture2D(uMatcap2Tex, importedProceduralUv(matcapUv())).rgb * uMatcap2Strength * uUv2Color.rgb, 0.0);\n  vec4 special = mix(inner, uv2Matcap, 1.0 - step(uv2Mask.r, uUv2Threshold));\n  vec4 mysticSurface = mix(baseSurface, special, texture2D(uMaskTex, transformedUv(vMysticUv, uMaskTransform)).r);\n", y = f(`
  ${v}
  vec3 color = mix(
    axieBodyShade(),
    mysticSurface.rgb,
    texture2D(uBodyMaskTex, transformedUv(vMysticUv, uBodyMaskTransform)).r
  );
  float alpha = mix(uUv1Alpha, 1.0, uv2Mask.r);
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), b = f(`
  ${v}
  vec3 color = mysticSurface.rgb;
  float alpha = mix(uUv1Alpha, 1.0, uv2Mask.r);
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), x = "\n  vec4 sampled = texture2D(uMainTex, transformedUv(vMysticUv, uMainTexTransform));\n  vec3 base = mix(sampled.rgb, uSolidColor.rgb, uSolidColor.a);\n  float lightDot = dot(vec3(0.0, 150.0, 200.0) * uMainLightPosition, vMysticNormalWS);\n  float toon = floor(safeSmoothstep(uShadowAmount, uShadowAmount + uShadowSmoothness, lightDot) * 128.0) / 128.0;\n  vec3 shaded = mix(base, base * toon, 0.25);\n  // IsGammaSpace() branches from the pinned Unity project. Linear-project\n  // alternatives are (1, .7681513, .5394797), (.6239606, .9911022,\n  // .9911022), (.1878208, .6444799, .03954625), and\n  // (.9911022, .1746475, .1412633).\n  shaded = mix(shaded, shaded * vec3(1.0, 0.8901961, 0.7607844), uIndoor);\n  float bottom = 1.0 - safeSmoothstep(-0.5, 0.5, vMysticObjectNormal.y);\n  vec3 snowy = mix(shaded, vec3(0.8117648, 0.9960785, 0.9960785), 0.6980392 * bottom);\n  shaded = mix(shaded, snowy, uSnowOnTop);\n  shaded = mix(shaded, vec3(0.4705883, 0.8235295, 0.2196079) * shaded, uOnPoisoned);\n  shaded = clamp(shaded, 0.0, 1.0);\n  shaded = mix(shaded, vec3(0.9960785, 0.454902, 0.4117647) * shaded, uOnBurned);\n", ee = f(`
  ${x}
  vec3 color = uMasterColor.rgb * clamp(shaded, 0.0, 1.0);
  float alpha = sampled.a * celCameraDepthDither();
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), te = f(`
  ${x}
  float emissionMask = texture2D(uEmissionTex, transformedUv(vMysticUv, uEmissionTransform)).r;
  vec2 panned = addonViewDirectionWS().xy * uVector1.xy + uMysticTime * uVector1.zw;
  vec3 emission = clamp(emissionMask, 0.0, 1.0) * texture2D(uNoise2Tex, panned).rgb * uEmissionColor.rgb;
  vec3 color = mix(uAlphaEmission, 1.0, 1.0 - emissionMask) * (shaded + emission) * mysticMatcap().rgb;
  float alpha = sampled.a * celCameraDepthDither();
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), S = "\n  vec2 panned = screenUv() * uVector0.xy + uMysticTime * uVector0.zw;\n  float diagonalA = abs(vMysticUv.x - vMysticUv.y);\n  float diagonalB = abs(vMysticUv.x - (1.0 - vMysticUv.y));\n  float starDistance = clamp(diagonalB / max(1.0 - diagonalA, 0.00001), 0.0, 1.0)\n    * clamp(diagonalA / max(1.0 - diagonalB, 0.00001), 0.0, 1.0);\n  // The source particle vertex stream packs Custom1.x into TEXCOORD0.z.\n  // PARTICLE_VERTEX_SHADER transports that exact channel as vMysticUv2.x.\n  float customWidth = (1.0 - 0.9) * vMysticUv2.x;\n  float fill = step(starDistance, customWidth);\n  vec4 result = texture2D(uMainTex, panned) * fill * uColor1;\n  result += (step(pow(starDistance, uEdgeWidth), customWidth) - fill) * uColor0 * vMysticColor;\n", ne = f(`
  ${S}
  vec3 color = result.rgb;
  float alpha = result.r;
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), C = "\n  vec2 mainUv = vMysticUv + vMysticUv0Zw + (vMysticUv * (uVector0.xy - 1.0)) + uMysticTime * uVector0.zw;\n  vec4 mainSample = texture2D(uMainTex, mainUv);\n  float vertical = clamp(0.5 * vMysticCustom0.y, 0.0, 0.5);\n  vec2 dissolveUv = vMysticUv * uVector1.xy + uMysticTime * uVector1.zw;\n  vec4 dissolveSample = texture2D(uDissolveTex, dissolveUv);\n  float dissolve = ((dissolveSample.r * dissolveSample.a - 0.1) / 1.0) + (1.0 - vMysticCustom0.x * 2.0);\n  float mask = safeSmoothstep(vertical, 1.0 - vertical, dissolve);\n  vec3 color = (mainSample * uBaseColor * vMysticColor).rgb;\n  float edge = safeSmoothstep(vertical, 1.0 - vertical, dissolve) - safeSmoothstep(vertical, 1.0 - vertical, dissolve);\n  color += vec3(edge);\n  float alpha = texture2D(uMaskTex, transformedUv(vMysticUv, uMaskTransform)).r * mainSample.a * vMysticColor.a * mask;\n", re = f(`
  ${C}
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), ie = f(`
  ${C}
  alpha *= mix(1.0, mainSample.r * mainSample.a, uAlphaMainTexKeyword);
  if (uAlphaClipEnabled > 0.5 && alpha < uAlphaCutoff) discard;
`), ae = p("\n  float alpha = uAlpha;\n"), oe = p("\n  float alpha = texture2D(uMainTex, transformedUv(vMysticUv, uMainTexTransform)).a;\n"), se = p("\n  float vertical = safeSmoothstep(uTopMidStep.x, uTopMidStep.y, vMysticObjectPosition.y + uTopMidOffset);\n  float alpha = texture2D(uMainTex, transformedUv(vMysticUv, uMainTexTransform)).a * vertical;\n"), w = p("\n  vec4 uv2Mask = texture2D(\n    uUv2Tex,\n    vMysticUv2 + uMysticTime * vec2(uVector3.x, -uVector3.y)\n  );\n  float alpha = mix(uUv1Alpha, 1.0, uv2Mask.r);\n"), T = p("\n  float alpha = texture2D(uMainTex, transformedUv(vMysticUv, uMainTexTransform)).a\n    * celCameraDepthDither();\n"), ce = p(`
  ${S}
  float alpha = result.r;
`), le = p(`
  ${C}
`), ue = p(`
  ${C}
  alpha *= mix(1.0, mainSample.r * mainSample.a, uAlphaMainTexKeyword);
`), de = Object.freeze([
	{
		guid: "29914acfa7bac4ad6a5c0a0766b2e83f",
		sourceName: "AxieMixer3D/AmplifyShaderPack/URP/Debuff_effect_rimlight",
		family: "debuff-rimlight",
		transparent: !0,
		side: n.FrontSide,
		depthWrite: !1,
		alphaTest: .5,
		outline: !0,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: m,
		depthFragmentShader: ae
	},
	{
		guid: "6e954fe247bda4462bff3e929106c439",
		sourceName: "AxieMixer3D/Mystic opaque",
		family: "mystic-opaque",
		transparent: !1,
		side: n.FrontSide,
		depthWrite: !0,
		alphaTest: 0,
		outline: !1,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: g,
		depthFragmentShader: oe
	},
	{
		guid: "f4a5ec39cbd0a480a981365aff803418",
		sourceName: "AxieMixer3D/Mystic trans",
		family: "mystic-transparent",
		transparent: !0,
		side: n.FrontSide,
		depthWrite: !1,
		alphaTest: 0,
		outline: !1,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: _,
		depthFragmentShader: se
	},
	{
		guid: "60164f492e4ea48b2ababdd12de37ef3",
		sourceName: "AxieMixer3D/Mystic_Final",
		family: "mystic-final",
		transparent: !1,
		side: n.FrontSide,
		depthWrite: !0,
		alphaTest: .5,
		outline: !0,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: y,
		depthFragmentShader: w
	},
	{
		guid: "9094d94677cc54675920ba39886d1aaf",
		sourceName: "AxieMixer3D/Mystic_Final_transparent",
		family: "mystic-final-transparent",
		transparent: !0,
		side: n.FrontSide,
		depthWrite: !1,
		alphaTest: .5,
		outline: !0,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: b,
		depthFragmentShader: w
	},
	{
		guid: "8eaeef9ff6b3f439ea90238799bb95d9",
		sourceName: "AxieMixer3D/S_Cel_Standard_Amplify",
		family: "cel-standard",
		transparent: !1,
		side: n.FrontSide,
		depthWrite: !0,
		alphaTest: .5,
		outline: !0,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: ee,
		depthFragmentShader: T
	},
	{
		guid: "d71704b2b22f84f7b828e9ef6e4d049f",
		sourceName: "AxieMixer3D/S_Cel_Standard_Amplify_Mystic_test",
		family: "cel-standard-mystic",
		transparent: !1,
		side: n.FrontSide,
		depthWrite: !0,
		alphaTest: .5,
		outline: !0,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: te,
		depthFragmentShader: T
	},
	{
		guid: "47061017283e64a83a6e8b82560df4ad",
		sourceName: "AxieMixer3D/Star",
		family: "star",
		transparent: !0,
		side: n.DoubleSide,
		depthWrite: !0,
		alphaTest: .5,
		outline: !1,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: ne,
		depthFragmentShader: ce
	},
	{
		guid: "11272c6e6444b4dbb9b53c043a520bc3",
		sourceName: "AxieMixer3D/ProjectT_VFX/disslove_mobile",
		family: "dissolve",
		transparent: !0,
		side: n.DoubleSide,
		depthWrite: !1,
		alphaTest: 0,
		outline: !1,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: re,
		depthFragmentShader: le
	},
	{
		guid: "f406d4489c4ab4c6984d69084e5b9b75",
		sourceName: "AxieMixer3D/ProjectT_VFX/disslove_mobile_stencil",
		family: "dissolve-stencil",
		transparent: !0,
		side: n.DoubleSide,
		depthWrite: !1,
		alphaTest: 0,
		outline: !1,
		depthOnly: !0,
		shadowCaster: !1,
		fragmentShader: ie,
		depthFragmentShader: ue
	}
]), E = new Map(de.map((e) => [e.guid, e]));
function D(e) {
	let t = E.get(e);
	if (!t) throw Error(`Unsupported Axie Mystic/VFX shader GUID: ${e}`);
	return t;
}
//#endregion
//#region src/mystic-source-catalog.generated.ts
var O = {
	sourceCommit: "public-content-v1",
	generatedAt: "2025-12-23T17:44:07+07:00",
	shaders: [
		{
			id: "29914acfa7bac4ad6a5c0a0766b2e83f",
			guid: "29914acfa7bac4ad6a5c0a0766b2e83f",
			name: "AxieMixer3D/AmplifyShaderPack/URP/Debuff_effect_rimlight",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Debuff_effect_rimlight.shader",
			sha256: "f4e12a36ef5eb7e4f5768fb4f9850e33008ca921fd6257198fb14e0576c0c3b5",
			materialCount: 0,
			properties: [
				"_AlphaCutoff",
				"_Color0",
				"_Color1",
				"_Emiss",
				"_EmissionColor",
				"_Float0",
				"_Gradient2",
				"_Main_tex",
				"_Matcap",
				"_Mid",
				"_ReceiveShadows",
				"_RimColor",
				"_RimFalloff",
				"_RimOffset",
				"_RimShadow",
				"_TextureSample2",
				"_Top",
				"_TopMid_Offset",
				"_TopMid_Step",
				"_matcap",
				"_outline",
				"_outlinecolor",
				"_secondNoise",
				"_second_noise",
				"_texcoord"
			],
			passes: [
				"ExtraPrePass",
				"Forward",
				"DepthOnly"
			],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Transparent\" \"Queue\"=\"Transparent\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForward\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !0,
			transparent: !0,
			defaults: {
				textures: {
					_Matcap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Main_tex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_TextureSample2: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_second_noise: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_RimOffset: .24,
					_RimShadow: 0,
					_matcap: 1.2,
					_TopMid_Offset: 0,
					_Emiss: 1,
					_outline: .1,
					_Float0: 0,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_RimColor: [
						0,
						.5549643,
						1,
						0
					],
					_RimFalloff: [
						0,
						0,
						0,
						0
					],
					_Color1: [
						.754717,
						0,
						0,
						1
					],
					_Top: [
						1,
						1,
						1,
						1
					],
					_Mid: [
						.3238292,
						.6415094,
						.2824255,
						1
					],
					_TopMid_Step: [
						-.04,
						1,
						0,
						0
					],
					_Color0: [
						1,
						.5759467,
						0,
						0
					],
					_Gradient2: [
						1,
						1,
						0,
						0
					],
					_secondNoise: [
						1,
						1,
						0,
						0
					],
					_outlinecolor: [
						0,
						0,
						0,
						0
					]
				}
			}
		},
		{
			id: "6e954fe247bda4462bff3e929106c439",
			guid: "6e954fe247bda4462bff3e929106c439",
			name: "AxieMixer3D/Mystic opaque",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic opaque.shader",
			sha256: "f1795f9b680ab0beb7b824e6ab737ab3b894baf018faeb186d656500733b3b20",
			materialCount: 0,
			properties: [
				"_AlphaClip",
				"_AlphaCutoff",
				"_Brightness",
				"_Color0",
				"_EmissionColor",
				"_GradientSreenspace",
				"_Matcap",
				"_ReceiveShadows",
				"_RimColor",
				"_RimFalloff",
				"_RimOffset",
				"_RimShadow",
				"_TextureSample0",
				"_Top",
				"_TopMid_Offset",
				"_TopMid_Step",
				"_Ztest",
				"_bot",
				"_emission",
				"_emissioncolor",
				"_gradientmap",
				"_matcap",
				"_stencil",
				"_texcoord"
			],
			passes: ["Forward", "DepthOnly"],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Opaque\" \"Queue\"=\"Geometry\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForward\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !0,
			transparent: !1,
			defaults: {
				textures: {
					_TextureSample0: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Matcap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_gradientmap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_emission: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_RimOffset: .24,
					_AlphaClip: 0,
					_stencil: 0,
					_matcap: 1.2,
					_RimShadow: 0,
					_Ztest: 2,
					_Brightness: 1,
					_TopMid_Offset: 0,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_RimColor: [
						0,
						.5549643,
						1,
						0
					],
					_Color0: [
						0,
						0,
						0,
						0
					],
					_RimFalloff: [
						0,
						0,
						0,
						0
					],
					_Top: [
						1,
						1,
						1,
						1
					],
					_GradientSreenspace: [
						1,
						1,
						0,
						0
					],
					_bot: [
						.3238292,
						.6415094,
						.2824255,
						1
					],
					_TopMid_Step: [
						-.04,
						1,
						0,
						0
					],
					_emissioncolor: [
						0,
						0,
						0,
						0
					]
				}
			}
		},
		{
			id: "f4a5ec39cbd0a480a981365aff803418",
			guid: "f4a5ec39cbd0a480a981365aff803418",
			name: "AxieMixer3D/Mystic trans",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic trans.shader",
			sha256: "6589d156b4a7f358592efad77395d866e8666c82ae038fd2b9a1b7444e397ebe",
			materialCount: 1,
			properties: [
				"_AlphaCutoff",
				"_Brightness",
				"_Color0",
				"_EmissionColor",
				"_GradientSreenspace",
				"_ReceiveShadows",
				"_RimColor",
				"_RimFalloff",
				"_RimOffset",
				"_RimShadow",
				"_TextureSample0",
				"_Top",
				"_TopMid_Offset",
				"_TopMid_Step",
				"_Ztest",
				"_bot",
				"_gradientmap",
				"_stencil",
				"_texcoord"
			],
			passes: ["Forward", "DepthOnly"],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Transparent\" \"Queue\"=\"Transparent\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForward\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !1,
			transparent: !0,
			defaults: {
				textures: {
					_TextureSample0: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_gradientmap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_RimOffset: .24,
					_stencil: 0,
					_RimShadow: 0,
					_Ztest: 2,
					_Brightness: 1,
					_TopMid_Offset: 0,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_RimColor: [
						0,
						.5549643,
						1,
						0
					],
					_Color0: [
						0,
						0,
						0,
						0
					],
					_RimFalloff: [
						0,
						0,
						0,
						0
					],
					_Top: [
						1,
						1,
						1,
						1
					],
					_GradientSreenspace: [
						1,
						1,
						0,
						0
					],
					_bot: [
						.3238292,
						.6415094,
						.2824255,
						1
					],
					_TopMid_Step: [
						-.04,
						1,
						0,
						0
					]
				}
			}
		},
		{
			id: "60164f492e4ea48b2ababdd12de37ef3",
			guid: "60164f492e4ea48b2ababdd12de37ef3",
			name: "AxieMixer3D/Mystic_Final",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Final.shader",
			sha256: "e3833439f6b944be03741379970ce2b3682644daba1cb837dc3c99b912b552bf",
			materialCount: 45,
			properties: /* @__PURE__ */ "_AlphaCutoff._Alpha_UV1._Color0._Color1._Color3._Color_Time._Color_UV2._Color_switch._Emiss._EmissionColor._Main_tex._Mask_MAP._Matcap._Matcap_UV2._Mid._Noise3_UVSPEED._NoiseMap_2._NoiseMap_2nd._NoiseMap_ViewDIr._NoiseMap_ViewDir._Noise_3._PrimaryColor._ReceiveShadows._RimColor._RimFalloff._RimOffset._RimShadow._Scale_Noisemap._SecondaryColor._Top._TopMid_Offset._TopMid_Step._UV2_speed._UV2_texture._UV2_thresholdalpha._maskmapcolorbody1._matcap._matcap_UV2._outline._outlinecolor._texcoord".split("."),
			passes: [
				"ExtraPrePass",
				"Forward",
				"DepthOnly"
			],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl",
				"Packages/com.unity.shadergraph/ShaderGraphLibrary/Functions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Opaque\" \"Queue\"=\"Geometry\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForwardOnly\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !0,
			transparent: !1,
			defaults: {
				textures: {
					_Matcap_UV2: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Matcap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Main_tex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_NoiseMap_ViewDir: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_NoiseMap_2nd: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_UV2_texture: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Mask_MAP: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Noise_3: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_maskmapcolorbody1: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_RimOffset: .24,
					_RimShadow: 0,
					_matcap: 1.2,
					_matcap_UV2: 1.2,
					_TopMid_Offset: .22,
					_Emiss: 1,
					_outline: .1,
					_Alpha_UV1: .6353748,
					_Scale_Noisemap: 1,
					_UV2_thresholdalpha: .6970711,
					_Color_switch: 1,
					_Color_Time: .5,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_RimColor: [
						0,
						.5549643,
						1,
						0
					],
					_RimFalloff: [
						0,
						0,
						0,
						0
					],
					_Color1: [
						.754717,
						0,
						0,
						1
					],
					_Top: [
						1,
						1,
						1,
						1
					],
					_Mid: [
						.3238292,
						.6415094,
						.2824255,
						1
					],
					_TopMid_Step: [
						-.04,
						1,
						0,
						0
					],
					_Color0: [
						1,
						.5759467,
						0,
						0
					],
					_NoiseMap_ViewDIr: [
						1,
						1,
						0,
						0
					],
					_NoiseMap_2: [
						1,
						1,
						0,
						0
					],
					_outlinecolor: [
						0,
						0,
						0,
						0
					],
					_UV2_speed: [
						.05,
						0,
						0,
						0
					],
					_Color_UV2: [
						1,
						.6320756,
						0,
						0
					],
					_Color3: [
						1,
						1,
						1,
						0
					],
					_Noise3_UVSPEED: [
						0,
						0,
						0,
						0
					],
					_PrimaryColor: [
						1,
						1,
						1,
						0
					],
					_SecondaryColor: [
						1,
						1,
						1,
						0
					]
				}
			}
		},
		{
			id: "9094d94677cc54675920ba39886d1aaf",
			guid: "9094d94677cc54675920ba39886d1aaf",
			name: "AxieMixer3D/Mystic_Final_transparent",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Final_transparent.shader",
			sha256: "f639c0292ef7e749725316e5921c4c2bd0e3d9787635ee094699fea48629fe90",
			materialCount: 1,
			properties: /* @__PURE__ */ "_AlphaCutoff._Alpha_UV1._Color0._Color1._Color3._Color_Time._Color_UV2._Color_switch._Emiss._EmissionColor._Main_tex._Mask_MAP._Matcap._Matcap_UV2._Mid._Noise3_UVSPEED._NoiseMap_2._NoiseMap_2nd._NoiseMap_ViewDIr._NoiseMap_ViewDir._Noise_3._ReceiveShadows._RimColor._RimFalloff._RimOffset._RimShadow._Scale_Noisemap._Top._TopMid_Offset._TopMid_Step._UV2_speed._UV2_texture._UV2_thresholdalpha._matcap._matcap_UV2._outline._outlinecolor._texcoord".split("."),
			passes: [
				"ExtraPrePass",
				"Forward",
				"DepthOnly"
			],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl",
				"Packages/com.unity.shadergraph/ShaderGraphLibrary/Functions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Transparent\" \"Queue\"=\"Transparent\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForwardOnly\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !0,
			transparent: !0,
			defaults: {
				textures: {
					_Matcap_UV2: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Matcap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Main_tex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_NoiseMap_ViewDir: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_NoiseMap_2nd: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_UV2_texture: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Mask_MAP: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Noise_3: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_RimOffset: .24,
					_RimShadow: 0,
					_matcap: 1.2,
					_matcap_UV2: 1.2,
					_TopMid_Offset: .22,
					_Emiss: 1,
					_outline: .1,
					_Alpha_UV1: 1,
					_Scale_Noisemap: 1,
					_UV2_thresholdalpha: .5,
					_Color_switch: 1,
					_Color_Time: .5,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_RimColor: [
						0,
						.5549643,
						1,
						0
					],
					_RimFalloff: [
						0,
						0,
						0,
						0
					],
					_Color1: [
						.754717,
						0,
						0,
						1
					],
					_Top: [
						1,
						1,
						1,
						1
					],
					_Mid: [
						.3238292,
						.6415094,
						.2824255,
						1
					],
					_TopMid_Step: [
						-.04,
						1,
						0,
						0
					],
					_Color0: [
						1,
						.5759467,
						0,
						0
					],
					_NoiseMap_ViewDIr: [
						1,
						1,
						0,
						0
					],
					_NoiseMap_2: [
						1,
						1,
						0,
						0
					],
					_outlinecolor: [
						0,
						0,
						0,
						0
					],
					_UV2_speed: [
						.05,
						0,
						0,
						0
					],
					_Color_UV2: [
						1,
						.6320756,
						0,
						0
					],
					_Color3: [
						1,
						1,
						1,
						0
					],
					_Noise3_UVSPEED: [
						0,
						0,
						0,
						0
					]
				}
			}
		},
		{
			id: "8eaeef9ff6b3f439ea90238799bb95d9",
			guid: "8eaeef9ff6b3f439ea90238799bb95d9",
			name: "AxieMixer3D/S_Cel_Standard_Amplify",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/S_Cel_Standard_Amplify.shader",
			sha256: "b8f707989d07ade7988acdc3ffde43304157f7f38a5f157db69e3b3c82b1cea7",
			materialCount: 0,
			properties: [
				"_AlphaCutoff",
				"_ColorTexture",
				"_EmissionColor",
				"_Indoor_",
				"_Length",
				"_Offset",
				"_OnBurned",
				"_OnPoisoned",
				"_ReceiveShadows",
				"_ShadowAmount",
				"_ShadowSmoothness",
				"_SnowOnTop",
				"_Solid_Color",
				"_Ztest",
				"_master_Color",
				"_outline",
				"_stencil",
				"_texcoord"
			],
			passes: [
				"ExtraPrePass",
				"Forward",
				"DepthOnly"
			],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Opaque\" \"Queue\"=\"Geometry\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForwardOnly\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !1,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !1,
			transparent: !1,
			defaults: {
				textures: {
					_ColorTexture: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_outline: .02,
					_ShadowAmount: 0,
					_ShadowSmoothness: .1,
					_stencil: 0,
					_Ztest: 2,
					_Length: 0,
					_Offset: 0,
					_Indoor_: 0,
					_SnowOnTop: 0,
					_OnPoisoned: 0,
					_OnBurned: 0,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_Solid_Color: [
						1,
						1,
						1,
						0
					],
					_master_Color: [
						1,
						1,
						1,
						0
					]
				}
			}
		},
		{
			id: "d71704b2b22f84f7b828e9ef6e4d049f",
			guid: "d71704b2b22f84f7b828e9ef6e4d049f",
			name: "AxieMixer3D/S_Cel_Standard_Amplify_Mystic_test",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/S_Cel_Standard_Amplify_Mystic_test.shader",
			sha256: "28cdb488780d26be10b576358fa857aa44be4e64f7e808f26be69d37215f3a48",
			materialCount: 0,
			properties: [
				"_AlphaCutoff",
				"_ColorTexture",
				"_EmissionColor",
				"_Indoor_",
				"_Length",
				"_Matcap",
				"_Offset",
				"_OnBurned",
				"_OnPoisoned",
				"_ReceiveShadows",
				"_ShadowAmount",
				"_ShadowSmoothness",
				"_SnowOnTop",
				"_Solid_Color",
				"_Ztest",
				"_alpha_emiss",
				"_emission",
				"_emissioncolor",
				"_emissnoise",
				"_matcap",
				"_outline",
				"_secondNoise",
				"_stencil",
				"_texcoord"
			],
			passes: [
				"ExtraPrePass",
				"Forward",
				"DepthOnly"
			],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Opaque\" \"Queue\"=\"Geometry\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForwardOnly\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !0,
			transparent: !1,
			defaults: {
				textures: {
					_ColorTexture: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Matcap: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_emission: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_emissnoise: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_outline: .02,
					_ShadowAmount: 0,
					_ShadowSmoothness: .1,
					_stencil: 0,
					_matcap: 1.2,
					_Ztest: 2,
					_Length: 0,
					_Offset: 0,
					_Indoor_: 0,
					_SnowOnTop: 0,
					_OnPoisoned: 0,
					_OnBurned: 0,
					_alpha_emiss: .87,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_Solid_Color: [
						1,
						1,
						1,
						0
					],
					_emissioncolor: [
						1,
						.6509433,
						.6509433,
						0
					],
					_secondNoise: [
						1,
						1,
						0,
						0
					]
				}
			}
		},
		{
			id: "47061017283e64a83a6e8b82560df4ad",
			guid: "47061017283e64a83a6e8b82560df4ad",
			name: "AxieMixer3D/Star",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Star.shader",
			sha256: "e2ddd44f10346c7fa52b39f895042f1427b633f6e092e9e912a757f9452cee2c",
			materialCount: 1,
			properties: [
				"_AlphaCutoff",
				"_Color0",
				"_Color1",
				"_EdgeWidth",
				"_EmissionColor",
				"_ReceiveShadows",
				"_TextureSample0",
				"_Vector0",
				"_Ztest",
				"_stencil"
			],
			passes: ["Forward", "DepthOnly"],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Transparent\" \"Queue\"=\"Transparent\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForward\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !1,
			transparent: !0,
			defaults: {
				textures: { _TextureSample0: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0],
					builtin: "white"
				} },
				floats: {
					_AlphaCutoff: .5,
					_EdgeWidth: 1.2,
					_stencil: 0,
					_Ztest: 2,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_Color0: [
						1,
						0,
						0,
						1
					],
					_Vector0: [
						1,
						1,
						0,
						0
					],
					_Color1: [
						1,
						1,
						1,
						1
					]
				}
			}
		},
		{
			id: "11272c6e6444b4dbb9b53c043a520bc3",
			guid: "11272c6e6444b4dbb9b53c043a520bc3",
			name: "AxieMixer3D/ProjectT_VFX/disslove_mobile",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/disslove_mobile.shader",
			sha256: "975cac15790d6b6b7ada066a619108bdf88f1187bd62f89ec283e2b3f3cf41b8",
			materialCount: 1,
			properties: [
				"_AlphaCutoff",
				"_BaseColor",
				"_DissolveTex",
				"_DissolveUV",
				"_EmissionColor",
				"_MainTex",
				"_Mask_alpha",
				"_ReceiveShadows",
				"_Ztest",
				"_maintexUV",
				"_texcoord"
			],
			passes: ["Forward", "DepthOnly"],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Transparent\" \"Queue\"=\"Transparent\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForwardOnly\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !1,
			transparent: !0,
			defaults: {
				textures: {
					_MainTex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_DissolveTex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Mask_alpha: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_Ztest: 2,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_BaseColor: [
						.6509434,
						.6509434,
						.6509434,
						1
					],
					_maintexUV: [
						1,
						1,
						0,
						0
					],
					_DissolveUV: [
						1,
						1,
						0,
						0
					]
				}
			}
		},
		{
			id: "f406d4489c4ab4c6984d69084e5b9b75",
			guid: "f406d4489c4ab4c6984d69084e5b9b75",
			name: "AxieMixer3D/ProjectT_VFX/disslove_mobile_stencil",
			path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/disslove_mobile_stencil.shader",
			sha256: "dc5c794754f74246750955a70b081f9863b101de175a5e13a57cdbf2e2737caa",
			materialCount: 1,
			properties: [
				"_AlphaCutoff",
				"_BaseColor",
				"_DissolveTex",
				"_DissolveUV",
				"_EmissionColor",
				"_MainTex",
				"_Mask_alpha",
				"_ReceiveShadows",
				"_Ztest",
				"_alphamaintex",
				"_maintexUV",
				"_stencil",
				"_texcoord"
			],
			passes: ["Forward", "DepthOnly"],
			includes: [
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/Filtering.hlsl",
				"Packages/com.unity.render-pipelines.core/ShaderLibrary/UnityInstancing.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl",
				"Packages/com.unity.render-pipelines.universal/ShaderLibrary/ShaderGraphFunctions.hlsl"
			],
			tags: [
				" \"RenderPipeline\"=\"UniversalPipeline\" \"RenderType\"=\"Transparent\" \"Queue\"=\"Transparent\" \"UniversalMaterialType\"=\"Unlit\" ",
				" \"LightMode\"=\"UniversalForwardOnly\" ",
				" \"LightMode\"=\"DepthOnly\" "
			],
			usesTime: !0,
			usesSceneDepth: !1,
			usesSceneNormals: !1,
			usesMatcap: !1,
			transparent: !0,
			defaults: {
				textures: {
					_MainTex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_DissolveTex: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_Mask_alpha: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					},
					_texcoord: {
						guid: "",
						path: "",
						scale: [1, 1],
						offset: [0, 0],
						builtin: "white"
					}
				},
				floats: {
					_AlphaCutoff: .5,
					_stencil: 0,
					_Ztest: 2,
					_alphamaintex: 0,
					_ReceiveShadows: 1
				},
				colors: {
					_EmissionColor: [
						1,
						1,
						1,
						1
					],
					_BaseColor: [
						.6509434,
						.6509434,
						.6509434,
						1
					],
					_maintexUV: [
						1,
						1,
						0,
						0
					],
					_DissolveUV: [
						1,
						1,
						0,
						0
					]
				}
			}
		}
	],
	materials: [
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Back_M/Model.mat",
			guid: "09ed6d044575940f1859213f7c0f926a",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "018dba83ac1ea46e7afd455857aa4178",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_BackA.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "5e41a0d5b253e4ca0aa974ce8d3cd872",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 2.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "58969159d95c645bdaaf83b282565ef2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_Noise14.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "ca942799ca6504e6c8be97f95da22f22",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back copy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 7,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .15,
				_RimRampOffsetExp2: 1,
				_RimShadow: .824,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .21,
				_UV2_thresholdalpha: .37,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: .6,
				_matcap_UV2: 4,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.9080149,
					1.2381196,
					1.2392651,
					1
				],
				_Color1: [
					0,
					.46226418,
					.38431373,
					1
				],
				_Color3: [
					.42745098,
					.5561336,
					.6431373,
					0
				],
				_Color_UV2: [
					1,
					.88842875,
					.44025153,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					0,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.85,
					.64,
					.01,
					-.02
				],
				_NoiseMap_2: [
					2,
					2,
					-.05,
					.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.06,
					-.03
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					47.20823,
					88.552734,
					238.2893,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					4.48,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.061706375,
					.6132076,
					.4795103,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					-.2,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					0,
					.1841052,
					.26415092,
					0
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Ear_L/Model.mat",
			guid: "21ec654a2608740fba7b22c592b4ff17",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "bb0933c94f76d4dd78d3b5f0c0207a0d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "01232d386213d4cc798f72fffc688036",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "427b2e648daf8432bb6e22fd7d7bdb22",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "9a5d54b4b253740fa968a9a86370c4ef",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "7ab9d9075130b41aaa6d360dd8c8978c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "01232d386213d4cc798f72fffc688036",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .04,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .68,
				_UV2_thresholdalpha: .138,
				_UVSec: 0,
				_ZWrite: 1,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .65,
				_matcap: 1.5,
				_matcap_UV2: 1.65,
				_outline: .02,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					3.9533494,
					2.8422194,
					0,
					1
				],
				_Color1: [
					.21404411,
					.33778298,
					.3679245,
					1
				],
				_Color3: [
					.5395181,
					1.2167859,
					1.1669524,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_Mid: [
					0,
					1.310947,
					27.857622,
					1
				],
				_Noise3_UVSPEED: [
					.4,
					.15,
					.005,
					-.01
				],
				_NoiseMap_2: [
					1,
					1,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.01,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					17.858961,
					61.729897,
					30.068464,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.3391623,
					1.1353015,
					1.0965462,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_emissioncolor: [
					2.007608,
					.6988423,
					0,
					1
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.10134088,
					.32617384,
					.5754717,
					0
				],
				_secondNoise: [
					11.1,
					20,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Ear_R/Model.mat",
			guid: "753ddf31616714ef5962b880d5f31fd3",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "bb0933c94f76d4dd78d3b5f0c0207a0d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "01232d386213d4cc798f72fffc688036",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "427b2e648daf8432bb6e22fd7d7bdb22",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "9a5d54b4b253740fa968a9a86370c4ef",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "7ab9d9075130b41aaa6d360dd8c8978c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "01232d386213d4cc798f72fffc688036",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .04,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .68,
				_UV2_thresholdalpha: .138,
				_UVSec: 0,
				_ZWrite: 1,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .65,
				_matcap: 1.5,
				_matcap_UV2: 1.65,
				_outline: .02,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					3.9533494,
					2.8422194,
					0,
					1
				],
				_Color1: [
					.21404411,
					.33778298,
					.3679245,
					1
				],
				_Color3: [
					.5395181,
					1.2167859,
					1.1669524,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_Mid: [
					0,
					1.310947,
					27.857622,
					1
				],
				_Noise3_UVSPEED: [
					.4,
					.15,
					.005,
					-.01
				],
				_NoiseMap_2: [
					1,
					1,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.01,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					17.858961,
					61.729897,
					30.068464,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.3391623,
					1.1353015,
					1.0965462,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_emissioncolor: [
					2.007608,
					.6988423,
					0,
					1
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.10134088,
					.32617384,
					.5754717,
					0
				],
				_secondNoise: [
					11.1,
					20,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Eye_M/Model.mat",
			guid: "f07b3ec5d0c5c44199fd7e3790a3c8d0",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_ColorTexture: {
					guid: "541ee668a3fbe44db9d36d96f8fe42e3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "541ee668a3fbe44db9d36d96f8fe42e3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "2e769c6a3895742c19c29f03d6b00b12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_eye 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "e4bf2cab0866548c789b11bc53b4c225",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "08630355ea0d24b39ac006a0349f9290",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Texture2D: {
					guid: "5c8ac6833e241d94c995045054dabf66",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "a36eac74f0cbd410e9c642ff3991ca41",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_eye.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "1ef4da0f616fb4e258c489c4cddc6da3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Color_Time: .1,
				_Color_switch: 0,
				_Emiss: 41.9,
				_Indoor: .5,
				_Indoor_: 0,
				_Length: 0,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_QueueControl: 1,
				_ReceiveShadows: 1,
				_RimOffset: .82,
				_RimShadow: .902,
				_Scale_Noisemap: 1,
				_ShadeAmount: 0,
				_ShadeIntensity: .8,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SnowOnTop: 0,
				_TopMid_Offset: .17,
				_UV2_thresholdalpha: .104,
				_Ztest: 2,
				_alpha_emiss: .87,
				_matcap: 1.4,
				_matcap_UV2: 2.7,
				_outline: .02,
				_stencil: 3
			},
			colors: {
				_Color0: [
					2.6390157,
					.6390067,
					.6390067,
					1
				],
				_Color1: [
					.9622642,
					.9622642,
					.9622642,
					1
				],
				_Color3: [
					.659754,
					0,
					.3391956,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_LightDir: [
					0,
					301.4,
					227.1,
					0
				],
				_Mid: [
					1.1272641,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.4,
					.4,
					.1,
					-.1
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					3,
					2,
					0,
					-.02
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_Top: [
					.047169805,
					0,
					0,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_emissioncolor: [
					1,
					.6509433,
					.6509433,
					0
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					1,
					1,
					0,
					0
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Horn_L/Model.mat",
			guid: "b72a01aebbb0a4944a71fa7b07eaca4e",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "2dcdfc7b7df464998951412dfb3c8f21",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Horn_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "e30acd759c45147e1b75f5b3737182bb",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Horn 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "58969159d95c645bdaaf83b282565ef2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_Noise14.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "a35b6fd60f4624b26bd9c316ab7f60ee",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Horn.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .709,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 9.3,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .16,
				_RimRampOffsetExp2: 1,
				_RimShadow: .94,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .36,
				_UV2_thresholdalpha: .453,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 1.3,
				_matcap_UV2: 3,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.54402506,
					.6774812,
					1,
					1
				],
				_Color1: [
					.7764706,
					.8745098,
					1,
					1
				],
				_Color3: [
					.38865712,
					1.0604787,
					.9426496,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					6,
					6,
					0,
					.03
				],
				_Mid: [
					2.2770147,
					3.577533,
					6.6430373,
					1
				],
				_Noise3_UVSPEED: [
					1.47,
					.71,
					0,
					-.03
				],
				_NoiseMap_2: [
					3,
					2,
					-.05,
					.1
				],
				_NoiseMap_ViewDIr: [
					2,
					2,
					.05,
					-.1
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					37.30728,
					51.24245,
					66.59524,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.16666657,
					.3413978,
					1,
					1
				],
				_TopMid_Step: [
					.3,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.2735849,
					.2429594,
					.2133618,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.5
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Horn_R/Model.mat",
			guid: "a78374165068147eeb00b6f70a19eba3",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "2dcdfc7b7df464998951412dfb3c8f21",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Horn_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "e30acd759c45147e1b75f5b3737182bb",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Horn 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "58969159d95c645bdaaf83b282565ef2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_Noise14.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "a35b6fd60f4624b26bd9c316ab7f60ee",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Horn.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .709,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10.24,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .25,
				_RimRampOffsetExp2: 1,
				_RimShadow: .94,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.86,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.95,
				_UV2_thresholdalpha: .453,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 1.3,
				_matcap_UV2: 3,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					1,
					1,
					1
				],
				_Color1: [
					1,
					.8301518,
					.7764706,
					1
				],
				_Color3: [
					.97504735,
					.97504735,
					.97504735,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					5,
					0,
					.03
				],
				_Mid: [
					6.6430373,
					2.2955,
					3.4387243,
					1
				],
				_Noise3_UVSPEED: [
					1.47,
					.71,
					0,
					-.03
				],
				_NoiseMap_2: [
					3,
					2,
					-.05,
					.1
				],
				_NoiseMap_ViewDIr: [
					2,
					2,
					.05,
					-.1
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					766.9961,
					766.9961,
					766.9961,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.30980393,
					.06666667,
					.27890027,
					1
				],
				_TopMid_Step: [
					.3,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_maskmapcolorbody: [
					1,
					1,
					1,
					0
				],
				_outlinecolor: [
					.2735849,
					.2429594,
					.2133618,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.5
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Mouth_M/Model.mat",
			guid: "e281b77307a83448eb784d7c2bffbecb",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "5f25b139b90ee4eab8e5e8366518c3c8",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "5f25b139b90ee4eab8e5e8366518c3c8",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "58969159d95c645bdaaf83b282565ef2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_Noise14.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "ca29a7d1df2594aa197d8aee2a7015f3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Glow1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 5,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .1,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.52,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .94,
				_matcap: 1.5,
				_matcap_UV2: 1,
				_outline: .01,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					1,
					1,
					1
				],
				_Color1: [
					1,
					.8816814,
					.7798742,
					1
				],
				_Color3: [
					.33962262,
					.15525606,
					0,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_Mid: [
					.8584906,
					.22741523,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.1,
					.1,
					.05,
					-.05
				],
				_NoiseMap_2: [
					2,
					2,
					-.1,
					-.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					2.4335713,
					1.886893,
					1.6912553,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					.80950385,
					.27044016,
					1
				],
				_TopMid_Step: [
					-.1,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_emissioncolor: [
					2.1185472,
					.8042633,
					0,
					1
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					42.224255,
					0,
					0,
					0
				],
				_secondNoise: [
					9.3,
					92.45,
					-.1,
					.05
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Aquatic02_L1_Tail_M/Model.mat",
			guid: "defb265c3665c451cac57bb9b1b9cb6f",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "cfae17d285f234ba4ad7b7b4ddf54489",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "cfae17d285f234ba4ad7b7b4ddf54489",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "6fdf60581fd64482fac8f5549090edd6",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Tail 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "10750e92d166c4596942be23ba1b7043",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcapmetal.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "58969159d95c645bdaaf83b282565ef2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_Noise14.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "7e8a860ea76ed4965a39062054676c2c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Tail.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "d2fd20a4d68f54c0daf389fa2915b821",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Tail_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .19,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.1,
				_UV2_thresholdalpha: .117,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .82,
				_matcap: 3.5,
				_matcap_UV2: 2.9,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.20024908,
					.8490566,
					.39533016,
					1
				],
				_Color1: [
					.3443396,
					.45149183,
					1,
					1
				],
				_Color3: [
					.72462666,
					1.0717734,
					.7327361,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.5660378,
					.5660378,
					.5660378,
					1
				],
				_Noise3_UVSPEED: [
					.5,
					.5,
					.2,
					-.08
				],
				_NoiseMap_2: [
					2,
					2,
					.05,
					.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.01,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					2.0857036,
					19.698313,
					.540738,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					0,
					0,
					0,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.5263715,
					.18823496,
					1
				],
				_outlinecolor: [
					.028972205,
					.14150941,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Back_M/Model.mat",
			guid: "f8fd0e1d198424ccdb4b4732bc441159",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "e279033653d4b40ddbc11a95d514af71",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Back_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "fcb71900e3ac04ba4a1bc81048142a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Back_M_C 3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "9206b9ecd89c74eb686d554779450b02",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Back_Mark.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "bc432544c1a244224af60eb61da02d3e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/3463699_czyszy_gold-matcap-by-czyszy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "a9e1fb36b1d1345b58b7d4b5a5384d9e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "77b1eddd406604e49ba8790612792334",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Beast_Back_lv1_Goldenmask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "9ef48bcd07c4040f8bcafd3d64def0e7",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Back_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "01789ac37dfb24645bb0b6d356ad8534",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/mystic_bug_aqua_beast_lv1_mystic_beast_back_m_basecolor.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .603,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .89,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.28,
				_UV2_thresholdalpha: .648,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: 1.25,
				_matcap: 1.2,
				_matcap_UV2: 1.43,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					2.660705,
					1.8277957,
					5.992158,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.34383515,
					.35073075,
					.38364768,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					18,
					18,
					0,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.37756565,
					.31842086,
					.6289307,
					1
				],
				_Noise3_UVSPEED: [
					2,
					2,
					.05,
					-.05
				],
				_NoiseMap_2: [
					10,
					10,
					-.3,
					-.2
				],
				_NoiseMap_ViewDIr: [
					.7,
					.7,
					0,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					1.8902081,
					3.4736993,
					8.711399,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.54,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.64779866,
					.7560853,
					1,
					1
				],
				_TopMid_Step: [
					.6,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Ear_L/Model.mat",
			guid: "4fad14bceb63840afa5235b262f96440",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "6d306ed98d8e4457da882433918e0d76",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "de1e6a6a9d1a54ab390ea208a1df8a58",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "e14ffea2411c445a4881e44fe2c42ba9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Beast_Ear_lv1_Galaxymask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "3ed086a9612544933a2811add5a7fc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Beast_Ear_lv1_Goldmask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "2a74b3e8009004a26b17c3d31b205649",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Ear_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .557,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .89,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.08,
				_UV2_thresholdalpha: .526,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: 1.03,
				_matcap: 1.2,
				_matcap_UV2: 3,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					2.660705,
					1.8277957,
					5.992158,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.6981132,
					.54663575,
					.69485563,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.024296856,
					0,
					.08176088,
					1
				],
				_Noise3_UVSPEED: [
					.1,
					.1,
					.01,
					-.01
				],
				_NoiseMap_2: [
					5,
					5,
					-.3,
					-.2
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					0,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					1.8902081,
					3.4736993,
					8.711399,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.54,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1.2743465,
					2.0466006,
					2.5648243,
					1
				],
				_TopMid_Step: [
					.3,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					.21929504,
					.8441949,
					.9056604,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					15,
					15,
					0,
					.1
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Ear_R/Model.mat",
			guid: "8affa997198b94bc29473e2be070ca71",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "6d306ed98d8e4457da882433918e0d76",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "de1e6a6a9d1a54ab390ea208a1df8a58",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "e14ffea2411c445a4881e44fe2c42ba9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Beast_Ear_lv1_Galaxymask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "3ed086a9612544933a2811add5a7fc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Beast_Ear_lv1_Goldmask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "2a74b3e8009004a26b17c3d31b205649",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Ear_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .557,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .89,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .42,
				_UV2_thresholdalpha: .526,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: 1.03,
				_matcap: 1.2,
				_matcap_UV2: 3,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					2.660705,
					1.8277957,
					5.992158,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.6981132,
					.54663575,
					.69485563,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.024296856,
					0,
					.08176088,
					1
				],
				_Noise3_UVSPEED: [
					.1,
					.1,
					.01,
					-.01
				],
				_NoiseMap_2: [
					5,
					5,
					-.3,
					-.2
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					0,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					1.8902081,
					3.4736993,
					8.711399,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.54,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1.2743465,
					2.0466006,
					2.5648243,
					1
				],
				_TopMid_Step: [
					0,
					.3,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					.21929504,
					.8441949,
					.9056604,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					15,
					15,
					0,
					.1
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Eye_M/Model.mat",
			guid: "41fccdf89fc3b4e94a7f5bf58754356e",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "1f616c10a6be047979aabc0eaf161f3b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "d1866225a14af4a0ebf0b1fcb268c0e4",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Eyes_M_C 3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "1cb2221cfb437415f9ecafd8584c0da1",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Eyes_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "fa8e787f2c82c45558ae8424988d231b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 1.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "36553aa4979f047e592f5c5f6949f6ea",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise12 - Copy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "a9e1fb36b1d1345b58b7d4b5a5384d9e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "3ecc5cfada91c4542a66dd4a374b4110",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Eyes_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .98,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.3,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .78,
				_UV2_thresholdalpha: .982,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .8,
				_matcap: 1.23,
				_matcap_UV2: 4.12,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					.43618035,
					0,
					1
				],
				_Color1: [
					.408805,
					.408805,
					.408805,
					1
				],
				_Color3: [
					1,
					.4522524,
					0,
					0
				],
				_Color_UV2: [
					.7798742,
					.5511534,
					.1594082,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					18,
					18,
					0,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					4.9245777,
					2.4622884,
					2.4622884,
					1
				],
				_Noise3_UVSPEED: [
					.25,
					.1,
					-.1,
					-.3
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.54,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					79.3786,
					79.3786,
					79.3786,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					1,
					1,
					1
				],
				_TopMid_Step: [
					2,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					1.378962,
					.76767915,
					.013008861,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Horn_L/Model.mat",
			guid: "c5878487829354b8ab3d7dbfba0605ba",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "b7e63ca958a0d4382bb48c3781fe7b94",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "5e41a0d5b253e4ca0aa974ce8d3cd872",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 2.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "9a5d54b4b253740fa968a9a86370c4ef",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "68f95b1226ca54b698815a6ce66d4168",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_Contrast_High_Blurry_Grayscale_result.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "26f4ea0ed2a374fc1ab46628da56daad",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Horn_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "e46870b65c6b84b4d975481a4b63e721",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_smoke.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .62,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 40,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: -.09,
				_RimRampOffsetExp2: 1,
				_RimShadow: .937,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.4,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .28,
				_UV2_thresholdalpha: .64,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .82,
				_matcap: 1.06,
				_matcap_UV2: 2.5,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.27931425,
					.320016,
					1.153532,
					1
				],
				_Color1: [
					.7106918,
					.7106918,
					.7106918,
					1
				],
				_Color3: [
					.13409278,
					.16286612,
					.3773585,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					4,
					4,
					0,
					.01
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.40251565,
					.85472924,
					1,
					1
				],
				_Noise3_UVSPEED: [
					.23,
					-.4,
					.03,
					.03
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.3,
					-.02
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					0,
					-.05
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					5.656854,
					5.656854,
					5.656854,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					1,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1.0112644,
					1.0000044,
					1.319508,
					1
				],
				_TopMid_Step: [
					.6,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					1.26,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					.6752889,
					1.8770463,
					2.2138348,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					40,
					40,
					0,
					.3
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Horn_R/Model.mat",
			guid: "66c5a5ab2ef3845a183f7493d4a7fbcc",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "b7e63ca958a0d4382bb48c3781fe7b94",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "5e41a0d5b253e4ca0aa974ce8d3cd872",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 2.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "9a5d54b4b253740fa968a9a86370c4ef",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "68f95b1226ca54b698815a6ce66d4168",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_Contrast_High_Blurry_Grayscale_result.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "26f4ea0ed2a374fc1ab46628da56daad",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Horn_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "e46870b65c6b84b4d975481a4b63e721",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_smoke.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .62,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 40,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: -.09,
				_RimRampOffsetExp2: 1,
				_RimShadow: .937,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.4,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .45,
				_UV2_thresholdalpha: .64,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .82,
				_matcap: 1.06,
				_matcap_UV2: 2.5,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.27931425,
					.320016,
					1.153532,
					1
				],
				_Color1: [
					.7106918,
					.7106918,
					.7106918,
					1
				],
				_Color3: [
					.13409278,
					.16286612,
					.3773585,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					4,
					4,
					0,
					.01
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.40251565,
					.85472924,
					1,
					1
				],
				_Noise3_UVSPEED: [
					.23,
					-.4,
					.03,
					.03
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.3,
					-.02
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					0,
					-.05
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					5.656854,
					5.656854,
					5.656854,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					1,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1.0112644,
					1.0000044,
					1.319508,
					1
				],
				_TopMid_Step: [
					0,
					.6,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					1.26,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					.6752889,
					1.8770463,
					2.2138348,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					40,
					40,
					0,
					.3
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Mouth_M/Model.mat",
			guid: "6dfbc3d2ecab94e9daa9043371c88cc8",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "2cbc8bb0ca5ae41fcbf7aa12558d6014",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "e57dd3bfece19472f9209a85db17ee98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Mouth_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "31e739d8c6c094252a5bcd11d0dd92d4",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Mouth_M_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "36553aa4979f047e592f5c5f6949f6ea",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise12 - Copy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "ca29a7d1df2594aa197d8aee2a7015f3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Glow1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "78e5563384d4645879f7e987fba4f328",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Aqua_Beast_lv1_Mystic_Beast_Mouth_M_BaseColor.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .98,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 5,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.16,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .91,
				_matcap: 1.13,
				_matcap_UV2: 2.11,
				_outline: 0,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					4,
					1.7411765,
					0,
					1
				],
				_Color1: [
					.408805,
					.408805,
					.408805,
					1
				],
				_Color3: [
					1,
					.4522524,
					0,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_Mid: [
					34.29675,
					9.683788,
					1.6139647,
					1
				],
				_Noise3_UVSPEED: [
					.25,
					.1,
					-.1,
					-.3
				],
				_NoiseMap_2: [
					5,
					5,
					-.1,
					-.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					79.3786,
					79.3786,
					79.3786,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.49056602,
					.1974605,
					.1974605,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_emissioncolor: [
					2.1185472,
					.8042633,
					0,
					1
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					84.44851,
					28.452486,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.05
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Beast02_L1_Tail_M/Model.mat",
			guid: "cd658896f6cc74031bb467faf734371b",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "b7e63ca958a0d4382bb48c3781fe7b94",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "b73708edc64d14570b8e88e5c0d2e041",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Tail_M_C 3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "bc432544c1a244224af60eb61da02d3e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/3463699_czyszy_gold-matcap-by-czyszy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "d450127f1079c44738a1666544048567",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Beast_Tail_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .639,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .58,
				_RimRampOffsetExp2: 1,
				_RimShadow: .953,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: .6,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .03,
				_UV2_thresholdalpha: .272,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .82,
				_matcap: 1,
				_matcap_UV2: 1.65,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					2.2430549,
					1.4850366,
					7.4642644,
					1
				],
				_Color1: [
					.9716981,
					.9716981,
					.9716981,
					1
				],
				_Color3: [
					.19270824,
					.16666657,
					1,
					0
				],
				_Color_UV2: [
					1,
					.9058379,
					.75157225,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					8,
					8,
					0,
					.03
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.53865606,
					1,
					.39308167,
					1
				],
				_Noise3_UVSPEED: [
					1.4,
					1,
					.02,
					-.02
				],
				_NoiseMap_2: [
					5,
					5,
					-.15,
					-.02
				],
				_NoiseMap_ViewDIr: [
					2,
					2,
					0,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					511.99994,
					123.30888,
					274.4958,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.9891967,
					.78301877,
					1,
					1
				],
				_TopMid_Step: [
					.7,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					.6752889,
					1.8770463,
					2.2138348,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					40,
					40,
					0,
					.5
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Back_M/Model.mat",
			guid: "931610c0a64114d64950fb6c5d1510fc",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "10750e92d166c4596942be23ba1b7043",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcapmetal.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "784bd765e8b0d49078dbe7729633d9f5",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_GOLD.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "e4bf2cab0866548c789b11bc53b4c225",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "eb2e3a12d30cd46c899af96d3b52e0b5",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/aaa_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "eb7832722946c4a0c8b28a14b69c29d8",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 45,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: -.05,
				_RimRampOffsetExp2: 1,
				_RimShadow: .973,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2.31,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .13,
				_UV2_thresholdalpha: .5,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 2.74,
				_matcap_UV2: 2.11,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.6583276,
					1.0826467,
					1.7301507,
					1
				],
				_Color1: [
					.3816304,
					.53352314,
					.9056604,
					1
				],
				_Color3: [
					.15380149,
					.08449031,
					.3018868,
					0
				],
				_Color_UV2: [
					.7798742,
					.5511534,
					.1594082,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					5,
					.02,
					.02
				],
				_Mid: [
					0,
					1.0072114,
					1.9432058,
					1
				],
				_Noise3_UVSPEED: [
					.25,
					.2,
					-.1,
					0
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.3,
					-.03
				],
				_NoiseMap_ViewDIr: [
					.5,
					.5,
					-.012,
					-.012
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					10.233336,
					30.784996,
					141.48717,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.59119487,
					.20423579,
					.15430555,
					1
				],
				_TopMid_Step: [
					1.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.13074045,
					.14313567,
					.3679245,
					0
				],
				_secondNoise: [
					5,
					5,
					-.1,
					-.1
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Ear_L/Model.mat",
			guid: "194ac5519b3494dc4b4fdd30bc2c7471",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "1ef4da0f616fb4e258c489c4cddc6da3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "1ef4da0f616fb4e258c489c4cddc6da3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .7,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.79,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.6,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .5,
				_matcap: 1.2,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					5.9921575,
					.9913289,
					0,
					1
				],
				_Color1: [
					.83137256,
					.44313726,
					.5071568,
					1
				],
				_Color3: [
					.764151,
					0,
					.13658728,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					22.470287,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					-.17,
					.04,
					.1,
					.1
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.2,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					47.365074,
					36.724968,
					32.917233,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					6.3442197,
					1.6607906,
					0,
					1
				],
				_TopMid_Step: [
					0,
					-1.28,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					47.937256,
					.45223075,
					.45223075,
					1
				],
				_outlinecolor: [
					.3301887,
					.16824093,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Ear_R/Model.mat",
			guid: "39d16f5ce72de44bb9fd2d7a68dffbfd",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "1ef4da0f616fb4e258c489c4cddc6da3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "1ef4da0f616fb4e258c489c4cddc6da3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .7,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.79,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.8,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .5,
				_matcap: 1.2,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					5.9921575,
					.9913289,
					0,
					1
				],
				_Color1: [
					.83137256,
					.44313726,
					.5071568,
					1
				],
				_Color3: [
					.9056604,
					.09398352,
					.2400856,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					22.470287,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					-.17,
					.04,
					.1,
					.1
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.2,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					47.365074,
					36.724968,
					32.917233,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					13.991837,
					3.6296816,
					0,
					1
				],
				_TopMid_Step: [
					0,
					-1.28,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					47.937256,
					.45223075,
					.45223075,
					1
				],
				_outlinecolor: [
					.3301887,
					.16824093,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Eye_M/Model.mat",
			guid: "4f0762bc6b55c4fc69ce10a14df6a5ee",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_ColorTexture: {
					guid: "ffd1987f7e98d485e9cbb9fdb4434b02",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Horn_Eyes_C_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "ffd1987f7e98d485e9cbb9fdb4434b02",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Horn_Eyes_C_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "25cc20cd978cf4a54907ec46156a990a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Horn_Eyes_C_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "9a5d54b4b253740fa968a9a86370c4ef",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "e4bf2cab0866548c789b11bc53b4c225",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Texture2D: {
					guid: "5c8ac6833e241d94c995045054dabf66",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "1940a1b0a64cb44bd881bdd506ef3093",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Horn_Eyes_C_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Color_Time: .1,
				_Color_switch: 0,
				_Emiss: 41.9,
				_Indoor: .5,
				_Indoor_: 0,
				_Length: 0,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_QueueControl: 1,
				_ReceiveShadows: 1,
				_RimOffset: .82,
				_RimShadow: .902,
				_Scale_Noisemap: 2.83,
				_ShadeAmount: 0,
				_ShadeIntensity: .8,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SnowOnTop: 0,
				_TopMid_Offset: .13,
				_UV2_thresholdalpha: .564,
				_Ztest: 2,
				_matcap: 1.7,
				_matcap_UV2: 4.03,
				_outline: .02,
				_stencil: 3
			},
			colors: {
				_Color0: [
					1,
					1,
					1,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.0665914,
					.13695529,
					.57232696,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_LightDir: [
					0,
					301.4,
					227.1,
					0
				],
				_Mid: [
					.4923058,
					1.3432258,
					3.1949685,
					1
				],
				_Noise3_UVSPEED: [
					-.05,
					.04,
					.02,
					-.02
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.3,
					0,
					-.02
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					0,
					0,
					0,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_Top: [
					.06289297,
					.06289297,
					.06289297,
					1
				],
				_TopMid_Step: [
					.2,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Horn_T/Model.mat",
			guid: "b6e37f6d92e54479f8c32d35188c087a",
			name: "Model",
			shaderGuid: "9094d94677cc54675920ba39886d1aaf",
			shaderName: "AxieMixer3D/Mystic_Final_transparent",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "0bd0872edcc7b499282ff1df89b3965b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "10750e92d166c4596942be23ba1b7043",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcapmetal.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "70c5f4aab323048c6bf02ef0c7ea951d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Wind_Noise.tif",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "68f95b1226ca54b698815a6ce66d4168",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_Contrast_High_Blurry_Grayscale_result.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "e741196fa6a9a499daf13faabc9728c2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/star.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "eb7832722946c4a0c8b28a14b69c29d8",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .93,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 30,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: .813,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .22,
				_RimRampOffsetExp2: 1,
				_RimShadow: .964,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .66,
				_UV2_thresholdalpha: .35,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: .8,
				_matcap_UV2: 4.01,
				_outline: .016,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					2.608238,
					1.1323762,
					0,
					1
				],
				_Color1: [
					.6886792,
					.6886792,
					.6886792,
					1
				],
				_Color3: [
					.2506823,
					.41142103,
					.4716981,
					0
				],
				_Color_UV2: [
					1,
					.72660995,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					10,
					10,
					.03,
					.03
				],
				_Mid: [
					0,
					.8649022,
					13.76636,
					1
				],
				_Noise3_UVSPEED: [
					.05,
					.01,
					.01,
					-.01
				],
				_NoiseMap_2: [
					1,
					1,
					-.1,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.5,
					.5,
					-.01,
					-.01
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_RimColor: [
					280.706,
					323.01443,
					350.05692,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					4,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1.4368453,
					1.8880861,
					1.8880861,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					.075,
					-.25,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.21359912,
					.2261978,
					.33962262,
					0
				],
				_secondNoise: [
					10,
					10,
					-.1,
					-.1
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Horn_T/Model_2.mat",
			guid: "887798c0d5324472bbd81c9bf20e1f6a",
			name: "Model_2",
			shaderGuid: "f4a5ec39cbd0a480a981365aff803418",
			shaderName: "AxieMixer3D/Mystic trans",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "76546d87f297c44618c553b09558ddb1",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Back_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "e25b2007ad82e4c3fbc1d4c964abb261",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Mouth_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "c021e14a1ee0e4d25899826115517209",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/RainbowColors 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .706,
				_AlphaCutoff: .5,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: .75,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .98,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .02,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.6583276,
					1.0826467,
					1.7301507,
					1
				],
				_Color1: [
					.3443396,
					.45149183,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					5,
					5,
					-.5,
					.1
				],
				_Mid: [
					19.698313,
					0,
					0,
					1
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_RimColor: [
					79.3786,
					79.3786,
					79.3786,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.59119487,
					.20423579,
					.15430555,
					1
				],
				_TopMid_Step: [
					0,
					.2,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					22.363522,
					1.170865,
					0,
					1
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Mouth_M/Model.mat",
			guid: "28e73be4089eb436ca79086305f9e643",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "5f25b139b90ee4eab8e5e8366518c3c8",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "784bd765e8b0d49078dbe7729633d9f5",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_GOLD.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "36553aa4979f047e592f5c5f6949f6ea",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise12 - Copy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "ca29a7d1df2594aa197d8aee2a7015f3",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Glow1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .98,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.3,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .38,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .94,
				_matcap: 2.74,
				_matcap_UV2: 2.11,
				_outline: .02,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					.43618035,
					0,
					1
				],
				_Color1: [
					.408805,
					.408805,
					.408805,
					1
				],
				_Color3: [
					1,
					.4522524,
					0,
					0
				],
				_Color_UV2: [
					.7798742,
					.5511534,
					.1594082,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_Mid: [
					.57861626,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.25,
					.1,
					-.1,
					-.3
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.54,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					79.3786,
					79.3786,
					79.3786,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					1,
					1,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_emissioncolor: [
					2.1185472,
					.8042633,
					0,
					1
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					73.51668,
					6.582859,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.05
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bird02_L1_Tail_M/Model.mat",
			guid: "190fda4f378e8451cb340720c58fa3e7",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "0b596b03d83c54279a35f615b92e7bb4",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Tail_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "0b596b03d83c54279a35f615b92e7bb4",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Tail_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "bdff0a76519d94474a87511b62ed4a0a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Tail_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "e4bf2cab0866548c789b11bc53b4c225",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "9e4764572d3dc4c8cae160b37e2d2500",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "bdff0a76519d94474a87511b62ed4a0a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Tail_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 53.78,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 9.59,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 1.17,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .82,
				_matcap: 1.5,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					3.482202,
					.9837755,
					0,
					1
				],
				_Color1: [
					1,
					.7866159,
					.50628924,
					1
				],
				_Color3: [
					1,
					.2924527,
					.41892242,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					1.4980391,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					-.17,
					.04,
					.2,
					-.2
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					16,
					8.502773,
					6.2893066,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1.1486983,
					.7703036,
					.045046996,
					1
				],
				_TopMid_Step: [
					2,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					.3647059,
					.21176472,
					.10588236,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Back_M/Model.mat",
			guid: "e200ee6eb25df467da763618459d5d9a",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "9afddf31501a648fda0716ff83e0b742",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Back_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "10750e92d166c4596942be23ba1b7043",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcapmetal.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "e741196fa6a9a499daf13faabc9728c2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/star.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .01,
				_RimRampOffsetExp2: 1,
				_RimShadow: 0,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.36,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 0,
				_UV2_thresholdalpha: .6970711,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 1.94,
				_matcap_UV2: 4.26,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1.4443645,
					3.5011344,
					.48443332,
					1
				],
				_Color1: [
					.47776043,
					1,
					.43081754,
					1
				],
				_Color3: [
					.1509434,
					0,
					.036369182,
					0
				],
				_Color_UV2: [
					1,
					.72063136,
					.24213827,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					0,
					.17175804,
					.2924528,
					1
				],
				_Noise3_UVSPEED: [
					4.5,
					2.7,
					.05,
					-.1
				],
				_NoiseMap_2: [
					5,
					5,
					-.2,
					-.02
				],
				_NoiseMap_ViewDIr: [
					2,
					1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					107.14875,
					271.17407,
					70.98797,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					22.89,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.05161974,
					.5660378,
					.53065455,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					.15,
					.1,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.0053992886,
					.095509194,
					.13207549,
					0
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Ear_L/Model.mat",
			guid: "f28f0fdf7505b42a99dcd1a78059e53f",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "9dc85ed443b3d4d988d0cd0fb506be92",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Ear_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "9dc85ed443b3d4d988d0cd0fb506be92",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Ear_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "cdf746e79c56e45a584781c237e58653",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Bug_Ears_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "8f3e1ca506ae74a33bb0165199ca3189",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Ear_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 11.69,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 1.1,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 2,
				_matcap_UV2: 1.2,
				_outline: .01,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					0,
					0,
					0,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					1,
					.51548195,
					0,
					1
				],
				_Noise3_UVSPEED: [
					0,
					0,
					0,
					0
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.2,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					46.2369,
					34.75037,
					36.08063,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					24.251463,
					11.222245,
					0,
					1
				],
				_TopMid_Step: [
					0,
					1,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					.8207547,
					.40005335,
					.40005335,
					0
				],
				_secondNoise: [
					15,
					20,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Ear_R/Model.mat",
			guid: "8a83232bb44a742e5ac07a0f5c0e8abe",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "9dc85ed443b3d4d988d0cd0fb506be92",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Ear_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "9dc85ed443b3d4d988d0cd0fb506be92",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Ear_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "cdf746e79c56e45a584781c237e58653",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Bug_Ears_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "8f3e1ca506ae74a33bb0165199ca3189",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Ear_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 11.69,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 1.1,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 2,
				_matcap_UV2: 1.2,
				_outline: .01,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					0,
					0,
					0,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					1,
					.51548195,
					0,
					1
				],
				_Noise3_UVSPEED: [
					0,
					0,
					0,
					0
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.2,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					46.2369,
					34.75037,
					36.08063,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					24.251463,
					11.222245,
					0,
					1
				],
				_TopMid_Step: [
					0,
					1,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					.8207547,
					.40005335,
					.40005335,
					0
				],
				_secondNoise: [
					15,
					20,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Eye_M/Model.mat",
			guid: "d6ddbc445bebe4f1eb595175445186e4",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "5ba81478be9a540bca2698c7ec800c08",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Eyes_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "5ba81478be9a540bca2698c7ec800c08",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Eyes_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "eed65fcb0141d4ff7b864d8f45554d11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Eyes_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "68f95b1226ca54b698815a6ce66d4168",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_Contrast_High_Blurry_Grayscale_result.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "eed65fcb0141d4ff7b864d8f45554d11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Eyes_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "68f95b1226ca54b698815a6ce66d4168",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_Contrast_High_Blurry_Grayscale_result.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 12,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 11.69,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 3.33,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .6,
				_matcap: 1.9,
				_matcap_UV2: 1.2,
				_outline: .005,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					.21698111,
					.158983,
					.158983,
					1
				],
				_Color3: [
					1.6055582,
					.62101763,
					.62101763,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.74213827,
					.15979438,
					.03500643,
					1
				],
				_Noise3_UVSPEED: [
					.05,
					.05,
					-.1,
					-.1
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.2,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					46.2369,
					34.75037,
					36.08063,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					20.8659,
					2.7998254,
					0,
					1
				],
				_TopMid_Step: [
					.8,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					59.714115,
					14.682118,
					0,
					0
				],
				_secondNoise: [
					5,
					10,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Horn_L/Model.mat",
			guid: "6dd003af5216847c3850821ba314f778",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "389df56ca197b4cc4af31dc14bdd5e8c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Horn_M.002_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "389df56ca197b4cc4af31dc14bdd5e8c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Horn_M.002_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "50b972adbdb5d436096ccc98b430a61d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Bug_Horn_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "852482d9a1df8482b896980e7a2fd77d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Horn_M.002_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 11.69,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .95,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 2,
				_matcap_UV2: 1.2,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					0,
					0,
					0,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.1509434,
					.09320181,
					.08401565,
					1
				],
				_Noise3_UVSPEED: [
					0,
					0,
					0,
					0
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					2,
					1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					46.2369,
					34.75037,
					36.08063,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					20.8659,
					2.7998254,
					0,
					1
				],
				_TopMid_Step: [
					0,
					2,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					.58431375,
					.30980393,
					.015686275,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Horn_R/Model.mat",
			guid: "1f29e6747eef3435e9b3b9bf06d13b64",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "389df56ca197b4cc4af31dc14bdd5e8c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Horn_M.002_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "389df56ca197b4cc4af31dc14bdd5e8c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Horn_M.002_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "50b972adbdb5d436096ccc98b430a61d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Bug_Horn_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "852482d9a1df8482b896980e7a2fd77d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Horn_M.002_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 20,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 11.69,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .95,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 2,
				_matcap_UV2: 1.2,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					0,
					0,
					0,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.1509434,
					.09320181,
					.08401565,
					1
				],
				_Noise3_UVSPEED: [
					0,
					0,
					0,
					0
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					2,
					1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					46.2369,
					34.75037,
					36.08063,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					20.8659,
					2.7998254,
					0,
					1
				],
				_TopMid_Step: [
					0,
					1,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					.58431375,
					.30980393,
					.015686275,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Mouth_M/Model.mat",
			guid: "b452e6607264448f49006de7bc99c5b6",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "5a5c8b8ddb3d542548150941a553d1d9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "5a5c8b8ddb3d542548150941a553d1d9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "521c72997a0e54e6fb17eee98d63a8f6",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Bug_mouth_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "68f95b1226ca54b698815a6ce66d4168",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_Contrast_High_Blurry_Grayscale_result.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "cefdcfc35a2cf4669ad7e781263f14d8",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Mouth_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 100,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .884,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: -92.7,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.28,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .6,
				_matcap: 2,
				_matcap_UV2: 1.2,
				_outline: .01,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					.5345911,
					.5345911,
					.5345911,
					1
				],
				_Color3: [
					1.6055582,
					.62101763,
					.62101763,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.74213827,
					.15979438,
					.03500643,
					1
				],
				_Noise3_UVSPEED: [
					.05,
					.05,
					-.1,
					-.1
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					46.2369,
					34.75037,
					36.08063,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.67,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					20.8659,
					2.7998254,
					0,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					2,
					.52362174,
					0,
					0
				],
				_secondNoise: [
					10,
					15,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Bug02_L1_Tail_M/Model.mat",
			guid: "dd0a93f53110646e0913dbe18b7fd849",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "7b4001ea17a68403aa018ea628eace67",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "7b4001ea17a68403aa018ea628eace67",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "1428da5b218b94d3ea6c4c38766a88f9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Tail_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "fc5d4412f1be34f7f9e58698ca313a11",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Shared_Noise_Fire 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "1428da5b218b94d3ea6c4c38766a88f9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bug_Tail_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .26,
				_RimRampOffsetExp2: 1,
				_RimShadow: .91,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 11.69,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .22,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 1.7,
				_matcap_UV2: 1.2,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					8,
					4.4275246,
					.7215686,
					1
				],
				_Color1: [
					.5345911,
					.5345911,
					.5345911,
					1
				],
				_Color3: [
					.4716981,
					.27746683,
					.013349866,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.74213827,
					.15979438,
					.03500643,
					1
				],
				_Noise3_UVSPEED: [
					.1,
					.1,
					.04,
					-.1
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.2,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					61.729897,
					27.048933,
					19.023676,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					20.8659,
					2.7998254,
					0,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					.4528302,
					.011391919,
					.011391919,
					0
				],
				_secondNoise: [
					20,
					404.95,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Back_M/Model.mat",
			guid: "df5bb9a3f2e164dec9bfbf750c994f7a",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "b69c10f30dbcf4e09a658103613038fc",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_Toon 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "784bd765e8b0d49078dbe7729633d9f5",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_GOLD.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "805ebab05c5fe4cf6918732561c9b960",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Back_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 100,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .01,
				_RimRampOffsetExp2: 1,
				_RimShadow: .985,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.27,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .57,
				_UV2_thresholdalpha: .231,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 2,
				_matcap_UV2: 1.6,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					.50495213,
					.1603772,
					1
				],
				_Color1: [
					.9949212,
					0,
					1,
					1
				],
				_Color3: [
					.20754719,
					.20754719,
					.20754719,
					0
				],
				_Color_UV2: [
					1,
					.6313726,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					.16352195,
					0,
					.0718214,
					1
				],
				_Noise3_UVSPEED: [
					1,
					1,
					.02,
					-.02
				],
				_NoiseMap_2: [
					1,
					1,
					0,
					0
				],
				_NoiseMap_ViewDIr: [
					1.77,
					.8,
					.01,
					-.015
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					358.7387,
					130.2966,
					141.7073,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2.56,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.9622642,
					.49886182,
					.40396938,
					1
				],
				_TopMid_Step: [
					2,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.54509807,
					0,
					.20392159,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Ear_L/Model.mat",
			guid: "57b768004b5f041fca96dfcc2746ffe0",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "639449339703f4098865bd05a4917f23",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Ears_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "fab72db2422ab4a0dafcc2de0c542073",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Ears_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "db7b7873d3a034445b6999354925c34a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcapmetal 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "bc432544c1a244224af60eb61da02d3e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/3463699_czyszy_gold-matcap-by-czyszy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "9a8b4c1e5cac9424a88b6a77c395789a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/TheZaunDiva_Play_Noise_01_TX.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "fab72db2422ab4a0dafcc2de0c542073",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Ears_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 3,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .01,
				_RimRampOffsetExp2: 1,
				_RimShadow: 0,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 356.7,
				_UV2_thresholdalpha: .234,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 3.5,
				_matcap_UV2: 1.68,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					238.85646,
					142.67198,
					77.36542,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					1,
					1,
					1,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					.3490566,
					.021404423,
					.043380212,
					1
				],
				_Noise3_UVSPEED: [
					0,
					0,
					0,
					0
				],
				_NoiseMap_2: [
					1,
					1,
					.1,
					-.1
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.05,
					-.05
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					358.7387,
					197.77083,
					131.47493,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					22.89,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					2.9960785,
					1.5843138,
					.47058824,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.31764707,
					.12941177,
					.015686275,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Ear_R/Model.mat",
			guid: "43ed4ee1391a041289aaab4eb3ff9f96",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "639449339703f4098865bd05a4917f23",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Ears_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "fab72db2422ab4a0dafcc2de0c542073",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Ears_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "db7b7873d3a034445b6999354925c34a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcapmetal 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "bc432544c1a244224af60eb61da02d3e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/3463699_czyszy_gold-matcap-by-czyszy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "9a8b4c1e5cac9424a88b6a77c395789a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/TheZaunDiva_Play_Noise_01_TX.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "fab72db2422ab4a0dafcc2de0c542073",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Ears_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 2,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .01,
				_RimRampOffsetExp2: 1,
				_RimShadow: 0,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 5,
				_UV2_thresholdalpha: .234,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 3.5,
				_matcap_UV2: 1.68,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					238.85646,
					142.67198,
					77.36542,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					1,
					1,
					1,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					.3490566,
					.021404423,
					.043380212,
					1
				],
				_Noise3_UVSPEED: [
					0,
					0,
					0,
					0
				],
				_NoiseMap_2: [
					1,
					1,
					.1,
					-.1
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.05,
					-.05
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					358.7387,
					197.77083,
					131.47493,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					22.89,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					2.9960785,
					1.5843138,
					.47058824,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.31764707,
					.12941177,
					.015686275,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Eye_M/Model.mat",
			guid: "2c179ec2f5fda4cf895f15991f16ebbb",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "b21b6794a3a44459da6af6947620307d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "b21b6794a3a44459da6af6947620307d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "579612bac87934db381d16a2f6ae2566",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Eyes_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "fa8e787f2c82c45558ae8424988d231b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 1.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "36553aa4979f047e592f5c5f6949f6ea",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise12 - Copy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "9e4764572d3dc4c8cae160b37e2d2500",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "a5a6d594461c0405bbc9cdc738216d93",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Eyes_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .98,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.3,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 0,
				_UV2_thresholdalpha: .982,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 1.23,
				_matcap_UV2: 4.12,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					.43618035,
					0,
					1
				],
				_Color1: [
					.408805,
					.408805,
					.408805,
					1
				],
				_Color3: [
					1,
					.4522524,
					0,
					0
				],
				_Color_UV2: [
					.7798742,
					.5511534,
					.1594082,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					4.9245777,
					2.4622884,
					2.4622884,
					1
				],
				_Noise3_UVSPEED: [
					.25,
					.1,
					-.1,
					-.3
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.54,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					79.3786,
					79.3786,
					79.3786,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					1,
					1,
					1
				],
				_TopMid_Step: [
					2,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Eye_R/Model.mat",
			guid: "94c2b34b735a54e289fed12a602b635d",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "b21b6794a3a44459da6af6947620307d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "b21b6794a3a44459da6af6947620307d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "579612bac87934db381d16a2f6ae2566",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_Eyes_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "fa8e787f2c82c45558ae8424988d231b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 1.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "36553aa4979f047e592f5c5f6949f6ea",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise12 - Copy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "9e4764572d3dc4c8cae160b37e2d2500",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_3.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "a5a6d594461c0405bbc9cdc738216d93",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Eyes_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 10,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .28,
				_RimRampOffsetExp2: 1,
				_RimShadow: .98,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.3,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 0,
				_UV2_thresholdalpha: .804,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .7,
				_matcap: 1.23,
				_matcap_UV2: 4.12,
				_outline: .004,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					.43618035,
					0,
					1
				],
				_Color1: [
					.408805,
					.408805,
					.408805,
					1
				],
				_Color3: [
					1,
					.4522524,
					0,
					0
				],
				_Color_UV2: [
					.8962264,
					.6686201,
					.2761955,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					4.9245777,
					2.4622884,
					2.4622884,
					1
				],
				_Noise3_UVSPEED: [
					.25,
					.1,
					-.1,
					-.3
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.54,
					.1,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					119.42823,
					85.26011,
					48.07173,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					1.47,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					1,
					1,
					1
				],
				_TopMid_Step: [
					2,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					11.984314,
					1.0367738,
					.12549044,
					1
				],
				_outlinecolor: [
					48.502922,
					8.73286,
					0,
					0
				],
				_secondNoise: [
					20,
					30,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Horn_T/Model.mat",
			guid: "881cf11cbea3943728310d958114e067",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "42ae6e77070274e09be92f56c69ffb2a",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Horn_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "ad8809df79a694ba6aa6fa759ecfbd83",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "9a5d54b4b253740fa968a9a86370c4ef",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "cb79486bc7dde4d0fb8e3c57ab506336",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise69 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "58969159d95c645bdaaf83b282565ef2",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_Noise14.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "56aba078753534ea4b7fe93a599f8715",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Plant_Horn_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 5.09,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .2,
				_RimRampOffsetExp2: 1,
				_RimShadow: .917,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .22,
				_UV2_thresholdalpha: .231,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 1.8,
				_matcap_UV2: 5.3,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.54207367,
					.72327036,
					.52994335,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					0,
					0,
					0,
					0
				],
				_Color_UV2: [
					1,
					.6320756,
					0,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					6,
					6,
					0,
					.03
				],
				_Mid: [
					0,
					.42055616,
					.5283019,
					1
				],
				_Noise3_UVSPEED: [
					.1,
					.1,
					.02,
					-.02
				],
				_NoiseMap_2: [
					3,
					2,
					-.1,
					.1
				],
				_NoiseMap_ViewDIr: [
					2,
					2,
					.1,
					-.1
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					54.7885,
					137.187,
					63.715008,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2.56,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.4633683,
					.9607843,
					.4039216,
					1
				],
				_TopMid_Step: [
					.6,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.06140972,
					.27446532,
					.2830189,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.5
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Mouth_M/Model.mat",
			guid: "cd6eb9a14452f45879c10d26cd6cfa29",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "ad8809df79a694ba6aa6fa759ecfbd83",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 27.21,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .29,
				_RimRampOffsetExp2: 1,
				_RimShadow: .708,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2.31,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .28,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 3.9,
				_matcap_UV2: 2.11,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1.8014214,
					1.8014214,
					1.8014214,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.2924528,
					.098403916,
					.098403916,
					0
				],
				_Color_UV2: [
					.7798742,
					.5511534,
					.1594082,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					6,
					6,
					0,
					.03
				],
				_Mid: [
					.5660378,
					.062234525,
					0,
					1
				],
				_Noise3_UVSPEED: [
					1,
					1,
					-.1,
					0
				],
				_NoiseMap_2: [
					5,
					5,
					-.3,
					-.03
				],
				_NoiseMap_ViewDIr: [
					2,
					1,
					-.012,
					-.012
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					141.48717,
					40.751953,
					23.58118,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					4.01,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.6132076,
					.39178124,
					.16583596,
					1
				],
				_TopMid_Step: [
					.6,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.3301887,
					.1577157,
					0,
					0
				],
				_secondNoise: [
					20,
					20,
					0,
					.5
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Plant02_L1_Tail_M/Model.mat",
			guid: "2486b78c03f2246fc8721d678d057f1d",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "5e41a0d5b253e4ca0aa974ce8d3cd872",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 2.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d146919c06114461592c125d29c95807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "1cebb0ac2ac694745bbf2749d39c6064",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Plant_tail_mask_1 (1).png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 50,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .15,
				_RimRampOffsetExp2: 1,
				_RimShadow: .824,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .14,
				_UV2_thresholdalpha: .701,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: .8,
				_matcap_UV2: 2.49,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.9080149,
					1.2381196,
					1.2392651,
					1
				],
				_Color1: [
					.31132066,
					.9851897,
					1,
					1
				],
				_Color3: [
					0,
					0,
					0,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					0,
					.44206238,
					1,
					1
				],
				_Noise3_UVSPEED: [
					.2,
					.1,
					.01,
					-.02
				],
				_NoiseMap_2: [
					5,
					5,
					.05,
					-.05
				],
				_NoiseMap_ViewDIr: [
					2,
					1,
					.01,
					-.03
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					19.074507,
					95.87451,
					78.87762,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					4.48,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					0,
					1.2311444,
					.72808194,
					1
				],
				_TopMid_Step: [
					.6,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					.3,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.02284322,
					.1515763,
					.20754719,
					0
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Back_M/Model.mat",
			guid: "99812b3bd80c84938bf0c9303abb7cc0",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "1d8719b2ad8b545449f06e4068d14a80",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_back_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 80,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .01,
				_RimRampOffsetExp2: 1,
				_RimShadow: .676,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: 1.06,
				_UV2_thresholdalpha: .231,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 1.44,
				_matcap_UV2: 2.83,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					.1607843,
					.58650357,
					1,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.10062885,
					.07626274,
					.07626274,
					0
				],
				_Color_UV2: [
					.7484276,
					.7484276,
					.7484276,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					0,
					.17511794,
					.20754719,
					1
				],
				_Noise3_UVSPEED: [
					1,
					1,
					.02,
					-.02
				],
				_NoiseMap_2: [
					1,
					1,
					0,
					0
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					.03,
					-.03
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					8.784315,
					23.968628,
					20.763948,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2.56,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.4039216,
					.9607843,
					.8544947,
					1
				],
				_TopMid_Step: [
					2,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					0,
					.32941177,
					.42352945,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Ear_L/Model.mat",
			guid: "713f21240b1114e56ae669767a8eb4f9",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "6bd9873874f344d78b287f7696458b50",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "6bd9873874f344d78b287f7696458b50",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "ba1c16b4ef67640bdb161b1c2fb8ebc7",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_Ear_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "6e9093a9527e7471884bbf4c9c268255",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "ae03b143306be487d91ce568ad918edc",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_03 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 36.77,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .1,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.79,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .91,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .78,
				_matcap: 1.5,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					5.9921575,
					.9913289,
					0,
					1
				],
				_Color1: [
					.83137256,
					.6826938,
					.44313726,
					1
				],
				_Color3: [
					.48427665,
					.27244812,
					.09594154,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.06918234,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.5,
					.5,
					.05,
					-.05
				],
				_NoiseMap_2: [
					1,
					1,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.4,
					.4,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					2.4335713,
					1.886893,
					1.6912553,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					.85490197,
					.41960785,
					1
				],
				_TopMid_Step: [
					1,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					2.6082377,
					.7060005,
					.04096701,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					20,
					20,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Ear_R/Model.mat",
			guid: "8649c63babb044f1688192f95a76aad0",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "6bd9873874f344d78b287f7696458b50",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "6bd9873874f344d78b287f7696458b50",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Ear_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "ba1c16b4ef67640bdb161b1c2fb8ebc7",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_Ear_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "6e9093a9527e7471884bbf4c9c268255",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Ear_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "ae03b143306be487d91ce568ad918edc",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_03 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 36.77,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .1,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.79,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .17,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .78,
				_matcap: 1.5,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					5.9921575,
					.9913289,
					0,
					1
				],
				_Color1: [
					.83137256,
					.6826938,
					.44313726,
					1
				],
				_Color3: [
					.48427665,
					.27244812,
					.09594154,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.06918234,
					0,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.5,
					.5,
					.05,
					-.05
				],
				_NoiseMap_2: [
					1,
					1,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.4,
					.4,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					2.4335713,
					1.886893,
					1.6912553,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					.85490197,
					.41960785,
					1
				],
				_TopMid_Step: [
					0,
					1,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					2.6082377,
					.7060005,
					.04096701,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					20,
					20,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Eye_M/Model.mat",
			guid: "a0f1abb3dbf8b4f93b074efcc1ccf14b",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "3fa56e9ffe5564a6e8904dc75f871807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "3fa56e9ffe5564a6e8904dc75f871807",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Eyes_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "8dfa633408bad4bc8a2cb1aab929ced5",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_Eye_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "08630355ea0d24b39ac006a0349f9290",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "25187fdf7bb3b4df981670210fa464aa",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Eyes_M_C 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "9e9e6d9fba93c4db3a068d04cdd16ff9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Eyes_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "ae03b143306be487d91ce568ad918edc",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_03 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 41.9,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .82,
				_RimRampOffsetExp2: 1,
				_RimShadow: .902,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 1.47,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .28,
				_UV2_thresholdalpha: .763,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .54,
				_matcap: 1.4,
				_matcap_UV2: 2.18,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					1,
					1,
					1
				],
				_Color1: [
					1,
					1,
					1,
					1
				],
				_Color3: [
					.2316912,
					.26415217,
					1.2487767,
					0
				],
				_Color_UV2: [
					1,
					1,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					11.984314,
					2.2588236,
					1.882353,
					1
				],
				_Noise3_UVSPEED: [
					-.1,
					.1,
					.02,
					-.02
				],
				_NoiseMap_2: [
					1,
					1,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					1,
					1,
					0,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					1,
					1,
					1,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.18867922,
					0,
					0,
					1
				],
				_TopMid_Step: [
					.4,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					23.968632,
					2.385267,
					0,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					40,
					40,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Horn_T/Model.mat",
			guid: "a1939c0c2f11f46f08d0af92c762e11b",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "e3211b9713dcc4b1db7d12d23030c54b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/MatCap_ToonPlastic 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "ebac7a7e12a0a4af58442e31a087bb65",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/422509_C89536_824512_0A0604.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "d918cc8df59ed4447a2e9d1d569c758f",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/NoiseCell24 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "76b25163ed9e2456e9cdc3538fd3ab98",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Aqua_Back_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "77fa0ad38b5cb4f61b1e09e59cd1d154",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Noise_Hard_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "4ef7fb247367549779076ad693993edd",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_Horn_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_second_noise: {
					guid: "1108d1b4d480c43aca4a7e9ce383cb44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/FX_Noise_6.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaCutoff: .5,
				_Alpha_UV1: .6353748,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .5,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 40,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_IOR: 1.5,
				_InvFade: 1,
				_Keyword0: 1,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .01,
				_RimRampOffsetExp2: 1,
				_RimShadow: .962,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 2,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .27,
				_UV2_thresholdalpha: .231,
				_UVSec: 0,
				_ZWrite: 1,
				__dirty: 0,
				_matcap: 2,
				_matcap_UV2: 5.3,
				_outline: .02,
				_scale: 0
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					1,
					.50495213,
					.1603772,
					1
				],
				_Color1: [
					.8962264,
					.6059392,
					.65791357,
					1
				],
				_Color3: [
					.20754719,
					.20754719,
					.20754719,
					0
				],
				_Color_UV2: [
					1,
					.7769928,
					.39308167,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					5,
					4,
					-.01,
					.04
				],
				_Mid: [
					.6981132,
					0,
					.3054245,
					1
				],
				_Noise3_UVSPEED: [
					1,
					1,
					.02,
					-.02
				],
				_NoiseMap_2: [
					1,
					1,
					0,
					0
				],
				_NoiseMap_ViewDIr: [
					1.7,
					.5,
					.03,
					-.03
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					358.7387,
					130.2966,
					141.7073,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					0,
					2.56,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					.9622642,
					.49886182,
					.40396938,
					1
				],
				_TopMid_Step: [
					.6,
					0,
					0,
					0
				],
				_UV2_speed: [
					0,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_back: [
					0,
					0,
					0,
					0
				],
				_front: [
					1,
					1,
					1,
					1
				],
				_outlinecolor: [
					.54509807,
					0,
					.20392159,
					1
				],
				_secondNoise: [
					20,
					20,
					0,
					.6
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Mouth_M/Model.mat",
			guid: "940d5f7338d064fc68ac26691dde0a7f",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "46bd969980daf4b25bff4955a1fb41a9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "46bd969980daf4b25bff4955a1fb41a9",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Mouth_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "af45d3aad38eb4a4c897d548d0617b37",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_mouth_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "1b48ebb31e9ba4f75b0eb9b76078453e",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Mouth_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "ae03b143306be487d91ce568ad918edc",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_03 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 36.77,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .1,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.79,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: .21,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .5,
				_matcap: 1.5,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					5.9921575,
					.9913289,
					0,
					1
				],
				_Color1: [
					.83137256,
					.7932763,
					.44313726,
					1
				],
				_Color3: [
					.48427665,
					.27244812,
					.09594154,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.5849056,
					.26895523,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.5,
					.5,
					.05,
					-.05
				],
				_NoiseMap_2: [
					5,
					5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.4,
					.4,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					2.4335713,
					1.886893,
					1.6912553,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					.8560737,
					.41960788,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					9.644857,
					1.4407386,
					0,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					20,
					20,
					-.1,
					0
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/S01_Reptile02_L1_Tail_M/Model.mat",
			guid: "ff0eb4921a8ae4718b84a69b67a15a05",
			name: "Model",
			shaderGuid: "60164f492e4ea48b2ababdd12de37ef3",
			shaderName: "AxieMixer3D/Mystic_Final",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsRamp: {
					guid: "6f30dac5ca0eb004cada97d25c2cedf0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CloudsTexture: {
					guid: "50274c0a25037d844bfd8de798dd080d",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ColorTexture: {
					guid: "da297df91c3e84dd9b6c92e63dfa5ffb",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_CometsTexture: {
					guid: "d18f54fc546873440ac8e9582ce0b4d6",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DarkCloudsTexture: {
					guid: "ffbea5a011efcb74ca83e46d218f6e11",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_GalaxyTexture: {
					guid: "a2960ffde020f27409e070d92fb2e00b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Main_tex: {
					guid: "da297df91c3e84dd9b6c92e63dfa5ffb",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Tail_M_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_MAP: {
					guid: "705f698f9f66c445b81bf9748edfb433",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Reptile_tail_mask.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap: {
					guid: "22ca91f7ff46f4ee19f7130f33c56944",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/matcap_toon 3.jpg",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Matcap_UV2: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_2nd: {
					guid: "a72d69a53bd874fa19566b510e995499",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/singed_skin28_noise_11.skins_singed_skin28.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NoiseMap_ViewDir: {
					guid: "f0882567629a1403a8dc454ef0ed0d44",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_noise_star1 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise_3: {
					guid: "c8485cc3d91ef45aba4d12fd2d4ee741",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/galaxy.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_NormalTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseDistortionTexture: {
					guid: "228b6e0b7ad58884e9caae50c21fec16",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimNoiseTexture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_RimRamp: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SineBot_Normal: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_StarsTexture: {
					guid: "c6a539cb828048641a19ac6a2de109b2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunDistortionTexture: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunRamp: {
					guid: "256d86d8496a4e0f947100121f1fafb2",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTest: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_SunTexture: {
					guid: "8cd4d56f7d8bae94e8e8b3081e1fcd89",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "ca115789266844c8a8f2734d79e2dc12",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Bird_Ears_C.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample11: {
					guid: "c6c0eeac2acf4b87b4f6a3e437fc1de0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample13: {
					guid: "b17ee7d7b3064e71a219a093502d5193",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample2: {
					guid: "60d5d0d06d7b84892b2db747f0c9db0c",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_fx_star_2_Anhnh.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample3: {
					guid: "57da1409b06446499f488b2cc631b382",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample4: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample7: {
					guid: "e8276d11db3e4d7ea7b22c786790115e",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample8: {
					guid: "e0973bba0d1ef6f4f9d433ea19783ab0",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TopTexture0: {
					guid: "b74ab2df0efa4587a2684ac5201c036f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_UV2_texture: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emission: {
					guid: "d2bf5baac52db4da6be74088879da74b",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Mystic_Reptile_Tail_M_C 1.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_emissnoise: {
					guid: "ae03b143306be487d91ce568ad918edc",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_03 2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_kisspngspaceskyboxtexturemappingcubemappingnightsky5ac07d8380e2621165275515225644835279: {
					guid: "43b272ebb5485644f9edd04a1c827a8f",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_maskmapcolorbody1: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_554: 9.86,
				_A1: 0,
				_Alpha: 0,
				_AlphaClip: .782,
				_AlphaCutoff: .5,
				_Alpha_UV1: 1,
				_Brightness: 1,
				_BumpScale: 1,
				_ChomaticAberration: 0,
				_CloudOpacityExp: 2,
				_CloudsEmissionPower: 10,
				_CloudsOpacityExp: 1,
				_CloudsOpacityPower: 0,
				_CloudsRampOffsetExp: 1,
				_CloudsRampOffsetExp2: 1,
				_CloudsRampOffsetMultiply: 1,
				_CloudsRampTilingMultiply: 1,
				_CloudsRotationSpeed: -.04,
				_Color_Time: .1,
				_Color_switch: 0,
				_CometsDistortionAmount: 1,
				_CometsRotationSpeed: -.1,
				_Cutoff: .5,
				_DarkCloudsEdgesGlowClamp: 4,
				_DarkCloudsEdgesGlowExp: 1,
				_DarkCloudsEdgesGlowGB: 0,
				_DarkCloudsEdgesGlowPower: 10,
				_DarkCloudsEdgesGlowStyle: 0,
				_DarkCloudsEnabled: 0,
				_DarkCloudsLighten: 10,
				_DarkCloudsRotationSpeed: -.06,
				_DarkCloudsThicker: 1,
				_DetailNormalMapScale: 1,
				_DistortionAmount: .5,
				_DistortionExp: 1,
				_DistortionExp2: 1,
				_DstBlend: 0,
				_Emiss: 36.77,
				_Eta: -.25,
				_EtaAAEdgesFix: 0,
				_EtaEdgesFix: 0,
				_EtaFresnelExp: 2,
				_EtaFresnelExp2: 8,
				_Exp: 4,
				_FinalPower: 1.2,
				_FixMaybe: 0,
				_Float0: 1,
				_Float0df: .5,
				_Float1: 1,
				_Float12: .54,
				_Float13: 20,
				_Float14: 2,
				_Float15: 6,
				_Float2: 8,
				_Float28: 10,
				_Float29: -.25,
				_Float3: 1,
				_Float30: 6,
				_Float33: 6,
				_Float34: .5,
				_Float35: 6,
				_Float36: 20,
				_Float37: .75,
				_Float4: -.75,
				_Float5: .5,
				_Float6: 1,
				_Float7: -.5,
				_Float8: 1,
				_Float9: 2,
				_FresnelGlowExp: 4,
				_FresnelGlowExp2: 2,
				_FresnelGlowPower: 2,
				_FresnelMaskExp: 4,
				_FresnelMaskExp2: 4,
				_FresnelModeAddOrMultiply: 0,
				_GalaxyRotationSpeed: 0,
				_GalaxyTilingU: 1,
				_GalaxyTilingV: 1,
				_GlossMapScale: 0,
				_Glossiness: 0,
				_GlossyReflections: 0,
				_IOR: 1.5,
				_Indoor_: 0,
				_InvFade: 1,
				_Keyword0: 1,
				_Length: 0,
				_Metallic: 0,
				_Mode: 0,
				_NormalAmount: 0,
				_NormalSpherize: 0,
				_OcclusionStrength: 1,
				_Offset: 0,
				_OnBurned: 0,
				_OnPoisoned: 0,
				_Parallax: .005,
				_QueueControl: 1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionCA: 0,
				_RefractionExp: 1,
				_RefractionExp2: 1,
				_RefractionIOR: 1.5,
				_RefrectionCASecondMode: 1,
				_RimAddOrMultiply: .7,
				_RimEmissionPower: .7,
				_RimEnabled: 1,
				_RimExp: .9,
				_RimExp2: 3.27,
				_RimNoiseAmount: -.03,
				_RimNoiseCAAmount: .1,
				_RimNoiseCAEnabled: 0,
				_RimNoiseCARimMaskExp: 4,
				_RimNoiseCAU: .84,
				_RimNoiseCAV: 0,
				_RimNoiseDistortionAmount: .5,
				_RimNoiseDistortionScaleU: 2,
				_RimNoiseDistortionScaleV: 4,
				_RimNoiseDistortionScrollSpeed: .05,
				_RimNoiseDistortionTilingU: .25,
				_RimNoiseDistortionTilingV: 2,
				_RimNoiseNormalSpherize: 0,
				_RimNoiseRefraction: 1,
				_RimNoiseScrollSpeed: .05,
				_RimNoiseSpherize: 0,
				_RimNoiseTiling: .1,
				_RimNoiseTilingU: 1,
				_RimNoiseTilingV: .5,
				_RimNoiseToRefraction: 0,
				_RimNoiseTwistAmount: .02,
				_RimOffset: .1,
				_RimRampOffsetExp2: 1,
				_RimShadow: .925,
				_RotationClouds: 0,
				_RotationDarkClouds: 0,
				_RotationStars: 2.53,
				_Scale: 1,
				_Scale_Noisemap: 4.79,
				_ShadowAmount: .12,
				_ShadowSmoothness: 0,
				_SmoothnessTextureChannel: 0,
				_SnowOnTop: 0,
				_SpecularHighlights: 1,
				_SphericalDistortionAmount: 0,
				_SphericalDistortionExp: 1,
				_SrcBlend: 1,
				_StarsEmissionPower: 1.79,
				_StarsHueShift: 0,
				_StarsRotationSpeed: .4,
				_SunDistortionPower: -.25,
				_SunDistortionScrollSpeed: -.75,
				_SunDistortionTilingU: 3,
				_SunDistortionTilingV: .1,
				_SunEnabled: 0,
				_SunIOR: .5,
				_SunOpacityPower: 1,
				_SunPower: 7.5,
				_SunRampEnabled: 0,
				_SunRampOffsetExp2: 1,
				_SunRefractionExp: 1,
				_SunRefractionExp2: 1,
				_SunRefractionIOR: .5,
				_SunScale: 1,
				_TestIOR: .5,
				_TestPower: 7.5,
				_ToggleSwitch0: 0,
				_TopMid_Offset: -.16,
				_UV2_thresholdalpha: 1,
				_UVSec: 0,
				_ZWrite: 1,
				_ZWrite_mode: 0,
				_Ztest: 2,
				__dirty: 0,
				_alpha_emiss: .54,
				_matcap: 1.2,
				_matcap_UV2: 1,
				_outline: .02,
				_outlineoffset: .1,
				_scale: 0,
				_stencil: 3
			},
			colors: {
				_CloudsRampColorTint: [
					1,
					1,
					1,
					1
				],
				_Color: [
					1,
					1,
					1,
					1
				],
				_Color0: [
					5.9921575,
					.9913289,
					0,
					1
				],
				_Color1: [
					.83137256,
					.7932763,
					.44313726,
					1
				],
				_Color3: [
					.48427665,
					.27244812,
					.09594154,
					0
				],
				_Color_UV2: [
					.9207177,
					0,
					1,
					1
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_FresnelGlowColor: [
					1,
					1,
					1,
					1
				],
				_Gradient2: [
					29.6,
					22.88,
					.05,
					.05
				],
				_GradientSreenspace: [
					10,
					10,
					.1,
					.1
				],
				_Mid: [
					.5849056,
					.26895523,
					0,
					1
				],
				_Noise3_UVSPEED: [
					.2,
					.2,
					.05,
					-.05
				],
				_NoiseMap_2: [
					.5,
					.5,
					-.5,
					-.05
				],
				_NoiseMap_ViewDIr: [
					.3,
					.3,
					-.02,
					-.02
				],
				_Panner: [
					0,
					0,
					0,
					0
				],
				_PrimaryColor: [
					1,
					1,
					1,
					0
				],
				_RimColor: [
					2.4335713,
					1.886893,
					1.6912553,
					1
				],
				_RimEmissionColor: [
					1,
					1,
					1,
					1
				],
				_RimFalloff: [
					-.01,
					.2,
					0,
					0
				],
				_RimNoiseSpherizeCenter: [
					0,
					0,
					0,
					0
				],
				_RimNoiseSpherizePosition: [
					0,
					0,
					0,
					0
				],
				_RotationAxis: [
					0,
					2.72,
					1.56,
					0
				],
				_SecondaryColor: [
					1,
					1,
					1,
					0
				],
				_Solid_Color: [
					1,
					1,
					1,
					0
				],
				_SunColor: [
					1,
					0,
					0,
					1
				],
				_SunLocalPosition: [
					0,
					0,
					0,
					0
				],
				_SunRampColorTint: [
					1,
					1,
					1,
					1
				],
				_TestColor: [
					1,
					0,
					0,
					1
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Top: [
					1,
					.8560737,
					.41960788,
					1
				],
				_TopMid_Step: [
					.5,
					0,
					0,
					0
				],
				_UV2_speed: [
					.05,
					0,
					0,
					0
				],
				_Vector0: [
					2,
					4,
					0,
					0
				],
				_Vector2: [
					0,
					0,
					0,
					0
				],
				_Vector4: [
					0,
					0,
					0,
					0
				],
				_bot: [
					.730509,
					.82303286,
					.9559748,
					1
				],
				_emissioncolor: [
					3.6886053,
					.9613918,
					0,
					1
				],
				_outlinecolor: [
					0,
					0,
					0,
					0
				],
				_secondNoise: [
					40,
					40,
					-.1,
					.2
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Common_glow 9.mat",
			guid: "2afd34a7c47924e79a185ad7f12d882a",
			name: "Common_glow 9",
			shaderGuid: "11272c6e6444b4dbb9b53c043a520bc3",
			shaderName: "AxieMixer3D/ProjectT_VFX/disslove_mobile",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: ["DepthOnly", "SHADOWCASTER"],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BaseMap: {
					guid: "ad96f3f760d841c4381af313660757ce",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DissolveTex: {
					guid: "f3588a46892bd42ca8fe8862cfc3975d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Water_Screen_Noise_Soft2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Emi_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Flow: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "86efd6045804f4238a1f506de81ebe27",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_circle.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_alpha: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_AlphaClip: 0,
				_AlphaCutoff: .5,
				_Blend: 0,
				_BlendOp: 0,
				_CameraFadingEnabled: 0,
				_CameraFarFadeDistance: 2,
				_CameraNearFadeDistance: 1,
				_ColorMode: 0,
				_Cull: 2,
				_Cutoff: .5,
				_DistortionBlend: .5,
				_DistortionEnabled: 0,
				_DistortionStrength: 1,
				_DistortionStrengthScaled: .1,
				_DstBlend: 10,
				_Emission: 2,
				_FlipbookBlending: 0,
				_FlipbookMode: 0,
				_InvFade: 3,
				_Mode: 0,
				_Opacity: 1,
				_QueueControl: -1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_SoftParticlesEnabled: 0,
				_SoftParticlesFarFadeDistance: 1,
				_SoftParticlesNearFadeDistance: 0,
				_SrcBlend: 5,
				_Surface: 1,
				_Usecenterglow: 0,
				_ZWrite: 0,
				_Ztest: 2
			},
			colors: {
				_BaseColor: [
					4.237095,
					4.237095,
					4.237095,
					1
				],
				_BaseColorAddSubDiff: [
					0,
					0,
					0,
					0
				],
				_CameraFadeParams: [
					0,
					"Infinity",
					0,
					0
				],
				_Color: [
					23.968628,
					23.968628,
					23.968628,
					1
				],
				_Color0: [
					1,
					1,
					1,
					0
				],
				_Colore_Emiss: [
					1,
					1,
					1,
					0
				],
				_DissolveUV: [
					1,
					1,
					0,
					0
				],
				_DistortionSpeedXYPowerZ: [
					0,
					0,
					0,
					0
				],
				_EmissionColor: [
					1.9742731,
					5.487153,
					19.930758,
					1
				],
				_SoftParticleFadeParams: [
					0,
					0,
					0,
					0
				],
				_SpeedMainTexUVNoiseZW: [
					0,
					0,
					0,
					0
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Vector0: [
					1,
					1,
					0,
					0
				],
				_maintexUV: [
					1,
					1,
					0,
					0
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Common_glow_stencil.mat",
			guid: "a611aa47dbeec4fa6885d0cf1109a3c4",
			name: "Common_glow_stencil",
			shaderGuid: "f406d4489c4ab4c6984d69084e5b9b75",
			shaderName: "AxieMixer3D/ProjectT_VFX/disslove_mobile_stencil",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: ["DepthOnly", "SHADOWCASTER"],
			renderQueue: -1,
			enableInstancing: !1,
			doubleSidedGi: !1,
			textures: {
				_BaseMap: {
					guid: "ad96f3f760d841c4381af313660757ce",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DissolveTex: {
					guid: "f3588a46892bd42ca8fe8862cfc3975d",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Water_Screen_Noise_Soft2.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Emi_tex: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Flow: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "86efd6045804f4238a1f506de81ebe27",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/Tx_circle.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask_alpha: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_gradientmap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_AlphaClip: 0,
				_AlphaCutoff: .5,
				_Blend: 0,
				_BlendOp: 0,
				_CameraFadingEnabled: 0,
				_CameraFarFadeDistance: 2,
				_CameraNearFadeDistance: 1,
				_ColorMode: 0,
				_Cull: 2,
				_Cutoff: .5,
				_DistortionBlend: .5,
				_DistortionEnabled: 0,
				_DistortionStrength: 1,
				_DistortionStrengthScaled: .1,
				_DstBlend: 10,
				_Emission: 2,
				_FlipbookBlending: 0,
				_FlipbookMode: 0,
				_InvFade: 3,
				_Mode: 0,
				_Opacity: 1,
				_QueueControl: -1,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_SoftParticlesEnabled: 0,
				_SoftParticlesFarFadeDistance: 1,
				_SoftParticlesNearFadeDistance: 0,
				_SrcBlend: 5,
				_Surface: 1,
				_Usecenterglow: 0,
				_ZWrite: 0,
				_Ztest: 0,
				_alphamaintex: 0,
				_stencil: 1
			},
			colors: {
				_BaseColor: [
					6.498019,
					6.498019,
					6.498019,
					1
				],
				_BaseColorAddSubDiff: [
					0,
					0,
					0,
					0
				],
				_CameraFadeParams: [
					0,
					"Infinity",
					0,
					0
				],
				_Color: [
					23.968628,
					23.968628,
					23.968628,
					1
				],
				_Color0: [
					1,
					1,
					1,
					0
				],
				_Colore_Emiss: [
					1,
					1,
					1,
					0
				],
				_DissolveUV: [
					1,
					1,
					0,
					0
				],
				_DistortionSpeedXYPowerZ: [
					0,
					0,
					0,
					0
				],
				_EmissionColor: [
					1.9742731,
					5.487153,
					19.930758,
					1
				],
				_SoftParticleFadeParams: [
					0,
					0,
					0,
					0
				],
				_SpeedMainTexUVNoiseZW: [
					0,
					0,
					0,
					0
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Vector0: [
					1,
					1,
					0,
					0
				],
				_maintexUV: [
					1,
					1,
					0,
					0
				]
			}
		},
		{
			id: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/star_gradientmap_stecil_mysthic.mat",
			guid: "8e9ade9f4223c404b93d046cfdf68295",
			name: "star_gradientmap_stecil_mysthic",
			shaderGuid: "47061017283e64a83a6e8b82560df4ad",
			shaderName: "AxieMixer3D/Star",
			validKeywords: [],
			invalidKeywords: [],
			disabledPasses: [],
			renderQueue: -1,
			enableInstancing: !0,
			doubleSidedGi: !1,
			textures: {
				_BumpMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailAlbedoMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailMask: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_DetailNormalMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Disslove: {
					guid: "08630355ea0d24b39ac006a0349f9290",
					path: "Resources/AxieMixer3D/AddonAssets/mystic-axie/_Dependencies/T_Noise_02.png",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Dissolvenoise: {
					guid: "",
					path: "",
					scale: [2, 2],
					offset: [0, 0]
				},
				_EmissionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Flow: {
					guid: "e7c6a4935ad376447a2ca72067a8c855",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_FlowMap: {
					guid: "806d07eeeb19f974ea2d9adba139c6f0",
					path: "",
					scale: [1, 2],
					offset: [0, 0]
				},
				_MainTex: {
					guid: "fe54ecf1c9ad5e04183e0f57e21cbbb8",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_MainTexture: {
					guid: "d304bc43cbe81454486ce791db820c26",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Mask: {
					guid: "9e28da74caf9cde4e8caf52e35c6d296",
					path: "",
					scale: [2.06, 1],
					offset: [0, 0]
				},
				_MetallicGlossMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_Noise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_OcclusionMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_ParallaxMap: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureNoise: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_TextureSample0: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_node_3522: {
					guid: "37843a95265c15844999479d9a718d6b",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_node_4922: {
					guid: "47344b1818dad3c4c90b7e3ce21a5d3a",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				_texcoord: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_Lightmaps: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_LightmapsInd: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				},
				unity_ShadowMasks: {
					guid: "",
					path: "",
					scale: [1, 1],
					offset: [0, 0]
				}
			},
			floats: {
				_AlphaCutoff: .5,
				_AlphaStrength: 4,
				_BlackAmount: 1,
				_BladeStretch: 1,
				_Blend2: 1,
				_BumpScale: 1,
				_CullMode: 0,
				_Cutoff: .5,
				_DTSize: 30,
				_Depthpower: 1,
				_DetailNormalMapScale: 1,
				_DissloveSmooth: 1,
				_DissloveVlaue: .453,
				_DstBlend: 0,
				_EdgeWidth: 1.319,
				_EmissFadeout: 1,
				_EmissStrength: 6.5,
				_Emission: 7.8,
				_Float0: 1,
				_FlowSpeed: 1,
				_FlowStrength: .1,
				_GlossMapScale: 1,
				_Glossiness: .5,
				_GlossyReflections: 1,
				_InvFade: 1,
				_KeepEdge_NonFlowmap: 1,
				_Metallic: 0,
				_Mode: 0,
				_NoiseOpacityLerp: 0,
				_OcclusionStrength: 1,
				_Opacity: 1,
				_Parallax: .02,
				_QueueControl: 0,
				_QueueOffset: 0,
				_ReceiveShadows: 1,
				_RefractionStrength: .5,
				_SharpEdge: -.03,
				_SmoothnessTextureChannel: 0,
				_SpecularHighlights: 1,
				_SrcBlend: 1,
				_UVSec: 0,
				_U_StretchStrength: 10,
				_Usecenterglow: 0,
				_Usecustomrandom: 0,
				_Usedepth: 0,
				_Usetexturecolor: 1,
				_Usetexturedissolve: 1,
				_ZWrite: 1,
				_Ztest: 2,
				_dotsoft: .5,
				_int0: 1,
				_node_5097: 1,
				_node_690: 0,
				_node_9399: 0,
				_stencil: 0
			},
			colors: {
				_Color: [
					.43788758,
					.23113209,
					1,
					1
				],
				_Color0: [
					6.0628657,
					6.0628657,
					6.0628657,
					1
				],
				_Color1: [
					.6981132,
					.6981132,
					.6981132,
					1
				],
				_Dissolvecolor: [
					0,
					0,
					0,
					1
				],
				_DissolvespeedXY: [
					-.5,
					.1,
					0,
					0
				],
				_DistortionSpeedXYPowerZ: [
					0,
					0,
					0,
					.84
				],
				_EmissionColor: [
					0,
					0,
					0,
					1
				],
				_Maincolor: [
					1,
					1,
					1,
					1
				],
				_NoiseSpeedXYPowerZ: [
					0,
					0,
					2.43,
					0
				],
				_Noisecolor: [
					1,
					.21318129,
					0,
					1
				],
				_NoisespeedXYEmissonZPowerW: [
					.5,
					0,
					5,
					1
				],
				_SpeedMainTexUVNoiseZW: [
					0,
					0,
					0,
					0
				],
				_TintColor: [
					.5,
					.5,
					.5,
					.5
				],
				_Vector0: [
					4,
					4,
					.1,
					.1
				],
				_node_8180: [
					0,
					0,
					0,
					0
				]
			}
		}
	]
}, k = "\n  uniform float uOutlineThickness;\n  uniform float uOutlineSourceObjectUnitScale;\n\n  #include <common>\n  #include <batching_pars_vertex>\n  #include <morphtarget_pars_vertex>\n  #include <skinning_pars_vertex>\n\n  void main() {\n    #include <morphinstance_vertex>\n    #include <batching_vertex>\n    #include <beginnormal_vertex>\n    #include <morphnormal_vertex>\n    #include <skinbase_vertex>\n    #include <skinnormal_vertex>\n    #include <begin_vertex>\n    #include <morphtarget_vertex>\n    #include <skinning_vertex>\n\n    vec3 outlinePositionOS = transformed\n      + objectNormal * uOutlineThickness * uOutlineSourceObjectUnitScale;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(outlinePositionOS, 1.0);\n  }\n", A = "\n  uniform vec3 uOutlineColor;\n\n  void main() {\n    gl_FragColor = vec4(uOutlineColor, 1.0);\n    #include <colorspace_fragment>\n  }\n", j = class extends n.ShaderMaterial {
	source = "mystic-object-normal-extra-prepass";
	constructor(e) {
		super({
			name: e.name,
			vertexShader: k,
			fragmentShader: A,
			uniforms: {
				uOutlineThickness: { value: e.thickness },
				uOutlineSourceObjectUnitScale: { value: 1 },
				uOutlineColor: { value: new n.Color(e.color) }
			},
			side: n.BackSide,
			transparent: !1,
			blending: n.NoBlending,
			depthTest: !0,
			depthWrite: !0,
			fog: !1,
			toneMapped: !1
		});
	}
}, M = "\n  uniform float uOutlineThickness;\n  uniform float uOutlineSourceObjectUnitScale;\n  uniform float uMysticCameraIsOrthographic;\n  uniform vec3 uMysticCameraViewDirectionWS;\n\n  varying float vCelEyeDepth;\n\n  #include <common>\n  #include <batching_pars_vertex>\n  #include <morphtarget_pars_vertex>\n  #include <skinning_pars_vertex>\n\n  void main() {\n    #include <morphinstance_vertex>\n    #include <batching_vertex>\n    #include <beginnormal_vertex>\n    #include <morphnormal_vertex>\n    #include <skinbase_vertex>\n    #include <skinnormal_vertex>\n    #include <defaultnormal_vertex>\n    #include <begin_vertex>\n    #include <morphtarget_vertex>\n    #include <skinning_vertex>\n\n    vec4 sourceWorldPosition = modelMatrix * vec4(transformed, 1.0);\n    vec3 normalWS = inverseTransformDirection(normalize(transformedNormal), viewMatrix);\n    vec3 viewDirectionWS = uMysticCameraIsOrthographic > 0.5\n      ? normalize(uMysticCameraViewDirectionWS)\n      : normalize(cameraPosition - sourceWorldPosition.xyz);\n    float fresnel = pow(1.0 - dot(normalWS, viewDirectionWS), 5.0);\n    float extrusion = clamp(clamp(fresnel, 0.0, 1.0) * uOutlineThickness, 0.0, 1.0);\n    vec3 outlinePositionOS = transformed\n      + objectNormal * extrusion * uOutlineSourceObjectUnitScale;\n    vec4 sourceViewPosition = viewMatrix * sourceWorldPosition;\n    vCelEyeDepth = -sourceViewPosition.z;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(outlinePositionOS, 1.0);\n  }\n", fe = "\n  uniform vec3 uOutlineColor;\n  uniform float uAlphaClipEnabled;\n  uniform float uMysticCameraNear;\n  uniform float uCelLength;\n  uniform float uCelOffset;\n\n  varying float vCelEyeDepth;\n\n  float dither8x8Bayer(vec2 pixelPosition) {\n    float x = mod(floor(pixelPosition.x), 8.0);\n    float y = mod(floor(pixelPosition.y), 8.0);\n    if (y < 0.5) {\n      if (x < 0.5) return 1.0 / 64.0; if (x < 1.5) return 49.0 / 64.0;\n      if (x < 2.5) return 13.0 / 64.0; if (x < 3.5) return 61.0 / 64.0;\n      if (x < 4.5) return 4.0 / 64.0; if (x < 5.5) return 52.0 / 64.0;\n      if (x < 6.5) return 16.0 / 64.0; return 64.0 / 64.0;\n    }\n    if (y < 1.5) {\n      if (x < 0.5) return 33.0 / 64.0; if (x < 1.5) return 17.0 / 64.0;\n      if (x < 2.5) return 45.0 / 64.0; if (x < 3.5) return 29.0 / 64.0;\n      if (x < 4.5) return 36.0 / 64.0; if (x < 5.5) return 20.0 / 64.0;\n      if (x < 6.5) return 48.0 / 64.0; return 32.0 / 64.0;\n    }\n    if (y < 2.5) {\n      if (x < 0.5) return 9.0 / 64.0; if (x < 1.5) return 57.0 / 64.0;\n      if (x < 2.5) return 5.0 / 64.0; if (x < 3.5) return 53.0 / 64.0;\n      if (x < 4.5) return 12.0 / 64.0; if (x < 5.5) return 60.0 / 64.0;\n      if (x < 6.5) return 8.0 / 64.0; return 56.0 / 64.0;\n    }\n    if (y < 3.5) {\n      if (x < 0.5) return 41.0 / 64.0; if (x < 1.5) return 25.0 / 64.0;\n      if (x < 2.5) return 37.0 / 64.0; if (x < 3.5) return 21.0 / 64.0;\n      if (x < 4.5) return 44.0 / 64.0; if (x < 5.5) return 28.0 / 64.0;\n      if (x < 6.5) return 40.0 / 64.0; return 24.0 / 64.0;\n    }\n    if (y < 4.5) {\n      if (x < 0.5) return 3.0 / 64.0; if (x < 1.5) return 51.0 / 64.0;\n      if (x < 2.5) return 15.0 / 64.0; if (x < 3.5) return 63.0 / 64.0;\n      if (x < 4.5) return 2.0 / 64.0; if (x < 5.5) return 50.0 / 64.0;\n      if (x < 6.5) return 14.0 / 64.0; return 62.0 / 64.0;\n    }\n    if (y < 5.5) {\n      if (x < 0.5) return 35.0 / 64.0; if (x < 1.5) return 19.0 / 64.0;\n      if (x < 2.5) return 47.0 / 64.0; if (x < 3.5) return 31.0 / 64.0;\n      if (x < 4.5) return 34.0 / 64.0; if (x < 5.5) return 18.0 / 64.0;\n      if (x < 6.5) return 46.0 / 64.0; return 30.0 / 64.0;\n    }\n    if (y < 6.5) {\n      if (x < 0.5) return 11.0 / 64.0; if (x < 1.5) return 59.0 / 64.0;\n      if (x < 2.5) return 7.0 / 64.0; if (x < 3.5) return 55.0 / 64.0;\n      if (x < 4.5) return 10.0 / 64.0; if (x < 5.5) return 58.0 / 64.0;\n      if (x < 6.5) return 6.0 / 64.0; return 54.0 / 64.0;\n    }\n    if (x < 0.5) return 43.0 / 64.0; if (x < 1.5) return 27.0 / 64.0;\n    if (x < 2.5) return 39.0 / 64.0; if (x < 3.5) return 23.0 / 64.0;\n    if (x < 4.5) return 42.0 / 64.0; if (x < 5.5) return 26.0 / 64.0;\n    if (x < 6.5) return 38.0 / 64.0; return 22.0 / 64.0;\n  }\n\n  void main() {\n    float numerator = vCelEyeDepth - uMysticCameraNear - uCelOffset;\n    float depthFade = abs(uCelLength) < 0.000001\n      ? step(0.0, numerator)\n      : clamp(numerator / uCelLength, 0.0, 1.0);\n    float alpha = step(\n      dither8x8Bayer(gl_FragCoord.xy),\n      clamp(depthFade * 1.00001, 0.0, 1.0)\n    );\n    if (uAlphaClipEnabled > 0.5 && alpha < 0.5) discard;\n    gl_FragColor = vec4(uOutlineColor, alpha);\n    #include <colorspace_fragment>\n  }\n", N = class extends n.ShaderMaterial {
	source = "cel-fresnel-object-normal-extra-prepass";
	#e = new n.Vector3(0, 0, 1);
	constructor(e) {
		super({
			name: e.name,
			vertexShader: M,
			fragmentShader: fe,
			uniforms: {
				uOutlineThickness: { value: e.thickness },
				uOutlineSourceObjectUnitScale: { value: 1 },
				uOutlineColor: { value: new n.Color().setRGB(.2, .2, .2, n.SRGBColorSpace) },
				uAlphaClipEnabled: { value: +!!e.alphaClipEnabled },
				uMysticCameraIsOrthographic: { value: 0 },
				uMysticCameraViewDirectionWS: { value: new n.Vector3(0, 0, 1) },
				uMysticCameraNear: { value: .1 },
				uCelLength: { value: e.length },
				uCelOffset: { value: e.offset }
			},
			side: n.BackSide,
			transparent: !1,
			blending: n.NoBlending,
			depthTest: !0,
			depthWrite: !0,
			fog: !1,
			toneMapped: !1
		});
	}
	onBeforeRender(e, t, n) {
		let r = n;
		n.getWorldDirection(this.#e).multiplyScalar(-1), this.uniforms.uMysticCameraIsOrthographic.value = +!!n.isOrthographicCamera, this.uniforms.uMysticCameraViewDirectionWS.value.copy(this.#e), this.uniforms.uMysticCameraNear.value = Number.isFinite(r.near) ? r.near : .1;
	}
}, pe = /* @__PURE__ */ i({
	AXIE_EXACT_MYSTIC_MATERIAL_FACTORY: () => Z,
	AXIE_EXACT_PRODUCTION_MATERIAL_FACTORY: () => $,
	AXIE_MYSTIC_MATERIAL_FACTORY: () => Y,
	ExactAxieMysticMaterialFactory: () => X,
	ExactAxieProductionMaterialFactory: () => Q,
	MysticSourceMaterial: () => G,
	MysticSourceMaterialFactory: () => J,
	createMysticSourceDefaultMaterialSchema: () => V,
	isMysticSourceMaterial: () => K,
	setMysticMaterialTime: () => q
}), me = Object.freeze({
	"debuff-rimlight": [
		"_Main_tex",
		"_TextureSample2",
		"_second_noise",
		"_Matcap"
	],
	"mystic-opaque": [
		"_TextureSample0",
		"_gradientmap",
		"_Matcap"
	],
	"mystic-transparent": ["_TextureSample0", "_gradientmap"],
	"mystic-final": [
		"_Main_tex",
		"_Mask_MAP",
		"_Matcap",
		"_Matcap_UV2",
		"_NoiseMap_ViewDir",
		"_NoiseMap_2nd",
		"_Noise_3",
		"_UV2_texture"
	],
	"mystic-final-transparent": [
		"_Main_tex",
		"_Mask_MAP",
		"_Matcap",
		"_Matcap_UV2",
		"_NoiseMap_ViewDir",
		"_NoiseMap_2nd",
		"_Noise_3",
		"_UV2_texture"
	],
	"cel-standard": ["_ColorTexture"],
	"cel-standard-mystic": [
		"_ColorTexture",
		"_emission",
		"_emissnoise",
		"_Matcap"
	],
	star: ["_TextureSample0"],
	dissolve: ["_MainTex", "_DissolveTex"],
	"dissolve-stencil": ["_MainTex", "_DissolveTex"]
});
function P(e, t) {
	return typeof e == "number" && Number.isFinite(e) ? e : t;
}
function F(e) {
	return new n.Vector4(e?.scale[0] ?? 1, e?.scale[1] ?? 1, e?.offset[0] ?? 0, e?.offset[1] ?? 0);
}
function I(e, t) {
	let r = e ?? t;
	return new n.Vector4(P(r[0], t[0]), P(r[1], t[1]), P(r[2], t[2]), P(r[3], t[3]));
}
function L(e, t, r, i, a) {
	let o = new n.DataTexture(new Uint8Array([
		e,
		t,
		r,
		i
	]), 1, 1, n.RGBAFormat);
	return o.name = a, o.colorSpace = n.NoColorSpace, o.needsUpdate = !0, o;
}
function R(e) {
	e.forEach((e) => e.dispose()), e.clear();
}
function z(e, t, n) {
	for (let n of t) {
		let t = e.floats[n];
		if (typeof t == "number" && Number.isFinite(t)) return t;
	}
	return n;
}
function B(e, t, n) {
	for (let n of t) {
		let t = e.colors[n];
		if (t) return t;
	}
	return n;
}
function V(e, t = `AxieSourceDefault:${e.guid}`) {
	return {
		id: t,
		guid: t,
		name: `${e.name}:SourceDefaults`,
		shaderGuid: e.guid,
		shaderName: e.name,
		validKeywords: [],
		invalidKeywords: [],
		disabledPasses: [],
		renderQueue: -1,
		enableInstancing: !1,
		doubleSidedGi: !1,
		textures: e.defaults.textures,
		floats: e.defaults.floats,
		colors: e.defaults.colors
	};
}
function he(e) {
	let t = e.floats._Ztest;
	if (typeof t != "number" || !Number.isFinite(t)) return {
		depthTest: !0,
		depthFunc: n.LessEqualDepth
	};
	let r = Math.trunc(t), i = Object.freeze({
		1: n.NeverDepth,
		2: n.LessDepth,
		3: n.EqualDepth,
		4: n.LessEqualDepth,
		5: n.GreaterDepth,
		6: n.NotEqualDepth,
		7: n.GreaterEqualDepth,
		8: n.AlwaysDepth
	});
	return {
		depthTest: r !== 0,
		depthFunc: i[r] ?? n.LessDepth
	};
}
function H(e, t) {
	return t.family === "star" || e.validKeywords.includes("_ALPHATEST_ON");
}
function U(e, t) {
	return t.family === "mystic-opaque" ? z(e, ["_AlphaClip"], 0) : t.family === "mystic-transparent" || t.family === "dissolve" || t.family === "dissolve-stencil" ? 0 : t.alphaTest;
}
function W(e, t, n) {
	t.getWorldDirection(n).multiplyScalar(-1), e.uMysticCameraIsOrthographic.value = +!!t.isOrthographicCamera, e.uMysticCameraViewDirectionWS.value.copy(n);
	let r = t.near;
	e.uMysticCameraNear.value = Number.isFinite(r) ? r : .1;
}
var ge = class extends n.ShaderMaterial {
	#e = new n.Vector3(0, 0, 1);
	onBeforeRender(e, t, n) {
		W(this.uniforms, n, this.#e);
	}
}, G = class extends n.ShaderMaterial {
	sourceSchema;
	shaderDefinition;
	#e = new n.Vector3(0, 0, 1);
	#t = new n.Vector3();
	#n = new n.Vector3();
	#r;
	constructor(e, t, r, i) {
		let a = he(e);
		super({
			name: e.name,
			vertexShader: l,
			fragmentShader: t.fragmentShader,
			uniforms: r,
			transparent: t.transparent,
			side: t.side,
			depthTest: a.depthTest,
			depthWrite: t.depthWrite,
			depthFunc: a.depthFunc,
			blending: t.transparent ? n.NormalBlending : n.NoBlending,
			fog: !1,
			toneMapped: !1
		}), this.sourceSchema = e, this.shaderDefinition = t, this.#r = i, t.family === "star" && (this.forceSinglePass = !0), this.alphaTest = H(e, t) ? U(e, t) : 0, this.userData.axieMystic = Object.freeze({
			materialId: e.id,
			materialGuid: e.guid,
			shaderGuid: e.shaderGuid,
			shaderName: e.shaderName,
			shaderFamily: t.family,
			renderQueue: e.renderQueue,
			requiresGammaComposition: t.transparent,
			faithful: !0
		}), (t.family === "mystic-opaque" || t.family === "mystic-transparent" || t.family === "cel-standard" || t.family === "cel-standard-mystic") && (this.stencilWrite = !0, this.stencilRef = Math.trunc(z(e, ["_stencil"], 0)), this.stencilFunc = n.AlwaysStencilFunc, this.stencilFail = n.KeepStencilOp, this.stencilZFail = n.KeepStencilOp, this.stencilZPass = n.ReplaceStencilOp);
	}
	onBeforeRender(e, t, n) {
		if (W(this.uniforms, n, this.#e), !this.#r) return;
		let r;
		if (t.traverseVisible((e) => {
			!r && e.isDirectionalLight && (r = e);
		}), !r) {
			this.uniforms.uMainLightPosition.value.set(0, 0, 0);
			return;
		}
		r.getWorldPosition(this.#t), r.target.getWorldPosition(this.#n), this.uniforms.uMainLightPosition.value.copy(this.#t).sub(this.#n).normalize();
	}
	setTime(e) {
		this.uniforms.uMysticTime.value = Number.isFinite(e) ? e : 0;
	}
	setBodyColors(e, t) {
		let r = new n.Color(e).convertLinearToSRGB(), i = new n.Color(t).convertLinearToSRGB();
		this.uniforms.uPrimaryColor.value.set(r.r, r.g, r.b, 1), this.uniforms.uSecondaryColor.value.set(i.r, i.g, i.b, 1);
	}
};
function K(e) {
	let t = e, n = t.userData?.axieMystic;
	return t.isShaderMaterial === !0 && t.transparent !== void 0 && n?.faithful === !0 && typeof n.shaderFamily == "string" && typeof t.setTime == "function" && t.uniforms?.uMysticGammaBlendPass !== void 0;
}
function q(e, t) {
	let n = /* @__PURE__ */ new Set();
	return e.traverse((e) => {
		let r = e.material;
		(Array.isArray(r) ? r : r ? [r] : []).forEach((e) => {
			K(e) && !n.has(e) && (n.add(e), e.setTime(t));
		});
	}), n.size;
}
var J = class {
	#e;
	#t;
	#n = L(255, 255, 255, 255, "AxieMystic:default-white");
	#r = L(0, 0, 0, 255, "AxieMystic:default-black");
	#i = L(128, 128, 128, 255, "AxieMystic:default-gray");
	#a = L(128, 128, 255, 255, "AxieMystic:default-bump");
	#o = L(255, 0, 0, 255, "AxieMystic:default-red");
	#s = !1;
	constructor(e = {}) {
		this.#e = e.catalog ?? O;
		let t = [];
		this.#e.materials.forEach((e) => {
			t.push([e.id, e], [e.guid, e]);
		}), this.#t = new Map(t);
	}
	get catalog() {
		return this.#e;
	}
	getSchema(e) {
		return this.#t.get(e);
	}
	create(e, t) {
		this.#u();
		let n = this.#t.get(e);
		if (!n) {
			let n = {
				severity: "error",
				code: "mystic-material-missing",
				message: `Mystic material schema is not present: ${e}`,
				assetId: e
			};
			throw t.onDiagnostic?.(n), Error(n.message);
		}
		return this.createFromSchema(n, t);
	}
	createFromSchema(e, t) {
		this.#u();
		let r;
		try {
			r = D(e.shaderGuid);
		} catch (n) {
			throw t.onDiagnostic?.({
				severity: "error",
				code: "mystic-shader-unsupported",
				message: n instanceof Error ? n.message : String(n),
				assetId: e.id,
				details: { shaderGuid: e.shaderGuid }
			}), n;
		}
		let i = o(t.quality), a = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set(), c;
		try {
			c = this.#l(e, r, i, t, a, s);
		} catch (e) {
			throw R(s), a.clear(), e;
		}
		let u = new G(e, r, c, t.mainLightPosition === void 0), d = H(e, r) ? U(e, r) : 0, f = (() => {
			if (!r.outline) return;
			let t = `${e.name}:ExtraPrePass`, i = z(e, ["_outline"], 0);
			if (r.family === "debuff-rimlight" || r.family === "mystic-final" || r.family === "mystic-final-transparent") {
				let [r, a, o] = B(e, ["_outlinecolor"], [
					0,
					0,
					0,
					0
				]);
				return new j({
					thickness: i,
					color: new n.Color().setRGB(P(r, 0), P(a, 0), P(o, 0), n.SRGBColorSpace),
					name: t
				});
			}
			if (r.family === "cel-standard" || r.family === "cel-standard-mystic") return new N({
				thickness: i,
				alphaClipEnabled: H(e, r),
				length: z(e, ["_Length"], 0),
				offset: z(e, ["_Offset"], 0),
				name: t
			});
		})(), p = c.uMainTex.value, m = new Set(e.disabledPasses.map((e) => e.toUpperCase())), h = r.depthOnly && !m.has("DEPTHONLY"), g = r.shadowCaster && !m.has("SHADOWCASTER"), _ = h ? new ge({
			name: `${e.name}:DepthOnly`,
			vertexShader: l,
			fragmentShader: r.depthFragmentShader,
			uniforms: c,
			transparent: !1,
			side: r.side,
			alphaTest: d,
			depthTest: !0,
			depthWrite: !0,
			depthFunc: n.LessEqualDepth,
			blending: n.NoBlending,
			fog: !1,
			toneMapped: !1
		}) : void 0, v = g ? new n.MeshDistanceMaterial({
			map: p === this.#n || p === this.#r ? null : p,
			alphaTest: d
		}) : void 0, y = !1, b = () => {
			y || (y = !0, R(s), a.clear());
		};
		return u.addEventListener("dispose", b), {
			surface: u,
			outline: f,
			depth: _,
			distance: v,
			castShadow: g,
			fidelity: i.id === "faithful" ? "source-faithful" : i.id,
			fallbackUsed: !1,
			dispose: () => {
				u.dispose(), f?.dispose(), _?.dispose(), v?.dispose(), b();
			}
		};
	}
	dispose() {
		this.#s || (this.#s = !0, this.#n.dispose(), this.#r.dispose(), this.#i.dispose(), this.#a.dispose(), this.#o.dispose());
	}
	#c(e, t, r, i, a, o, s) {
		for (let c of r) {
			let r = e.textures[c];
			if (!r) continue;
			if (!r.guid) return r.builtin === "black" ? this.#r : r.builtin === "gray" ? this.#i : r.builtin === "bump" ? this.#a : r.builtin === "red" ? this.#o : r.builtin === "white" || i === "white" ? this.#n : this.#r;
			let l = a.resolveTexture(r, e);
			if (l) {
				if (l.colorSpace !== n.SRGBColorSpace) return l;
				let t = o.get(l);
				if (t) return t;
				let r = l.clone();
				return r.name = l.name ? `${l.name}:AxieMysticRaw` : `AxieMysticRaw:${e.id}:${c}`, r.colorSpace = n.NoColorSpace, r.needsUpdate = !0, o.set(l, r), s.add(r), r;
			}
			let u = me[t.family].includes(c);
			return a.onDiagnostic?.({
				severity: u ? "error" : "warning",
				code: "mystic-texture-missing",
				message: `${u ? "Required" : "Optional"} texture ${c} did not resolve for ${e.id}.`,
				assetId: e.id,
				details: {
					property: c,
					textureGuid: r.guid,
					texturePath: r.path || null
				}
			}), i === "white" ? this.#n : this.#r;
		}
		return i === "white" ? this.#n : this.#r;
	}
	#l(e, t, r, i, a, o) {
		let s = t.family, c = s === "debuff-rimlight" || s.startsWith("mystic-final") ? ["_Main_tex"] : s.startsWith("mystic-") || s === "star" ? ["_TextureSample0"] : s.startsWith("cel-") ? ["_ColorTexture"] : ["_MainTex"], l = s.startsWith("mystic-final") ? ["_Mask_MAP"] : ["_Mask_alpha"], u = c.map((t) => e.textures[t]).find(Boolean), d = l.map((t) => e.textures[t]).find(Boolean), f = e.textures._maskmapcolorbody1, p = e.textures._emission, m = i.primaryColor === void 0 ? B(e, ["_PrimaryColor"], [
			1,
			1,
			1,
			1
		]) : (() => {
			let e = new n.Color(i.primaryColor).convertLinearToSRGB();
			return [
				e.r,
				e.g,
				e.b,
				1
			];
		})(), h = i.secondaryColor === void 0 ? B(e, ["_SecondaryColor"], [
			1,
			1,
			1,
			1
		]) : (() => {
			let e = new n.Color(i.secondaryColor).convertLinearToSRGB();
			return [
				e.r,
				e.g,
				e.b,
				1
			];
		})(), g = B(e, ["_Color_UV2"], [
			1,
			1,
			1,
			0
		]);
		return {
			uMysticTime: { value: 0 },
			uMysticDetail: { value: r.shaderDetail === "full" ? 1 : .45 },
			uMysticGammaBlendPass: { value: 0 },
			uAlphaClipEnabled: { value: +!!H(e, t) },
			uAlphaCutoff: { value: U(e, t) },
			uAlpha: { value: z(e, ["_Float0", "_Alpha"], 1) },
			uBrightness: { value: z(e, ["_Brightness"], 1) },
			uEmission: { value: z(e, ["_Emiss", "_Emission"], 1) },
			uEdgeWidth: { value: z(e, ["_EdgeWidth"], 1.2) },
			uMatcapStrength: { value: z(e, ["_matcap"], 1) },
			uMatcap2Strength: { value: z(e, ["_matcap_UV2"], 1) },
			uRimShadow: { value: z(e, ["_RimShadow"], 0) },
			uRimOffset: { value: z(e, ["_RimOffset"], 0) },
			uTopMidOffset: { value: z(e, ["_TopMid_Offset"], 0) },
			uUv2Threshold: { value: z(e, ["_UV2_thresholdalpha"], .5) },
			uUv1Alpha: { value: z(e, ["_Alpha_UV1"], 1) },
			uScaleNoise: { value: z(e, ["_Scale_Noisemap"], 1) },
			uColorTime: { value: z(e, ["_Color_Time"], .5) },
			uColorSwitch: { value: z(e, ["_Color_switch"], 0) },
			uShadowAmount: { value: z(e, ["_ShadowAmount"], 0) },
			uShadowSmoothness: { value: z(e, ["_ShadowSmoothness"], .5) },
			uIndoor: { value: z(e, ["_Indoor_"], 0) },
			uSnowOnTop: { value: z(e, ["_SnowOnTop"], 0) },
			uOnPoisoned: { value: z(e, ["_OnPoisoned"], 0) },
			uOnBurned: { value: z(e, ["_OnBurned"], 0) },
			uAlphaEmission: { value: z(e, ["_alpha_emiss"], 1) },
			uAlphaMainTex: { value: z(e, ["_alphamaintex"], 0) },
			uAlphaMainTexKeyword: { value: +!!e.validKeywords.includes("_ALPHAMAINTEX_ON") },
			uUnityGammaWorkflow: { value: 1 },
			uMysticCameraIsOrthographic: { value: 0 },
			uMysticCameraNear: { value: .1 },
			uMysticUnityObjectFromGeometry: { value: new n.Matrix4() },
			uCelLength: { value: z(e, ["_Length"], 0) },
			uCelOffset: { value: z(e, ["_Offset"], 0) },
			uMainTexTransform: { value: F(u) },
			uMaskTransform: { value: F(d) },
			uBodyMaskTransform: { value: F(f) },
			uEmissionTransform: { value: F(p) },
			uColor0: { value: I(B(e, ["_Color0"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uColor1: { value: I(B(e, ["_Color1"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uColor2: { value: I(B(e, ["_Color3"], [
				0,
				0,
				0,
				0
			]), [
				0,
				0,
				0,
				0
			]) },
			uTop: { value: I(B(e, ["_Top"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uMid: { value: I(B(e, ["_Mid"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uBottom: { value: I(B(e, ["_bot", "_Bottom"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uRimColor: { value: I(B(e, ["_RimColor"], [
				0,
				0,
				0,
				0
			]), [
				0,
				0,
				0,
				0
			]) },
			uBaseColor: { value: I(B(e, ["_BaseColor"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uPrimaryColor: { value: I(m, [
				1,
				1,
				1,
				1
			]) },
			uSecondaryColor: { value: I(h, [
				1,
				1,
				1,
				1
			]) },
			uUv2Color: { value: I(g, [
				1,
				1,
				1,
				0
			]) },
			uSolidColor: { value: I(B(e, ["_Solid_Color"], [
				1,
				1,
				1,
				0
			]), [
				1,
				1,
				1,
				0
			]) },
			uMasterColor: { value: I(B(e, ["_master_Color"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uEmissionColor: { value: I(B(e, ["_emissioncolor", "_EmissionColor"], [
				1,
				1,
				1,
				1
			]), [
				1,
				1,
				1,
				1
			]) },
			uTopMidStep: { value: I(B(e, ["_TopMid_Step"], [
				0,
				1,
				0,
				0
			]), [
				0,
				1,
				0,
				0
			]) },
			uRimFalloff: { value: I(B(e, ["_RimFalloff"], [
				0,
				1,
				0,
				0
			]), [
				0,
				1,
				0,
				0
			]) },
			uVector0: { value: I(B(e, s === "debuff-rimlight" ? ["_Gradient2"] : s.startsWith("mystic-final") ? ["_NoiseMap_ViewDIr"] : s.startsWith("mystic-") ? ["_GradientSreenspace"] : s.startsWith("cel-") || s === "star" ? ["_Vector0"] : ["_maintexUV"], [
				1,
				1,
				0,
				0
			]), [
				1,
				1,
				0,
				0
			]) },
			uVector1: { value: I(B(e, s === "debuff-rimlight" ? ["_secondNoise"] : s.startsWith("mystic-final") ? ["_NoiseMap_2"] : s.startsWith("cel-") ? ["_secondNoise"] : ["_DissolveUV"], [
				1,
				1,
				0,
				0
			]), [
				1,
				1,
				0,
				0
			]) },
			uVector2: { value: I(B(e, ["_Noise3_UVSPEED"], [
				1,
				1,
				0,
				0
			]), [
				1,
				1,
				0,
				0
			]) },
			uVector3: { value: I(B(e, ["_UV2_speed"], [
				0,
				0,
				0,
				0
			]), [
				0,
				0,
				0,
				0
			]) },
			uMysticCameraViewDirectionWS: { value: new n.Vector3(0, 0, 1) },
			uMainLightPosition: { value: i.mainLightPosition ? new n.Vector3(...i.mainLightPosition) : new n.Vector3(0, 0, 0) },
			uMainTex: { value: this.#c(e, t, c, "white", i, a, o) },
			uMaskTex: { value: this.#c(e, t, l, "white", i, a, o) },
			uMatcapTex: { value: this.#c(e, t, ["_Matcap"], "white", i, a, o) },
			uMatcap2Tex: { value: this.#c(e, t, ["_Matcap_UV2"], "white", i, a, o) },
			uNoiseTex: { value: this.#c(e, t, s === "debuff-rimlight" ? ["_TextureSample2"] : s.startsWith("mystic-final") ? ["_NoiseMap_ViewDir"] : s.startsWith("cel-") ? ["_emissnoise"] : ["_Noise"], "white", i, a, o) },
			uNoise2Tex: { value: this.#c(e, t, s === "debuff-rimlight" ? ["_second_noise"] : s.startsWith("mystic-final") ? ["_NoiseMap_2nd"] : ["_emissnoise"], "white", i, a, o) },
			uNoise3Tex: { value: this.#c(e, t, ["_Noise_3"], "white", i, a, o) },
			uUv2Tex: { value: this.#c(e, t, ["_UV2_texture"], "white", i, a, o) },
			uBodyMaskTex: { value: this.#c(e, t, ["_maskmapcolorbody1"], "white", i, a, o) },
			uGradientTex: { value: this.#c(e, t, ["_gradientmap"], "white", i, a, o) },
			uEmissionTex: { value: this.#c(e, t, ["_emission"], "black", i, a, o) },
			uDissolveTex: { value: this.#c(e, t, ["_DissolveTex"], "white", i, a, o) }
		};
	}
	#u() {
		if (this.#s) throw Error("Mystic source material factory is disposed.");
	}
}, Y = new J(), X = class {
	sourceFactory;
	constructor(e = Y) {
		this.sourceFactory = e;
	}
	create(e) {
		let t = this.#e(e);
		return t.outline?.dispose(), t.depth?.dispose(), t.distance?.dispose(), t.surface;
	}
	createGeometryOutline(e) {
		let t = this.#e(e);
		if (t.surface.dispose(), t.depth?.dispose(), t.distance?.dispose(), e.quality.outlineMode !== "unity-geometry") {
			t.outline?.dispose();
			return;
		}
		return t.outline;
	}
	createBundle(e) {
		let t = this.#e(e);
		e.quality.outlineMode !== "unity-geometry" && t.outline?.dispose();
		let n = e.manifest.assets.shaders[e.material.shaderId]?.fidelity;
		return {
			surface: t.surface,
			outline: e.quality.outlineMode === "unity-geometry" ? t.outline : void 0,
			depth: t.depth,
			distance: t.distance,
			castShadow: t.castShadow,
			fidelity: e.artMode === "enhanced" ? "enhanced" : n === "exact" ? "exact" : "source-faithful",
			fallbackUsed: !1
		};
	}
	#e(t) {
		let n = this.sourceFactory.getSchema(t.material.id) ?? this.sourceFactory.getSchema(t.material.id.split(":", 1)[0]) ?? this.sourceFactory.getSchema(t.material.contentHash) ?? this.sourceFactory.catalog.materials.find((e) => e.shaderGuid === t.material.shaderId && e.name === t.material.sourceName);
		if (!n || !E.has(t.material.shaderId)) {
			let n = t.manifest.assets.shaders[t.material.shaderId];
			throw new e(t.material.id, t.material.shaderId, n?.sourceName ?? "");
		}
		return this.sourceFactory.createFromSchema(n, {
			quality: t.quality.mysticFx === "reduced" ? "reduced" : t.artMode === "enhanced" ? "enhanced" : "faithful",
			primaryColor: t.primaryColor,
			secondaryColor: t.secondaryColor,
			resolveTexture: (e) => {
				let r = Object.entries(n.textures).find(([, t]) => t === e)?.[0], i = r ? t.material.textures[r] : void 0;
				return (r ? t.textures[r] : void 0) ?? (i ? t.textures[i] : void 0) ?? t.textures[e.guid] ?? t.textures[e.path];
			}
		});
	}
}, Z = Object.freeze(new X()), Q = class {
	base;
	mystic;
	constructor(e = t, n = Z) {
		this.base = e, this.mystic = n;
	}
	create(e) {
		return this.#e(e).create(e);
	}
	createGeometryOutline(e) {
		return this.#e(e).createGeometryOutline(e);
	}
	createBundle(e) {
		return this.#e(e).createBundle(e);
	}
	#e(e) {
		return E.has(e.material.shaderId) ? this.mystic : this.base;
	}
}, $ = Object.freeze(new Q());
//#endregion
export { i as S, c as _, Q as a, s as b, V as c, q as d, N as f, E as g, l as h, X as i, K as l, O as m, $ as n, G as o, j as p, Y as r, J as s, Z as t, pe as u, D as v, o as x, a as y };

//# sourceMappingURL=mystic-material-factory-ZyStOYbU.js.map