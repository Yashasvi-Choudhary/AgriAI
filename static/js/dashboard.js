document.addEventListener("DOMContentLoaded", async () => {
  await loadUser(); // wait until user + location ready
  loadHeaderWeather();
  loadDashboardWeather(); // then load weather
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
  const city = localStorage.getItem(userKey("location_name"));
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
  localStorage.setItem(userKey("location_name"), city);

  if (lat !== null && lon !== null) {
    localStorage.setItem(userKey("lat"), lat);
    localStorage.setItem(userKey("lon"), lon);

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

  // 🔥 IMPORTANT: clear old cache
  window.globalWeatherData = null;

  // 🔥 reload weather everywhere
  if (typeof loadHeaderWeather === "function") {
    loadHeaderWeather();
  }

  if (typeof loadDashboardWeather === "function") {
    loadDashboardWeather();
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
  return localStorage.getItem(userKey("location_name"));
}

//weather on dashboard

async function loadDashboardWeather() {
  const data = await fetchWeatherData();
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
}
