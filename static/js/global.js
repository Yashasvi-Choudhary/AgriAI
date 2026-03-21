let currentLang = localStorage.getItem("Labhansh.ai_lang") || "en";
let i18n = {};

// ─────────────────────────────
// LOAD LANGUAGE JSON (dynamic per page)
// ─────────────────────────────
async function loadLang(lang) {
  try {
    // Detect page (dashboard, login, etc.)
    const page = document.body.dataset.page || "dashboard";

    const res = await fetch(`/static/locales/${lang}/${page}.json`);
    i18n = await res.json();

    applyLang();
    localStorage.setItem("Labhansh.ai_lang", lang);
  } catch (err) {
    console.error("Language load error:", err);
  }
}

function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (i18n[key]) el.textContent = i18n[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (i18n[key]) el.placeholder = i18n[key];
  });

  document
    .querySelectorAll(".lang-btn")
    .forEach((b) => b.classList.remove("active"));

  document
    .querySelector(`.lang-btn[onclick="setLang('${currentLang}')"]`)
    ?.classList.add("active");
}

function setLang(lang) {
  currentLang = lang;
  loadLang(lang);
}

// ─────────────────────────────
// SIDEBAR
// ─────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebarOverlay")?.classList.toggle("show");
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("show");
}

// ─────────────────────────────
// PROFILE DROPDOWN
// ─────────────────────────────
function toggleDropdown() {
  document.getElementById("profileDropdown")?.classList.toggle("show");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-wrap")) {
    document.getElementById("profileDropdown")?.classList.remove("show");
  }
});

// ─────────────────────────────
// NAV ACTIVE
// ─────────────────────────────
function setActive(el) {
  document
    .querySelectorAll(".nav-item")
    .forEach((i) => i.classList.remove("active"));
  el.classList.add("active");

  if (window.innerWidth <= 768) closeSidebar();
}

// ─────────────────────────────
// INIT
// ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadLang(currentLang);
});