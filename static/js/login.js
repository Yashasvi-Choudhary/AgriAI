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
    if (!btn) return;

    if (lang === l) {
      btn.classList.add("bg-accent/20", "text-accentLight", "font-semibold");
      btn.classList.remove("text-textLight");
    } else {
      btn.classList.remove("bg-accent/20", "text-accentLight", "font-semibold");
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

/* ───────────────── FORM ERROR (NEW) ───────────────── */
function showFormError(msg) {
  const el = document.getElementById("form-error");
  if (!el) return;

  if (msg) {
    el.textContent = msg;
    el.classList.remove("opacity-0");
  } else {
    el.textContent = "";
    el.classList.add("opacity-0");
  }
}

/* ───────────────── VALIDATION ───────────────── */
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

/* ───────── PASSWORD TOGGLE ───────── */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("[data-lucide]");
  const show = input.type === "password";

  input.type = show ? "text" : "password";
  icon.setAttribute("data-lucide", show ? "eye-off" : "eye");
  lucide.createIcons();
}

/* ───────── INIT ───────── */
document.addEventListener("DOMContentLoaded", () => {
  applyLang();
  setupField("email");
  setupField("password");
  lucide.createIcons();

  const form = document.getElementById("login-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    showFormError(""); // 🔥 CLEAR OLD ERROR

    Object.keys(touched).forEach((k) => (touched[k] = true));
    const errs = ["email", "password"].map(validateField).filter(Boolean);

    if (errs.length) return;

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const btn = document.getElementById("btn-submit");
    const spinner = document.getElementById("spinner");
    const label = btn.querySelector(".btn-label");

    btn.disabled = true;
    label.classList.add("hidden");
    spinner.classList.remove("hidden");

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = "/dashboard";
      } else {
        showFormError(t(data.message)); // 🔥 TRANSLATED ERROR
      }
    } catch (err) {
      console.error(err);
      showFormError(t("server_error")); // 🔥 TRANSLATED SERVER ERROR
    } finally {
      btn.disabled = false;
      label.classList.remove("hidden");
      spinner.classList.add("hidden");
    }
  });
});
