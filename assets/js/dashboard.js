/* dashboard.js — DASHBOARD PRINCIPAL (index.html) | Depende: main.js */
var allData = [], filteredData = [], sortCol = '', sortDir = 1, curPage = 1, grpFiltro = 'todos', PAGE = 50;
var modalSortCol = '', modalSortDir = 1, modalRows = [], _activeSheet = 'dash-montagem';

var COLS = [
  { key: 'OP_KEY', label: 'OP PAI', cls: 'mono op-c' },
  { key: 'COD_PRODUTO_PAI', label: 'Cód. Pai', cls: 'mono', style: 'color:var(--text2);font-size:12px' },
  { key: 'DESC_PRODUTO_PAI', label: 'Produto Pai', cls: '', maxw: 160 },
  { key: 'PESO_PAI', label: 'Peso Pai', cls: 'mono', style: 'color:var(--cyan)', fmt: 'kg' },
  { key: 'SITUACAO_PAI', label: 'Sit. Pai', cls: '', chip: true },
  { key: 'USO_PAI', label: 'Uso', cls: '', uso: true },
  { key: 'PREPARACAO', label: 'Preparação', cls: '', prep: true },
  { key: 'SEMANA', label: 'Semana', cls: 'mono', style: 'font-size:12px;color:var(--text2)', prefix: 'Sem ' },
  { key: 'RECURSO', label: 'Recurso', cls: '', style: 'font-size:12px;color:var(--text2)', maxw: 120 },
  { key: 'OP_FILHO', label: 'OP FILHO', cls: 'mono op-o' },
  { key: 'COD_PRODUTO_FILHO', label: 'Cód. Filho', cls: 'mono', style: 'color:var(--text2);font-size:12px' },
  { key: 'DESC_PRODUTO_FILHO', label: 'Produto Filho', cls: '', maxw: 160 },
  { key: 'QTD_FILHO', label: 'Qtd.', cls: 'mono', style: 'color:var(--text2);font-size:12px' },
  { key: 'PESO_FILHO', label: 'Peso Filho', cls: 'mono', style: 'color:var(--yellow)', fmt: 'kg' },
  { key: 'SITUACAO_FILHO', label: 'Sit. Filho', cls: '', chip: true },
  { key: 'ANALISE', label: 'Análise', cls: '', anl: true },
  { key: 'PERC_ENCERRADO', label: '% Enc.', cls: 'mono', percClr: true },
  { key: 'RECURSO_PENDENTE', label: 'Rec Pendente', cls: '', pend: true },
  { key: 'SALDO_ATUAL', label: 'Saldo Atual', cls: 'mono', saldoAtual: true },
  { key: 'SALDO_DISP', label: 'Saldo Disp.', cls: '', saldoDisp: true },
];

(function buildHead() {
  var tr = document.getElementById('tblHead'); if (!tr) return;
  COLS.forEach(function (c, i) { var th = document.createElement('th'); th.textContent = c.label; th.onclick = function () { sortBy(c.key, i); }; tr.appendChild(th); });
})();

window.onload = function () {
  initTheme();
  /* ── 1. Identificar o centro salvo (ou padrão) ── */
  var savedSheet = sessionStorage.getItem('dash_sheet') || 'dash-montagem';
  _activeSheet = savedSheet;

  /* ── 2. Seleção de centro feita em upload.html ── */

  /* ── 3. Tentar auto-carregar do localStorage ── */
  var cached = loadFromStorage();
  if (cached) {
    _activeSheet = cached.sheetName;
    var j = loadSheet(cached.sheetName) || loadSheet(cached.wb.SheetNames[0]);
    if (j && j.length) {
      processData(j, cached.fname);
      renderCentroBar('.dash-centro-bar', onCentroBarSelect, _activeSheet);
      adicionarBtnKanban();
      showNavFab();
    } else {
      hideLoading();
    }
  } else {
    var gl = document.getElementById('globalLoading'); if (gl) gl.style.display = 'none';
  }

  /* ── 4. Listener de upload (removido — upload feito em upload.html) ── */

  /* ── 5. Botão "Trocar Arquivo" ── */
  document.getElementById('reloadBtn').onclick = function () {
    clearStorage();
    window.location.href = 'upload.html';
  };

  document.addEventListener('click', function (e) {
    document.querySelectorAll('.ms-dropdown.open').forEach(function (d) {
      if (!d.closest('.ms-wrap').contains(e.target)) closeAllMs();
    });
  });
  document.getElementById('searchInput').oninput = applyFilters;
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalExpand').onclick = toggleExpand;
  document.getElementById('modalOverlay').onclick = function (e) { if (e.target === this) closeModal(); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('modalOverlay').classList.contains('open')) closeModal();
    if (e.key === 'F11' && document.getElementById('modalOverlay').classList.contains('open')) { e.preventDefault(); toggleExpand(); }
  });
  if (window.DEV_MODE) { processData(window.MOCK_DATA, 'mock_dados.xlsx'); renderCentroBar('.dash-centro-bar', onCentroBarSelect, _activeSheet); adicionarBtnKanban(); showNavFab(); }

  /* ── 6. Mostrar Changelog V4.3 no primeiro acesso ── */
  setTimeout(function() {
    if (!localStorage.getItem('dash_v44_seen')) {
      openChangelog();
      localStorage.setItem('dash_v44_seen', '1');
    }
  }, 600);
};

function adicionarBtnKanban() {
  var bar = document.querySelector('.dash-centro-bar');
  if (!bar || bar.querySelector('.btn-kanban-link')) return;
  var sep = document.createElement('div');
  sep.style.cssText = 'width:1px;height:18px;background:var(--border);margin:0 6px;flex-shrink:0';
  var btn = document.createElement('a');
  btn.href = 'kanban_usinagem.html';
  btn.className = 'btn-centro-sm btn-kanban-link';
  btn.innerHTML = '<img src="assets/img/maquina-de-torno.png" alt="Usinagem"><span>Usinagem</span>';
  bar.appendChild(sep);
  bar.appendChild(btn);
}

function onCentroBarSelect(sheetName) {
  if (!_sharedWorkbook) return;
  _activeSheet = sheetName;
  saveSheetToStorage(sheetName);
  var j = loadSheet(sheetName);
  if (!j || !j.length) { showErr('Aba "' + sheetName + '" não encontrada!'); return; }
  processData(j, _currentFile);
}

/* Controle de visibilidade do botão FAB */
function showNavFab() {
  var fab = document.querySelector('.nav-fab');
  if (fab) fab.style.display = 'flex';
}
function hideNavFab() {
  var fab = document.querySelector('.nav-fab');
  if (fab) fab.style.display = 'none';
}

function processData(json, fname) {
  msState = {}; sortCol = ''; sortDir = 1; curPage = 1; grpFiltro = 'todos';
  document.getElementById('searchInput').value = '';
  ['fSemana', 'fSitPai', 'fSitFilho', 'fAnalise', 'fRecursoPend', 'fRecursoPai', 'fUso', 'fPendente', 'fPreparacao', 'fSaldoDisp'].forEach(function (id) {
    var btn = document.getElementById('btn-' + id); if (!btn) return;
    var c = btn.querySelector('.ms-count'); if (c) c.remove();
    btn.style.borderColor = ''; btn.style.color = '';
    var lbl = document.getElementById('lbl-' + id); if (lbl) lbl.textContent = getMsDefault(id);
  });

  allData = json.map(function (row) {
    var norm = {}; Object.keys(row).forEach(function (k) { norm[normKey(k)] = row[k]; });
    return {
      OP_KEY: s(norm['OP_PAI'] || norm['OP_KEY']), COD_PRODUTO_PAI: s(norm['COD_PRODUTO_PAI']),
      DESC_PRODUTO_PAI: s(norm['DESC_PRODUTO_PAI']), PESO_PAI: n(norm['PESO_PAI']),
      SITUACAO_PAI: s(norm['SITUACAO_PAI']), USO_PAI: s(norm['USO_PAI']), GRUPO_PAI: s(norm['GRUPO_PAI']),
      DATA_PRF: s(norm['DATA_PRF']), PREPARACAO: (function(){ var p = s(norm['PREPARACAO']); return p.toLowerCase().startsWith('em andamento') ? 'Em Andamento' : p; })(), SEMANA: s(norm['SEMANA']),
      RECURSO: s(norm['RECURSO'] || norm['MONTAGEM']), OP_FILHO: s(norm['OP_FILHO']),
      COD_PRODUTO_FILHO: s(norm['COD_PRODUTO_FILHO']), DESC_PRODUTO_FILHO: s(norm['DESC_PRODUTO_FILHO']),
      QTD_FILHO: n(norm['QTD_FILHO']),
      PESO_FILHO: n(norm['PESO_FILHO']), SITUACAO_FILHO: s(norm['SITUACAO_FILHO']), ANALISE: s(norm['ANALISE']),
      PERC_ENCERRADO: '', RECURSO_PENDENTE: s(norm['RECURSO_PENDENTE']),
      SALDO_ATUAL: n(norm['SALDO_DISPONIVEL']), SALDO_DISP: s(norm['EM_CONDICAO'])
    };
  });

  /* ── Ocultar itens COMPRADO: lógica isolada pendente ── */
  allData = allData.filter(function (r) { return s(r.ANALISE).toLowerCase() !== 'comprado'; });

  var percMap = {};
  allData.forEach(function (r) { if (!r.OP_KEY || !r.OP_FILHO) return; if (!percMap[r.OP_KEY]) percMap[r.OP_KEY] = { filhos: {} }; percMap[r.OP_KEY].filhos[r.OP_FILHO] = r.SITUACAO_FILHO; });
  var percResult = {};
  Object.keys(percMap).forEach(function (k) { var f = Object.values(percMap[k].filhos); var t = f.length; var e = f.filter(function (s) { return s === 'Enc'; }).length; percResult[k] = t === 0 ? 'Sem Filhos' : Math.round(e / t * 100) + '%'; });
  allData.forEach(function (r) { r.PERC_ENCERRADO = percResult[r.OP_KEY] || 'Sem Filhos'; });

  var nd = fname.replace(/\.[^.]+$/, '').replace(/^dash_/i, '').replace(/_/g, ' ').toUpperCase();
  document.getElementById('dashTitle').innerHTML = '<span style="color:var(--cyan)">F1</span><span style="color:var(--cyan);margin:0 8px">◈</span><span style="color:var(--cyan)">DASHBOARD ' + nd + '</span>';
  document.querySelector('.file-info').textContent = fname;
  document.getElementById('dashboard').style.display = 'block';
  var gl = document.getElementById('globalLoading'); if (gl) gl.style.display = 'none';
  populateFilters(); applyFilters();
}

function populateFilters() {
  var u = function (k) { return [...new Set(allData.map(function (r) { return r[k]; }))].filter(Boolean).sort(); };
  var sem = [...new Set(allData.map(function (r) { return r['SEMANA']; }))].filter(Boolean).sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
  initMs('fSemana', sem, 'Semana: todas'); initMs('fSitPai', u('SITUACAO_PAI'), 'Sit. Pai: todas');
  initMs('fSitFilho', u('SITUACAO_FILHO'), 'Sit. Filho: todas'); initMs('fAnalise', u('ANALISE'), 'Análise: todas');
  initMs('fRecursoPend', u('RECURSO_PENDENTE'), 'Recurso Filho:'); initMs('fRecursoPai', u('RECURSO'), 'Recurso Pai: todos');
  initMs('fUso', u('USO_PAI'), 'Uso: todos'); initMs('fPreparacao', u('PREPARACAO'), 'Preparação: todas');
  initMs('fPendente', ['Com pendência', 'Sem pendência'], 'Pendente: todos', true);
  initMs('fSaldoDisp', ['SIM', 'NÃO'], 'Saldo Disp.: todos', true);
}
function clearAllFilters() { ['fSemana', 'fSitPai', 'fSitFilho', 'fAnalise', 'fRecursoPend', 'fRecursoPai', 'fUso', 'fPendente', 'fPreparacao', 'fSaldoDisp'].forEach(clearMs); document.getElementById('searchInput').value = ''; applyFilters(); }

function applyFilters() {
  var sem = msState['fSemana'] || new Set(), sitP = msState['fSitPai'] || new Set(), sitF = msState['fSitFilho'] || new Set(),
    anl = msState['fAnalise'] || new Set(), pend = msState['fPendente'] || new Set(), recPend = msState['fRecursoPend'] || new Set(),
    recPai = msState['fRecursoPai'] || new Set(), uso = msState['fUso'] || new Set(), prep = msState['fPreparacao'] || new Set(),
    saldoD = msState['fSaldoDisp'] || new Set(), srch = document.getElementById('searchInput').value.toLowerCase().trim();
  filteredData = allData.filter(function (r) {
    if (sem.size && !sem.has(r.SEMANA)) return false; if (sitP.size && !sitP.has(r.SITUACAO_PAI)) return false;
    if (sitF.size && !sitF.has(r.SITUACAO_FILHO)) return false; if (anl.size && !anl.has(r.ANALISE)) return false;
    if (pend.size) { var sp = r.PERC_ENCERRADO === '100%' || String(r.PERC_ENCERRADO).trim() === 'Sem Filhos'; if (pend.has('Sem pendência') && !sp) return false; if (pend.has('Com pendência') && sp) return false; }
    if (saldoD.size) { var si = String(r.SALDO_DISP).trim().toUpperCase() === 'SIM'; if (saldoD.has('SIM') && !si) return false; if (saldoD.has('NÃO') && si) return false; }
    if (recPend.size && !recPend.has(r.RECURSO_PENDENTE)) return false; if (recPai.size && !recPai.has(r.RECURSO)) return false;
    if (uso.size && !uso.has(r.USO_PAI)) return false; if (prep.size && !prep.has(r.PREPARACAO)) return false;
    if (srch) { var hay = (r.OP_KEY + r.DESC_PRODUTO_PAI + r.OP_FILHO + r.DESC_PRODUTO_FILHO + r.RECURSO_PENDENTE).toLowerCase(); var terms = srch.split(/[\s,\n]+/).filter(Boolean); var rt = [r.OP_KEY, r.OP_FILHO].filter(Boolean).map(function (t) { return t.toLowerCase(); }); var ok = terms.some(function (t) { return rt.some(function (x) { return x.includes(t); }); }); if (!ok && !hay.includes(srch)) return false; }
    return true;
  });
  if (sortCol) doSort(); curPage = 1; renderTable(); updateKPIs(); updateCharts();
}
function sortBy(col, idx) { if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; } document.querySelectorAll('.tbl thead th').forEach(function (t) { t.classList.remove('asc', 'desc'); }); var ths = document.querySelectorAll('.tbl thead th'); if (ths[idx]) ths[idx].classList.add(sortDir === 1 ? 'asc' : 'desc'); doSort(); curPage = 1; renderTable(); }
function doSort() { filteredData.sort(function (a, b) { var va = a[sortCol], vb = b[sortCol]; if (typeof va === 'number') return (va - vb) * sortDir; return String(va).localeCompare(String(vb)) * sortDir; }); }

function renderTable() {
  var tbody = document.getElementById('mainBody'), total = filteredData.length, pages = Math.max(1, Math.ceil(total / PAGE));
  if (curPage > pages) curPage = pages; var st = (curPage - 1) * PAGE, slice = filteredData.slice(st, st + PAGE);
  document.getElementById('rowCount').textContent = total + ' linha' + (total !== 1 ? 's' : '');
  if (!slice.length) { tbody.innerHTML = '<tr><td colspan="' + COLS.length + '" class="no-data">Nenhum resultado</td></tr>'; renderPag(pages, total, st); return; }
  var lp = null; tbody.innerHTML = '';
  slice.forEach(function (r) {
    var tr = document.createElement('tr'); if (r.OP_KEY !== lp) { tr.classList.add('sep'); lp = r.OP_KEY; }
    var html = '';
    COLS.forEach(function (c) {
      var v = r[c.key], style = c.style || '', mw = c.maxw ? 'max-width:' + c.maxw + 'px;overflow:hidden;text-overflow:ellipsis;' : '', title = c.maxw ? 'title="' + v + '"' : '';
      if (c.chip) html += '<td><span class="chip ' + chipCls(v) + '">' + (v || '—') + '</span></td>';
      else if (c.uso) { var uc = v === 'Expedido' ? 'color:var(--cyan)' : 'color:var(--orange)'; html += '<td><span class="chip" style="' + uc + ';background:rgba(0,0,0,.2);border:1px solid currentColor;font-size:10px;display:inline-flex;justify-content:center;width:72px">' + (v || '—') + '</span></td>'; }
      else if (c.prep) html += '<td><span class="chip ' + prepCls(v) + '">' + (v || 'Não Iniciada') + '</span></td>';
      else if (c.anl) html += '<td>' + (v ? '<span class="anl ' + anlCls(v) + '">' + v + '</span>' : '—') + '</td>';
      else if (c.fmt === 'kg') html += '<td class="' + c.cls + '" style="' + style + '">' + fmtKg(v) + '</td>';
      else if (c.percClr) html += '<td class="mono" style="color:' + percClr(v) + ';font-size:11px">' + (v || '—') + '</td>';
      else if (c.pend) html += '<td style="font-size:12px;color:' + (v ? 'var(--red)' : 'var(--green)') + ';">' + (v || '✔') + '</td>';
      else if (c.saldoAtual) { var cr = v > 0 ? 'var(--green)' : 'var(--red)'; html += '<td class="mono" style="color:' + cr + ';font-size:11px;font-weight:700">' + v + ' un</td>'; }
      else if (c.saldoDisp) {
        var vl = String(v).trim().toUpperCase();
        if (vl === 'SIM') html += '<td><span style="display:inline-flex;align-items:center;gap:4px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:700;padding:3px 10px;background:rgba(31,221,158,.1);color:var(--green);border:1px solid rgba(31,221,158,.4)"><span style="display:inline-block;width:5px;height:5px;transform:rotate(45deg);background:var(--green);flex-shrink:0"></span>SIM</span></td>';
        else if (vl === 'NÃO' || vl === 'NAO') html += '<td><span style="display:inline-flex;align-items:center;gap:4px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:700;padding:3px 10px;background:rgba(255,77,109,.1);color:var(--red);border:1px solid rgba(255,77,109,.4)"><span style="display:inline-block;width:5px;height:5px;transform:rotate(45deg);background:var(--red);flex-shrink:0"></span>NÃO</span></td>';
        else html += '<td class="mono" style="color:var(--muted);font-size:11px">—</td>';
      }
      else { var dp = c.prefix && v ? c.prefix + v : (v || '—'); html += '<td class="' + c.cls + '" style="' + style + mw + '" ' + title + '>' + dp + '</td>'; }
    });
    tr.innerHTML = html;
    tr.ondblclick = function () { var opR = filteredData.filter(function (x) { return x.OP_KEY === r.OP_KEY; }); openModalOP(r.OP_KEY, opR, r); };
    tbody.appendChild(tr);
  });
  renderPag(pages, total, st);
}
function renderPag(pages, total, start) {
  document.getElementById('pagInfo').textContent = (start + 1) + '–' + Math.min(start + PAGE, total) + ' de ' + total;
  var btns = document.getElementById('pagBtns'); btns.innerHTML = '';
  function btn(lbl, pg, dis, act) { var b = document.createElement('button'); b.className = 'pag-btn' + (act ? ' active' : ''); b.textContent = lbl; b.disabled = dis; b.onclick = function () { curPage = pg; renderTable(); document.querySelector('.tbl-wrap').scrollTop = 0; }; btns.appendChild(b); }
  btn('‹', curPage - 1, curPage === 1, false); var s2 = Math.max(1, curPage - 2), e = Math.min(pages, s2 + 4); for (var p = s2; p <= e; p++)btn(p, p, false, p === curPage); btn('›', curPage + 1, curPage === pages, false);
}

function updateKPIs() {
  var paiMap = {}; filteredData.forEach(function (r) { if (!paiMap[r.OP_KEY]) paiMap[r.OP_KEY] = r.PESO_PAI; });
  var pesoPai = Object.values(paiMap).reduce(function (a, b) { return a + b; }, 0);
  var filhoMap = {}; filteredData.forEach(function (r) { if (r.OP_FILHO && r.SITUACAO_FILHO && r.SITUACAO_FILHO !== 'Enc' && !filhoMap[r.OP_FILHO]) filhoMap[r.OP_FILHO] = r.PESO_FILHO || 0; });
  var pesoFilho = Object.values(filhoMap).reduce(function (a, b) { return a + b; }, 0);
  var fu = {}; filteredData.forEach(function (r) { if (r.OP_FILHO) fu[r.OP_FILHO] = true; });
  document.getElementById('kOPsPai').textContent = fmtCount(Object.keys(paiMap).length);
  document.getElementById('kSub').textContent = fmtCount(filteredData.length) + ' LINHAS TOTAIS';
  document.getElementById('kFilhos').textContent = fmtCount(Object.keys(fu).length);
  document.getElementById('kPesoPai').textContent = fmtTon(pesoPai);
  document.getElementById('kPesoFilho').textContent = fmtTon(pesoFilho);
  var fp = {}; filteredData.forEach(function (r) { if (r.OP_FILHO && r.SITUACAO_FILHO && r.SITUACAO_FILHO !== 'Enc' && r.RECURSO_PENDENTE && r.RECURSO_PENDENTE.trim() !== '') fp[r.OP_FILHO] = true; });
  document.getElementById('kPendentes').textContent = fmtCount(Object.keys(fp).length);
}

function openModalOPsPai() {
  var box = document.getElementById('modalBox'); box.className = 'modal modal-op';
  var pm = {}; filteredData.forEach(function (r) { if (!pm[r.OP_KEY]) pm[r.OP_KEY] = r; });
  modalRows = Object.values(pm); modalSortCol = ''; modalSortDir = 1;
  document.getElementById('modalTitle').textContent = '◈  OPs Pai Filtradas';
  document.getElementById('modalSub').textContent = modalRows.length + ' OP(s)';
  setModalHead(['OP PAI', 'Produto Pai', 'Peso Pai', 'Situação', 'Uso', 'Preparação', 'Semana', '% Enc.', 'Saldo Disp.']);
  var colKeys = ['OP_KEY', 'DESC_PRODUTO_PAI', 'PESO_PAI', 'SITUACAO_PAI', 'USO_PAI', 'PREPARACAO', 'SEMANA', 'PERC_ENCERRADO', 'SALDO_DISP'];
  document.querySelectorAll('#modalThead th').forEach(function (th, i) {
    th.style.cursor = 'pointer'; th.onclick = function () { if (modalSortCol === colKeys[i]) modalSortDir *= -1; else { modalSortCol = colKeys[i]; modalSortDir = 1; } document.querySelectorAll('#modalThead th').forEach(function (t) { t.classList.remove('asc', 'desc'); }); th.classList.add(modalSortDir === 1 ? 'asc' : 'desc'); renderModalOPsPai(); };
  });
  renderModalOPsPai(); openModal();
}
function renderModalOPsPai() {
  var sorted = modalRows.slice().sort(function (a, b) { if (!modalSortCol) return String(a.OP_KEY).localeCompare(String(b.OP_KEY)); var va = a[modalSortCol], vb = b[modalSortCol]; if (modalSortCol === 'PESO_PAI') return (va - vb) * modalSortDir; if (modalSortCol === 'SEMANA') return (parseFloat(va) - parseFloat(vb)) * modalSortDir; if (modalSortCol === 'PERC_ENCERRADO') { var na = parseFloat(String(va).replace('%', '')) || 0, nb = parseFloat(String(vb).replace('%', '')) || 0; return (na - nb) * modalSortDir; } return String(va).localeCompare(String(vb)) * modalSortDir; });
  document.getElementById('modalBody').innerHTML = sorted.map(function (r) { var sv = String(r.SALDO_DISP).trim().toUpperCase(); var sc = sv === 'SIM' ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:rgba(31,221,158,.1);color:var(--green);border:1px solid rgba(31,221,158,.4)">SIM</span>' : sv === 'NÃO' || sv === 'NAO' ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:rgba(255,77,109,.1);color:var(--red);border:1px solid rgba(255,77,109,.4)">NÃO</span>' : '<span style="color:var(--muted)">—</span>'; return '<tr><td class="mono op-c">' + r.OP_KEY + '</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis" title="' + r.DESC_PRODUTO_PAI + '">' + r.DESC_PRODUTO_PAI + '</td><td class="mono" style="color:var(--cyan)">' + fmtKg(r.PESO_PAI) + '</td><td><span class="chip ' + chipCls(r.SITUACAO_PAI) + '">' + r.SITUACAO_PAI + '</span></td><td style="font-size:11px">' + (r.USO_PAI || '—') + '</td><td><span class="chip ' + prepCls(r.PREPARACAO) + '">' + (r.PREPARACAO || 'Não Iniciada') + '</span></td><td class="mono" style="color:var(--text2);font-size:11px">' + (r.SEMANA ? 'Sem ' + r.SEMANA : '—') + '</td><td class="mono" style="color:' + percClr(r.PERC_ENCERRADO) + ';font-size:11px">' + (r.PERC_ENCERRADO || '—') + '</td><td>' + sc + '</td></tr>'; }).join('');
  document.getElementById('modalFooter').textContent = modalRows.length + ' OPs';
}

function openModalPesoFilho() {
  var box = document.getElementById('modalBox'); box.className = 'modal';
  var fv = {}, rows = []; filteredData.forEach(function (r) { if (r.OP_FILHO && r.SITUACAO_FILHO && r.SITUACAO_FILHO !== 'Enc' && !fv[r.OP_FILHO]) { fv[r.OP_FILHO] = true; rows.push(r); } });
  var pt = rows.reduce(function (a, r) { return a + (r.PESO_FILHO || 0); }, 0);
  document.getElementById('modalTitle').textContent = '⚖  Filhos em Aberto';
  document.getElementById('modalSub').textContent = rows.length + ' OP(s)  ·  ' + fmtTon(pt);
  setModalHead(['OP PAI', 'Produto Pai', 'OP FILHO', 'Produto Filho', 'Peso Filho', 'Sit. Filho', 'Análise', 'Uso', 'Recurso Pend.', 'Semana', 'Saldo Atual', 'Saldo Disp.']);
  document.getElementById('modalBody').innerHTML = rows.sort(function (a, b) { return String(a.OP_KEY).localeCompare(String(b.OP_KEY)); }).map(function (r) { var sav = r.SALDO_ATUAL > 0 ? 'color:var(--green)' : 'color:var(--red)'; var sv = String(r.SALDO_DISP).trim().toUpperCase(); var sc = sv === 'SIM' ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:rgba(31,221,158,.1);color:var(--green);border:1px solid rgba(31,221,158,.4)">SIM</span>' : sv === 'NÃO' || sv === 'NAO' ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:rgba(255,77,109,.1);color:var(--red);border:1px solid rgba(255,77,109,.4)">NÃO</span>' : '—'; return '<tr><td class="mono op-c">' + r.OP_KEY + '</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis" title="' + r.DESC_PRODUTO_PAI + '">' + r.DESC_PRODUTO_PAI + '</td><td class="mono op-o">' + r.OP_FILHO + '</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis" title="' + r.DESC_PRODUTO_FILHO + '">' + r.DESC_PRODUTO_FILHO + '</td><td class="mono" style="color:var(--yellow)">' + fmtKg(r.PESO_FILHO) + '</td><td><span class="chip ' + chipCls(r.SITUACAO_FILHO) + '">' + r.SITUACAO_FILHO + '</span></td><td>' + (r.ANALISE ? '<span class="anl ' + anlCls(r.ANALISE) + '">' + r.ANALISE + '</span>' : '—') + '</td><td style="font-size:11px">' + (r.USO_PAI || '—') + '</td><td style="font-size:12px;color:' + (r.RECURSO_PENDENTE ? 'var(--red)' : 'var(--green)') + '">' + (r.RECURSO_PENDENTE || '✔') + '</td><td class="mono" style="color:var(--text2);font-size:11px">' + (r.SEMANA ? 'Sem ' + r.SEMANA : '—') + '</td><td class="mono" style="' + sav + ';font-size:11px;font-weight:700">' + r.SALDO_ATUAL + ' un</td><td>' + sc + '</td></tr>'; }).join('');
  document.getElementById('modalFooter').textContent = rows.length + ' filhos  ·  Peso: ' + fmtTon(pt); openModal();
}

function openModalOP(opKey, opRows, r) {
  var box = document.getElementById('modalBox'); box.className = 'modal modal-op';
  document.getElementById('modalTitle').textContent = '◈  OP ' + opKey;
  document.getElementById('modalSub').textContent = (r.DESC_PRODUTO_PAI || '') + '  ·  ' + opRows.length + ' filho(s)';
  setModalHead(['OP FILHO', 'Produto Filho', 'Peso Filho', 'Sit. Filho', 'Análise', 'Recurso Pend.', 'Saldo Atual', 'Saldo Disp.', 'Uso', 'Preparação']);
  document.getElementById('modalBody').innerHTML = opRows.map(function (x) { var sv = String(x.SALDO_DISP).trim().toUpperCase(); var sc = sv === 'SIM' ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:rgba(31,221,158,.1);color:var(--green);border:1px solid rgba(31,221,158,.4)">SIM</span>' : sv === 'NÃO' || sv === 'NAO' ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;background:rgba(255,77,109,.1);color:var(--red);border:1px solid rgba(255,77,109,.4)">NÃO</span>' : '—'; var sac = x.SALDO_ATUAL > 0 ? 'color:var(--green)' : 'color:var(--red)'; return '<tr><td class="mono op-o">' + x.OP_FILHO + '</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title="' + x.DESC_PRODUTO_FILHO + '">' + x.DESC_PRODUTO_FILHO + '</td><td class="mono" style="color:var(--yellow)">' + fmtKg(x.PESO_FILHO) + '</td><td><span class="chip ' + chipCls(x.SITUACAO_FILHO) + '">' + x.SITUACAO_FILHO + '</span></td><td>' + (x.ANALISE ? '<span class="anl ' + anlCls(x.ANALISE) + '">' + x.ANALISE + '</span>' : '—') + '</td><td style="font-size:12px;color:' + (x.RECURSO_PENDENTE ? 'var(--red)' : 'var(--green)') + '">' + (x.RECURSO_PENDENTE || '✔') + '</td><td class="mono" style="' + sac + ';font-size:11px;font-weight:700">' + x.SALDO_ATUAL + ' un</td><td>' + sc + '</td><td style="font-size:11px">' + (x.USO_PAI || '—') + '</td><td><span class="chip ' + prepCls(x.PREPARACAO) + '">' + (x.PREPARACAO || 'Não Iniciada') + '</span></td></tr>'; }).join('');
  document.getElementById('modalFooter').textContent = opRows.length + ' filho(s)  ·  OP Pai: ' + opKey; openModal();
}

function updateCharts() { updateChartRecurso(); updateChartGrupo(); }
function updateChartRecurso() {
  var rm = {}; filteredData.forEach(function (r) { if (!r.RECURSO_PENDENTE) return; if (!rm[r.RECURSO_PENDENTE]) rm[r.RECURSO_PENDENTE] = { peso: 0, ops: [], fv: {} }; if (!rm[r.RECURSO_PENDENTE].fv[r.OP_FILHO]) { rm[r.RECURSO_PENDENTE].fv[r.OP_FILHO] = true; rm[r.RECURSO_PENDENTE].peso += (r.PESO_FILHO || 0); } rm[r.RECURSO_PENDENTE].ops.push(r); });
  var entries = Object.entries(rm).sort(function (a, b) { return b[1].peso - a[1].peso; }); var maxR = entries.length ? Math.max.apply(null, entries.map(function (e) { return e[1].peso; })) : 1; var el = document.getElementById('recursosBars');
  if (!entries.length) { el.innerHTML = '<div class="no-data">Sem pendências</div>'; return; }
  el.innerHTML = entries.map(function (e) { var rec = e[0], peso = e[1].peso, qtd = Object.keys(e[1].fv).length; return '<div class="hbar-row clickable" data-recurso="' + encodeURIComponent(rec) + '"><div class="hbar-lbl" title="' + rec + '">' + rec + '</div><div class="hbar-out"><div class="hbar-fill" style="width:' + (peso / maxR * 100) + '%;background:var(--yellow)"></div></div><div class="hbar-val" style="color:var(--yellow)">' + fmtTon(peso) + '</div><div class="hbar-val" style="color:var(--red);font-size:12px">' + qtd + ' OP' + (qtd !== 1 ? 's' : '') + '</div><div class="hbar-icon">⚑</div><button class="hbar-copy-btn" data-rc="' + encodeURIComponent(rec) + '"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>'; }).join('');
  el.querySelectorAll('.hbar-row.clickable').forEach(function (row) { row.onclick = function () { var rec = decodeURIComponent(row.getAttribute('data-recurso')); var d = rm[rec]; var box = document.getElementById('modalBox'); box.className = 'modal'; var uops = Object.keys(d.fv); document.getElementById('modalTitle').textContent = '⚑  ' + rec; document.getElementById('modalSub').textContent = uops.length + ' OP(s)  ·  ' + fmtTon(d.peso); setModalHead(['OP FILHO', 'Produto Filho', 'Peso', 'Sit. Filho', 'OP PAI', 'Uso']); var rows = d.ops.filter(function (r, i, a) { return a.findIndex(function (x) { return x.OP_FILHO === r.OP_FILHO; }) === i; }); document.getElementById('modalBody').innerHTML = rows.map(function (r) { return '<tr><td class="mono op-o">' + r.OP_FILHO + '</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title="' + r.DESC_PRODUTO_FILHO + '">' + r.DESC_PRODUTO_FILHO + '</td><td class="mono" style="color:var(--yellow)">' + fmtKg(r.PESO_FILHO) + '</td><td><span class="chip ' + chipCls(r.SITUACAO_FILHO) + '">' + r.SITUACAO_FILHO + '</span></td><td class="mono op-c">' + r.OP_KEY + '</td><td style="font-size:11px">' + (r.USO_PAI || '—') + '</td></tr>'; }).join(''); document.getElementById('modalFooter').textContent = rows.length + ' filhos'; openModal(); }; });
  el.querySelectorAll('.hbar-copy-btn').forEach(function (btn) { btn.onclick = function (e) { e.stopPropagation(); var rec = decodeURIComponent(btn.getAttribute('data-rc')); var ops = Object.keys(rm[rec].fv).join('\n'); navigator.clipboard.writeText(ops).then(function () { btn.classList.add('copied'); var prev = btn.innerHTML; btn.innerHTML = '✔'; setTimeout(function () { btn.classList.remove('copied'); btn.innerHTML = prev; }, 1500); }); }; });
}
function updateChartGrupo() {
  var gm = {}; filteredData.forEach(function (r) { if (!r.GRUPO_PAI || !r.PESO_FILHO || !r.OP_FILHO) return; if (!gm[r.GRUPO_PAI]) gm[r.GRUPO_PAI] = { exp: 0, cons: 0, fve: {}, fvc: {}, ops: { all: [], exp: [], cons: [] } }; var g = gm[r.GRUPO_PAI]; if (r.USO_PAI === 'Expedido') { if (!g.fve[r.OP_FILHO]) { g.fve[r.OP_FILHO] = true; g.exp += r.PESO_FILHO; } g.ops.exp.push(r); } else { if (!g.fvc[r.OP_FILHO]) { g.fvc[r.OP_FILHO] = true; g.cons += r.PESO_FILHO; } g.ops.cons.push(r); } g.ops.all.push(r); });
  function gv(d) { return grpFiltro === 'Expedido' ? d.exp : grpFiltro === 'Consumido' ? d.cons : d.exp + d.cons; }
  var entries = Object.entries(gm).filter(function (e) { return gv(e[1]) > 0; }).sort(function (a, b) { return gv(b[1]) - gv(a[1]); }); var maxG = entries.length ? Math.max.apply(null, entries.map(function (e) { return gv(e[1]); })) : 1;
  var se = grpFiltro === 'todos' || grpFiltro === 'Expedido', sc2 = grpFiltro === 'todos' || grpFiltro === 'Consumido'; var el = document.getElementById('sitBars');
  if (!entries.length) { el.innerHTML = '<div class="no-data">sem dados</div>'; return; }
  var leg = '<div class="grp-legend">'; if (se) leg += '<div class="grp-dot" style="background:var(--cyan)"></div><span class="grp-leg-lbl">Expedido</span>'; if (sc2) leg += '<div class="grp-dot" style="background:var(--orange)"></div><span class="grp-leg-lbl">Consumido</span>'; leg += '</div>';
  el.innerHTML = leg + entries.map(function (e) { var grp = e[0], d = e[1], val = gv(d); var bars = ''; if (se) bars += '<div class="hbar-out-sm"><div class="hbar-fill-sm" style="width:' + (maxG ? d.exp / maxG * 100 : 0) + '%;background:var(--cyan)"></div></div>'; if (sc2) bars += '<div class="hbar-out-sm"><div class="hbar-fill-sm" style="width:' + (maxG ? d.cons / maxG * 100 : 0) + '%;background:var(--orange)"></div></div>'; var vt = grpFiltro === 'todos' ? '<span style="color:var(--cyan);font-size:12px">' + fmtTon(d.exp) + '</span> <span style="color:var(--muted);font-size:12px">/</span> <span style="color:var(--orange);font-size:12px">' + fmtTon(d.cons) + '</span>' : '<span style="color:' + (grpFiltro === 'Expedido' ? 'var(--cyan)' : 'var(--orange)') + '">' + fmtTon(val) + '</span>'; return '<div class="grp-row" data-grp="' + encodeURIComponent(grp) + '"><div class="hbar-lbl" title="' + grp + '">' + grp + '</div><div class="grp-vals">' + bars + '</div><div class="grp-total" style="font-size:12px;line-height:1.4">' + vt + '</div></div>'; }).join('');
  el.querySelectorAll('.grp-row').forEach(function (row) { row.onclick = function () { var grp = decodeURIComponent(row.getAttribute('data-grp')); var om = grpFiltro === 'Expedido' ? gm[grp].ops.exp : grpFiltro === 'Consumido' ? gm[grp].ops.cons : gm[grp].ops.all; var box = document.getElementById('modalBox'); box.className = 'modal'; document.getElementById('modalTitle').textContent = '◈  Grupo: ' + grp; document.getElementById('modalSub').textContent = om.length + ' linha(s)  ·  Exp: ' + fmtTon(gm[grp].exp) + '  Cons: ' + fmtTon(gm[grp].cons); setModalHead(['OP PAI', 'Produto Pai', 'OP FILHO', 'Peso Filho', 'Sit. Filho', 'Uso']); document.getElementById('modalBody').innerHTML = om.map(function (r) { return '<tr><td class="mono op-c">' + r.OP_KEY + '</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis" title="' + r.DESC_PRODUTO_PAI + '">' + r.DESC_PRODUTO_PAI + '</td><td class="mono op-o">' + r.OP_FILHO + '</td><td class="mono" style="color:var(--yellow)">' + fmtKg(r.PESO_FILHO) + '</td><td><span class="chip ' + chipCls(r.SITUACAO_FILHO) + '">' + r.SITUACAO_FILHO + '</span></td><td style="font-size:11px">' + (r.USO_PAI || '—') + '</td></tr>'; }).join(''); document.getElementById('modalFooter').textContent = 'Grupo: ' + grp + '  ·  ' + om.length + ' linha(s)'; openModal(); }; });
}
function setGrpFiltro(val) { grpFiltro = val; document.getElementById('grpAll').classList.toggle('active', val === 'todos'); document.getElementById('grpExp').classList.toggle('active', val === 'Expedido'); document.getElementById('grpCons').classList.toggle('active', val === 'Consumido'); updateCharts(); }
function closeChangelog() { document.getElementById('changelogOverlay').classList.remove('open'); }
function openChangelog() { document.getElementById('changelogOverlay').classList.add('open'); }
