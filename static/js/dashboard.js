document.addEventListener("DOMContentLoaded", () => {
  initLocationPopup();
  loadSavedLocation();
  loadUser();
});

// ─────────────────────────────
// LOCATION POPUP (ONLY FIRST TIME)
// ─────────────────────────────
function initLocationPopup() {
  const popup = document.getElementById("locationPopup");
  if (!popup) return;

  const locationSet = localStorage.getItem("location_set");

  if (locationSet === "true") {
    popup.style.display = "none";
  } else {
    popup.style.display = "flex";
  }
}

// ─────────────────────────────
// LOAD SAVED LOCATION EVERYWHERE
// ─────────────────────────────
function loadSavedLocation() {
  const city = localStorage.getItem("location_name");
  if (!city) return;

  document.getElementById("wLocation")?.textContent = city;
  document.getElementById("headerLoc")?.textContent = city;
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
  closepopup();
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
      const lat = data[0].lat;
      const lon = data[0].lon;

      saveAndClose(value, lat, lon);
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
  localStorage.setItem("location_set", "true");
  localStorage.setItem("location_name", city);

  if (lat !== null && lon !== null) {
    localStorage.setItem("lat", lat);
    localStorage.setItem("lon", lon);
  }

  loadSavedLocation();
  closepopup();
}

// ─────────────────────────────
// CLOSE POPUP
// ─────────────────────────────
function closepopup() {
  const p = document.getElementById("locationPopup");
  if (!p) return;

  p.style.opacity = "0";
  setTimeout(() => {
    p.style.display = "none";
    p.style.opacity = "1";
  }, 150);
}

// ─────────────────────────────
// USER DATA (GLOBAL)
// ─────────────────────────────
async function loadUser() {
  try {
    const res = await fetch("/auth/api/user");
    const data = await res.json();

    if (!data.success) {
      window.location.href = "/login";
      return;
    }

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
  } catch (err) {
    console.error(err);
  }
}
