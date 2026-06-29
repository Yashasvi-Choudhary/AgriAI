/* ============================================================
   global.js — clean version, no opacity tricks needed
   The flash is eliminated by matching html background color.
   ============================================================ */
window.DEV_MODE = window.DEV_MODE ?? true;

window.currentLang = window.__lang || localStorage.getItem("lang") || "en";

// ─────────────────────────────────────────────────────────────
// APPLY TRANSLATIONS
// ─────────────────────────────────────────────────────────────
function applyLang() {
  var i18n = window.__i18n || {};
  console.log('Applying language. Current lang:', window.currentLang, 'Translations loaded:', Object.keys(i18n).length);

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (!i18n[key]) {
      console.warn("Missing translation key:", key);
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

  document.querySelectorAll("template").forEach(function (template) {
    translateTemplateContent(template.content, i18n);
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
    if (onclick.includes("setLang('" + window.currentLang + "')")) {
      btn.classList.add("bg-accent", "text-white", "font-semibold");
      btn.classList.remove("text-white/50");
    }
  });
  
  console.log('Language applied successfully:', window.currentLang);
}

// Translation helper
window.t = function (key, fallback) {
  const i18n = window.__i18n || {};
  return i18n[key] || fallback || key;
};

function translateTemplateContent(node, i18n) {
  if (!node) return;

  if (node.nodeType === Node.ELEMENT_NODE) {
    var key = node.getAttribute("data-i18n");
    if (key && i18n[key] !== undefined) {
      if (node.tagName === "OPTION") {
        node.textContent = i18n[key];
      } else if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
        node.value = i18n[key];
      } else {
        node.textContent = i18n[key];
      }
    }

    var placeholderKey = node.getAttribute("data-i18n-placeholder");
    if (placeholderKey && i18n[placeholderKey] !== undefined) {
      node.placeholder = i18n[placeholderKey];
    }
  }

  node.childNodes.forEach(function (child) {
    translateTemplateContent(child, i18n);
  });
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER
// ─────────────────────────────────────────────────────────────
function setLang(lang) {
  if (!lang || (lang !== "en" && lang !== "hi")) {
    console.warn("Invalid language:", lang);
    return;
  }
  console.log("Setting language to:", lang);
  document.cookie = "lang=" + lang + ";path=/;max-age=31536000;SameSite=Lax";
  localStorage.setItem("lang", lang);
  window.currentLang = lang;
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
      // ...existing code...
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
    const today = new Date();
    const forecast = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const iso = date.toISOString().split("T")[0];
      return {
        date: iso,
        label: date.toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
        day:
          index === 0 ? "Today" : index === 1 ? "Tomorrow" : `Day ${index + 1}`,
        max: 28 + ((index % 3) - 1),
        min: 20 + (index % 2),
        condition: index % 2 === 0 ? "Sunny" : "Partly Cloudy",
      };
    });

    return {
      temperature: 28,
      windspeed: 10,
      humidity: 70,
      rainfall: 50,
      description: "Clear",
      forecast,
    };
  }
  if (window.globalWeatherData) return window.globalWeatherData; // cache

  const userId = window._currentUserId;
  const lat = localStorage.getItem(`lat_${userId}`);
  const lon = localStorage.getItem(`lon_${userId}`);

  if (!lat || !lon) {
    console.warn(
      "No stored location coordinates found, using fallback weather values",
    );
    return {
      temperature: "--",
      windspeed: "--",
      humidity: "--",
      rainfall: "--",
      description: "N/A",
      forecast: [],
    };
  }

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
  // ...existing code...
  const data = await fetchWeatherData();
  if (!data) {
    console.warn("loadHeaderWeather: No weather data returned");
    return;
  }

  const userId = window._currentUserId;
  const city = localStorage.getItem(`location_name_${userId}`);

  const tempEl = document.getElementById("headerTemp");
  const windEl = document.getElementById("headerWind");
  const locEl = document.getElementById("headerLoc");
  const humidityEl = document.getElementById("headerHumidity");
  const rainEl = document.getElementById("headerRain");
  const condEl = document.getElementById("headerCondition");
  const mobileEl = document.getElementById("mobileWeather");

  // ...existing code...

  if (tempEl) tempEl.textContent = data.temperature + "°C";
  if (windEl) windEl.textContent = data.windspeed + " km/h";
  if (locEl) locEl.textContent = city || "Your Location";
  if (humidityEl) humidityEl.textContent = data.humidity + "%";
  if (rainEl) rainEl.textContent = data.rainfall + "%";
  if (condEl) condEl.textContent = data.description || "Clear";
  if (mobileEl) {
    mobileEl.textContent = `${data.temperature}°C · ${city}`;
  }
  // ...existing code...
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    waitForUserAndLoadWeather();
    updateLocationDisplay();
    if (document.getElementById("historyTable")) loadMarketHistory();
  });
} else {
  waitForUserAndLoadWeather();
  updateLocationDisplay();
  if (document.getElementById("historyTable")) loadMarketHistory();
}

// ─────────────────────────────────────────────────────────────
// MARKET PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

function updateLocationDisplay() {
  const userId = window._currentUserId;
  if (!userId) return;

  const locationName = localStorage.getItem(`location_name_${userId}`);
  const displayEl = document.getElementById("locationDisplay");
  if (displayEl) {
    displayEl.value = locationName || "Not set";
  }
}

async function updateLocation() {
  const locationInput = document.getElementById("locationDisplay");
  const locationName = locationInput.value.trim();
  const userId = window._currentUserId;

  if (!locationName || locationName === "Not set") return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
    );
    const data = await res.json();

    if (data.length > 0) {
      const lat = data[0].lat;
      const lon = data[0].lon;

      localStorage.setItem(`lat_${userId}`, lat);
      localStorage.setItem(`lon_${userId}`, lon);
      localStorage.setItem(`location_name_${userId}`, locationName);

      // Update displays across app
      updateLocationDisplay();
      // Update header if exists
      const headerLocation = document.getElementById("headerLocation");
      if (headerLocation) headerLocation.textContent = locationName;
    } else {
      showMarketError(
        window.__i18n?.["market_error_invalid_location"] ||
          "Invalid location. Please enter a valid location.",
      );
    }
  } catch (err) {
    console.error("Geocoding error:", err);
    showMarketError(
      window.__i18n?.["market_error_geocode_error"] ||
        "Error updating location. Please try again.",
    );
  }
}

async function getMarketPrice() {
  const t = window.__i18n || {};
  const cropName = document.getElementById("cropName").value;
  const userId = window._currentUserId;

  if (!cropName) {
    showMarketError(t["market_error_no_crop"] || "Please select a crop");
    return;
  }

  // Check if location input differs from stored, update if needed
  const locationInput = document.getElementById("locationDisplay");
  const currentLocationValue = locationInput.value.trim();
  const storedLocation = localStorage.getItem(`location_name_${userId}`);
  if (
    currentLocationValue &&
    currentLocationValue !== storedLocation &&
    currentLocationValue !== "Not set"
  ) {
    await updateLocation();
  }

  const latitude = localStorage.getItem(`lat_${userId}`);
  const longitude = localStorage.getItem(`lon_${userId}`);
  const locationName = localStorage.getItem(`location_name_${userId}`);

  if (!latitude || !longitude || !locationName) {
    showMarketError(
      t["market_error_no_location"] ||
        "Location not found. Please set your location first",
    );
    return;
  }

  const btn = document.getElementById("checkPriceBtn");
  const btnText = document.getElementById("checkBtnText");
  const spinner = document.getElementById("checkSpinner");

  btn.disabled = true;
  btnText.textContent = t["market_btn_checking"] || "Checking…";
  spinner.classList.remove("hidden");
  showMarketState("loading");

  try {
    const res = await fetch("/api/get-market-price", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        crop_name: cropName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location_name: locationName,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      console.error("Market price JSON parse error:", parseError);
      showMarketError(
        t["market_error_api_error"] || "Error fetching market data",
      );
      return;
    }

    if (!res.ok || data.status === "error" || !data.data?.market_price) {
      showMarketError(
        data.message ||
          t["market_error_api_error"] ||
          "Error fetching market data",
      );
      return;
    }

    renderMarketResult(data.data.market_price);
    loadMarketHistory();
  } catch (err) {
    console.error("Market price fetch error:", err);
    showMarketError(
      t["market_error_server_error"] || "Server error. Please try again later",
    );
  } finally {
    btn.disabled = false;
    btnText.textContent = t["market_btn_check"] || "Check Price";
    spinner.classList.add("hidden");
  }
}

function renderMarketResult(marketData) {
  const t = window.__i18n || {};
  const lang = localStorage.getItem("lang") || "en";
  const data = marketData[lang] || marketData.english;

  const resultContent = document.getElementById("resultContent");
  resultContent.innerHTML = `
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_crop"></span>
      <span class="text-textDark font-semibold">${data.crop_name}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_location"></span>
      <span class="text-textDark font-semibold">${data.location}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_market"></span>
      <span class="text-textDark font-semibold">${data.market}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_current_price"></span>
      <span class="text-primary font-bold text-lg">${data.current_price}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_min_price"></span>
      <span class="text-textDark font-semibold">${data.min_price}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_max_price"></span>
      <span class="text-textDark font-semibold">${data.max_price}</span>
    </div>
  `;

  document.getElementById("analysisText").textContent = data.analysis;
  showMarketState("result");
}

async function loadMarketHistory() {
  try {
    const res = await fetch("/api/get-market-history", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (data.status !== "success") return;

    const history = data.data || [];
    const historyEmpty = document.getElementById("historyEmpty");
    const historyTable = document.getElementById("historyTable");
    const historyBody = document.getElementById("historyBody");

    if (history.length === 0) {
      historyEmpty.classList.remove("hidden");
      historyTable.classList.add("hidden");
      return;
    }

    historyEmpty.classList.add("hidden");
    historyTable.classList.remove("hidden");

    historyBody.innerHTML = history
      .map((item) => {
        const date = new Date(item.created_at).toLocaleDateString();
        return `
          <tr class="border-b border-backgroundDark hover:bg-backgroundLight transition-all">
            <td class="py-3 px-4 text-sm text-textDark text-left">${date}</td>
            <td class="py-3 px-4 text-sm text-textDark text-left">${item.crop_name}</td>
            <td class="py-3 px-4 text-sm text-textDark text-left">${item.market_name}</td>
            <td class="py-3 px-4 text-sm font-semibold text-primary text-left">${item.current_price}</td>
            <td class="py-3 px-4 text-left">
              <button
                onclick="deleteHistoryItem(${item.id})"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading market history:", err);
  }
}

async function deleteHistoryItem(id) {
  try {
    const res = await fetch("/delete-market-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (data.status === "success") {
      loadMarketHistory();
    }
  } catch (err) {
    console.error("Error deleting history:", err);
  }
}

function showMarketState(state) {
  document.getElementById("resultCard").classList.add("hidden");
  document.getElementById("errorState").classList.add("hidden");
  document.getElementById("loadingState").classList.add("hidden");

  if (state === "result") {
    document.getElementById("resultCard").classList.remove("hidden");
  } else if (state === "error") {
    document.getElementById("errorState").classList.remove("hidden");
  } else if (state === "loading") {
    document.getElementById("loadingState").classList.remove("hidden");
  }
}

function showMarketError(message) {
  document.getElementById("errorMsg").textContent = message;
  showMarketState("error");
}

// ─────────────────────────────────────────────────────────────
// PROFILE FUNCTIONS
// ─────────────────────────────────────────────────────────────
function getProfileLocationStorageKey() {
  const userId = window._currentUserId || "guest";
  return `location_name_${userId}`;
}

function initializeProfileLocationField() {
  const locationInput = document.getElementById("location");
  if (!locationInput) return;

  const storedLocation = localStorage.getItem(getProfileLocationStorageKey());
  if (storedLocation) {
    locationInput.value = storedLocation;
  }

  locationInput.addEventListener("input", function () {
    localStorage.setItem(
      getProfileLocationStorageKey(),
      locationInput.value.trim(),
    );
  });
}

async function updateProfile() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const locationValue = document.getElementById("location").value.trim();

  // Clear previous errors
  document.querySelectorAll('[id^="error-"]').forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });

  try {
    const res = await fetch("/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, location: locationValue }),
    });

    const data = await res.json();

    if (!data.success) {
      for (const [field, msg] of Object.entries(data.errors)) {
        const errorEl = document.getElementById(`error-${field}`);
        if (errorEl) {
          errorEl.textContent =
            t(`profile_error_${field}_required`, msg) ||
            t(`profile_error_${field}_invalid`, msg) ||
            t(`profile_error_${field}_too_short`, msg) ||
            msg;
          errorEl.classList.remove("hidden");
        }
      }
    } else {
      localStorage.setItem(getProfileLocationStorageKey(), locationValue);
      if (data.lat && data.lon) {
        const userId = window._currentUserId || "guest";
        localStorage.setItem(`lat_${userId}`, data.lat);
        localStorage.setItem(`lon_${userId}`, data.lon);
        localStorage.setItem(`location_name_${userId}`, locationValue);
      }
      alert(t("profile_success", "Profile updated successfully"));
      window.location.reload();
    }
  } catch (err) {
    console.error("Profile update error:", err);
    alert(t("profile_error_failed", "An error occurred. Please try again."));
  }
}

async function changePassword() {
  const current = document.getElementById("current_password").value;
  const newPass = document.getElementById("new_password").value;
  const confirm = document.getElementById("confirm_password").value;

  // Clear previous errors
  document.querySelectorAll('[id^="error-"]').forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });

  if (newPass.length > 0 && newPass.length < 6) {
    const errorEl = document.getElementById("error-new_password");
    if (errorEl) {
      errorEl.textContent = t(
        "password_error_too_short",
        "Password must be at least 6 characters long",
      );
      errorEl.classList.remove("hidden");
    }
    return;
  }

  try {
    const res = await fetch("/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: current,
        new_password: newPass,
        confirm_password: confirm,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      for (const [field, msg] of Object.entries(data.errors)) {
        const errorEl = document.getElementById(`error-${field}`);
        if (errorEl) {
          errorEl.textContent = t(`password_error_${field}`, msg);
          errorEl.classList.remove("hidden");
        }
      }
    } else {
      alert(t("password_success", "Password changed successfully"));
      document.getElementById("password-form").reset();
    }
  } catch (err) {
    console.error("Password change error:", err);
    alert(t("password_error_failed", "An error occurred. Please try again."));
  }
}

// Event listeners for profile page
if (document.getElementById("profile-form")) {
  initializeProfileLocationField();
  document
    .getElementById("profile-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      updateProfile();
    });
}

if (document.getElementById("password-form")) {
  document
    .getElementById("password-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      changePassword();
    });
}

// ─────────────────────────────────────────────────────────────
// MARKET PRICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

function updateLocationDisplay() {
  const userId = window._currentUserId;
  if (!userId) return;

  const locationName = localStorage.getItem(`location_name_${userId}`);
  const displayEl = document.getElementById("locationDisplay");
  if (displayEl) {
    displayEl.value = locationName || "Not set";
  }
}

async function updateLocation() {
  const locationInput = document.getElementById("locationDisplay");
  const locationName = locationInput.value.trim();
  const userId = window._currentUserId;

  if (!locationName || locationName === "Not set") return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
    );
    const data = await res.json();

    if (data.length > 0) {
      const lat = data[0].lat;
      const lon = data[0].lon;

      localStorage.setItem(`lat_${userId}`, lat);
      localStorage.setItem(`lon_${userId}`, lon);
      localStorage.setItem(`location_name_${userId}`, locationName);

      // Update displays across app
      updateLocationDisplay();
      // Update header if exists
      const headerLocation = document.getElementById("headerLocation");
      if (headerLocation) headerLocation.textContent = locationName;
    } else {
      showMarketError(
        window.__i18n?.["market_error_invalid_location"] ||
          "Invalid location. Please enter a valid location.",
      );
    }
  } catch (err) {
    console.error("Geocoding error:", err);
    showMarketError(
      window.__i18n?.["market_error_geocode_error"] ||
        "Error updating location. Please try again.",
    );
  }
}

async function getMarketPrice() {
  const t = window.__i18n || {};
  const cropName = document.getElementById("cropName").value;
  const userId = window._currentUserId;

  if (!cropName) {
    showMarketError(t["market_error_no_crop"] || "Please select a crop");
    return;
  }

  // Check if location input differs from stored, update if needed
  const locationInput = document.getElementById("locationDisplay");
  const currentLocationValue = locationInput.value.trim();
  const storedLocation = localStorage.getItem(`location_name_${userId}`);
  if (
    currentLocationValue &&
    currentLocationValue !== storedLocation &&
    currentLocationValue !== "Not set"
  ) {
    await updateLocation();
  }

  const latitude = localStorage.getItem(`lat_${userId}`);
  const longitude = localStorage.getItem(`lon_${userId}`);
  const locationName = localStorage.getItem(`location_name_${userId}`);

  if (!latitude || !longitude || !locationName) {
    showMarketError(
      t["market_error_no_location"] ||
        "Location not found. Please set your location first",
    );
    return;
  }

  const btn = document.getElementById("checkPriceBtn");
  const btnText = document.getElementById("checkBtnText");
  const spinner = document.getElementById("checkSpinner");

  btn.disabled = true;
  btnText.textContent = t["market_btn_checking"] || "Checking…";
  spinner.classList.remove("hidden");
  showMarketState("loading");

  try {
    const res = await fetch("/api/get-market-price", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        crop_name: cropName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location_name: locationName,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      console.error("Market price JSON parse error:", parseError);
      showMarketError(
        t["market_error_api_error"] || "Error fetching market data",
      );
      return;
    }

    if (!res.ok || data.status === "error" || !data.data?.market_price) {
      showMarketError(
        data.message ||
          t["market_error_api_error"] ||
          "Error fetching market data",
      );
      return;
    }

    renderMarketResult(data.data.market_price);
    loadMarketHistory();
  } catch (err) {
    console.error("Market price fetch error:", err);
    showMarketError(
      t["market_error_server_error"] || "Server error. Please try again later",
    );
  } finally {
    btn.disabled = false;
    btnText.textContent = t["market_btn_check"] || "Check Price";
    spinner.classList.add("hidden");
  }
}

function renderMarketResult(marketData) {
  const t = window.__i18n || {};
  const lang = localStorage.getItem("lang") || "en";
  const data = marketData[lang] || marketData.english;
  const isNearby = Boolean(data.is_nearby);

  const resultContent = document.getElementById("resultContent");
  resultContent.innerHTML = `
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_crop"></span>
      <span class="text-textDark font-semibold">${data.crop_name}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_location"></span>
      <span class="text-textDark font-semibold">${data.location}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_market"></span>
      <div class="flex flex-col gap-1">
        <span class="text-textDark font-semibold">${data.market}</span>
        ${
          isNearby
            ? `<span class="inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">${t.market_result_nearby_market || "Nearby Market"}</span>`
            : ""
        }
      </div>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_current_price"></span>
      <span class="text-primary font-bold text-lg">${data.current_price}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_min_price"></span>
      <span class="text-textDark font-semibold">${data.min_price}</span>
    </div>
    <div class="flex items-start gap-2">
      <span class="text-textLight text-xs uppercase font-semibold min-w-max" data-i18n="market_result_max_price"></span>
      <span class="text-textDark font-semibold">${data.max_price}</span>
    </div>
  `;

  document.getElementById("analysisText").textContent = data.analysis;
  showMarketState("result");
}

function setupMarketHistoryToggle() {
  const button = document.getElementById("historyToggleBtn");
  const content = document.getElementById("historyContent");

  if (!button || !content || button.dataset.bound === "true") {
    return;
  }

  button.dataset.bound = "true";
  window.marketHistoryVisible = window.marketHistoryVisible ?? false;

  const updateToggleState = () => {
    const isVisible = !content.classList.contains("hidden");
    button.setAttribute("aria-expanded", String(isVisible));

    const label = document.getElementById("historyToggleLabel");
    const icon = document.getElementById("historyToggleIcon");
    const t = window.__i18n || {};

    if (label) {
      label.textContent = isVisible
        ? t.market_history_hide || "Hide History"
        : t.market_history_show || "Show History";
    }

    if (icon) {
      icon.classList.toggle("rotate-180", isVisible);
    }
  };

  const toggleMarketHistory = () => {
    const isHidden = content.classList.contains("hidden");
    content.classList.toggle("hidden");
    window.marketHistoryVisible = !content.classList.contains("hidden");
    updateToggleState();
  };

  button.addEventListener("click", toggleMarketHistory);
  updateToggleState();
}

function syncMarketHistoryVisibility() {
  const content = document.getElementById("historyContent");
  if (!content) {
    return;
  }

  content.classList.toggle("hidden", !window.marketHistoryVisible);
  const button = document.getElementById("historyToggleBtn");
  if (button) {
    button.setAttribute(
      "aria-expanded",
      String(!content.classList.contains("hidden")),
    );
  }

  const label = document.getElementById("historyToggleLabel");
  const icon = document.getElementById("historyToggleIcon");
  const t = window.__i18n || {};

  const isVisible = !content.classList.contains("hidden");
  if (label) {
    label.textContent = isVisible
      ? t.market_history_hide || "Hide History"
      : t.market_history_show || "Show History";
  }

  if (icon) {
    icon.classList.toggle("rotate-180", isVisible);
  }
}

async function loadMarketHistory() {
  try {
    const res = await fetch("/api/get-market-history", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (data.status !== "success") return;

    const history = data.data || [];
    const historyEmpty = document.getElementById("historyEmpty");
    const historyList = document.getElementById("historyList");
    const t = window.__i18n || {};

    setupMarketHistoryToggle();

    if (!historyList) return;

    if (history.length === 0) {
      historyEmpty?.classList.remove("hidden");
      historyList.classList.add("hidden");
    } else {
      historyEmpty?.classList.add("hidden");
      historyList.classList.remove("hidden");
      historyList.innerHTML = history
        .map(
          (item) => `
          <article class="rounded-2xl border border-backgroundDark bg-slate-50/70 p-4 shadow-sm sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.market_history_crop || "Crop"}
                </p>
                <p class="mt-1 text-sm font-semibold text-textDark">${item.crop_name}</p>
              </div>
              <button
                type="button"
                onclick="deleteHistoryItem(${item.id})"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                aria-label="${t.market_history_delete || "Delete"}"
                title="${t.market_history_delete || "Delete"}"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-white px-3 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.market_result_location || "Location"}
                </p>
                <p class="mt-1 text-sm text-textDark">${item.location_name || "—"}</p>
              </div>
              <div class="rounded-xl bg-white px-3 py-3">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.market_history_market || "Market"}
                </p>
                <p class="mt-1 text-sm text-textDark">${item.market_name || "—"}</p>
              </div>
            </div>

            <div class="mt-3 rounded-xl bg-emerald-50 px-3 py-3">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-textLight">
                ${t.market_history_price || "Price"}
              </p>
              <p class="mt-1 text-base font-bold text-primary">${item.current_price || "—"}</p>
            </div>
          </article>
        `,
        )
        .join("");
    }

    syncMarketHistoryVisibility();
  } catch (err) {
    console.error("Error loading market history:", err);
  }
}

async function deleteHistoryItem(id) {
  try {
    const res = await fetch("/delete-market-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (data.status === "success") {
      loadMarketHistory();
    }
  } catch (err) {
    console.error("Error deleting history:", err);
  }
}

function showMarketState(state) {
  document.getElementById("resultCard").classList.add("hidden");
  document.getElementById("errorState").classList.add("hidden");
  document.getElementById("loadingState").classList.add("hidden");

  if (state === "result") {
    document.getElementById("resultCard").classList.remove("hidden");
  } else if (state === "error") {
    document.getElementById("errorState").classList.remove("hidden");
  } else if (state === "loading") {
    document.getElementById("loadingState").classList.remove("hidden");
  }
}

function showMarketError(message) {
  document.getElementById("errorMsg").textContent = message;
  showMarketState("error");
}

// ─────────────────────────────────────────────────────────────
// PROFILE FUNCTIONS
// ─────────────────────────────────────────────────────────────
function getProfileLocationStorageKey() {
  const userId = window._currentUserId || "guest";
  return `location_name_${userId}`;
}

function initializeProfileLocationField() {
  const locationInput = document.getElementById("location");
  if (!locationInput) return;

  const storedLocation = localStorage.getItem(getProfileLocationStorageKey());
  if (storedLocation) {
    locationInput.value = storedLocation;
  }

  locationInput.addEventListener("input", function () {
    localStorage.setItem(
      getProfileLocationStorageKey(),
      locationInput.value.trim(),
    );
  });
}

async function updateProfile() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const locationValue = document.getElementById("location").value.trim();

  // Clear previous errors
  document.querySelectorAll('[id^="error-"]').forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });

  try {
    const res = await fetch("/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, location: locationValue }),
    });

    const data = await res.json();

    if (!data.success) {
      for (const [field, msg] of Object.entries(data.errors)) {
        const errorEl = document.getElementById(`error-${field}`);
        if (errorEl) {
          errorEl.textContent =
            t(`profile_error_${field}_required`, msg) ||
            t(`profile_error_${field}_invalid`, msg) ||
            t(`profile_error_${field}_too_short`, msg) ||
            msg;
          errorEl.classList.remove("hidden");
        }
      }
    } else {
      localStorage.setItem(getProfileLocationStorageKey(), locationValue);
      if (data.lat && data.lon) {
        const userId = window._currentUserId || "guest";
        localStorage.setItem(`lat_${userId}`, data.lat);
        localStorage.setItem(`lon_${userId}`, data.lon);
        localStorage.setItem(`location_name_${userId}`, locationValue);
      }
      alert(t("profile_success", "Profile updated successfully"));
      window.location.reload();
    }
  } catch (err) {
    console.error("Profile update error:", err);
    alert(t("profile_error_failed", "An error occurred. Please try again."));
  }
}

async function changePassword() {
  const current = document.getElementById("current_password").value;
  const newPass = document.getElementById("new_password").value;
  const confirm = document.getElementById("confirm_password").value;

  // Clear previous errors
  document.querySelectorAll('[id^="error-"]').forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });

  if (newPass.length > 0 && newPass.length < 6) {
    const errorEl = document.getElementById("error-new_password");
    if (errorEl) {
      errorEl.textContent = t(
        "password_error_too_short",
        "Password must be at least 6 characters long",
      );
      errorEl.classList.remove("hidden");
    }
    return;
  }

  try {
    const res = await fetch("/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: current,
        new_password: newPass,
        confirm_password: confirm,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      for (const [field, msg] of Object.entries(data.errors)) {
        const errorEl = document.getElementById(`error-${field}`);
        if (errorEl) {
          errorEl.textContent = t(`password_error_${field}`, msg);
          errorEl.classList.remove("hidden");
        }
      }
    } else {
      alert(t("password_success", "Password changed successfully"));
      document.getElementById("password-form").reset();
    }
  } catch (err) {
    console.error("Password change error:", err);
    alert(t("password_error_failed", "An error occurred. Please try again."));
  }
}

function clearProfitErrors() {
  document.querySelectorAll('#profitForm [id^="error-"]').forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });
}

function showProfitError(field, message) {
  const errorEl = document.getElementById(`error-${field}`);
  if (!errorEl) return;
  errorEl.textContent = t(message, message);
  errorEl.classList.remove("hidden");
}

let profitHistoryVisible = true;

function updateProfitHistoryToggleLabel() {
  const textEl = document.getElementById("profitHistoryToggleText");
  if (!textEl) return;
  textEl.textContent = profitHistoryVisible
    ? t("profit_history_hide_button")
    : t("profit_history_show_button");
}

function setProfitHistoryVisibility(visible) {
  const content = document.getElementById("profitHistoryContent");
  const toggleBtn = document.getElementById("profitHistoryToggleBtn");
  if (!content) return;
  profitHistoryVisible = visible;
  content.classList.toggle("hidden", !visible);
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-expanded", visible ? "true" : "false");
  }
  updateProfitHistoryToggleLabel();
}

async function toggleProfitHistory() {
  setProfitHistoryVisibility(!profitHistoryVisible);
  if (profitHistoryVisible) {
    await loadProfitHistory();
  }
}

async function deleteProfitHistoryRecord(id, cardElement) {
  if (!id) return;
  try {
    const response = await fetch("/api/delete-profit-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (response.ok && data.status === "success") {
      if (cardElement) cardElement.remove();
      const wrapper = document.getElementById("profitHistoryWrapper");
      if (wrapper && wrapper.children.length === 0) {
        const empty = document.createElement("p");
        empty.className = "text-sm text-textMid";
        empty.textContent = t("profit_analysis_no_history");
        wrapper.appendChild(empty);
      }
    } else {
      alert(
        data.message ||
          t("profit_error_failed", "Unable to delete history item."),
      );
    }
  } catch (err) {
    console.error("Failed to delete profit history:", err);
    alert(t("profit_error_failed", "Unable to delete history item."));
  }
}

function bindProfitHistoryActions() {
  const wrapper = document.getElementById("profitHistoryWrapper");
  if (wrapper) {
    wrapper.addEventListener("click", (event) => {
      const button = event.target.closest(".profit-history-delete");
      if (!button) return;
      const card = button.closest("[data-profit-id]");
      const historyId = card?.dataset.profitId;
      if (!historyId) return;
      deleteProfitHistoryRecord(historyId, card);
    });
  }

  const toggleBtn = document.getElementById("profitHistoryToggleBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleProfitHistory);
  }
}

function renderProfitHistory(history) {
  const wrapper = document.getElementById("profitHistoryWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  if (!Array.isArray(history) || history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-textMid";
    empty.textContent = t("profit_analysis_no_history");
    wrapper.appendChild(empty);
    return;
  }

  history.forEach((record) => {
    const card = document.createElement("div");
    card.className =
      "profit-history-card rounded-lg border border-backgroundDark p-4 bg-surface";
    card.dataset.profitId = record.id;
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-textMid">${t("profit_history_crop")}</p>
          <p class="mt-1 font-semibold text-textDark text-sm">${record.crop_name || "N/A"}</p>
        </div>
        <button type="button" class="profit-history-delete inline-flex items-center justify-center rounded-full p-2 text-textLight hover:text-red-600 transition-colors" aria-label="${t("profit_history_delete", "Delete")}" title="${t("profit_history_delete", "Delete")}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p class="text-xs text-textMid">${t("profit_history_revenue")}</p>
          <p class="mt-1 font-semibold text-textDark">₹${Number(record.expected_revenue || 0).toFixed(2)}</p>
        </div>
        <div>
          <p class="text-xs text-textMid">${t("profit_history_profit")}</p>
          <p class="mt-1 font-semibold text-textDark">₹${Number(record.estimated_profit || 0).toFixed(2)}</p>
        </div>
      </div>
      <div class="mt-4 text-xs text-textMid text-right">
        ${record.created_at ? `<span>${t("profit_history_date")}: ${record.created_at}</span>` : ""}
      </div>
    `;
    wrapper.appendChild(card);
  });
}

async function loadProfitHistory() {
  const wrapper = document.getElementById("profitHistoryWrapper");
  if (!wrapper) return;

  try {
    const response = await fetch("/api/profit-history");
    const data = await response.json();
    if (response.ok && data.status === "success") {
      renderProfitHistory(data.data.history || []);
    } else {
      wrapper.innerHTML = `<p class="text-sm text-textMid">${data.message || t("profit_analysis_no_history")}</p>`;
    }
  } catch (err) {
    console.error("Failed to load profit history:", err);
    wrapper.innerHTML = `<p class="text-sm text-textMid">${t("profit_analysis_no_history")}</p>`;
  }
}

function renderProfitOutput(payload) {
  if (!payload) return;
  const current = window.currentLang === "hi" ? payload.hindi : payload.english;
  const resultCard = document.getElementById("profitResultCard");
  if (!resultCard) return;

  document.getElementById("result_total_investment").textContent =
    current.total_investment;
  document.getElementById("result_expected_revenue").textContent =
    current.expected_revenue;
  document.getElementById("result_estimated_profit").textContent =
    current.estimated_profit;
  document.getElementById("result_profit_percentage").textContent =
    current.profit_percentage;
  document.getElementById("result_profit_status").textContent =
    current.profit_status;
  document.getElementById("result_analysis").textContent = current.analysis;
  resultCard.classList.remove("hidden");
}

async function getProfitAnalysis(event) {
  event.preventDefault();

  clearProfitErrors();

  const submitButton = document.getElementById("profitSubmitBtn");
  const spinner = document.getElementById("btnSpinner");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("opacity-70", "cursor-not-allowed");
  }
  if (spinner) {
    spinner.classList.remove("hidden");
  }

  const payload = {
    crop_name: document.getElementById("crop_name")?.value.trim(),
    land_area: document.getElementById("land_area")?.value,
    production_cost: document.getElementById("production_cost")?.value,
    fertilizer_cost: document.getElementById("fertilizer_cost")?.value,
    labor_cost: document.getElementById("labor_cost")?.value,
    irrigation_cost: document.getElementById("irrigation_cost")?.value,
    expected_yield: document.getElementById("expected_yield")?.value,
    market_price: document.getElementById("market_price")?.value,
    transport_cost: document.getElementById("transport_cost")?.value,
    other_expenses: document.getElementById("other_expenses")?.value,
    soil_type: document.getElementById("soil_type")?.value,
  };

  const userId = window._currentUserId || "guest";
  payload.latitude = localStorage.getItem(`lat_${userId}`) || "";
  payload.longitude = localStorage.getItem(`lon_${userId}`) || "";

  try {
    const response = await fetch("/api/profit-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data && data.errors) {
        Object.entries(data.errors).forEach(([field, message]) =>
          showProfitError(field, message),
        );
        return;
      }
      alert(
        t(
          "profit_error_failed",
          "Unable to calculate profit. Please try again.",
        ),
      );
      return;
    }

    renderProfitOutput(data.data.profit_analysis);
    renderProfitHistory(data.data.history || []);
  } catch (err) {
    console.error("Profit analysis error:", err);
    alert(
      t("profit_error_failed", "Unable to calculate profit. Please try again."),
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-70", "cursor-not-allowed");
    }
    if (spinner) {
      spinner.classList.add("hidden");
    }
  }
}

async function initProfitAnalyzer() {
  const profitForm = document.getElementById("profitForm");
  const profitHistorySection = document.getElementById("profitHistorySection");

  if (!profitForm && !profitHistorySection) return;
  if (profitForm) {
    profitForm.addEventListener("submit", getProfitAnalysis);
  }
  bindProfitHistoryActions();
  await loadProfitHistory();
}

// Event listeners for profile page
if (document.getElementById("profile-form")) {
  initializeProfileLocationField();
  document
    .getElementById("profile-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      updateProfile();
    });
}

if (document.getElementById("password-form")) {
  document
    .getElementById("password-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      changePassword();
    });
}

function clearProfitErrors() {
  document.querySelectorAll('#profitForm [id^="error-"]').forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });
  const generalError = document.getElementById("profitErrorMessage");
  if (generalError) {
    generalError.classList.add("hidden");
    generalError.textContent = "";
  }
}

function showProfitError(field, message) {
  if (field === "general") {
    const generalError = document.getElementById("profitErrorMessage");
    if (!generalError) return;
    generalError.textContent = t(message, message);
    generalError.classList.remove("hidden");
    return;
  }

  const errorEl = document.getElementById(`error-${field}`);
  if (!errorEl) return;
  errorEl.textContent = t(message, message);
  errorEl.classList.remove("hidden");
}

function renderProfitHistory(history) {
  const wrapper = document.getElementById("profitHistoryWrapper");
  if (!wrapper) return;
  wrapper.innerHTML = "";

  if (!Array.isArray(history) || history.length === 0) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-textMid";
    empty.textContent = t("profit_analysis_no_history", "No history found");
    wrapper.appendChild(empty);
    return;
  }

  history.forEach((record) => {
    const card = document.createElement("div");
    card.className = "rounded-lg border border-backgroundDark p-4 bg-surface";
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-textMid">${t("profit_history_crop", "Crop")}</p>
          <p class="mt-1 font-semibold text-textDark text-sm">${record.crop_name || "N/A"}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-xs text-textMid">${t("profit_history_revenue", "Revenue")}</p>
          <p class="mt-1 font-semibold">₹${Number(record.expected_revenue || 0).toFixed(2)}</p>
        </div>
        <div>
          <p class="text-xs text-textMid">${t("profit_history_profit", "Profit")}</p>
          <p class="mt-1 font-semibold">₹${Number(record.estimated_profit || 0).toFixed(2)}</p>
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  });
}

function renderProfitOutput(payload) {
  if (!payload) return;
  const current = window.currentLang === "hi" ? payload.hindi : payload.english;
  if (!current) return;

  const resultCard = document.getElementById("profitResultCard");
  if (!resultCard) return;

  document.getElementById("result_total_investment").textContent =
    current.total_investment || "₹0.00";
  document.getElementById("result_expected_revenue").textContent =
    current.expected_revenue || "₹0.00";
  document.getElementById("result_estimated_profit").textContent =
    current.estimated_profit || "₹0.00";
  document.getElementById("result_profit_percentage").textContent =
    current.profit_percentage || "0.00%";
  document.getElementById("result_profit_status").textContent =
    current.profit_status || "N/A";
  document.getElementById("result_analysis").textContent =
    current.analysis || "";

  resultCard.classList.remove("hidden");
}

async function getProfitAnalysis(event) {
  if (event) event.preventDefault();

  clearProfitErrors();

  const submitButton = document.getElementById("profitSubmitBtn");
  const spinner = document.getElementById("btnSpinner");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("opacity-70", "cursor-not-allowed");
  }
  if (spinner) {
    spinner.classList.remove("hidden");
  }

  const payload = {
    crop_name: document.getElementById("crop_name")?.value.trim() || "",
    land_area: document.getElementById("land_area")?.value || "",
    production_cost: document.getElementById("production_cost")?.value || "",
    fertilizer_cost: document.getElementById("fertilizer_cost")?.value || "",
    labor_cost: document.getElementById("labor_cost")?.value || "",
    irrigation_cost: document.getElementById("irrigation_cost")?.value || "",
    expected_yield: document.getElementById("expected_yield")?.value || "",
    market_price: document.getElementById("market_price")?.value || "",
    transport_cost: document.getElementById("transport_cost")?.value || "",
    other_expenses: document.getElementById("other_expenses")?.value || "",
    soil_type: document.getElementById("soil_type")?.value || "",
  };

  const userId = window._currentUserId || "guest";
  payload.latitude = localStorage.getItem(`lat_${userId}`) || "";
  payload.longitude = localStorage.getItem(`lon_${userId}`) || "";

  try {
    const response = await fetch("/api/profit-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      if (data && data.errors) {
        Object.entries(data.errors).forEach(([field, message]) =>
          showProfitError(field, message),
        );
      } else {
        showProfitError("general", "profit_error_failed");
      }
      return;
    }

    renderProfitOutput(data.data.profit_analysis);
    renderProfitHistory(data.data.history || []);
  } catch (err) {
    console.error("Profit analysis error:", err);
    showProfitError("general", "profit_error_failed");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-70", "cursor-not-allowed");
    }
    if (spinner) {
      spinner.classList.add("hidden");
    }
  }
}

function initProfitAnalyzer() {
  const profitForm = document.getElementById("profitForm");
  if (!profitForm) return;
  profitForm.addEventListener("submit", getProfitAnalysis);
}
// Initialize profit analyzer when DOM is ready
function initOnDOMReady() {
  setTimeout(function () {
    initProfitAnalyzer();
  }, 100);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOnDOMReady);
} else {
  initOnDOMReady();
}
