/* ───────────────── LANGUAGE LOAD ───────────────── */
let lang = localStorage.getItem("Labhansh.ai_lang") || "en";
let i18n = {};

async function loadLang(l) {
  try {
    const res = await fetch(`/static/locales/${l}/reset_password.json`);
    i18n = await res.json();
  } catch (e) {
    console.error("Lang load error:", e);
  }
}

function t(key) {
  return i18n[key] || key;
}

async function applyLang() {
  await loadLang(lang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });

  ["en", "hi"].forEach((l) => {
    const btn = document.getElementById("btn-" + l);
    if (lang === l) {
      btn.classList.add("bg-accent/20", "text-accentLight", "font-semibold");
      btn.classList.remove("text-textLight");
    } else {
      btn.classList.remove(
        "bg-accent/20",
        "text-accentLight",
        "font-semibold",
      );
      btn.classList.add("text-textLight");
    }
  });

  Object.keys(touched).forEach((id) => {
    if (touched[id]) validateField(id);
  });
}

function setLang(l) {
  lang = l;
  localStorage.setItem("Labhansh.ai_lang", l);
  applyLang();
}

/* ───────────────── VALIDATION ───────────────── */
const touched = { new_password: false, confirm_password: false };

function validateNewPwd(val) {
  if (!val) return t("e_pwd_req");
  if (val.length < 6) return t("e_pwd_min6"); // new condition
  return null;
}

function validateConfPwd(val) {
  if (!val) return t("e_conf_req");
  if (val !== document.getElementById("new_password").value)
    return t("e_pwd_match");
  return null;
}

function showFieldErr(id, msg) {
  const span = document.getElementById("err-" + id);
  const input = document.getElementById(id);

  if (msg) {
    span.textContent = msg;
    span.classList.remove("opacity-0", "h-0");
    span.classList.add("opacity-100");

    input.classList.add("!border-red-500/60", "!ring-2", "!ring-red-500/10");
  } else {
    span.textContent = "";
    span.classList.add("opacity-0", "h-0");
    span.classList.remove("opacity-100");

    input.classList.remove("!border-red-500/60", "!ring-2", "!ring-red-500/10");
  }
}

function validateField(id) {
  const val = document.getElementById(id).value;
  let err = null;

  if (id === "new_password") err = validateNewPwd(val);
  if (id === "confirm_password") err = validateConfPwd(val);

  showFieldErr(id, err);
  return err;
}

function setupField(id) {
  const el = document.getElementById(id);

  el.addEventListener("focus", () => (touched[id] = true));

  el.addEventListener("blur", () => {
    touched[id] = true;
    validateField(id);
  });

  el.addEventListener("input", () => {
    if (touched[id]) {
      const span = document.getElementById("err-" + id);
      if (!span.classList.contains("h-0")) validateField(id);
    }

    if (id === "new_password" && touched["confirm_password"]) {
      validateField("confirm_password");
    }
  });
}

/* ───────────────── PASSWORD TOGGLE ───────────────── */
function togglePwd(id, btn) {
  const input = document.getElementById(id);
  const icon = btn.querySelector("[data-lucide]");

  const show = input.type === "password";
  input.type = show ? "text" : "password";

  icon.setAttribute("data-lucide", show ? "eye-off" : "eye");
  lucide.createIcons();
}

/* ───────────────── FORM SUBMIT ───────────────── */
const token = window.location.pathname.replace(/\/$/, "").split("/").pop() || "";

function showFormError(msg) {
  const formErr = document.getElementById("form-error");
  if (!formErr) return;
  formErr.textContent = msg;
  formErr.classList.toggle("hidden", !msg);
}

const resetForm = document.getElementById("reset-form");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    Object.keys(touched).forEach((k) => (touched[k] = true));

    const errs = ["new_password", "confirm_password"]
      .map(validateField)
      .filter(Boolean);

    if (errs.length) return;

    const btn = document.getElementById("btn-submit");
    const label = btn.querySelector(".btn-label");
    const spinner = document.getElementById("spinner");

    showFormError("");
    btn.disabled = true;
    label.classList.add("hidden");
    spinner.classList.remove("hidden");

    try {
      const res = await fetch(`/reset-password/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: document.getElementById("new_password").value,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showFormError(data.message || "Unable to reset password.");
        return;
      }

      resetForm.classList.add("hidden");
      const overlay = document.getElementById("success-overlay");
      overlay.classList.remove("hidden");
      overlay.classList.add("flex");

      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } catch {
      showFormError("Network error. Please check your connection.");
    } finally {
      btn.disabled = false;
      label.classList.remove("hidden");
      spinner.classList.add("hidden");
    }
  });
}

/* ─────────────────────────────────────────
         NEURAL NETWORK CANVAS
         (exact same implementation as register)
      ───────────────────────────────────────── */
(function () {
  const canvas = document.getElementById("neural");
  const ctx = canvas.getContext("2d");
  let W,
    H,
    nodes = [],
    animId;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes(n) {
    nodes = [];
    for (let i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);

          ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 130) * 0.15})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
    });
  }

  function update() {
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(animId);
    resize();
    createNodes(60);
    loop();
  });

  resize();
  createNodes(60);
  loop();
})();

/* ───────────────── INIT ───────────────── */
document.addEventListener("DOMContentLoaded", () => {
  applyLang();
  setupField("new_password");
  setupField("confirm_password");
  lucide.createIcons();
});
