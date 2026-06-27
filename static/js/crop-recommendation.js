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
  document.querySelectorAll("[id^='error-']").forEach((el) => {
    el.classList.add("hidden");
    el.textContent = "";
  });

  const formErrors = document.getElementById("formErrors");
  if (formErrors) {
    formErrors.classList.add("hidden");
    formErrors.textContent = "";
  }
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

  const soil_type = document.getElementById("soil_type").value.trim();
  const nitrogen = document.getElementById("nitrogen").value.trim();
  const phosphorus = document.getElementById("phosphorus").value.trim();
  const potassium = document.getElementById("potassium").value.trim();
  const temperature = document.getElementById("temperature").value.trim();
  const humidity = document.getElementById("humidity").value.trim();
  const ph_level = document.getElementById("ph_level").value.trim();
  const rainfall = document.getElementById("rainfall").value.trim();

<<<<<<< HEAD
  console.log("Validating inputs:", {soil_type, nitrogen, phosphorus, potassium, temperature, humidity, ph_level, rainfall});
=======
  console.log("Validating inputs:", {
    soil_type,
    nitrogen,
    phosphorus,
    potassium,
    temperature,
    humidity,
    ph_level,
    rainfall,
  });
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6

  if (!soil_type) {
    errors.soil_type = t["crop_error_soil_type"] || "Soil type is required";
  }
  if (!nitrogen || isNaN(nitrogen) || Number(nitrogen) < 0) {
    errors.nitrogen = t["crop_error_nitrogen"] || "Nitrogen value required";
  }
  if (!phosphorus || isNaN(phosphorus) || Number(phosphorus) < 0) {
<<<<<<< HEAD
    errors.phosphorus = t["crop_error_phosphorus"] || "Phosphorus value required";
=======
    errors.phosphorus =
      t["crop_error_phosphorus"] || "Phosphorus value required";
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  }
  if (!potassium || isNaN(potassium) || Number(potassium) < 0) {
    errors.potassium = t["crop_error_potassium"] || "Potassium value required";
  }
<<<<<<< HEAD
  if (!temperature || isNaN(temperature) || Number(temperature) < -20 || Number(temperature) > 60) {
    errors.temperature = t["crop_error_temperature"] || "Temperature value required";
  }
  if (!humidity || isNaN(humidity) || Number(humidity) < 0 || Number(humidity) > 100) {
    errors.humidity = t["crop_error_humidity"] || "Humidity value required";
  }
  if (!ph_level || isNaN(ph_level) || Number(ph_level) < 0 || Number(ph_level) > 14) {
=======
  if (
    !temperature ||
    isNaN(temperature) ||
    Number(temperature) < -20 ||
    Number(temperature) > 60
  ) {
    errors.temperature =
      t["crop_error_temperature"] || "Temperature value required";
  }
  if (
    !humidity ||
    isNaN(humidity) ||
    Number(humidity) < 0 ||
    Number(humidity) > 100
  ) {
    errors.humidity = t["crop_error_humidity"] || "Humidity value required";
  }
  if (
    !ph_level ||
    isNaN(ph_level) ||
    Number(ph_level) < 0 ||
    Number(ph_level) > 14
  ) {
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    errors.ph_level = t["crop_error_ph_level"] || "pH value required";
  }
  if (!rainfall || isNaN(rainfall) || Number(rainfall) < 0) {
    errors.rainfall = t["crop_error_rainfall"] || "Rainfall value required";
  }

<<<<<<< HEAD
  console.log("Validation errors:", Object.keys(errors).length > 0 ? errors : "None");
=======
  console.log(
    "Validation errors:",
    Object.keys(errors).length > 0 ? errors : "None",
  );
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  return errors;
}

function displayErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const id = field === "ph" ? "ph_level" : field;
    showError(id, message);
  });

  const formErrors = document.getElementById("formErrors");
  const summary = Object.values(errors).join(". ");
  if (formErrors && summary) {
    formErrors.textContent = summary;
    formErrors.classList.remove("hidden");
  }
}

function renderAlternatives(alternatives) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return "";
  }

<<<<<<< HEAD
  let html = "<div class='mt-3'><p class='text-xs font-semibold text-textMid mb-2'>Other Options:</p><div class='flex flex-wrap gap-2'>";
=======
  let html =
    "<div class='mt-3'><p class='text-xs font-semibold text-textMid mb-2'>Other Options:</p><div class='flex flex-wrap gap-2'>";
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  alternatives.forEach((crop) => {
    html += `<span class='text-xs bg-primaryLight/20 text-primary px-3 py-1 rounded-full'>${crop}</span>`;
  });
  html += "</div></div>";
  return html;
}

function renderBilingualResult(data) {
  console.log("renderBilingualResult called with data:", data);
<<<<<<< HEAD
  
  const lang = (window.currentLang || localStorage.getItem("lang") || "en").toLowerCase();
  console.log("Current language:", lang);
  
=======

  const lang = (
    window.currentLang ||
    localStorage.getItem("lang") ||
    "en"
  ).toLowerCase();
  console.log("Current language:", lang);

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  const englishData = data.english || {};
  const hindiData = data.hindi || {};
  const selectedData = lang === "hi" ? hindiData : englishData;

  console.log("Selected data for rendering:", selectedData);

  const iconCrop = selectedData.recommended_crop?.toLowerCase() || "";
  const emoji = window.EMOJIS[iconCrop] || window.EMOJIS.default;
  const confPercent = parseFloat(selectedData.confidence || 0);

<<<<<<< HEAD
  console.log("Icon crop:", iconCrop, "Emoji:", emoji, "Confidence:", confPercent);

  document.getElementById("resultIcon").textContent = emoji;
  document.getElementById("resultName").textContent = selectedData.recommended_crop || "N/A";
  document.getElementById("resultAnalysis").textContent = selectedData.analysis || "";
  document.getElementById("resultConfText").textContent = confPercent + "%";
  document.getElementById("alternatives").innerHTML = renderAlternatives(selectedData.alternatives || englishData.alternatives || []);
=======
  console.log(
    "Icon crop:",
    iconCrop,
    "Emoji:",
    emoji,
    "Confidence:",
    confPercent,
  );

  document.getElementById("resultIcon").textContent = emoji;
  document.getElementById("resultName").textContent =
    selectedData.recommended_crop || "N/A";
  document.getElementById("resultAnalysis").textContent =
    selectedData.analysis || "";
  document.getElementById("resultConfText").textContent = confPercent + "%";
  document.getElementById("alternatives").innerHTML = renderAlternatives(
    selectedData.alternatives || englishData.alternatives || [],
  );
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  document.getElementById("resultBar").style.width = confPercent + "%";

  const englishSection = document.getElementById("resultEnglish");
  const hindiSection = document.getElementById("resultHindi");
  if (lang === "hi") {
    englishSection.classList.add("hidden");
    hindiSection.classList.remove("hidden");
    document.getElementById("resultIconHi").textContent = emoji;
<<<<<<< HEAD
    document.getElementById("resultNameHi").textContent = selectedData.recommended_crop || "N/A";
    document.getElementById("resultAnalysisHi").textContent = selectedData.analysis || "";
    document.getElementById("resultConfTextHi").textContent = confPercent + "%";
    document.getElementById("alternativesHi").innerHTML = renderAlternatives(selectedData.alternatives || englishData.alternatives || []);
=======
    document.getElementById("resultNameHi").textContent =
      selectedData.recommended_crop || "N/A";
    document.getElementById("resultAnalysisHi").textContent =
      selectedData.analysis || "";
    document.getElementById("resultConfTextHi").textContent = confPercent + "%";
    document.getElementById("alternativesHi").innerHTML = renderAlternatives(
      selectedData.alternatives || englishData.alternatives || [],
    );
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    document.getElementById("resultBarHi").style.width = confPercent + "%";
  } else {
    englishSection.classList.remove("hidden");
    hindiSection.classList.add("hidden");
  }

  console.log("Result rendering complete");
  showState("resultCard");
}

async function getCropRecommendation() {
  const btn = document.getElementById("recommendBtn");
  const btnText = document.getElementById("btnText");
  const t = window.__i18n || {};

  clearErrors();

  const errors = validateInputs();
  if (Object.keys(errors).length > 0) {
    displayErrors(errors);
    return;
  }

  btn.disabled = true;
  btnText.textContent = t["crop_btn_analyzing"] || "Analyzing…";
  showState("loadingState");

  const userId = window._currentUserId;
  const lat = parseFloat(localStorage.getItem(`lat_${userId}`) || 0);
  const lon = parseFloat(localStorage.getItem(`lon_${userId}`) || 0);

  const nitrogenValue = parseFloat(document.getElementById("nitrogen").value);
<<<<<<< HEAD
  const phosphorusValue = parseFloat(document.getElementById("phosphorus").value);
  const potassiumValue = parseFloat(document.getElementById("potassium").value);
  const temperatureValue = parseFloat(document.getElementById("temperature").value);
=======
  const phosphorusValue = parseFloat(
    document.getElementById("phosphorus").value,
  );
  const potassiumValue = parseFloat(document.getElementById("potassium").value);
  const temperatureValue = parseFloat(
    document.getElementById("temperature").value,
  );
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  const humidityValue = parseFloat(document.getElementById("humidity").value);
  const phValue = parseFloat(document.getElementById("ph_level").value);
  const rainfallValue = parseFloat(document.getElementById("rainfall").value);

<<<<<<< HEAD
  if ([nitrogenValue, phosphorusValue, potassiumValue, temperatureValue, humidityValue, phValue, rainfallValue].some(v => isNaN(v))) {
    console.error("Invalid numeric values detected");
    document.getElementById("errorMsg").textContent = "Invalid input values. Please check your entries.";
=======
  if (
    [
      nitrogenValue,
      phosphorusValue,
      potassiumValue,
      temperatureValue,
      humidityValue,
      phValue,
      rainfallValue,
    ].some((v) => isNaN(v))
  ) {
    console.error("Invalid numeric values detected");
    document.getElementById("errorMsg").textContent =
      "Invalid input values. Please check your entries.";
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    showState("errorState");
    btn.disabled = false;
    btnText.textContent = t["crop_btn_analyze"] || "Get Crop Recommendation";
    return;
  }

  const payload = {
    soil_type: document.getElementById("soil_type").value.trim(),
    nitrogen: nitrogenValue,
    phosphorus: phosphorusValue,
    potassium: potassiumValue,
    temperature: temperatureValue,
    humidity: humidityValue,
    ph: phValue,
    rainfall: rainfallValue,
    latitude: lat,
    longitude: lon,
  };

<<<<<<< HEAD
  console.log("Sending crop recommendation request:", payload);

  try {
    console.log("Fetching /api/crop-recommendation with payload:", JSON.stringify(payload));
    
=======
  // ...existing code...

  try {
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    const res = await fetch("/api/crop-recommendation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
<<<<<<< HEAD
        "Accept": "application/json",
=======
        Accept: "application/json",
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
      },
      body: JSON.stringify(payload),
    });

<<<<<<< HEAD
    console.log("Response status:", res.status, res.statusText);

    let data;
    try {
      const text = await res.text();
      console.log("Response text:", text);
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "response text was:", text);
      throw new Error("Invalid response format from server");
    }

    console.log("Response data:", data);

    if (!res.ok) {
      console.error("Request failed with status:", res.status);
      if (data.errors) {
        displayErrors(data.errors);
      }
      document.getElementById("errorMsg").textContent =
        data.message || `Server error (${res.status})`;
      showState("errorState");
      return;
    }

    if (data.status === "error") {
      console.error("API returned error:", data);
      if (data.errors) {
        displayErrors(data.errors);
      }
      document.getElementById("errorMsg").textContent =
        data.message || t["crop_error_no_result"] || "Prediction failed";
      showState("errorState");
      return;
    }

    console.log("Rendering result:", data.data?.crop_recommendation);
=======
    let data;
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      throw new Error("Invalid response format from server");
    }

    if (!res.ok) {
      if (data.errors) {
        displayErrors(data.errors);
      }
      document.getElementById("errorMsg").textContent =
        data.message || `Server error (${res.status})`;
      showState("errorState");
      return;
    }

    if (data.status === "error") {
      if (data.errors) {
        displayErrors(data.errors);
      }
      document.getElementById("errorMsg").textContent =
        data.message || t["crop_error_no_result"] || "Prediction failed";
      showState("errorState");
      return;
    }

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    renderBilingualResult(data.data?.crop_recommendation || {});
    await loadCropRecommendationHistory();
  } catch (err) {
    console.error("Fetch error:", err, err.stack);
    document.getElementById("errorMsg").textContent =
      err.message || "Network error. Please try again.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btnText.textContent = t["crop_btn_analyze"] || "Get Crop Recommendation";
  }
}

async function loadCropRecommendationHistory() {
  const historySection = document.getElementById("historySection");
  const historyList = document.getElementById("historyList");
  if (!historySection || !historyList) {
    console.warn("History section or list not found");
    return;
  }

  historySection.classList.add("hidden");
  historyList.innerHTML = "";

  try {
    console.log("Fetching crop recommendation history");
    const res = await fetch("/api/crop-recommendation/history");
<<<<<<< HEAD
    
    console.log("History response status:", res.status);
    
=======

    console.log("History response status:", res.status);

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    if (!res.ok) {
      console.warn("History fetch failed with status:", res.status);
      return;
    }
<<<<<<< HEAD
    
    const text = await res.text();
    console.log("History response text:", text);
    
=======

    const text = await res.text();
    console.log("History response text:", text);

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    if (!text) {
      console.warn("Empty response from history endpoint");
      return;
    }
<<<<<<< HEAD
    
    const data = JSON.parse(text);
    console.log("History data:", data);
    
=======

    const data = JSON.parse(text);
    console.log("History data:", data);

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    if (data.status !== "success" || !Array.isArray(data.data?.history)) {
      console.warn("Invalid history response structure");
      return;
    }

    const entries = data.data.history;
    if (!entries.length) {
      console.log("No history entries");
      return;
    }

    console.log("Rendering", entries.length, "history entries");
    historySection.classList.remove("hidden");
    historyList.innerHTML = entries
      .map((entry) => {
        return `
          <div class="rounded-xl border border-backgroundDark p-4 bg-slate-50">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm text-textMid">${entry.created_at || ""}</p>
                <p class="text-base font-semibold text-textDark">${entry.recommended_crop}</p>
              </div>
              <span class="text-sm font-semibold text-primary">${entry.confidence}%</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3 text-xs text-textLight">
              <div><strong>Soil:</strong> ${entry.soil_type || "-"}</div>
              <div><strong>pH:</strong> ${entry.ph}</div>
              <div><strong>Temp:</strong> ${entry.temperature}°C</div>
              <div><strong>Rain:</strong> ${entry.rainfall}mm</div>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
<<<<<<< HEAD
    console.error("Failed to load crop recommendation history:", err, err.stack);
  }
}

window.getCsrf = function() {
=======
    console.error(
      "Failed to load crop recommendation history:",
      err,
      err.stack,
    );
  }
}

window.getCsrf = function () {
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.content;
  const c = document.cookie
    .split(";")
    .find((x) => x.trim().startsWith("csrftoken="));
  return c ? c.trim().split("=")[1] : "";
};

if (typeof window._cropRecommendationInitialized === "undefined") {
  window._cropRecommendationInitialized = true;
<<<<<<< HEAD
  
  window.addEventListener("DOMContentLoaded", function() {
    console.log("Crop recommendation initialized");
    
    const btn = document.getElementById("recommendBtn");
    if (btn) {
      btn.addEventListener("click", function(e) {
=======

  window.addEventListener("DOMContentLoaded", function () {
    console.log("Crop recommendation initialized");

    const btn = document.getElementById("recommendBtn");
    if (btn) {
      btn.addEventListener("click", function (e) {
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
        e.preventDefault();
        e.stopPropagation();
        console.log("Button clicked, calling getCropRecommendation");
        getCropRecommendation();
      });
    }
<<<<<<< HEAD
    
=======

>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    loadCropRecommendationHistory();
  });
}
