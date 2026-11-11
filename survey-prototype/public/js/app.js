// Головний модуль: навігація та список опитувань
const App = (() => {
  const views = ['home', 'create', 'list', 'verify', 'take', 'results'];

  function showView(name) {
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.toggle('active', v === name);
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
    if (name === 'list') renderList();
  }

  async function renderList() {
    const list = document.getElementById('survey-list');
    list.innerHTML = '<p>Завантаження...</p>';

    try {
      const surveys = await API.getSurveys();
      list.innerHTML = '';

      if (surveys.length === 0) {
        list.innerHTML = '<p>Опитувань ще немає. Створіть перше у конструкторі.</p>';
        return;
      }

      surveys.forEach(s => {
        const card = document.createElement('div');
        card.className = 'survey-card';
        card.innerHTML = `
          <div>
            <strong>${escapeHtml(s.title)}</strong><br>
            <small>Питань: ${s.questions.length} · Відповідей: ${s.response_count ?? 0}</small>
          </div>
          <div class="actions">
            <button class="btn small"           data-action="take"    data-id="${s.id}">Пройти</button>
            <button class="btn small secondary" data-action="results" data-id="${s.id}">Результати</button>
            <button class="btn small secondary" data-action="edit"    data-id="${s.id}">Редагувати</button>
            <button class="btn small danger"    data-action="delete"  data-id="${s.id}">Видалити</button>
          </div>`;
        list.appendChild(card);
      });
    } catch (err) {
      list.innerHTML = `<p class="msg err">Не вдалося завантажити список: ${err.message}</p>`;
    }
  }

  async function handleListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'take')    Respondent.openWithVerify(id);
    if (action === 'results') Analytics.show(id);
    if (action === 'edit') {
      await Builder.loadForEdit(id);
      showView('create');
    }
    if (action === 'delete') {
      if (confirm('Видалити опитування разом із відповідями?')) {
        try {
          await API.deleteSurvey(id);
          renderList();
        } catch (err) {
          alert('Помилка: ' + err.message);
        }
      }
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function init() {
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.view;
        if (target === 'create' && !el.closest('#view-create')) Builder.reset();
        showView(target);
      });
    });

    document.getElementById('survey-list').addEventListener('click', handleListClick);
    document.getElementById('export-csv').addEventListener('click', () => Analytics.exportCSV());

    Builder.init();
    Respondent.init();
    showView('home');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { showView };
})();
