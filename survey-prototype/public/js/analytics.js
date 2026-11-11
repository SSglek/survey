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

        // Отримуємо значення відповіді для даного питання (шукаємо за id або за ref)
        const getAnswerValue = (r) => {
          if (!r.answers) return undefined;
          return r.answers[q.id] !== undefined ? r.answers[q.id] : r.answers[q.ref];
        };

        if (q.type === 'text' || q.type === 'long_text') {
          const texts = responses.map(getAnswerValue).filter(Boolean);
          block.innerHTML += texts.length
            ? '<ul>' + texts.map(t => `<li>${escapeHtml(t)}</li>`).join('') + '</ul>'
            : '<p>Відповідей немає.</p>';

        } else if (q.type === 'scale' || q.type === 'opinion_scale') {
          const values = responses
            .map(r => Number(getAnswerValue(r)))
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
          // Для питань типу single_choice та multiple_choice
          const values = [];
          responses.forEach(r => {
            const a = getAnswerValue(r);
            if (Array.isArray(a)) {
              values.push(...a); // Якщо це масив вибраних варіантів від Typeform
            } else if (a !== null && a !== undefined) {
              values.push(a);
            }
          });

          // Збираємо список усіх можливих options (із локального конструктора або динамічно з Typeform)
          const counts = countValues(values);
          const dynamicOptions = Array.from(new Set([...(q.options || []), ...Object.keys(counts)]));

          block.appendChild(buildBars(counts, responses.length, dynamicOptions));
        }

        container.appendChild(block);
      });

      App.showView('results');
    } catch (err) {
      alert('Не вдалося завантажити результати: ' + err.message);
    }
  }

  async function showMyResults(surveyId) {
    try {
      const survey = await API.getSurvey(surveyId);
      const responses = await API.getMyResponses(surveyId);

      currentSurveyId = surveyId;
      currentSurvey = survey;
      currentResponses = responses;

      document.getElementById('results-title').textContent = 'Мої відповіді: ' + survey.title;
      document.getElementById('results-count').textContent = `Кількість моїх відповідей: ${responses.length}`;

      const container = document.getElementById('results-container');
      container.innerHTML = '';

      if (responses.length === 0) {
        container.innerHTML = '<p>Ви ще не відповідали на це опитування.</p>';
        App.showView('results');
        return;
      }

      responses.forEach((response, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'result-question';
        wrapper.innerHTML = `<h3>Відповідь ${idx + 1} · ${new Date(response.submitted_at).toLocaleString('uk-UA')}</h3>`;

        survey.questions.forEach((q, qIdx) => {
          const answer = response.answers[q.id] !== undefined ? response.answers[q.id] : response.answers[q.ref];
          const answerText = Array.isArray(answer) ? answer.join(', ') : (answer ?? '—');

          const row = document.createElement('div');
          row.className = 'my-result-row';
          row.innerHTML = `<strong>${qIdx + 1}. ${escapeHtml(q.text)}</strong><br><span>${escapeHtml(String(answerText))}</span>`;
          wrapper.appendChild(row);
        });

        container.appendChild(wrapper);
      });

      App.showView('results');
    } catch (err) {
      alert('Не вдалося завантажити ваші відповіді: ' + err.message);
    }
  }

  function countValues(values) {
    return values.reduce((acc, v) => {
      if (v !== undefined && v !== null) {
        acc[v] = (acc[v] || 0) + 1;
      }
      return acc;
    }, {});
  }

  function buildBars(counts, total, order) {
    const wrap = document.createElement('div');
    (order || []).forEach(opt => {
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
        const a = r.answers[q.id] !== undefined ? r.answers[q.id] : r.answers[q.ref];
        return Array.isArray(a) ? a.join('; ') : (a ?? '');
      })
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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

  return { show, showMyResults, exportCSV };
})();