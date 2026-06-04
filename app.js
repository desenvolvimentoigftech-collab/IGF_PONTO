const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxAxUus03Hx0Q6B7NIDDM1-lYn2hmcyq1flfl6DEY0HCsPa2uq6iWuYLz2XKexsNmGs/exec';

const operatorInput = document.querySelector('#operatorInput');
const fromInput = document.querySelector('#fromInput');
const toInput = document.querySelector('#toInput');
const statusInput = document.querySelector('#statusInput');
const refreshButton = document.querySelector('#refreshButton');
const recordsBody = document.querySelector('#recordsBody');
const totalDays = document.querySelector('#totalDays');
const expectedHours = document.querySelector('#expectedHours');
const workedHours = document.querySelector('#workedHours');
const hourBank = document.querySelector('#hourBank');
const generalHourBank = document.querySelector('#generalHourBank');
const inconsistencyCount = document.querySelector('#inconsistencyCount');
const statusText = document.querySelector('#statusText');
const resetBankButton = document.querySelector('#resetBankButton');
const resetModal = document.querySelector('#resetModal');
const resetModalText = document.querySelector('#resetModalText');
const confirmResetBankButton = document.querySelector('#confirmResetBankButton');
const cancelResetBankButton = document.querySelector('#cancelResetBankButton');
let activeBankOperatorId = '';

const today = new Date();
fromInput.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
toInput.value = today.toISOString().slice(0, 10);

refreshButton.addEventListener('click', loadRecords);
[operatorInput, fromInput, toInput, statusInput].forEach((input) => {
  input.addEventListener('change', loadRecords);
});
resetBankButton.addEventListener('click', beginResetBank);
confirmResetBankButton.addEventListener('click', confirmResetBank);
cancelResetBankButton.addEventListener('click', closeResetModal);

loadRecords();

function loadRecords() {
  statusText.textContent = 'Carregando...';

  const params = new URLSearchParams();
  params.set('action', 'list');
  if (operatorInput.value.trim()) params.set('operator_id', operatorInput.value.trim());
  if (fromInput.value) params.set('from', `${fromInput.value} 00:00:00`);
  if (toInput.value) params.set('to', `${toInput.value} 23:59:59`);

  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      const rows = normalizeDailyRows(data.daily_rows || []);
      const filteredRows = statusInput.value ? rows.filter((row) => row.status === statusInput.value) : rows;
      return resolveVisibleBanks(filteredRows, data.bank || null).then((banksByOperator) => {
        render(filteredRows, data.truncated, banksByOperator);
        renderGeneralBank(displayBankForRows(filteredRows, banksByOperator));
        statusText.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR')}${data.truncated ? ' - limite atingido' : ''}`;
      });
    })
    .catch((error) => {
      statusText.textContent = `Erro: ${error.message}`;
    });
}

function renderGeneralBank(bank) {
  activeBankOperatorId = bank && bank.operator_id ? String(bank.operator_id).trim() : '';
  if (!activeBankOperatorId || !bank) {
    generalHourBank.textContent = '--';
    generalHourBank.className = '';
    resetBankButton.disabled = true;
    return;
  }

  generalHourBank.textContent = formatSignedMinutes(bank.balance_minutes || 0);
  generalHourBank.className = Number(bank.balance_minutes || 0) < 0 ? 'negative' : Number(bank.balance_minutes || 0) > 0 ? 'positive' : '';
  resetBankButton.disabled = false;
}

function beginResetBank() {
  const operatorId = activeBankOperatorId || operatorInput.value.trim();
  if (!operatorId) {
    alert('Selecione um operador antes de zerar o banco.');
    return;
  }

  const password = prompt('Digite a senha para zerar o banco:');
  if (!password) return;

  resetBankButton.dataset.password = password;
  resetModalText.textContent = `Confirma zerar o banco geral do operador ${operatorId}? Esta operacao ficara registrada na planilha.`;
  resetModal.hidden = false;
}

function closeResetModal() {
  resetBankButton.dataset.password = '';
  resetModal.hidden = true;
}

function confirmResetBank() {
  const operatorId = activeBankOperatorId || operatorInput.value.trim();
  const password = resetBankButton.dataset.password || '';
  if (!operatorId || !password) {
    closeResetModal();
    return;
  }

  statusText.textContent = 'Zerando banco...';
  const params = new URLSearchParams();
  params.set('action', 'reset_bank');
  params.set('operator_id', operatorId);
  params.set('password', password);
  params.set('confirmation', 'ZERAR BANCO');

  closeResetModal();
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao zerar banco');
      statusText.textContent = 'Banco zerado.';
      loadRecords();
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

function resolveVisibleBanks(rows, bank) {
  const banks = {};
  if (bank && bank.operator_id) banks[String(bank.operator_id).trim()] = bank;

  const operatorIds = visibleOperatorIds(rows).filter((operatorId) => !banks[operatorId]);
  if (!operatorIds.length) return Promise.resolve(banks);

  return Promise.all(operatorIds.map((operatorId) => fetchBank(operatorId)))
    .then((bankResults) => {
      bankResults.forEach((item) => {
        if (item && item.operator_id) banks[String(item.operator_id).trim()] = item;
      });
      return banks;
    });
}

function fetchBank(operatorId) {
  const params = new URLSearchParams();
  params.set('action', 'bank');
  params.set('operator_id', operatorId);
  return jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => (data && data.ok ? data.bank : null))
    .catch(() => null);
}

function visibleOperatorIds(rows) {
  return Array.from(new Set(rows
    .map((row) => String(row.operator_id || '').trim())
    .filter(Boolean)));
}

function displayBankForRows(rows, banksByOperator) {
  const ids = visibleOperatorIds(rows);
  return ids.length === 1 ? banksByOperator[ids[0]] || null : null;
}

function normalizeDailyRows(rows) {
  return rows
    .map((row) => ({
      ...row,
      dateObj: parseDate(row.date)
    }))
    .filter((row) => row.dateObj)
    .sort((a, b) => a.dateObj - b.dateObj || String(a.operator_id).localeCompare(String(b.operator_id), 'pt-BR', { numeric: true }));
}

function render(rows, truncated, banksByOperator) {
  const rowsWithAccumulated = withAccumulatedBalance(rows, banksByOperator);
  const summary = rows.reduce((acc, row) => {
    acc.expected += Number(row.expected_minutes || 0);
    acc.worked += Number(row.worked_minutes || 0);
    acc.balance += Number(row.balance_minutes || 0);
    if ((row.warnings || []).length) acc.inconsistencies += 1;
    return acc;
  }, { expected: 0, worked: 0, balance: 0, inconsistencies: 0 });

  totalDays.textContent = rows.length;
  expectedHours.textContent = formatMinutes(summary.expected);
  workedHours.textContent = formatMinutes(summary.worked);
  hourBank.textContent = formatSignedMinutes(summary.balance);
  hourBank.className = summary.balance < 0 ? 'negative' : summary.balance > 0 ? 'positive' : '';
  inconsistencyCount.textContent = summary.inconsistencies;

  recordsBody.innerHTML = rowsWithAccumulated.length
    ? rowsWithAccumulated.map(dailyRow).join('')
    : '<tr><td colspan="13">Nenhum registro encontrado.</td></tr>';
}

function withAccumulatedBalance(rows, banksByOperator) {
  const runningByOperator = {};
  Object.keys(banksByOperator || {}).forEach((operatorId) => {
    runningByOperator[operatorId] = Number(banksByOperator[operatorId].balance_minutes || 0);
  });

  const output = rows.map((row) => ({ ...row, accumulated_balance_minutes: null }));
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const operatorId = String(row.operator_id || '').trim();
    if (!Object.prototype.hasOwnProperty.call(runningByOperator, operatorId)) continue;
    output[index].accumulated_balance_minutes = runningByOperator[operatorId];
    runningByOperator[operatorId] -= Number(row.balance_minutes || 0);
  }
  return output;
}

function dailyRow(row) {
  const statusClass = `status-${String(row.status || 'OK').toLowerCase()}`;
  return `
    <tr class="${statusClass}">
      <td>
        <strong>${escapeHtml(formatDisplayDate(row.date))}</strong>
        <div class="muted">${escapeHtml(row.weekday || '')}${row.holiday ? ` / ${escapeHtml(row.holiday.name)}` : ''}</div>
      </td>
      <td>${escapeHtml(row.operator_id || '-')}</td>
      <td>${escapeHtml(row.collaborator_name || '-')}</td>
      <td>${formatPointCell(row.entrada1)}</td>
      <td>${formatPointCell(row.saida1)}</td>
      <td>${formatPointCell(row.entrada2)}</td>
      <td>${formatPointCell(row.saida2)}</td>
      <td>${formatMinutes(row.expected_minutes || 0)}</td>
      <td>${formatMinutes(row.worked_minutes || 0)}</td>
      <td class="${Number(row.balance_minutes || 0) < 0 ? 'negative' : Number(row.balance_minutes || 0) > 0 ? 'positive' : ''}">${formatSignedMinutes(row.balance_minutes || 0)}</td>
      <td class="${Number(row.accumulated_balance_minutes || 0) < 0 ? 'negative' : Number(row.accumulated_balance_minutes || 0) > 0 ? 'positive' : ''}">${formatOptionalSignedMinutes(row.accumulated_balance_minutes)}</td>
      <td><span class="badge ${statusClass}">${escapeHtml(row.status || 'OK')}</span></td>
      <td>${formatWarnings(row)}</td>
    </tr>
  `;
}

function formatPointCell(point) {
  if (!point) return '-';
  const links = [];
  if (point.maps_url) links.push(`<a href="${escapeAttr(point.maps_url)}" target="_blank" rel="noopener">Mapa</a>`);
  if (point.photo_url) links.push(`<a href="${escapeAttr(point.photo_url)}" target="_blank" rel="noopener">Foto</a>`);
  const flags = [];
  if (point.offline) flags.push('Offline');
  if (point.location_status === 'fora') flags.push('Fora');
  return `
    <div class="pointTime">${escapeHtml(point.time || '')}</div>
    <div class="pointLinks">${links.join(' ')}</div>
    ${flags.length ? `<div class="flags">${escapeHtml(flags.join(', '))}</div>` : ''}
  `;
}

function formatWarnings(row) {
  const warnings = row.warnings || [];
  const extras = row.extras || [];
  if (!warnings.length && !extras.length) return '-';
  const items = warnings.map(labelWarning);
  extras.forEach((point) => items.push(`Extra ${point.event || 'Ponto'} ${point.time || ''}`));
  return items.map((item) => `<div>${escapeHtml(item)}</div>`).join('');
}

function labelWarning(value) {
  const labels = {
    offline: 'Registro offline',
    sem_localizacao: 'Sem localizacao',
    sem_foto: 'Sem foto',
    fora_do_local: 'Fora do local',
    entrada_sem_saida: 'Entrada sem saida',
    saida_sem_entrada: 'Saida sem entrada',
    segunda_entrada_sem_saida: 'Segunda entrada sem saida',
    segunda_saida_sem_entrada: 'Segunda saida sem entrada',
    pontos_extras: 'Mais pontos no dia',
    feriado_trabalhado: 'Feriado trabalhado'
  };
  return labels[value] || value;
}

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDisplayDate(value) {
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

function formatMinutes(minutes) {
  const value = Math.abs(Number(minutes || 0));
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatSignedMinutes(minutes) {
  const value = Number(minutes || 0);
  if (!value) return '00:00';
  return `${value > 0 ? '+' : '-'}${formatMinutes(value)}`;
}

function formatOptionalSignedMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '-';
  return formatSignedMinutes(minutes);
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
