/**
 * EXPRCOMP — Expression Compiler Visualizer
 * Premium Corporate Light Theme Controller
 */

"use strict";

/* ═══════════════════════════════════════════════════
   STAGE DEFINITIONS
   ═══════════════════════════════════════════════════ */
const STAGES = [
  { id: 0, title: "Lexical Analysis",      tip: "Tokenizer" },
  { id: 1, title: "Syntax Analysis",       tip: "AST builder" },
  { id: 2, title: "AST Optimization",      tip: "Constant fold" },
  { id: 3, title: "TAC Generation",        tip: "3-addr code" },
  { id: 4, title: "IR Optimization",       tip: "Peephole pass" },
  { id: 5, title: "Instr. Selection",      tip: "µop mapping" },
  { id: 6, title: "Register Allocation",   tip: "R0/R1 binding" },
  { id: 7, title: "Scheduling",            tip: "Issue order" },
  { id: 8, title: "Assembly",              tip: "Target code" },
  { id: 9, title: "Machine Code",          tip: "Binary words" },
  { id: 10, title: "Automata Generator",   tip: "DFA/NFA + JFLAP export" },
];

const LOADER_MESSAGES = [
  "Initializing lexer…",
  "Tokenizing input stream…",
  "Building parse tree…",
  "Running constant fold…",
  "Emitting TAC…",
  "IR peephole pass…",
  "Selecting instructions…",
  "Allocating registers…",
  "Scheduling instructions…",
  "Assembling machine words…",
];

/* ═══════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════ */
let activeStage = 0;
let playTimer   = null;
let loaderTimer = null;
let loaderIdx   = 0;
let lastWorkflowData = null;

/* ═══════════════════════════════════════════════════
   AMBIENT PARTICLE CANVAS (Theme-aware)
   ═══════════════════════════════════════════════════ */
(function initCircuitCanvas() {
  const canvas = document.getElementById("circuit-canvas");
  if (!canvas) return;
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function getTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }
  function paletteFor(theme) {
    // keep the existing light palette; match the provided dark aesthetic when toggled
    if (theme === "dark") {
      return [
        "rgba(56,189,122,", // green
        "rgba(91,156,246,", // blue
        "rgba(240,165,0,",  // amber
        "rgba(167,139,250,", // violet
      ];
    }
    return [
      "rgba(37,99,235,",   // blue
      "rgba(14,165,233,",  // sky
      "rgba(99,102,241,",  // indigo
      "rgba(20,184,166,",  // teal
    ];
  }

  const nodes = [];
  for (let i = 0; i < 32; i++) {
    nodes.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1.6 + 0.8,
      pulse: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * 4),
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pal = paletteFor(getTheme());

    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy; n.pulse += 0.014;
      if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });

    // Orthogonal circuit traces between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const alpha = (1 - dist / 180) * 0.18;
          ctx.beginPath();
          ctx.strokeStyle = pal[nodes[i].colorIdx] + alpha + ")";
          ctx.lineWidth = 0.75;
          const midX = (nodes[i].x + nodes[j].x) / 2;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(midX, nodes[i].y);
          ctx.lineTo(midX, nodes[j].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      const pulse = Math.sin(n.pulse) * 0.5 + 0.5;
      const alpha = 0.15 + pulse * 0.22;
      const radius = n.r * (1 + pulse * 0.5);
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = pal[n.colorIdx] + alpha + ")";
      ctx.fill();
    });

    requestAnimationFrame(drawFrame);
  }
  drawFrame();
})();

/* ═══════════════════════════════════════════════════
   THEME TOGGLE (Light ↔ Dark)
   ═══════════════════════════════════════════════════ */
function getStoredTheme() {
  try { return localStorage.getItem("lexicore_theme"); } catch { return null; }
}
function storeTheme(v) {
  try { localStorage.setItem("lexicore_theme", v); } catch {}
}
function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function themeIconSvg(theme) {
  // sun for light, moon for dark (simple inline SVG)
  if (theme === "dark") {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2 6 6M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  storeTheme(document.documentElement.dataset.theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.style.color = theme === "dark" ? "rgba(56,189,122,0.95)" : "var(--blue)";
    const ic = btn.querySelector(".theme-ic");
    if (ic) ic.innerHTML = themeIconSvg(theme);
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("title", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
}

/* ═══════════════════════════════════════════════════
   STAGE RAIL
   ═══════════════════════════════════════════════════ */
function buildStageRail() {
  const nav = document.getElementById("stage-nav");
  if (!nav) return;
  nav.innerHTML = "";
  STAGES.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rail-btn";
    btn.dataset.stage = String(i);
    btn.innerHTML = `
      <span class="rail-n">${String(i + 1).padStart(2, "0")}</span>
      <span class="rail-info">
        <span class="rail-name">${s.title}</span>
        <span class="rail-tip">${s.tip}</span>
      </span>`;
    btn.addEventListener("click", () => setActiveStage(i));
    nav.appendChild(btn);
  });
}

function setActiveStage(i, scroll = true) {
  activeStage = Math.max(0, Math.min(STAGES.length - 1, i));
  const pct = ((activeStage + 1) / STAGES.length) * 100;
  const fill = document.getElementById("progress-fill");
  const lbl  = document.getElementById("progress-label");
  if (fill) fill.style.width = pct + "%";
  if (lbl)  lbl.textContent = Math.round(pct) + "%";

  document.querySelectorAll(".rail-btn").forEach(btn => {
    btn.classList.toggle("active", +btn.dataset.stage === activeStage);
  });

  document.querySelectorAll(".stage-card").forEach(el => {
    const sid = +el.dataset.stage;
    el.classList.remove("active-stage");
    if (sid === activeStage) {
      el.classList.add("active-stage");
      if (scroll) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

// Keep rail selection synced with viewport while user scrolls content.
function initStageScrollSync() {
  const cards = Array.from(document.querySelectorAll(".stage-card[data-stage]"));
  if (!cards.length) return;

  let ticking = false;
  let last = -1;
  let suppressUntil = 0;

  const calcNearest = () => {
    const mid = window.innerHeight * 0.45;
    let bestStage = null;
    let bestDist = Infinity;

    for (const card of cards) {
      const st = Number(card.dataset.stage);
      if (Number.isNaN(st)) continue;
      const r = card.getBoundingClientRect();
      // only consider cards intersecting viewport band
      if (r.bottom < 80 || r.top > window.innerHeight - 80) continue;
      const center = r.top + r.height * 0.5;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestStage = st;
      }
    }
    return bestStage;
  };

  const onScroll = () => {
    if (Date.now() < suppressUntil) return;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const st = calcNearest();
      if (st != null && st !== last) {
        last = st;
        setActiveStage(st, false);
      }
      ticking = false;
    });
  };

  // Prevent bounce when we intentionally scroll to a stage from rail click/play mode.
  document.querySelectorAll(".rail-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      suppressUntil = Date.now() + 700;
    });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
}

/* ═══════════════════════════════════════════════════
   WALKTHROUGH
   ═══════════════════════════════════════════════════ */
function stopPlay() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
}
function startPlay() {
  stopPlay();
  setActiveStage(0);
  playTimer = setInterval(() => {
    if (activeStage >= STAGES.length - 1) { stopPlay(); return; }
    setActiveStage(activeStage + 1);
  }, 1500);
}
function stepNext() {
  stopPlay();
  setActiveStage(activeStage < STAGES.length - 1 ? activeStage + 1 : 0);
}

/* ═══════════════════════════════════════════════════
   LOADING
   ═══════════════════════════════════════════════════ */
function showLoader() {
  const ov = document.getElementById("loading-overlay");
  if (ov) ov.classList.remove("hidden");
  loaderIdx = 0;
  const lbl = document.getElementById("loader-stage-label");
  if (lbl) lbl.textContent = LOADER_MESSAGES[0];
  loaderTimer = setInterval(() => {
    loaderIdx = (loaderIdx + 1) % LOADER_MESSAGES.length;
    if (lbl) lbl.textContent = LOADER_MESSAGES[loaderIdx];
  }, 450);
}
function hideLoader() {
  clearInterval(loaderTimer);
  const ov = document.getElementById("loading-overlay");
  if (ov) ov.classList.add("hidden");
}

/* ═══════════════════════════════════════════════════
   STAGE STATUS BADGES
   ═══════════════════════════════════════════════════ */
function setStageStatus(i, state) {
  const el = document.getElementById("st-" + i);
  if (!el) return;
  el.className = "stage-status";
  if (state === "ok")       { el.textContent = "OK"; el.classList.add("ok"); }
  else if (state === "err") { el.textContent = "ERROR"; el.classList.add("err"); }
  else                      { el.textContent = "PENDING"; }
}
function resetAllStatuses() {
  for (let i = 0; i < STAGES.length; i++) setStageStatus(i, "pending");
}

/* ═══════════════════════════════════════════════════
   AUTOMATA GENERATOR (Cytoscape + JFLAP export)
   ═══════════════════════════════════════════════════ */
let autoMode = "tokens"; // 'tokens' | 'regex'
let autoCy = null;
let autoModel = null; // {states,start,accept,transitions}
let autoSim = { input: "", idx: 0, state: null, halted: true, accepted: false };

function numberDfaModel() {
  return {
    states: ["q0", "q1", "q2", "q3"],
    start: "q0",
    accept: ["q1", "q3"],
    transitions: [
      { from: "q0", to: "q1", label: "0-9" },
      { from: "q1", to: "q1", label: "0-9" },
      { from: "q1", to: "q2", label: "." },
      { from: "q2", to: "q3", label: "0-9" },
      { from: "q3", to: "q3", label: "0-9" },
    ],
    meta: {
      type: "DFA",
      name: "number_dfa",
      tooltips: { q0: "Start", q1: "Integer state", q2: "Dot seen", q3: "Fraction state" },
    },
  };
}

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ensureAutoCy() {
  const el = document.getElementById("auto-cy");
  if (!el || typeof cytoscape === "undefined") return null;
  if (autoCy) return autoCy;

  autoCy = cytoscape({
    container: el,
    wheelSensitivity: 0.18,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "rgba(148,163,184,0.55)",
          "border-width": 2,
          "border-color": "rgba(148,163,184,0.55)",
          label: "data(label)",
          "font-family": "JetBrains Mono, monospace",
          "font-size": 12,
          color: "#0f172a",
          "text-valign": "center",
          "text-halign": "center",
          width: 46,
          height: 46,
        },
      },
      {
        selector: "node.start",
        style: {
          "background-color": "rgba(37,99,235,0.26)",
          "border-color": "rgba(37,99,235,0.55)",
        },
      },
      {
        selector: "node.accept",
        style: {
          "border-style": "double",
          "border-width": 4,
          "border-color": "rgba(20,184,166,0.75)",
          "background-color": "rgba(20,184,166,0.18)",
        },
      },
      {
        selector: "node.active",
        style: {
          "border-color": "rgba(124,58,237,0.8)",
          "background-color": "rgba(124,58,237,0.18)",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "rgba(37,99,235,0.35)",
          "target-arrow-color": "rgba(37,99,235,0.35)",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-family": "JetBrains Mono, monospace",
          "font-size": 11,
          color: "#334155",
          "text-rotation": "autorotate",
          "text-background-color": "rgba(255,255,255,0.9)",
          "text-background-opacity": 1,
          "text-background-padding": 2,
        },
      },
      {
        selector: "edge.active",
        style: {
          width: 3,
          "line-color": "rgba(124,58,237,0.55)",
          "target-arrow-color": "rgba(124,58,237,0.55)",
        },
      },
    ],
    layout: { name: "circle", padding: 30, animate: true, animationDuration: 450 },
  });

  autoCy.on("mouseover", "node", (evt) => {
    const n = evt.target;
    const tip = n.data("tip");
    if (tip) el.setAttribute("title", tip);
  });

  return autoCy;
}

function modelToCyElements(model) {
  const nodes = model.states.map((s) => ({
    data: {
      id: s,
      label: s,
      tip: model.meta?.tooltips?.[s] ? `${s} → ${model.meta.tooltips[s]}` : s,
    },
    classes: [
      s === model.start ? "start" : "",
      model.accept.includes(s) ? "accept" : "",
    ].filter(Boolean).join(" "),
  }));

  const edgeMap = new Map();
  for (const tr of model.transitions) {
    const key = `${tr.from}__${tr.to}`;
    const prev = edgeMap.get(key);
    if (!prev) edgeMap.set(key, { ...tr });
    else prev.label = `${prev.label},${tr.label}`;
  }
  const edges = Array.from(edgeMap.values()).map((tr, idx) => ({
    data: { id: `e${idx}`, source: tr.from, target: tr.to, label: tr.label },
  }));

  const startArrowId = "__start__";
  const startArrow = {
    data: { id: startArrowId, label: "" },
    selectable: false,
    grabbable: false,
    classes: "startArrow",
  };
  const startEdge = {
    data: { id: "__startEdge__", source: startArrowId, target: model.start, label: "" },
    selectable: false,
  };

  return { nodes: [startArrow, ...nodes], edges: [startEdge, ...edges] };
}

function renderAutomaton(model) {
  autoModel = model;
  const cy = ensureAutoCy();
  const jsonEl = document.getElementById("auto-json-out");
  if (jsonEl) jsonEl.textContent = JSON.stringify(model, null, 2);

  if (!cy) return;
  const { nodes, edges } = modelToCyElements(model);
  cy.elements().remove();
  cy.add(nodes);
  cy.add(edges);

  cy.style()
    .selector("node.startArrow")
    .style({
      shape: "triangle",
      width: 18,
      height: 18,
      "background-color": "rgba(37,99,235,0.55)",
      "border-width": 0,
      "text-opacity": 0,
    })
    .update();

  cy.layout({ name: "breadthfirst", directed: true, padding: 34, animate: true, animationDuration: 550 }).run();
  setStageStatus(10, "ok");
  autoSimReset();
}

function setAutoMode(mode) {
  autoMode = mode;
  const a = document.getElementById("auto-mode-tokens");
  const b = document.getElementById("auto-mode-regex");
  if (a) a.classList.toggle("active", mode === "tokens");
  if (b) b.classList.toggle("active", mode === "regex");
}

function initAutomataGenerator() {
  const btnTokens = document.getElementById("auto-mode-tokens");
  const btnRegex = document.getElementById("auto-mode-regex");
  const btnGen = document.getElementById("auto-generate");
  const btnExport = document.getElementById("auto-export");

  if (btnTokens) btnTokens.addEventListener("click", () => setAutoMode("tokens"));
  if (btnRegex) btnRegex.addEventListener("click", () => setAutoMode("regex"));

  if (btnGen) btnGen.addEventListener("click", () => {
    try {
      const inputEl = document.getElementById("auto-input");
      const val = inputEl ? inputEl.value.trim() : "";
      if (autoMode === "tokens") renderAutomaton(numberDfaModel());
      else renderAutomaton(regexToDfaModel(val || "(a|b)*abb"));
    } catch (e) {
      setStageStatus(10, "err");
      showErrorBanner({ phase: "automata", message: String(e.message || e) });
    }
  });

  if (btnExport) btnExport.addEventListener("click", () => {
    try {
      if (!autoModel) renderAutomaton(autoMode === "tokens" ? numberDfaModel() : regexToDfaModel("(a|b)*abb"));
      exportJflap(autoModel);
    } catch (e) {
      showErrorBanner({ phase: "export", message: String(e.message || e) });
    }
  });

  const simRun = document.getElementById("auto-sim-run");
  const simStep = document.getElementById("auto-sim-step");
  const simReset = document.getElementById("auto-sim-reset");
  if (simRun) simRun.addEventListener("click", autoSimRunAll);
  if (simStep) simStep.addEventListener("click", autoSimStep);
  if (simReset) simReset.addEventListener("click", autoSimReset);

  renderAutomaton(numberDfaModel());
}

function matchLabel(label, ch) {
  if (label.includes(",")) return label.split(",").some((x) => matchLabel(x.trim(), ch));
  if (label === "0-9") return ch >= "0" && ch <= "9";
  if (label === ".") return ch === ".";
  if (label === "ε" || label === "") return ch === "";
  return label === ch;
}

function dfaStep(model, state, ch) {
  for (const tr of model.transitions) {
    if (tr.from !== state) continue;
    if (matchLabel(tr.label, ch)) return { next: tr.to, edge: tr };
  }
  return { next: null, edge: null };
}

function autoSimReset() {
  autoSim = { input: "", idx: 0, state: autoModel?.start ?? null, halted: true, accepted: false };
  const st = document.getElementById("auto-sim-status");
  if (st) st.textContent = "—";
  autoHighlight(null, null);
}

function autoSimLoad() {
  const inp = document.getElementById("auto-sim-input");
  autoSim.input = inp ? inp.value : "";
  autoSim.idx = 0;
  autoSim.state = autoModel?.start ?? null;
  autoSim.halted = false;
  autoSim.accepted = false;
  autoHighlight(autoSim.state, null);
}

function autoSimStep() {
  if (!autoModel) return;
  if (autoSim.halted) autoSimLoad();

  const st = document.getElementById("auto-sim-status");
  const ch = autoSim.idx < autoSim.input.length ? autoSim.input[autoSim.idx] : null;
  if (ch === null) {
    autoSim.halted = true;
    autoSim.accepted = autoModel.accept.includes(autoSim.state);
    if (st) st.textContent = autoSim.accepted ? `ACCEPT ✓ at ${autoSim.state}` : `REJECT ✗ at ${autoSim.state}`;
    autoHighlight(autoSim.state, null);
    return;
  }

  const { next, edge } = dfaStep(autoModel, autoSim.state, ch);
  if (!next) {
    autoSim.halted = true;
    if (st) st.textContent = `REJECT ✗ no transition from ${autoSim.state} on '${ch}'`;
    autoHighlight(autoSim.state, null);
    return;
  }

  autoSim.idx += 1;
  autoHighlight(next, edge);
  autoSim.state = next;
  if (st) st.textContent = `Read '${ch}' → ${next} (${autoSim.idx}/${autoSim.input.length})`;
}

function autoSimRunAll() {
  autoSimReset();
  autoSimLoad();
  const max = 4096;
  let guard = 0;
  while (!autoSim.halted && guard++ < max) autoSimStep();
}

function autoHighlight(stateId, edge) {
  const cy = ensureAutoCy();
  if (!cy) return;
  cy.nodes().removeClass("active");
  cy.edges().removeClass("active");
  if (stateId) cy.getElementById(stateId).addClass("active");
  if (edge) {
    cy.edges().forEach((e) => {
      if (e.data("source") === edge.from && e.data("target") === edge.to) e.addClass("active");
    });
  }
}

function exportJflap(model) {
  const cy = ensureAutoCy();
  const positions = {};
  if (cy) {
    cy.nodes().forEach((n) => {
      const id = n.id();
      if (id === "__start__") return;
      const p = n.position();
      positions[id] = { x: p.x, y: p.y };
    });
  }

  const stateIndex = new Map(model.states.map((s, i) => [s, i]));
  const xmlStates = model.states.map((s) => {
    const idx = stateIndex.get(s);
    const p = positions[s] || { x: 120 + idx * 90, y: 140 + (idx % 2) * 90 };
    const initial = s === model.start ? "<initial/>" : "";
    const final = model.accept.includes(s) ? "<final/>" : "";
    return `
    <state id="${idx}" name="${escXml(s)}">
      <x>${Math.round(p.x)}</x>
      <y>${Math.round(p.y)}</y>
      ${initial}
      ${final}
    </state>`;
  }).join("");

  const xmlTransitions = model.transitions.map((t) => {
    const from = stateIndex.get(t.from);
    const to = stateIndex.get(t.to);
    const reads = String(t.label).split(",").map(x => x.trim()).filter(Boolean);
    const many = reads.length ? reads : [""];
    return many.map((r) => `
    <transition>
      <from>${from}</from>
      <to>${to}</to>
      ${r === "ε" ? "<read/>" : `<read>${escXml(r)}</read>`}
    </transition>`).join("");
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<structure>
  <type>fa</type>
  <automaton>${xmlStates}${xmlTransitions}
  </automaton>
</structure>`;

  const blob = new Blob([xml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (model.meta?.name || "automaton") + ".jff";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── Regex → NFA (Thompson) → DFA (subset) ────────────────────────────
function regexToDfaModel(pattern) {
  const rx = (pattern || "").trim();
  if (!rx) throw new Error("Regex input is empty.");
  const { nfa, start, accept, alphabet } = regexToNfa(rx);
  const dfa = nfaToDfa(nfa, start, accept, alphabet);
  dfa.meta = { type: "DFA", name: "regex_dfa", tooltips: {} };
  return dfa;
}

function regexToNfa(pattern) {
  const tokens = [];
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === " " || c === "\t" || c === "\n") continue;
    if ("()|*".includes(c)) tokens.push(c);
    else tokens.push({ lit: c });
  }
  // insert concat operator '·'
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    out.push(t);
    const a = t;
    const b = tokens[i + 1];
    const aIsAtom = (typeof a === "object" && a.lit) || a === ")" || a === "*";
    const bIsAtom = (typeof b === "object" && b.lit) || b === "(";
    if (aIsAtom && bIsAtom) out.push("·");
  }
  // shunting-yard to postfix
  const prec = { "|": 1, "·": 2, "*": 3 };
  const assoc = { "|": "L", "·": "L", "*": "R" };
  const stack = [];
  const postfix = [];
  for (const t of out) {
    if (typeof t === "object") postfix.push(t);
    else if (t === "(") stack.push(t);
    else if (t === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") postfix.push(stack.pop());
      if (!stack.length) throw new Error("Regex parse error: mismatched ')'.");
      stack.pop();
    } else {
      while (stack.length) {
        const o2 = stack[stack.length - 1];
        if (o2 === "(") break;
        const p1 = prec[t] ?? 0;
        const p2 = prec[o2] ?? 0;
        if ((assoc[t] === "L" && p1 <= p2) || (assoc[t] === "R" && p1 < p2)) postfix.push(stack.pop());
        else break;
      }
      stack.push(t);
    }
  }
  while (stack.length) {
    const x = stack.pop();
    if (x === "(") throw new Error("Regex parse error: mismatched '('.");
    postfix.push(x);
  }

  // Thompson construction
  let sid = 0;
  const nfa = new Map(); // state -> [{to,label}]
  const mk = () => `n${sid++}`;
  const add = (a, to, label) => {
    if (!nfa.has(a)) nfa.set(a, []);
    nfa.get(a).push({ to, label });
  };
  const alphabet = new Set();

  const st = [];
  for (const t of postfix) {
    if (typeof t === "object") {
      const s = mk(), e = mk();
      add(s, e, t.lit);
      alphabet.add(t.lit);
      st.push({ start: s, accept: e });
    } else if (t === "·") {
      const b = st.pop(), a = st.pop();
      add(a.accept, b.start, "ε");
      st.push({ start: a.start, accept: b.accept });
    } else if (t === "|") {
      const b = st.pop(), a = st.pop();
      const s = mk(), e = mk();
      add(s, a.start, "ε"); add(s, b.start, "ε");
      add(a.accept, e, "ε"); add(b.accept, e, "ε");
      st.push({ start: s, accept: e });
    } else if (t === "*") {
      const a = st.pop();
      const s = mk(), e = mk();
      add(s, a.start, "ε"); add(s, e, "ε");
      add(a.accept, a.start, "ε"); add(a.accept, e, "ε");
      st.push({ start: s, accept: e });
    } else {
      throw new Error("Regex parse error: unknown operator.");
    }
  }
  if (st.length !== 1) throw new Error("Regex parse error: invalid expression.");
  const frag = st[0];
  return { nfa, start: frag.start, accept: frag.accept, alphabet: Array.from(alphabet).sort() };
}

function epsClosure(nfa, states) {
  const stack = [...states];
  const seen = new Set(states);
  while (stack.length) {
    const s = stack.pop();
    const outs = nfa.get(s) || [];
    for (const tr of outs) {
      if (tr.label !== "ε") continue;
      if (!seen.has(tr.to)) { seen.add(tr.to); stack.push(tr.to); }
    }
  }
  return seen;
}

function move(nfa, states, sym) {
  const out = new Set();
  for (const s of states) {
    const outs = nfa.get(s) || [];
    for (const tr of outs) {
      if (tr.label === sym) out.add(tr.to);
    }
  }
  return out;
}

function setKey(set) {
  return Array.from(set).sort().join(",");
}

function nfaToDfa(nfa, start, accept, alphabet) {
  const startSet = epsClosure(nfa, new Set([start]));
  const dStates = new Map(); // key -> name
  const queue = [];
  const mkName = (i) => `q${i}`;
  let idx = 0;
  const startKey = setKey(startSet);
  dStates.set(startKey, mkName(idx++));
  queue.push(startSet);
  const transitions = [];
  const acceptStates = new Set();

  while (queue.length) {
    const S = queue.shift();
    const Skey = setKey(S);
    const Sname = dStates.get(Skey);
    if (S.has(accept)) acceptStates.add(Sname);

    for (const a of alphabet) {
      const U = epsClosure(nfa, move(nfa, S, a));
      if (U.size === 0) continue;
      const Ukey = setKey(U);
      if (!dStates.has(Ukey)) {
        dStates.set(Ukey, mkName(idx++));
        queue.push(U);
      }
      transitions.push({ from: Sname, to: dStates.get(Ukey), label: a });
    }
  }

  return {
    states: Array.from(new Set(dStates.values())),
    start: dStates.get(startKey),
    accept: Array.from(acceptStates),
    transitions,
  };
}

/* ═══════════════════════════════════════════════════
   RENDER: TOKENS
   ═══════════════════════════════════════════════════ */
function renderTokens(tokens) {
  const wrap = document.getElementById("out-tokens");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (!tokens || !tokens.length) {
    wrap.innerHTML = `<span style="color:var(--text-3);font-size:12px;font-family:var(--font-mono);">No tokens</span>`;
    return;
  }
  tokens.forEach((t, i) => {
    const chip = document.createElement("div");
    chip.className = "token-chip tok-" + t.kind;
    chip.style.animationDelay = (i * 55) + "ms";
    const val  = t.value !== undefined ? String(t.value) : t.lexeme;
    chip.innerHTML = `<span class="tc-val">${escHtml(val)}</span><span class="tc-kind">${t.kind}</span>`;
    wrap.appendChild(chip);
  });
  setStageStatus(0, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: D3 AST (Light Mode Palette)
   ═══════════════════════════════════════════════════ */
function astToHierarchy(node) {
  if (!node) return { name: "∅" };
  if (node.type === "number") {
    const label = node.isInt ? String(node.value)
      : (node.value % 1 === 0 ? node.value.toFixed(1) : String(node.value));
    return { name: label, kind: "num", dataType: node.isInt ? "int" : "float" };
  }
  const ty = node.resultType ? `⟨${node.resultType}⟩` : "";
  return {
    name: node.op,
    kind: "op",
    sub: ty,
    children: (node.children || []).map(astToHierarchy),
  };
}

function renderD3Tree(containerId, rootData, key) {
  const container = document.getElementById(containerId.replace("#", ""));
  if (!container) return;
  container.innerHTML = "";

  const W = Math.max(container.clientWidth || 560, 320);
  const H = 260;
  const M = { top: 30, right: 20, bottom: 20, left: 20 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", W)
    .attr("height", H)
    .style("background", "transparent");

  const defs = svg.append("defs");

  // Light-mode gradient for links
  const lg = defs.append("linearGradient")
    .attr("id", `lg-${key}`)
    .attr("gradientUnits", "userSpaceOnUse");
  lg.append("stop").attr("offset", "0%").attr("stop-color", "#2563EB").attr("stop-opacity", "0.5");
  lg.append("stop").attr("offset", "100%").attr("stop-color", "#0EA5E9").attr("stop-opacity", "0.3");

  // Subtle glow for light mode
  const filter = defs.append("filter").attr("id", `glow-${key}`);
  filter.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur");
  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "blur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  const root = d3.hierarchy(rootData);
  const treeLayout = d3.tree().size([innerW, innerH]);
  treeLayout(root);

  // Links
  g.selectAll(".ast-link")
    .data(root.links())
    .join("path")
    .attr("class", "ast-link")
    .attr("fill", "none")
    .attr("stroke", `url(#lg-${key})`)
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0)
    .attr("d", d => {
      const sx = d.source.x, sy = d.source.y;
      const tx = d.target.x, ty = d.target.y;
      const midY = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    })
    .transition().duration(500).delay((d, i) => i * 55)
    .attr("stroke-opacity", 0.75);

  // Nodes
  const node = g.selectAll(".ast-node")
    .data(root.descendants())
    .join("g")
    .attr("class", "ast-node")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("opacity", 0);

  // Node circle — light mode colors
  node.append("circle")
    .attr("r", d => d.depth === 0 ? 22 : (d.data.kind === "num" ? 17 : 19))
    .attr("fill", d => {
      if (d.data.kind === "op") return "rgba(37,99,235,0.08)";
      if (d.data.dataType === "float") return "rgba(139,92,246,0.1)";
      return "rgba(14,165,233,0.1)";
    })
    .attr("stroke", d => {
      if (d.data.kind === "op") return "#2563EB";
      if (d.data.dataType === "float") return "#8B5CF6";
      return "#0EA5E9";
    })
    .attr("stroke-width", d => d.depth === 0 ? 2 : 1.5)
    .attr("filter", `url(#glow-${key})`);

  // Node label
  node.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", d => d.data.kind === "op" && d.data.sub ? -3 : 4)
    .attr("fill", d => {
      if (d.data.kind === "op") return "#1D4ED8";
      if (d.data.dataType === "float") return "#7C3AED";
      return "#0369A1";
    })
    .attr("font-size", d => d.depth === 0 ? 13 : 11)
    .attr("font-family", "'JetBrains Mono', 'Space Mono', monospace")
    .attr("font-weight", d => d.data.kind === "op" ? "700" : "500")
    .text(d => d.data.name);

  // Sub-label
  node.filter(d => !!d.data.sub)
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", 11)
    .attr("fill", "rgba(37,99,235,0.5)")
    .attr("font-size", 8)
    .attr("font-family", "'JetBrains Mono', monospace")
    .text(d => d.data.sub || "");

  node.transition()
    .delay(d => d.depth * 130)
    .duration(360)
    .style("opacity", 1);
}

/* ═══════════════════════════════════════════════════
   RENDER: TAC
   ═══════════════════════════════════════════════════ */
function renderTAC(lines) {
  const wrap = document.getElementById("out-tac");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (!lines || !lines.length) return;

  lines.forEach((line, i) => {
    const div = document.createElement("div");
    div.className = "tac-line";
    const m = line.match(/^(\S+)\s*=\s*(\S+)\s*([+\-*/])\s*(\S+)$/);
    if (m) {
      div.innerHTML = `
        <span class="tac-idx">${String(i + 1).padStart(2, "0")}</span>
        <span class="tac-res">${escHtml(m[1])}</span>
        <span class="tac-eq">=</span>
        <span class="tac-a1">${escHtml(m[2])}</span>
        <span class="tac-op">${escHtml(m[3])}</span>
        <span class="tac-a2">${escHtml(m[4])}</span>`;
    } else {
      div.innerHTML = `<span class="tac-idx">${String(i + 1).padStart(2, "0")}</span><span>${escHtml(line)}</span>`;
    }
    wrap.appendChild(div);
    setTimeout(() => div.classList.add("visible"), 100 + i * 180);
  });
  setStageStatus(3, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: INSTRUCTION SELECTION
   ═══════════════════════════════════════════════════ */
function renderIsel(items) {
  const wrap = document.getElementById("out-isel");
  if (!wrap) return;
  wrap.innerHTML = "";
  (items || []).forEach((row, i) => {
    const card = document.createElement("div");
    card.className = "isel-item";
    card.style.animationDelay = (i * 90) + "ms";

    const uopsHtml = (row.microOps || []).map(l => {
      let hl = escHtml(l);
      hl = hl.replace(/\b(R\d+)\b/g, '<span class="reg-hl">$1</span>');
      hl = hl.replace(/\b(ADD|SUB|MUL|DIV|MOV)\b/g, '<span class="op-hl">$1</span>');
      return `<div class="isel-uop">${hl}</div>`;
    }).join("");

    card.innerHTML = `
      <div class="isel-header">${escHtml(row.tac || "")}</div>
      <div class="isel-uops">${uopsHtml}</div>`;
    wrap.appendChild(card);
  });
  setStageStatus(5, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: REGISTER ALLOCATION
   ═══════════════════════════════════════════════════ */
function renderRegs(rows) {
  const wrap = document.getElementById("out-reg");
  if (!wrap) return;
  wrap.innerHTML = "";
  (rows || []).forEach((r, i) => {
    const cell = document.createElement("div");
    cell.className = "reg-cell";
    cell.style.animationDelay = (i * 75) + "ms";
    cell.innerHTML = `
      <span class="reg-name">${escHtml(r.register)}</span>
      <span class="reg-arrow">←</span>
      <span class="reg-val">${escHtml(String(r.value))}</span>`;
    wrap.appendChild(cell);
  });
  setStageStatus(6, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: SCHEDULING
   ═══════════════════════════════════════════════════ */
function renderScheduling(before, after) {
  function fill(elId, lines) {
    const ul = document.getElementById(elId);
    if (!ul) return;
    ul.innerHTML = "";
    (lines || []).forEach((l, i) => {
      const li = document.createElement("li");
      li.className = "sched-item";
      li.innerHTML = `<span class="sched-idx">${String(i + 1).padStart(2, "0")}</span><span>${escHtml(l)}</span>`;
      ul.appendChild(li);
      setTimeout(() => li.classList.add("visible"), i * 50);
    });
  }
  fill("out-sched-before", before);
  fill("out-sched-after",  after);
  setStageStatus(7, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: ASSEMBLY
   ═══════════════════════════════════════════════════ */
function renderAssembly(lines) {
  const pre = document.getElementById("out-asm");
  if (!pre) return;
  pre.innerHTML = (lines || []).map(l => {
    let hl = escHtml(l);
    hl = hl.replace(/\b(R\d+)\b/g, '<span class="asm-reg">$1</span>');
    hl = hl.replace(/\b(ADD|SUB|MUL|DIV|MOV)\b/g, '<span class="asm-op">$1</span>');
    return hl;
  }).join("\n");
  setStageStatus(8, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: MACHINE CODE
   ═══════════════════════════════════════════════════ */
function renderMachineCode(lines) {
  const wrap = document.getElementById("out-machine");
  if (!wrap) return;
  wrap.innerHTML = "";
  (lines || []).forEach((bits, i) => {
    const row = document.createElement("div");
    row.className = "machine-line";
    row.style.transitionDelay = (i * 40) + "ms";

    const idxSpan = `<span class="machine-idx">${String(i + 1).padStart(2, "0")}</span>`;
    const bitsHtml = (bits || "").split("").map(b =>
      b === "1" ? `<span class="machine-bit-1">1</span>`
      : b === "0" ? `<span class="machine-bit-0">0</span>`
      : b
    ).join("");

    row.innerHTML = idxSpan + `<span class="machine-bits">${bitsHtml}</span>`;
    wrap.appendChild(row);
    setTimeout(() => row.classList.add("visible"), i * 40);
  });
  setStageStatus(9, "ok");
}

/* ═══════════════════════════════════════════════════
   RENDER: IR OPTIMIZATION
   ═══════════════════════════════════════════════════ */
function renderIR(before, after) {
  const bEl = document.getElementById("out-ir-before");
  const aEl = document.getElementById("out-ir-after");
  if (bEl) bEl.textContent = (before || []).join("\n") || "—";
  if (aEl) aEl.textContent = (after  || []).join("\n") || "—";
  setStageStatus(4, "ok");
}

/* ═══════════════════════════════════════════════════
   ERROR / RESULT
   ═══════════════════════════════════════════════════ */
function showErrorBanner(data) {
  const el = document.getElementById("error-banner");
  if (!el) return;
  const phase = (data.phase || "error").replace(/\b\w/g, c => c.toUpperCase());
  const pos = data.column ? ` at col ${data.column}` : "";
  el.textContent = `${phase} Error${pos}: ${data.message || "Unknown error"}`;
  el.classList.remove("hidden");
}

function wrapTextLines(text, maxLen = 92) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxLen && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function workflowDataToSections(data) {
  const tokens = (data.tokens || []).map(t => t.tag || t.kind).join(" ");
  const tac = (data.tac || []).join("\n");
  const irBefore = (data.irOptimization?.before || []).join("\n");
  const irAfter = (data.irOptimization?.after || []).join("\n");
  const asm = (data.assembly || []).join("\n");
  const machine = (data.machineCode || []).join("\n");
  const schedBefore = (data.scheduling?.before || []).join("\n");
  const schedAfter = (data.scheduling?.after || []).join("\n");
  const regs = (data.registerAllocation || []).map(r => `${r.register} -> ${r.value}`).join("\n");
  return [
    { title: "Lexical Analysis", body: tokens || "—" },
    { title: "Syntax Analysis (AST)", body: JSON.stringify(data.ast || {}, null, 2) || "—" },
    { title: "AST Optimization", body: JSON.stringify(data.optimizedAst || {}, null, 2) || "—" },
    { title: "Three-Address Code", body: tac || "—" },
    { title: "IR Optimization (Before)", body: irBefore || "—" },
    { title: "IR Optimization (After)", body: irAfter || "—" },
    { title: "Instruction Selection", body: JSON.stringify(data.instructionSelection || [], null, 2) || "—" },
    { title: "Register Allocation", body: regs || "—" },
    { title: "Instruction Scheduling (Before)", body: schedBefore || "—" },
    { title: "Instruction Scheduling (After)", body: schedAfter || "—" },
    { title: "Assembly Code", body: asm || "—" },
    { title: "Machine Code", body: machine || "—" },
  ];
}

function downloadWorkflowPdf() {
  try {
    if (!lastWorkflowData) {
      showErrorBanner({ phase: "report", message: "Compile an expression first to generate the workflow report." });
      return;
    }
    const jspdfNS = window.jspdf;
    if (!jspdfNS || !jspdfNS.jsPDF) {
      showErrorBanner({ phase: "report", message: "PDF engine not loaded. Refresh and try again." });
      return;
    }
    const { jsPDF } = jspdfNS;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 42;
    let y = margin;

    const heading = "Compiler Workflow Report";
    const subtitle = "LexiCore Interactive Compiler Pipeline";
    const expr = (document.getElementById("expr-input")?.value || "").trim();
    const result = document.getElementById("final-result")?.textContent || "—";
    const type = document.getElementById("final-type")?.textContent || "—";
    const generatedAt = new Date().toLocaleString();

    const ensureSpace = (h) => {
      if (y + h > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 82, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(heading, margin, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(subtitle, margin, 54);
    y = 98;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary", margin, y);
    y += 16;
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    const summary = [
      `Expression: ${expr || "—"}`,
      `Result: ${result}`,
      `Type: ${type}`,
      `Generated At: ${generatedAt}`,
    ];
    summary.forEach(line => { ensureSpace(14); doc.text(line, margin, y); y += 14; });
    y += 8;

    const sections = workflowDataToSections(lastWorkflowData);
    for (const sec of sections) {
      ensureSpace(30);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y - 6, pageW - margin, y - 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(sec.title, margin, y + 8);
      y += 24;

      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const rawLines = String(sec.body || "—").split("\n");
      for (const rl of rawLines) {
        const wl = wrapTextLines(rl, 105);
        for (const l of wl) {
          ensureSpace(12);
          doc.text(l || " ", margin + 2, y);
          y += 12;
        }
      }
      y += 10;
    }

    const safeExpr = (expr || "workflow").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 36);
    doc.save(`workflow_report_${safeExpr || "compiler"}.pdf`);
  } catch (e) {
    showErrorBanner({ phase: "report", message: String(e.message || e) });
  }
}
function clearErrorBanner() {
  const el = document.getElementById("error-banner");
  if (el) el.classList.add("hidden");
}

function formatVal(v, ty) {
  if (typeof v !== "number") return "—";
  if (ty === "int" || (Number.isInteger(v) && Math.abs(v) < 1e15)) return String(Math.round(v));
  const s = parseFloat(v.toPrecision(8)).toString();
  return s;
}

function setResult(val, type) {
  const rv  = document.getElementById("final-result");
  const rt  = document.getElementById("final-type");
  const rm  = document.getElementById("rail-result-mini");
  const rmv = document.getElementById("rm-val");
  const rmt = document.getElementById("rm-type");
  const trb = document.getElementById("top-result-bar");
  const trv = document.getElementById("top-result-value");
  const trt = document.getElementById("top-result-type");

  const fmtVal  = formatVal(val, type);
  const fmtType = (type || "—").toUpperCase();

  if (rv) rv.textContent = fmtVal;
  if (rt) rt.textContent = fmtType;
  if (rm) rm.classList.remove("hidden");
  if (rmv) rmv.textContent = fmtVal;
  if (rmt) rmt.textContent = fmtType;
  if (trb) trb.classList.remove("hidden");
  if (trv) trv.textContent = fmtVal;
  if (trt) trt.textContent = fmtType;
}

function resetResult() {
  const rv = document.getElementById("final-result");
  const rt = document.getElementById("final-type");
  const rm = document.getElementById("rail-result-mini");
  const trb = document.getElementById("top-result-bar");
  const trv = document.getElementById("top-result-value");
  const trt = document.getElementById("top-result-type");
  if (rv) rv.textContent = "—";
  if (rt) rt.textContent = "—";
  if (rm) rm.classList.add("hidden");
  if (trb) trb.classList.add("hidden");
  if (trv) trv.textContent = "—";
  if (trt) trt.textContent = "—";
  const tac = document.getElementById("result-tac-summary");
  if (tac) tac.classList.add("hidden");
}

/* ═══════════════════════════════════════════════════
   POPULATE FROM DATA
   ═══════════════════════════════════════════════════ */
function populateFromData(data) {
  lastWorkflowData = data;
  clearErrorBanner();
  resetAllStatuses();

  if (!data.ok && data.phase) {
    showErrorBanner(data);
    const phaseMap = { lexical: 0, syntax: 1, semantic: 2, type: 3, runtime: 4 };
    const errIdx = phaseMap[data.phase] ?? 0;
    setStageStatus(errIdx, "err");
    document.querySelectorAll(".stage-card").forEach(el => el.classList.remove("active-stage"));
    const errCard = document.getElementById("stage-" + errIdx);
    if (errCard) {
      errCard.classList.add("stage-error");
      errCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  if (data.tokens) {
    renderTokens(data.tokens);
    setStageStatus(0, (!data.ok && data.phase === "lexical") ? "err" : "ok");
  }
  if (data.ast) {
    renderD3Tree("out-ast", astToHierarchy(data.ast), "a");
    setStageStatus(1, "ok");
  }
  if (data.optimizedAst) {
    renderD3Tree("out-ast-opt", astToHierarchy(data.optimizedAst), "b");
    setStageStatus(2, "ok");
  }
  if (data.tac) { renderTAC(data.tac); }
  if (data.irOptimization) { renderIR(data.irOptimization.before, data.irOptimization.after); }
  if (data.instructionSelection) { renderIsel(data.instructionSelection); }
  if (data.registerAllocation) { renderRegs(data.registerAllocation); }
  if (data.scheduling) { renderScheduling(data.scheduling.before, data.scheduling.after); }
  if (data.assembly) { renderAssembly(data.assembly); }
  if (data.machineCode) { renderMachineCode(data.machineCode); }

  if (data.result !== null && data.result !== undefined) {
    setResult(data.result, data.type);
    const tacSummary = document.getElementById("result-tac-summary");
    const tacLines   = document.getElementById("result-tac-lines");
    if (tacSummary && tacLines && data.tac) {
      tacLines.textContent = data.tac.join("\n");
      tacSummary.classList.remove("hidden");
    }
  } else {
    setResult(null, data.type);
  }
}

/* ═══════════════════════════════════════════════════
   COMPILE
   ═══════════════════════════════════════════════════ */
async function compile() {
  const exprInput = document.getElementById("expr-input");
  const expr = exprInput ? exprInput.value.trim() : "";

  stopPlay();
  clearErrorBanner();
  resetResult();
  resetAllStatuses();
  clearOutputs();
  showLoader();

  try {
    const res = await fetch("/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression: expr }),
    });
    const data = await res.json();
    populateFromData(data);
    setActiveStage(0);
  } catch (e) {
    showErrorBanner({ phase: "network", message: String(e.message || e) });
  } finally {
    hideLoader();
  }
}

function clearOutputs() {
  const clearIds = [
    "out-tokens","out-ast","out-ast-opt","out-tac",
    "out-ir-before","out-ir-after","out-isel","out-reg",
    "out-sched-before","out-sched-after","out-asm","out-machine",
  ];
  clearIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  document.querySelectorAll(".stage-card").forEach(el => el.classList.remove("stage-error"));
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function setExpr(val) {
  const el = document.getElementById("expr-input");
  if (el) { el.value = val; el.focus(); }
}
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ═══════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════ */
function init() {
  buildStageRail();
  setActiveStage(0, false);

  // Theme: default light; apply stored if present
  applyTheme(getStoredTheme() || "light");

  const btnCompile = document.getElementById("btn-compile");
  const exprInput  = document.getElementById("expr-input");
  const btnPlay    = document.getElementById("btn-play");
  const btnPause   = document.getElementById("btn-pause");
  const btnStep    = document.getElementById("btn-step");
  const btnReport  = document.getElementById("btn-report-pdf");
  const btnTheme   = document.getElementById("theme-toggle");
  const btnCodegen = document.getElementById("rail-codegen-link");

  if (btnCompile) btnCompile.addEventListener("click", compile);
  if (exprInput)  exprInput.addEventListener("keydown", e => { if (e.key === "Enter") compile(); });
  if (btnPlay)    btnPlay.addEventListener("click", startPlay);
  if (btnPause)   btnPause.addEventListener("click", stopPlay);
  if (btnStep)    btnStep.addEventListener("click", stepNext);
  if (btnReport)  btnReport.addEventListener("click", downloadWorkflowPdf);
  if (btnTheme)   btnTheme.addEventListener("click", () => applyTheme(currentTheme() === "dark" ? "light" : "dark"));
  if (btnCodegen) btnCodegen.addEventListener("click", () => {
    const target = document.getElementById("code-generator");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Stagger card entrances
  document.querySelectorAll(".stage-card").forEach((el, i) => {
    el.style.animationDelay = (i * 55) + "ms";
  });

  initAutomataGenerator();
  initStageScrollSync();
}

document.addEventListener("DOMContentLoaded", init);