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

      // Пробуємо завантажити користувачів із сервера
      let usersHtml = '';
      try {
        const usersRes = await fetch('/api/users');
        const contentType = usersRes.headers.get('content-type');
        if (usersRes.ok && contentType && contentType.includes('application/json')) {
          const users = await usersRes.json();
          usersHtml = `
            <div class="admin-survey-card" style="margin-top: 16px;">
              <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Користувачі (${users.length})</h3>
              ${users.map(u => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #edf2f7;">
                  <span><strong>${escapeHtml(u.username)}</strong> <span class="survey-tag">${escapeHtml(u.role)}</span></span>
                  ${u.role !== 'admin' 
                    ? `<button class="btn small danger" data-admin-action="delete-user" data-id="${u.id}">Видалити</button>` 
                    : '<small style="color: #94a3b8;">Адмін</small>'}
                </div>
              `).join('')}
            </div>
          `;
        }
      } catch (e) {
        console.warn('Роут /api/users ще не підключений на бекенді');
      }

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
        ${usersHtml}
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

    // Обробка видалення користувача в блоці admin-summary
    document.getElementById('admin-summary')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-admin-action="delete-user"]');
      if (!btn) return;

      const userId = btn.dataset.id;
      if (confirm('Ви дійсно хочете видалити цього користувача?')) {
        try {
          const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Помилка видалення');
          loadSummary();
        } catch (err) {
          alert('Помилка: ' + err.message);
        }
      }
    });

    // Оригінальна обробка опитувань в блоці admin-surveys
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