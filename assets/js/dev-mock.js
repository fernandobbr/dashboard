/* ══════════════════════════════════════════════════════════════
   dev-mock.js — DADOS DE DESENVOLVIMENTO
   
   USO:
     1. Adicione esta tag no index.html ANTES do app.js:
        <script src="dev-mock.js"></script>
     
     2. No topo do app.js, adicione:
        if (window.DEV_MODE) {
          processData(window.MOCK_DATA, 'mock_dados.xlsx');
        }
     
     3. Para DESATIVAR o mock (produção):
        Simplesmente REMOVA a tag <script src="dev-mock.js"> do HTML.
        O app.js funciona normalmente sem ela.
   
   IMPORTANTE:
     - Este arquivo nunca vai para produção
     - Não afeta nenhuma lógica do dashboard
     - DEV_MODE = false desativa sem precisar remover o arquivo
══════════════════════════════════════════════════════════════ */

window.DEV_MODE = true;

window.MOCK_DATA = (function () {

  /* ── Tabelas de referência ── */
  var RECURSOS = [
    'F1 - MONTAGEM DUTOS DE ELEVADOR',
    'F1 - MONTAGEM ELEVADORES',
    'F1 - MONTAGEM MPL',
    'F1 -MONTAGEM FORNALHA / SECADOR',
    'F1 - MONTAGEM RT / RV',
    'F1 - MONTAGEM ACESSORIOS',
    'TRATAMENTO TÉRMICO',
  ];

  var RECURSOS_PENDENTES = [
    'SOLDA MIG',
    'USINAGEM CNC',
    'PINTURA ELETROSTÁTICA',
    'CALDEIRARIA',
    '',   /* sem pendência */
    '',
    '',
  ];

  var SITUACOES_PAI = ['Prog', 'F.M.P', 'Imp', 'Espera', 'Env.Prod'];
  var SITUACOES_FILHO = ['Prog', 'F.M.P', 'Enc', 'Imp', 'Espera', 'Enc', 'Enc']; /* Enc com maior peso */
  var PREPARACOES = ['Não Iniciada', 'Em Andamento', 'Liberada'];
  var USOS = ['Expedido', 'Consumido'];
  var GRUPOS = ['ESTRUTURAS METÁLICAS', 'CALDEIRAS', 'VASOS DE PRESSÃO', 'TUBULAÇÕES', 'SUPORTES'];
  var ANALISES = ['F1', 'F2', 'G', 'F2G', ''];
  var SEMANAS = ['14', '15', '16', '17'];

  var PRODUTOS_PAI = [
    { cod: 'EST-001', desc: 'ESTRUTURA PRINCIPAL TORRE A' },
    { cod: 'EST-002', desc: 'ESTRUTURA SUPORTE EQUIPAMENTO' },
    { cod: 'CAL-010', desc: 'CALDEIRA INDUSTRIAL 500L' },
    { cod: 'CAL-011', desc: 'CALDEIRA COMPACTA 200L' },
    { cod: 'VAS-020', desc: 'VASO DE PRESSÃO HORIZONTAL' },
    { cod: 'VAS-021', desc: 'VASO DE PRESSÃO VERTICAL V2' },
    { cod: 'TUB-030', desc: 'CONJUNTO TUBULAÇÃO PROCESSO' },
    { cod: 'TUB-031', desc: 'LINHA DE VAPOR PRINCIPAL' },
    { cod: 'SUP-040', desc: 'SUPORTE ESTRUTURAL MODELO A' },
    { cod: 'SUP-041', desc: 'SUPORTE PIPE RACK NÍVEL 2' },
    { cod: 'EST-003', desc: 'MEZANINO INDUSTRIAL MÓDULO 1' },
    { cod: 'CAL-012', desc: 'ECONOMIZADOR DE GASES' },
    { cod: 'VAS-022', desc: 'SEPARADOR BIFÁSICO' },
    { cod: 'TUB-032', desc: 'MANIFOLD DE DISTRIBUIÇÃO' },
    { cod: 'SUP-042', desc: 'SUPORTE ANTI-VIBRAÇÃO' },
  ];

  var PRODUTOS_FILHO = [
    { cod: 'CHR-001', desc: 'CHAPA REFORÇO LATERAL' },
    { cod: 'VIG-010', desc: 'VIGA H 150X150MM' },
    { cod: 'CAN-020', desc: 'CANTONEIRA 50X50X5MM' },
    { cod: 'TUB-100', desc: 'TUBO SCH40 2"' },
    { cod: 'FLA-030', desc: 'FLANGE 150LB RF 2"' },
    { cod: 'PAR-040', desc: 'PARAFUSO M16X60 ASTM' },
    { cod: 'COL-050', desc: 'COLARINHO DE REFORÇO' },
    { cod: 'ESP-060', desc: 'ESPELHO FRONTAL 10MM' },
    { cod: 'BOC-070', desc: 'BOCAL DE INSPEÇÃO DN50' },
    { cod: 'PER-080', desc: 'PERFIL U 100X50X5MM' },
    { cod: 'GUS-090', desc: 'GUSSET PLATE 8MM' },
    { cod: 'ACO-110', desc: 'AÇO INOX 316L CHAPA 6MM' },
    { cod: 'VED-120', desc: 'VEDAÇÃO GRAFOIL 1/8"' },
    { cod: 'PAT-130', desc: 'PATA SUPORTE SOLDADA' },
    { cod: 'ANE-140', desc: 'ANEL DE REFORÇO BOCAL' },
    { cod: 'MAN-150', desc: 'MANHOLE DN500 COMPLETO' },
  ];

  /* ── Helpers ── */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickIdx(arr) { var i = Math.floor(Math.random() * arr.length); return { val: arr[i], idx: i }; }
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function rndFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(1)); }
  function padOP(n, prefix) { return prefix + String(n).padStart(6, '0'); }

  /* ── Geração das linhas ── */
  var rows = [];
  var opPaiCounter = 100;
  var opFilhoCounter = 500;

  PRODUTOS_PAI.forEach(function (prodPai, pIdx) {
    var opPai = padOP(opPaiCounter++, 'PA');
    var semana = pick(SEMANAS);
    var recurso = RECURSOS[pIdx % RECURSOS.length];
    var sitPai = pick(SITUACOES_PAI);
    var preparacao = pick(PREPARACOES);
    var uso = pick(USOS);
    var grupo = GRUPOS[pIdx % GRUPOS.length];
    var pesoPai = rndFloat(800, 8000);
    var analise = pick(ANALISES);
    var saldoAtual = rnd(-5, 20);
    var emCondicao = pick(['SIM', 'SIM', 'NÃO']); /* mais SIM */

    /* Cada OP Pai tem entre 2 e 5 filhos */
    var numFilhos = rnd(2, 5);

    for (var f = 0; f < numFilhos; f++) {
      var prodFilho = PRODUTOS_FILHO[(pIdx + f) % PRODUTOS_FILHO.length];
      var opFilho = padOP(opFilhoCounter++, 'FI');
      var sitFilho = pick(SITUACOES_FILHO);
      var pesoFilho = rndFloat(50, pesoPai * 0.4);
      var recursoPendente = sitFilho !== 'Enc' ? pick(RECURSOS_PENDENTES) : '';
      var saldoDispFilho = sitFilho === 'Enc' ? '' : pick(['SIM', 'SIM', 'NÃO']);

      rows.push({
        OP_PAI: opPai,
        COD_PRODUTO_PAI: prodPai.cod,
        DESC_PRODUTO_PAI: prodPai.desc,
        PESO_PAI: pesoPai,
        SITUACAO_PAI: sitPai,
        USO_PAI: uso,
        GRUPO_PAI: grupo,
        PREPARACAO: preparacao,
        SEMANA: semana,
        RECURSO: recurso,
        OP_FILHO: opFilho,
        COD_PRODUTO_FILHO: prodFilho.cod,
        DESC_PRODUTO_FILHO: prodFilho.desc,
        PESO_FILHO: pesoFilho,
        SITUACAO_FILHO: sitFilho,
        ANALISE: analise,
        RECURSO_PENDENTE: recursoPendente,
        SALDO_DISPONIVEL: saldoAtual,
        EM_CONDICAO: saldoDispFilho,
      });
    }
  });

  return rows;
})();

/* Log de confirmação no console */
console.log(
  '%c[DEV_MODE] Mock carregado — ' + window.MOCK_DATA.length + ' linhas geradas',
  'color:#00d4ff;font-family:monospace;font-weight:bold'
);