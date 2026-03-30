let currentLang = localStorage.getItem("Labhansh.ai_lang") || "en";
let i18n = {};

// ─────────────────────────────
// LOAD LANGUAGE JSON (dynamic per page)
// ─────────────────────────────
async function loadLang(lang) {
  try {
    const page = document.body.dataset.page || "dashboard";

    const url = `/static/locales/${lang}/${page}.json`;

    const res = await fetch(url);

    // ❗ fallback if file missing
    if (!res.ok) {
      console.warn("Translation file missing, falling back to English:", url);

      if (lang !== "en") {
        return await loadLang("en");
      }
      return;
    }

    const data = await res.json();

    i18n = data;

    applyLang();

    localStorage.setItem("Labhansh.ai_lang", lang);

    // optional: update html lang attribute
    document.documentElement.lang = lang;
  } catch (err) {
    console.error("Language load error:", err);
  }
}

function applyLang() {
  // text translation
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (i18n[key]) el.textContent = i18n[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (i18n[key]) el.placeholder = i18n[key];
  });

  // ✅ FIXED BUTTON UI
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.remove(
      "bg-accent",
      "text-white",
      "font-semibold"
    );

    btn.classList.add("text-white/50"); // default
  });

  const activeBtn = document.querySelector(
    `.lang-btn[onclick="setLang('${currentLang}')"]`
  );

  if (activeBtn) {
    activeBtn.classList.add(
      "bg-accent",
      "text-white",
      "font-semibold"
    );
    activeBtn.classList.remove("text-white/50");
  }
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
