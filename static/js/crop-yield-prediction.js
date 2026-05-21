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
  const yieldData = response?.data?.yield_prediction?.[lang];
  if (!yieldData) throw new Error("Invalid response structure");

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

  // Simple productivity badge based on yield value
  let productivity = "medium";
  let productivityIcon = "➡️";
  let productivityColor = "bg-yellow-100 text-yellow-700";
  let productivityKey = "yield_productivity_medium";

  if (yieldValue > 2000) {
    productivity = "high";
    productivityIcon = "⬆️";
    productivityColor = "bg-green-100 text-green-700";
    productivityKey = "yield_productivity_high";
  } else if (yieldValue < 1000) {
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

  // Generate simple insights based on current form values
  const currentInputs = {
    temperature: parseFloat(document.getElementById("temperature").value) || 0,
    rainfall: parseFloat(document.getElementById("rainfall").value) || 0,
    humidity: parseFloat(document.getElementById("humidity").value) || 0,
    ph: parseFloat(document.getElementById("ph").value) || 0,
  };

  const insights = [];
  if (currentInputs.temperature > 30)
    insights.push(t["yield_insight_temp_high"] || "Temperature is high");
  else if (currentInputs.temperature < 15)
    insights.push(t["yield_insight_temp_low"] || "Temperature is low");
  else
    insights.push(t["yield_insight_temp_optimal"] || "Temperature is optimal");

  if (currentInputs.rainfall < 500)
    insights.push(t["yield_insight_rainfall_low"] || "Rainfall is low");
  else if (currentInputs.rainfall > 1500)
    insights.push(t["yield_insight_rainfall_high"] || "Rainfall is high");
  else
    insights.push(t["yield_insight_rainfall_optimal"] || "Rainfall is optimal");

  if (currentInputs.humidity < 40)
    insights.push(t["yield_insight_humidity_low"] || "Humidity is low");
  else if (currentInputs.humidity > 80)
    insights.push(t["yield_insight_humidity_high"] || "Humidity is high");
  else
    insights.push(t["yield_insight_humidity_optimal"] || "Humidity is optimal");

  if (currentInputs.ph < 5.5 || currentInputs.ph > 7.5)
    insights.push(t["yield_insight_ph_bad"] || "pH is outside optimal range");
  else insights.push(t["yield_insight_ph_good"] || "pH is optimal");

  // Display insights
  const insightsContainer = document.getElementById("insightsList");
  insightsContainer.innerHTML = insights
    .map((insight) => `<li class="text-sm text-textMid">${insight}</li>`)
    .join("");

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
    humidity: parseFloat(document.getElementById("humidity").value),
    ph: parseFloat(document.getElementById("ph").value),
    nitrogen: parseFloat(document.getElementById("nitrogen").value),
    phosphorus: parseFloat(document.getElementById("phosphorus").value),
    potassium: parseFloat(document.getElementById("potassium").value),
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
  if (
    isNaN(formData.humidity) ||
    formData.humidity < 0 ||
    formData.humidity > 100
  ) {
    alert(t["yield_alert_humidity"] || "Please enter humidity (0-100).");
    return;
  }
  if (isNaN(formData.ph) || formData.ph < 0 || formData.ph > 14) {
    alert(t["yield_alert_ph"] || "Please enter pH (0-14).");
    return;
  }
  if (isNaN(formData.nitrogen) || formData.nitrogen < 0) {
    alert(t["yield_alert_nitrogen"] || "Please enter nitrogen.");
    return;
  }
  if (isNaN(formData.phosphorus) || formData.phosphorus < 0) {
    alert(t["yield_alert_phosphorus"] || "Please enter phosphorus.");
    return;
  }
  if (isNaN(formData.potassium) || formData.potassium < 0) {
    alert(t["yield_alert_potassium"] || "Please enter potassium.");
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
