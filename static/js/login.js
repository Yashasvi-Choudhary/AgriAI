/* ─────────────────────────────────────────
   LANGUAGE LOAD FROM JSON FILES
───────────────────────────────────────── */
let lang = localStorage.getItem("Labhansh.ai_lang") || "en";
let i18n = {};

async function loadLang(l) {
  try {
    const res = await fetch(`/static/locales/${l}/login.json`);
    i18n = await res.json();
  } catch (err) {
    console.error("Language load error:", err);
    i18n = {};
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
      btn.classList.add("bg-[#c8a84b]/20", "text-[#c8a84b]", "font-semibold");
      btn.classList.remove("text-[#9bbfa8]");
    } else {
      btn.classList.remove(
        "bg-[#c8a84b]/20",
        "text-[#c8a84b]",
        "font-semibold",
      );
      btn.classList.add("text-[#9bbfa8]");
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

/* ───────────────── VALIDATION ──────────────── */
const touched = { email: false, password: false };
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(val) {
  if (!val.trim()) return t("e_email_req");
  if (!emailRe.test(val)) return t("e_email_inv");
  return null;
}

function validatePassword(val) {
  if (!val) return t("e_pwd_req");
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

  if (id === "email") err = validateEmail(val);
  if (id === "password") err = validatePassword(val);

  showFieldErr(id, err);
  return err;
}

function setupField(id) {
  const el = document.getElementById(id);

  el.addEventListener("focus", () => (touched[id] = true));
  el.addEventListener("blur", () => touched[id] && validateField(id));
  el.addEventListener("input", () => {
    const span = document.getElementById("err-" + id);
    if (!span.classList.contains("h-0")) validateField(id);
  });
}

/* ───────────── PASSWORD TOGGLE ───────────── */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("[data-lucide]");
  const show = input.type === "password";

  input.type = show ? "text" : "password";
  icon.setAttribute("data-lucide", show ? "eye-off" : "eye");
  lucide.createIcons();
}

/* ───────────── FORM SUBMIT ───────────── */

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
          ctx.strokeStyle = `rgba(200,168,75,${0.09 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }
    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,168,75,0.25)";
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

/* ───────────── INIT ───────────── */

document.addEventListener("DOMContentLoaded", () => {
  applyLang();
  setupField("email");
  setupField("password");
  lucide.createIcons();

  const form = document.getElementById("login-form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    Object.keys(touched).forEach((k) => (touched[k] = true));
    const errs = ["email", "password"].map(validateField).filter(Boolean);

    if (errs.length) return;

    // 🔥 Fake loading (optional but better UX)
    const btn = document.getElementById("btn-submit");
    const spinner = document.getElementById("spinner");
    const label = btn.querySelector(".btn-label");

    btn.disabled = true;
    label.classList.add("hidden");
    spinner.classList.remove("hidden");

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1000);
  });
});
