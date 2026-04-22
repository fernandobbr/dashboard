/* ══════════════════════════════════════════════════════════════
   main.js — FUNÇÕES COMPARTILHADAS
   Usado por: index.html (dashboard.js) e extensao.html (extensao.js)

   Contém:
     1. Multiselect Engine
     2. Utilitários de formatação
     3. Funções de chip/badge
     4. Carregamento multi-abas do Excel
     5. Seletor de centro de trabalho
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════
   ESTADO COMPARTILHADO
══════════════════════════════════════════ */
var _sharedWorkbook = null;      /* workbook XLSX carregado */
var _currentSheet = null;      /* nome da aba ativa */
var _currentFile = null;      /* nome do arquivo carregado */

/* ══════════════════════════════════════════
   PERSISTÊNCIA — sessionStorage
   Chaves:
     dash_wb_binary  → string binária do arquivo XLSX (base64)
     dash_wb_fname   → nome do arquivo
     dash_sheet      → aba ativa (ex: 'dash-montagem')
   Nota: sessionStorage limpa automaticamente ao fechar o browser/aba.
══════════════════════════════════════════ */

/**
 * Salva o workbook binário e o estado atual no sessionStorage.
 * Chamado após readExcelFile e ao trocar de centro.
 */
function saveToStorage(binaryStr, fname, sheetName) {
  try {
    sessionStorage.setItem('dash_wb_binary', btoa(unescape(encodeURIComponent(binaryStr))));
    sessionStorage.setItem('dash_wb_fname', fname || '');
    sessionStorage.setItem('dash_sheet', sheetName || 'dash-montagem');
  } catch (e) {
    console.warn('[main.js] saveToStorage: falha ao salvar (' + e.message + ')');
  }
}

/**
 * Salva apenas o centro de trabalho selecionado.
 * Chamado sempre que o centro mudar em qualquer página.
 */
function saveSheetToStorage(sheetName) {
  try {
    sessionStorage.setItem('dash_sheet', sheetName || 'dash-montagem');
  } catch (e) {
    console.warn('[main.js] saveSheetToStorage: ' + e.message);
  }
}

/**
 * Carrega o workbook do sessionStorage.
 * Retorna { wb, fname, sheetName } ou null se não houver dados.
 */
function loadFromStorage() {
  try {
    var b64 = sessionStorage.getItem('dash_wb_binary');
    var fname = sessionStorage.getItem('dash_wb_fname') || '';
    var sheet = sessionStorage.getItem('dash_sheet') || 'dash-montagem';
    if (!b64) return null;
    var binary = decodeURIComponent(escape(atob(b64)));
    var wb = XLSX.read(binary, { type: 'binary' });
    _sharedWorkbook = wb;
    _currentFile = fname;
    return { wb: wb, fname: fname, sheetName: sheet };
  } catch (e) {
    console.warn('[main.js] loadFromStorage: falha (' + e.message + ')');
    return null;
  }
}

/**
 * Remove todos os dados do sessionStorage.
 * Chamado ao clicar em "Trocar Arquivo".
 */
function clearStorage() {
  try {
    sessionStorage.removeItem('dash_wb_binary');
    sessionStorage.removeItem('dash_wb_fname');
    sessionStorage.removeItem('dash_sheet');
  } catch (e) { /* silencioso */ }
}

/* ══════════════════════════════════════════
   MULTISELECT ENGINE
══════════════════════════════════════════ */
var msState = {};

function initMs(id, values, labelDefault, isRadio) {
  msState[id] = new Set();
  var container = document.getElementById('items-' + id);
  if (!container) return;
  container.innerHTML = '';
  values.forEach(function (v) {
    var item = document.createElement('div');
    item.className = 'ms-item' + (isRadio ? ' radio' : '');
    item.dataset.val = v;
    var uid = id + '_' + v.replace(/\W/g, '_');
    item.innerHTML = '<input type="checkbox" id="' + uid + '" value="' + v + '"><label for="' + uid + '">' + v + '</label>';
    item.querySelector('input').onchange = function () {
      if (isRadio) {
        container.querySelectorAll('input').forEach(function (cb) { if (cb !== this) cb.checked = false; }.bind(this));
        msState[id] = this.checked ? new Set([v]) : new Set();
      } else {
        if (this.checked) msState[id].add(v); else msState[id].delete(v);
      }
      updateMsLabel(id, labelDefault);
      if (typeof applyFilters === 'function') applyFilters();
    };
    container.appendChild(item);
  });
}

function toggleMs(id) {
  var drop = document.getElementById('drop-' + id);
  var btn = document.getElementById('btn-' + id);
  if (!drop || !btn) return;
  var isOpen = drop.classList.contains('open');
  closeAllMs();
  if (!isOpen) { drop.classList.add('open'); btn.classList.add('open'); }
}

function closeAllMs() {
  document.querySelectorAll('.ms-dropdown').forEach(function (d) { d.classList.remove('open'); });
  document.querySelectorAll('.ms-btn').forEach(function (b) { b.classList.remove('open'); });
}

function filterMsItems(id, q) {
  document.querySelectorAll('#items-' + id + ' .ms-item').forEach(function (item) {
    item.style.display = item.dataset.val.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function selectAllMs(id) {
  document.querySelectorAll('#items-' + id + ' .ms-item').forEach(function (item) {
    if (item.style.display !== 'none') {
      item.querySelector('input').checked = true;
      msState[id].add(item.dataset.val);
    }
  });
  updateMsLabel(id, getMsDefault(id));
  if (typeof applyFilters === 'function') applyFilters();
}

function clearMs(id) {
  msState[id] = new Set();
  document.querySelectorAll('#items-' + id + ' input').forEach(function (cb) { cb.checked = false; });
  updateMsLabel(id, getMsDefault(id));
  if (typeof applyFilters === 'function') applyFilters();
}

function getMsDefault(id) {
  var map = {
    fSemana: 'Semana: todas',
    fSitPai: 'Sit. Pai: todas',
    fSitFilho: 'Sit. Filho: todas',
    fAnalise: 'Análise: todas',
    fRecursoPend: 'Recurso Filho:',
    fRecursoPai: 'Recurso Pai: todos',
    fUso: 'Uso: todos',
    fPreparacao: 'Preparação: todas',
    fPendente: 'Pendente: todos',
    fSaldoDisp: 'Saldo Disp.: todos',
  };
  return map[id] || 'todos';
}

function updateMsLabel(id, labelDefault) {
  var sel = msState[id];
  var btn = document.getElementById('btn-' + id);
  var lbl = document.getElementById('lbl-' + id);
  if (!btn || !lbl) return;
  var old = btn.querySelector('.ms-count');
  if (old) old.remove();
  if (!sel || sel.size === 0) {
    lbl.textContent = labelDefault;
    btn.style.borderColor = ''; btn.style.color = '';
  } else if (sel.size === 1) {
    lbl.textContent = [...sel][0];
    btn.style.borderColor = 'var(--cyan)'; btn.style.color = 'var(--cyan)';
  } else {
    lbl.textContent = labelDefault.split(':')[0] + ':';
    var badge = document.createElement('span');
    badge.className = 'ms-count'; badge.textContent = sel.size;
    btn.insertBefore(badge, btn.querySelector('.ms-arrow'));
    btn.style.borderColor = 'var(--cyan)'; btn.style.color = 'var(--cyan)';
  }
}

/* ══════════════════════════════════════════
   UTILITÁRIOS DE FORMATAÇÃO
══════════════════════════════════════════ */
function s(v) { return String(v || '').trim(); }
function n(v) { return parseFloat(String(v || 0).replace(',', '.')) || 0; }
function normKey(k) {
  return k.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
function fmtKg(v) {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' kg';
}
function fmtTon(v) {
  v = v || 0;
  if (v >= 1000) return (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' t';
  return fmtKg(v);
}
function fmtCount(v) {
  return v.toLocaleString('pt-BR');
}

/* ══════════════════════════════════════════
   FUNÇÕES DE CHIPS / BADGES
══════════════════════════════════════════ */
function chipCls(s) {
  if (!s || s === '—' || s === '-') return 'c-imp';
  var m = {
    'Enc': 'c-enc', 'F.M.P': 'c-fmp', 'F.MAQ': 'c-fmp', 'Prog': 'c-prog',
    'Imp': 'c-imp', 'Espera': 'c-esp', 'Não.Imp': 'c-imp', 'Env.Prod': 'c-prog',
    'Rec.Prod': 'c-prog', 'Ret.PCP': 'c-esp'
  };
  return m[s] || 'c-risk';
}
function prepCls(v) {
  if (v === 'Liberada') return 'c-lib';
  if (v === 'Em Andamento') return 'c-prog';
  return 'c-risk';
}
function anlCls(v) {
  var m = { 'F1': 'anl-f1', 'F2': 'anl-f2', 'G': 'anl-g', 'F2G': 'anl-f2g' };
  return m[v] || '';
}
function percClr(v) {
  if (!v || v === 'Sem Filhos') return 'var(--muted)';
  var p = parseInt(v);
  if (p === 100) return 'var(--green)';
  if (p >= 70) return 'var(--yellow)';
  if (p >= 30) return 'var(--orange)';
  return 'var(--red)';
}

/* ══════════════════════════════════════════
   MODAL COMPARTILHADO
══════════════════════════════════════════ */
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  var box = document.getElementById('modalBox');
  if (box) box.classList.remove('expanded');
  var btn = document.getElementById('modalExpand');
  if (btn) btn.textContent = '⛶ EXPANDIR';
  document.body.style.overflow = '';
}
function toggleExpand() {
  var box = document.getElementById('modalBox');
  var btn = document.getElementById('modalExpand');
  if (!box || !btn) return;
  var exp = box.classList.toggle('expanded');
  btn.textContent = exp ? '⛶ RECOLHER' : '⛶ EXPANDIR';
}
function setModalHead(cols) {
  document.getElementById('modalThead').innerHTML =
    '<tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
}

/* ══════════════════════════════════════════
   CARREGAMENTO MULTI-ABAS DO EXCEL
══════════════════════════════════════════ */

/**
 * Lê um arquivo Excel e armazena o workbook globalmente.
 * Chama o callback onLoad(wb, filename) após leitura.
 */
function readExcelFile(file, onLoad, onError) {
  var reader = new FileReader();
  reader.onload = function (ev) {
    try {
      var binaryStr = ev.target.result;
      var wb = XLSX.read(binaryStr, { type: 'binary' });
      _sharedWorkbook = wb;
      _currentFile = file.name;
      if (typeof onLoad === 'function') onLoad(wb, file.name, binaryStr);
    } catch (err) {
      if (typeof onError === 'function') onError(err);
    }
  };
  reader.onerror = function () {
    if (typeof onError === 'function') onError(new Error('Erro ao abrir o arquivo.'));
  };
  reader.readAsBinaryString(file);
}

/**
 * Carrega uma aba específica do workbook já lido.
 * Pode ser chamada a qualquer momento após readExcelFile.
 * Retorna o JSON da aba ou null se não encontrada.
 */
function loadSheet(sheetName) {
  if (!_sharedWorkbook) {
    console.warn('[main.js] loadSheet: nenhum workbook carregado.');
    return null;
  }
  var wb = _sharedWorkbook;

  /* Tenta encontrar a aba pelo nome exato, depois case-insensitive */
  var found = wb.SheetNames.find(function (n) { return n === sheetName; })
    || wb.SheetNames.find(function (n) { return n.toLowerCase() === sheetName.toLowerCase(); });

  if (!found) {
    console.warn('[main.js] Aba "' + sheetName + '" não encontrada. Abas disponíveis:', wb.SheetNames.join(', '));
    return null;
  }

  _currentSheet = found;
  var ws = wb.Sheets[found];
  var json = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log('[main.js] Aba "' + found + '" carregada — ' + json.length + ' linhas.');
  return json;
}

/**
 * Retorna todas as abas disponíveis no workbook carregado.
 */
function getSheetNames() {
  return _sharedWorkbook ? _sharedWorkbook.SheetNames : [];
}

/* ══════════════════════════════════════════
   SELETOR DE CENTRO DE TRABALHO
══════════════════════════════════════════ */

var CENTROS = [
  { id: 'dash-montagem',   label: 'Montagem',      img: 'assets/img/chave-inglesa.png' },
  { id: 'dash-solda',      label: 'Solda',          img: 'assets/img/mascara-de-solda.png' },
  { id: 'dash-robo-solda', label: 'Robô de Solda',  img: 'assets/img/robo-de-solda.png' },
  { id: 'kanban-usinagem', label: 'Usinagem',        img: 'assets/img/maquina-de-torno.png' },
];

/**
 * Renderiza os botões grandes de centro (tela de upload).
 * containerSelector: seletor CSS do elemento container.
 * onSelect(sheetName): callback chamado ao selecionar um centro.
 */
function renderCentroButtons(containerSelector, onSelect, defaultSheet) {
  var container = document.querySelector(containerSelector);
  if (!container) return;
  container.innerHTML = '';

  CENTROS.forEach(function (c) {
    var btn = document.createElement('button');
    btn.className = 'btn-centro' + (c.id === defaultSheet ? ' active' : '');
    btn.type = 'button';
    btn.dataset.sheet = c.id;
    btn.innerHTML = '<img src="' + c.img + '" alt="' + c.label + '"><span>' + c.label + '</span>';
    btn.onclick = function () {
      document.querySelectorAll(containerSelector + ' .btn-centro').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (typeof onSelect === 'function') onSelect(c.id);
    };
    container.appendChild(btn);
  });
}

/**
 * Renderiza a barra de centro pequena (dentro do dashboard ativo).
 * containerSelector: seletor CSS do elemento container.
 * onSelect(sheetName): callback chamado ao trocar o centro.
 */
function renderCentroBar(containerSelector, onSelect, currentSheet) {
  var container = document.querySelector(containerSelector);
  if (!container) return;
  container.innerHTML = '';

  var label = document.createElement('span');
  label.className = 'dash-centro-bar-label';
  label.textContent = 'Centro:';
  container.appendChild(label);

  CENTROS.forEach(function (c) {
    var btn = document.createElement('button');
    btn.className = 'btn-centro-sm' + (c.id === currentSheet ? ' active' : '');
    btn.type = 'button';
    btn.dataset.sheet = c.id;
    btn.innerHTML = '<img src="' + c.img + '" alt="' + c.label + '"><span>' + c.label + '</span>';
    btn.onclick = function () {
      document.querySelectorAll(containerSelector + ' .btn-centro-sm').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (typeof onSelect === 'function') onSelect(c.id);
    };
    container.appendChild(btn);
  });
}

/* ══════════════════════════════════════════
   TEMA — CLARO / ESCURO
   Persiste via sessionStorage ('dash_theme').
══════════════════════════════════════════ */

/**
 * Aplica o tema salvo e atualiza o botão.
 * Chamar no início de cada página (window.onload ou inline).
 */
function initTheme() {
  var theme = sessionStorage.getItem('dash_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  _updateThemeBtn(theme);
}

/**
 * Alterna entre claro e escuro, salva e atualiza o botão.
 */
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  sessionStorage.setItem('dash_theme', next);
  _updateThemeBtn(next);
}

function _updateThemeBtn(theme) {
  var btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'light' ? '🌙 ESCURO' : '☀ CLARO';
}

/* ══════════════════════════════════════════
   LOADING GLOBAL — CARREGANDO DADOS
   Utilizado por todas as páginas do sistema.
   Requer elemento #globalLoading no DOM.
══════════════════════════════════════════ */

/**
 * Exibe a tela de carregamento padrão "CARREGANDO DADOS".
 */
function showLoading() {
  var el = document.getElementById('globalLoading');
  if (el) el.style.display = 'flex';
}

/**
 * Oculta a tela de carregamento padrão.
 */
function hideLoading() {
  var el = document.getElementById('globalLoading');
  if (el) el.style.display = 'none';
}

/* ══════════════════════════════════════════
   UTILITÁRIOS DE EXIBIÇÃO
══════════════════════════════════════════ */
function showErr(msg) {
  var el = document.getElementById('errMsg');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}
function hideErr() {
  var el = document.getElementById('errMsg');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
