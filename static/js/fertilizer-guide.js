// ...existing code...

if (!window.__fertilizerGuideInitialized) {
  window.__fertilizerGuideInitialized = true;

  // page language
  if (typeof pageLang === "undefined") {
    const pageLang = window.__lang || localStorage.getItem("lang") || "en";
    window.pageLang = pageLang;
  }

  // original button text
  if (typeof originalButtonText === "undefined") {
    const originalButtonText =
      document.getElementById("fertBtnText")?.textContent ||
      "Get Fertilizer Recommendation";
    window.originalButtonText = originalButtonText;
  }

  // simple messages
  if (typeof window.fertilizerMessages === "undefined") {
    window.fertilizerMessages = {
      invalid: {
        en: "Please enter valid values for crop, soil, and nutrients.",
        hi: "कृपया फसल, मिट्टी, और पोषक तत्वों के लिए मान्य मान दर्ज करें।",
      },
      apiError: {
        en: "Unable to fetch recommendation. Try again.",
        hi: "सुझाव प्राप्त करने में असमर्थ। कृपया पुनः प्रयास करें।",
      },
    };
  }

  const messages = window.fertilizerMessages;

  function setViewState(state) {
    const states = [
      "emptyState",
      "loadingState",
      "errorState",
      "resultDashboard",
    ];
    states.forEach((id) =>
      document.getElementById(id)?.classList.add("hidden"),
    );
    document.getElementById(state)?.classList.remove("hidden");
  }

  function setButtonLoading(isLoading) {
    const button = document.getElementById("fertBtn");
    const spinner = document.getElementById("fertSpinner");
    const btnText = document.getElementById("fertBtnText");

    if (!button || !spinner || !btnText) return;

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

    setViewState("resultDashboard");
    setButtonLoading(false); // Allow user to interact again
    loadFertilizerHistory();
  }

  function getTranslation(key, fallback) {
    return (window.__i18n && window.__i18n[key]) || fallback;
  }

  function renderHistoryItem(item) {
    try {
      const fertilizerName =
        pageLang === "hi"
          ? item.fertilizer_name_hi || item.fertilizer_name_en
          : item.fertilizer_name_en;

      // compact left/right layout: left = crop/soil + NPK, right = (delete top-right + recommended)
      return `
    <div class="rounded-2xl border border-backgroundDark p-4 bg-slate-50">
      <div class="flex items-start justify-between gap-4">

        <div class="flex items-start gap-6">
          <div>
            <p class="text-xs text-textMid">${getTranslation("fert_history_crop_label", "Crop")}</p>
            <p class="mt-1 text-sm font-semibold text-textDark">${item.crop_type}</p>
            <p class="text-xs text-textMid mt-2">${getTranslation("fert_history_soil_label", "Soil")}</p>
            <p class="mt-1 text-sm text-textDark">${item.soil_type}</p>
          </div>

          <div>
           
            <div class="flex gap-2 mt-2">
              <div class="rounded-2xl border border-backgroundDark bg-white px-3 py-2 text-center w-14">
                <p class="text-[10px] uppercase text-textMid">N</p>
                <p class="mt-1 text-sm font-semibold text-textDark">${item.nitrogen}</p>
              </div>
              <div class="rounded-2xl border border-backgroundDark bg-white px-3 py-2 text-center w-14">
                <p class="text-[10px] uppercase text-textMid">P</p>
                <p class="mt-1 text-sm font-semibold text-textDark">${item.phosphorus}</p>
              </div>
              <div class="rounded-2xl border border-backgroundDark bg-white px-3 py-2 text-center w-14">
                <p class="text-[10px] uppercase text-textMid">K</p>
                <p class="mt-1 text-sm font-semibold text-textDark">${item.potassium}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-end flex-shrink-0">
          <button type="button" class="fertHistoryDelete mb-2 rounded-full p-2 text-textLight hover:text-red-600 transition-colors" data-record-id="${item.id}" aria-label="${getTranslation("fert_history_delete", "Delete")}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>

          <p class="text-xs text-textMid">${getTranslation("fert_history_recommended_label", "Recommended")}</p>
          <div class="mt-2 inline-block bg-gradient-to-br from-primaryLight to-primary text-white rounded-full px-4 py-2 font-semibold">
            ${fertilizerName}
          </div>
        </div>

      </div>
    </div>
  `;
    } catch (err) {
      console.error("Error rendering history item:", err, item);
      return "";
    }
  }

  function setHistoryPanel(records) {
    const historyPanel = document.getElementById("fertHistoryPanel");
    const historyList = document.getElementById("fertHistoryList");
    const noRecords = document.getElementById("fertHistoryEmpty");
    const label = document.getElementById("fertHistoryToggleLabel");

    if (!historyPanel || !historyList || !noRecords || !label) return;

    historyList.innerHTML = "";
    noRecords.classList.add("hidden");

    if (!records || records.length === 0) {
      historyPanel.classList.add("hidden");
      label.textContent = getTranslation("fert_history_show", "Show History");
      noRecords.classList.remove("hidden");
      return;
    }

    historyList.innerHTML = records.map(renderHistoryItem).join("");
    historyPanel.classList.remove("hidden");
    label.textContent = getTranslation("fert_history_hide", "Hide History");
  }

  async function loadFertilizerHistory() {
    try {
      const response = await fetch("/api/fertilizer/history");
      if (!response.ok) return setHistoryPanel([]);
      const data = await response.json().catch(() => ({}));
      if (data.status !== "success") return setHistoryPanel([]);
      setHistoryPanel(data.history || []);
    } catch (err) {
      // Optionally log error in dev only
      setHistoryPanel([]);
    }
  }

  async function deleteFertilizerHistory(recordId) {
    try {
      const response = await fetch(`/api/fertilizer/history/${recordId}`, {
        method: "DELETE",
      });
      return response.ok;
    } catch (err) {
      console.error("Failed to delete fertilizer history:", err);
      return false;
    }
  }

  function handleHistoryDeleteClick(event) {
    const button = event.target.closest(".fertHistoryDelete");
    if (!button) return;
    const recordId = button.dataset.recordId;
    if (!recordId) return;

    deleteFertilizerHistory(recordId).then((success) => {
      if (success) loadFertilizerHistory();
    });
  }

  function toggleHistoryPanel() {
    const panel = document.getElementById("fertHistoryPanel");
    const label = document.getElementById("fertHistoryToggleLabel");
    if (!panel || !label) return;
    const isHidden = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    label.textContent = isHidden
      ? getTranslation("fert_history_hide", "Hide History")
      : getTranslation("fert_history_show", "Show History");
  }

  function attachHistoryEvents() {
    const toggle = document.getElementById("fertHistoryToggle");
    if (toggle) toggle.addEventListener("click", toggleHistoryPanel);
    document.addEventListener("click", handleHistoryDeleteClick);
  }

  function getFertilizerRecommendation() {
    setViewState("emptyState");
    setButtonLoading(true);

    const cropType = document.getElementById("crop_type").value;
    const soilType = document.getElementById("soil_type").value;
    const temperature = parseFloat(
      document.getElementById("temperature").value || "",
    );
    const humidity = parseFloat(
      document.getElementById("humidity").value || "",
    );
    const moisture = parseFloat(
      document.getElementById("soil_moisture").value || "",
    );
    const nitrogen = parseFloat(
      document.getElementById("nitrogen").value || "",
    );
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body || body.status !== "success")
          throw new Error(body?.message || messages.apiError[pageLang]);
        return body;
      })
      .then((body) => {
        updateNutrientAnalysis(nitrogen, phosphorus, potassium);
        renderResult(body);
      })
      .catch((err) => {
        setError(err.message || messages.apiError[pageLang]);
        setButtonLoading(false); // Always reset button on error
      });
  }

  window.getFertilizerRecommendation = getFertilizerRecommendation;

  document.addEventListener("DOMContentLoaded", () => {
    const fertilizerBtn = document.getElementById("fertBtn");
    if (fertilizerBtn)
      fertilizerBtn.addEventListener("click", getFertilizerRecommendation);
    attachHistoryEvents();
    loadFertilizerHistory();
  });
}
