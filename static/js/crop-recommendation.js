window.EMOJIS = {
  rice: "🌾",
  wheat: "🌾",
  maize: "🌽",
  corn: "🌽",
  cotton: "🌿",
  sugarcane: "🎋",
  jute: "🌱",
  soybean: "🫘",
  chickpea: "🫘",
  lentil: "🫘",
  groundnut: "🥜",
  sunflower: "🌻",
  coffee: "☕",
  tea: "🍵",
  rubber: "🌳",
  coconut: "🥥",
  banana: "🍌",
  mango: "🥭",
  apple: "🍎",
  grapes: "🍇",
  tomato: "🍅",
  potato: "🥔",
  onion: "🧅",
  garlic: "🧄",
  default: "🌿",
};

function showState(id) {
  ["resultCard", "loadingState", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

function clearErrors() {
  document.querySelectorAll("[id^='error-']").forEach(el => {
    el.classList.add("hidden");
    el.textContent = "";
  });
  document.getElementById("formErrors").classList.add("hidden");
}

function showError(fieldId, message) {
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
}

function validateInputs() {
  clearErrors();
  const errors = {};
  const t = window.__i18n || {};

  const nitrogen = document.getElementById("nitrogen").value.trim();
  const phosphorus = document.getElementById("phosphorus").value.trim();
  const potassium = document.getElementById("potassium").value.trim();
  const temperature = document.getElementById("temperature").value.trim();
  const humidity = document.getElementById("humidity").value.trim();
  const ph_level = document.getElementById("ph_level").value.trim();
  const rainfall = document.getElementById("rainfall").value.trim();

  if (!nitrogen || isNaN(nitrogen)) {
    errors.nitrogen = t["crop_error_nitrogen"] || "Nitrogen value required";
  }
  if (!phosphorus || isNaN(phosphorus)) {
    errors.phosphorus = t["crop_error_phosphorus"] || "Phosphorus value required";
  }
  if (!potassium || isNaN(potassium)) {
    errors.potassium = t["crop_error_potassium"] || "Potassium value required";
  }
  if (!temperature || isNaN(temperature)) {
    errors.temperature = t["crop_error_temperature"] || "Temperature value required";
  }
  if (!humidity || isNaN(humidity)) {
    errors.humidity = t["crop_error_humidity"] || "Humidity value required";
  }
  if (!ph_level || isNaN(ph_level)) {
    errors.ph_level = t["crop_error_ph_level"] || "pH value required";
  }
  if (!rainfall || isNaN(rainfall)) {
    errors.rainfall = t["crop_error_rainfall"] || "Rainfall value required";
  }

  return errors;
}

function displayErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    showError(field, message);
  });
}

function renderBilingualResult(data) {
  const lang = localStorage.getItem("lang") || "en";
  const englishData = data.english || {};
  const hindiData = data.hindi || {};

  // English result
  document.getElementById("resultIcon").textContent = 
    window.EMOJIS[englishData.recommended_crop?.toLowerCase()] || window.EMOJIS.default;
  document.getElementById("resultName").textContent = englishData.recommended_crop || "N/A";
  document.getElementById("resultAnalysis").textContent = englishData.analysis || "";
  const confPercent = parseFloat(englishData.confidence || 0);
  document.getElementById("resultConfText").textContent = confPercent + "%";

  // Render alternatives
  const alternatives = englishData.alternatives || [];
  let altHtml = "";
  if (alternatives.length > 0) {
    altHtml = "<div class='mt-3'><p class='text-xs font-semibold text-textMid mb-2'>Other Options:</p>";
    altHtml += "<div class='flex flex-wrap gap-2'>";
    alternatives.forEach(crop => {
      altHtml += `<span class='text-xs bg-primaryLight/20 text-primary px-3 py-1 rounded-full'>${crop}</span>`;
    });
    altHtml += "</div></div>";
  }
  document.getElementById("alternatives").innerHTML = altHtml;

  // Set confidence bar width
  setTimeout(() => {
    document.getElementById("resultBar").style.width = confPercent + "%";
  }, 100);

  showState("resultCard");
}

async function getCropRecommendation() {
  const btn = document.getElementById("recommendBtn");
  const btnText = document.getElementById("btnText");
  const t = window.__i18n || {};

  clearErrors();

  // Validate inputs
  const errors = validateInputs();
  if (Object.keys(errors).length > 0) {
    displayErrors(errors);
    return;
  }

  btn.disabled = true;
  btnText.textContent = t["crop_btn_analyzing"] || "Analyzing…";
  showState("loadingState");

  const userId = window._currentUserId;
  const lat = localStorage.getItem(`lat_${userId}`) || 0;
  const lon = localStorage.getItem(`lon_${userId}`) || 0;

  const payload = {
    nitrogen: parseFloat(document.getElementById("nitrogen").value),
    phosphorus: parseFloat(document.getElementById("phosphorus").value),
    potassium: parseFloat(document.getElementById("potassium").value),
    temperature: parseFloat(document.getElementById("temperature").value),
    humidity: parseFloat(document.getElementById("humidity").value),
    ph: parseFloat(document.getElementById("ph_level").value),
    rainfall: parseFloat(document.getElementById("rainfall").value),
    soil_type: document.getElementById("soil_type").value,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
  };

  try {
    const res = await fetch("/api/crop-recommendation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.status === "error") {
      if (data.errors) {
        displayErrors(data.errors);
      }
      document.getElementById("errorMsg").textContent =
        data.message || t["crop_error_no_result"] || "Unexpected error.";
      showState("errorState");
      return;
    }

    renderBilingualResult(data.data?.crop_recommendation || {});
  } catch (err) {
    console.error("Error:", err);
    document.getElementById("errorMsg").textContent =
      err.message || "Server error. Please try again.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btnText.textContent = t["crop_btn_analyze"] || "Get Crop Recommendation";
  }
}

function getCsrf() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.content;
  const c = document.cookie
    .split(";")
    .find((x) => x.trim().startsWith("csrftoken="));
  return c ? c.trim().split("=")[1] : "";
}
