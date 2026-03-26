# STYLE_RULES.md
> **Fonte da verdade de estilo para o Dashboard Produção.**
> O agente deve ler este arquivo ANTES de gerar ou editar qualquer código.
> Toda alteração de estilo aprovada deve ser refletida aqui antes da próxima execução.

---

## 1. IDENTIDADE VISUAL

- **Projeto:** Dashboard Produção — F1
- **Versão atual:** V4.2
- **Tema:** Dark industrial / HUD futurista
- **Estética:** Fundo quase preto, acentos em ciano, tipografia monospace para dados, detalhes de canto em estilo sci-fi

---

## 2. CORES (CSS Variables)

Declarar sempre em `:root`. **Nunca usar valores hexadecimais hardcoded no CSS** — referenciar sempre via `var()`.

```css
:root {
  --bg:     #070a10;   /* fundo principal */
  --s1:     #0d1119;   /* superfície 1 (topbar, header) */
  --s2:     #121826;   /* superfície 2 (thead, painéis) */
  --border: #1a2035;   /* borda padrão */

  --cyan:   #00d4ff;   /* acento primário / dados pai */
  --green:  #ff7a35;   /* positivo / encerrado / em condição (laranja) */
  --yellow: #f5c842;   /* alerta / peso filho / total */
  --red:    #ff4d6d;   /* negativo / pendência / sem condição */
  --orange: #ff7a35;   /* secundário / consumido / op filho */
  --accent: #00D4A2;   /* peso liberado / preparação liberada */

  --muted:  #4a5a7a;   /* texto desativado / labels secundários */
  --text:   #dce6f5;   /* texto principal */
  --text2:  #8a9bbf;   /* texto secundário */

  --frame-border: rgba(0,212,255,0.18);
  --frame-glow:   rgba(0,212,255,0.06);
}
```

### Semântica de cores
| Cor | Uso |
|-----|-----|
| `--cyan` | OP Pai, acento primário, bordas ativas, KPI padrão |
| `--green` | Encerrado, Em Condição (Laranja) |
| `--yellow` | Peso Filho, Total, alertas, semana |
| `--red` | Pendência, Sem Condição, negativo, NÃO |
| `--orange` | OP Filho, Consumido |
| `--accent` | Peso Liberado, Preparação = Liberada |
| `--muted` | Labels desativados, rodapés, hints |

---

## 3. TIPOGRAFIA

### Fontes
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;600;700&display=swap');
```

- **`IBM Plex Sans`** — fonte base do corpo (`font-family` do `body`)
- **`IBM Plex Mono`** — todos os dados numéricos, OPs, códigos, KPIs, labels de filtro, rodapés

### Regras
- `font-size` base do body: `14px`
- Labels uppercase com `letter-spacing`: mínimo `1.5px`, ideal `2px`
- Pesos usados: `400` (regular), `600` (semi), `700` (bold)
- **Nunca usar Arial, Roboto, Inter ou fontes system como escolha principal**

---

## 4. LAYOUT GERAL

### Estrutura de painéis
```
body / #dashboard
  └── .outer
       └── .pages (display:flex, 200% width, transition translateX)
            ├── .page.page1   (Painel 1 — Dashboard)
            └── .page.page2   (Painel 2 — Recursos)
                 └── .dash-frame  ← recebe transform:scale() via JS (zoom Ctrl+scroll)
```

- Todos os painéis ocupam `100vw × 100vh`, sem scroll externo (`overflow:hidden`)
- Scroll interno em `.tbl-wrap` e `.modal-body`
- `padding` padrão do `.dash-frame`: `14px 18px`
- Gap padrão entre seções: `12px` – `16px`

### Navegação entre painéis
- Botão `.nav-btn` fixo à direita, com animação `navGlow` pulsante
- Transição: `translateX(-50%)` no `.pages` com `cubic-bezier(.4,0,.2,1)` 0.5s
- Teclas: `→` avança, `←` volta
- Classe `.flipped` no botão quando no Painel 2

### Zoom
- `Ctrl+scroll` escala o `.dash-frame` com `transform-origin: top left`
- Range: `0.4` – `1.0`, step `0.05`
- `Ctrl+0` reseta

---

## 5. COMPONENTE: DASH-FRAME

O frame decorativo aplicado em todos os painéis. **Sempre usar este padrão exato:**

```css
.dash-frame {
  position: relative;
  border: 1px solid var(--frame-border);
  border-radius: 2px;
  background: linear-gradient(135deg, rgba(13,17,25,0.95) 0%, rgba(18,24,38,0.8) 100%);
  box-shadow: 0 0 0 1px rgba(0,212,255,0.05),
              0 0 40px rgba(0,212,255,0.04),
              inset 0 1px 0 rgba(0,212,255,0.08),
              0 4px 40px rgba(0,0,0,0.5);
}
/* Cantos decorativos via ::before ::after + .dash-frame-tr .dash-frame-bl */
/* border-width: 2px, tamanho: 12×12px, cor: var(--cyan) */
```

- Sempre incluir os 4 cantos: `::before` (top-left), `::after` (bottom-right), `.dash-frame-tr` (top-right), `.dash-frame-bl` (bottom-left)

---

## 6. COMPONENTE: TOPBAR

```css
.topbar {
  border-top: 2px solid var(--cyan);   /* faixa superior sempre ciano */
  background: var(--s1);
  border: 1px solid var(--border);
  padding: 12px 18px;
}
```

- Título: `font-size:19–20px`, `font-weight:700`, `letter-spacing:2px`
- Sempre incluir: `<span>F1</span>` em `--cyan` + `◈` em `--muted` + nome do painel em `--text`
- `.file-info`: badge verde com borda `rgba(31,221,158,.2)`
- `.reload-btn`: border muted, hover → border+color ciano

---

## 7. COMPONENTE: FILTROS MULTISELECT

### Estrutura HTML obrigatória
```html
<div class="ms-wrap">
  <div class="ms-btn" id="btn-{ID}" onclick="toggleMs('{ID}')">
    <span class="ms-label" id="lbl-{ID}">{DEFAULT_LABEL}</span>
    <span class="ms-arrow">▼</span>
  </div>
  <div class="ms-dropdown" id="drop-{ID}">
    <!-- opcional: <input class="ms-search"> -->
    <div class="ms-actions">
      <button class="ms-act-btn" onclick="selectAllMs('{ID}')">Todos</button>
      <button class="ms-act-btn" onclick="clearMs('{ID}')">Limpar</button>
    </div>
    <div id="items-{ID}"></div>
  </div>
</div>
```

### Comportamento
- Estado ativo: `border-color: var(--cyan)`, `color: var(--cyan)`, `background: rgba(0,212,255,.08)`
- Badge de contagem: `.ms-count` em `var(--cyan)` com texto `var(--bg)`
- Filtros radio (seleção única): accent `var(--orange)` nos checkboxes
- Dropdown fecha ao clicar fora via listener global no `document`
- Filtros espelhados entre Painel 1 e 2 compartilham o mesmo `msState[id]`

### IDs dos filtros existentes
| ID | Label padrão |
|----|-------------|
| `fSemana` | Semana: todas |
| `fSitPai` | Sit. Pai: todas |
| `fSitFilho` | Sit. Filho: todas |
| `fAnalise` | Análise: todas |
| `fRecursoPend` | Recurso Filho: |
| `fRecursoPai` | Recurso Pai: todos |
| `fUso` | Uso: todos |
| `fPreparacao` | Preparação: todas |
| `fPendente` | Pendente: todos *(radio)* |
| `fSaldoDisp` | Saldo Disp.: todos *(radio)* |

---

## 8. COMPONENTE: KPIs

### Painel 1
```css
.kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.kpi  { border-left: 3px solid var(--kc, var(--cyan)); }
.kpi-val { font-family: 'IBM Plex Mono'; font-size: 28px; font-weight: 700; color: var(--kc); }
.kpi-val.sm { font-size: 20px; }  /* para valores longos (toneladas) */
```

### Painel 2
```css
.kpis-top { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.kpi-top  { border-left: 3px solid {cor-do-kpi}; padding: 8–10px 12–14px; }
.kpi-top .kpi-val { font-size: 20–22px; }
```

### Cores dos KPIs por tema
| KPI | Cor |
|-----|-----|
| OPs Pai / OPs Verificadas | `--cyan` / `--yellow` |
| Total Filhos | `--yellow` |
| Peso Pai | `--green` |
| Peso Filho | `--orange` |
| Filhos c/ Pendência | `--red` |
| Em Condição | `--green` |
| Sem Condição | `--red` |
| Peso Liberado | `--accent` |

---

## 9. COMPONENTE: TABELA

### Estrutura
```html
<div class="tbl-wrap">  <!-- scroll container -->
  <table class="tbl">
    <thead><tr id="tblHead"></tr></thead>
    <tbody id="mainBody"></tbody>
  </table>
</div>
```

### Regras CSS
- `thead` sempre `position:sticky; top:0; z-index:2`
- `thead th`: background `var(--s2)`, font-size `11px`, `text-transform:uppercase`, `letter-spacing:1.5px`
- Colunas ordenáveis: `::after` com `▲` ou `▼` em `var(--cyan)` via classes `.asc` / `.desc`
- Linhas pares: `rgba(255,255,255,0.01)`
- Hover linha: `rgba(0,212,255,.03)`
- Separador de grupo pai: `border-top: 1px solid rgba(0,212,255,.2)` via classe `.sep`
- Double-click na linha abre modal de detalhes

### Tabela do Painel 2 (Recursos)
- `table-layout: fixed` com larguras definidas por coluna
- Bordas internas: `1px solid rgba(26,32,53,.8)`
- Linha TOTAL GERAL: `border-top: 2px solid rgba(0,212,255,.5)`, cor `--cyan`
- Primeira célula da linha total: `background: linear-gradient(90deg, rgba(0,212,255,.1), transparent)`

---

## 10. COMPONENTE: CHIPS / BADGES

```css
.chip { font-family: 'IBM Plex Mono'; font-size: 10px; padding: 3px 8px; border-radius: 1px; font-weight: 600; }
```

| Classe | Situação | Cor |
|--------|----------|-----|
| `.c-enc` | Encerrado | `--green` |
| `.c-fmp` | F.M.P / F.MAQ | `--cyan` |
| `.c-prog` | Prog / Env.Prod / Rec.Prod | `--yellow` |
| `.c-imp` | Imp / Não.Imp | `--muted` |
| `.c-esp` | Espera / Ret.PCP | `--orange` |
| `.c-risk` | demais | `--red` |

### Chips de Preparação
| Valor | Classe |
|-------|--------|
| Liberada | `.c-enc` (verde) |
| Em Andamento | `.c-prog` (amarelo) |
| demais | `.c-risk` (vermelho) |

### Badges de Saldo Disp.
```html
<!-- SIM -->
<span style="background:rgba(31,221,158,.1);color:var(--green);border:1px solid rgba(31,221,158,.4);font-size:11px;font-weight:700;padding:3px 10px">
  <span style="width:5px;height:5px;transform:rotate(45deg);background:var(--green)"></span>SIM
</span>
<!-- NÃO -->
<span style="background:rgba(255,77,109,.1);color:var(--red);border:1px solid rgba(255,77,109,.4)">NÃO</span>
```

### Badges de Análise
| Valor | Classe | Cor |
|-------|--------|-----|
| F1 | `.anl-f1` | `--cyan` |
| F2 | `.anl-f2` | `--orange` |
| G  | `.anl-g`  | `--yellow` |
| demais | `.anl-f2g` | `--red` |

---

## 11. COMPONENTE: MODAL

```css
.modal {
  border-top: 3px solid var(--yellow);  /* padrão */
  width: 1200px; max-width: 95vw; height: 88vh;
}
.modal.modal-op { border-top-color: var(--cyan); }  /* modal de OP Pai */
.modal.expanded { width: 98vw; height: 96vh; }
```

- Cantos decorativos: `rgba(245,200,66,.5)` no padrão, `rgba(0,212,255,.5)` no `.modal-op`
- `F11` ou botão `⛶ EXPANDIR` alterna modo expandido
- `Esc` fecha
- `backdrop-filter: blur(4px)` no overlay

---

## 12. COMPONENTE: MINI-BARRAS DE %

Usadas na coluna **% por Recurso** do Painel 2.

```html
<div class="pct-col">
  <div class="pct-row">
    <div class="pct-dot" style="background:{cor}"></div>
    <span class="pct-lbl" style="color:{cor}">{label}</span>
    <div class="pct-bar-wrap">
      <div class="pct-bar-fill" style="width:{pct}%;background:{cor}"></div>
    </div>
    <span class="pct-val" style="color:{cor}">{pct}%</span>
  </div>
</div>
```

| Label | Cor | Representa |
|-------|-----|------------|
| C | `--green` | Em Condição |
| S/C | `--red` | Sem Condição |
| L | `--accent` | Liberado |

- `.pct-dot`: `4×4px`, `border-radius:1px`, `transform:rotate(45deg)`
- `.pct-bar-wrap`: `height:5px`, `background:var(--s2)`
- `.pct-bar-fill`: `transition: width .6s ease`

---

## 13. COMPONENTE: SCROLLBAR CUSTOMIZADA

```css
*::-webkit-scrollbar       { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: rgba(18,24,38,.5); border-left: 1px solid var(--border); border-radius: 4px; }
*::-webkit-scrollbar-thumb { background: rgba(0,212,255,.2); border-radius: 4px; border: 1px solid rgba(0,212,255,.1); }
*::-webkit-scrollbar-thumb:hover  { background: rgba(0,212,255,.5); }
*::-webkit-scrollbar-thumb:active { background: rgba(0,212,255,.8); }
scrollbar-width: thin;
scrollbar-color: rgba(0,212,255,.4) var(--bg);
```

---

## 14. COMPONENTE: TELA DE LOADING

```
.loading-box → cantos em var(--cyan) 12×12px
.loading-f1  → font 30–32px, animação pulse (opacity 1→0.3, 1.6s)
.loading-bar-fill → gradient cyan, box-shadow glow, transition width .35s
```

Sequência de mensagens padrão:
1. "Lendo arquivo…" — 10%
2. "Interpretando planilha…" — 30%
3. "Processando dados…" — 55% (exibir contagem de linhas)
4. "Calculando métricas…" — 75%
5. "Renderizando dashboard…" — 95%
6. "Pronto!" — 100% → `hideLoading()` após 300ms

---

## 15. COMPONENTE: BOTÃO COPIAR

Padrão para todos os botões de copiar OPs no sistema:

```html
<button class="hbar-copy-btn" title="Copiar OPs">
  <svg><!-- ícone de copy --></svg>
</button>
```

- Estado normal: `color: var(--cyan)`
- Estado copiado: classe `.copied`, `color: var(--green)`, ícone muda para checkmark
- Timeout para reset: `2000ms`
- Fallback: `document.execCommand('copy')` se `navigator.clipboard` falhar

---

## 16. REGRAS DE JS / LÓGICA DE NEGÓCIO

### Normalização de colunas
```js
function normKey(k) {
  return k.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
```
Sempre aplicar ao ler o Excel — remove acentos e padroniza maiúsculas.

### Mapeamento de colunas Excel → campos internos
| Campo interno | Coluna Excel |
|---------------|-------------|
| `OP_KEY` | `OP_PAI` ou `OP_KEY` |
| `RECURSO` | `RECURSO` ou `MONTAGEM` |
| `SALDO_ATUAL` | `SALDO_DISPONIVEL` |
| `SALDO_DISP` | `EM_CONDICAO` |

### Cálculo de % Encerrado
```js
// Por OP_KEY: filhos com SITUACAO_FILHO === 'Enc' / total de filhos únicos
percResult[opKey] = total === 0 ? 'Sem Filhos' : Math.round(enc / total * 100) + '%';
```

### Classificação do Painel 2 (Peso por Recurso)
```
SE PREPARACAO === 'Liberada' → Peso Liberado (não entra em Em/Sem Condição)
SENÃO:
  SE todos os filhos únicos têm SALDO_DISP === 'SIM' → Em Condição
  CASO CONTRÁRIO → Sem Condição
```

### Formatação de valores
```js
fmtKg(v)  → toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:1}) + ' kg'
fmtTon(v) → se v >= 1000: (v/1000).toLocaleString(...) + ' t'; senão: fmtKg(v)
```

### Cor do % Encerrado
```js
function percClr(p) {
  var v = parseFloat(p);
  if (isNaN(v)) return 'var(--muted)';
  if (v >= 75)  return 'var(--green)';
  if (v >= 40)  return 'var(--yellow)';
  return 'var(--red)';
}
```

---

## 17. REGRAS DE RESPONSIVIDADE

```css
@media(max-width: 1100px) {
  .kpis     { grid-template-columns: repeat(3, 1fr); }
  .kpis-top { grid-template-columns: repeat(2, 1fr); }
  .bottom   { grid-template-columns: 1fr; }
  .pct-col  { display: none; }
}
@media(max-width: 700px) {
  .kpis-top { grid-template-columns: repeat(2, 1fr); }
}
```

---

## 18. PADRÕES A NUNCA QUEBRAR

1. **Nunca hardcodar cores** — sempre `var(--*)`.
2. **Nunca usar `margin` externo em `.dash-frame`** — o zoom via `scale()` depende disso.
3. **Sempre emitir `console.log` das colunas detectadas** ao processar o Excel (debug).
4. **Filtros do Painel 1 e Painel 2 compartilham `msState`** — alteração em um reflete no outro imediatamente.
5. **`applyFilters()` deve sempre chamar `renderPainelRecursos()`** para manter os painéis sincronizados.
6. **Modal sempre fecha com `Esc`** e clique no overlay fora da caixa.
7. **`F11` dentro do modal** alterna modo expandido (não afeta o browser).
8. **Scrollbar customizada** aplicada globalmente em `*`.
9. **Fonte monospace** em todos os valores numéricos, OPs e badges.
10. **Nunca usar `border-radius` > `8px`** — a estética é industrial/angular.

---

## 19. CHANGELOG DE ESTILO
> O agente deve adicionar uma entrada aqui sempre que aprovar uma mudança de estilo.

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-03 | V4.2 | Criação do STYLE_RULES.md com todas as regras extraídas do código existente |

---

*Fim do STYLE_RULES.md — atualizar este arquivo antes de cada nova sessão de desenvolvimento.*