// Модуль API — замінює LocalStorage, всі дані йдуть на сервер
const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Помилка сервера: ${res.status}`);
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
    saveResponse:  (data)       => request('POST',   '/responses', data),

    // Верифікація email
    verify:        (data)       => request('POST',   '/verify', data),
  };
})();
