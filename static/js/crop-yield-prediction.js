/* ============================================================
   crop-yield-prediction.js
   Handles: form submission, result rendering, language support
   ============================================================ */

/* ── Show/hide UI panels ── */
function showState(id) {
  ["emptyState", "loadingState", "resultDashboard", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

/* ── Get current language from DOM ── */
function getCurrentLanguage() {
  const htmlLang = document.documentElement.lang || "en";
  return htmlLang === "hi" ? "hi" : "en";
}

/* ── Render result dashboard ── */
function renderResult(response) {
  const t = window.__i18n || {};
  const lang = getCurrentLanguage();

  // Parse response structure
  const yieldData = response.data.yield_prediction[lang];
  const yieldValue = parseFloat(yieldData.predicted_yield || 0).toFixed(2);
  const unit = yieldData.unit || "kg/hectare";
  const analysis = yieldData.analysis || "";
  const suggestion = yieldData.suggestion || "";

  // Display main yield result
  document.getElementById("resultYieldValue").textContent = yieldValue;
  document.getElementById("resultYieldUnit").textContent = unit;

  // Display crop name
  const cropField = document.getElementById("crop");
  const cropName = cropField.options[cropField.selectedIndex]?.text || "Crop";
  document.getElementById("resultCropName").textContent =
    (t["yield_result_for"] || "Predicted for") + " " + cropName;

  // Productivity badge
  const avgYields = {
    wheat: 2000,
    rice: 2500,
    maize: 3000,
    cotton: 1500,
    sugarcane: 60000,
  };
  const crop = document.getElementById("crop").value || "wheat";
  const avgYield = avgYields[crop] || 2000;
  const ratio = yieldValue / (avgYield / 100);

  let productivity = "medium";
  let productivityIcon = "➡️";
  let productivityColor = "bg-yellow-100 text-yellow-700";
  let productivityKey = "yield_productivity_medium";

  if (ratio >= 85) {
    productivity = "high";
    productivityIcon = "⬆️";
    productivityColor = "bg-green-100 text-green-700";
    productivityKey = "yield_productivity_high";
  } else if (ratio < 65) {
    productivity = "low";
    productivityIcon = "⬇️";
    productivityColor = "bg-red-100 text-red-700";
    productivityKey = "yield_productivity_low";
  }

  const badge = document.getElementById("productivityBadge");
  badge.className =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider " +
    productivityColor;
  document.getElementById("productivityIcon").textContent = productivityIcon;
  document.getElementById("productivityText").textContent =
    t[productivityKey] || productivity.toUpperCase();

  // Display analysis and suggestions
  document.getElementById("weatherImpactNote").textContent = analysis;
  document.getElementById("compDiffNote").textContent = suggestion;

  showState("resultDashboard");
}

/* ── Main prediction function ── */
async function getCropYieldPrediction() {
  const btn = document.getElementById("predictBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");
  const t = window.__i18n || {};

  // Collect form data
  const formData = {
    crop: document.getElementById("crop").value,
    area: parseFloat(document.getElementById("area").value),
    rainfall: parseFloat(document.getElementById("rainfall").value),
    temperature: parseFloat(document.getElementById("temperature").value),
    soil_type: document.getElementById("soil_type").value,
    fertilizer_usage: parseFloat(
      document.getElementById("fertilizer_usage").value,
    ),
    irrigation: parseFloat(document.getElementById("irrigation").value),
  };

  // Validation
  if (!formData.crop) {
    alert(
      t["yield_alert_crop"] || "Please select a crop type before proceeding.",
    );
    return;
  }
  if (isNaN(formData.area) || formData.area <= 0) {
    alert(t["yield_alert_area"] || "Please enter the land area.");
    return;
  }
  if (isNaN(formData.rainfall) || formData.rainfall < 0) {
    alert(t["yield_alert_rainfall"] || "Please enter rainfall.");
    return;
  }
  if (isNaN(formData.temperature) || formData.temperature < 0) {
    alert(t["yield_alert_temperature"] || "Please enter temperature.");
    return;
  }
  if (!formData.soil_type) {
    alert(t["yield_alert_soil"] || "Please select soil type.");
    return;
  }
  if (isNaN(formData.fertilizer_usage) || formData.fertilizer_usage < 0) {
    alert(t["yield_alert_fertilizer"] || "Please enter fertilizer usage.");
    return;
  }
  if (isNaN(formData.irrigation) || formData.irrigation < 0) {
    alert(t["yield_alert_irrigation"] || "Please enter irrigation.");
    return;
  }

  // Show loading state
  btn.disabled = true;
  btn.style.opacity = "0.7";
  btnText.textContent = t["yield_btn_predicting"] || "Predicting…";
  btnSpinner.classList.remove("hidden");
  showState("loadingState");

  try {
    const response = await fetch("/predict-yield", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Server error " + response.status);
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(
        data.message ||
          t["yield_error_no_result"] ||
          "No yield prediction received.",
      );
    }

    if (!data.data || !data.data.yield_prediction) {
      throw new Error(t["yield_error_no_result"] || "Invalid response format.");
    }

    renderResult(data);
  } catch (err) {
    console.error("Prediction error:", err);
    document.getElementById("errorMsg").textContent =
      err.message ||
      t["yield_error_message"] ||
      "Unable to fetch prediction. Please try again.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btnText.textContent = t["yield_btn_predict"] || "Predict Yield";
    btnSpinner.classList.add("hidden");
  }
}

/* ── Initialize on page load ── */
document.addEventListener("DOMContentLoaded", function () {
  showState("emptyState");
});
