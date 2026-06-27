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
<<<<<<< HEAD
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

=======
  const htmlLang = document.documentElement.lang || window.currentLang || "en";
  return htmlLang === "hi" ? "hi" : "en";
}

function getCropDisplayName(cropType, lang) {
  const normalized = (cropType || "").toLowerCase();
  const cropNames = {
    rice: { en: "Rice", hi: "चावल" },
    maize: { en: "Maize", hi: "मक्का" },
    chickpea: { en: "Chickpea", hi: "चना" },
    cotton: { en: "Cotton", hi: "कपास" },
  };

  return cropNames[normalized]?.[lang] || cropType || "Crop";
}

function getProductivityMeta(productivity, predictedYield, t) {
  const normalized = (productivity || "").toLowerCase();

  if (normalized === "high" || predictedYield > 2000) {
    return {
      label: t.yield_productivity_high || "High",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (normalized === "low" || predictedYield < 1000) {
    return {
      label: t.yield_productivity_low || "Low",
      className: "bg-rose-100 text-rose-700",
    };
  }

  return {
    label: t.yield_productivity_medium || "Medium",
    className: "bg-amber-100 text-amber-700",
  };
}

function formatAreaValue(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return "—";
  }

  const formatted = Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toFixed(1);

  return `${formatted} acre`;
}

function toggleYieldHistory() {
  const content = document.getElementById("yieldHistoryContent");
  const button = document.getElementById("yieldHistoryToggle");
  const toggleText = document.getElementById("yieldHistoryToggleText");
  const t = window.__i18n || {};

  if (!content || !button || !toggleText) {
    return;
  }

  const isOpen = button.getAttribute("aria-expanded") === "true";
  const nextState = !isOpen;

  button.setAttribute("aria-expanded", String(nextState));

  if (nextState) {
    content.classList.remove("hidden", "max-h-0", "opacity-0");
    content.classList.add("max-h-[2000px]", "opacity-100");
    toggleText.textContent = t.yield_history_hide || "Hide History";
  } else {
    content.classList.remove("max-h-[2000px]", "opacity-100");
    content.classList.add("hidden", "max-h-0", "opacity-0");
    toggleText.textContent = t.yield_history_show || "Show History";
  }
}

async function loadYieldHistory() {
  const t = window.__i18n || {};
  const list = document.getElementById("yieldHistoryList");
  const emptyState = document.getElementById("yieldHistoryEmpty");

  try {
    const response = await fetch("/api/yield-history");
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(data.message || "Unable to load history");
    }

    const history = Array.isArray(data.data) ? data.data : [];
    const storedAreas = JSON.parse(
      localStorage.getItem("yieldHistoryAreas") || "{}",
    );
    const lang = getCurrentLanguage();

    if (!history.length) {
      emptyState.classList.remove("hidden");
      list.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");

    list.innerHTML = history
      .map((item) => {
        const predictedYield = Number(item.predicted_yield || 0);
        const area = item.area ?? storedAreas[String(item.id)];
        const productivity = getProductivityMeta(
          item.productivity,
          predictedYield,
          t,
        );

        return `
          <div class="relative rounded-xl border border-backgroundDark bg-white px-3 py-3 shadow-sm sm:px-4">
            <div class="flex flex-wrap items-center gap-3 pr-9">
              <div class="min-w-[8rem] flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.yield_history_crop || "Crop"}
                </p>
                <p class="mt-0.5 text-sm font-bold text-textDark">
                  ${getCropDisplayName(item.crop_type, lang)}
                </p>
              </div>

              <div class="min-w-[5.5rem]">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.yield_history_area || "Acre"}
                </p>
                <p class="mt-0.5 text-sm font-semibold text-textDark">
                  ${formatAreaValue(area)}
                </p>
              </div>

              <div class="min-w-[7.5rem]">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.yield_history_productivity || "Productivity"}
                </p>
                <p class="mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${productivity.className}">
                  ${productivity.label}
                </p>
              </div>

              <div class="min-w-[7.5rem]">
                <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-textLight">
                  ${t.yield_history_predicted || "Predicted yield"}
                </p>
                <p class="mt-0.5 text-base font-black text-primaryDark">
                  ${predictedYield.toFixed(2)} kg
                </p>
              </div>

              <button
                type="button"
                data-history-id="${item.id}"
                aria-label="${t.yield_history_delete || "Delete"}"
                title="${t.yield_history_delete || "Delete"}"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-white text-base font-bold text-red-600 transition hover:bg-red-50"
              >
                ×
              </button>
            </div>
          </div>`;
      })
      .join("");

    list.querySelectorAll("[data-history-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const historyId = button.getAttribute("data-history-id");
        await deleteYieldHistory(historyId);
      });
    });
  } catch (error) {
    console.error("History load error:", error);
    emptyState.classList.remove("hidden");
    list.innerHTML = "";
  }
}

async function deleteYieldHistory(historyId) {
  const t = window.__i18n || {};

  try {
    const response = await fetch(`/api/yield-history/${historyId}`, {
      method: "DELETE",
    });

    const data = await response.json();
    if (!response.ok || data.status !== "success") {
      throw new Error(
        data.message ||
          t.yield_history_delete_error ||
          "Unable to delete this entry.",
      );
    }

    await loadYieldHistory();
  } catch (error) {
    console.error("History delete error:", error);
  }
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

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
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
<<<<<<< HEAD
  if (!formData.crop) {
=======
  if (
    !formData.crop ||
    !["rice", "maize", "chickpea", "cotton"].includes(formData.crop)
  ) {
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
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
<<<<<<< HEAD
=======

    const historyId = data.data.history_id;
    if (historyId) {
      const areas = JSON.parse(
        localStorage.getItem("yieldHistoryAreas") || "{}",
      );
      areas[String(historyId)] = formData.area;
      localStorage.setItem("yieldHistoryAreas", JSON.stringify(areas));
    }
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6

    renderResult(data);
    await loadYieldHistory();
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
<<<<<<< HEAD
  showState("emptyState");
=======
  const toggleText = document.getElementById("yieldHistoryToggleText");
  const content = document.getElementById("yieldHistoryContent");

  showState("emptyState");

  if (toggleText) {
    toggleText.textContent =
      window.__i18n?.yield_history_show || "Show History";
  }

  if (content) {
    content.classList.remove("max-h-[2000px]", "opacity-100");
    content.classList.add("max-h-0", "opacity-0");
  }

  loadYieldHistory();
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
});
