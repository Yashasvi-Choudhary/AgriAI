/* ===============================
   TRANSLATION SYSTEM
================================ */

let T = {};
let currentLang = localStorage.getItem("lang") || "en";

/* Load JSON translation files */

async function loadTranslations() {
  try {
    const en = await fetch("/static/locales/en/landing.json").then((r) =>
      r.json(),
    );
    const hi = await fetch("/static/locales/hi/landing.json").then((r) =>
      r.json(),
    );

    T = { en, hi };

    setLang(currentLang);
  } catch (err) {
    console.error("Translation loading error:", err);
  }
}

/* Support nested JSON keys like hero.title */

function getNested(obj, key) {
  return key.split(".").reduce((o, i) => (o ? o[i] : null), obj);
}

/* Language switch */

function setLang(l) {
  if (!T[l]) return;

  currentLang = l;

  localStorage.setItem("lang", l); // ⭐ language memory

  const t = T[l];

  document.querySelectorAll("[data-key]").forEach((el) => {
    const k = el.getAttribute("data-key");
    const value = getNested(t, k);

    if (value !== undefined && value !== null) {
      el.textContent = value;
    }
  });

  /* button styling */

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.remove("bg-accent", "text-black", "font-bold");

    btn.classList.add("text-white/60");

    if (
      (l === "en" && btn.textContent.trim() === "EN") ||
      (l === "hi" && btn.textContent.trim() === "हि")
    ) {
      btn.classList.add("bg-accent", "text-primaryDark", "font-bold");
      btn.classList.remove("text-white/60");
    }
  });

  document.documentElement.lang = l === "hi" ? "hi" : "en";
}

/* Run when page loads */

document.addEventListener("DOMContentLoaded", () => {
  loadTranslations();
});

/* ===============================
   AUTH MODAL
================================ */

function openModal(tab) {
  document.getElementById("authModal").style.display = "flex";
  document.body.style.overflow = "hidden";
  switchTab(tab || "login");
}

function closeModal() {
  document.getElementById("authModal").style.display = "none";
  document.body.style.overflow = "";
}

function closeModalOutside(e) {
  if (e.target === document.getElementById("authModal")) closeModal();
}

function switchTab(tab) {
  const isLogin = tab === "login";

  document.getElementById("panelLogin").classList.toggle("hidden", !isLogin);
  document.getElementById("panelRegister").classList.toggle("hidden", isLogin);

  const loginTab = document.getElementById("tabLogin");
  const regTab = document.getElementById("tabRegister");

  loginTab.className = isLogin
    ? "flex-1 text-center py-2 rounded-lg cursor-pointer font-semibold text-[0.91rem] transition-all bg-accent/20 text-primary shadow-sm"
    : "flex-1 text-center py-2 rounded-lg cursor-pointer font-semibold text-[0.91rem] transition-all text-textMid hover:text-primary";

  regTab.className = !isLogin
    ? "flex-1 text-center py-2 rounded-lg cursor-pointer font-semibold text-[0.91rem] transition-all bg-accent/20 text-primary shadow-sm"
    : "flex-1 text-center py-2 rounded-lg cursor-pointer font-semibold text-[0.91rem] transition-all text-textMid hover:text-primary";

  document.getElementById("modalSubText").textContent = isLogin
    ? "Welcome back! Sign in to your account"
    : "Join 50,000+ farmers — it's free";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ===============================
   NEURAL BACKGROUND CANVAS
================================ */

(function () {
  const canvas = document.getElementById("neural");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  let W, H;
  let nodes = [];

  const COUNT = 80;
  const CONN_DIST = 145;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function initNodes() {
    nodes = [];

    for (let i = 0; i < COUNT; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.7,
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

        if (d < CONN_DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);

          ctx.strokeStyle = `rgba(255,255,255,${(1 - d / CONN_DIST) * 0.15})`;
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

    requestAnimationFrame(draw);
  }

  const obs = new ResizeObserver(() => {
    resize();
    initNodes();
  });

  obs.observe(canvas.parentElement);

  resize();
  initNodes();
  draw();
})();

/* ===============================
   SCROLL EFFECT
================================ */

/* Removed scroll effect to keep navbar always dark */

/* ===============================
   REVEAL ANIMATION
================================ */

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => {
          e.target.classList.add("visible");
        }, i * 70);

        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ===============================
   MOBILE MENU
================================ */

function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("hidden");
}
