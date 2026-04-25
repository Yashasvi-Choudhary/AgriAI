/* ============================================================
   plant-disease-detection.js
   Handles: drag-drop upload, preview, API call, result render
   ============================================================ */

let selectedFile = null;

/* ── Show / hide UI panels ── */
function showState(id) {
  ["emptyState", "loadingState", "resultCard", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

/* ══════════════════════════════
   DRAG & DROP HANDLERS
   ══════════════════════════════ */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById("dropZone");
  zone.classList.add("border-primary", "bg-primary/5");
  zone.classList.remove("border-backgroundDark");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  const zone = document.getElementById("dropZone");
  zone.classList.remove("border-primary", "bg-primary/5");
  zone.classList.add("border-backgroundDark");
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  handleDragLeave(e);
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

/* ── Validate and preview a file ── */
function processFile(file) {
  const t = window.__i18n || {};
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (!allowed.includes(file.type)) {
    alert(
      t["disease_alert_format"] ||
        "Please upload a valid image (JPG, PNG, WEBP).",
    );
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert(t["disease_alert_size"] || "File size must be under 10 MB.");
    return;
  }

  selectedFile = file;

  /* Show preview */
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById("previewImg").src = ev.target.result;
  };
  reader.readAsDataURL(file);

  document.getElementById("previewFileName").textContent = file.name;
  document.getElementById("previewFileSize").textContent = formatSize(
    file.size,
  );
  document.getElementById("previewSection").classList.remove("hidden");
  document.getElementById("dropPlaceholder").classList.add("hidden");
}

/* ── Remove selected image ── */
function removeImage() {
  selectedFile = null;
  document.getElementById("imageInput").value = "";
  document.getElementById("previewImg").src = "";
  document.getElementById("previewSection").classList.add("hidden");
  document.getElementById("dropPlaceholder").classList.remove("hidden");
  showState("emptyState");
}

/* ── Reset to initial state ── */
function resetDetection() {
  removeImage();
}

/* ── Format bytes to KB/MB ── */
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/* ══════════════════════════════
   MAIN DETECTION FUNCTION
   ══════════════════════════════ */
async function detectDisease() {
  const t = window.__i18n || {};

  if (!selectedFile) {
    alert(
      t["disease_alert_no_image"] || "Please upload a plant leaf image first.",
    );
    return;
  }

  const btn = document.getElementById("detectBtn");
  const btnText = document.getElementById("detectBtnText");
  const spinner = document.getElementById("detectSpinner");

  btn.disabled = true;
  btn.style.opacity = "0.7";
  btnText.textContent = t["disease_btn_detecting"] || "Detecting…";
  spinner.classList.remove("hidden");
  showState("loadingState");

  try {
    const formData = new FormData();
    formData.append("image", selectedFile);

    const res = await fetch("/predict-disease", {
      method: "POST",
      headers: { "X-CSRFToken": getCsrf() },
      body: formData,
    });

    if (!res.ok) throw new Error("Server error " + res.status);

    const data = await res.json();
    if (!data.disease)
      throw new Error(
        t["disease_error_no_result"] || "No result received from server.",
      );

    renderResult(data);
  } catch (err) {
    document.getElementById("errorMsg").textContent =
      err.message || "Unexpected error.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btnText.textContent = t["disease_btn_detect"] || "Detect Disease";
    spinner.classList.add("hidden");
  }
}

/* ══════════════════════════════
   RENDER RESULT
   ══════════════════════════════ */
function renderResult(data) {
  const t = window.__i18n || {};

  const disease = data.disease || "Unknown";
  const confidence = Math.round(parseFloat(data.confidence || 0) * 100);
  const description = data.description || "";
  const solution = data.solution || "";
  const isHealthy =
    disease.toLowerCase().includes("healthy") ||
    disease.toLowerCase().includes("स्वस्थ");

  /* Thumbnail from preview */
  document.getElementById("resultThumb").src =
    document.getElementById("previewImg").src;

  /* Icon */
  document.getElementById("resultIcon").textContent = isHealthy ? "🌱" : "🍂";

  /* Disease name */
  document.getElementById("resultDiseaseName").textContent = disease;

  /* Healthy badge */
  if (isHealthy) {
    document.getElementById("healthyBadge").classList.remove("hidden");
  } else {
    document.getElementById("healthyBadge").classList.add("hidden");
  }

  /* Glow color */
  const glow = document.getElementById("resultGlow");
  glow.className = glow.className.replace(/bg-\S+/g, "");
  glow.classList.add(isHealthy ? "bg-green-300/30" : "bg-red-300/20");

  /* Confidence bar */
  document.getElementById("confidenceText").textContent = confidence + "%";
  setTimeout(() => {
    document.getElementById("confidenceBar").style.width = confidence + "%";
  }, 150);

  /* Confidence badge */
  const badge = document.getElementById("confidenceBadge");
  let badgeClass, badgeLabel;
  if (confidence >= 85) {
    badgeClass = "bg-green-100 text-green-700";
    badgeLabel = t["disease_confidence_high"] || "High Confidence";
  } else if (confidence >= 60) {
    badgeClass = "bg-yellow-100 text-yellow-700";
    badgeLabel = t["disease_confidence_medium"] || "Medium Confidence";
  } else {
    badgeClass = "bg-red-100 text-red-700";
    badgeLabel = t["disease_confidence_low"] || "Low Confidence";
  }
  badge.className =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider " +
    badgeClass;
  badge.textContent = badgeLabel;

  /* Description & solution */
  document.getElementById("resultDescription").textContent = description;
  document.getElementById("resultSolution").textContent = solution;

  showState("resultCard");
}

/* ── CSRF helper ── */
function getCsrf() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.content;
  const c = document.cookie
    .split(";")
    .find((x) => x.trim().startsWith("csrftoken="));
  return c ? c.trim().split("=")[1] : "";
}

