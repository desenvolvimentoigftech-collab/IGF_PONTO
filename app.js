const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxAxUus03Hx0Q6B7NIDDM1-lYn2hmcyq1flfl6DEY0HCsPa2uq6iWuYLz2XKexsNmGs/exec';
const COMPANY_NAME = 'Igf Servicos Engenharia E Consultoria Ltda';
const COMPANY_CNPJ = '29.752.156.0001/00';

const operatorInput = document.querySelector('#operatorInput');
const fromInput = document.querySelector('#fromInput');
const toInput = document.querySelector('#toInput');
const statusInput = document.querySelector('#statusInput');
const exportButton = document.querySelector('#exportButton');
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
const exportModal = document.querySelector('#exportModal');
const exportModalText = document.querySelector('#exportModalText');
const confirmExportButton = document.querySelector('#confirmExportButton');
const cancelExportButton = document.querySelector('#cancelExportButton');
const exportKindInputs = Array.from(document.querySelectorAll('input[name="exportKind"]'));
const exportModeInputs = Array.from(document.querySelectorAll('input[name="exportMode"]'));
const exportDayInput = document.querySelector('#exportDayInput');
const exportFromInput = document.querySelector('#exportFromInput');
const exportToInput = document.querySelector('#exportToInput');
const exportDayLabel = document.querySelector('#exportDayLabel');
const exportFromLabel = document.querySelector('#exportFromLabel');
const exportToLabel = document.querySelector('#exportToLabel');
const individualExportFields = document.querySelector('#individualExportFields');
const exportCollaboratorInput = document.querySelector('#exportCollaboratorInput');
const exportMonthInput = document.querySelector('#exportMonthInput');
const tabButtons = Array.from(document.querySelectorAll('.tabButton'));
const tabPanels = Array.from(document.querySelectorAll('.tabPanel'));
const knownOperators = document.querySelector('#knownOperators');
const unlockRegisterButton = document.querySelector('#unlockRegisterButton');
const registerStatus = document.querySelector('#registerStatus');
const registerLocked = document.querySelector('#registerLocked');
const registerContent = document.querySelector('#registerContent');
const collaboratorsBody = document.querySelector('#collaboratorsBody');
const collaboratorForm = document.querySelector('#collaboratorForm');
const collaboratorIdInput = document.querySelector('#collaboratorIdInput');
const collaboratorNameInput = document.querySelector('#collaboratorNameInput');
const collaboratorRoleInput = document.querySelector('#collaboratorRoleInput');
const collaboratorPisInput = document.querySelector('#collaboratorPisInput');
const collaboratorCtpsInput = document.querySelector('#collaboratorCtpsInput');
const collaboratorCtpsSeriesInput = document.querySelector('#collaboratorCtpsSeriesInput');
const collaboratorAdmissionInput = document.querySelector('#collaboratorAdmissionInput');
const collaboratorActiveInput = document.querySelector('#collaboratorActiveInput');
const collaboratorNotesInput = document.querySelector('#collaboratorNotesInput');
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
const adjustSubmitButton = document.querySelector('#adjustSubmitButton');
let activeBankOperatorId = '';
let currentRows = [];
let operatorNames = {};
let adjustmentPoints = [];
let directEditMode = false;
let registerPassword = '';
let collaborators = [];

const today = new Date();
fromInput.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
toInput.value = today.toISOString().slice(0, 10);

refreshButton.addEventListener('click', loadRecords);
exportButton.addEventListener('click', openExportModal);
[operatorInput, fromInput, toInput, statusInput].forEach((input) => {
  input.addEventListener('change', loadRecords);
});
resetBankButton.addEventListener('click', beginResetBank);
confirmResetBankButton.addEventListener('click', confirmResetBank);
cancelResetBankButton.addEventListener('click', closeResetModal);
confirmExportButton.addEventListener('click', confirmExport);
cancelExportButton.addEventListener('click', closeExportModal);
exportKindInputs.forEach((input) => input.addEventListener('change', updateExportFields));
exportModeInputs.forEach((input) => input.addEventListener('change', updateExportFields));
tabButtons.forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.tab === 'adjustPanel') setAdjustmentMode(false);
  if (button.dataset.tab === 'registerPanel' && registerPassword) loadCollaborators();
  activateTab(button.dataset.tab);
}));
unlockRegisterButton.addEventListener('click', unlockRegister);
collaboratorsBody.addEventListener('click', handleCollaboratorAction);
collaboratorForm.addEventListener('submit', saveCollaborator);
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

function openExportModal() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  exportDayInput.value = dateInputValue(now);
  exportFromInput.value = dateInputValue(firstDay);
  exportToInput.value = dateInputValue(lastDay);
  exportMonthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  populateExportCollaborators();
  exportModal.hidden = false;
  updateExportFields();
}

function closeExportModal() {
  exportModal.hidden = true;
}

function updateExportFields() {
  const isIndividual = selectedExportKind() === 'individual';
  const mode = selectedExportMode();
  individualExportFields.hidden = !isIndividual;
  exportModeInputs.forEach((input) => { input.closest('label').hidden = isIndividual; });
  exportDayLabel.hidden = isIndividual || mode !== 'day';
  exportFromLabel.hidden = isIndividual || mode !== 'period';
  exportToLabel.hidden = isIndividual || mode !== 'period';
  exportModalText.textContent = isIndividual
    ? 'A folha individual exige senha para buscar dados cadastrais e gera um XLS mensal do funcionario.'
    : operatorInput.value.trim()
      ? `A exportacao sera filtrada pelo operador ${operatorInput.value.trim()}.`
      : 'A exportacao incluira todos os operadores do periodo selecionado.';
}

function selectedExportKind() {
  const selected = exportKindInputs.find((input) => input.checked);
  return selected ? selected.value : 'simple';
}

function selectedExportMode() {
  const selected = exportModeInputs.find((input) => input.checked);
  return selected ? selected.value : 'month';
}

function resolveExportRange() {
  const mode = selectedExportMode();
  const now = new Date();
  if (mode === 'month') {
    const fromDate = dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
    const toDate = dateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { ok: true, fromDate, toDate, label: `MES ATUAL - ${monthName(now)} ${now.getFullYear()}` };
  }
  if (mode === 'day') {
    if (!exportDayInput.value) return { ok: false, error: 'Informe o dia para exportar.' };
    return { ok: true, fromDate: exportDayInput.value, toDate: exportDayInput.value, label: `DIA ${formatDisplayDate(exportDayInput.value)}` };
  }
  if (!exportFromInput.value || !exportToInput.value) return { ok: false, error: 'Informe as datas De e Ate.' };
  if (exportFromInput.value > exportToInput.value) return { ok: false, error: 'A data De nao pode ser maior que a data Ate.' };
  return {
    ok: true,
    fromDate: exportFromInput.value,
    toDate: exportToInput.value,
    label: `PERIODO ${formatDisplayDate(exportFromInput.value)} A ${formatDisplayDate(exportToInput.value)}`
  };
}

function confirmExport() {
  if (selectedExportKind() === 'individual') {
    confirmIndividualExport();
    return;
  }
  const range = resolveExportRange();
  if (!range.ok) {
    exportModalText.textContent = range.error;
    return;
  }

  const params = new URLSearchParams();
  params.set('action', 'list');
  params.set('from', `${range.fromDate} 00:00:00`);
  params.set('to', `${range.toDate} 23:59:59`);
  params.set('max', '5000');
  if (operatorInput.value.trim()) params.set('operator_id', operatorInput.value.trim());

  statusText.textContent = 'Exportando planilha...';
  confirmExportButton.disabled = true;
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      const rows = normalizeDailyRows(data.daily_rows || []).reverse();
      exportRowsToXls(rows, range, data.summary || {});
      closeExportModal();
      statusText.textContent = `Planilha exportada com ${rows.length} dia(s).`;
    })
    .catch((error) => {
      exportModalText.textContent = `Erro: ${error.message}`;
      statusText.textContent = `Erro: ${error.message}`;
    })
    .finally(() => {
      confirmExportButton.disabled = false;
    });
}

function confirmIndividualExport() {
  const operatorId = exportCollaboratorInput.value;
  const month = exportMonthInput.value;

  if (!operatorId) {
    exportModalText.textContent = 'Selecione o funcionario.';
    return;
  }

  if (!month) {
    exportModalText.textContent = 'Selecione o mes.';
    return;
  }

  const password = prompt('Digite a senha para exportar a folha individual:');
  if (!password) return;

  const params = new URLSearchParams();
  params.set('action', 'generate_individual_sheet');
  params.set('operator_id', operatorId);
  params.set('month_key', month);
  params.set('password', password);

  statusText.textContent = 'Gerando folha individual pelo modelo...';
  confirmExportButton.disabled = true;

  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao gerar folha individual');

      closeExportModal();
      statusText.innerHTML = `Folha individual gerada: <a href="${data.sheet_url}" target="_blank" rel="noopener">abrir planilha</a>`;
      window.open(data.sheet_url, '_blank');
    })
    .catch((error) => {
      exportModalText.textContent = `Erro: ${error.message}`;
      statusText.textContent = `Erro: ${error.message}`;
    })
    .finally(() => {
      confirmExportButton.disabled = false;
    });
}

function exportRowsToXls(rows, range, summary) {
  const generatedAt = new Date().toLocaleString('pt-BR');
  const operatorFilter = operatorInput.value.trim() || 'Todos';
  const bodyRows = rows.length ? rows.map((row) => `
    <tr>
      <td>${escapeHtml(formatDisplayDate(row.date))}</td>
      <td>${escapeHtml(row.weekday || '')}${row.holiday ? ` / FERIADO - ${escapeHtml(row.holiday.name)}` : ''}</td>
      <td>${escapeHtml(row.operator_id || '')}</td>
      <td>${escapeHtml(row.collaborator_name || '')}</td>
      <td>${escapeHtml(pointExportText(row.entrada1))}</td>
      <td>${escapeHtml(pointExportText(row.saida1))}</td>
      <td>${escapeHtml(pointExportText(row.entrada2))}</td>
      <td>${escapeHtml(pointExportText(row.saida2))}</td>
      <td>${escapeHtml(formatMinutes(row.expected_minutes || 0))}</td>
      <td>${escapeHtml(formatMinutes(row.worked_minutes || 0))}</td>
      <td>${escapeHtml(formatSignedMinutes(row.balance_minutes || 0))}</td>
      <td>${escapeHtml(row.status || '')}</td>
      <td>${escapeHtml(warningsText(row))}</td>
    </tr>
  `).join('') : '<tr><td colspan="13">Nenhum registro encontrado.</td></tr>';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #999; padding: 6px; vertical-align: top; }
      th { background: #383838; color: #fff; }
      .title { font-weight: bold; text-align: center; font-size: 16px; }
    </style>
  </head>
  <body>
    <table>
      <tr><td class="title" colspan="13">FOLHA DE PONTO - ${escapeHtml(range.label)}</td></tr>
      <tr><td colspan="2">Gerado em</td><td colspan="4">${escapeHtml(generatedAt)}</td><td colspan="2">Operador</td><td colspan="5">${escapeHtml(operatorFilter)}</td></tr>
      <tr><td colspan="2">Periodo</td><td colspan="4">${escapeHtml(formatDisplayDate(range.fromDate))} a ${escapeHtml(formatDisplayDate(range.toDate))}</td><td colspan="2">Dias</td><td colspan="5">${escapeHtml(String(rows.length))}</td></tr>
      <tr><td colspan="2">Total previsto</td><td>${escapeHtml(formatMinutes(summary.expected_minutes || 0))}</td><td colspan="2">Total trabalhado</td><td>${escapeHtml(formatMinutes(summary.worked_minutes || 0))}</td><td colspan="2">Banco</td><td colspan="5">${escapeHtml(formatSignedMinutes(summary.balance_minutes || 0))}</td></tr>
      <tr>
        <th>Data</th>
        <th>Dia</th>
        <th>Operador</th>
        <th>Nome</th>
        <th>Entrada 1</th>
        <th>Saida 1</th>
        <th>Entrada 2</th>
        <th>Saida 2</th>
        <th>Previsto</th>
        <th>Trabalhado</th>
        <th>Saldo</th>
        <th>Status</th>
        <th>Ocorrencias</th>
      </tr>
      ${bodyRows}
    </table>
  </body>
</html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `folha_ponto_${range.fromDate}_${range.toDate}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportIndividualSheetToXls(rows, collaborator, month) {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const rowsByDay = {};
  rows.forEach((row) => {
    const day = Number(String(row.date || '').slice(8, 10));
    if (day) rowsByDay[day] = row;
  });

  const dayRows = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const row = rowsByDay[day] || null;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const label = date.getDay() === 0 ? 'DOMINGO' : date.getDay() === 6 ? 'SABADO' : '';
    dayRows.push(`
      <tr class="${weekend ? 'weekend' : ''}">
        <td>${day}</td>
        <td>${escapeHtml(weekend && !row ? label : pointExportText(row && row.entrada1))}</td>
        <td>${escapeHtml(pointExportText(row && row.saida1))}</td>
        <td>${escapeHtml(pointExportText(row && row.entrada2))}</td>
        <td>${escapeHtml(pointExportText(row && row.saida2))}</td>
        <td>${row ? formatMinutes(row.worked_minutes || 0) : ''}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `);
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, Helvetica, sans-serif; }
      table { border-collapse: collapse; width: 980px; table-layout: fixed; }
      td, th { border: 1px solid #000; padding: 4px; font-size: 11px; vertical-align: middle; }
      .title { font-size: 22px; font-weight: 700; text-align: center; border: 0; padding: 14px; }
      .label { font-size: 9px; color: #222; }
      .value { font-size: 13px; font-weight: 700; }
      .center { text-align: center; }
      .head { background: #f2f2f2; font-weight: 700; text-align: center; }
      .weekend td { background: #bfbfbf; text-align: center; }
      .signature { height: 26px; }
    </style>
  </head>
  <body>
    <table>
      <colgroup>
        <col style="width: 46px"><col style="width: 100px"><col style="width: 100px"><col style="width: 100px"><col style="width: 100px">
        <col style="width: 80px"><col style="width: 80px"><col style="width: 80px"><col style="width: 80px"><col style="width: 214px">
      </colgroup>
      <tr><td class="title" colspan="10">FOLHA DE PONTO INDIVIDUAL DE TRABALHO</td></tr>
      <tr>
        <td colspan="7"><div class="label">EMPREGADOR / NOME - EMPRESA:</div><div class="value">${escapeHtml(COMPANY_NAME)}</div></td>
        <td colspan="3"><div class="label">CNPJ:</div><div class="value center">${escapeHtml(COMPANY_CNPJ)}</div></td>
      </tr>
      <tr>
        <td colspan="5"><div class="label">EMPREGADO(A):</div><div class="value">${escapeHtml(collaborator.name || '')}</div></td>
        <td colspan="2"><div class="label">ID OPERADOR:</div><div class="value center">${escapeHtml(collaborator.operator_id || '')}</div></td>
        <td colspan="3"><div class="label">DATA DE ADMISSAO:</div><div class="value center">${escapeHtml(formatDisplayDateOrEmpty(collaborator.admission_date))}</div></td>
      </tr>
      <tr>
        <td colspan="4"><div class="label">FUNCAO:</div><div class="value">${escapeHtml(collaborator.role || '')}</div></td>
        <td colspan="2"><div class="label">PIS:</div><div class="value center">${escapeHtml(collaborator.pis || '')}</div></td>
        <td colspan="2"><div class="label">CTPS / SERIE:</div><div class="value center">${escapeHtml([collaborator.ctps, collaborator.ctps_series].filter(Boolean).join(' / '))}</div></td>
        <td><div class="label">MES:</div><div class="value center">${escapeHtml(monthName(new Date(year, monthIndex, 1)))}</div></td>
        <td><div class="label">ANO:</div><div class="value center">${year}</div></td>
      </tr>
      <tr>
        <th rowspan="2" class="head">DIAS</th>
        <th class="head">ENTRADA</th>
        <th colspan="2" class="head">ALMOCO</th>
        <th class="head">SAIDA</th>
        <th class="head">TOTAL HS</th>
        <th colspan="2" class="head">EXTRAS</th>
        <th class="head">TOTAL HS</th>
        <th rowspan="2" class="head">ASSINATURA OU VISTO DO(A) EMPREGADO(A)</th>
      </tr>
      <tr>
        <th class="head">MANHA</th>
        <th class="head">SAIDA</th>
        <th class="head">RETORNO</th>
        <th class="head">TARDE</th>
        <th class="head">NORMAIS</th>
        <th class="head">ENTRADA</th>
        <th class="head">SAIDA</th>
        <th class="head">EXTRAS</th>
      </tr>
      ${dayRows.join('')}
      <tr><td colspan="10" class="signature">Assinatura do empregado: ________________________________________________</td></tr>
    </table>
  </body>
</html>`;
  downloadHtmlAsXls(html, `folha_individual_${collaborator.operator_id || 'operador'}_${month}.xls`);
}

function downloadHtmlAsXls(html, filename) {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
        <div class="actionStack">
          <button type="button" class="smallButton" data-action="edit-point" data-row-key="${escapeAttr(rowKey(row))}">Editar ponto</button>
          <button type="button" class="smallButton rejectButton" data-action="delete-point-day" data-row-key="${escapeAttr(rowKey(row))}">Excluir ponto</button>
        </div>
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
  return warningItems(row).map((item) => `<div>${escapeHtml(item)}</div>`).join('') || '-';
}

function warningsText(row) {
  return warningItems(row).join(' | ') || '-';
}

function warningItems(row) {
  const warnings = row.warnings || [];
  const extras = row.extras || [];
  if (!warnings.length && !extras.length && !(row.adjustments || []).length) return [];
  const hasDetailedAdjustments = (row.adjustments || []).length > 0;
  const items = warnings
    .filter((warning) => !hasDetailedAdjustments || !['ajuste_pendente', 'ajuste_aprovado', 'ajuste_recusado'].includes(warning))
    .map(labelWarning);
  extras.forEach((point) => items.push(`Extra ${point.event || 'Ponto'} ${point.time || ''}`));
  (row.adjustments || []).forEach((adjustment) => {
    const status = adjustment.status === 'APROVADO' ? 'Ajuste aprovado' : adjustment.status === 'RECUSADO' ? 'Ajuste recusado' : 'Ajuste pendente';
    items.push(`${status}: ${adjustment.points_summary || pointsSummary(adjustment.points || [])}`);
  });
  return items;
}

function pointExportText(point) {
  if (!point) return '';
  const flags = [];
  if (point.manual_adjustment) flags.push('ajuste');
  if (point.offline) flags.push('offline');
  if (point.location_status === 'fora') flags.push('fora do local');
  return flags.length ? `${point.time || ''} (${flags.join(', ')})` : point.time || '';
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
  populateExportCollaborators();
}

function populateExportCollaborators() {
  const byId = {};
  Object.keys(operatorNames).forEach((id) => {
    byId[id] = { operator_id: id, name: operatorNames[id] };
  });
  collaborators.forEach((item) => {
    if (item.operator_id) byId[item.operator_id] = item;
  });
  const current = exportCollaboratorInput.value || operatorInput.value.trim();
  exportCollaboratorInput.innerHTML = Object.keys(byId)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
    .map((id) => {
      const item = byId[id];
      const name = item.name || operatorNames[id] || '';
      return `<option value="${escapeAttr(id)}">${escapeHtml(id)} - ${escapeHtml(name || 'Sem nome')}</option>`;
    })
    .join('');
  if (current && byId[current]) exportCollaboratorInput.value = current;
}

function unlockRegister() {
  const password = prompt('Digite a senha para acessar cadastros:');
  if (!password) return;
  registerPassword = password;
  loadCollaborators();
}

function fetchCollaborators(password) {
  const params = new URLSearchParams();
  params.set('action', 'list_collaborators');
  params.set('password', password);
  return jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao carregar colaboradores');
      return data.collaborators || [];
    });
}

function loadCollaborators() {
  if (!registerPassword) return;
  registerStatus.textContent = 'Carregando cadastros...';
  fetchCollaborators(registerPassword)
    .then((items) => {
      collaborators = items;
      renderCollaborators();
      populateExportCollaborators();
      registerLocked.hidden = true;
      registerContent.hidden = false;
      registerStatus.textContent = `Cadastros carregados: ${items.length}`;
    })
    .catch((error) => {
      registerPassword = '';
      registerLocked.hidden = false;
      registerContent.hidden = true;
      registerStatus.textContent = `Erro: ${error.message}`;
    });
}

function renderCollaborators() {
  collaboratorsBody.innerHTML = collaborators.length
    ? collaborators.map((item) => `
      <tr>
        <td>${escapeHtml(item.operator_id || '')}</td>
        <td>${escapeHtml(item.name || '-')}</td>
        <td>${escapeHtml(item.role || '-')}</td>
        <td>${escapeHtml(item.pis || '-')}</td>
        <td>${escapeHtml(item.active || 'SIM')}</td>
        <td><button type="button" class="smallButton" data-collaborator-id="${escapeAttr(item.operator_id)}">Editar</button></td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">Nenhum colaborador cadastrado.</td></tr>';
}

function handleCollaboratorAction(event) {
  const button = event.target.closest('[data-collaborator-id]');
  if (!button) return;
  const item = collaborators.find((collaborator) => String(collaborator.operator_id) === String(button.dataset.collaboratorId));
  if (!item) return;
  collaboratorIdInput.value = item.operator_id || '';
  collaboratorNameInput.value = item.name || '';
  collaboratorRoleInput.value = item.role || '';
  collaboratorPisInput.value = item.pis || '';
  collaboratorCtpsInput.value = item.ctps || '';
  collaboratorCtpsSeriesInput.value = item.ctps_series || '';
  collaboratorAdmissionInput.value = item.admission_date || '';
  collaboratorActiveInput.value = item.active || 'SIM';
  collaboratorNotesInput.value = item.notes || '';
  registerStatus.textContent = `Editando operador ${item.operator_id}`;
}

function saveCollaborator(event) {
  event.preventDefault();
  if (!registerPassword) {
    registerStatus.textContent = 'Informe a senha antes de salvar.';
    return;
  }
  if (!collaboratorIdInput.value.trim()) {
    registerStatus.textContent = 'Selecione um colaborador para editar.';
    return;
  }
  const params = new URLSearchParams();
  params.set('action', 'save_collaborator');
  params.set('password', registerPassword);
  params.set('operator_id', collaboratorIdInput.value.trim());
  params.set('name', collaboratorNameInput.value.trim());
  params.set('role', collaboratorRoleInput.value.trim());
  params.set('pis', collaboratorPisInput.value.trim());
  params.set('ctps', collaboratorCtpsInput.value.trim());
  params.set('ctps_series', collaboratorCtpsSeriesInput.value.trim());
  params.set('admission_date', collaboratorAdmissionInput.value);
  params.set('active', collaboratorActiveInput.value);
  params.set('notes', collaboratorNotesInput.value.trim());

  registerStatus.textContent = 'Salvando cadastro...';
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao salvar cadastro');
      registerStatus.textContent = 'Cadastro salvo.';
      loadCollaborators();
    })
    .catch((error) => {
      registerStatus.textContent = `Erro: ${error.message}`;
    });
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
  if (button.dataset.action === 'delete-point-day') deletePointDay(button.dataset.rowKey);
  if (button.dataset.action === 'approve-adjustment') approveAdjustment(button.dataset.adjustmentId);
  if (button.dataset.action === 'reject-adjustment') rejectAdjustment(button.dataset.adjustmentId);
}

function openAdjustmentForRow(key) {
  const row = currentRows.find((item) => rowKey(item) === key);
  if (!row) return;
  setAdjustmentMode(true);
  adjustOperatorInput.value = row.operator_id || '';
  adjustNameInput.value = row.collaborator_name || '';
  adjustDateInput.value = row.date || '';
  adjustReasonInput.value = 'Edicao direta do ponto';
  adjustRequesterInput.value = '';
  adjustPointTimeInput.value = '';
  adjustmentPoints = pointsFromRow(row);
  adjustPointEventInput.value = adjustmentPoints.length % 2 === 0 ? 'Entrada' : 'Saida';
  renderAdjustmentPoints();
  adjustStatus.textContent = 'Edicao direta: ao salvar, a senha sera solicitada e o dia sera alterado imediatamente.';
  activateTab('adjustPanel');
}

function setAdjustmentMode(isDirect) {
  directEditMode = isDirect;
  adjustSubmitButton.textContent = isDirect ? 'Salvar edicao com senha' : 'Enviar dia ajustado';
  if (!isDirect) adjustStatus.textContent = 'Pronto';
}

function rowKey(row) {
  return `${row.date}|${row.operator_id}`;
}

function deletePointDay(key) {
  const row = currentRows.find((item) => rowKey(item) === key);
  if (!row) return;
  const label = `${formatDisplayDate(row.date)} - operador ${row.operator_id || '-'}`;
  const confirmed = confirm(`Excluir o ponto/dia ${label}? Depois da senha, as linhas originais desse dia serao removidas da aba Registros e o dia desaparecera do historico/banco.`);
  if (!confirmed) return;
  const password = prompt('Digite a senha para excluir o ponto:');
  if (!password) return;
  const approver = prompt('Responsavel pela exclusao:') || 'Site';
  const params = new URLSearchParams();
  params.set('action', 'direct_adjustment');
  params.set('operator_id', row.operator_id || '');
  params.set('collaborator_name', row.collaborator_name || '');
  params.set('date', row.date || '');
  params.set('points_json', '[]');
  params.set('reason', 'Exclusao direta do ponto/dia');
  params.set('requester', approver);
  params.set('approver', approver);
  params.set('password', password);
  params.set('original_summary', originalDaySummary(row));

  statusText.textContent = 'Excluindo ponto...';
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || 'Falha ao excluir ponto');
      statusText.textContent = `Ponto excluido. Linhas removidas: ${data.deleted_records || 0}.`;
      setTimeout(() => window.location.reload(), 500);
    })
    .catch((error) => {
      statusText.textContent = `Erro: ${error.message}`;
    });
}

function pointsFromRow(row) {
  return ['entrada1', 'saida1', 'entrada2', 'saida2']
    .map((slot) => row[slot])
    .filter(Boolean)
    .concat(row.extras || [])
    .map((point) => ({
      event: normalizePointEvent(point.event),
      time: point.time || ''
    }))
    .filter((point) => point.event && point.time)
    .sort((a, b) => timeToSortable(a.time) - timeToSortable(b.time));
}

function normalizePointEvent(value) {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (text.includes('saida')) return 'Saida';
  return 'Entrada';
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
  if (!(points || []).length) return 'Sem pontos - excluir dia do calculo';
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
  const validation = validateAdjustmentSequence(adjustmentPoints);
  if (!validation.ok) {
    adjustStatus.textContent = validation.error;
    return;
  }
  if (!adjustmentPoints.length) {
    const emptyMessage = directEditMode
      ? 'Voce esta salvando esta edicao sem nenhum ponto. Depois da senha, todos os pontos desse dia para este colaborador deixam de valer no calculo e o dia sera excluido do historico/banco. Deseja continuar?'
      : 'Voce esta enviando este ajuste sem nenhum ponto. Se ele for aprovado, todos os pontos desse dia para este colaborador deixam de valer no calculo e o dia sera excluido do historico/banco. Deseja continuar?';
    const confirmed = confirm(emptyMessage);
    if (!confirmed) {
      adjustStatus.textContent = 'Envio vazio cancelado.';
      return;
    }
  }
  const password = directEditMode ? prompt('Digite a senha para salvar a edicao direta:') : '';
  if (directEditMode && !password) return;
  const row = currentRows.find((item) => item.date === adjustDateInput.value && String(item.operator_id) === String(adjustOperatorInput.value.trim()));
  const params = new URLSearchParams();
  params.set('action', directEditMode ? 'direct_adjustment' : 'request_adjustment');
  params.set('operator_id', adjustOperatorInput.value.trim());
  params.set('collaborator_name', adjustNameInput.value.trim());
  params.set('date', adjustDateInput.value);
  params.set('points_json', JSON.stringify(adjustmentPoints));
  params.set('reason', adjustReasonInput.value.trim());
  params.set('requester', adjustRequesterInput.value.trim());
  params.set('approver', adjustRequesterInput.value.trim() || 'Site');
  if (directEditMode) params.set('password', password);
  params.set('original_summary', originalDaySummary(row));

  adjustStatus.textContent = directEditMode ? 'Salvando edicao...' : 'Enviando ajuste...';
  jsonp(`${DEFAULT_SCRIPT_URL}?${params.toString()}`)
    .then((data) => {
      if (!data.ok) throw new Error(data.error || (directEditMode ? 'Falha ao salvar edicao' : 'Falha ao solicitar ajuste'));
      adjustStatus.textContent = directEditMode ? 'Edicao aplicada.' : 'Ajuste enviado para aprovacao.';
      adjustForm.reset();
      restartAdjustmentPoints();
      setAdjustmentMode(false);
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

function dateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthName(date) {
  const names = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return names[date.getMonth()];
}

function formatDisplayDate(value) {
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
}

function formatDisplayDateOrEmpty(value) {
  return value ? formatDisplayDate(value) : '';
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
