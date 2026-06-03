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
const today = new Date().toISOString().slice(0, 10);
fromInput.value = today;
toInput.value = today;

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

  const dailyRows = buildDailyRows(records);
  recordsBody.innerHTML = dailyRows.length
    ? dailyRows.map(dailyRow).join('')
    : '<tr><td colspan="8">Nenhum registro encontrado.</td></tr>';
}

function buildDailyRows(records) {
  const groups = new Map();
  records.forEach((record) => {
    const dateKey = formatDateKey(record.date);
    const operatorKey = record.operator_id || 'sem_operador';
    const key = `${dateKey}|${operatorKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: dateKey,
        operator_id: record.operator_id || '-',
        collaborator_name: record.collaborator_name || '-',
        entrada1: null,
        saida1: null,
        entrada2: null,
        saida2: null,
        extras: []
      });
    }

    const row = groups.get(key);
    if ((!row.collaborator_name || row.collaborator_name === '-') && record.collaborator_name) {
      row.collaborator_name = record.collaborator_name;
    }
    assignRecordToDailySlot(row, record);
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return String(a.operator_id).localeCompare(String(b.operator_id), 'pt-BR', { numeric: true });
  });
}

function assignRecordToDailySlot(row, record) {
  const event = normalizeEvent(record.event);
  if (event === 'entrada') {
    if (!row.entrada1) row.entrada1 = record;
    else if (!row.entrada2) row.entrada2 = record;
    else row.extras.push(record);
    return;
  }
  if (event === 'saida') {
    if (!row.saida1) row.saida1 = record;
    else if (!row.saida2) row.saida2 = record;
    else row.extras.push(record);
    return;
  }
  row.extras.push(record);
}

function dailyRow(row) {
  return `
    <tr>
      <td>${escapeHtml(formatDisplayDate(row.date))}</td>
      <td>${escapeHtml(row.operator_id)}</td>
      <td>${escapeHtml(row.collaborator_name)}</td>
      <td>${formatPointCell(row.entrada1)}</td>
      <td>${formatPointCell(row.saida1)}</td>
      <td>${formatPointCell(row.entrada2)}</td>
      <td>${formatPointCell(row.saida2)}</td>
      <td>${formatExtrasCell(row.extras)}</td>
    </tr>
  `;
}

function formatPointCell(record) {
  if (!record) return '-';
  const links = [];
  if (record.maps_url) links.push(`<a href="${escapeAttr(record.maps_url)}" target="_blank" rel="noopener">Mapa</a>`);
  if (record.photo_url) links.push(`<a href="${escapeAttr(record.photo_url)}" target="_blank" rel="noopener">Foto</a>`);
  const offline = record.offline_origin === 'SIM' ? '<span class="offline">Offline</span>' : '';
  return `
    <div class="pointTime">${escapeHtml(formatTime(record.date))}</div>
    <div class="pointLinks">${links.join(' ') || ''} ${offline}</div>
  `;
}

function formatExtrasCell(records) {
  if (!records.length) return '-';
  return records.map((record) => {
    const label = `${record.event || 'Ponto'} ${formatTime(record.date)}`;
    return `<div>${escapeHtml(label)}</div>`;
  }).join('');
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

function normalizeEvent(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
