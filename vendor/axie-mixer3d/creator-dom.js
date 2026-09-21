import { d as e, i as t } from "./chunks/domain-Bk-35ubC.js";
import { c as n, s as r, t as i } from "./chunks/genes-decoder-eQ2QL6UT.js";
import { c as a, d as o, f as s, i as c, l, o as u, r as d, s as f, u as p } from "./chunks/creator-model-BV83gJKH.js";
//#region src/creator.ts
var m = "axiecreatorchange", h = "axiecreatoropenchange", g = Object.freeze({
	back: "Back",
	ear: "Ears",
	eye: "Eyes",
	horn: "Horn",
	mouth: "Mouth",
	tail: "Tail"
}), _ = [
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"summary",
	"[href]",
	"[tabindex]:not([tabindex=\"-1\"])"
].join(","), v = 0;
function y(e, t) {
	let n = document.createElement(e);
	return t && (n.className = t), n;
}
function b(e, t, n) {
	let r = y(e, t);
	return r.textContent = n, r;
}
function x(e, t) {
	return Object.freeze({
		...e,
		studioOpen: t
	});
}
function S(e, t, n) {
	return e.parts[t].find((e) => e.id === n && e.available);
}
function C(e) {
	return /^#?[0-9a-f]{6}$/iu.test(e) ? `#${e.replace(/^#/u, "")}` : "#ffffff";
}
function w(e, t, n) {
	let r = n ? S(e, t, n) : void 0;
	if (!r) return "Unavailable";
	let i = r.asset.descriptor, o = i.skin === 0 ? "" : ` · ${a(i.skin)}`;
	return `${i.class} ${i.variant.toString().padStart(2, "0")}${o}`;
}
function T(e) {
	return { ...e.parts };
}
var E = class {
	host;
	panel;
	trigger;
	catalog;
	currentState;
	resetState;
	options;
	ownsTrigger;
	abort = new AbortController();
	scrim;
	closeButton;
	doneButton;
	content;
	status;
	statusText;
	statusSpinner;
	announcer;
	currentBadge;
	manualPanel;
	genesPanel;
	geneForm;
	geneInput;
	geneFeedback;
	geneResolution;
	searchInput;
	classFilter;
	skinFilter;
	levelFilter;
	qualitySelect;
	postprocessToggle;
	modeButtons = /* @__PURE__ */ new Map();
	bodyButtons = /* @__PURE__ */ new Map();
	colorButtons = /* @__PURE__ */ new Map();
	artButtons = /* @__PURE__ */ new Map();
	partGroups = /* @__PURE__ */ new Map();
	openState = !1;
	disabledState = !1;
	loadingState = !1;
	destroyed = !1;
	viewMode;
	postprocessEnabled;
	postprocessSupported;
	lastFocused;
	geneTimer;
	constructor(e) {
		this.options = e, this.catalog = e.catalog, this.currentState = p(e.initialState, this.catalog), this.resetState = p(e.initialState, this.catalog), this.viewMode = this.currentState.mode, this.postprocessSupported = e.postprocess?.supported ?? !1, this.postprocessEnabled = this.postprocessSupported && (e.postprocess?.enabled ?? !1);
		let n = `axie-creator-${++v}`;
		this.host = y("div", "axie-creator-host"), this.host.dataset.open = "false", this.host.dataset.mode = this.viewMode, this.host.dataset.loading = "false", this.host.dataset.disabled = "false", this.ownsTrigger = !e.trigger, this.trigger = e.trigger ?? y("button", "axie-creator-toggle"), this.configureTrigger(n, e.keyboardShortcut === void 0 ? "KeyX" : e.keyboardShortcut), this.ownsTrigger && this.host.append(this.trigger), this.scrim = y("button", "axie-creator-scrim"), this.scrim.type = "button", this.scrim.tabIndex = -1, this.scrim.setAttribute("aria-label", "Close Axie Creator"), this.host.append(this.scrim), this.panel = y("aside", "axie-creator-panel"), this.panel.id = n, this.panel.setAttribute("role", "dialog"), this.panel.setAttribute("aria-modal", "true"), this.panel.setAttribute("aria-hidden", "true"), this.panel.setAttribute("aria-label", e.title ?? "Axie Creator"), this.panel.inert = !0, this.host.append(this.panel);
		let r = y("header", "axie-creator-header"), i = y("div", "axie-creator-identity"), a = b("span", "axie-creator-kicker", "3D MIXER · LIVE"), o = b("h2", "axie-creator-title", e.title ?? "Axie Creator"), s = b("p", "axie-creator-subtitle", "Build from exported parts or decode 512-bit genes.");
		i.append(a, o, s), this.closeButton = y("button", "axie-creator-close"), this.closeButton.type = "button", this.closeButton.setAttribute("aria-label", "Close Axie Creator"), this.closeButton.textContent = "×", r.append(i, this.closeButton), this.panel.append(r);
		let c = y("div", "axie-creator-tabs");
		c.setAttribute("role", "tablist"), c.setAttribute("aria-label", "Axie creation mode"), ["manual", "genes"].forEach((e, t) => {
			let r = y("button");
			r.type = "button", r.id = `${n}-${e}-tab`, r.setAttribute("role", "tab"), r.setAttribute("aria-controls", `${n}-${e}-panel`), r.setAttribute("aria-selected", String(this.viewMode === e)), r.tabIndex = this.viewMode === e ? 0 : -1, r.textContent = e === "manual" ? "Build manually" : "Use genes", r.dataset.mode = e, c.append(r), this.modeButtons.set(e, r), t === 0 && this.viewMode !== "manual" && (r.tabIndex = -1);
		}), this.panel.append(c), this.status = y("div", "axie-creator-status"), this.status.setAttribute("role", "status"), this.status.dataset.tone = "neutral", this.statusSpinner = y("span", "axie-creator-spinner"), this.statusSpinner.setAttribute("aria-hidden", "true"), this.statusText = b("span", "axie-creator-status-text", "Ready to mix."), this.status.append(this.statusSpinner, this.statusText), this.panel.append(this.status), this.content = y("div", "axie-creator-content"), this.manualPanel = y("section", "axie-creator-mode-panel"), this.manualPanel.id = `${n}-manual-panel`, this.manualPanel.setAttribute("role", "tabpanel"), this.manualPanel.setAttribute("aria-labelledby", `${n}-manual-tab`), this.manualPanel.append(this.createBodySection(), this.createColorSection());
		let l = y("section", "axie-creator-part-intro"), u = b("div", "axie-creator-section-heading", "Parts"), d = b("p", "axie-creator-catalog-note", "Only exported mixer assets appear. Unsupported grid cells are intentionally absent.");
		l.append(u, d, this.createFilters()), this.manualPanel.append(l), t.forEach((e) => this.manualPanel.append(this.createPartGroup(e))), this.genesPanel = this.createGenesPanel(n), this.content.append(this.manualPanel, this.genesPanel, this.createRenderSection()), this.panel.append(this.content);
		let f = y("footer", "axie-creator-footer"), m = b("button", "axie-creator-reset", "Reset");
		m.type = "button", m.dataset.action = "reset";
		let h = b("button", "axie-creator-randomize", "Randomize");
		h.type = "button", h.dataset.action = "randomize", this.doneButton = b("button", "axie-creator-done", "Done"), this.doneButton.type = "button", f.append(m, h, this.doneButton), this.panel.append(f), this.announcer = y("p", "axie-creator-sr-only"), this.announcer.setAttribute("aria-live", "polite"), this.panel.append(this.announcer), e.mount.append(this.host), this.bindEvents(), this.syncAll(), this.currentState.studioOpen && this.open();
	}
	get isOpen() {
		return this.openState;
	}
	get state() {
		return this.currentState;
	}
	open() {
		this.assertAlive(), !(this.openState || this.disabledState) && (this.openState = !0, this.currentState = x(this.currentState, !0), this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : void 0, this.host.dataset.open = "true", this.trigger.setAttribute("aria-expanded", "true"), this.panel.setAttribute("aria-hidden", "false"), this.panel.inert = !1, this.options.onOpenChange?.(!0), this.host.dispatchEvent(new CustomEvent(h, {
			bubbles: !0,
			detail: { open: !0 }
		})), queueMicrotask(() => this.closeButton.focus({ preventScroll: !0 })));
	}
	close(e = {}) {
		this.assertAlive(), this.openState && (this.openState = !1, this.currentState = x(this.currentState, !1), this.host.dataset.open = "false", this.trigger.setAttribute("aria-expanded", "false"), this.panel.setAttribute("aria-hidden", "true"), this.panel.inert = !0, this.options.onOpenChange?.(!1), this.host.dispatchEvent(new CustomEvent(h, {
			bubbles: !0,
			detail: { open: !1 }
		})), e.restoreFocus !== !1 && (this.lastFocused?.isConnected ? this.lastFocused : this.trigger).focus({ preventScroll: !0 }));
	}
	setState(e, t = {}) {
		this.assertAlive();
		let n = p(e, this.catalog), r = n.studioOpen;
		this.currentState = n, this.viewMode = n.mode, this.syncAll(), r && !this.openState ? this.open() : !r && this.openState && this.close({ restoreFocus: !1 }), t.notify && this.notify("external");
	}
	setDisabled(e) {
		this.assertAlive(), this.disabledState = e, this.host.dataset.disabled = String(e), this.trigger.disabled = e, this.updateInteractivity();
	}
	setPostprocessEnabled(e) {
		this.assertAlive(), this.postprocessEnabled = this.postprocessSupported && e, this.syncPostprocess();
	}
	setLoading(e, t = e ? "Mixing Axie assets…" : "Axie ready.") {
		this.assertAlive(), this.loadingState = e, this.host.dataset.loading = String(e), this.panel.setAttribute("aria-busy", String(e)), this.setStatus(t, e ? "neutral" : "success"), this.updateInteractivity();
	}
	setStatus(e, t = "neutral") {
		this.assertAlive(), this.status.dataset.tone = t, this.statusText.textContent = e, this.announcer.textContent = e;
	}
	destroy() {
		this.destroyed || (this.destroyed = !0, this.geneTimer !== void 0 && window.clearTimeout(this.geneTimer), this.abort.abort(), this.host.remove(), this.ownsTrigger || (this.trigger.removeAttribute("aria-controls"), this.trigger.removeAttribute("aria-expanded")));
	}
	configureTrigger(e, t) {
		this.trigger.type = "button", this.trigger.classList.add("axie-creator-toggle"), this.trigger.setAttribute("aria-controls", e), this.trigger.setAttribute("aria-expanded", "false"), this.trigger.setAttribute("aria-haspopup", "dialog"), this.trigger.replaceChildren();
		let n = b("span", "axie-creator-toggle-icon", "AX");
		n.setAttribute("aria-hidden", "true");
		let r = b("span", "axie-creator-toggle-label", "AXIE CREATOR");
		this.currentBadge = b("span", "axie-creator-current", "NEW"), this.trigger.append(n, r, this.currentBadge), t && (this.trigger.title = `Open Axie Creator (${t.replace(/^Key/u, "")})`);
	}
	createBodySection() {
		let e = y("fieldset", "axie-creator-section"), t = b("legend", "", "Body"), n = y("div", "axie-creator-body-grid");
		return n.setAttribute("role", "radiogroup"), n.setAttribute("aria-label", "Axie body"), this.catalog.bodies.forEach((e) => {
			let t = y("button", "axie-creator-body-card");
			t.type = "button", t.dataset.body = e.id, t.setAttribute("role", "radio"), t.setAttribute("aria-checked", "false"), t.disabled = !e.available;
			let r = b("span", "axie-creator-body-glyph", e.label.slice(0, 2).toUpperCase()), i = b("span", "axie-creator-body-label", e.label);
			t.append(r, i), n.append(t), this.bodyButtons.set(e.id, t);
		}), e.append(t, n), e;
	}
	createColorSection() {
		let e = y("details", "axie-creator-section axie-creator-color-section");
		e.open = !0;
		let t = y("summary");
		t.append(b("span", "axie-creator-section-heading", `Color · ${this.catalog.colors.length}`), b("span", "axie-creator-summary-hint", "All source palettes"));
		let n = y("div", "axie-creator-color-grid");
		return n.setAttribute("role", "radiogroup"), n.setAttribute("aria-label", "Axie color palette"), this.catalog.colors.forEach((e) => {
			let t = y("button", "axie-creator-color-card");
			t.type = "button", t.dataset.color = String(e.index), t.setAttribute("role", "radio"), t.setAttribute("aria-checked", "false"), t.disabled = !e.available, t.title = `${e.key} · source index ${e.index}`, t.style.setProperty("--axie-color-a", C(e.primary1)), t.style.setProperty("--axie-color-b", C(e.primary2));
			let r = y("span", "axie-creator-color-swatch");
			r.setAttribute("aria-hidden", "true");
			let i = y("span", "axie-creator-color-copy");
			i.append(b("span", "axie-creator-color-name", e.key), b("span", "axie-creator-color-index", `#${e.index}`)), t.append(r, i), n.append(t), this.colorButtons.set(e.index, t);
		}), e.append(t, n), e;
	}
	createFilters() {
		let e = y("div", "axie-creator-filters"), n = y("label", "axie-creator-search");
		n.append(b("span", "axie-creator-sr-only", "Search parts")), this.searchInput = y("input"), this.searchInput.type = "search", this.searchInput.placeholder = "Search class, variant or asset id", this.searchInput.autocomplete = "off", n.append(this.searchInput);
		let r = [...new Set(t.flatMap((e) => this.catalog.parts[e].map((e) => e.asset.descriptor.class)))].sort(), i = [...new Set(t.flatMap((e) => this.catalog.parts[e].map((e) => e.asset.descriptor.skin)))].sort((e, t) => e - t), o = [...new Set(t.flatMap((e) => this.catalog.parts[e].map((e) => e.asset.descriptor.level)))].sort((e, t) => e - t);
		this.classFilter = this.createFilterSelect("Class", r.map((e) => [e, e])), this.skinFilter = this.createFilterSelect("Skin", i.map((e) => [String(e), a(e)])), this.levelFilter = this.createFilterSelect("Level", o.map((e) => [String(e), `Level ${e}`]));
		let s = b("button", "axie-creator-filter-reset", "Clear");
		return s.type = "button", s.dataset.action = "clear-filters", e.append(n, this.classFilter, this.skinFilter, this.levelFilter, s), e;
	}
	createFilterSelect(e, t) {
		let n = y("select");
		n.setAttribute("aria-label", `${e} filter`);
		let r = document.createElement("option");
		return r.value = "", r.textContent = e === "Class" ? "All classes" : `All ${e.toLowerCase()}s`, n.append(r), t.forEach(([e, t]) => {
			let r = document.createElement("option");
			r.value = e, r.textContent = t, n.append(r);
		}), n;
	}
	createPartGroup(e) {
		let t = y("details", "axie-creator-part-group");
		t.dataset.partType = e;
		let n = y("summary"), r = y("span", "axie-creator-part-identity");
		r.append(b("span", "axie-creator-part-icon", g[e].slice(0, 1)), b("span", "axie-creator-part-name", g[e]));
		let i = b("span", "axie-creator-part-selected", "Not selected"), o = b("span", "axie-creator-part-count", String(this.catalog.parts[e].length));
		n.append(r, i, o);
		let s = y("div", "axie-creator-part-grid");
		s.setAttribute("role", "radiogroup"), s.setAttribute("aria-label", `${g[e]} options`);
		let c = this.catalog.parts[e].map((t) => {
			let n = t.asset.descriptor, r = y("button", "axie-creator-part-card");
			r.type = "button", r.dataset.partType = e, r.dataset.partId = t.id, r.dataset.partClass = n.class, r.dataset.skin = String(n.skin), r.dataset.level = String(n.level), r.dataset.search = `${t.id} ${t.label} ${n.class} ${n.variant}`.toLowerCase(), r.setAttribute("role", "radio"), r.setAttribute("aria-checked", "false"), r.disabled = !t.available;
			let i = b("span", "axie-creator-part-badge", n.class.slice(0, 2).toUpperCase());
			i.dataset.skin = String(n.skin);
			let o = y("span", "axie-creator-part-copy");
			return o.append(b("span", "axie-creator-part-option-name", `${n.class} ${n.variant.toString().padStart(2, "0")}`), b("span", "axie-creator-part-meta", `${a(n.skin)} · L${n.level}`)), r.append(i, o), s.append(r), r;
		}), l = b("p", "axie-creator-part-empty", "No exported parts match these filters.");
		return l.hidden = !0, t.append(n, s, l), this.partGroups.set(e, {
			details: t,
			selected: i,
			count: o,
			grid: s,
			empty: l,
			buttons: c
		}), t;
	}
	createGenesPanel(e) {
		let t = y("section", "axie-creator-mode-panel axie-creator-genes");
		t.id = `${e}-genes-panel`, t.setAttribute("role", "tabpanel"), t.setAttribute("aria-labelledby", `${e}-genes-tab`);
		let n = b("p", "axie-creator-genes-intro", "Paste Axie genes. Unity-compatible decoding preserves hybrid or unknown classes and omits only parts the source mixer cannot load.");
		this.geneForm = y("form", "axie-creator-gene-form");
		let r = b("label", "", "Axie genes");
		this.geneInput = y("textarea"), this.geneInput.rows = 5, this.geneInput.spellcheck = !1, this.geneInput.autocomplete = "off", this.geneInput.placeholder = "0x…", this.geneInput.setAttribute("aria-describedby", `${e}-gene-feedback`), r.append(this.geneInput);
		let i = b("button", "axie-creator-apply-genes", "Decode & apply");
		i.type = "submit", this.geneFeedback = b("p", "axie-creator-gene-feedback", "Changes apply automatically when the value is valid."), this.geneFeedback.id = `${e}-gene-feedback`, this.geneFeedback.setAttribute("aria-live", "polite"), this.geneForm.append(r, i, this.geneFeedback);
		let a = b("h3", "axie-creator-resolution-title", "Resolved mixer assets");
		return this.geneResolution = y("dl", "axie-creator-resolution"), t.append(n, this.geneForm, a, this.geneResolution), t;
	}
	createRenderSection() {
		let e = y("section", "axie-creator-render");
		e.append(b("h3", "axie-creator-section-heading", "Rendering"));
		let t = y("label", "axie-creator-quality");
		t.append(b("span", "", "Quality")), this.qualitySelect = y("select"), r.forEach((e) => {
			let t = n[e], r = document.createElement("option");
			r.value = e, r.textContent = `${t.label} · LOD ${t.requestedLod}`, this.qualitySelect.append(r);
		}), t.append(this.qualitySelect);
		let i = y("fieldset", "axie-creator-art");
		i.append(b("legend", "", "Art direction"));
		let a = y("div", "axie-creator-art-choices");
		a.setAttribute("role", "radiogroup"), a.setAttribute("aria-label", "Axie art direction"), ["faithful", "enhanced"].forEach((e) => {
			let t = y("button");
			t.type = "button", t.dataset.artMode = e, t.setAttribute("role", "radio"), t.setAttribute("aria-checked", "false"), t.append(b("strong", "", e === "faithful" ? "Faithful" : "Enhanced"), b("small", "", e === "faithful" ? "Unity-matched shader" : "Refined light & FX")), a.append(t), this.artButtons.set(e, t);
		}), i.append(a);
		let o = y("div", "axie-creator-postprocess"), s = y("span", "axie-creator-postprocess-copy");
		return s.append(b("strong", "", "Unity post outline"), b("small", "", this.postprocessSupported ? "Optional renderer-feature edge pass" : "Unavailable on this graphics device")), this.postprocessToggle = y("button", "axie-creator-postprocess-toggle"), this.postprocessToggle.type = "button", this.postprocessToggle.setAttribute("role", "switch"), this.postprocessToggle.setAttribute("aria-label", "Unity post-process outline"), this.postprocessToggle.append(b("span", "axie-creator-postprocess-track", ""), b("span", "axie-creator-postprocess-state", "")), o.append(s, this.postprocessToggle), e.append(t, i, o), e;
	}
	bindEvents() {
		let e = this.abort.signal;
		this.trigger.addEventListener("click", () => this.openState ? this.close() : this.open(), { signal: e }), this.scrim.addEventListener("click", () => this.close(), { signal: e }), this.closeButton.addEventListener("click", () => this.close(), { signal: e }), this.doneButton.addEventListener("click", () => this.close(), { signal: e }), this.modeButtons.forEach((t, n) => {
			t.addEventListener("click", () => this.selectMode(n), { signal: e }), t.addEventListener("keydown", (e) => this.handleTabArrows(e, n), { signal: e });
		}), this.bodyButtons.forEach((t, n) => {
			t.addEventListener("click", () => this.selectBody(n), { signal: e }), t.addEventListener("keydown", (e) => this.handleRadioArrows(e, [...this.bodyButtons.values()]), { signal: e });
		}), this.colorButtons.forEach((t, n) => {
			t.addEventListener("click", () => this.selectColor(n), { signal: e }), t.addEventListener("keydown", (e) => this.handleRadioArrows(e, [...this.colorButtons.values()]), { signal: e });
		}), this.partGroups.forEach((t, n) => {
			t.buttons.forEach((r) => {
				r.addEventListener("click", () => this.selectPart(n, r.dataset.partId ?? ""), { signal: e }), r.addEventListener("keydown", (e) => this.handleRadioArrows(e, t.buttons), { signal: e });
			}), t.details.addEventListener("toggle", () => {
				t.details.open && this.partGroups.forEach((e, t) => {
					t !== n && (e.details.open = !1);
				});
			}, { signal: e });
		});
		let t = () => this.applyPartFilters();
		this.searchInput.addEventListener("input", t, { signal: e }), this.classFilter.addEventListener("change", t, { signal: e }), this.skinFilter.addEventListener("change", t, { signal: e }), this.levelFilter.addEventListener("change", t, { signal: e }), this.host.querySelector("[data-action=\"clear-filters\"]")?.addEventListener("click", () => {
			this.searchInput.value = "", this.classFilter.value = "", this.skinFilter.value = "", this.levelFilter.value = "", this.applyPartFilters(), this.searchInput.focus();
		}, { signal: e }), this.geneForm.addEventListener("submit", (e) => {
			e.preventDefault(), this.applyGenes();
		}, { signal: e }), this.geneInput.addEventListener("input", () => {
			this.geneTimer !== void 0 && window.clearTimeout(this.geneTimer), this.geneTimer = window.setTimeout(() => this.applyGenes(!0), 420);
		}, { signal: e }), this.qualitySelect.addEventListener("change", () => {
			if (this.disabledState || this.loadingState) return;
			let e = this.qualitySelect.value;
			r.includes(e) && this.commit({
				...this.currentState,
				quality: e
			}, "quality", void 0, this.viewMode);
		}, { signal: e }), this.artButtons.forEach((t, n) => {
			t.addEventListener("click", () => {
				this.disabledState || this.loadingState || this.commit({
					...this.currentState,
					artMode: n
				}, "art-mode", void 0, this.viewMode);
			}, { signal: e }), t.addEventListener("keydown", (e) => this.handleRadioArrows(e, [...this.artButtons.values()]), { signal: e });
		}), this.postprocessToggle.addEventListener("click", () => {
			this.disabledState || this.loadingState || !this.postprocessSupported || (this.postprocessEnabled = !this.postprocessEnabled, this.syncPostprocess(), this.options.postprocess?.onChange?.(this.postprocessEnabled));
		}, { signal: e }), this.host.querySelector("[data-action=\"reset\"]")?.addEventListener("click", () => {
			if (this.disabledState || this.loadingState) return;
			let e = x(this.resetState, this.openState);
			this.viewMode = e.mode, this.commit(e, "reset"), this.setStatus("Creator reset to its initial Axie.", "success");
		}, { signal: e }), this.host.querySelector("[data-action=\"randomize\"]")?.addEventListener("click", () => {
			this.disabledState || this.loadingState || (this.viewMode = "manual", this.commit(o(this.catalog, {
				quality: this.currentState.quality,
				artMode: this.currentState.artMode,
				studioOpen: this.openState
			}), "external"), this.setStatus("Random manifest-backed Axie created.", "success"));
		}, { signal: e }), document.addEventListener("keydown", (e) => this.handleDocumentKeydown(e), { signal: e });
		let n = this.options.keyboardShortcut === void 0 ? "KeyX" : this.options.keyboardShortcut;
		n && document.addEventListener("keydown", (e) => {
			if (e.code !== n || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
			let t = e.target;
			t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t instanceof HTMLElement && t.isContentEditable || (e.preventDefault(), this.openState ? this.close() : this.open());
		}, { signal: e });
	}
	selectMode(e) {
		this.disabledState || this.loadingState || e === this.viewMode || (this.viewMode = e, e === "manual" && this.currentState.mode === "genes" ? this.commit(l(this.currentState, this.catalog), "external") : (this.syncMode(), e === "genes" && queueMicrotask(() => this.geneInput.focus())));
	}
	selectBody(e) {
		if (this.disabledState || this.loadingState) return;
		let t = l(this.currentState, this.catalog);
		this.commit(f(this.catalog, {
			body: e,
			colorVariant: t.descriptor.colorVariant,
			parts: t.parts
		}, t), "body");
	}
	selectColor(e) {
		if (this.disabledState || this.loadingState) return;
		let t = l(this.currentState, this.catalog);
		this.commit(f(this.catalog, {
			body: t.descriptor.body,
			colorVariant: e,
			parts: t.parts
		}, t), "color");
	}
	selectPart(e, t) {
		if (this.disabledState || this.loadingState || !S(this.catalog, e, t)) return;
		let n = l(this.currentState, this.catalog), r = T(n);
		r[e] = t, this.commit(f(this.catalog, {
			body: n.descriptor.body,
			colorVariant: n.descriptor.colorVariant,
			parts: r
		}, n), "part", e);
	}
	applyGenes(e = !1) {
		if (this.disabledState || this.loadingState) return;
		let t = this.geneInput.value;
		if (!t) {
			this.geneInput.removeAttribute("aria-invalid"), this.geneFeedback.dataset.tone = "neutral", this.geneFeedback.textContent = "Paste genes to decode an Axie.";
			return;
		}
		try {
			let e = i.decode(t), n = s(this.catalog, e.descriptor), r = p(Object.freeze({
				mode: "genes",
				genes: e.genes,
				descriptor: e.descriptor,
				unsupportedClasses: e.unsupportedClasses,
				resolvedParts: n,
				quality: this.currentState.quality,
				artMode: this.currentState.artMode,
				studioOpen: this.openState
			}), this.catalog), a = this.currentState.mode === "genes" ? this.currentState.genes : void 0, o = r.mode === "genes" ? r.genes : void 0, c = a !== void 0 && a === o;
			this.geneInput.removeAttribute("aria-invalid"), c ? (this.syncGeneFeedback(), this.syncGeneResolution()) : this.commit(r, "genes");
		} catch (t) {
			this.geneInput.setAttribute("aria-invalid", "true"), this.geneFeedback.dataset.tone = "error", this.geneFeedback.textContent = t instanceof Error ? t.message : "Genes could not be decoded.", e || (this.announcer.textContent = this.geneFeedback.textContent);
		}
	}
	commit(e, t, n, r = e.mode) {
		this.currentState = p(x(e, this.openState), this.catalog), this.viewMode = r, this.syncAll(), this.notify(t, n);
	}
	notify(e, t) {
		let n = Object.freeze({
			state: this.currentState,
			reason: e,
			...t ? { changedPart: t } : {}
		});
		this.options.onChange?.(n), this.host.dispatchEvent(new CustomEvent(m, {
			bubbles: !0,
			detail: n
		}));
	}
	syncAll() {
		this.syncMode(), this.syncSelections(), this.syncGeneFeedback(), this.syncGeneResolution(), this.applyPartFilters(), this.qualitySelect.value = this.currentState.quality, this.artButtons.forEach((e, t) => {
			let n = this.currentState.artMode === t;
			e.setAttribute("aria-checked", String(n)), e.tabIndex = n ? 0 : -1;
		}), this.syncPostprocess();
		let e = this.currentState.descriptor.body;
		this.currentBadge.textContent = e.slice(0, 3).toUpperCase(), this.trigger.setAttribute("aria-label", `Open Axie Creator. Current body: ${e}.`);
	}
	syncMode() {
		this.host.dataset.mode = this.viewMode, this.modeButtons.forEach((e, t) => {
			let n = t === this.viewMode;
			e.setAttribute("aria-selected", String(n)), e.tabIndex = n ? 0 : -1;
		}), this.manualPanel.hidden = this.viewMode !== "manual", this.genesPanel.hidden = this.viewMode !== "genes", this.currentState.mode === "genes" && this.geneInput.value !== this.currentState.genes && (this.geneInput.value = this.currentState.genes);
	}
	syncSelections() {
		let e = this.currentState, t = e.mode === "manual" ? e.parts : e.resolvedParts, n = e.descriptor.body, r = e.descriptor.colorVariant;
		this.bodyButtons.forEach((e, t) => {
			let r = n === t;
			e.setAttribute("aria-checked", String(r)), e.tabIndex = r ? 0 : -1;
		}), this.colorButtons.forEach((e, t) => {
			let n = r === t;
			e.setAttribute("aria-checked", String(n)), e.tabIndex = n ? 0 : -1;
		}), this.partGroups.forEach((e, n) => {
			let r = t[n];
			e.selected.textContent = w(this.catalog, n, r), e.buttons.forEach((e) => {
				let t = e.dataset.partId === r;
				e.setAttribute("aria-checked", String(t)), e.tabIndex = t ? 0 : -1;
			});
		});
	}
	syncGeneResolution() {
		let n = this.currentState, r = n.descriptor, i = n.mode === "genes" ? n.resolvedParts : n.parts;
		this.geneResolution.replaceChildren(), [
			[
				"Body",
				r.body,
				this.catalog.bodies.some((e) => e.id === r.body && e.available)
			],
			[
				"Color",
				this.catalog.colors.find((e) => e.index === r.colorVariant)?.key ?? `Index ${r.colorVariant}`,
				this.catalog.colors.some((e) => e.index === r.colorVariant && e.available)
			],
			...t.map((t) => {
				let n = r.parts.find((e) => e.type === t), a = i[t], o = n ? `${n.class ?? "Unknown class"} ${n.variant.toString().padStart(2, "0")} · omitted (${e(n)})` : "Descriptor slot missing · omitted";
				return [
					g[t],
					a ? w(this.catalog, t, a) : o,
					!!a
				];
			})
		].forEach(([e, t, n]) => {
			let r = b("dt", "", e), i = b("dd", "", t);
			i.dataset.available = String(n), n || (i.title = "Not available in the exported Three.js mixer manifest."), this.geneResolution.append(r, i);
		});
	}
	syncGeneFeedback() {
		let e = this.currentState;
		if (e.mode !== "genes") {
			this.geneInput.removeAttribute("aria-invalid"), this.geneFeedback.dataset.tone = "neutral", this.geneFeedback.textContent = "Paste genes to decode an Axie.";
			return;
		}
		let n = Object.keys(e.resolvedParts).length, r = e.unsupportedClasses.length;
		this.geneInput.removeAttribute("aria-invalid"), this.geneFeedback.dataset.tone = n === t.length && r === 0 ? "success" : "warning";
		let i = n === t.length ? "all six parts resolved" : `${n} of six exported parts resolved`, a = r > 0 ? ` · ${r} unknown class ${r === 1 ? "code" : "codes"} preserved for Unity-compatible omission` : "";
		this.geneFeedback.textContent = `Unity-compatible genes · ${i}${a}.`;
	}
	applyPartFilters() {
		let e = this.searchInput.value.trim().toLowerCase(), t = this.classFilter.value, n = this.skinFilter.value, r = this.levelFilter.value;
		this.partGroups.forEach((i) => {
			let a = 0;
			i.buttons.forEach((i) => {
				let o = (!e || i.dataset.search?.includes(e)) && (!t || i.dataset.partClass === t) && (!n || i.dataset.skin === n) && (!r || i.dataset.level === r);
				i.hidden = !o, o && (a += 1);
			}), i.count.textContent = `${a}/${i.buttons.length}`, i.empty.hidden = a > 0;
		});
	}
	updateInteractivity() {
		let e = this.disabledState || this.loadingState;
		this.content.inert = e, this.content.setAttribute("aria-disabled", String(e)), this.modeButtons.forEach((t) => {
			t.disabled = e;
		}), this.host.querySelectorAll(".axie-creator-footer button:not(.axie-creator-done)").forEach((t) => {
			t.disabled = e;
		}), this.postprocessToggle.disabled = e || !this.postprocessSupported;
	}
	syncPostprocess() {
		let e = this.postprocessSupported && this.postprocessEnabled;
		this.postprocessToggle.setAttribute("aria-checked", String(e)), this.postprocessToggle.dataset.supported = String(this.postprocessSupported);
		let t = this.postprocessToggle.querySelector(".axie-creator-postprocess-state");
		t && (t.textContent = this.postprocessSupported ? e ? "On" : "Off" : "N/A"), this.postprocessToggle.disabled = this.disabledState || this.loadingState || !this.postprocessSupported;
	}
	handleDocumentKeydown(e) {
		if (!this.openState) return;
		if (e.key === "Escape") {
			e.preventDefault(), this.close();
			return;
		}
		if (e.key !== "Tab") return;
		let t = [...this.panel.querySelectorAll(_)].filter((e) => !e.hidden && e.getClientRects().length > 0 && !e.closest("[hidden]"));
		if (t.length === 0) return;
		let n = t[0], r = t[t.length - 1];
		e.shiftKey && document.activeElement === n ? (e.preventDefault(), r.focus()) : !e.shiftKey && document.activeElement === r && (e.preventDefault(), n.focus());
	}
	handleTabArrows(e, t) {
		if (![
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown"
		].includes(e.key)) return;
		e.preventDefault();
		let n = t === "manual" ? "genes" : "manual";
		this.selectMode(n), this.modeButtons.get(n)?.focus();
	}
	handleRadioArrows(e, t) {
		if (![
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Home",
			"End"
		].includes(e.key)) return;
		let n = t.filter((e) => !e.disabled && !e.hidden && e.getClientRects().length > 0);
		if (n.length === 0) return;
		e.preventDefault();
		let r = Math.max(0, n.indexOf(e.currentTarget)), i = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1, a = e.key === "Home" ? 0 : e.key === "End" ? n.length - 1 : (r + i + n.length) % n.length;
		n[a].focus(), n[a].click();
	}
	assertAlive() {
		if (this.destroyed) throw Error("Axie Creator has been destroyed.");
	}
};
function D(e) {
	return new E(e);
}
//#endregion
//#region src/animation-panel.ts
function O(e, t) {
	let n = document.createElement(e);
	return t && (n.className = t), n;
}
function k(e) {
	let t = e.name.indexOf(".");
	return t >= 0 ? e.name.slice(t + 1) : e.name;
}
function A(e) {
	return Number.isFinite(e) ? `${e.toFixed(e < 10 ? 2 : 1)}s` : "—";
}
function j(e) {
	let t = O("div", "axie-animation-host");
	t.dataset.active = "false", t.dataset.open = "false";
	let n = O("button", "axie-animation-toggle");
	n.type = "button", n.setAttribute("aria-expanded", "false"), n.setAttribute("aria-controls", "axie-animation-panel"), n.setAttribute("aria-keyshortcuts", "K");
	let r = O("span");
	r.setAttribute("aria-hidden", "true"), r.textContent = "▶";
	let i = O("b");
	i.textContent = "ANIMATIONS";
	let a = O("i");
	a.textContent = "0", n.append(r, i, a);
	let o = O("section", "axie-animation-panel");
	o.id = "axie-animation-panel", o.setAttribute("aria-label", "Axie animations"), o.setAttribute("aria-hidden", "true"), o.inert = !0;
	let s = O("header", "axie-animation-header"), c = O("div"), l = O("span", "axie-animation-kicker");
	l.textContent = "EXPORTED CLIP LIBRARY";
	let u = O("h2");
	u.textContent = "Animations";
	let d = O("p");
	d.textContent = "Choose an action, then keep moving with WASD.", c.append(l, u, d);
	let f = O("button", "axie-animation-close");
	f.type = "button", f.setAttribute("aria-label", "Close animations"), f.textContent = "×", s.append(c, f);
	let p = O("div", "axie-animation-now"), m = O("span");
	m.textContent = "Playing";
	let h = O("strong");
	h.textContent = "Default.Idle";
	let g = O("button");
	g.type = "button", g.textContent = "Resume locomotion", g.disabled = !0, p.append(m, h, g);
	let _ = O("label", "axie-animation-weapon"), v = O("span");
	v.textContent = "Weapon";
	let y = O("select");
	y.setAttribute("aria-label", "Equip Axie weapon");
	let b = O("small");
	b.textContent = "Default / none", _.append(v, y, b);
	let x = O("div", "axie-animation-tools"), S = O("input");
	S.type = "search", S.placeholder = "Search all animations", S.setAttribute("aria-label", "Search Axie animations");
	let C = O("select");
	C.setAttribute("aria-label", "Filter animation group"), x.append(S, C);
	let w = O("div", "axie-animation-results"), T = O("p", "axie-animation-empty");
	T.textContent = "No animations match this filter.", T.hidden = !0, o.append(s, p, _, x, w, T), t.append(n, o), e.mount.append(t);
	let E = [], D = [], j = !1, M = !1, N = "all", P = "", F = () => {
		let e = S.value.trim().toLocaleLowerCase(), t = E.filter((t) => (N === "all" || t.group === N) && (!e || t.name.toLocaleLowerCase().includes(e)));
		w.replaceChildren();
		let n = /* @__PURE__ */ new Map();
		t.forEach((e) => {
			let t = n.get(e.group) ?? [];
			t.push(e), n.set(e.group, t);
		}), [...n.entries()].sort(([e], [t]) => e.localeCompare(t)).forEach(([e, t]) => {
			let n = O("section", "axie-animation-group"), r = O("h3"), i = O("span");
			i.textContent = e;
			let a = O("i");
			a.textContent = String(t.length), r.append(i, a);
			let o = O("div");
			t.forEach((e) => {
				let t = O("button", "axie-animation-button");
				t.type = "button", t.dataset.animation = e.name, t.setAttribute("aria-pressed", String(e.name === P));
				let n = O("span");
				n.textContent = k(e);
				let r = O("small");
				r.textContent = `${e.looping ? "LOOP" : "ONCE"} · ${A(e.duration)}`, t.append(n, r), o.append(t);
			}), n.append(r, o), w.append(n);
		}), T.hidden = t.length !== 0;
	}, I = (r) => {
		let i = M && r;
		i !== j && (j = i, t.dataset.open = String(j), n.setAttribute("aria-expanded", String(j)), o.setAttribute("aria-hidden", String(!j)), o.inert = !j, e.onOpenChange?.(j));
	};
	return n.addEventListener("click", () => {
		I(!j), e.onGameplayFocus?.();
	}), f.addEventListener("click", () => {
		I(!1), e.onGameplayFocus?.();
	}), g.addEventListener("click", () => {
		e.onResumeLocomotion(), e.onGameplayFocus?.();
	}), S.addEventListener("input", F), C.addEventListener("change", () => {
		N = C.value, F();
	}), w.addEventListener("click", (t) => {
		let n = t.target.closest("[data-animation]"), r = E.find((e) => e.name === n?.dataset.animation);
		r && (e.onPlay(r), e.onGameplayFocus?.());
	}), y.addEventListener("change", () => {
		e.onEquipWeapon(y.value || void 0), e.onGameplayFocus?.();
	}), {
		host: t,
		get isOpen() {
			return j;
		},
		setAvailable(e) {
			M = e, t.dataset.active = String(M), n.disabled = !M, M || I(!1);
		},
		setAnimations(e) {
			E = [...e].sort((e, t) => e.group.localeCompare(t.group) || e.name.localeCompare(t.name)), a.textContent = String(E.length);
			let t = [...new Set(E.map((e) => e.group))].sort((e, t) => e.localeCompare(t));
			C.replaceChildren();
			let n = O("option");
			n.value = "all", n.textContent = `All groups · ${E.length}`, C.append(n), t.forEach((e) => {
				let t = O("option");
				t.value = e, t.textContent = e, C.append(t);
			}), N = "all", C.value = N, S.value = "", F();
		},
		setWeapons(e) {
			D = [...e], y.replaceChildren();
			let t = O("option");
			t.value = "", t.textContent = "Default / none", y.append(t), D.forEach((e) => {
				let t = O("option");
				t.value = e.id, t.textContent = e.available ? e.label : `${e.label} · unavailable`, t.disabled = !e.available, e.unavailableReason && (t.title = e.unavailableReason), y.append(t);
			}), y.value = "", b.textContent = `${D.filter((e) => e.available).length}/${D.length} available`;
		},
		setActive(e, n) {
			P = e ?? "", h.textContent = e ?? "None", g.disabled = !n, t.dataset.overridden = String(n), w.querySelectorAll("[data-animation]").forEach((e) => {
				e.setAttribute("aria-pressed", String(e.dataset.animation === P));
			});
		},
		setActiveWeapon(e, n) {
			let r = n ?? e ?? "";
			[...y.options].some((e) => e.value === r) && (y.value = r), y.disabled = !!n, b.textContent = n ? `Loading ${n}…` : e ? `${e} equipped` : "Default / none", t.dataset.weapon = e ?? "", t.dataset.weaponLoading = n ?? "";
		},
		open: () => I(!0),
		close: () => I(!1),
		toggle: () => I(!j),
		dispose() {
			t.remove(), E = [], D = [];
		}
	};
}
//#endregion
export { m as AXIE_CREATOR_CHANGE_EVENT, h as AXIE_CREATOR_OPEN_EVENT, E as AxieCreator, j as createAxieAnimationPanel, D as createAxieCreator, d as createAxieCreatorCatalog, c as createAxieCreatorStateCodec, u as createDefaultAxieCreatorState };

//# sourceMappingURL=creator-dom.js.map