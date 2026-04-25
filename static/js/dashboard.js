document.addEventListener("DOMContentLoaded", () => {
  // Don't call initLocationPopup() here anymore.
  // It must wait for user data to know WHICH user to check.
  loadUser();
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
// NOT NOW → JUST CLOSE (DON'T SAVE)
// ─────────────────────────────
function denyLocation() {
  closePopup();
}

// ─────────────────────────────
// MANUAL INPUT
// ─────────────────────────────
function showManual() {
  document.getElementById("manualLoc")?.classList.remove("hidden");
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
function saveAndClose(city, lat, lon) {
  localStorage.setItem(userKey("location_set"), "true");
  localStorage.setItem(userKey("location_name"), city);

  if (lat !== null && lon !== null) {
    localStorage.setItem(userKey("lat"), lat);
    localStorage.setItem(userKey("lon"), lon);
  }

  loadSavedLocation();
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
