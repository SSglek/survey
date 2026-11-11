// Модуль конструктора опитувань
const Builder = (() => {
  const TYPES = {
    single: 'Один варіант',
    multi:  'Кілька варіантів',
    scale:  'Шкала 1–5',
    text:   'Відкрита відповідь'
  };

  let editingId = null;

  const container = () => document.getElementById('questions-container');

  function addQuestion(data = { text: '', type: 'single', required: false, options: ['', ''] }) {
    const block = document.createElement('div');
    block.className = 'question-block';
    block.innerHTML = `
      <label>Текст питання
        <input type="text" class="q-text" value="${escapeAttr(data.text)}" required>
      </label>
      <label>Тип питання
        <select class="q-type">
          ${Object.entries(TYPES).map(([k, v]) =>
            `<option value="${k}" ${k === data.type ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </label>
      <label><input type="checkbox" class="q-required" ${data.required ? 'checked' : ''}> Обов'язкове</label>
      <div class="options-wrapper"></div>
      <button type="button" class="btn small danger remove-q">Видалити питання</button>
    `;

    const typeSelect  = block.querySelector('.q-type');
    const optionsWrap = block.querySelector('.options-wrapper');

    function renderOptions() {
      optionsWrap.innerHTML = '';
      if (typeSelect.value === 'single' || typeSelect.value === 'multi') {
        const list = document.createElement('div');
        list.className = 'options-list';
        const opts = block._options || data.options || ['', ''];
        block._options = opts;
        opts.forEach((opt, i) => {
          const row = document.createElement('div');
          row.className = 'option-row';
          row.innerHTML = `
            <input type="text" class="opt-text" value="${escapeAttr(opt)}" placeholder="Варіант ${i + 1}">
            <button type="button" class="btn small danger rm-opt">×</button>`;
          row.querySelector('.opt-text').addEventListener('input', e => { opts[i] = e.target.value; });
          row.querySelector('.rm-opt').addEventListener('click', () => {
            if (opts.length > 2) { opts.splice(i, 1); renderOptions(); }
          });
          list.appendChild(row);
        });
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn small secondary';
        addBtn.textContent = '+ Варіант';
        addBtn.addEventListener('click', () => { opts.push(''); renderOptions(); });
        optionsWrap.appendChild(list);
        optionsWrap.appendChild(addBtn);
      } else if (typeSelect.value === 'scale') {
        optionsWrap.innerHTML = '<p><small>Респондент оцінює від 1 до 5.</small></p>';
      } else {
        optionsWrap.innerHTML = '<p><small>Респондент вводить відповідь у вільній формі.</small></p>';
      }
    }

    typeSelect.addEventListener('change', () => { block._options = null; renderOptions(); });
    block.querySelector('.remove-q').addEventListener('click', () => block.remove());

    if (data.type === 'single' || data.type === 'multi') block._options = [...data.options];
    renderOptions();
    container().appendChild(block);
  }

  function collect() {
    return [...container().querySelectorAll('.question-block')].map((b, i) => {
      const type = b.querySelector('.q-type').value;
      const q = {
        id:       'q' + (i + 1),
        text:     b.querySelector('.q-text').value.trim(),
        type,
        required: b.querySelector('.q-required').checked
      };
      if (type === 'single' || type === 'multi') {
        q.options = (b._options || []).map(o => o.trim()).filter(Boolean);
      }
      return q;
    });
  }

  function validate(title, questions) {
    if (!title.trim()) return 'Введіть назву опитування';
    if (questions.length === 0) return 'Додайте хоча б одне питання';
    for (const q of questions) {
      if (!q.text) return 'Усі питання мають містити текст';
      if (q.options && q.options.length < 2)
        return `У питанні «${q.text}» має бути щонайменше 2 варіанти`;
    }
    return null;
  }

  function reset() {
    editingId = null;
    document.getElementById('survey-title').value = '';
    document.getElementById('survey-desc').value  = '';
    container().innerHTML = '';
    addQuestion();
  }

  async function loadForEdit(id) {
    try {
      const s = await API.getSurvey(id);
      editingId = id;
      document.getElementById('survey-title').value = s.title;
      document.getElementById('survey-desc').value  = s.description || '';
      container().innerHTML = '';
      s.questions.forEach(q => addQuestion(q));
    } catch (e) {
      alert('Не вдалося завантажити опитування: ' + e.message);
    }
  }

  function init() {
    document.getElementById('add-question').addEventListener('click', () => addQuestion());

    document.getElementById('survey-form').addEventListener('submit', async e => {
      e.preventDefault();
      const title       = document.getElementById('survey-title').value;
      const description = document.getElementById('survey-desc').value;
      const questions   = collect();
      const err = validate(title, questions);
      if (err) { alert(err); return; }

      try {
        const payload = { title: title.trim(), description: description.trim(), questions };
        if (editingId) {
          await API.updateSurvey(editingId, payload);
        } else {
          await API.createSurvey(payload);
        }
        alert('Опитування збережено');
        editingId = null;
        App.showView('list');
      } catch (err) {
        alert('Помилка збереження: ' + err.message);
      }
    });

    reset();
  }

  return { init, reset, loadForEdit };
})();

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
