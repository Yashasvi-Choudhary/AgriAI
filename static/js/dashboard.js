document.addEventListener("DOMContentLoaded", async () => {
  await loadUser();

  if (typeof loadHeaderWeather === "function") {
    void loadHeaderWeather(false);
  }

  if (typeof loadDashboardWeather === "function") {
    void loadDashboardWeather(false);
  }
});

// ─────────────────────────────
// USER DATA — runs first, then triggers popup
// ─────────────────────────────
async function loadUser() {
  try {
    const res = await fetch("/auth/api/user");
    const data = await res.json();

    if (!data.success) {
      window.location.href = "/login";
      return;
    }

    window._currentUserId = data.id;

    document
      .querySelectorAll(".user-name")
      .forEach((el) => (el.textContent = data.name));
    document
      .querySelectorAll(".user-email")
      .forEach((el) => (el.textContent = data.email));

    const initials = data.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    document
      .querySelectorAll(".user-initials")
      .forEach((el) => (el.textContent = initials));

    // NOW it's safe to check location — we know who the user is
    loadSavedLocation();
    initLocationPopup();
    return true;
  } catch (err) {
    console.error(err);
  }
}

// ─────────────────────────────
// HELPERS — per-user localStorage keys
// ─────────────────────────────
function userKey(key) {
  const uid = window._currentUserId || "guest";
  return `${key}_${uid}`;
}

// ─────────────────────────────
// LOCATION POPUP (ONLY FIRST TIME, PER USER)
// ─────────────────────────────
function initLocationPopup() {
  const popup = document.getElementById("locationPopup");
  if (!popup) return;

  const locationSet = localStorage.getItem(userKey("location_set"));

  if (locationSet === "true") {
    popup.style.display = "none";
  } else {
    // Show popup for this user
    popup.style.display = "flex";
  }
}

// ─────────────────────────────
// LOAD SAVED LOCATION EVERYWHERE
// ─────────────────────────────
function loadSavedLocation() {
  const { locationName: city } = getStoredLocationData();
  if (!city) return;

  const wLoc = document.getElementById("wLocation");
  const hLoc = document.getElementById("headerLoc");
  if (wLoc) wLoc.textContent = city;
  if (hLoc) hLoc.textContent = city;
}

// ─────────────────────────────
// ALLOW LOCATION (GPS)
// ─────────────────────────────
function allowLocation() {
  if (!navigator.geolocation) {
    showManual();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        );
        const data = await res.json();

        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          "Your Location";

        saveAndClose(city, lat, lon);
      } catch {
        saveAndClose("Your Location", lat, lon);
      }
    },
    () => showManual(),
  );
}

// ─────────────────────────────
// MANUAL INPUT
// ─────────────────────────────
function showManual() {
  const el = document.getElementById("manualLoc");
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "block";
  }
}

async function confirmManual() {
  const value = document.getElementById("locInput")?.value.trim();
  if (!value) return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=1`,
    );
    const data = await res.json();

    if (data && data.length > 0) {
      saveAndClose(value, parseFloat(data[0].lat), parseFloat(data[0].lon));
    } else {
      saveAndClose(value, null, null);
    }
  } catch {
    saveAndClose(value, null, null);
  }
}

// ─────────────────────────────
// SAVE LOCATION (MAIN LOGIC)
// ─────────────────────────────
async function saveAndClose(city, lat, lon) {
  console.log("Saving location:", city, lat, lon);

  localStorage.setItem(userKey("location_set"), "true");

  if (typeof saveStoredLocationData === "function") {
    saveStoredLocationData({ lat, lon, locationName: city });
  } else {
    localStorage.setItem(userKey("location_name"), city);
    localStorage.setItem("location_name", city);
    if (lat !== null && lon !== null) {
      localStorage.setItem(userKey("lat"), lat);
      localStorage.setItem(userKey("lon"), lon);
      localStorage.setItem("lat", lat);
      localStorage.setItem("lon", lon);
    }
  }

  if (lat !== null && lon !== null) {
    try {
      const res = await fetch("/api/save-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lat, lon, city }),
      });

      const data = await res.json();
      console.log("Backend response:", data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }

  loadSavedLocation();

  // clear old weather cache after location change
  window.globalWeatherData = null;

  // reload header weather
  if (typeof loadHeaderWeather === "function") {
    void loadHeaderWeather(true);
  }

  // reload dashboard weather
  if (typeof loadDashboardWeather === "function") {
    void loadDashboardWeather(true);
  }

  closePopup();
}

// ─────────────────────────────
// CLOSE POPUP
// ─────────────────────────────
function closePopup() {
  const p = document.getElementById("locationPopup");
  if (!p) return;

  p.style.opacity = "0";
  p.style.transition = "opacity 0.15s ease";
  setTimeout(() => {
    p.style.display = "none";
    p.style.opacity = "1";
  }, 150);
}

// ─────────────────────────────
// PUBLIC HELPERS (usable from other pages)
// ─────────────────────────────
function getSavedLat() {
  return localStorage.getItem(userKey("lat"));
}
function getSavedLon() {
  return localStorage.getItem(userKey("lon"));
}
function getSavedCity() {
  return (
    localStorage.getItem(userKey("location_name")) ||
    localStorage.getItem("location_name")
  );
}

//weather on dashboard

async function loadDashboardWeather(forceRefresh = false) {
  const data = await fetchWeatherData(forceRefresh);
  if (!data) return;

  // 🌡 Temperature
  const tempEl = document.getElementById("wTemp");
  if (tempEl) tempEl.textContent = data.temperature + "°C";

  // 📍 Location
  const locEl = document.getElementById("wLocation");
  if (locEl) locEl.textContent = getSavedCity() || "Your Location";

  // 💧 Humidity
  const humEl = document.getElementById("wHumidity");
  if (humEl) humEl.textContent = data.humidity + "%";

  // 🌬 Wind
  const windEl = document.getElementById("wWind");
  if (windEl) windEl.textContent = data.windspeed + " km/h";

  // 🌧 Rain
  const rainEl = document.getElementById("wRain");
  if (rainEl) rainEl.textContent = data.rainfall + "%";

  const descEl = document.getElementById("wDesc");
  if (descEl) descEl.textContent = data.description || "Clear";

  renderTemperatureForecast(data);
}

function renderTemperatureForecast(data) {
  const container = document.getElementById("forecastChart");
  const summary = document.getElementById("forecastSummary");
  if (!container) return;

  const forecast =
    Array.isArray(data?.forecast) && data.forecast.length
      ? data.forecast.slice(0, 7)
      : [
          {
            label: "Today",
            day: "Today",
            max: data.temperature || 28,
            min: (data.temperature || 28) - 4,
            condition: data.description || "Clear",
          },
          {
            label: "Tomorrow",
            day: "Tomorrow",
            max: (data.temperature || 28) + 1,
            min: (data.temperature || 28) - 3,
            condition: "Partly Cloudy",
          },
          {
            label: "Day 3",
            day: "Day 3",
            max: (data.temperature || 28) + 2,
            min: (data.temperature || 28) - 2,
            condition: "Sunny",
          },
          {
            label: "Day 4",
            day: "Day 4",
            max: (data.temperature || 28) + 1,
            min: (data.temperature || 28) - 3,
            condition: "Cloudy",
          },
          {
            label: "Day 5",
            day: "Day 5",
            max: (data.temperature || 28) + 3,
            min: (data.temperature || 28) - 2,
            condition: "Sunny",
          },
          {
            label: "Day 6",
            day: "Day 6",
            max: (data.temperature || 28) + 2,
            min: (data.temperature || 28) - 1,
            condition: "Warm",
          },
          {
            label: "Day 7",
            day: "Day 7",
            max: (data.temperature || 28) + 1,
            min: (data.temperature || 28) - 2,
            condition: "Moderate",
          },
        ];

  const values = forecast.map((item) =>
    Number(item.max ?? item.temperature ?? 0),
  );
  const minTemp = Math.min(...values) - 2;
  const maxTemp = Math.max(...values) + 2;
  const width = 900;
  const height = 280;
  const padding = { top: 18, right: 24, bottom: 42, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const x = (index) =>
    padding.left + (index * innerWidth) / Math.max(forecast.length - 1, 1);
  const y = (value) =>
    padding.top + ((maxTemp - value) / (maxTemp - minTemp || 1)) * innerHeight;

  const linePoints = forecast
    .map((item, index) => `${x(index)},${y(item.max)}`)
    .join(" ");
  const areaPoints = `${x(0)},${height - padding.bottom} ${linePoints} ${x(forecast.length - 1)},${height - padding.bottom}`;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = maxTemp - ((maxTemp - minTemp) / 4) * i;
    return `<line x1="${padding.left}" x2="${width - padding.right}" y1="${y(value)}" y2="${y(value)}" stroke="rgba(17,24,39,0.12)" stroke-dasharray="4 4" />
            <text x="8" y="${y(value) + 4}" fill="#6b7280" font-size="11">${Math.round(value)}°</text>`;
  }).join("");

  const labels = forecast
    .map(
      (item, index) => `
      <g>
        <text x="${x(index)}" y="${height - 12}" text-anchor="middle" fill="#6b7280" font-size="11">${item.label || item.day || `Day ${index + 1}`}</text>
        <circle cx="${x(index)}" cy="${y(item.max)}" r="5.5" fill="#ffffff" stroke="#2d7a4f" stroke-width="3" />
      </g>`,
    )
    .join("");

  container.innerHTML = `
    <defs>
      <linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(45,122,79,0.18)" />
        <stop offset="100%" stop-color="rgba(45,122,79,0.02)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="24" fill="white"></rect>
    ${gridLines}
    <polygon points="${areaPoints}" fill="url(#tempFill)"></polygon>
    <polyline points="${linePoints}" fill="none" stroke="#2d7a4f" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></polyline>
    ${labels}
  `;

  const avg = Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  if (summary) {
    summary.textContent = `Average ${avg}°C • High ${highest}°C • Low ${lowest}°C · Updated from your current weather location.`;
  }
}

function getForecastIcon(condition = "") {
  const text = condition.toLowerCase();
  if (text.includes("rain") || text.includes("shower")) return "🌧️";
  if (text.includes("cloud")) return "☁️";
  if (text.includes("sun")) return "☀️";
  if (text.includes("storm")) return "⛈️";
  return "🌤️";
}
