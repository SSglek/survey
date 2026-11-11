const AdminPanel = (() => {
  async function loadSummary() {
    const summaryEl = document.getElementById('admin-summary');
    const surveysEl = document.getElementById('admin-surveys');

    if (!summaryEl || !surveysEl) return;

    summaryEl.innerHTML = '<p>Завантаження...</p>';
    surveysEl.innerHTML = '';

    try {
      const surveys = await API.getSurveys();
      const totalResponses = surveys.reduce((sum, s) => sum + (Number(s.response_count) || 0), 0);

      summaryEl.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card">
            <span>Опитувань</span>
            <strong>${surveys.length}</strong>
          </div>
          <div class="stat-card">
            <span>Відповідей</span>
            <strong>${totalResponses}</strong>
          </div>
          <div class="stat-card">
            <span>Статус</span>
            <strong>Адмін</strong>
          </div>
        </div>
      `;

      if (!surveys.length) {
        surveysEl.innerHTML = '<p>Ще немає опитувань.</p>';
        return;
      }

      surveys.forEach(survey => {
        const card = document.createElement('div');
        card.className = 'admin-survey-card';

        const actions = `
          <div class="admin-actions">
            <button class="btn small" data-admin-action="view" data-id="${survey.id}">Переглянути</button>
            <button class="btn small secondary" data-admin-action="results" data-id="${survey.id}">Результати</button>
          </div>
        `;

        card.innerHTML = `
          <div class="admin-survey-row">
            <div>
              <h3>${escapeHtml(survey.title)}</h3>
              <p>${escapeHtml(survey.description || 'Без опису')}</p>
            </div>
            <span class="survey-tag">${survey.response_count ?? 0} відповідей</span>
          </div>
          ${actions}
        `;

        surveysEl.appendChild(card);
      });
    } catch (err) {
      summaryEl.innerHTML = `<p class="msg err">Помилка завантаження: ${err.message}</p>`;
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bindEvents() {
    document.getElementById('admin-refresh')?.addEventListener('click', loadSummary);
    document.getElementById('admin-surveys')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-admin-action]');
      if (!btn) return;

      const surveyId = btn.dataset.id;
      const action = btn.dataset.adminAction;

      if (action === 'results') {
        Analytics.show(surveyId);
      }

      if (action === 'view') {
        await Builder.loadForEdit(surveyId);
        App.showView('create');
      }
    });
  }

  function init() {
    bindEvents();
    loadSummary();
  }

  return { init, loadSummary };
})();
