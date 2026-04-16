
const EMOJIS = {
  rice: "🌾",
  wheat: "🌾",
  maize: "🌽",
  corn: "🌽",
  cotton: "🌿",
  sugarcane: "🎋",
  jute: "🌱",
  soybean: "🫘",
  chickpea: "🫘",
  lentil: "🫘",
  groundnut: "🥜",
  sunflower: "🌻",
  coffee: "☕",
  tea: "🍵",
  rubber: "🌳",
  coconut: "🥥",
  banana: "🍌",
  mango: "🥭",
  apple: "🍎",
  grapes: "🍇",
  tomato: "🍅",
  potato: "🥔",
  onion: "🧅",
  garlic: "🧄",
  default: "🌿",
};

function showState(id) {
  ["emptyState", "loadingState", "resultCard", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

function renderResult(crop) {
  const name = crop.name || crop.crop || "Unknown";
  const conf = parseFloat(crop.confidence || crop.score || 0);
  const desc = crop.description || crop.reason || crop.details || "";
  const emoji = EMOJIS[name.toLowerCase()] || EMOJIS.default;

  document.getElementById("resultIcon").textContent = emoji;
  document.getElementById("resultName").textContent = name;
  document.getElementById("resultDesc").textContent = desc;
  document.getElementById("resultConfBadge").textContent = conf + "%";
  document.getElementById("resultConfText").textContent = conf + "%";

  showState("resultCard");
  setTimeout(() => {
    document.getElementById("resultBar").style.width = conf + "%";
  }, 120);
}

async function getCropRecommendation() {
  const btn = document.getElementById("recommendBtn");
  const btnText = document.getElementById("btnText");

  const payload = {
    soil_type: document.getElementById("soil_type").value,
    ph_level: document.getElementById("ph_level").value,
    temperature: document.getElementById("temperature").value,
    humidity: document.getElementById("humidity").value,
    rainfall: document.getElementById("rainfall").value,
    soil_moisture: document.getElementById("soil_moisture").value,
    nitrogen: document.getElementById("nitrogen").value,
    phosphorus: document.getElementById("phosphorus").value,
    potassium: document.getElementById("potassium").value,
    latitude: document.getElementById("latitude").value,
    longitude: document.getElementById("longitude").value,
  };

  if (!payload.soil_type) {
    const t = window.__i18n || {};
    alert(
      t["crop_alert_soil"] || "Please select a soil type before proceeding.",
    );
    return;
  }

  btn.disabled = true;
  btn.style.opacity = "0.7";
  const t = window.__i18n || {};
  btnText.textContent = t["crop_btn_analyzing"] || "Analyzing…";
  showState("loadingState");

  try {
    const res = await fetch("/api/crop-recommendation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Server error " + res.status);

    const data = await res.json();
    const crops =
      data.crops ||
      data.recommendations ||
      data.results ||
      (Array.isArray(data) ? data : null);
    if (!crops || !crops.length)
      throw new Error(
        t["crop_error_no_result"] || "No recommendations received.",
      );

    renderResult(crops[0]); // show only the top result
  } catch (err) {
    document.getElementById("errorMsg").textContent =
      err.message || "Unexpected error.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btnText.textContent =
      (window.__i18n || {})["crop_btn_analyze"] || "Get Crop Recommendation";
  }
}

function getCsrf() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.content;
  const c = document.cookie
    .split(";")
    .find((x) => x.trim().startsWith("csrftoken="));
  return c ? c.trim().split("=")[1] : "";
}

(function () {
  "use strict";

  /* ── Supported languages ── */
  const SUPPORTED = ["en", "hi"];
  const DEFAULT = "en";

  /* ── Read current lang ── */
  function getCurrentLang() {
    const saved = localStorage.getItem("lang");
    return SUPPORTED.includes(saved) ? saved : DEFAULT;
  }

  /* ── Fetch JSON translation file ── */
  async function loadTranslations(lang) {
    try {
      const res = await fetch(`/static/locales/${lang}/crop-recommendation.json`);
      if (!res.ok) throw new Error(`Lang file not found: ${lang}.json`);
      return await res.json();
    } catch (err) {
      console.warn("[lang.js]", err.message);
      return {};
    }
  }

  /* ── Apply translations to DOM ── */
  function applyTranslations(translations) {
    /* 1. Text content via data-i18n */
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (translations[key] !== undefined) {
        /* For inputs/selects use value; for everything else use textContent */
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.value = translations[key];
        } else if (el.tagName === "OPTION") {
          el.textContent = translations[key];
        } else {
          el.textContent = translations[key];
        }
      }
    });

    /* 2. Placeholder attribute via data-i18n-placeholder */
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (translations[key] !== undefined) {
        el.setAttribute("placeholder", translations[key]);
      }
    });

    /* 3. Page <title> */
    const titleEl = document.querySelector("title[data-i18n]");
    if (titleEl) {
      const key = titleEl.getAttribute("data-i18n");
      if (translations[key]) document.title = translations[key];
    }

    /* 4. html[lang] attribute */
    document.documentElement.lang = getCurrentLang();

    /* 5. Expose translations for inline JS usage */
    window.__i18n = translations;
  }

  /* ── Main init ── */
  async function init() {
    const lang = getCurrentLang();
    const translations = await loadTranslations(lang);
    applyTranslations(translations);
  }

  /* ── Public API: called from navbar language switcher ── */
  window.setLang = async function (lang) {
    if (!SUPPORTED.includes(lang)) {
      console.warn("[lang.js] Unsupported language:", lang);
      return;
    }
    localStorage.setItem("lang", lang);
    const translations = await loadTranslations(lang);
    applyTranslations(translations);

    /* Dispatch event so other scripts can react */
    document.dispatchEvent(
      new CustomEvent("langChanged", { detail: { lang } }),
    );
  };

  /* ── Run on DOMContentLoaded ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
