(function () {
  const displayEl = document.getElementById("display");
  const displayExprEl = document.getElementById("displayExpr");
  const keysEl = document.getElementById("keys");

  const state = {
    display: "0",
    accumulator: null,
    pendingOperator: null,
    shouldResetDisplay: false,
    error: false,
  };

  const MAX_DIGITS = 12;

  function formatNumber(n) {
    if (!Number.isFinite(n)) return "오류";
    const s = String(n);
    if (s.includes("e")) return n.toPrecision(6).replace(/\.?0+e/, "e");
    const [intPart, frac] = s.split(".");
    if (intPart.replace("-", "").length > MAX_DIGITS) return n.toExponential(4);
    if (frac && intPart.replace("-", "").length + frac.length > MAX_DIGITS) {
      const maxFrac = Math.max(0, MAX_DIGITS - intPart.replace("-", "").length - 1);
      return Number(n.toFixed(maxFrac)).toString();
    }
    return s;
  }

  function addThousandsSep(numStr) {
    if (numStr === "오류") return numStr;
    const neg = numStr.startsWith("-");
    const rest = neg ? numStr.slice(1) : numStr;
    const [intp, frac] = rest.split(".");
    const intFormatted = intp.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const out = frac !== undefined ? `${intFormatted}.${frac}` : intFormatted;
    return neg ? `-${out}` : out;
  }

  function opSymbol(op) {
    switch (op) {
      case "+":
        return "+";
      case "-":
        return "−";
      case "*":
        return "×";
      case "/":
        return "÷";
      default:
        return "";
    }
  }

  function updateExpression() {
    if (!displayExprEl) return;
    if (state.error) {
      displayExprEl.textContent = "";
      return;
    }
    if (state.pendingOperator !== null && state.accumulator !== null) {
      const accStr = formatNumber(state.accumulator);
      displayExprEl.textContent = `${addThousandsSep(accStr)} ${opSymbol(state.pendingOperator)}`;
    } else {
      displayExprEl.textContent = "";
    }
  }

  function updateDisplay() {
    displayEl.textContent = state.error ? "오류" : addThousandsSep(state.display);
    updateExpression();
  }

  function setError() {
    state.error = true;
    state.accumulator = null;
    state.pendingOperator = null;
    state.shouldResetDisplay = true;
    updateDisplay();
  }

  function applyOperator(a, b, op) {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        if (b === 0) return NaN;
        return a / b;
      default:
        return b;
    }
  }

  function commitPending(useAccumulatorAsOperand = false) {
    if (state.pendingOperator === null || state.accumulator === null) return;
    const current = useAccumulatorAsOperand
      ? state.accumulator
      : parseFloat(state.display);
    const result = applyOperator(state.accumulator, current, state.pendingOperator);
    if (!Number.isFinite(result)) {
      setError();
      return;
    }
    state.accumulator = result;
    state.display = formatNumber(result);
  }

  function inputDigit(d) {
    if (state.error) return;
    if (state.shouldResetDisplay) {
      state.display = d === "0" ? "0" : d;
      state.shouldResetDisplay = false;
    } else {
      if (state.display === "0" && d !== "0") state.display = d;
      else if (state.display === "0" && d === "0") return;
      else if (state.display.replace(".", "").replace("-", "").length >= MAX_DIGITS) return;
      else state.display += d;
    }
    updateDisplay();
  }

  function inputDecimal() {
    if (state.error) return;
    if (state.shouldResetDisplay) {
      state.display = "0.";
      state.shouldResetDisplay = false;
    } else if (!state.display.includes(".")) {
      state.display += ".";
    }
    updateDisplay();
  }

  function inputOperator(op) {
    if (state.error) return;
    const current = parseFloat(state.display);
    if (state.pendingOperator !== null && state.accumulator !== null && !state.shouldResetDisplay) {
      commitPending();
      if (state.error) return;
    } else {
      state.accumulator = current;
    }
    state.pendingOperator = op;
    state.shouldResetDisplay = true;
    updateDisplay();
  }

  function inputEquals() {
    if (state.error) return;
    if (state.pendingOperator !== null && state.accumulator !== null) {
      commitPending(state.shouldResetDisplay);
      if (state.error) return;
      state.display = formatNumber(state.accumulator);
    }
    state.pendingOperator = null;
    state.accumulator = null;
    state.shouldResetDisplay = true;
    updateDisplay();
  }

  function clearAll() {
    state.display = "0";
    state.accumulator = null;
    state.pendingOperator = null;
    state.shouldResetDisplay = false;
    state.error = false;
    updateDisplay();
  }

  function toggleSign() {
    if (state.error) return;
    if (state.display === "0") return;
    if (state.display.startsWith("-")) state.display = state.display.slice(1);
    else state.display = "-" + state.display;
    updateDisplay();
  }

  function percent() {
    if (state.error) return;
    const v = parseFloat(state.display);
    if (!Number.isFinite(v)) return;
    state.display = formatNumber(v / 100);
    updateDisplay();
  }

  keysEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "digit") inputDigit(btn.dataset.value);
    else if (action === "decimal") inputDecimal();
    else if (action === "operator") inputOperator(btn.dataset.value);
    else if (action === "equals") inputEquals();
    else if (action === "clear") clearAll();
    else if (action === "sign") toggleSign();
    else if (action === "percent") percent();
  });

  const keyMap = {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    ".": "decimal",
    Enter: "equals",
    "=": "equals",
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    Escape: "clear",
    c: "clear",
    C: "clear",
    "%": "percent",
  };

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    const k = e.key;
    if (k >= "0" && k <= "9") {
      e.preventDefault();
      inputDigit(k);
      return;
    }
    if (k === "." || k === ",") {
      e.preventDefault();
      inputDecimal();
      return;
    }
    const mapped = keyMap[k];
    if (!mapped) return;
    e.preventDefault();
    if (mapped === "equals") inputEquals();
    else if (mapped === "clear") clearAll();
    else if (mapped === "decimal") inputDecimal();
    else if (mapped === "percent") percent();
    else inputOperator(mapped);
  });

  updateDisplay();
})();
