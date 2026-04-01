let translations = {};
let currentLang = "en";

// Added confirm password
const fields = ["fullname", "email", "phone", "password", "confirm_password"];

// --- Initialization ---
async function init() {
  await setLang(currentLang);
  initCanvas();
  initFormEvents();
}

// --- Language Controller ---
async function setLang(lang) {
  currentLang = lang;

  try {
    const response = await fetch(`/static/locales/${lang}/register.json`);
    translations = await response.json();
  } catch (e) {
    console.error("Translation load error:", e);
  }

  ["en", "hi"].forEach((l) => {
    const btn = document.getElementById(`btn-${l}`);
    btn.style.background = lang === l ? "#c8a84b" : "transparent";
    btn.style.color = lang === l ? "#071c13" : "#9bbfa8";
  });

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = translations[el.dataset.i18n] || el.dataset.i18n;
  });

  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = translations[el.dataset.i18nPh] || el.dataset.i18nPh;
  });
}

// --- Validation ---
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

function showError(field, errorKey) {
  const el = document.getElementById(`err-${field}`);
  const input = document.getElementById(field);

  if (errorKey) {
    // Show error text
    el.textContent = translations[errorKey] || errorKey;
    el.style.opacity = "1";
    el.style.height = "auto";

    // 🔴 ADD RED BORDER (same as login page)
    input.classList.add("!border-red-500/60", "!ring-2", "!ring-red-500/10");
  } else {
    // Hide error text
    el.style.opacity = "0";
    el.style.height = "0";

    // ✅ REMOVE RED BORDER
    input.classList.remove("!border-red-500/60", "!ring-2", "!ring-red-500/10");
  }
}

// --- Events ---
function initFormEvents() {
  fields.forEach((field) => {
    const input = document.getElementById(field);

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

      // 🔥 Special case: revalidate confirm password when password changes
      if (field === "password") {
        const cpwd = document.getElementById("confirm_password");
        if (cpwd.value) {
          const err = validateField("confirm_password", cpwd.value);
          showError("confirm_password", err);
        }
      }
    });
  });

  document.getElementById("reg-form").addEventListener("submit", handleSubmit);
}

// --- Submit ---
async function handleSubmit(e) {
  e.preventDefault();

  let valid = true;
  const data = {};

  fields.forEach((field) => {
    const value = document.getElementById(field).value;
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

  label.classList.add("hidden");
  spinner.classList.remove("hidden");
  btn.disabled = true;

  try {
    const res = await fetch("/register", {
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
      alert(result.message || "Registration failed");
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  } finally {
    label.classList.remove("hidden");
    spinner.classList.add("hidden");
    btn.disabled = false;
  }
}

// --- Password Toggle ---
function togglePwd(id, btn) {
  const input = document.getElementById(id);
  const icon = btn.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.setAttribute("data-lucide", "eye-off");
  } else {
    input.type = "password";
    icon.setAttribute("data-lucide", "eye");
  }

  lucide.createIcons(); // refresh icon
}

// --- Canvas ---
function initCanvas() {
  const canvas = document.getElementById("neural");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W, H;
  let nodes = [];

  const COUNT = 80;
  const DIST = 145;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initNodes() {
    nodes = [];
    for (let i = 0; i < COUNT; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${(1 - d / DIST) * 0.15})`;
          ctx.stroke();
        }
      }
    }

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  const observer = new ResizeObserver(() => {
    resize();
    initNodes();
  });

  observer.observe(canvas.parentElement);

  resize();
  initNodes();
  draw();
}

init();
