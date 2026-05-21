function clearProfitErrors() {
  document.querySelectorAll('#profitForm [id^="error-"]').forEach((el) => {
    el.classList.add('hidden');
    el.textContent = '';
  });
}

function showProfitError(field, message) {
  const errorEl = document.getElementById(`error-${field}`);
  if (!errorEl) return;
  errorEl.textContent = t(message, message);
  errorEl.classList.remove('hidden');
}

function renderProfitHistory(history) {
  const wrapper = document.getElementById('profitHistoryWrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  if (!Array.isArray(history) || history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-sm text-textMid';
    empty.textContent = t('profit_analysis_no_history', 'No history found');
    wrapper.appendChild(empty);
    return;
  }

  history.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'rounded-lg border border-backgroundDark p-4 bg-surface';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-textMid">${t('profit_history_crop', 'Crop')}</p>
          <p class="mt-1 font-semibold text-textDark text-sm">${record.crop_name || 'N/A'}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-xs text-textMid">${t('profit_history_revenue', 'Revenue')}</p>
          <p class="mt-1 font-semibold">₹${Number(record.expected_revenue || 0).toFixed(2)}</p>
        </div>
        <div>
          <p class="text-xs text-textMid">${t('profit_history_profit', 'Profit')}</p>
          <p class="mt-1 font-semibold">₹${Number(record.estimated_profit || 0).toFixed(2)}</p>
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  });
}

function renderProfitOutput(payload) {
  if (!payload) return;
  const current = window.currentLang === 'hi' ? payload.hindi : payload.english;
  if (!current) return;

  const resultCard = document.getElementById('profitResultCard');
  if (!resultCard) return;

  document.getElementById('result_total_investment').textContent = current.total_investment || '₹0.00';
  document.getElementById('result_expected_revenue').textContent = current.expected_revenue || '₹0.00';
  document.getElementById('result_estimated_profit').textContent = current.estimated_profit || '₹0.00';
  document.getElementById('result_profit_percentage').textContent = current.profit_percentage || '0.00%';
  document.getElementById('result_profit_status').textContent = current.profit_status || 'N/A';
  document.getElementById('result_analysis').textContent = current.analysis || '';

  resultCard.classList.remove('hidden');
}

async function getProfitAnalysis(event) {
  if (event) event.preventDefault();

  clearProfitErrors();

  const submitButton = document.getElementById('profitSubmitBtn');
  const spinner = document.getElementById('btnSpinner');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add('opacity-70', 'cursor-not-allowed');
  }
  if (spinner) {
    spinner.classList.remove('hidden');
  }

  const payload = {
    crop_name: document.getElementById('crop_name')?.value.trim() || '',
    land_area: document.getElementById('land_area')?.value || '',
    production_cost: document.getElementById('production_cost')?.value || '',
    fertilizer_cost: document.getElementById('fertilizer_cost')?.value || '',
    labor_cost: document.getElementById('labor_cost')?.value || '',
    irrigation_cost: document.getElementById('irrigation_cost')?.value || '',
    expected_yield: document.getElementById('expected_yield')?.value || '',
    market_price: document.getElementById('market_price')?.value || '',
    transport_cost: document.getElementById('transport_cost')?.value || '',
    other_expenses: document.getElementById('other_expenses')?.value || '',
    soil_type: document.getElementById('soil_type')?.value || '',
  };

  const userId = window._currentUserId || 'guest';
  payload.latitude = localStorage.getItem(`lat_${userId}`) || '';
  payload.longitude = localStorage.getItem(`lon_${userId}`) || '';

  try {
    const response = await fetch('/api/profit-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      if (data && data.errors) {
        Object.entries(data.errors).forEach(([field, message]) => showProfitError(field, message));
      } else {
        alert(t('profit_error_failed', 'Unable to calculate profit. Please try again.'));
      }
      return;
    }

    renderProfitOutput(data.data.profit_analysis);
    renderProfitHistory(data.data.history || []);
  } catch (err) {
    console.error('Profit analysis error:', err);
    alert(t('profit_error_failed', 'Unable to calculate profit. Please try again.'));
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
    }
    if (spinner) {
      spinner.classList.add('hidden');
    }
  }
}

function initProfitAnalyzer() {
  const profitForm = document.getElementById('profitForm');
  if (!profitForm) return;
  profitForm.addEventListener('submit', getProfitAnalysis);
}
