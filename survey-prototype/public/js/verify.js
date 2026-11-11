// Модуль верифікації — хешування відбувається на СЕРВЕРІ
// Фронтенд надсилає email на /api/verify і отримує лише хеш
// Email на сервері одразу відкидається — зберігається тільки хеш
const Verify = (() => {
  const DOMAIN = 'rshu.edu.ua';

  // Перевіряє email через API сервера
  // Повертає { ok, hash } або { ok: false, error }
  async function verify(email, surveyId) {
    const trimmed = email.trim().toLowerCase();

    // Базова перевірка домену на фронтенді (до запиту на сервер)
    if (!trimmed.endsWith('@' + DOMAIN)) {
      return { ok: false, error: `Допускається лише пошта @${DOMAIN}` };
    }

    try {
      // Сервер: перевіряє домен, рахує SHA-256, перевіряє used_hashes у БД
      const result = await API.verify({ email: trimmed, surveyId });
      return result; // { ok: true, hash } або { ok: false, error }
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  return { verify, DOMAIN };
})();
