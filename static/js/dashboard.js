// ─────────────────────────────
// LOCATION (FAST + OPTIMIZED)
// ─────────────────────────────

// Show popup only first time
document.addEventListener("DOMContentLoaded", () => {
  const alreadySet = localStorage.getItem("location_set");

  if (!alreadySet) {
    const popup = document.getElementById("locationPopup");
    if (popup) popup.style.display = "block";
  }
});

// Allow location (INSTANT for development)
function allowLocation() {
  // ⚡ instant update (no waiting)
  document.getElementById("wLocation").textContent = "Your Location";
  document.getElementById("headerLoc").textContent = "Your Area";

  // save state (so popup won't show again)
  localStorage.setItem("location_set", "true");

  closepopup();
}

// If user denies → show manual input
function denyLocation() {
  showManual();
}

// Show manual location input
function showManual() {
  const el = document.getElementById("manualLoc");
  if (el) el.style.display = "block";
}

// Confirm manual location
function confirmManual() {
  const input = document.getElementById("locInput");
  if (!input) return;

  const v = input.value.trim();

  if (v) {
    document.getElementById("wLocation").textContent = v;
    document.getElementById("headerLoc").textContent = v;

    localStorage.setItem("location_set", "true");

    closepopup();
  }
}

// Close popup
function closepopup() {
  const p = document.getElementById("locationPopup");
  if (!p) return;

  p.style.opacity = "0";

  setTimeout(() => {
    p.style.display = "none";
  }, 150);
}
