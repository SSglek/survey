const Auth = (() => {
  async function check() {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      updateUI(data.isAdmin);
    } catch (e) {
      updateUI(false);
    }
  }

  function updateUI(isAdmin) {
    // Ховаємо або показуємо кнопку "Конструктор"
    const createBtn = document.querySelector('[data-view="create"]');
    if (createBtn) createBtn.style.display = isAdmin ? 'inline-block' : 'none';

    // Ховаємо/показуємо кнопки "Увійти" та "Вийти"
    const loginBtn = document.getElementById('btn-login-view');
    const logoutBtn = document.getElementById('btn-logout');
    if (loginBtn) loginBtn.style.display = isAdmin ? 'none' : 'inline-block';
    if (logoutBtn) logoutBtn.style.display = isAdmin ? 'inline-block' : 'none';

    // Ховаємо кнопки Редагувати/Видалити для звичайних користувачів
    document.querySelectorAll('[data-action="edit"], [data-action="delete"]').forEach(btn => {
      btn.style.display = isAdmin ? 'inline-block' : 'none';
    });
  }

  async function login(username, password) {
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.ok) {
        await check();
        App.showView('list');
      } else {
        if (errEl) errEl.textContent = data.message || 'Помилка входу';
      }
    } catch (err) {
      if (errEl) errEl.textContent = 'Помилка сервера: ' + err.message;
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await check();
    App.showView('home');
  }

  function init() {
    const form = document.getElementById('admin-login-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value.trim();
        login(u, p);
      };
    }
    check();
  }

  return { init, check, logout };
})();

document.addEventListener('DOMContentLoaded', Auth.init);