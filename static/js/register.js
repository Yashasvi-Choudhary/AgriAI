let translations = {};
let currentLang = "en";

const fields = ["fullname", "email", "phone", "password", "confirm_password"];

/* ───────── LANGUAGE ───────── */
async function setLang(lang) {
  currentLang = lang;

  try {
    const res = await fetch(`/static/locales/${lang}/register.json`);
    translations = await res.json();
  } catch (e) {
    console.error("Translation load error:", e);
    translations = {};
  }

  ["en", "hi"].forEach((l) => {
    const btn = document.getElementById(`btn-${l}`);
    if (!btn) return;

    if (lang === l) {
      btn.classList.add("bg-accent/20", "text-accentLight");
      btn.classList.remove("text-textLight");
    } else {
      btn.classList.remove("bg-accent/20", "text-accentLight");
      btn.classList.add("text-textLight");
    }
  });

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = translations[el.dataset.i18n] || el.dataset.i18n;
  });

  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = translations[el.dataset.i18nPh] || el.dataset.i18nPh;
  });
}

/* ───────── VALIDATION ───────── */
function validateField(field, value) {
  const password = document.getElementById("password").value;

  switch (field) {
    case "fullname":
      return !value.trim() ? "e_name_req" : "";

    case "email":
      if (!value.trim()) return "e_email_req";
      if (!/\S+@\S+\.\S+/.test(value)) return "e_email_inv";
      return "";

    case "phone":
      if (!value.trim()) return "e_phone_req";
      if (!/^\d{10}$/.test(value)) return "e_phone_inv";
      return "";

    case "password":
      if (!value.trim()) return "e_pwd_req";
      if (value.length < 6) return "e_pwd_short";
      return "";

    case "confirm_password":
      if (!value.trim()) return "e_cpwd_req";
      if (value !== password) return "e_cpwd_match";
      return "";
  }
}

/* ───────── FIELD ERROR UI ───────── */
function showError(field, errorKey) {
  const el = document.getElementById(`err-${field}`);
  const input = document.getElementById(field);

  if (!el || !input) return;

  if (errorKey) {
    el.textContent = translations[errorKey] || errorKey;
    el.style.opacity = "1";
    el.style.height = "auto";

    input.classList.add("!border-red-500/60", "!ring-2", "!ring-red-500/10");
  } else {
    el.textContent = "";
    el.style.opacity = "0";
    el.style.height = "0";

    input.classList.remove("!border-red-500/60", "!ring-2", "!ring-red-500/10");
  }
}

/* ───────── FORM ERROR (GLOBAL) ───────── */
function showFormError(key) {
  const el = document.getElementById("form-error");
  if (!el) return;

  el.textContent = translations[key] || key;
  el.classList.remove("opacity-0");
  el.classList.add("opacity-100");
}

function clearFormError() {
  const el = document.getElementById("form-error");
  if (!el) return;

  el.textContent = "";
  el.classList.add("opacity-0");
}

/* ───────── EVENTS ───────── */
function initFormEvents() {
  fields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;

    input.addEventListener("focus", () => {
      input.dataset.touched = "true";
    });

    input.addEventListener("blur", () => {
      if (input.dataset.touched) {
        const err = validateField(field, input.value);
        showError(field, err);
      }
    });

    input.addEventListener("input", () => {
      if (input.dataset.touched) {
        const err = validateField(field, input.value);
        if (!err) showError(field, "");
      }

      // revalidate confirm password when password changes
      if (field === "password") {
        const cpwd = document.getElementById("confirm_password");
        if (cpwd && cpwd.value) {
          const err = validateField("confirm_password", cpwd.value);
          showError("confirm_password", err);
        }
      }
    });
  });

  document.getElementById("reg-form").addEventListener("submit", handleSubmit);
}

/* ───────── SUBMIT ───────── */
async function handleSubmit(e) {
  e.preventDefault();
  clearFormError();

  let valid = true;
  const data = {};

  fields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;

    const value = input.value;
    const error = validateField(field, value);

    data[field] = value;

    if (error) {
      showError(field, error);
      valid = false;
    }
  });

  if (!valid) return;

  const btn = document.getElementById("btn-submit");
  const label = btn.querySelector(".btn-label");
  const spinner = document.getElementById("spinner");

  btn.disabled = true;
  label.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const res = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.success) {
      document.getElementById("success-overlay").classList.remove("hidden");
      document.getElementById("success-overlay").classList.add("flex");

      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } else {
      if (result.message === "Email already exists") {
        showFormError("email_exists");
      } else if (result.message === "All fields required") {
        showFormError("all_fields_required");
      } else {
        showFormError("server_error");
      }
    }
  } catch (err) {
    console.error(err);
    showFormError("server_error");
  } finally {
    btn.disabled = false;
    label.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

/* ───────── PASSWORD TOGGLE ───────── */
function togglePwd(id, btn) {
  const input = document.getElementById(id);
  const icon = btn.querySelector("[data-lucide]");

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";

  icon.setAttribute("data-lucide", isHidden ? "eye-off" : "eye");
  lucide.createIcons();
}

/* ───────── CANVAS ───────── */
(function () {
  const canvas = document.getElementById("neural");
  if (!canvas) return;

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

/* ───────── INIT ───────── */
document.addEventListener("DOMContentLoaded", async () => {
  await setLang(currentLang);
  initFormEvents();
  lucide.createIcons();
});
