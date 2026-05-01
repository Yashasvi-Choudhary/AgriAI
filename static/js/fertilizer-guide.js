console.log("fertilizer-guide.js loaded");
const pageLang = window.__lang || localStorage.getItem("lang") || "en";
const originalButtonText =
  document.getElementById("fertBtnText")?.textContent ||
  "Get Fertilizer Recommendation";

const messages = {
  invalid: {
    en: "Please enter valid values for crop, soil, and nutrients.",
    hi: "कृपया फसल, मिट्टी, और पोषक तत्वों के लिए मान्य मान दर्ज करें।",
  },
  apiError: {
    en: "Unable to fetch recommendation. Try again.",
    hi: "सुझाव प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।",
  },
};

const scheduleItems = {
  en: [
    { title: "Sowing Stage", detail: "At the time of sowing" },
    { title: "Growth Stage", detail: "30–45 days after sowing" },
    { title: "Pre-Harvest", detail: "15 days before harvest" },
  ],
  hi: [
    { title: "बुवाई अवस्था", detail: "बुवाई के समय" },
    { title: "वृद्धि अवस्था", detail: "बुवाई के 30–45 दिन बाद" },
    { title: "कटाई से पहले", detail: "कटाई से 15 दिन पहले" },
  ],
};

const tipsItems = {
  en: [
    "Always conduct a soil test before applying fertilizers.",
    "Apply fertilizers in the early morning or evening.",
    "Avoid applying fertilizers before heavy rain.",
    "Use organic compost alongside chemical fertilizers.",
  ],
  hi: [
    "उर्वरक लगाने से पहले हमेशा मिट्टी परीक्षण करें।",
    "उर्वरक सुबह या शाम को लगाएं।",
    "भारी बारिश से पहले उर्वरक लागू करने से बचें।",
    "रासायनिक उर्वरकों के साथ जैविक खाद का उपयोग करें।",
  ],
};

function setViewState(state) {
  const states = [
    "emptyState",
    "loadingState",
    "errorState",
    "resultDashboard",
  ];
  states.forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(state).classList.remove("hidden");
}

function setButtonLoading(isLoading) {
  const button = document.getElementById("fertBtn");
  const spinner = document.getElementById("fertSpinner");
  const btnText = document.getElementById("fertBtnText");

  if (isLoading) {
    button.disabled = true;
    spinner.classList.remove("hidden");
    btnText.textContent = "";
  } else {
    button.disabled = false;
    spinner.classList.add("hidden");
    btnText.textContent = originalButtonText;
  }
}

function setError(message) {
  document.getElementById("errorMsg").textContent = message;
  setViewState("errorState");
  setButtonLoading(false);
}

function updateNutrientAnalysis(n, p, k) {
  const labels = {
    low: pageLang === "hi" ? "कम" : "Low",
    medium: pageLang === "hi" ? "मध्यम" : "Medium",
    high: pageLang === "hi" ? "उच्च" : "High",
  };

  function getLevel(value) {
    if (value < 15) return labels.low;
    if (value <= 35) return labels.medium;
    return labels.high;
  }

  const analysis = [
    { name: "N", value: n, label: getLevel(n) },
    { name: "P", value: p, label: getLevel(p) },
    { name: "K", value: k, label: getLevel(k) },
  ];

  document.getElementById("nutrientAnalysis").innerHTML = analysis
    .map(
      (item) =>
        `<div class="rounded-2xl border border-backgroundDark p-4 text-center"><p class="text-sm font-semibold text-textDark">${item.name}</p><p class="mt-2 text-3xl font-bold text-textDark">${item.value}</p><p class="mt-1 text-xs text-textLight">${item.label}</p></div>`,
    )
    .join("");
}

function renderResult(data) {
  const rec =
    data.data.fertilizer_recommendation[pageLang] ||
    data.data.fertilizer_recommendation.english;
  const recommendationsList = document.getElementById("recommendationsList");

  recommendationsList.innerHTML = `
    <div class="rounded-2xl border border-backgroundDark p-5 bg-slate-50">
      <p class="text-2xl font-semibold text-textDark">${rec.fertilizer_name}</p>
      <p class="mt-2 text-sm text-textMid">${rec.recommended_quantity}</p>
      <p class="mt-4 text-sm text-textDark">${rec.reason}</p>
      <p class="mt-3 text-sm text-textLight">${rec.additional_advice}</p>
    </div>
  `;

  document.getElementById("scheduleList").innerHTML = scheduleItems[pageLang]
    .map(
      (item) =>
        `<div class="rounded-2xl bg-slate-50 border border-backgroundDark p-4"><p class="text-sm font-semibold text-textDark">${item.title}</p><p class="mt-1 text-xs text-textLight">${item.detail}</p></div>`,
    )
    .join("");

  document.getElementById("tipsList").innerHTML = tipsItems[pageLang]
    .map((tip) => `<li class="text-sm text-textLight">• ${tip}</li>`)
    .join("");

  setViewState("resultDashboard");
}

function getFertilizerRecommendation() {
  setViewState("emptyState");
  setButtonLoading(true);

  const cropType = document.getElementById("crop_type").value;
  const soilType = document.getElementById("soil_type").value;
  const temperature = parseFloat(
    document.getElementById("temperature").value || "",
  );
  const humidity = parseFloat(document.getElementById("humidity").value || "");
  const moisture = parseFloat(
    document.getElementById("soil_moisture").value || "",
  );
  const nitrogen = parseFloat(document.getElementById("nitrogen").value || "");
  const phosphorus = parseFloat(
    document.getElementById("phosphorus").value || "",
  );
  const potassium = parseFloat(
    document.getElementById("potassium").value || "",
  );

  if (
    !cropType ||
    !soilType ||
    Number.isNaN(nitrogen) ||
    Number.isNaN(phosphorus) ||
    Number.isNaN(potassium)
  ) {
    setError(messages.invalid[pageLang]);
    return;
  }

  const payload = {
    crop_type: cropType,
    soil_type: soilType,
    temperature: Number.isNaN(temperature) ? 25 : temperature,
    humidity: Number.isNaN(humidity) ? 50 : humidity,
    moisture: Number.isNaN(moisture) ? 40 : moisture,
    nitrogen,
    phosphorus,
    potassium,
  };

  setViewState("loadingState");

  fetch("/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.status !== "success") {
        const message = body?.message || messages.apiError[pageLang];
        throw new Error(message);
      }
      return body;
    })
    .then((body) => {
      updateNutrientAnalysis(nitrogen, phosphorus, potassium);
      renderResult(body);
    })
    .catch((err) => {
      setError(err.message || messages.apiError[pageLang]);
    });
}

window.getFertilizerRecommendation = getFertilizerRecommendation;

document.addEventListener("DOMContentLoaded", () => {
  const fertilizerBtn = document.getElementById("fertBtn");
  if (fertilizerBtn) {
    fertilizerBtn.addEventListener("click", getFertilizerRecommendation);
  }
});
