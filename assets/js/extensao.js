/* extensao.js — PAINEL DE RECURSOS (extensao.html) | Depende: main.js */
var allData = [], filteredData = [], msState = {}, recSortCol = 'total', recSortDir = -1, _activeSheet = 'dash-montagem';

window.onload = function () {
  initTheme();
  /* ── 1. Carregar estado do sessionStorage ── */
  var cached = loadFromStorage();

  /* ── 2. Usar o centro salvo ── */
  _activeSheet = (cached && cached.sheetName) ? cached.sheetName : 'dash-montagem';

  /* ── 3. Tentar auto-carregar o arquivo ── */
  if (cached) {
    var j = loadSheet(cached.sheetName) || loadSheet(cached.wb.SheetNames[0]);
    if (j && j.length) {
      processData(j, cached.fname);
      renderCentroBar('.dash-centro-bar', onCentroBarSelect, _activeSheet);
    } else {
      hideLoading();
      var af = document.getElementById('antiFoucUpload'); if (af) af.remove();
      var up = document.getElementById('uploadScreen'); if (up) up.style.display = 'flex';
    }
  } else {
    hideLoading();
    var af = document.getElementById('antiFoucUpload'); if (af) af.remove();
    var up = document.getElementById('uploadScreen'); if (up) up.style.display = 'flex';
  }

  /* ── 3.5. Renderizar botões de centro (upload screen) ── */
  renderCentroButtons('.botoes-centro', function (sheetName) {
    _activeSheet = sheetName;
    saveSheetToStorage(sheetName);
    if (_sharedWorkbook) {
      var j = loadSheet(sheetName);
      if (j && j.length) processData(j, _currentFile);
    }
    renderCentroBar('.dash-centro-bar', onCentroBarSelect, _activeSheet);
  }, _activeSheet);

  /* ── 4. Listener de upload ── */
  document.getElementById('fileInput').onchange = function (e) {
    var file = e.target.files[0]; if (!file) return; hideErr();
    
    var lbl = document.querySelector('.upload-lbl');
    var oldText = lbl.textContent;
    lbl.textContent = '⏳ LENDO ARQUIVO...';

    readExcelFile(file, function (wb, fname, binaryStr) {
      lbl.textContent = '✅ ' + fname;
      lbl.style.background = 'rgba(31,221,158,0.1)';
      lbl.style.color = 'var(--green)';
      lbl.style.borderColor = 'var(--green)';

      /* Apenas persiste no storage sem abrir a tela, aguardando clique no centro */
      saveToStorage(binaryStr, fname, _activeSheet);
      
      var errEl = document.getElementById('errMsg');
      errEl.textContent = '✔ Arquivo lido! Selecione o Centro de Trabalho abaixo para prosseguir.';
      errEl.style.display = 'block';
      errEl.style.color = 'var(--green)';
      errEl.style.borderColor = 'var(--green)';
      errEl.style.background = 'rgba(31,221,158,0.1)';

    }, function (err) { 
      lbl.textContent = oldText;
      showErr('Erro: ' + err.message); 
    });
  };

  

  /* ── 5. Zoom via Ctrl+scroll ── */
  var frameZoom = 1.0, frame = null;
  window.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return; e.preventDefault();
    frame = frame || document.querySelector('.dash-frame'); if (!frame) return;
    frameZoom = e.deltaY < 0 ? Math.min(1.0, parseFloat((frameZoom + 0.05).toFixed(2))) : Math.max(0.4, parseFloat((frameZoom - 0.05).toFixed(2)));
    frame.style.transform = frameZoom === 1 ? '' : 'scale(' + frameZoom + ')';
    frame.style.transformOrigin = 'top left';
  }, { passive: false });
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.key === '0' || e.key === 'NumPad0')) { e.preventDefault(); frameZoom = 1.0; if (frame) frame.style.transform = ''; }
    if (e.key === 'Escape' && document.getElementById('modalOverlay').classList.contains('open')) closeModal();
  });

  /* ── 6. Botão "Trocar Arquivo" ── */
  document.getElementById('reloadBtn').onclick = function () {
    allData = []; filteredData = []; msState = {}; recSortCol = 'total'; recSortDir = -1;
    document.getElementById('fileInput').value = '';
    
    /* Resetar visual do componente de upload */
    var lbl = document.querySelector('.upload-lbl');
    if (lbl) {
      lbl.textContent = '▲ SELECIONAR ARQUIVO EXCEL';
      lbl.style.background = '';
      lbl.style.color = '';
      lbl.style.borderColor = '';
    }
    var errEl = document.getElementById('errMsg');
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
      errEl.style.background = '';
      errEl.style.color = '';
      errEl.style.borderColor = '';
    }

    document.getElementById('dashboard').style.display = 'none';
    var af = document.getElementById('antiFoucUpload'); if (af) af.remove();
    document.getElementById('uploadScreen').style.display = 'flex';
    clearStorage();
    _sharedWorkbook = null;
  };

  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalExpand').onclick = toggleExpand;
  document.getElementById('modalOverlay').onclick = function (e) { if (e.target === this) closeModal(); };
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.ms-dropdown.open').forEach(function (d) { if (!d.closest('.ms-wrap').contains(e.target)) closeAllMs(); });
  });

  if (window.DEV_MODE) { processData(window.MOCK_DATA, 'mock_dados.xlsx'); renderCentroBar('.dash-centro-bar', onCentroBarSelect, _activeSheet); }
};

function onCentroBarSelect(sheetName) {
  if (!_sharedWorkbook) return;
  _activeSheet = sheetName;
  saveSheetToStorage(sheetName);
  var j = loadSheet(sheetName);
  if (!j || !j.length) { showErr && showErr('Aba "' + sheetName + '" não encontrada!'); return; }
  processData(j, _currentFile);
}


function processData(json, fname) {
  msState = {};
  allData = json.map(function (row) {
    var norm = {}; Object.keys(row).forEach(function (k) { norm[normKey(k)] = row[k]; });
    return {
      OP_KEY: s(norm['OP_PAI'] || norm['OP_KEY']), PESO_PAI: n(norm['PESO_PAI']), SITUACAO_PAI: s(norm['SITUACAO_PAI']),
      PREPARACAO: s(norm['PREPARACAO']), SEMANA: s(norm['SEMANA']), RECURSO: s(norm['RECURSO'] || norm['MONTAGEM']),
      OP_FILHO: s(norm['OP_FILHO']), SITUACAO_FILHO: s(norm['SITUACAO_FILHO']), RECURSO_PENDENTE: s(norm['RECURSO_PENDENTE']),
      SALDO_DISP: s(norm['EM_CONDICAO']), DESC_PRODUTO_PAI: s(norm['DESC_PRODUTO_PAI'])
    };
  });
  var fi = document.getElementById('fileInfo'); if (fi) fi.textContent = fname;
  var up = document.getElementById('uploadScreen'); if (up) up.style.display = 'none';
  var db = document.getElementById('dashboard'); if (db) db.style.display = 'flex';
  hideLoading();
  populateFilters(); applyFilters();
}

function populateFilters() {
  var u = function (k) { return [...new Set(allData.map(function (r) { return r[k]; }))].filter(Boolean).sort(); };
  var sem = [...new Set(allData.map(function (r) { return r.SEMANA; }))].filter(Boolean).sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
  initMs('fSemana', sem, 'Semana: todas'); initMs('fSitPai', u('SITUACAO_PAI'), 'Sit. Pai: todas');
  initMs('fRecursoPai', u('RECURSO'), 'Recurso Pai: todos'); initMs('fPreparacao', u('PREPARACAO'), 'Preparação: todas');
  initMs('fSaldoDisp', ['SIM', 'NÃO'], 'Saldo Disp.: todos', true);
  initMs('fPendente', ['Com pendência', 'Sem pendência'], 'Pendente: todos', true);
}
function clearAllFilters() { ['fSemana', 'fSitPai', 'fRecursoPai', 'fPreparacao', 'fSaldoDisp', 'fPendente'].forEach(clearMs); applyFilters(); }

function applyFilters() {
  var sem = msState['fSemana'] || new Set(), sitP = msState['fSitPai'] || new Set(),
    rPai = msState['fRecursoPai'] || new Set(), prep = msState['fPreparacao'] || new Set(),
    saldoD = msState['fSaldoDisp'] || new Set(), pend = msState['fPendente'] || new Set();
  filteredData = allData.filter(function (r) {
    if (sem.size && !sem.has(r.SEMANA)) return false; if (sitP.size && !sitP.has(r.SITUACAO_PAI)) return false;
    if (rPai.size && !rPai.has(r.RECURSO)) return false; if (prep.size && !prep.has(r.PREPARACAO)) return false;
    if (saldoD.size) { var sim = String(r.SALDO_DISP).trim().toUpperCase() === 'SIM'; if (saldoD.has('SIM') && !sim) return false; if (saldoD.has('NÃO') && sim) return false; }
    if (pend.size) { var tp = r.RECURSO_PENDENTE && r.RECURSO_PENDENTE.trim() !== ''; if (pend.has('Com pendência') && !tp) return false; if (pend.has('Sem pendência') && tp) return false; }
    return true;
  });
  var rc = document.getElementById('rowCount'); if (rc) rc.textContent = filteredData.length + ' linhas';
  var d = calcRecursoData();
  updateKPIs(d); renderTabela(d);
}

function calcRecursoData() {
  var opsPai = {}; filteredData.forEach(function (r) { opsPai[r.OP_KEY] = parseFloat(r.PESO_PAI) || 0; });
  var pesoGeral = Object.values(opsPai).reduce(function (a, b) { return a + b; }, 0);
  var opsVerificadas = Object.keys(opsPai).length;
  var pfm = {};
  filteredData.forEach(function (r) {
    if (!r.OP_KEY) return; if (!pfm[r.OP_KEY]) pfm[r.OP_KEY] = { pesoPai: parseFloat(r.PESO_PAI) || 0, preparacao: String(r.PREPARACAO || '').trim(), recurso: r.RECURSO || '(sem recurso)', situacao: r.SITUACAO_PAI, semana: r.SEMANA, filhos: {} };
    if (r.OP_FILHO && !pfm[r.OP_KEY].filhos.hasOwnProperty(r.OP_FILHO)) pfm[r.OP_KEY].filhos[r.OP_FILHO] = String(r.SALDO_DISP || '').trim().toUpperCase();
  });
  var rm = {};
  Object.keys(pfm).forEach(function (opKey) {
    var pai = pfm[opKey], rec = pai.recurso, peso = pai.pesoPai;
    if (!rm[rec]) rm[rec] = { recurso: rec, emCondicao: 0, semCondicao: 0, pesoLiberado: 0, pais: [] };
    var entry = rm[rec]; entry.pais.push({ opKey: opKey, pesoPai: peso, preparacao: pai.preparacao, situacao: pai.situacao, semana: pai.semana, filhos: pai.filhos });
    if (pai.preparacao === 'Liberada') { entry.pesoLiberado += peso; return; }
    var filhos = Object.values(pai.filhos); var todosSim = filhos.length > 0 && filhos.every(function (v) { return v === 'SIM'; });
    if (todosSim) entry.emCondicao += peso; else entry.semCondicao += peso;
  });
  var rows = Object.values(rm).map(function (e) { var t = e.emCondicao + e.semCondicao + e.pesoLiberado; return { recurso: e.recurso, emCondicao: e.emCondicao, semCondicao: e.semCondicao, pesoLiberado: e.pesoLiberado, total: t, pais: e.pais, pctEm: t > 0 ? Math.round(e.emCondicao / t * 100) : 0, pctSem: t > 0 ? Math.round(e.semCondicao / t * 100) : 0, pctLib: t > 0 ? Math.round(e.pesoLiberado / t * 100) : 0 }; });
  var tG = rows.reduce(function (a, r) { return a + r.total; }, 0), tE = rows.reduce(function (a, r) { return a + r.emCondicao; }, 0), tS = rows.reduce(function (a, r) { return a + r.semCondicao; }, 0), tL = rows.reduce(function (a, r) { return a + r.pesoLiberado; }, 0);
  return { pesoGeral: pesoGeral, opsVerificadas: opsVerificadas, rows: rows, totalGeral: tG, totalEm: tE, totalSem: tS, totalLib: tL, pctEmGeral: tG > 0 ? Math.round(tE / tG * 100) : 0, pctSemGeral: tG > 0 ? Math.round(tS / tG * 100) : 0, pctLibGeral: tG > 0 ? Math.round(tL / tG * 100) : 0 };
}

function updateKPIs(d) {
  if (!d) d = calcRecursoData();
  var el;
  el = document.getElementById('kpOpsVerif'); if (el) el.textContent = d.opsVerificadas.toLocaleString('pt-BR');
  el = document.getElementById('kpPesoGeral'); if (el) el.textContent = fmtTon(d.pesoGeral);
  el = document.getElementById('kpEmCond'); if (el) el.textContent = fmtTon(d.totalEm);
  el = document.getElementById('kpSemCond'); if (el) el.textContent = fmtTon(d.totalSem);
  el = document.getElementById('kpPesoLiberado'); if (el) el.textContent = fmtTon(d.totalLib);
}

function recSortBy(col, idx) {
  if (recSortCol === col) recSortDir *= -1; else { recSortCol = col; recSortDir = col === 'recurso' ? 1 : -1; }
  document.querySelectorAll('#recThead th').forEach(function (t) { t.classList.remove('asc', 'desc'); });
  var ths = document.querySelectorAll('#recThead th'); if (ths[idx]) ths[idx].classList.add(recSortDir === 1 ? 'asc' : 'desc');
  renderTabela();
}

function renderTabela(d) {
  if (!d) d = calcRecursoData(); 
  var sorted = d.rows.slice().sort(function (a, b) { var va = a[recSortCol], vb = b[recSortCol]; if (typeof va === 'number') return (va - vb) * recSortDir; return String(va).localeCompare(String(vb)) * recSortDir; });
  var rc2 = document.getElementById('recRowCount'); if (rc2) rc2.textContent = sorted.length + ' recurso' + (sorted.length !== 1 ? 's' : '');
  var body = document.getElementById('recBody'); if (!body) return;
  if (!sorted.length) { body.innerHTML = '<tr><td colspan="6" class="no-data">Sem dados</td></tr>'; return; }
  var html = '';
  sorted.forEach(function (r) { var rec = encodeURIComponent(r.recurso); html += '<tr><td>' + r.recurso + '</td><td class="rec-cell-click" data-recurso="' + rec + '" data-tipo="emCondicao" style="color:var(--green);font-weight:700">' + fmtTon(r.emCondicao) + '</td><td class="rec-cell-click" data-recurso="' + rec + '" data-tipo="semCondicao" style="color:var(--red);font-weight:700">' + fmtTon(r.semCondicao) + '</td><td class="rec-cell-click" data-recurso="' + rec + '" data-tipo="liberado" style="color:var(--accent);font-weight:700">' + fmtTon(r.pesoLiberado) + '</td><td class="rec-cell-click" data-recurso="' + rec + '" data-tipo="total" style="color:var(--yellow);font-weight:700">' + fmtTon(r.total) + '</td><td>' + buildPctCol(r.pctEm, r.pctSem, r.pctLib) + '</td></tr>'; });
  html += '<tr class="total-row"><td>◈ TOTAL GERAL</td><td class="rec-cell-click" data-recurso="__ALL__" data-tipo="emCondicao">' + fmtTon(d.totalEm) + '</td><td class="rec-cell-click" data-recurso="__ALL__" data-tipo="semCondicao">' + fmtTon(d.totalSem) + '</td><td class="rec-cell-click" data-recurso="__ALL__" data-tipo="liberado">' + fmtTon(d.totalLib) + '</td><td class="rec-cell-click" data-recurso="__ALL__" data-tipo="total">' + fmtTon(d.totalGeral) + '</td><td>' + buildPctCol(d.pctEmGeral, d.pctSemGeral, d.pctLibGeral) + '</td></tr>';
  body.innerHTML = html; window._recursoDataCache = d;
  document.querySelectorAll('#recBody .rec-cell-click').forEach(function (td) { td.addEventListener('click', function () { openModalDetalhe(decodeURIComponent(td.dataset.recurso), td.dataset.tipo); }); });
}

function buildPctCol(pctEm, pctSem, pctLib) { return '<div class="pct-col">' + bpr('var(--green)', 'C', pctEm) + bpr('var(--red)', 'S/C', pctSem) + bpr('var(--accent)', 'L', pctLib) + '</div>'; }
function bpr(color, label, pct) { return '<div class="pct-row"><div class="pct-dot" style="background:' + color + '"></div><span class="pct-lbl" style="color:' + color + '">' + label + '</span><div class="pct-bar-wrap"><div class="pct-bar-fill" style="width:' + Math.min(100, pct) + '%;background:' + color + '"></div></div><span class="pct-val" style="color:' + color + '">' + pct + '%</span></div>'; }

function openModalDetalhe(recurso, tipo) {
  var d = window._recursoDataCache; if (!d) return;
  var paiMap = {};
  filteredData.forEach(function (r) { if (recurso !== '__ALL__' && (r.RECURSO || '(sem recurso)') !== recurso) return; if (!paiMap[r.OP_KEY]) paiMap[r.OP_KEY] = { op: r.OP_KEY, produto: r.DESC_PRODUTO_PAI || r.OP_KEY, pesoPai: parseFloat(r.PESO_PAI) || 0, prep: String(r.PREPARACAO || '').trim(), situacao: r.SITUACAO_PAI, semana: r.SEMANA, recurso: r.RECURSO || '(sem recurso)', temNao: false }; var sd = String(r.SALDO_DISP || '').trim().toUpperCase(); if (sd === 'NÃO' || sd === 'NAO') paiMap[r.OP_KEY].temNao = true; });
  var titulos = { emCondicao: 'EM CONDIÇÃO — Saldo Disp. = SIM', semCondicao: 'SEM CONDIÇÃO — Saldo Disp. = NÃO', liberado: 'PESO LIBERADO — Preparação = Liberada', total: 'TOTAL' };
  var rows = Object.values(paiMap).filter(function (p) { if (tipo === 'liberado') return p.prep === 'Liberada'; if (tipo === 'total') return true; if (tipo === 'emCondicao') return p.prep !== 'Liberada' && !p.temNao; if (tipo === 'semCondicao') return p.prep !== 'Liberada' && p.temNao; return false; });
  var pt = rows.reduce(function (a, r) { return a + r.pesoPai; }, 0); var tr2 = recurso === '__ALL__';
  var cols = tr2 ? ['OP PAI', 'Recurso', 'Peso Pai', 'Situação', 'Preparação', 'Semana', 'Saldo Disp.'] : ['OP PAI', 'Peso Pai', 'Situação', 'Preparação', 'Semana', 'Saldo Disp.'];
  document.getElementById('modalTitle').textContent = '◈  ' + (recurso === '__ALL__' ? 'TOTAL GERAL' : recurso);
  document.getElementById('modalSub').textContent = titulos[tipo] + '  ·  ' + rows.length + ' OP(s)  ·  ' + fmtTon(pt);
  document.getElementById('modalThead').innerHTML = '<tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
  document.getElementById('modalBody').innerHTML = rows.sort(function (a, b) { return String(a.op).localeCompare(String(b.op)); }).map(function (r) { var sc = !r.temNao ? '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:700;padding:2px 8px;background:rgba(31,221,158,.1);color:var(--accent);border:1px solid rgba(31,221,158,.4)">SIM</span>' : '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:700;padding:2px 8px;background:rgba(255,77,109,.1);color:var(--red);border:1px solid rgba(255,77,109,.4)">NÃO</span>'; var base = '<tr><td class="op-c">' + r.op + '</td>'; if (tr2) base += '<td style="font-size:11px;color:var(--text2)">' + r.recurso + '</td>'; base += '<td class="mono" style="color:var(--cyan)">' + fmtKg(r.pesoPai) + '</td><td><span class="chip ' + chipCls(r.situacao) + '">' + (r.situacao || '—') + '</span></td><td><span class="chip ' + prepCls(r.prep) + '">' + (r.prep || 'Não Iniciada') + '</span></td><td class="mono" style="color:var(--text2);font-size:11px">' + (r.semana ? 'Sem ' + r.semana : '—') + '</td><td>' + sc + '</td></tr>'; return base; }).join('');
  document.getElementById('modalFooter').textContent = rows.length + ' OPs  ·  Peso: ' + fmtTon(pt);
  document.getElementById('modalOverlay').classList.add('open'); document.body.style.overflow = 'hidden';
}

