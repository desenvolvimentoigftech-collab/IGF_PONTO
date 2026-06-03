const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxAxUus03Hx0Q6B7NIDDM1-lYn2hmcyq1flfl6DEY0HCsPa2uq6iWuYLz2XKexsNmGs/exec';

const scriptUrlInput = document.querySelector('#scriptUrlInput');
const operatorInput = document.querySelector('#operatorInput');
const fromInput = document.querySelector('#fromInput');
const toInput = document.querySelector('#toInput');
const refreshButton = document.querySelector('#refreshButton');
const recordsBody = document.querySelector('#recordsBody');
const totalRecords = document.querySelector('#totalRecords');
const hourBank = document.querySelector('#hourBank');
const offlineRecords = document.querySelector('#offlineRecords');
const statusText = document.querySelector('#statusText');

scriptUrlInput.value = localStorage.getItem('scriptUrl') || DEFAULT_SCRIPT_URL;

refreshButton.addEventListener('click', loadRecords);
[scriptUrlInput, operatorInput, fromInput, toInput].forEach((input) => {
  input.addEventListener('change', loadRecords);
});

loadRecords();

function loadRecords() {
  const scriptUrl = scriptUrlInput.value.trim();
  if (!scriptUrl) return;

  localStorage.setItem('scriptUrl', scriptUrl);
  statusText.textContent = 'Carregando...';

  const params = new URLSearchParams();
  params.set('action', 'list');
  if (operatorInput.value.trim()) params.set('operator_id', operatorInput.value.trim());
  if (fromInput.value) params.set('from', `${fromInput.value} 00:00:00`);
  if (toInput.value) params.set('to', `${toInput.value} 23:59:59`);

  jsonp(`${scriptUrl}?${params.toString()}`)
    .then((data) => {
      const records = normalizeRecords(data.records || []);
      render(records);
      statusText.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR')}`;
    })
    .catch((error) => {
      statusText.textContent = `Erro: ${error.message}`;
    });
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = `igfCallback_${Date.now()}_${Math.round(Math.random() * 100000)}`;
    const separator = url.includes('?') ? '&' : '?';
    const script = document.createElement('script');

    window[callback] = (data) => {
      delete window[callback];
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      delete window[callback];
      script.remove();
      reject(new Error('Falha ao carregar Apps Script'));
    };

    script.src = `${url}${separator}callback=${callback}`;
    document.body.appendChild(script);
  });
}

function normalizeRecords(records) {
  return records
    .map((record) => ({
      ...record,
      date: parseLocalDate(record.timestamp_local)
    }))
    .filter((record) => record.date)
    .sort((a, b) => a.date - b.date);
}

function render(records) {
  totalRecords.textContent = records.length;
  offlineRecords.textContent = records.filter((record) => record.offline_origin === 'SIM').length;
  hourBank.textContent = formatDuration(calculateWorkedMs(records));

  recordsBody.innerHTML = records.length
    ? records.map(recordRow).join('')
    : '<tr><td colspan="7">Nenhum registro encontrado.</td></tr>';
}

function recordRow(record) {
  const maps = record.maps_url ? `<a href="${escapeAttr(record.maps_url)}" target="_blank" rel="noopener">Mapa</a>` : '-';
  const photo = record.photo_url ? `<a href="${escapeAttr(record.photo_url)}" target="_blank" rel="noopener">Foto</a>` : '-';
  return `
    <tr>
      <td>${escapeHtml(record.timestamp_local || '-')}</td>
      <td><span class="badge">${escapeHtml(record.event || '-')}</span></td>
      <td>${escapeHtml(record.operator_id || '-')}</td>
      <td>${escapeHtml(record.collaborator_name || '-')}</td>
      <td>${maps}</td>
      <td>${photo}</td>
      <td>${escapeHtml(record.offline_origin || '-')}</td>
    </tr>
  `;
}

function calculateWorkedMs(records) {
  const byOperator = new Map();
  records.forEach((record) => {
    const key = record.operator_id || 'sem_operador';
    if (!byOperator.has(key)) byOperator.set(key, []);
    byOperator.get(key).push(record);
  });

  let total = 0;
  byOperator.forEach((items) => {
    let openEntrada = null;
    items.forEach((record) => {
      if (record.event === 'Entrada') {
        openEntrada = record.date;
      } else if (record.event === 'Saida' && openEntrada) {
        const diff = record.date - openEntrada;
        if (diff > 0) total += diff;
        openEntrada = null;
      }
    });
  });
  return total;
}

function parseLocalDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
