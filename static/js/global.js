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

async function getMarketPrice() {
  const t = window.__i18n || {};
  const cropName = (document.getElementById("cropName") || {}).value || "";
  const userId = window._currentUserId;

  if (!cropName.trim()) {
    showMarketError(t["market_error_no_crop"] || "Please enter a crop name");
    return;
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
            <td class="py-3 px-4 text-sm text-textDark">${date}</td>
            <td class="py-3 px-4 text-sm text-textDark">${item.crop_name}</td>
            <td class="py-3 px-4 text-sm text-textDark">${item.market_name}</td>
            <td class="py-3 px-4 text-sm font-semibold text-primary">${item.current_price}</td>
            <td class="py-3 px-4 text-center">
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
  if (!confirm("Are you sure you want to delete this record?")) return;

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
