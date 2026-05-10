/**
 * Government Schemes JavaScript
 * Handles fetching, filtering, and rendering of government schemes
 */

let allSchemes = [];
let filteredSchemes = [];

/**
 * Initialize the page - fetch schemes and set up UI
 */
async function initPage() {
  applyLang();
  await fetchSchemes();
  renderSchemes(allSchemes);
}

/**
 * Fetch all government schemes from API
 */
async function fetchSchemes() {
  try {
    showLoadingState();

    const response = await fetch("/api/schemes");

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.schemes) {
      allSchemes = data.schemes;
      filteredSchemes = [...allSchemes];
      console.log(`✓ Fetched ${allSchemes.length} government schemes`);
    } else {
      throw new Error("Invalid API response");
    }
  } catch (error) {
    console.error("❌ Error fetching schemes:", error);
    showErrorState("Error loading government schemes. Please try again.");
  }
}

/**
 * Apply filters based on state, crop type, and search
 */
async function applyFilters() {
  const state = document.getElementById("stateFilter")?.value.trim() || "";
  const crop = document.getElementById("cropFilter")?.value.trim() || "";
  const search =
    document.getElementById("searchBox")?.value.trim().toLowerCase() || "";

  try {
    showLoadingState();

    // Build query parameters
    const params = new URLSearchParams();
    if (state && state !== "") {
      params.append("state", state);
    }
    if (crop && crop !== "") {
      params.append("crop_type", crop);
    }

    // Fetch filtered data from API
    const response = await fetch(`/api/schemes?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success" && data.schemes) {
      // Apply local search filter
      filteredSchemes = data.schemes.filter((scheme) => {
        if (!search) return true;

        // Helper function to get multilingual text for search
        const getSearchText = (field) => {
          if (typeof field === "object" && field !== null) {
            return (field.en || "") + " " + (field.hi || "");
          }
          return field || "";
        };

        const searchableText = (
          getSearchText(scheme.title) +
          " " +
          getSearchText(scheme.description) +
          " " +
          getSearchText(scheme.benefit)
        ).toLowerCase();

        return searchableText.includes(search);
      });

      renderSchemes(filteredSchemes);
    } else {
      throw new Error("Invalid API response");
    }
  } catch (error) {
    console.error("❌ Error applying filters:", error);
    showErrorState("Error filtering schemes. Please try again.");
  }
}

/**
 * Render scheme cards to the grid
 */
function renderSchemes(schemes) {
  const grid = document.getElementById("schemesGrid");

  if (!schemes || schemes.length === 0) {
    hideAllStates();
    document.getElementById("emptyState").classList.remove("hidden");
    return;
  }

  hideAllStates();
  grid.classList.remove("hidden");

  grid.innerHTML = schemes.map((scheme) => createSchemeCard(scheme)).join("");
}

/**
 * Create HTML for a single scheme card
 */
function createSchemeCard(scheme) {
  const translations = window.__i18n || {};
  const currentLang =
    window.currentLang || localStorage.getItem("lang") || "en";

  // Helper function to get multilingual text
  const getText = (field) => {
    if (typeof field === "object" && field !== null) {
      return field[currentLang] || field.en || "";
    }
    return field || "";
  };

  // Helper function to get translation
  const t = (key, fallback) => {
    return translations[key] || fallback || key;
  };

  return `
    <div class="bg-white rounded-xl border border-backgroundDark p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
      <!-- Header -->
      <div class="mb-4 pb-4 border-b border-backgroundDark">
        <h3 class="text-base font-bold text-textDark leading-tight mb-2 line-clamp-2">
          ${escapeHtml(getText(scheme.title))}
        </h3>
        <div class="flex flex-wrap gap-2">
          ${
            scheme.state && scheme.state !== "All"
              ? `
            <span class="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              ${escapeHtml(scheme.state)}
            </span>
          `
              : `
            <span class="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              National
            </span>
          `
          }
          ${
            getText(scheme.crop_type) && getText(scheme.crop_type) !== "All"
              ? `
            <span class="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              ${escapeHtml(getText(scheme.crop_type))}
            </span>
          `
              : ""
          }
        </div>
      </div>
      
      <!-- Description -->
      <p class="text-sm text-textMid mb-4 leading-relaxed line-clamp-3">
        ${escapeHtml(getText(scheme.description))}
      </p>
      
      <!-- Benefit -->
      <div class="mb-4 p-3 bg-primaryLight/10 rounded-lg border border-primaryLight/20">
        <p class="text-xs font-semibold text-primary mb-1">${t("govt_schemes_benefit_label", "Benefit")}</p>
        <p class="text-sm text-textDark font-medium">
          ${escapeHtml(getText(scheme.benefit))}
        </p>
      </div>
      
      <!-- Eligibility -->
      <div class="mb-4">
        <p class="text-xs font-semibold text-textMid mb-1 uppercase">${t("govt_schemes_eligibility_label", "Eligibility")}</p>
        <p class="text-sm text-textDark">
          ${escapeHtml(getText(scheme.eligibility))}
        </p>
      </div>
      
      <!-- Footer with button -->
      <div class="mt-auto pt-4 border-t border-backgroundDark">
        <a
          href="${escapeHtml(scheme.website_link)}"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-primary to-primaryDark px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>${t("govt_schemes_apply_now", "Apply Now")}</span>
        </a>
      </div>
    </div>
  `;
}

/**
 * Hide all state divs (loading, grid, empty, error)
 */
function hideAllStates() {
  document.getElementById("loadingState")?.classList.add("hidden");
  document.getElementById("schemesGrid")?.classList.add("hidden");
  document.getElementById("emptyState")?.classList.add("hidden");
  document.getElementById("errorState")?.classList.add("hidden");
}

/**
 * Show loading state
 */
function showLoadingState() {
  hideAllStates();
  document.getElementById("loadingState")?.classList.remove("hidden");
}

/**
 * Show error state with message
 */
function showErrorState(message) {
  hideAllStates();
  document.getElementById("errorState")?.classList.remove("hidden");
  const errorMsg = document.getElementById("errorMsg");
  if (errorMsg) {
    errorMsg.textContent = message;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Close scheme details modal
 */
function closeSchemeModal() {
  document.getElementById("schemeModal")?.classList.add("hidden");
}

/**
 * Initialize on page load
 */
document.addEventListener("DOMContentLoaded", () => {
  initPage();
});
