/* ============================================================
   global.js — clean version, no opacity tricks needed
   The flash is eliminated by matching html background color.
   ============================================================ */
const DEV_MODE = false;

let currentLang = window.__lang || localStorage.getItem("lang") || "en";

// ─────────────────────────────────────────────────────────────
// APPLY TRANSLATIONS
// ─────────────────────────────────────────────────────────────
function applyLang() {
  var i18n = window.__i18n || {};

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (i18n[key] === undefined) return;
    if (el.tagName === "OPTION") {
      el.textContent = i18n[key];
    } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.value = i18n[key];
    } else {
      el.textContent = i18n[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-placeholder");
    if (i18n[key] !== undefined) el.placeholder = i18n[key];
  });

  // Active language button
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.classList.remove("bg-accent", "text-white", "font-semibold");
    btn.classList.add("text-white/50");
  });
  var activeBtn = document.querySelector(
    ".lang-btn[onclick=\"setLang('" + currentLang + "')\"]",
  );
  if (activeBtn) {
    activeBtn.classList.add("bg-accent", "text-white", "font-semibold");
    activeBtn.classList.remove("text-white/50");
  }
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER
// ─────────────────────────────────────────────────────────────
function setLang(lang) {
  document.cookie = "lang=" + lang + ";path=/;max-age=31536000";
  localStorage.setItem("lang", lang);
  window.location.reload();
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebarOverlay")?.classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("show");
}

// ─────────────────────────────────────────────────────────────
// PROFILE DROPDOWN
// ─────────────────────────────────────────────────────────────
function toggleDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  dropdown.classList.toggle("hidden");
}

/* Close when clicking outside */
document.addEventListener("click", function (e) {
  const wrap = document.querySelector(".profile-wrap");
  const dropdown = document.getElementById("profileDropdown");

  if (!wrap.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});

// ─────────────────────────────────────────────────────────────
// NAV ACTIVE STATE
// ─────────────────────────────────────────────────────────────
function setActive(el) {
  document.querySelectorAll(".nav-item").forEach(function (i) {
    i.classList.remove("active");
  });
  el.classList.add("active");
  if (window.innerWidth <= 768) closeSidebar();
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
function waitForUserAndLoadWeather() {
  let tries = 0;

  const interval = setInterval(() => {
    const userId = window._currentUserId;

    if (userId) {
      console.log("User ready:", userId);
      clearInterval(interval);
      loadHeaderWeather();
    }

    tries++;
    if (tries > 10) {
      clearInterval(interval);
      console.warn("User not found, weather not loaded");
    }
  }, 200);
}

window.globalWeatherData = null;

async function fetchWeatherData() {

// remove this when API is ready, for testing without hitting rate limits

  if (DEV_MODE) {
    console.log("⚠️ Dev mode: skipping API call");
    return {
      temperature: 28,
      windspeed: 10,
      humidity: 70,
      rainfall: 50,
      description: "Clear",
    };
  }
  if (window.globalWeatherData) return window.globalWeatherData; // cache

  const userId = window._currentUserId;
  const lat = localStorage.getItem(`lat_${userId}`);
  const lon = localStorage.getItem(`lon_${userId}`);

  if (!lat || !lon) return null;

  try {
    const res = await fetch("/api/weather", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat, lon }),
    });

    const data = await res.json();

    window.globalWeatherData = data; // cache it
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function loadHeaderWeather() {
  const data = await fetchWeatherData();
  if (!data) return;

  const userId = window._currentUserId;
  const city = localStorage.getItem(`location_name_${userId}`);

  const tempEl = document.getElementById("headerTemp");
  const windEl = document.getElementById("headerWind");
  const locEl = document.getElementById("headerLoc");
  const humidityEl = document.getElementById("headerHumidity");
  const rainEl = document.getElementById("headerRain");
  const condEl = document.getElementById("headerCondition");
  const mobileEl = document.getElementById("mobileWeather");

  if (tempEl) tempEl.textContent = data.temperature + "°C";
  if (windEl) windEl.textContent = data.windspeed + " km/h";
  if (locEl) locEl.textContent = city || "Your Location";

  if (humidityEl) humidityEl.textContent = data.humidity + "%";
  if (rainEl) rainEl.textContent = data.rainfall + "%";
  if (condEl) condEl.textContent = data.description || "Clear";
  if (mobileEl) {
    mobileEl.textContent = `${data.temperature}°C · ${city}`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", waitForUserAndLoadWeather);
} else {
  waitForUserAndLoadWeather();
}
