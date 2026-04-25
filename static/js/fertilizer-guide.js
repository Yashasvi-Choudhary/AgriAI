/* ============================================================
   fertilizer-guide.js
   Handles: form collection, API call, result rendering, i18n
   ============================================================ */

/* ── Show / hide UI panels ── */
function showState(id) {
  ["emptyState", "loadingState", "resultDashboard", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

/* ── Nutrient level classifier ── */
function getNutrientLevel(value, low, high) {
  if (value <= low) return "low";
  if (value >= high) return "high";
  return "medium";
}

/* ── Render nutrient analysis chips ── */
function renderNutrientAnalysis(analysis) {
  const t = window.__i18n || {};
  const container = document.getElementById("nutrientAnalysis");

  const nutrients = [
    {
      key: "nitrogen",
      label: t["fert_n_label"] || "Nitrogen (N)",
      icon: "N",
      value: analysis.nitrogen || "—",
    },
    {
      key: "phosphorus",
      label: t["fert_p_label"] || "Phosphorus (P)",
      icon: "P",
      value: analysis.phosphorus || "—",
    },
    {
      key: "potassium",
      label: t["fert_k_label"] || "Potassium (K)",
      icon: "K",
      value: analysis.potassium || "—",
    },
  ];

  const colorMap = {
    low: "bg-red-50 border-red-200 text-red-700",
    medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
    high: "bg-green-50 border-green-200 text-green-700",
  };
  const labelMap = {
    low: t["fert_level_low"] || "Low",
    medium: t["fert_level_medium"] || "Medium",
    high: t["fert_level_high"] || "High",
  };
  const iconMap = { low: "⬇️", medium: "➡️", high: "⬆️" };

  container.innerHTML = nutrients
    .map(({ label, icon, value }) => {
      const level =
        typeof value === "string"
          ? value.toLowerCase()
          : getNutrientLevel(parseFloat(value), 30, 60);
      const normalizedLevel = ["low", "medium", "high"].includes(level)
        ? level
        : "medium";
      return `
      <div class="flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${colorMap[normalizedLevel]}">
        <span class="text-2xl font-black">${icon}</span>
        <span class="text-xs font-semibold uppercase tracking-wider">${label}</span>
        <span class="flex items-center gap-1 text-xs font-bold">
          ${iconMap[normalizedLevel]} ${labelMap[normalizedLevel]}
        </span>
      </div>
    `;
    })
    .join("");
}

/* ── Render fertilizer recommendation cards ── */
function renderRecommendations(recommendations) {
  const t = window.__i18n || {};
  const container = document.getElementById("recommendationsList");

  if (!recommendations || !recommendations.length) {
    container.innerHTML = `<p class="text-sm text-textLight">${t["fert_no_recommendations"] || "No recommendations available."}</p>`;
    return;
  }

  container.innerHTML = recommendations
    .map(
      (rec, i) => `
    <div class="flex flex-col sm:flex-row gap-4 rounded-xl border border-backgroundDark p-5 bg-backgroundLight">
      <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primaryLight to-primary flex items-center justify-center text-white font-black text-sm">
        ${i + 1}
      </div>
      <div class="flex-1 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-bold text-textDark">${rec.name || "—"}</h3>
          ${rec.composition ? `<span class="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">${rec.composition}</span>` : ""}
        </div>
        <div class="flex flex-wrap gap-4 text-xs text-textMid">
          ${rec.quantity ? `<span>⚖️ <strong>${t["fert_rec_qty"] || "Qty"}:</strong> ${rec.quantity}</span>` : ""}
          ${rec.usage ? `<span>📋 <strong>${t["fert_rec_usage"] || "Usage"}:</strong> ${rec.usage}</span>` : ""}
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

/* ── Render application schedule ── */
function renderSchedule(schedule) {
  const t = window.__i18n || {};
  const container = document.getElementById("scheduleList");

  const defaultSchedule = schedule || [
    {
      stage: t["fert_stage_sowing"] || "Sowing Stage",
      timing: t["fert_timing_sowing"] || "At the time of sowing",
      icon: "🌱",
    },
    {
      stage: t["fert_stage_growth"] || "Growth Stage",
      timing: t["fert_timing_growth"] || "30–45 days after sowing",
      icon: "🌿",
    },
    {
      stage: t["fert_stage_preharvest"] || "Pre-Harvest",
      timing: t["fert_timing_preharvest"] || "15 days before expected harvest",
      icon: "🌾",
    },
  ];

  container.innerHTML = defaultSchedule
    .map(
      (item, i) => `
    <div class="flex items-start gap-4 rounded-xl border border-backgroundDark p-4 bg-backgroundLight">
      <div class="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
        ${item.icon || "📅"}
      </div>
      <div>
        <p class="text-sm font-bold text-textDark">${item.stage}</p>
        <p class="text-xs text-textLight mt-0.5">${item.timing}</p>
      </div>
      <div class="ml-auto flex-shrink-0">
        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">${i + 1}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

/* ── Render tips ── */
function renderTips(tips) {
  const t = window.__i18n || {};
  const list = document.getElementById("tipsList");

  const defaultTips = tips || [
    t["fert_tip_1"] ||
      "Always conduct a soil test before applying fertilizers.",
    t["fert_tip_2"] ||
      "Apply fertilizers in the early morning or evening to reduce evaporation loss.",
    t["fert_tip_3"] ||
      "Avoid applying fertilizers before heavy rain to prevent nutrient runoff.",
    t["fert_tip_4"] ||
      "Use organic compost alongside chemical fertilizers for best results.",
  ];

  list.innerHTML = defaultTips
    .map(
      (tip) => `
    <li class="flex items-start gap-2.5 rounded-lg bg-backgroundLight border border-backgroundDark px-4 py-3 text-sm text-textDark">
      <span class="mt-0.5 flex-shrink-0 text-primary">💡</span>
      <span>${tip}</span>
    </li>
  `,
    )
    .join("");
}

/* ── Main recommendation function ── */
async function getFertilizerRecommendation() {
  const btn = document.getElementById("fertBtn");
  const btnText = document.getElementById("fertBtnText");
  const spinner = document.getElementById("fertSpinner");
  const t = window.__i18n || {};

  const payload = {
    crop_type: document.getElementById("crop_type").value,
    soil_type: document.getElementById("soil_type").value,
    ph_level: parseFloat(document.getElementById("ph_level").value) || null,
    temperature:
      parseFloat(document.getElementById("temperature").value) || null,
    soil_moisture:
      parseFloat(document.getElementById("soil_moisture").value) || null,
    nitrogen: parseFloat(document.getElementById("nitrogen").value) || null,
    phosphorus: parseFloat(document.getElementById("phosphorus").value) || null,
    potassium: parseFloat(document.getElementById("potassium").value) || null,
  };

  if (!payload.crop_type) {
    alert(
      t["fert_alert_crop"] || "Please select a crop type before proceeding.",
    );
    return;
  }
  if (!payload.soil_type) {
    alert(
      t["fert_alert_soil"] || "Please select a soil type before proceeding.",
    );
    return;
  }

  btn.disabled = true;
  btn.style.opacity = "0.7";
  btnText.textContent = t["fert_btn_loading"] || "Analysing…";
  spinner.classList.remove("hidden");
  showState("loadingState");

  try {
    const res = await fetch("/fertilizer/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Server error " + res.status);

    const data = await res.json();
    if (!data.success)
      throw new Error(
        data.message || t["fert_error_generic"] || "Prediction failed.",
      );

    /* Render all result sections */
    renderNutrientAnalysis(data.analysis || {});
    renderRecommendations(data.recommendations || []);
    renderSchedule(data.schedule || null);
    renderTips(data.tips || null);

    showState("resultDashboard");
  } catch (err) {
    document.getElementById("errorMsg").textContent =
      err.message || "Unexpected error.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btnText.textContent = t["fert_btn"] || "Get Fertilizer Recommendation";
    spinner.classList.add("hidden");
  }
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

