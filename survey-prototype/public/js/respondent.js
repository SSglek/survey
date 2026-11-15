// Модуль проходження опитування респондентом
const Respondent = (() => {
  let _pendingHash     = null;
  let _pendingSurveyId = null;
  let _pendingSurvey   = null;  // кешуємо об'єкт щоб не робити зайвий запит

  function isRshuDomainUser(user) {
    return !!(user && typeof user.username === 'string' && user.username.toLowerCase().endsWith('@rshu.edu.ua'));
  }

  function isTypeformSurvey(survey) {
    if (!survey) return false;
    return !!survey.external_id || /typeform/i.test(String(survey.title || ''));
  }

  // Крок 1: відкрити форму верифікації
  async function openWithVerify(surveyId) {
    try {
      _pendingSurvey   = await API.getSurvey(surveyId);
      _pendingSurveyId = surveyId;
      _pendingHash     = null;
    } catch (e) {
      alert('Опитування не знайдено: ' + e.message);
      return;
    }

    const authState = await App.checkAuth();
    const isTypeform = isTypeformSurvey(_pendingSurvey);

    if (authState.isAuthenticated && authState.isAdmin) {
      openSurveyForm();
      return;
    }

    if (authState.isAuthenticated) {
      try {
        const approved = await API.checkAccessRequest(surveyId);
        if (approved && approved.approved) {
          openSurveyForm();
          return;
        }
      } catch (err) {
        console.warn('Не вдалося перевірити заявку на доступ:', err);
      }
    }

    // Для не-Typeform опитувань: якщо користувач увійшов з корпоративної пошти @rshu.edu.ua — пропускаємо верифікацію.
    // Якщо не увійшов або увійшов з іншої пошти — просимо увійти під корпоративною поштою або звернутися до адміністратора.
    if (!isTypeform) {
      if (authState.isAuthenticated && isRshuDomainUser(authState.user)) {
        openSurveyForm();
        return;
      }

      const loginErr = document.getElementById('login-error');
      if (loginErr) {
        loginErr.textContent = 'Для проходження цього опитування увійдіть під корпоративною поштою @rshu.edu.ua або попросіть дозвіл у адміністратора.';
      }
      App.showView('login');
      return;
    }

    document.getElementById('verify-form').reset();
    document.getElementById('verify-error').style.display = 'none';
    App.showView('verify');
  }

  // Крок 2: перевірити email через сервер
  async function handleVerify(e) {
    e.preventDefault();
    const email    = document.getElementById('verify-email').value;
    const errorBox = document.getElementById('verify-error');
    const btn      = e.target.querySelector('button[type="submit"]');
    errorBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Перевірка...';

    try {
      // Verify.verify() звертається до /api/verify → сервер рахує SHA-256
      const result = await Verify.verify(email, _pendingSurveyId);

      if (!result.ok) {
        errorBox.textContent    = result.error;
        errorBox.style.display  = 'block';
        return;
      }

      // Хеш отримано з сервера — email більше ніде не фігурує
      _pendingHash = result.hash;
      openSurveyForm();
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Продовжити';
    }
  }

  // Крок 3: відобразити запитання
  function openSurveyForm() {
    const survey = _pendingSurvey;
    document.getElementById('take-title').textContent = survey.title;
    document.getElementById('take-desc').textContent  = survey.description || '';

    const form = document.getElementById('response-form');
    form.innerHTML = '';

    survey.questions.forEach((q, idx) => {
      const block = document.createElement('div');
      block.className = 'question-block';
      const req = q.required ? ' <span style="color:#c0392b">*</span>' : '';
      let inputs = '';

      if (q.type === 'single') {
        inputs = q.options.map(opt =>
          `<label style="font-weight:normal"><input type="radio" name="${q.id}" value="${escapeAttr(opt)}"> ${escapeHtml(opt)}</label>`
        ).join('');
      } else if (q.type === 'multi') {
        inputs = q.options.map(opt =>
          `<label style="font-weight:normal"><input type="checkbox" name="${q.id}" value="${escapeAttr(opt)}"> ${escapeHtml(opt)}</label>`
        ).join('');
      } else if (q.type === 'scale') {
        inputs = [1,2,3,4,5].map(n =>
          `<label style="display:inline-block;margin-right:12px;font-weight:normal">
             <input type="radio" name="${q.id}" value="${n}"> ${n}</label>`
        ).join('');
      } else {
        inputs = `<textarea name="${q.id}" rows="3"></textarea>`;
      }

      block.innerHTML = `<p><strong>${idx + 1}. ${escapeHtml(q.text)}</strong>${req}</p>${inputs}`;
      form.appendChild(block);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type      = 'submit';
    submitBtn.className = 'btn';
    submitBtn.textContent = 'Надіслати відповідь';
    form.appendChild(submitBtn);

    form.onsubmit = e => { e.preventDefault(); submitAnswers(survey, form); };
    App.showView('take');
  }

  // Крок 4: надіслати відповіді та зафіксувати хеш у БД
  async function submitAnswers(survey, form) {
    const answers = {};
    for (const q of survey.questions) {
      let value;
      if (q.type === 'multi') {
        value = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map(i => i.value);
        if (q.required && value.length === 0) { alert(`Оберіть відповідь: «${q.text}»`); return; }
      } else if (q.type === 'text') {
        value = form.querySelector(`textarea[name="${q.id}"]`).value.trim();
        if (q.required && !value) { alert(`Заповніть поле: «${q.text}»`); return; }
      } else {
        const checked = form.querySelector(`input[name="${q.id}"]:checked`);
        value = checked ? checked.value : null;
        if (q.required && value === null) { alert(`Оберіть відповідь: «${q.text}»`); return; }
      }
      answers[q.id] = value;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Відправлення...';

    try {
      // Сервер: зберігає відповідь + записує хеш у used_hashes (транзакція)
      await API.saveResponse({
        surveyId:  survey.id,
        answers,
        voterHash: _pendingHash   // email тут відсутній
      });

      _pendingHash     = null;
      _pendingSurvey   = null;
      _pendingSurveyId = null;

      alert('Дякуємо! Вашу відповідь анонімно збережено.');
      App.showView('list');
    } catch (err) {
      alert('Помилка: ' + err.message);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Надіслати відповідь';
    }
  }

  // Крок 5: надіслати запит на доступ до опитування
  async function handleAccessRequest(e) {
    e.preventDefault();
    const form = e.target;
    const messageEl = document.getElementById('access-request-message');
    const statusEl = document.getElementById('access-request-status');
    const btn = form.querySelector('button[type="submit"]');

    if (!messageEl || !statusEl || !btn) return;

    const message = messageEl.value.trim();

    if (!message) {
      statusEl.textContent = 'Введіть текст запиту для адміністратора.';
      statusEl.style.display = 'block';
      return;
    }

    const authState = await App.checkAuth();
    if (!authState.isAuthenticated) {
      const loginErr = document.getElementById('login-error');
      if (loginErr) {
        loginErr.textContent = 'Спочатку увійдіть в систему, щоб попросити дозвіл у адміністратора.';
      }
      App.showView('login');
      return;
    }

    const email = authState.user && authState.user.username ? authState.user.username : '';

    btn.disabled = true;
    btn.textContent = 'Надсилання...';
    statusEl.style.display = 'none';

    try {
      const result = await API.requestAccess({
        surveyId: _pendingSurveyId,
        email,
        message
      });

      statusEl.textContent = result.message || 'Очікуйте на рішення адміністратора';
      statusEl.classList.remove('msg err');
      statusEl.classList.add('msg', 'ok');
      statusEl.style.display = 'block';
      form.reset();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.classList.remove('msg ok');
      statusEl.classList.add('msg', 'err');
      statusEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Попросити дозвіл у адміністратора';
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function init() {
    document.getElementById('verify-form').addEventListener('submit', handleVerify);
    document.getElementById('access-request-form')?.addEventListener('submit', handleAccessRequest);
  }

  return { openWithVerify, init };
})();
