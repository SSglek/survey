// Модуль аналізу та візуалізації результатів
const Analytics = (() => {
  let currentSurveyId  = null;
  let currentSurvey    = null;
  let currentResponses = null;

  async function show(surveyId) {
    try {
      const [survey, responses] = await Promise.all([
        API.getSurvey(surveyId),
        API.getResponses(surveyId)
      ]);

      currentSurveyId  = surveyId;
      currentSurvey    = survey;
      currentResponses = responses;

      document.getElementById('results-title').textContent =
        'Результати: ' + survey.title;
      document.getElementById('results-count').textContent =
        `Кількість відповідей: ${responses.length}`;

      const container = document.getElementById('results-container');
      container.innerHTML = '';

      if (responses.length === 0) {
        container.innerHTML = '<p>Ще немає відповідей.</p>';
        App.showView('results');
        return;
      }

      survey.questions.forEach((q, idx) => {
        const block = document.createElement('div');
        block.className = 'result-question';
        block.innerHTML = `<h3>${idx + 1}. ${escapeHtml(q.text)}</h3>`;

        if (q.type === 'text') {
          const texts = responses.map(r => r.answers[q.id]).filter(Boolean);
          block.innerHTML += texts.length
            ? '<ul>' + texts.map(t => `<li>${escapeHtml(t)}</li>`).join('') + '</ul>'
            : '<p>Відповідей немає.</p>';

        } else if (q.type === 'scale') {
          const values = responses
            .map(r => Number(r.answers[q.id]))
            .filter(v => !isNaN(v) && v > 0);
          const avg = values.length
            ? (values.reduce((a, b) => a + b, 0) / values.length)
            : 0;
          block.innerHTML +=
            `<p>Середня оцінка: <strong>${avg.toFixed(2)}</strong> з 5 (n = ${values.length})</p>`;
          block.appendChild(
            buildBars(countValues(values.map(String)), values.length, ['1','2','3','4','5'])
          );

        } else {
          const values = [];
          responses.forEach(r => {
            const a = r.answers[q.id];
            if (Array.isArray(a)) values.push(...a);
            else if (a !== null && a !== undefined) values.push(a);
          });
          block.appendChild(buildBars(countValues(values), responses.length, q.options));
        }

        container.appendChild(block);
      });

      App.showView('results');
    } catch (err) {
      alert('Не вдалося завантажити результати: ' + err.message);
    }
  }

  function countValues(values) {
    return values.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
  }

  function buildBars(counts, total, order) {
    const wrap = document.createElement('div');
    order.forEach(opt => {
      const c   = counts[opt] || 0;
      const pct = total ? Math.round((c / total) * 100) : 0;
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-label">${escapeHtml(opt)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="bar-value">${c} (${pct}%)</div>`;
      wrap.appendChild(row);
    });
    return wrap;
  }

  function exportCSV() {
    if (!currentSurvey || !currentResponses) return;
    const survey    = currentSurvey;
    const responses = currentResponses;

    const header = ['id', 'submitted_at', ...survey.questions.map(q => q.text)];
    const rows = responses.map(r => [
      r.id,
      r.submitted_at,
      ...survey.questions.map(q => {
        const a = r.answers[q.id];
        return Array.isArray(a) ? a.join('; ') : (a ?? '');
      })
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `${survey.title}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { show, exportCSV };
})();
