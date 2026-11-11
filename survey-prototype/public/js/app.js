// Головний модуль: навігація та список опитувань
const App = (() => {
  const views = ['home', 'admin', 'login', 'create', 'list', 'verify', 'take', 'results'];

  function showView(name) {
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.toggle('active', v === name);
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === name);
    });

    if (name === 'list') renderList();
    if (name === 'admin') AdminPanel.loadSummary();
  }

  function setAuthUI(user) {
    const isAdmin = user && user.role === 'admin';
    const isAuth = !!user;

    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    const loginBtn = document.getElementById('btn-login-view');
    const logoutBtn = document.getElementById('btn-logout');

    if (loginBtn) loginBtn.style.display = isAuth ? 'none' : '';
    if (logoutBtn) logoutBtn.style.display = isAuth ? '' : 'none';

    document.querySelectorAll('[data-action="edit"], [data-action="delete"]').forEach(btn => {
      btn.style.display = isAdmin ? '' : 'none';
    });

    document.querySelectorAll('.auth-btn').forEach(btn => {
      btn.style.display = isAuth ? '' : '';
    });

    document.querySelectorAll('[data-action="my-results"]').forEach(btn => {
      btn.style.display = isAuth && !isAdmin ? '' : 'none';
    });
  }

  async function checkAuth() {
    try {
      const { isAdmin, isAuthenticated, user } = await API.getAuthStatus();
      setAuthUI(isAuthenticated ? user : null);
      return { isAdmin, isAuthenticated, user };
    } catch (err) {
      setAuthUI(null);
      return { isAdmin: false, isAuthenticated: false, user: null };
    }
  }

  async function login(username, password) {
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = '';

    try {
      const data = await API.login({ username, password });
      if (data.ok) {
        await checkAuth();
        const user = data.user;
        showView(user && user.role === 'admin' ? 'admin' : 'list');
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    }
  }

  async function register(username, password) {
    const errEl = document.getElementById('register-error');
    if (errEl) errEl.textContent = '';

    try {
      const data = await API.register({ username, password });
      if (data.ok) {
        await checkAuth();
        showView('list');
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message;
    }
  }

  async function logout() {
    try {
      await API.logout();
      await checkAuth();
      showView('home');
    } catch (err) {
      console.error(err);
    }
  }

  async function renderList() {
    const list = document.getElementById('survey-list');
    if (!list) return;

    list.innerHTML = '<p>Завантаження...</p>';

    try {
      const surveys = await API.getSurveys();
      list.innerHTML = '';

      if (surveys.length === 0) {
        list.innerHTML = '<p>Опитувань ще немає. Створіть перше у конструкторі.</p>';
        return;
      }

      const authState = await checkAuth();
      const isAdmin = !!(authState.user && authState.user.role === 'admin');

      surveys.forEach(s => {
        const card = document.createElement('div');
        card.className = 'survey-card';
        card.innerHTML = `
          <div>
            <strong>${escapeHtml(s.title)}</strong><br>
            <small>Питань: ${s.questions.length} · Відповідей: ${s.response_count ?? 0}</small>
          </div>
          <div class="actions">
            <button class="btn small" data-action="take" data-id="${s.id}">Пройти</button>
            ${isAdmin ? `<button class="btn small secondary" data-action="results" data-id="${s.id}">Результати</button>` : ''}
            ${isAdmin ? `<button class="btn small secondary" data-action="edit" data-id="${s.id}">Редагувати</button>` : ''}
            ${isAdmin ? `<button class="btn small danger" data-action="delete" data-id="${s.id}">Видалити</button>` : ''}
            ${!isAdmin ? `<button class="btn small secondary" data-action="my-results" data-id="${s.id}">Мої відповіді</button>` : ''}
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

    if (action === 'take') Respondent.openWithVerify(id);
    if (action === 'results') Analytics.show(id);
    if (action === 'my-results') Analytics.showMyResults(id);
    if (action === 'edit') {
      await Builder.loadForEdit(id);
      showView('create');
    }
    if (action === 'delete') {
      if (confirm('Видалити опитування разим із відповідями?')) {
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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.view;
        if (target === 'create' && !el.closest('#view-create')) Builder.reset();
        if (target === 'login') {
          showView('login');
          return;
        }
        showView(target);
      });
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      await login(username, password);
    });

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value.trim();
      const password = document.getElementById('register-password').value.trim();
      await register(username, password);
    });

    document.getElementById('btn-logout')?.addEventListener('click', logout);
    document.getElementById('survey-list')?.addEventListener('click', handleListClick);
    document.getElementById('export-csv')?.addEventListener('click', () => Analytics.exportCSV());

    document.querySelectorAll('[data-auth-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.authTab;
        document.querySelectorAll('.auth-tab').forEach(el => el.classList.toggle('active', el === tab));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.toggle('active', form.id === (mode === 'login' ? 'login-form' : 'register-form')));
      });
    });

    Builder.init();
    Respondent.init();
    AdminPanel.init();
    checkAuth();
    showView('home');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { showView, checkAuth, logout };
})();
