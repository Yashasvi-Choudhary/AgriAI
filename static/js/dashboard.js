// ─────────────────────────────
// LOCATION
// ─────────────────────────────
function allowLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById("wLocation").textContent = "Your Location";
        document.getElementById("headerLoc").textContent = "Your Area";
        closepopup();
      },
      () => showManual(),
    );
  } else showManual();
}

function denyLocation() {
  showManual();
}

function showManual() {
  document.getElementById("manualLoc").style.display = "block";
}

function confirmManual() {
  const v = document.getElementById("locInput").value.trim();
  if (v) {
    document.getElementById("wLocation").textContent = v;
    document.getElementById("headerLoc").textContent = v;
    closepopup();
  }
}

function closepopup() {
  const p = document.getElementById("locationPopup");
  if (!p) return;

  p.style.opacity = "0";
  setTimeout(() => (p.style.display = "none"), 300);
}
