(function () {
  const displayEl = document.getElementById("display");
  const exprEl = document.getElementById("expr-line");
  const degBtn = document.getElementById("deg-btn");
  const invBtn = document.getElementById("inv-btn");
  const keysSci = document.getElementById("keys-sci");
  const keysBasic = document.getElementById("keys-basic");
  const tabs = document.querySelectorAll(".mode-tab");

  const state = {
    display: "0",
    accumulator: null,
    pendingOp: null,
    shouldReset: false,
    error: false,
    degMode: true,
    invMode: false,
    memory: 0,
    expr: "",
    MAX_DIGITS: 12,
  };

  /* ─── Formatting ─── */
  function fmt(n) {
    if (!Number.isFinite(n)) return "오류";
    if (n === 0) return "0";
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || (abs < 1e-9 && abs > 0)))
      return n.toExponential(5).replace(/\.?0+e/, "e");
    const s = String(n);
    if (s.includes("e")) return n.toPrecision(7);
    const [i, f] = s.split(".");
    const il = i.replace("-", "").length;
    if (il >= state.MAX_DIGITS) return n.toExponential(4);
    if (f && il + f.length > state.MAX_DIGITS) {
      const mf = Math.max(0, state.MAX_DIGITS - il - 1);
      return Number(n.toFixed(mf)).toString();
    }
    return s;
  }

  /* ─── Angle helpers ─── */
  function toRad(v) { return state.degMode ? (v * Math.PI) / 180 : v; }
  function toDeg(v) { return state.degMode ? (v * 180) / Math.PI : v; }

  /* ─── Binary operators ─── */
  function applyOp(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;
      case "pow": return Math.pow(a, b);
      case "root": return b === 0 ? NaN : Math.pow(a, 1 / b);
      case "EE": return a * Math.pow(10, b);
      case "mod": return a % b;
      default: return b;
    }
  }

  /* ─── Unary functions (with Inv support) ─── */
  const INV_MAP = {
    sin: "asin", cos: "acos", tan: "atan",
    sinh: "asinh", cosh: "acosh", tanh: "atanh",
    sq: "sqrt", cube: "cbrt",
    "10x": "log", ex: "ln",
    ln: "ex", log: "10x",
    sqrt: "sq", cbrt: "cube",
  };

  function applyFn(name, v) {
    if (state.invMode && INV_MAP[name]) name = INV_MAP[name];
    switch (name) {
      case "sin":   return Math.sin(toRad(v));
      case "cos":   return Math.cos(toRad(v));
      case "tan":   return Math.tan(toRad(v));
      case "asin":  return toDeg(Math.asin(v));
      case "acos":  return toDeg(Math.acos(v));
      case "atan":  return toDeg(Math.atan(v));
      case "sinh":  return Math.sinh(v);
      case "cosh":  return Math.cosh(v);
      case "tanh":  return Math.tanh(v);
      case "asinh": return Math.asinh(v);
      case "acosh": return Math.acosh(v);
      case "atanh": return Math.atanh(v);
      case "sq":    return v * v;
      case "cube":  return v * v * v;
      case "sqrt":  return Math.sqrt(v);
      case "cbrt":  return Math.cbrt(v);
      case "ln":    return Math.log(v);
      case "log":   return Math.log10(v);
      case "10x":   return Math.pow(10, v);
      case "ex":    return Math.exp(v);
      case "inv":   return v === 0 ? NaN : 1 / v;
      case "fact":  return factorial(v);
      case "abs":   return Math.abs(v);
      case "neg":   return -v;
      case "pct":   return v / 100;
      default: return v;
    }
  }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n) || n > 170) return NaN;
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  /* ─── State helpers ─── */
  function setError() {
    state.error = true;
    state.accumulator = null;
    state.pendingOp = null;
    state.shouldReset = true;
    state.expr = "";
    updateDisplay();
  }

  function updateDisplay() {
    displayEl.textContent = state.error ? "오류" : state.display;
    displayEl.className = "display__value" + (state.error ? " error" : "");
    exprEl.textContent = state.expr;
  }

  /* ─── Core ops ─── */
  function commitPending(useAcc = false) {
    if (!state.pendingOp || state.accumulator === null) return;
    const cur = useAcc ? state.accumulator : parseFloat(state.display);
    const res = applyOp(state.accumulator, cur, state.pendingOp);
    if (!Number.isFinite(res)) { setError(); return; }
    state.accumulator = res;
    state.display = fmt(res);
  }

  function inputDigit(d) {
    if (state.error) return;
    if (state.shouldReset) {
      state.display = d === "0" ? "0" : d;
      state.shouldReset = false;
    } else {
      if (state.display === "0" && d !== "0") state.display = d;
      else if (state.display === "0" && d === "0") return;
      else if (state.display.replace(".", "").replace("-", "").length >= state.MAX_DIGITS) return;
      else state.display += d;
    }
    updateDisplay();
  }

  function inputDecimal() {
    if (state.error) return;
    if (state.shouldReset) {
      state.display = "0.";
      state.shouldReset = false;
    } else if (!state.display.includes(".")) {
      state.display += ".";
    }
    updateDisplay();
  }

  function inputOperator(op, label) {
    if (state.error) return;
    const cur = parseFloat(state.display);
    if (state.pendingOp && state.accumulator !== null && !state.shouldReset) {
      commitPending();
      if (state.error) return;
    } else {
      state.accumulator = cur;
    }
    state.pendingOp = op;
    state.shouldReset = true;
    state.expr = fmt(state.accumulator) + " " + (label || op);
    updateDisplay();
  }

  function inputFunction(name) {
    if (state.error) return;
    const v = parseFloat(state.display);
    const res = applyFn(name, v);
    if (!Number.isFinite(res)) { setError(); return; }
    state.display = fmt(res);
    state.shouldReset = true;
    if (state.invMode) toggleInv();
    updateDisplay();
  }

  function inputConst(val) {
    if (state.error) return;
    state.display = fmt(val);
    state.shouldReset = true;
    updateDisplay();
  }

  function inputEquals() {
    if (state.error) return;
    if (state.pendingOp && state.accumulator !== null) {
      commitPending(state.shouldReset);
      if (state.error) return;
      state.display = fmt(state.accumulator);
    }
    state.expr = "";
    state.pendingOp = null;
    state.accumulator = null;
    state.shouldReset = true;
    updateDisplay();
  }

  function clearAll() {
    state.display = "0";
    state.accumulator = null;
    state.pendingOp = null;
    state.shouldReset = false;
    state.error = false;
    state.expr = "";
    if (state.invMode) toggleInv();
    updateDisplay();
  }

  function backspace() {
    if (state.error || state.shouldReset) return;
    if (state.display.length <= 1 || (state.display.length === 2 && state.display[0] === "-")) {
      state.display = "0";
    } else {
      state.display = state.display.slice(0, -1);
    }
    updateDisplay();
  }

  /* ─── Mode toggles ─── */
  function toggleDeg() {
    state.degMode = !state.degMode;
    degBtn.textContent = state.degMode ? "DEG" : "RAD";
    degBtn.classList.toggle("rad-mode", !state.degMode);
  }

  function toggleInv() {
    state.invMode = !state.invMode;
    invBtn.classList.toggle("active", state.invMode);
  }

  function setCalcMode(mode) {
    if (mode === "sci") {
      keysSci.classList.remove("hidden");
      keysBasic.classList.add("hidden");
    } else {
      keysSci.classList.add("hidden");
      keysBasic.classList.remove("hidden");
    }
    tabs.forEach((t) => {
      t.classList.toggle("active", t.dataset.mode === mode);
      t.setAttribute("aria-selected", t.dataset.mode === mode ? "true" : "false");
    });
  }

  /* ─── Memory ─── */
  function mc()     { state.memory = 0; }
  function mplus()  { state.memory += parseFloat(state.display); }
  function mminus() { state.memory -= parseFloat(state.display); }
  function mr()     { if (state.memory !== 0 || true) { state.display = fmt(state.memory); state.shouldReset = true; updateDisplay(); } }

  /* ─── Event delegation ─── */
  function handleClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const value  = btn.dataset.value;
    const label  = btn.dataset.label;

    switch (action) {
      case "digit":    inputDigit(value); break;
      case "decimal":  inputDecimal(); break;
      case "operator": inputOperator(value, label); break;
      case "fn":       inputFunction(value); break;
      case "const":    inputConst(parseFloat(value)); break;
      case "equals":   inputEquals(); break;
      case "clear":    clearAll(); break;
      case "back":     backspace(); break;
      case "deg":      toggleDeg(); break;
      case "inv":      toggleInv(); break;
      case "mc":       mc(); break;
      case "mplus":    mplus(); break;
      case "mminus":   mminus(); break;
      case "mr":       mr(); break;
    }
  }

  keysSci.addEventListener("click", handleClick);
  keysBasic.addEventListener("click", handleClick);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setCalcMode(tab.dataset.mode));
  });

  /* ─── Keyboard support ─── */
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    const k = e.key;

    if (k >= "0" && k <= "9") { e.preventDefault(); inputDigit(k); return; }
    if (k === "." || k === ",") { e.preventDefault(); inputDecimal(); return; }
    if (k === "Backspace") { e.preventDefault(); backspace(); return; }

    const map = {
      Enter: () => inputEquals(),
      "=": () => inputEquals(),
      "+": () => inputOperator("+", "+"),
      "-": () => inputOperator("-", "−"),
      "*": () => inputOperator("*", "×"),
      "/": () => inputOperator("/", "÷"),
      "^": () => inputOperator("pow", "xʸ"),
      "%": () => inputFunction("pct"),
      Escape: () => clearAll(),
      c: () => clearAll(),
      C: () => clearAll(),
      s: () => inputFunction("sin"),
      S: () => inputFunction("asin"),
      l: () => inputFunction("log"),
      L: () => inputFunction("ln"),
      r: () => inputFunction("sqrt"),
      p: () => inputConst(Math.PI),
    };

    if (map[k]) { e.preventDefault(); map[k](); }
  });

  /* ─── Init ─── */
  updateDisplay();
})();
