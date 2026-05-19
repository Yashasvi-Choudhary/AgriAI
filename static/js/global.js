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

function clearProfitErrors() {
  document.querySelectorAll('#profitForm [id^="error-"]').forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
  });
}

function showProfitError(field, message) {
  const errorEl = document.getElementById(`error-${field}`);
  if (!errorEl) return;
  errorEl.textContent = t(message, message);
  errorEl.classList.remove('hidden');
}

function renderProfitHistory(history) {
  const wrapper = document.getElementById('profitHistoryWrapper');
  if (!wrapper) {
    console.error('History wrapper not found');
    return;
  }
  wrapper.innerHTML = '';

  if (!Array.isArray(history) || history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-sm text-textMid';
    empty.textContent = t('profit_analysis_no_history', 'No calculations yet');
    wrapper.appendChild(empty);
    return;
  }

  history.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'profit-history-card rounded-lg border border-backgroundDark p-4 bg-surface';
    if (record.id) {
      card.dataset.profitId = record.id;
    }
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-textMid">${t('profit_history_crop', 'Crop')}</p>
          <p class="mt-1 font-semibold text-textDark text-sm">${record.crop_name || 'N/A'}</p>
        </div>
        <button type="button" class="profit-history-delete inline-flex items-center justify-center rounded-full p-2 text-textLight hover:text-red-600 transition-colors" aria-label="${t('profit_history_delete', 'Delete')}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-xs text-textMid">${t('profit_history_revenue', 'Revenue')}</p>
          <p class="mt-1 font-semibold">₹${Number(record.expected_revenue || 0).toFixed(2)}</p>
        </div>
        <div>
          <p class="text-xs text-textMid">${t('profit_history_profit', 'Profit')}</p>
          <p class="mt-1 font-semibold">₹${Number(record.estimated_profit || 0).toFixed(2)}</p>
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  });
}

async function deleteProfitHistoryRecord(profitId, card) {
  if (!profitId) return;

  try {
    const response = await fetch(`/api/profit-analysis/${profitId}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
      console.error('Failed to delete profit history record:', data);
      alert(t('profit_error_failed', 'Unable to delete record. Please try again.'));
      return;
    }

    card.remove();
    const wrapper = document.getElementById('profitHistoryWrapper');
    if (wrapper && !wrapper.querySelector('.profit-history-card')) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-textMid';
      empty.textContent = t('profit_analysis_no_history', 'No calculations yet');
      wrapper.appendChild(empty);
    }
  } catch (err) {
    console.error('Delete request failed:', err);
    alert(t('profit_error_failed', 'Unable to delete record. Please try again.'));
  }
}

function initProfitHistoryActions() {
  const wrapper = document.getElementById('profitHistoryWrapper');
  if (!wrapper) return;
  wrapper.addEventListener('click', function (event) {
    const deleteButton = event.target.closest('.profit-history-delete');
    if (!deleteButton) return;
    const card = deleteButton.closest('.profit-history-card');
    const profitId = card?.dataset?.profitId;
    if (card && profitId) {
      deleteProfitHistoryRecord(profitId, card);
    }
  });
}

function renderProfitOutput(payload) {
  if (!payload) {
    console.error('Payload is null or undefined');
    return;
  }

  const lang = currentLang === 'hi' ? 'hindi' : 'english';
  const current = payload[lang];

  if (!current) {
    console.error('No data for language:', lang, 'Available keys:', Object.keys(payload));
    return;
  }

  const resultCard = document.getElementById('profitResultCard');
  if (!resultCard) {
    console.error('Result card element not found');
    return;
  }

  // Update all elements
  const totalInvEl = document.getElementById('result_total_investment');
  const revenueEl = document.getElementById('result_expected_revenue');
  const profitEl = document.getElementById('result_estimated_profit');
  const percentEl = document.getElementById('result_profit_percentage');
  const statusEl = document.getElementById('result_profit_status');
  const analysisEl = document.getElementById('result_analysis');

  if (totalInvEl) {
    totalInvEl.textContent = current.total_investment || '₹0.00';
  }
  if (revenueEl) {
    revenueEl.textContent = current.expected_revenue || '₹0.00';
  }
  if (profitEl) {
    profitEl.textContent = current.estimated_profit || '₹0.00';
  }
  if (percentEl) {
    percentEl.textContent = current.profit_percentage || '0.00%';
  }
  if (statusEl) {
    statusEl.textContent = current.profit_status || 'N/A';
  }
  if (analysisEl) {
    analysisEl.textContent = current.analysis || '';
  }

  resultCard.classList.remove('hidden');

  setTimeout(() => {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

async function getProfitAnalysis(event) {
  if (event) {
    event.preventDefault();
  }

  clearProfitErrors();

  const submitButton = document.getElementById('profitSubmitBtn');
  const spinner = document.getElementById('btnSpinner');
  
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add('opacity-70', 'cursor-not-allowed');
  }
  if (spinner) {
    spinner.classList.remove('hidden');
  }

  const payload = {
    crop_name: (document.getElementById('crop_name')?.value || '').trim(),
    land_area: document.getElementById('land_area')?.value || '',
    production_cost: document.getElementById('production_cost')?.value || '',
    fertilizer_cost: document.getElementById('fertilizer_cost')?.value || '',
    labor_cost: document.getElementById('labor_cost')?.value || '',
    irrigation_cost: document.getElementById('irrigation_cost')?.value || '',
    expected_yield: document.getElementById('expected_yield')?.value || '',
    market_price: document.getElementById('market_price')?.value || '',
    transport_cost: document.getElementById('transport_cost')?.value || '',
    other_expenses: document.getElementById('other_expenses')?.value || '',
    soil_type: document.getElementById('soil_type')?.value || '',
  };

  const userId = window._currentUserId || 'guest';
  payload.latitude = localStorage.getItem(`lat_${userId}`) || '';
  payload.longitude = localStorage.getItem(`lon_${userId}`) || '';

  try {
    const response = await fetch('/api/profit-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    let data;
    let responseText = '';
    try {
      responseText = await response.text();
      data = JSON.parse(responseText);
    } catch (jsonErr) {
      console.error('Failed to parse JSON response:', jsonErr);
      console.error('Response body was:', responseText);
      alert(t('profit_error_failed', 'Server returned invalid response'));
      return;
    }

    if (!response.ok) {
      console.error('Response not OK. Status:', response.status);
      console.error('Error response:', data);
      if (data && data.errors) {
        Object.entries(data.errors).forEach(([field, message]) => {
          showProfitError(field, message);
        });
      } else {
        alert(t('profit_error_failed', 'Unable to calculate profit. Please try again.'));
      }
      return;
    }

    if (data && data.data) {
      renderProfitOutput(data.data.profit_analysis);
      renderProfitHistory(data.data.history || []);
    } else {
      console.error('Unexpected response structure:', data);
      alert(t('profit_error_failed', 'Invalid response format'));
    }
  } catch (err) {
    console.error('Profit analysis error:', err);
    console.error('Error details:', err.message, err.stack);
    alert(t('profit_error_failed', 'Unable to calculate profit. Please try again.'));
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
    }
    if (spinner) {
      spinner.classList.add('hidden');
    }
  }
}

function initProfitAnalyzer() {
  const profitForm = document.getElementById('profitForm');
  if (!profitForm) {
    console.warn('Profit form not found on this page');
    return;
  }
  profitForm.addEventListener('submit', getProfitAnalysis);
  initProfitHistoryActions();
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

// Initialize profit analyzer when DOM is ready
function initOnDOMReady() {
  setTimeout(function() {
    initProfitAnalyzer();
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnDOMReady);
} else {
  initOnDOMReady();
}
