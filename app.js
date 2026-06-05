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
const tabButtons = Array.from(document.querySelectorAll('.tabButton'));
const tabPanels = Array.from(document.querySelectorAll('.tabPanel'));
const knownOperators = document.querySelector('#knownOperators');
const adjustForm = document.querySelector('#adjustForm');
const adjustOperatorInput = document.querySelector('#adjustOperatorInput');
const adjustNameInput = document.querySelector('#adjustNameInput');
const adjustDateInput = document.querySelector('#adjustDateInput');
const adjustPointEventInput = document.querySelector('#adjustPointEventInput');
const adjustPointTimeInput = document.querySelector('#adjustPointTimeInput');
const addAdjustPointButton = document.querySelector('#addAdjustPointButton');
const restartAdjustPointsButton = document.querySelector('#restartAdjustPointsButton');
const adjustPointsList = document.querySelector('#adjustPointsList');
const adjustReasonInput = document.querySelector('#adjustReasonInput');
const adjustRequesterInput = document.querySelector('#adjustRequesterInput');
const adjustStatus = document.querySelector('#adjustStatus');
let activeBankOperatorId = '';
let currentRows = [];
let operatorNames = {};
let adjustmentPoints = [];

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
tabButtons.forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
adjustForm.addEventListener('submit', submitAdjustment);
addAdjustPointButton.addEventListener('click', addAdjustmentPoint);
restartAdjustPointsButton.addEventListener('click', restartAdjustmentPoints);
adjustOperatorInput.addEventListener('change', fillKnownOperatorName);
recordsBody.addEventListener('click', handleRecordAction);

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
      currentRows = filteredRows;
      updateKnownOperators(rows);
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

function activateTab(tabId) {
  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId));
  tabPanels.forEach((panel) => { panel.hidden = panel.id !== tabId; });
}

function renderGeneralBank(bank) {
  activeBankOperatorId = bank && bank.operator_id ? String(bank.operator_id).trim() : '';
  if (!activeBankOperatorId || !bank) {
    generalHourBank.textContent = '--';
    generalHourBank.className = '';
    resetBankButton.disabled = false;
    resetBankButton.title = 'Zerar banco de todos os trabalhadores';
    return;
  }

  generalHourBank.textContent = formatSignedMinutes(bank.balance_minutes || 0);
  generalHourBank.className = Number(bank.balance_minutes || 0) < 0 ? 'negative' : Number(bank.balance_minutes || 0) > 0 ? 'positive' : '';
  resetBankButton.disabled = false;
  resetBankButton.title = 'Zerar banco de todos os trabalhadores';
}

function beginResetBank() {
  const password = prompt('Digite a senha para zerar o banco:');
  if (!password) return;

  resetBankButton.dataset.password = password;
  resetModalText.textContent = 'Confirma zerar o banco geral de todos os trabalhadores? Esta operacao ficara registrada na planilha para cada operador com saldo.';
  resetModal.hidden = false;
}

function closeResetModal() {
  resetBankButton.dataset.password = '';
  resetModal.hidden = true;
}

function confirmResetBank() {
  const password = resetBankButton.dataset.password || '';
  if (!password) {
    closeResetModal();
    return;
  }

  statusText.textContent = 'Zerando banco...';
  const params = new URLSearchParams();
  params.set('action', 'reset_bank');
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
  const typedOperatorId = operatorInput.value.trim();
  if (typedOperatorId && banksByOperator[typedOperatorId]) return banksByOperator[typedOperatorId];

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
    .sort((a, b) => b.dateObj - a.dateObj || String(a.operator_id).localeCompare(String(b.operator_id), 'pt-BR', { numeric: true }));
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
    : '<tr><td colspan="14">Nenhum registro encontrado.</td></tr>';
}

function withAccumulatedBalance(rows, banksByOperator) {
  const runningByOperator = {};
  Object.keys(banksByOperator || {}).forEach((operatorId) => {
    runningByOperator[operatorId] = Number(banksByOperator[operatorId].balance_minutes || 0);
  });

  const output = rows.map((row) => ({ ...row, accumulated_balance_minutes: null }));
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const operatorId = String(row.operator_id || '').trim();
    if (!Object.prototype.hasOwnProperty.call(runningByOperator, operatorId)) continue;
    const bank = banksByOperator[operatorId] || {};
    if (bank.last_reset_date && row.date <= bank.last_reset_date) {
      output[index].accumulated_balance_minutes = 0;
      continue;
    }
    output[index].accumulated_balance_minutes = runningByOperator[operatorId];
    runningByOperator[operatorId] -= Number(row.balance_minutes || 0);
  }
  return output;
}

function dailyRow(row) {
  const statusClass = `status-${String(row.status || 'OK').toLowerCase()}`;
  const adjustedClass = row.adjustment_status ? ` adjusted-row adjustment-${String(row.adjustment_status).toLowerCase()}` : '';
  const pendingAdjustments = (row.adjustments || []).filter((item) => item.status === 'PENDENTE');
  return `
    <tr class="${statusClass}${adjustedClass}">
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
      <td>
        <button type="button" class="smallButton" data-action="edit-point" data-row-key="${escapeAttr(rowKey(row))}">Editar ponto</button>
        ${pendingAdjustments.map((item) => `
          <button type="button" class="smallButton approveButton" data-action="approve-adjustment" data-adjustment-id="${escapeAttr(item.id)}">Aprovar ajuste</button>
          <button type="button" class="smallButton rejectButton" data-action="reject-adjustment" data-adjustment-id="${escapeAttr(item.id)}">Recusar</button>
        `).join('')}
      </td>
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
  if (point.manual_adjustment) flags.push('Ajuste');
  return `
    <div class="pointTime">${escapeHtml(point.time || '')}</div>
    <div class="pointLinks">${links.join(' ')}</div>
    ${flags.length ? `<div class="flags">${escapeHtml(flags.join(', '))}</div>` : ''}
  `;
}

function formatWarnings(row) {
  const warnings = row.warnings || [];
  const extras = row.extras || [];
  if (!warnings.length && !extras.length && !(row.adjustments || []).length) return '-';
  const hasDetailedAdjustments = (row.adjustments || []).length > 0;
  const items = warnings
    .filter((warning) => !hasDetailedAdjustments || !['ajuste_pendente', 'ajuste_aprovado', 'ajuste_recusado'].includes(warning))
    .map(labelWarning);
  extras.forEach((point) => items.push(`Extra ${point.event || 'Ponto'} ${point.time || ''}`));
  (row.adjustments || []).forEach((adjustment) => {
    const status = adjustment.status === 'APROVADO' ? 'Ajuste aprovado' : adjustment.status === 'RECUSADO' ? 'Ajuste recusado' : 'Ajuste pendente';
    items.push(`${status}: ${adjustment.points_summary || pointsSummary(adjustment.points || [])}`);
  });
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
    feriado_trabalhado: 'Feriado trabalhado',
    ajuste_pendente: 'Ajuste pendente',
    ajuste_aprovado: 'Ajuste aprovado',
    ajuste_recusado: 'Ajuste recusado'
  };
  return labels[value] || value;
}

function updateKnownOperators(rows) {
  operatorNames = {};
  rows.forEach((row) => {
    const id = String(row.operator_id || '').trim();
    if (id && row.collaborator_name && row.collaborator_name !== '-') operatorNames[id] = row.collaborator_name;
  });
  knownOperators.innerHTML = Object.keys(operatorNames)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
    .map((id) => `<option value="${escapeAttr(id)}">${escapeHtml(operatorNames[id])}</option>`)
    .join('');
}

function fillKnownOperatorName() {
  const name = operatorNames[adjustOperatorInput.value.trim()];
  if (!name) return;
  if (!adjustNameInput.value.trim()) adjustNameInput.value = name;
}

function handleRecordAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit-point') openAdjustmentForRow(button.dataset.rowKey);
  if (button.dataset.action === 'approve-adjustment') approveAdjustment(button.dataset.adjustmentId);
  if (button.dataset.action === 'reject-adjustment') rejectAdjustment(button.dataset.adjustmentId);
}

function openAdjustmentForRow(key) {
  const row = currentRows.find((item) => rowKey(item) === key);
  if (!row) return;
  adjustOperatorInput.value = row.operator_id || '';
  adjustNameInput.value = row.collaborator_name || '';
  adjustDateInput.value = row.date || '';
  adjustReasonInput.value = '';
  adjustPointTimeInput.value = '';
  restartAdjustmentPoints();
  activateTab('adjustPanel');
}

function rowKey(row) {
  return `${row.date}|${row.operator_id}`;
}

function addAdjustmentPoint() {
  const event = adjustPointEventInput.value;
  const time = adjustPointTimeInput.value;
  if (!time) {
    adjustStatus.textContent = 'Informe o horario do ponto.';
    return;
  }
  const nextPoints = adjustmentPoints.concat({ event, time }).sort((a, b) => timeToSortable(a.time) - timeToSortable(b.time));
  const validation = validateAdjustmentSequence(nextPoints);
  if (!validation.ok) {
    adjustStatus.textContent = validation.error;
    return;
  }
  adjustmentPoints = nextPoints;
  adjustPointTimeInput.value = '';
  adjustPointEventInput.value = adjustmentPoints.length % 2 === 0 ? 'Entrada' : 'Saida';
  adjustStatus.textContent = '';
  renderAdjustmentPoints();
}

function restartAdjustmentPoints() {
  adjustmentPoints = [];
  renderAdjustmentPoints();
}

function renderAdjustmentPoints() {
  if (!adjustmentPoints.length) {
    adjustPointsList.textContent = 'Nenhum ponto incluido.';
    return;
  }
  adjustPointsList.innerHTML = adjustmentPoints
    .map((point, index) => `
      <div class="pointDraft">
        <span>${index + 1}. ${escapeHtml(point.event)} ${escapeHtml(point.time)}</span>
        <button type="button" class="smallButton secondaryButton" data-remove-adjust-point="${index}">Remover</button>
      </div>
    `)
    .join('');
  adjustPointsList.querySelectorAll('[data-remove-adjust-point]').forEach((button) => {
    button.addEventListener('click', () => {
      adjustmentPoints.splice(Number(button.dataset.removeAdjustPoint), 1);
      renderAdjustmentPoints();
    });
  });
}

function pointsSummary(points) {
  return (points || []).map((point, index) => `${index + 1}. ${point.event} ${point.time}`).join(' | ');
}

function validateAdjustmentSequence(points) {
  const sorted = (points || []).slice().sort((a, b) => timeToSortable(a.time) - timeToSortable(b.time));
  const usedTimes = {};
  for (let index = 0; index < sorted.length; index += 1) {
    const point = sorted[index];
    const expectedEvent = index % 2 === 0 ? 'Entrada' : 'Saida';
    if (usedTimes[point.time]) return { ok: false, error: 'Ja existe um ponto nesse horario.' };
    if (point.event !== expectedEvent) {
      return { ok: false, error: `A sequencia deve alternar Entrada e Saida. O ponto ${index + 1} deve ser ${expectedEvent}.` };
    }
    usedTimes[point.time] = true;
  }
  return { ok: true };
}

function originalDaySummary(row) {
  if (!row) return '';
  return ['entrada1', 'saida1', 'entrada2', 'saida2']
    .map((slot) => row[slot] ? `${slot}: ${row[slot].time}` : '')
    .filter(Boolean)
    .concat((row.extras || []).map((point) => `extra ${point.event || 'Ponto'}: ${point.time || ''}`))
    .join(' | ');
}

function timeToSortable(time) {
  const parts = String(time || '00:00').split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function submitAdjustment(event) {
  event.preventDefault();
  if (!adjustmentPoints.length) {
    adjustStatus.textContent = 'Inclua pelo menos um ponto ajustado.';
    return;
  }
  const validation = validateAdjustmentSequence(adjustmentPoints);
  if (!validation.ok) {
    adjustStatus.textContent = validation.error;
    return;
  }
  const row = currentRows.find((item) => item.date === adjustDateInput.value && String(item.operator_id) === String(adjustOperatorInput.value.trim()));
  const params = new URLSearchParams();
  params.set('action', 'request_adjustment');
  params.set('operator_id', adjustOperatorInput.value.trim());
  params.set('collaborator_name', adjustNameInput.value.trim());
  params.set('date', adjustDateInput.value);
  params.set('points_json', JSON.stringify(adjustmentPoints));
  params.set('reason', adjustReasonInput.value.trim());
  params.set('requester', adjustRequesterInput.value.trim());
  params.set('original_summary', originalDaySummary(row));

  adjustStatus.textContent = 'Enviando ajuste...';
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao solicitar ajuste');
      adjustStatus.textContent = 'Ajuste enviado para aprovacao.';
      adjustForm.reset();
      restartAdjustmentPoints();
      loadRecords();
      activateTab('historyPanel');
    })
    .catch((error) => {
      adjustStatus.textContent = `Erro: ${error.message}`;
    });
}

function rejectAdjustment(adjustmentId) {
  const password = prompt('Digite a senha para recusar o ajuste:');
  if (!password) return;
  const rejecter = prompt('Responsavel pela recusa:') || 'Site';
  const note = prompt('Motivo da recusa:') || '';
  const params = new URLSearchParams();
  params.set('action', 'reject_adjustment');
  params.set('adjustment_id', adjustmentId);
  params.set('password', password);
  params.set('rejecter', rejecter);
  params.set('note', note);
  statusText.textContent = 'Recusando ajuste...';
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao recusar ajuste');
      statusText.textContent = 'Ajuste recusado.';
      loadRecords();
    })
    .catch((error) => {
      statusText.textContent = `Erro: ${error.message}`;
    });
}

function approveAdjustment(adjustmentId) {
  const password = prompt('Digite a senha para aprovar o ajuste:');
  if (!password) return;
  const approver = prompt('Responsavel pela aprovacao:') || 'Site';
  const params = new URLSearchParams();
  params.set('action', 'approve_adjustment');
  params.set('adjustment_id', adjustmentId);
  params.set('password', password);
  params.set('approver', approver);
  statusText.textContent = 'Aprovando ajuste...';
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao aprovar ajuste');
      statusText.textContent = 'Ajuste aprovado.';
      loadRecords();
    })
    .catch((error) => {
      statusText.textContent = `Erro: ${error.message}`;
    });
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
