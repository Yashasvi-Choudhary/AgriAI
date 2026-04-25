/* ============================================================
   crop-yield-prediction.js
   Handles: form submission, geolocation, weather fetch,
            result rendering, comparison bar, suggestions
   ============================================================ */

/* ── Average yield benchmarks (Quintal/Acre) ── */
const AVG_YIELD = {
  wheat: 14,
  rice: 18,
  maize: 16,
  cotton: 8,
  sugarcane: 200,
};

/* ── Productivity thresholds (ratio vs average) ── */
function getProductivity(predicted, avg) {
  const ratio = predicted / avg;
  if (ratio >= 1.15) return "high";
  if (ratio >= 0.85) return "medium";
  return "low";
}

/* ── Show/hide UI panels ── */
function showState(id) {
  ["emptyState", "loadingState", "resultDashboard", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

/* ── Render result dashboard ── */
function renderResult(data) {
  const t = window.__i18n || {};

  const yieldVal = parseFloat(data.predicted_yield || data.yield || 0).toFixed(
    2,
  );
  const cropType = (
    data.crop_type ||
    document.getElementById("crop_type").value ||
    ""
  ).toLowerCase();
  const avg = AVG_YIELD[cropType] || 15;
  const productivity = getProductivity(parseFloat(yieldVal), avg);

  /* Main yield number */
  document.getElementById("resultYieldValue").textContent = yieldVal;
  document.getElementById("resultCropName").textContent =
    (t["yield_result_for"] || "Predicted for") +
    " " +
    (document.getElementById("crop_type").options[
      document.getElementById("crop_type").selectedIndex
    ]?.text || cropType);

  /* Productivity badge */
  const badge = document.getElementById("productivityBadge");
  const iconMap = { high: "⬆️", medium: "➡️", low: "⬇️" };
  const colorMap = {
    high: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-red-100 text-red-700",
  };
  badge.className =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider " +
    colorMap[productivity];
  document.getElementById("productivityIcon").textContent =
    iconMap[productivity];
  document.getElementById("productivityText").textContent =
    t[`yield_productivity_${productivity}`] || productivity.toUpperCase();

  /* Weather insights */
  const temp = document.getElementById("weather_temp").value || "--";
  const humidity = document.getElementById("weather_humidity").value || "--";
  const rainfall = document.getElementById("weather_rainfall").value || "--";
  document.getElementById("insightTemp").textContent =
    temp !== "--" ? temp + " °C" : "--";
  document.getElementById("insightHumidity").textContent =
    humidity !== "--" ? humidity + " %" : "--";
  document.getElementById("insightRainfall").textContent =
    rainfall !== "--" ? rainfall + " mm" : "--";

  const weatherNote =
    data.weather_impact ||
    t["yield_weather_impact_note"] ||
    "Weather conditions look suitable for this crop.";
  document.getElementById("weatherImpactNote").textContent = weatherNote;

  /* Soil insights */
  document.getElementById("insightN").textContent =
    document.getElementById("nitrogen").value || "--";
  document.getElementById("insightP").textContent =
    document.getElementById("phosphorus").value || "--";
  document.getElementById("insightK").textContent =
    document.getElementById("potassium").value || "--";
  document.getElementById("insightPh").textContent =
    document.getElementById("ph_level").value || "--";

  /* Comparison bars */
  const maxVal = Math.max(parseFloat(yieldVal), avg) * 1.2;
  const yourPct = Math.min((parseFloat(yieldVal) / maxVal) * 100, 100);
  const avgPct = Math.min((avg / maxVal) * 100, 100);

  const unit = t["yield_result_unit"] || "Q/acre";
  document.getElementById("compYourValue").textContent = yieldVal + " " + unit;
  document.getElementById("compAvgValue").textContent = avg + " " + unit;

  setTimeout(() => {
    document.getElementById("compYourBar").style.width = yourPct + "%";
    document.getElementById("compAvgBar").style.width = avgPct + "%";
  }, 150);

  const diff = (parseFloat(yieldVal) - avg).toFixed(2);
  const diffSign = diff >= 0 ? "+" : "";
  document.getElementById("compDiffNote").textContent = t["yield_comp_note"]
    ? t["yield_comp_note"].replace("{diff}", diffSign + diff)
    : `Your predicted yield is ${diffSign}${diff} ${unit} compared to the regional average.`;

  /* Suggestions */
  const suggestions =
    data.suggestions ||
    buildDefaultSuggestions(cropType, parseFloat(yieldVal), avg, t);
  const list = document.getElementById("suggestionsList");
  list.innerHTML = "";
  suggestions.forEach((s) => {
    const li = document.createElement("li");
    li.className =
      "flex items-start gap-2.5 rounded-lg bg-backgroundLight border border-backgroundDark px-4 py-3 text-sm text-textDark";
    li.innerHTML = `<span class="mt-0.5 flex-shrink-0 text-primary">💡</span><span>${s}</span>`;
    list.appendChild(li);
  });

  showState("resultDashboard");
}

/* ── Auto-generate suggestions if not returned by API ── */
function buildDefaultSuggestions(crop, predicted, avg, t) {
  const suggestions = [];
  const n = parseFloat(document.getElementById("nitrogen").value);
  const p = parseFloat(document.getElementById("phosphorus").value);
  const k = parseFloat(document.getElementById("potassium").value);
  const ph = parseFloat(document.getElementById("ph_level").value);

  if (!isNaN(n) && n < 40)
    suggestions.push(
      t["yield_suggest_n"] ||
        "Increase Nitrogen (N) levels — low nitrogen can reduce yield by 10–15%.",
    );
  if (!isNaN(p) && p < 20)
    suggestions.push(
      t["yield_suggest_p"] ||
        "Apply phosphorus fertiliser to boost root development and grain filling.",
    );
  if (!isNaN(k) && k < 30)
    suggestions.push(
      t["yield_suggest_k"] ||
        "Potassium is below optimal range — consider muriate of potash application.",
    );
  if (!isNaN(ph) && (ph < 5.5 || ph > 7.5))
    suggestions.push(
      t["yield_suggest_ph"] ||
        "Soil pH is outside ideal range (5.5–7.5). Consider liming or sulphur treatment.",
    );
  if (predicted < avg)
    suggestions.push(
      t["yield_suggest_below_avg"] ||
        "Your yield is below average — review irrigation schedule and fertiliser timing.",
    );

  if (suggestions.length === 0)
    suggestions.push(
      t["yield_suggest_good"] ||
        "Soil and weather conditions look good. Maintain current farming practices.",
    );

  return suggestions;
}

/* ── Main prediction function ── */
async function getCropYieldPrediction() {
  const btn = document.getElementById("predictBtn");
  const btnText = document.getElementById("btnText");
  const btnSpinner = document.getElementById("btnSpinner");
  const t = window.__i18n || {};

  const payload = {
    crop_type: document.getElementById("crop_type").value,
    land_area: document.getElementById("land_area").value,
    area_unit: document.getElementById("area_unit").value,
    nitrogen: document.getElementById("nitrogen").value,
    phosphorus: document.getElementById("phosphorus").value,
    potassium: document.getElementById("potassium").value,
    ph_level: document.getElementById("ph_level").value,
    latitude: document.getElementById("latitude").value,
    longitude: document.getElementById("longitude").value,
    weather_temp: document.getElementById("weather_temp").value,
    weather_humidity: document.getElementById("weather_humidity").value,
    weather_rainfall: document.getElementById("weather_rainfall").value,
  };

  if (!payload.crop_type) {
    alert(
      t["yield_alert_crop"] || "Please select a crop type before proceeding.",
    );
    return;
  }
  if (!payload.land_area) {
    alert(t["yield_alert_area"] || "Please enter the land area.");
    return;
  }

  btn.disabled = true;
  btn.style.opacity = "0.7";
  btnText.textContent = t["yield_btn_predicting"] || "Predicting…";
  btnSpinner.classList.remove("hidden");
  showState("loadingState");

  try {
    const res = await fetch("/api/crop-yield-prediction/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Server error " + res.status);

    const data = await res.json();
    if (data.predicted_yield === undefined && data.yield === undefined)
      throw new Error(
        t["yield_error_no_result"] || "No yield prediction received.",
      );

    renderResult(data);
  } catch (err) {
    document.getElementById("errorMsg").textContent =
      err.message || "Unexpected error.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btnText.textContent = t["yield_btn_predict"] || "Predict Yield";
    btnSpinner.classList.add("hidden");
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

/* ── Geolocation + reverse geocode ── */
function detectLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude.toFixed(5);
      const lon = pos.coords.longitude.toFixed(5);
      document.getElementById("latitude").value = lat;
      document.getElementById("longitude").value = lon;

      /* Reverse geocode using nominatim */
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        );
        const d = await r.json();
        const city =
          d.address?.city ||
          d.address?.town ||
          d.address?.village ||
          d.address?.county ||
          "Unknown";
        document.getElementById("locationText").textContent = city;
      } catch {
        document.getElementById("locationText").textContent = `${lat}, ${lon}`;
      }

      /* Fetch weather via open-meteo */
      fetchWeather(lat, lon);
    },
    () => {
      const t = window.__i18n || {};
      document.getElementById("locationText").textContent =
        t["yield_location_unavailable"] || "Location unavailable";
    },
  );
}

/* ── Weather fetch (Open-Meteo, free, no key required) ── */
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`;
    const r = await fetch(url);
    const d = await r.json();
    const cur = d.current || {};
    const temp =
      cur.temperature_2m !== undefined ? cur.temperature_2m.toFixed(1) : "--";
    const hum =
      cur.relative_humidity_2m !== undefined ? cur.relative_humidity_2m : "--";
    const rain =
      cur.precipitation !== undefined ? cur.precipitation.toFixed(1) : "--";

    document.getElementById("weather_temp").value = temp;
    document.getElementById("weather_humidity").value = hum;
    document.getElementById("weather_rainfall").value = rain;

    const t = window.__i18n || {};
    document.getElementById("weatherChips").innerHTML = `
      <div class="flex items-center gap-1.5 rounded-lg border border-backgroundDark py-2 px-3 text-xs bg-backgroundLight text-textDark font-medium">
        🌡️ ${temp} °C
      </div>
      <div class="flex items-center gap-1.5 rounded-lg border border-backgroundDark py-2 px-3 text-xs bg-backgroundLight text-textDark font-medium">
        💧 ${hum}%
      </div>
      <div class="flex items-center gap-1.5 rounded-lg border border-backgroundDark py-2 px-3 text-xs bg-backgroundLight text-textDark font-medium">
        🌧️ ${rain} mm
      </div>
    `;
  } catch {
    const t = window.__i18n || {};
    document.getElementById("weatherChips").innerHTML = `
      <div class="flex items-center gap-1.5 rounded-lg border border-red-200 py-2 px-3 text-xs bg-red-50 text-red-600">
        ${t["yield_weather_error"] || "Weather unavailable"}
      </div>`;
  }
}
