// Модуль API — замінює LocalStorage, всі дані йдуть на сервер
const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };

    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || `Помилка сервера: ${res.status}`);
    }

    return data;
  }

  return {
    // Опитування
    getSurveys:    ()           => request('GET',    '/surveys'),
    getSurvey:     (id)         => request('GET',    `/surveys/${id}`),
    createSurvey:  (data)       => request('POST',   '/surveys', data),
    updateSurvey:  (id, data)   => request('PUT',    `/surveys/${id}`, data),
    deleteSurvey:  (id)         => request('DELETE', `/surveys/${id}`),

    // Відповіді
    getResponses:  (surveyId)   => request('GET',    `/responses/${surveyId}`),
    getMyResponses:  (surveyId)   => request('GET',    `/responses/me/${surveyId}`),
    saveResponse:  (data)       => request('POST',   '/responses', data),

    // Верифікація email
    verify:        (data)       => request('POST',   '/verify', data),

    // Авторизація
    getAuthStatus: ()           => request('GET',    '/auth/status'),
    login:         (data)       => request('POST',   '/auth/login', data),
    register:      (data)       => request('POST',   '/auth/register', data),
    logout:        ()           => request('POST',   '/auth/logout')
  };
})();
