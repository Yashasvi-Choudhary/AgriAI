const EMOJIS = {
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
  ["emptyState", "loadingState", "resultCard", "errorState"].forEach((s) =>
    document.getElementById(s).classList.add("hidden"),
  );
  document.getElementById(id).classList.remove("hidden");
}

function renderResult(crop) {
  const name = crop.name || crop.crop || "Unknown";
  const conf = parseFloat(crop.confidence || crop.score || 0);
  const desc = crop.description || crop.reason || crop.details || "";
  const emoji = EMOJIS[name.toLowerCase()] || EMOJIS.default;

  document.getElementById("resultIcon").textContent = emoji;
  document.getElementById("resultName").textContent = name;
  document.getElementById("resultDesc").textContent = desc;
  document.getElementById("resultConfBadge").textContent = conf + "%";
  document.getElementById("resultConfText").textContent = conf + "%";

  showState("resultCard");
  setTimeout(() => {
    document.getElementById("resultBar").style.width = conf + "%";
  }, 120);
}

async function getCropRecommendation() {
  const btn = document.getElementById("recommendBtn");
  const btnText = document.getElementById("btnText");
  const t = window.__i18n || {};

  const payload = {
    soil_type: document.getElementById("soil_type").value,
    ph_level: document.getElementById("ph_level").value,
    temperature: document.getElementById("temperature").value,
    humidity: document.getElementById("humidity").value,
    rainfall: document.getElementById("rainfall").value,
    soil_moisture: document.getElementById("soil_moisture").value,
    nitrogen: document.getElementById("nitrogen").value,
    phosphorus: document.getElementById("phosphorus").value,
    potassium: document.getElementById("potassium").value,
    latitude: document.getElementById("latitude").value,
    longitude: document.getElementById("longitude").value,
  };

  if (!payload.soil_type) {
    alert(
      t["crop_alert_soil"] || "Please select a soil type before proceeding.",
    );
    return;
  }

  btn.disabled = true;
  btn.style.opacity = "0.7";
  btnText.textContent = t["crop_btn_analyzing"] || "Analyzing…";
  showState("loadingState");

  try {
    const res = await fetch("/api/crop-recommendation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrf(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Server error " + res.status);

    const data = await res.json();
    const crops =
      data.crops ||
      data.recommendations ||
      data.results ||
      (Array.isArray(data) ? data : null);

    if (!crops || !crops.length)
      throw new Error(
        t["crop_error_no_result"] || "No recommendations received.",
      );

    renderResult(crops[0]);
  } catch (err) {
    document.getElementById("errorMsg").textContent =
      err.message || "Unexpected error.";
    showState("errorState");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "1";
    btnText.textContent =
      (window.__i18n || {})["crop_btn_analyze"] || "Get Crop Recommendation";
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
