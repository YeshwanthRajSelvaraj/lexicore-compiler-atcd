"use strict";

// Isolated Code Generator module: no dependency on existing dashboard state.
(function initCodeGeneratorModule() {
  const root = document.getElementById("code-generator");
  if (!root) return;

  const modeButtons = Array.from(root.querySelectorAll("[data-cg-mode]"));
  const input = document.getElementById("cg-input");
  const out = document.getElementById("cg-output");
  const lines = document.getElementById("cg-lines");
  const typeEl = document.getElementById("cg-type");
  const errEl = document.getElementById("cg-error");
  const btnGenerate = document.getElementById("cg-generate");
  const btnReverse = document.getElementById("cg-reverse");
  const btnDownload = document.getElementById("cg-download");
  const btnCopy = document.getElementById("cg-copy");

  let mode = "expr2cpp";
  let latestCode = "";

  const placeholders = {
    expr2cpp: "5 + 2.5 * 2",
    tac2cpp: "t1 = 2.5 * 2\nt2 = 5 + t1",
    cpp2expr: "float result = 5 + 2.5 * 2;",
  };

  function setError(msg) {
    if (!errEl) return;
    if (!msg) {
      errEl.classList.add("hidden");
      errEl.textContent = "";
      return;
    }
    errEl.classList.remove("hidden");
    errEl.textContent = msg;
  }

  function setTypeLabel(s) {
    if (typeEl) typeEl.textContent = `Detected type: ${s || "—"}`;
  }

  function detectExprType(expr) {
    return /\d+\.\d+/.test(expr) ? "float" : "int";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightCpp(code) {
    let h = escapeHtml(code);
    h = h.replace(/\b(#include|using|namespace|return|int|float|double|main|cout|endl)\b/g, '<span class="cg-k">$1</span>');
    h = h.replace(/\b(int|float|double)\b/g, '<span class="cg-t">$1</span>');
    h = h.replace(/"([^"]*)"/g, '<span class="cg-s">"$1"</span>');
    h = h.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="cg-n">$1</span>');
    return h;
  }

  function renderOutput(code, isCpp) {
    latestCode = code || "";
    const src = latestCode || "// Output appears here";
    if (out) out.innerHTML = isCpp ? highlightCpp(src) : escapeHtml(src);
    if (lines) {
      const count = Math.max(1, src.split("\n").length);
      lines.innerHTML = Array.from({ length: count }, (_, i) => i + 1).join("<br />");
    }
  }

  function generateFromExpression(exprRaw) {
    const expr = (exprRaw || "").trim();
    if (!expr) throw new Error("Expression input is empty.");
    if (!/^[\d+\-*/().\s]+$/.test(expr)) throw new Error("Invalid expression. Only numbers, operators, parentheses are supported.");
    const t = detectExprType(expr);
    setTypeLabel(t);
    return `#include <iostream>\nusing namespace std;\n\nint main() {\n    ${t} result = ${expr};\n    cout << "Result: " << result << endl;\n    return 0;\n}`;
  }

  function parseTacLine(line) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(\S+)\s*([+\-*/])\s*(\S+)\s*$/);
    if (!m) return null;
    return { res: m[1], a1: m[2], op: m[3], a2: m[4] };
  }

  function generateFromTac(tacRaw) {
    const linesIn = (tacRaw || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (!linesIn.length) throw new Error("TAC input is empty.");
    const parsed = [];
    for (let i = 0; i < linesIn.length; i++) {
      const p = parseTacLine(linesIn[i]);
      if (!p) throw new Error(`Invalid TAC at line ${i + 1}: ${linesIn[i]}`);
      parsed.push(p);
    }

    let usesFloat = false;
    for (const p of parsed) {
      if (/[.]/.test(p.a1) || /[.]/.test(p.a2) || p.op === "/") {
        usesFloat = true;
      }
    }
    const t = usesFloat ? "float" : "int";
    setTypeLabel(t);

    const decl = parsed.map((p) => `    ${t} ${p.res} = ${p.a1} ${p.op} ${p.a2};`).join("\n");
    const last = parsed[parsed.length - 1].res;

    return `#include <iostream>\nusing namespace std;\n\nint main() {\n${decl}\n    cout << "Result: " << ${last} << endl;\n    return 0;\n}`;
  }

  function extractExpressionFromCpp(cppRaw) {
    const src = cppRaw || "";
    const m = src.match(/\b(?:int|float|double)\s+[A-Za-z_]\w*\s*=\s*([^;]+);/);
    if (!m) throw new Error("Unsupported C++ input. Expected simple assignment like: float result = 5 + 2.5 * 2;");
    const expr = m[1].trim();
    if (!expr) throw new Error("No expression found in assignment.");
    setTypeLabel("extracted");
    return expr;
  }

  function setMode(next) {
    mode = next;
    modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.cgMode === mode));
    if (input) input.placeholder = placeholders[mode];
    setError("");
    setTypeLabel("—");
    renderOutput("", true);
  }

  function onGenerate() {
    try {
      setError("");
      const src = input ? input.value : "";
      let code;
      if (mode === "expr2cpp") code = generateFromExpression(src);
      else if (mode === "tac2cpp") code = generateFromTac(src);
      else code = generateFromExpression(extractExpressionFromCpp(src));
      renderOutput(code, true);
    } catch (e) {
      setError(String(e.message || e));
      renderOutput("", true);
    }
  }

  function onReverse() {
    try {
      setError("");
      const src = input ? input.value : "";
      if (mode !== "cpp2expr") throw new Error("Reverse is available in C++ → Expression mode.");
      const expr = extractExpressionFromCpp(src);
      renderOutput(expr, false);
    } catch (e) {
      setError(String(e.message || e));
      renderOutput("", false);
    }
  }

  function onDownload() {
    try {
      setError("");
      let code = latestCode;
      if (!code || mode === "cpp2expr") {
        // Force C++ generation for export if current output is expression/plain text
        const src = input ? input.value : "";
        if (mode === "expr2cpp") code = generateFromExpression(src);
        else if (mode === "tac2cpp") code = generateFromTac(src);
        else code = generateFromExpression(extractExpressionFromCpp(src));
      }
      const blob = new Blob([code], { type: "text/x-c++src;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "generated.cpp";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onCopy() {
    try {
      setError("");
      const txt = latestCode || (out ? out.textContent : "");
      if (!txt) throw new Error("Nothing to copy yet.");
      await navigator.clipboard.writeText(txt);
      setTypeLabel("copied");
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.cgMode)));
  if (btnGenerate) btnGenerate.addEventListener("click", onGenerate);
  if (btnReverse) btnReverse.addEventListener("click", onReverse);
  if (btnDownload) btnDownload.addEventListener("click", onDownload);
  if (btnCopy) btnCopy.addEventListener("click", onCopy);

  setMode("expr2cpp");
})();

