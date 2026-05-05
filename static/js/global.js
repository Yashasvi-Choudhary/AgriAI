/* ============================================================
   global.js — clean version, no opacity tricks needed
   The flash is eliminated by matching html background color.
   ============================================================ */
window.DEV_MODE = window.DEV_MODE ?? true;

let currentLang = window.__lang || localStorage.getItem("lang") || "en";

// ─────────────────────────────────────────────────────────────
// APPLY TRANSLATIONS
// ─────────────────────────────────────────────────────────────
function applyLang() {
  var i18n = window.__i18n || {};
  console.log('Applying language. Current lang:', currentLang, 'Translations loaded:', Object.keys(i18n).length);

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (!i18n[key]) {
      console.warn('Missing translation key:', key);
      return;
    }
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

  // Active language button - highlight current language
  var buttons = document.querySelectorAll(".lang-btn");
  buttons.forEach(function (btn) {
    btn.classList.remove("bg-accent", "text-white", "font-semibold");
    btn.classList.add("text-white/50");
  });
  
  // Find and highlight the active language button by checking onclick attribute
  buttons.forEach(function (btn) {
    var onclick = btn.getAttribute('onclick') || '';
    if (onclick.includes("setLang('" + currentLang + "')")) {
      btn.classList.add("bg-accent", "text-white", "font-semibold");
      btn.classList.remove("text-white/50");
    }
  });
  
  console.log('Language applied successfully:', currentLang);
}

// Translation helper
window.t = function(key, fallback) {
  const i18n = window.__i18n || {};
  return i18n[key] || fallback || key;
};

// ─────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER
// ─────────────────────────────────────────────────────────────
function setLang(lang) {
  if (!lang || (lang !== 'en' && lang !== 'hi')) {
    console.warn('Invalid language:', lang);
    return;
  }
  console.log('Setting language to:', lang);
  document.cookie = "lang=" + lang + ";path=/;max-age=31536000;SameSite=Lax";
  localStorage.setItem("lang", lang);
  currentLang = lang;
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

// ─────────────────────────────────────────────────────────────
// PROFILE FUNCTIONS
// ─────────────────────────────────────────────────────────────
function getProfileLocationStorageKey() {
  const userId = window._currentUserId || 'guest';
  return `location_name_${userId}`;
}

function initializeProfileLocationField() {
  const locationInput = document.getElementById('location');
  if (!locationInput) return;

  const storedLocation = localStorage.getItem(getProfileLocationStorageKey());
  if (storedLocation) {
    locationInput.value = storedLocation;
  }

  locationInput.addEventListener('input', function () {
    localStorage.setItem(getProfileLocationStorageKey(), locationInput.value.trim());
  });
}

async function updateProfile() {
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const locationValue = document.getElementById('location').value.trim();

  // Clear previous errors
  document.querySelectorAll('[id^="error-"]').forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
  });

  try {
    const res = await fetch('/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, location: locationValue })
    });

    const data = await res.json();

    if (!data.success) {
      for (const [field, msg] of Object.entries(data.errors)) {
        const errorEl = document.getElementById(`error-${field}`);
        if (errorEl) {
          errorEl.textContent = t(`profile_error_${field}_required`, msg) || t(`profile_error_${field}_invalid`, msg) || t(`profile_error_${field}_too_short`, msg) || msg;
          errorEl.classList.remove('hidden');
        }
      }
    } else {
      localStorage.setItem(getProfileLocationStorageKey(), locationValue);
      if (data.lat && data.lon) {
        const userId = window._currentUserId || 'guest';
        localStorage.setItem(`lat_${userId}`, data.lat);
        localStorage.setItem(`lon_${userId}`, data.lon);
        localStorage.setItem(`location_name_${userId}`, locationValue);
      }
      alert(t('profile_success', 'Profile updated successfully'));
      window.location.reload();
    }
  } catch (err) {
    console.error('Profile update error:', err);
    alert(t('profile_error_failed', 'An error occurred. Please try again.'));
  }
}

async function changePassword() {
  const current = document.getElementById('current_password').value;
  const newPass = document.getElementById('new_password').value;
  const confirm = document.getElementById('confirm_password').value;

  // Clear previous errors
  document.querySelectorAll('[id^="error-"]').forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
  });

  if (newPass.length > 0 && newPass.length < 6) {
    const errorEl = document.getElementById('error-new_password');
    if (errorEl) {
      errorEl.textContent = t('password_error_too_short', 'Password must be at least 6 characters long');
      errorEl.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: current,
        new_password: newPass,
        confirm_password: confirm
      })
    });

    const data = await res.json();

    if (!data.success) {
      for (const [field, msg] of Object.entries(data.errors)) {
        const errorEl = document.getElementById(`error-${field}`);
        if (errorEl) {
          errorEl.textContent = t(`password_error_${field}`, msg);
          errorEl.classList.remove('hidden');
        }
      }
    } else {
      alert(t('password_success', 'Password changed successfully'));
      document.getElementById('password-form').reset();
    }
  } catch (err) {
    console.error('Password change error:', err);
    alert(t('password_error_failed', 'An error occurred. Please try again.'));
  }
}

// Event listeners for profile page
if (document.getElementById('profile-form')) {
  initializeProfileLocationField();
  document.getElementById('profile-form').addEventListener('submit', function(e) {
    e.preventDefault();
    updateProfile();
  });
}

if (document.getElementById('password-form')) {
  document.getElementById('password-form').addEventListener('submit', function(e) {
    e.preventDefault();
    changePassword();
  });
}
