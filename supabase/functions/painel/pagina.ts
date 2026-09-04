export const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f9f9f7">
<title>Painel Meta x Hotmart</title>
<style>
  :root {
    color-scheme: light;
    --plane: #f9f9f7; --surface: #fcfcfb;
    --ink: #0b0b0b; --ink-2: #52514e; --ink-muted: #6f6d67;
    --grid: #e1e0d9; --axis: #c3c2b7; --border: rgba(11,11,11,.10);
    --s1: #2a78d6; --s2: #eb6834;
    --barra: rgba(42,120,214,.16);
    --critical: #d03b3b; --good-text: #006300;
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
      --plane: #0d0d0d; --surface: #1a1a19;
      --ink: #ffffff; --ink-2: #c3c2b7; --ink-muted: #a3a19a;
      --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,.10);
      --s1: #3987e5; --s2: #d95926;
      --barra: rgba(57,135,229,.22);
      --good-text: #0ca30c;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --plane: #0d0d0d; --surface: #1a1a19; --ink: #fff; --ink-2: #c3c2b7;
    --ink-muted: #a3a19a; --grid: #2c2c2a; --axis: #383835;
    --border: rgba(255,255,255,.10); --s1: #3987e5; --s2: #d95926;
    --barra: rgba(57,135,229,.22); --good-text: #0ca30c;
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: var(--plane); color: var(--ink);
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-text-size-adjust: 100%; }
  h1, h2 { margin: 0; font-weight: 650; letter-spacing: -.01em; }
  button { font: inherit; color: inherit; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 16px 14px 72px; }

  #login { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
  .card-login { width: 100%; max-width: 380px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
  .card-login h1 { font-size: 22px; margin-bottom: 4px; }
  .card-login p { color: var(--ink-2); font-size: 15px; margin: 0 0 20px; }
  label { display: block; font-size: 14px; color: var(--ink-2); margin: 12px 0 6px; }
  input[type=email], input[type=password], input[type=date] {
    width: 100%; padding: 12px 14px; font: inherit; color: var(--ink);
    background: var(--plane); border: 1px solid var(--border); border-radius: 10px; }
  .btn { display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; padding: 0 18px; border-radius: 10px; cursor: pointer;
    background: var(--ink); color: var(--plane); border: 1px solid var(--ink); font-weight: 600; }
  .btn.ghost { background: transparent; color: var(--ink); border-color: var(--border); }
  .btn.block { width: 100%; margin-top: 20px; }
  .erro { color: var(--critical); font-size: 14px; margin-top: 12px; min-height: 20px; }

  header.top { display: flex; flex-wrap: wrap; gap: 12px; align-items: baseline;
    justify-content: space-between; margin-bottom: 14px; }
  header.top h1 { font-size: 21px; }
  .sub { font-size: 13.5px; color: var(--ink-muted); }

  .filtros { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 10px; }
  .filtros + .filtros { margin-bottom: 18px; }
  .rotulo-filtro { font-size: 13px; color: var(--ink-muted); margin-right: 2px; }
  .pill { min-height: 40px; padding: 0 14px; border-radius: 999px; cursor: pointer;
    background: var(--surface); border: 1px solid var(--border); color: var(--ink-2);
    font-size: 14.5px; font-weight: 550; max-width: 100%; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  .pill[aria-pressed="true"] { background: var(--ink); color: var(--plane); border-color: var(--ink); }
  .custom { display: none; gap: 8px; align-items: center; flex-wrap: wrap; }
  .custom.on { display: flex; }
  .custom input { width: 156px; min-height: 40px; }

  .tiles { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0,1fr)); margin-bottom: 18px; }
  @media (min-width: 760px) { .tiles { grid-template-columns: repeat(4, minmax(0,1fr)); } }
  .tile { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 15px; }
  .tile .rot { font-size: 13px; color: var(--ink-2); font-weight: 550; line-height: 1.3; }
  .tile .val { font-size: 23px; font-weight: 680; letter-spacing: -.02em; margin-top: 6px; white-space: nowrap; }
  @media (min-width: 420px) { .tile .val { font-size: 26px; } }
  @media (min-width: 760px) { .tile .val { font-size: 30px; } }
  .tile .nota { font-size: 12.5px; color: var(--ink-muted); margin-top: 4px; }
  .val.up { color: var(--good-text); }
  .val.down { color: var(--critical); }

  .card { background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 16px 15px; margin-bottom: 16px; }
  .card > h2 { font-size: 16.5px; margin-bottom: 2px; }
  .card > .sub { margin-bottom: 14px; }

  .legenda { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px;
    font-size: 13.5px; color: var(--ink-2); }
  .legenda i { display: inline-block; width: 11px; height: 11px; border-radius: 3px;
    margin-right: 6px; vertical-align: -1px; }

  .plot { width: 100%; overflow: visible; display: block; touch-action: pan-y; }
  .plot .gl { stroke: var(--grid); stroke-width: 1; }
  .plot .ax { stroke: var(--axis); stroke-width: 1; }
  .plot text { fill: var(--ink-muted); font-size: 11.5px; }
  .plot text.dl { fill: var(--ink-2); font-size: 12px; font-weight: 600;
    paint-order: stroke; stroke: var(--surface); stroke-width: 3.5px; stroke-linejoin: round; }

  .tip { position: fixed; z-index: 40; pointer-events: none; opacity: 0;
    transition: opacity .1s; background: var(--surface); color: var(--ink);
    border: 1px solid var(--axis); border-radius: 10px; padding: 9px 11px;
    font-size: 13.5px; box-shadow: 0 6px 22px rgba(0,0,0,.14); max-width: 250px; }
  .tip.on { opacity: 1; }
  .tip b { display: block; margin-bottom: 5px; font-size: 13px; }
  .tip .l { display: flex; justify-content: space-between; gap: 14px; }
  .tip i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; }

  .abas { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 14px; padding-bottom: 2px; }
  .aba { min-height: 40px; padding: 0 14px; white-space: nowrap; border-radius: 10px;
    cursor: pointer; background: transparent; border: 1px solid transparent;
    color: var(--ink-2); font-weight: 600; font-size: 14.5px; }
  .aba[aria-selected="true"] { background: var(--plane); border-color: var(--border); color: var(--ink); }

  .rolagem { overflow-x: auto; margin: 0 -15px; padding: 0 15px; }
  table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
  table.larga { min-width: 760px; }
  th, td { padding: 11px 10px; text-align: right; white-space: nowrap;
    border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; }
  table.larga th, table.larga td { padding: 10px 8px; }
  th:first-child, td:first-child { text-align: left; white-space: normal;
    min-width: 160px; font-variant-numeric: normal; }
  th { color: var(--ink-2); font-weight: 600; font-size: 13.5px; cursor: pointer;
    position: sticky; top: 0; background: var(--surface); }
  th[aria-sort]::after { content: " ↕"; opacity: .35; }
  th[aria-sort="descending"]::after { content: " ↓"; opacity: 1; }
  th[aria-sort="ascending"]::after { content: " ↑"; opacity: 1; }
  tbody tr:last-child td { border-bottom: 0; }
  td.pos { color: var(--good-text); }
  td.neg { color: var(--critical); }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 12.5px; font-weight: 600; border: 1px solid var(--border); }

  /* funil */
  table.funil th:first-child, table.funil td:first-child { min-width: 150px; }
  table.funil td.etapa { font-weight: 600; }
  table.funil td.med { color: var(--ink-2); }
  table.funil tr.fraca td { color: var(--ink-muted); }
  /* no celular o funil vira lista: a tabela não cabe sem cortar */
  @media (max-width: 660px) {
    table.funil thead { display: none; }
    table.funil, table.funil tbody, table.funil tr, table.funil td { display: block; width: 100%; }
    table.funil tr { border-bottom: 1px solid var(--grid); padding: 11px 0; }
    table.funil tr:last-child { border-bottom: 0; }
    table.funil td { border: 0; padding: 0; text-align: left; white-space: normal; min-width: 0; }
    table.funil td.etapa { font-size: 13.5px; color: var(--ink-2); }
    table.funil td.volume { font-size: 22px; font-weight: 680; letter-spacing: -.02em; margin: 1px 0 3px; }
    table.funil td.med { display: inline; font-size: 13.5px; }
    table.funil td.med + td.med::before { content: " · "; }
  }

  /* quebras — barra desenhada atrás do rótulo, escalada pelo maior valor */
  table.quebra th:first-child, table.quebra td:first-child { min-width: 250px; }
  .barra-linha td:first-child { position: relative; z-index: 1; }
  .barra-fundo { position: absolute; left: -4px; top: 3px; bottom: 3px;
    background: var(--barra); border-radius: 4px; min-width: 4px; }
  .rot-q { position: relative; }

  details.explica summary { cursor: pointer; font-size: 14.5px; color: var(--ink-2);
    font-weight: 550; padding: 6px 0; }
  details.explica ul { margin: 6px 0 0; padding-left: 20px; color: var(--ink-2); font-size: 14.5px; }
  details.explica li { margin-bottom: 7px; }

  .vazio { padding: 26px 8px; text-align: center; color: var(--ink-muted); font-size: 15px; }
  .carregando { opacity: .45; transition: opacity .15s; }
  .rodape { margin-top: 22px; font-size: 13px; color: var(--ink-muted); text-align: center; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
</head>
<body>

<section id="login">
  <form class="card-login" id="formLogin">
    <h1>Painel de vendas</h1>
    <p>Meta Ads x Hotmart &mdash; o que o gerenciador diz e o que entrou de fato.</p>
    <label for="email">E-mail</label>
    <input id="email" type="email" autocomplete="username" required>
    <label for="senha">Senha</label>
    <input id="senha" type="password" autocomplete="current-password" required>
    <button class="btn block" type="submit">Entrar</button>
    <div class="erro" id="erroLogin" role="alert"></div>
  </form>
</section>

<main class="wrap" id="app" hidden>
  <header class="top">
    <div>
      <h1>Meta Ads x Hotmart</h1>
      <div class="sub" id="periodoTexto">&mdash;</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn ghost" id="btnAtualizar" style="min-height:40px">Atualizar</button>
      <button class="btn ghost" id="btnSair" style="min-height:40px">Sair</button>
    </div>
  </header>

  <div class="filtros" role="group" aria-label="Periodo">
    <span class="rotulo-filtro">Período</span>
    <button class="pill" data-dias="0" aria-pressed="false">Hoje</button>
    <button class="pill" data-dias="7" aria-pressed="true">7 dias</button>
    <button class="pill" data-dias="30" aria-pressed="false">30 dias</button>
    <button class="pill" data-dias="mes" aria-pressed="false">Mês atual</button>
    <button class="pill" data-dias="custom" aria-pressed="false">Escolher</button>
    <span class="custom" id="custom">
      <input type="date" id="de" aria-label="Data inicial">
      <input type="date" id="ate" aria-label="Data final">
      <button class="pill" id="aplicar">Aplicar</button>
    </span>
  </div>

  <div class="filtros" role="group" aria-label="Produto" id="filtroProduto">
    <span class="rotulo-filtro">Produto</span>
  </div>

  <div class="tiles" id="tiles"></div>

  <section class="card">
    <h2>Funil</h2>
    <div class="sub" id="funilSub">Cada etapa, com o volume, a taxa de passagem e o custo.</div>
    <div class="rolagem" id="funil"></div>
  </section>

  <section class="card" id="funilCampanhaCard" hidden>
    <h2>Funis por campanha</h2>
    <div class="sub">Cada funil junta as campanhas da Meta (pelo nome) com as vendas da Hotmart que pertencem a ele. Independe do filtro de produto acima.</div>
    <div class="abas" role="tablist" id="abasFunil"></div>
    <div class="tiles" id="funilCampanhaTiles"></div>
    <div class="legenda" style="margin-top:6px">
      <span><i style="background:var(--s1)"></i>Investido</span>
      <span><i style="background:var(--s2)"></i>Faturado</span>
    </div>
    <div id="grafFunilCampanha"></div>
    <div class="rolagem" id="funilCampanhaEtapas"></div>
    <div class="rolagem" id="funilCampanhaBumps"></div>
    <div class="sub" id="funilCampanhaNota" style="margin-top:8px"></div>
  </section>

  <section class="card">
    <h2>Vendas: gerenciador x Hotmart</h2>
    <div class="sub">Compras que a Meta reporta contra vendas aprovadas na Hotmart com rastreio.</div>
    <div class="legenda">
      <span><i style="background:var(--s1)"></i>Gerenciador (Meta)</span>
      <span><i style="background:var(--s2)"></i>Hotmart (rastreadas)</span>
    </div>
    <div id="grafVendas"></div>
  </section>

  <section class="card">
    <h2>Investimento x faturamento</h2>
    <div class="sub">Ambos em reais, no mesmo eixo.</div>
    <div class="legenda">
      <span><i style="background:var(--s1)"></i>Investido</span>
      <span><i style="background:var(--s2)"></i>Faturado</span>
    </div>
    <div id="grafDinheiro"></div>
  </section>

  <section class="card">
    <h2>Anúncios que mais performaram</h2>
    <div class="sub">Clique num cabeçalho para reordenar. Começa pelo que mais consumiu verba.</div>
    <div class="rolagem" id="tabelaAds"></div>
  </section>

  <section class="card">
    <h2>Quem viu e onde</h2>
    <div class="sub">Quebra da entrega. A barra mostra a fatia do investimento.</div>
    <div class="abas" role="tablist" id="abasQuebra">
      <button class="aba" role="tab" aria-selected="true"  data-q="genero">Gênero</button>
      <button class="aba" role="tab" aria-selected="false" data-q="idade">Idade</button>
      <button class="aba" role="tab" aria-selected="false" data-q="plataforma">Plataforma</button>
      <button class="aba" role="tab" aria-selected="false" data-q="posicionamento">Posicionamento</button>
    </div>
    <div class="rolagem" id="tabelaQuebra"></div>
  </section>

  <section class="card">
    <h2>Onde está a diferença</h2>
    <div class="sub">O mesmo período, por campanha, por dia e venda a venda.</div>
    <div class="abas" role="tablist" id="abasTabela">
      <button class="aba" role="tab" aria-selected="true"  data-aba="campanhas">Campanhas</button>
      <button class="aba" role="tab" aria-selected="false" data-aba="dias">Dia a dia</button>
      <button class="aba" role="tab" aria-selected="false" data-aba="vendas">Últimas vendas</button>
    </div>
    <div class="rolagem" id="tabela"></div>
  </section>

  <section class="card">
    <h2>Qualidade do rastreio</h2>
    <div class="sub" id="rastreioSub">&mdash;</div>
    <details class="explica">
      <summary>Por que o gerenciador e a Hotmart nunca batem exatamente</summary>
      <ul>
        <li><b>Janela de atribuição.</b> A Meta credita a venda ao <i>dia do clique</i>; a Hotmart registra no <i>dia da aprovação</i>. Boleto e Pix atrasado jogam a venda para outro dia.</li>
        <li><b>Reprocessamento.</b> A Meta reatribui conversões por até 72h, então os últimos 3 dias ainda mudam. O painel reprocessa 7 dias a cada sincronização.</li>
        <li><b>Rastreio perdido.</b> Compra em outro dispositivo, link compartilhado ou checkout aberto sem os parâmetros: a venda existe na Hotmart, mas sem <code>src</code>/<code>sck</code> ela não tem como voltar para o anúncio.</li>
        <li><b>Order bump.</b> O pixel dispara uma compra; a Hotmart pode gerar duas transações. O painel marca as que vêm como order bump.</li>
        <li><b>Reembolso e chargeback.</b> A Meta não desfaz a conversão. A Hotmart sim &mdash; e é por isso que o ROAS real cai depois.</li>
        <li><b>Alcance não soma.</b> A mesma pessoa alcançada em dois dias conta duas vezes numa soma. Por isso o alcance aparece como "soma dos dias", não como público único do período.</li>
      </ul>
    </details>
  </section>

  <div class="rodape" id="rodape">&mdash;</div>
</main>

<div class="tip" id="tip" role="status" aria-live="polite"></div>

<script>
var SUPABASE_URL = "https://pallgafprdnswzigomyl.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGxnYWZwcmRuc3d6aWdvbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTAyNDEsImV4cCI6MjEwMzM2NjI0MX0.5sqhhxeR0M-ZocXV-UYKctxxSZoFAVDyT-vQZEeg-BM";

/* ---------- sessão ---------- */
var GUARDA = "painel_sessao";
var sessao = null;
try { sessao = JSON.parse(localStorage.getItem(GUARDA) || "null"); } catch (e) { sessao = null; }

async function entrar(email, senha) {
  var r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: senha })
  });
  var j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.msg || j.message || "Não foi possível entrar.");
  guardar(j);
}
function guardar(j) {
  sessao = { token: j.access_token, refresh: j.refresh_token, expira: Date.now() + (j.expires_in - 60) * 1000 };
  try { localStorage.setItem(GUARDA, JSON.stringify(sessao)); } catch (e) {}
}
async function renovar() {
  if (!sessao || !sessao.refresh) throw new Error("sem sessão");
  var r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: sessao.refresh })
  });
  var j = await r.json();
  if (!r.ok) { sair(); throw new Error("sessão expirada"); }
  guardar(j);
}
function sair() {
  sessao = null;
  try { localStorage.removeItem(GUARDA); } catch (e) {}
  document.getElementById("app").hidden = true;
  document.getElementById("login").style.display = "grid";
}
async function consultar(caminho) {
  if (sessao && Date.now() > sessao.expira) await renovar();
  var r = await fetch(SUPABASE_URL + "/rest/v1/" + caminho, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + sessao.token }
  });
  if (r.status === 401) { await renovar(); return consultar(caminho); }
  if (!r.ok) throw new Error(caminho + ": " + (await r.text()));
  return r.json();
}

/* ---------- formatação ---------- */
function nBR(v, d) { d = d || 0; return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }); }
function rs(v, d) { return "R$ " + nBR(v, d); }
function pct(v) { return (v === null || v === undefined || isNaN(v)) ? "—" : nBR(v, 1) + "%"; }
function num(v) { return Number(v) || 0; }
function soma(a, k) { return a.reduce(function (s, o) { return s + (Number(o[k]) || 0); }, 0); }
function taxa(a, b) { return b > 0 ? (a / b) * 100 : null; }
function custo(g, q) { return q > 0 ? g / q : null; }
function diaCurto(iso) { var p = iso.split("-"); return p[2] + "/" + p[1]; }
function brData(iso) { return iso.split("-").reverse().join("/"); }
function hojeISO() { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); }
function menosDias(n) { var d = new Date(Date.now() - 3 * 3600e3); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

var estado = { de: menosDias(6), ate: hojeISO(), produto: "todos", funil: null, aba: "campanhas", quebra: "genero", dados: null, ordem: {} };

/* ---------- gráfico de linhas ---------- */
function grafico(alvo, linhas, cfg) {
  var el = document.getElementById(alvo);
  if (!linhas.length) { el.innerHTML = '<div class="vazio">Sem dados no período.</div>'; return; }

  var L = 46, R = 16, T = 12, B = 30;
  var W = Math.max(el.clientWidth || 640, 300);
  var alturaPlot = W < 520 ? 170 : 210;
  var H = alturaPlot + T + B;

  var maxV = 1;
  linhas.forEach(function (p) { maxV = Math.max(maxV, p.a, p.b); });
  var passo = Math.pow(10, Math.floor(Math.log10(maxV)));
  var teto = Math.ceil(maxV / (passo / 2)) * (passo / 2) || 1;

  function x(i) { return L + (linhas.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (linhas.length - 1)); }
  function y(v) { return T + alturaPlot - (v / teto) * alturaPlot; }

  var s = '<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + cfg.titulo + '">';
  [0, teto / 2, teto].forEach(function (v) {
    s += '<line class="gl" x1="' + L + '" y1="' + y(v) + '" x2="' + (W - R) + '" y2="' + y(v) + '"/>';
    s += '<text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + cfg.eixo(v) + '</text>';
  });
  s += '<line class="ax" x1="' + L + '" y1="' + y(0) + '" x2="' + (W - R) + '" y2="' + y(0) + '"/>';

  var passoRotulo = Math.ceil(linhas.length / (W < 520 ? 5 : 9));
  linhas.forEach(function (p, i) {
    if (i % passoRotulo === 0 || i === linhas.length - 1) {
      s += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + diaCurto(p.dia) + '</text>';
    }
  });

  function caminho(k) {
    return linhas.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + "," + y(p[k]).toFixed(1); }).join(" ");
  }
  s += '<path d="' + caminho("a") + '" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  s += '<path d="' + caminho("b") + '" fill="none" stroke="var(--s2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

  if (linhas.length <= 40) {
    linhas.forEach(function (p, i) {
      s += '<circle cx="' + x(i) + '" cy="' + y(p.a) + '" r="3.2" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>';
      s += '<circle cx="' + x(i) + '" cy="' + y(p.b) + '" r="3.2" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/>';
    });
  }

  var ult = linhas[linhas.length - 1];
  var px = x(linhas.length - 1);
  var ya = y(ult.a), yb = y(ult.b);
  var acima = ya <= yb;
  if (Math.abs(ya - yb) < 22) { var meio = (ya + yb) / 2; ya = meio + (acima ? -11 : 11); yb = meio + (acima ? 11 : -11); }
  ya += acima ? -8 : 12; yb += acima ? 12 : -8;
  function trava(v) { return Math.min(Math.max(v, T + 10), T + alturaPlot - 2); }
  s += '<text class="dl" x="' + px + '" y="' + trava(ya) + '" text-anchor="end">' + cfg.rot(ult.a) + '</text>';
  s += '<text class="dl" x="' + px + '" y="' + trava(yb) + '" text-anchor="end">' + cfg.rot(ult.b) + '</text>';

  s += '<line id="' + alvo + '-cross" class="ax" x1="0" y1="' + T + '" x2="0" y2="' + (T + alturaPlot) + '" opacity="0"/>';
  s += '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + alturaPlot + '" fill="transparent"/>';
  s += '</svg>';
  el.innerHTML = s;

  var svg = el.querySelector("svg");
  var cross = document.getElementById(alvo + "-cross");
  var tip = document.getElementById("tip");

  function mostrar(ev) {
    var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    var cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    var cai = svg.getBoundingClientRect();
    var posX = (cx - cai.left) * (W / cai.width);
    var i = 0, melhor = Infinity;
    linhas.forEach(function (_, k) { var d = Math.abs(x(k) - posX); if (d < melhor) { melhor = d; i = k; } });
    var p = linhas[i];
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", ".55");
    tip.innerHTML = "<b>" + brData(p.dia) + "</b>" +
      '<div class="l"><span><i style="background:var(--s1)"></i>' + cfg.nomeA + '</span><b style="font-weight:650">' + cfg.rot(p.a) + "</b></div>" +
      '<div class="l"><span><i style="background:var(--s2)"></i>' + cfg.nomeB + '</span><b style="font-weight:650">' + cfg.rot(p.b) + "</b></div>";
    tip.classList.add("on");
    var larg = tip.offsetWidth || 200;
    tip.style.left = Math.min(Math.max(8, cx - larg / 2), innerWidth - larg - 8) + "px";
    tip.style.top = Math.max(8, cy - tip.offsetHeight - 16) + "px";
  }
  function esconder() { tip.classList.remove("on"); cross.setAttribute("opacity", "0"); }

  svg.addEventListener("mousemove", mostrar);
  svg.addEventListener("mouseleave", esconder);
  svg.addEventListener("touchstart", mostrar, { passive: true });
  svg.addEventListener("touchmove", mostrar, { passive: true });
  svg.addEventListener("touchend", esconder);
}

/* ---------- agregação ---------- */
var CAMPOS_F = ["investido_brl", "impressoes", "alcance_dia", "cliques", "cliques_link",
  "pageviews", "checkouts", "vendas_meta", "receita_meta_brl", "leads", "conversas",
  "vendas_hotmart", "vendas_rastreadas", "receita_hotmart_brl", "reembolsos"];

function agregar(linhas) {
  var f = {};
  CAMPOS_F.forEach(function (k) { f[k] = soma(linhas, k); });
  return f;
}

/** Linhas do período, já filtradas pelo produto escolhido. */
function escopo() {
  var d = estado.dados;
  if (estado.produto === "todos") {
    return { dias: d.dias, ads: d.ads, quebra: d.quebra, funil: agregarTodos(d) };
  }
  var pid = Number(estado.produto);
  var funilDias = d.funil.filter(function (l) { return Number(l.product_id) === pid; });
  return {
    dias: funilDias.map(function (l) {
      return {
        data: l.data, investido_brl: l.investido_brl, vendas_meta: l.vendas_meta,
        vendas_rastreadas: l.vendas_rastreadas, vendas_hotmart: l.vendas_hotmart,
        receita_hotmart_brl: l.receita_hotmart_brl, receita_rastreada_brl: l.receita_hotmart_brl,
        vendas_sem_rastreio: num(l.vendas_hotmart) - num(l.vendas_rastreadas),
        receita_meta_brl: l.receita_meta_brl, reembolsos: l.reembolsos
      };
    }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }),
    ads: d.ads.filter(function (l) { return Number(l.product_id) === pid; }),
    quebra: d.quebra.filter(function (l) { return Number(l.product_id) === pid; }),
    funil: agregar(funilDias)
  };
}

/** Para "todos": funil vem dos anúncios; vendas Hotmart vêm do resumo do dia
    (inclui o que não tem rastreio). */
function agregarTodos(d) {
  var f = agregar(d.ads);
  f.vendas_hotmart = soma(d.dias, "vendas_hotmart");
  f.vendas_rastreadas = soma(d.dias, "vendas_rastreadas");
  f.receita_hotmart_brl = soma(d.dias, "receita_hotmart_brl");
  f.reembolsos = soma(d.dias, "reembolsos");
  return f;
}

/* ---------- tiles ---------- */
function tiles(e) {
  var f = e.funil;
  var gap = f.vendas_meta - f.vendas_rastreadas;
  var gapPct = f.vendas_meta > 0 ? (gap / f.vendas_meta) * 100 : null;
  var recRastr = estado.produto === "todos" ? soma(e.dias, "receita_rastreada_brl") : f.receita_hotmart_brl;
  var roasMeta = custo(f.receita_meta_brl, f.investido_brl);
  var roasReal = custo(recRastr, f.investido_brl);
  var roasGeral = custo(f.receita_hotmart_brl, f.investido_brl);
  var cac = custo(f.investido_brl, f.vendas_rastreadas);

  function t(rot, val, nota, classe) {
    return '<div class="tile"><div class="rot">' + rot + '</div><div class="val ' + (classe || "") + '">' + val + "</div>" +
      '<div class="nota">' + nota + "</div></div>";
  }
  var cards = [
    t("Investido", rs(f.investido_brl, 2), nBR(e.dias.length) + " dia(s) no período"),
    t("Vendas no gerenciador", nBR(f.vendas_meta), "compras reportadas pela Meta"),
    t("Vendas na Hotmart", nBR(f.vendas_hotmart), nBR(f.vendas_rastreadas) + " com rastreio"),
    t("Diferença", (gap >= 0 ? "+" : "") + nBR(gap),
      nBR(f.vendas_meta) + " no gerenciador − " + nBR(f.vendas_rastreadas) + " rastreadas" +
      (gapPct === null ? "" : " · " + pct(Math.abs(gapPct))),
      gap < 0 ? "up" : ((gapPct || 0) >= 20 ? "down" : "")),
    t("ROAS do gerenciador", roasMeta === null ? "—" : nBR(roasMeta, 2) + "x", "receita que a Meta atribui"),
    t("ROAS real", roasReal === null ? "—" : nBR(roasReal, 2) + "x", "só vendas Hotmart rastreadas",
      roasReal !== null && roasMeta !== null && roasReal >= roasMeta ? "up" : ""),
    t("ROAS sobre tudo", roasGeral === null ? "—" : nBR(roasGeral, 2) + "x", "faturamento total ÷ investido"),
    t("CAC real", cac === null ? "—" : rs(cac, 2), nBR(f.reembolsos) + " reembolso(s) no período")
  ];
  document.getElementById("tiles").innerHTML = cards.join("");

  var nome = estado.produto === "todos" ? "todos os produtos" : nomeProduto(estado.produto);
  document.getElementById("periodoTexto").textContent =
    brData(estado.de) + " a " + brData(estado.ate) + " · " + nome + " · faturamento " + rs(f.receita_hotmart_brl, 2);
}

function nomeProduto(pid) {
  var p = (estado.dados.produtos || []).filter(function (x) { return String(x.product_id) === String(pid); })[0];
  return p ? p.produto : "#" + pid;
}

/* ---------- funil ---------- */
function funil(e) {
  var f = e.funil;
  var linhas = [
    ["Impressões", nBR(f.impressoes),
      "alcance " + nBR(f.alcance_dia) + " (soma dos dias)",
      "CPM " + (f.impressoes > 0 ? rs(f.investido_brl / f.impressoes * 1000, 2) : "—")],
    ["Cliques no link", nBR(f.cliques_link),
      "CTR " + pct(taxa(f.cliques_link, f.impressoes)),
      "CPC " + (f.cliques_link > 0 ? rs(f.investido_brl / f.cliques_link, 2) : "—")],
    ["Visitas na página", nBR(f.pageviews),
      "connect rate " + pct(taxa(f.pageviews, f.cliques_link)),
      f.pageviews > 0 ? rs(f.investido_brl / f.pageviews, 2) + " por visita" : "—"],
    ["Checkouts iniciados", nBR(f.checkouts),
      "conversão " + pct(taxa(f.checkouts, f.pageviews)),
      f.checkouts > 0 ? rs(f.investido_brl / f.checkouts, 2) + " por checkout" : "—"],
    ["Compras (Hotmart)", nBR(f.vendas_rastreadas),
      "conversão " + pct(taxa(f.vendas_rastreadas, f.pageviews)),
      "CAC " + (f.vendas_rastreadas > 0 ? rs(f.investido_brl / f.vendas_rastreadas, 2) : "—")]
  ];
  if (f.leads > 0) {
    linhas.push(["Leads", nBR(f.leads),
      "por visita " + pct(taxa(f.leads, f.pageviews)),
      "CPL " + rs(f.investido_brl / f.leads, 2)]);
  }
  if (f.conversas > 0) {
    linhas.push(["Conversas no WhatsApp", nBR(f.conversas),
      "por clique " + pct(taxa(f.conversas, f.cliques_link)),
      rs(f.investido_brl / f.conversas, 2) + " por conversa"]);
  }

  var corpo = linhas.map(function (l) {
    var fraca = l[1] === "0";
    return '<tr class="' + (fraca ? "fraca" : "") + '"><td class="etapa">' + l[0] + "</td>" +
      '<td class="volume">' + l[1] + '</td><td class="med">' + l[2] + '</td><td class="med">' + l[3] + "</td></tr>";
  }).join("");

  document.getElementById("funil").innerHTML =
    '<table class="funil"><thead><tr><th>Etapa</th><th>Volume</th><th>Taxa</th><th>Custo</th></tr></thead>' +
    "<tbody>" + corpo + "</tbody></table>";

  document.getElementById("funilSub").textContent = f.investido_brl > 0
    ? "Cada etapa, com o volume, a taxa de passagem e o custo. Taxas calculadas sobre o total do período."
    : "Sem investimento registrado no período.";
}

/* ---------- tabela de anúncios ---------- */
function tabelaAds(e) {
  var m = new Map();
  e.ads.forEach(function (l) {
    var k = String(l.ad_id);
    if (!m.has(k)) {
      m.set(k, { ad_id: l.ad_id, ad_name: l.ad_name, campaign_name: l.campaign_name,
        product_id: l.product_id, investido_brl: 0, impressoes: 0, alcance_dia: 0,
        cliques_link: 0, pageviews: 0, checkouts: 0, vendas_meta: 0,
        vendas_hotmart: 0, receita_hotmart_brl: 0, leads: 0, conversas: 0 });
    }
    var a = m.get(k);
    ["investido_brl", "impressoes", "alcance_dia", "cliques_link", "pageviews", "checkouts",
     "vendas_meta", "vendas_hotmart", "receita_hotmart_brl", "leads", "conversas"]
      .forEach(function (c) { a[c] += num(l[c]); });
    if (!a.ad_name && l.ad_name) a.ad_name = l.ad_name;
  });

  var linhas = Array.from(m.values()).map(function (a) {
    a.cpm = a.impressoes > 0 ? a.investido_brl / a.impressoes * 1000 : null;
    a.ctr = taxa(a.cliques_link, a.impressoes);
    a.connect = taxa(a.pageviews, a.cliques_link);
    a.custo_checkout = custo(a.investido_brl, a.checkouts);
    a.cac = custo(a.investido_brl, a.vendas_hotmart);
    a.roas = custo(a.receita_hotmart_brl, a.investido_brl);
    a.cpl = custo(a.investido_brl, a.leads + a.conversas);
    return a;
  });

  var cols = [
    ["ad_name", "Anúncio", function (r) {
      return esc(r.ad_name || ("#" + r.ad_id)) +
        (r.campaign_name ? '<div class="sub">' + esc(r.campaign_name) + "</div>" : ""); }],
    ["investido_brl", "Investido", function (r) { return rs(r.investido_brl, 2); }],
    ["alcance_dia", "Alcance", function (r) { return nBR(r.alcance_dia); }],
    ["cpm", "CPM", function (r) { return r.cpm == null ? "—" : rs(r.cpm, 2); }],
    ["ctr", "CTR link", function (r) { return pct(r.ctr); }],
    ["connect", "Connect", function (r) { return pct(r.connect); }],
    ["checkouts", "Checkouts", function (r) { return nBR(r.checkouts); }],
    ["custo_checkout", "Custo/check.", function (r) { return r.custo_checkout == null ? "—" : rs(r.custo_checkout, 2); }],
    ["vendas_hotmart", "Vendas", function (r) { return nBR(r.vendas_hotmart); }],
    ["cac", "CAC", function (r) { return r.cac == null ? "—" : rs(r.cac, 2); }],
    ["roas", "ROAS real", function (r) { return r.roas == null ? "—" : nBR(r.roas, 2) + "x"; }]
  ];
  var temLead = linhas.some(function (r) { return r.leads + r.conversas > 0; });
  if (temLead) {
    cols.splice(8, 0, ["leads", "Leads", function (r) { return nBR(r.leads + r.conversas); }]);
    cols.splice(9, 0, ["cpl", "CPL", function (r) { return r.cpl == null ? "—" : rs(r.cpl, 2); }]);
  }

  render("tabelaAds", "ads", cols, linhas, "investido_brl");
}

/* ---------- quebras ---------- */
var QUEBRAS = {
  genero:         { tipo: "demografia",     campo: "chave2", titulo: "Gênero" },
  idade:          { tipo: "demografia",     campo: "chave1", titulo: "Faixa etária" },
  plataforma:     { tipo: "posicionamento", campo: "chave1", titulo: "Plataforma" },
  posicionamento: { tipo: "posicionamento", campo: "chave2", titulo: "Posicionamento" }
};
var TRADUZ = {
  female: "Feminino", male: "Masculino", unknown: "Não informado",
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger",
  audience_network: "Audience Network", threads: "Threads", whatsapp: "WhatsApp",
  feed: "Feed", story: "Stories", reels: "Reels", explore: "Explorar",
  video_feeds: "Feed de vídeo", instant_article: "Artigo instantâneo",
  marketplace: "Marketplace", search: "Busca", right_hand_column: "Coluna direita",
  facebook_reels: "Reels do Facebook", instagram_reels: "Reels do Instagram",
  instream_video: "Vídeo in-stream", profile_feed: "Feed do perfil", desconhecido: "Desconhecido"
};
function rotulo(v) { return TRADUZ[v] || (v === "" ? "Não informado" : v); }

function tabelaQuebra(e) {
  var cfg = QUEBRAS[estado.quebra];
  var m = new Map();
  e.quebra.filter(function (l) { return l.tipo === cfg.tipo; }).forEach(function (l) {
    var k = String(l[cfg.campo] || "");
    if (!m.has(k)) m.set(k, { chave: k, investido_brl: 0, impressoes: 0, alcance_dia: 0,
      cliques_link: 0, pageviews: 0, checkouts: 0, vendas_meta: 0, leads: 0, conversas: 0 });
    var a = m.get(k);
    ["investido_brl", "impressoes", "alcance_dia", "cliques_link", "pageviews", "checkouts", "vendas_meta", "leads", "conversas"]
      .forEach(function (c) { a[c] += num(l[c]); });
  });

  var linhas = Array.from(m.values());
  var alvo = document.getElementById("tabelaQuebra");
  if (!linhas.length) {
    alvo.innerHTML = '<div class="vazio">Ainda não há quebra de ' + cfg.titulo.toLowerCase() +
      " neste período. Ela chega na próxima sincronização da Meta.</div>";
    return;
  }

  var total = linhas.reduce(function (s, r) { return s + r.investido_brl; }, 0);
  var maior = linhas.reduce(function (s, r) { return Math.max(s, r.investido_brl); }, 0);
  linhas.sort(function (a, b) { return b.investido_brl - a.investido_brl; });

  var corpo = linhas.map(function (r) {
    var fatia = total > 0 ? (r.investido_brl / total) * 100 : 0;
    var largura = maior > 0 ? (r.investido_brl / maior) * 100 : 0;
    return '<tr class="barra-linha">' +
      '<td><span class="barra-fundo" style="width:' + largura.toFixed(1) + '%"></span>' +
      '<span class="rot-q">' + esc(rotulo(r.chave)) + "</span></td>" +
      "<td>" + rs(r.investido_brl, 2) + "</td>" +
      "<td>" + pct(fatia) + "</td>" +
      "<td>" + nBR(r.impressoes) + "</td>" +
      "<td>" + pct(taxa(r.cliques_link, r.impressoes)) + "</td>" +
      "<td>" + nBR(r.checkouts) + "</td>" +
      "<td>" + nBR(r.vendas_meta) + "</td>" +
      "<td>" + (r.vendas_meta > 0 ? rs(r.investido_brl / r.vendas_meta, 2) : "—") + "</td>" +
      "</tr>";
  }).join("");

  alvo.innerHTML = '<table class="larga quebra"><thead><tr><th>' + cfg.titulo +
    "</th><th>Investido</th><th>Fatia</th><th>Impressões</th><th>CTR link</th>" +
    "<th>Checkouts</th><th>Compras</th><th>Custo/compra</th></tr></thead><tbody>" +
    corpo + "</tbody></table>" +
    '<div class="sub" style="margin-top:10px">Compras aqui são as reportadas pela Meta &mdash; a quebra ' +
    "por gênero e posicionamento só existe do lado dela.</div>";
}

/* ---------- tabela geral ---------- */
function tabelaGeral(e) {
  var d = estado.dados;
  var cols, linhas, padrao;

  if (estado.aba === "campanhas") {
    var m = new Map();
    var origem = estado.produto === "todos" ? d.campanhas : e.ads;
    origem.forEach(function (l) {
      var k = String(l.campaign_id || "sem");
      if (!m.has(k)) m.set(k, { campaign_id: l.campaign_id, campaign_name: l.campaign_name,
        investido_brl: 0, vendas_meta: 0, vendas_hotmart: 0, receita_hotmart_brl: 0, receita_meta_brl: 0 });
      var a = m.get(k);
      ["investido_brl", "vendas_meta", "vendas_hotmart", "receita_hotmart_brl", "receita_meta_brl"]
        .forEach(function (c) { a[c] += num(l[c]); });
      if (!a.campaign_name && l.campaign_name) a.campaign_name = l.campaign_name;
    });
    linhas = Array.from(m.values()).map(function (a) {
      a.gap_vendas = a.vendas_meta - a.vendas_hotmart;
      a.roas_meta = custo(a.receita_meta_brl, a.investido_brl);
      a.roas_real = custo(a.receita_hotmart_brl, a.investido_brl);
      a.cac_real = custo(a.investido_brl, a.vendas_hotmart);
      return a;
    });
    cols = [
      ["campaign_name", "Campanha", function (r) { return esc(r.campaign_name || (r.campaign_id ? "#" + r.campaign_id : "Sem campanha")); }],
      ["investido_brl", "Investido", function (r) { return rs(r.investido_brl, 2); }],
      ["vendas_meta", "Meta", function (r) { return nBR(r.vendas_meta); }],
      ["vendas_hotmart", "Hotmart", function (r) { return nBR(r.vendas_hotmart); }],
      ["gap_vendas", "Dif.", function (r) { return (r.gap_vendas > 0 ? "+" : "") + nBR(r.gap_vendas); },
        function (r) { return r.gap_vendas > 0 ? "neg" : (r.gap_vendas < 0 ? "pos" : ""); }],
      ["receita_hotmart_brl", "Faturado", function (r) { return rs(r.receita_hotmart_brl, 2); }],
      ["roas_meta", "ROAS Meta", function (r) { return r.roas_meta == null ? "—" : nBR(r.roas_meta, 2) + "x"; }],
      ["roas_real", "ROAS real", function (r) { return r.roas_real == null ? "—" : nBR(r.roas_real, 2) + "x"; }],
      ["cac_real", "CAC", function (r) { return r.cac_real == null ? "—" : rs(r.cac_real, 2); }]
    ];
    padrao = "investido_brl";
  } else if (estado.aba === "dias") {
    linhas = e.dias.slice().reverse().map(function (l) {
      var o = Object.assign({}, l);
      o.gap_vendas = num(l.vendas_meta) - num(l.vendas_rastreadas);
      o.roas_real = custo(num(l.receita_rastreada_brl), num(l.investido_brl));
      return o;
    });
    cols = [
      ["data", "Dia", function (r) { return brData(r.data); }],
      ["investido_brl", "Investido", function (r) { return rs(r.investido_brl, 2); }],
      ["vendas_meta", "Meta", function (r) { return nBR(r.vendas_meta); }],
      ["vendas_rastreadas", "Hotmart rastr.", function (r) { return nBR(r.vendas_rastreadas); }],
      ["vendas_hotmart", "Hotmart total", function (r) { return nBR(r.vendas_hotmart); }],
      ["gap_vendas", "Dif.", function (r) { return (r.gap_vendas > 0 ? "+" : "") + nBR(r.gap_vendas); },
        function (r) { return r.gap_vendas > 0 ? "neg" : (r.gap_vendas < 0 ? "pos" : ""); }],
      ["receita_hotmart_brl", "Faturado", function (r) { return rs(r.receita_hotmart_brl, 2); }],
      ["roas_real", "ROAS real", function (r) { return r.roas_real == null ? "—" : nBR(r.roas_real, 2) + "x"; }]
    ];
    padrao = null;
  } else {
    linhas = d.vendas.filter(function (v) {
      var dia = (v.approved_date || v.order_date || "").slice(0, 10);
      if (dia < estado.de || dia > estado.ate) return false;
      if (estado.produto === "todos") return true;
      return String(v.product_id) === String(estado.produto);
    });
    cols = [
      ["produto", "Produto", function (r) { return esc(r.produto || "—") + (r.is_order_bump ? ' <span class="tag">bump</span>' : ""); }],
      ["approved_date", "Aprovada", function (r) { var x = r.approved_date || r.order_date;
        return x ? new Date(x).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"; }],
      ["status", "Status", function (r) { return r.status; }],
      ["price_value", "Valor", function (r) { return (r.currency || "") + " " + nBR(r.price_value, 2); }],
      ["src", "src / sck", function (r) { return esc([r.src, r.sck].filter(Boolean).join(" · ") || "—"); }],
      ["meta_ad_id", "Anúncio", function (r) { return r.meta_ad_id ? "#" + r.meta_ad_id : '<span style="color:var(--critical)">sem rastreio</span>'; }],
      ["comprador", "Comprador", function (r) { return esc(r.comprador || "—"); }]
    ];
    padrao = null;
  }
  render("tabela", estado.aba, cols, linhas, padrao);
}

/* ---------- renderizador de tabela ordenável ---------- */
function render(alvoId, chaveOrdem, cols, linhas, padrao) {
  var alvo = document.getElementById(alvoId);
  if (!linhas.length) { alvo.innerHTML = '<div class="vazio">Nada aqui neste período.</div>'; return; }

  var ord = estado.ordem[chaveOrdem];
  if (ord) {
    linhas.sort(function (a, b) {
      var va = a[ord.col], vb = b[ord.col];
      if (va == null) va = -Infinity;
      if (vb == null) vb = -Infinity;
      if (typeof va === "number" && typeof vb === "number") return ord.dir * (va - vb);
      return ord.dir * String(va).localeCompare(String(vb), "pt-BR");
    });
  } else if (padrao) {
    linhas.sort(function (a, b) { return num(b[padrao]) - num(a[padrao]); });
  }

  var cabec = cols.map(function (c) {
    var a = ord && ord.col === c[0] ? (ord.dir === 1 ? "ascending" : "descending") : "none";
    return '<th aria-sort="' + a + '" data-col="' + c[0] + '">' + c[1] + "</th>";
  }).join("");
  var corpo = linhas.slice(0, 300).map(function (r) {
    return "<tr>" + cols.map(function (c) {
      return '<td class="' + (c[3] ? c[3](r) : "") + '">' + c[2](r) + "</td>";
    }).join("") + "</tr>";
  }).join("");

  alvo.innerHTML = '<table class="larga"><thead><tr>' + cabec + "</tr></thead><tbody>" + corpo + "</tbody></table>";
  alvo.querySelectorAll("th").forEach(function (th) {
    th.addEventListener("click", function () {
      var col = th.dataset.col;
      var atual = estado.ordem[chaveOrdem];
      estado.ordem[chaveOrdem] = { col: col, dir: atual && atual.col === col && atual.dir === -1 ? 1 : -1 };
      desenhar();
    });
  });
}

/* ---------- filtro de produto ---------- */
function montarFiltroProduto() {
  var el = document.getElementById("filtroProduto");
  var lista = (estado.dados.produtos || []).filter(function (p) { return num(p.vendas) > 0 || p.tem_anuncio; });
  var html = '<span class="rotulo-filtro">Produto</span>' +
    '<button class="pill" data-produto="todos" aria-pressed="' + (estado.produto === "todos") + '">Todos</button>';
  lista.forEach(function (p) {
    html += '<button class="pill" data-produto="' + p.product_id + '" aria-pressed="' +
      (String(estado.produto) === String(p.product_id)) + '" title="' + esc(p.produto) + '">' +
      esc(p.produto.length > 34 ? p.produto.slice(0, 33) + "…" : p.produto) + "</button>";
  });
  el.innerHTML = html;
  el.querySelectorAll("[data-produto]").forEach(function (b) {
    b.addEventListener("click", function () {
      estado.produto = b.dataset.produto;
      el.querySelectorAll("[data-produto]").forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      desenhar();
    });
  });
}

/* ---------- funis por campanha ---------- */
var CAMPOS_FC = ["investido_brl", "impressoes", "alcance_dia", "cliques", "cliques_link",
  "pageviews", "checkouts", "vendas_meta", "receita_meta_brl", "leads", "conversas",
  "vendas_hotmart", "vendas_principais", "vendas_bump", "vendas_rastreadas",
  "receita_hotmart_brl", "liquido_brl", "reembolsos"];

function qtdDias(linhas) { var s = {}; linhas.forEach(function (l) { s[l.data] = 1; }); return Object.keys(s).length; }

function funilCampanha() {
  var d = estado.dados;
  var card = document.getElementById("funilCampanhaCard");
  var lista = d.funis || [];
  if (!lista.length) { card.hidden = true; return; }
  card.hidden = false;

  if (!estado.funil || !lista.some(function (x) { return x.slug === estado.funil; })) estado.funil = lista[0].slug;
  var sel = lista.filter(function (x) { return x.slug === estado.funil; })[0];

  document.getElementById("abasFunil").innerHTML = lista.map(function (x) {
    return '<button class="aba" role="tab" data-funil="' + x.slug + '" aria-selected="' +
      (x.slug === estado.funil) + '">' + esc(x.nome) + "</button>";
  }).join("");
  document.querySelectorAll("#abasFunil .aba").forEach(function (b) {
    b.addEventListener("click", function () { estado.funil = b.dataset.funil; funilCampanha(); });
  });

  var linhas = (d.funilCampanha || []).filter(function (l) { return String(l.funil_id) === String(sel.funil_id); });
  var f = {}; CAMPOS_FC.forEach(function (k) { f[k] = soma(linhas, k); });
  var isLeads = sel.tipo === "leads";
  var cpm = f.impressoes > 0 ? f.investido_brl / f.impressoes * 1000 : null;
  var ctr = taxa(f.cliques_link, f.impressoes);
  var roas = custo(f.receita_hotmart_brl, f.investido_brl);

  function tf(rot, val, nota, classe) {
    return '<div class="tile"><div class="rot">' + rot + '</div><div class="val ' + (classe || "") +
      '">' + val + '</div><div class="nota">' + (nota || "") + "</div></div>";
  }
  var tiles = [
    tf("Investido", rs(f.investido_brl, 2), nBR(qtdDias(linhas)) + " dia(s)"),
    tf("CPM", cpm == null ? "—" : rs(cpm, 2), "por mil impressões"),
    tf("CTR de link", pct(ctr), nBR(f.cliques_link) + " cliques")
  ];
  if (isLeads) {
    tiles.push(tf("Leads", nBR(f.leads), f.leads > 0 ? "CPL " + rs(f.investido_brl / f.leads, 2) : "—"));
    tiles.push(tf("Conversas", nBR(f.conversas), f.conversas > 0 ? rs(f.investido_brl / f.conversas, 2) + " cada" : "—"));
    tiles.push(tf("Vendas", nBR(f.vendas_hotmart), "fechadas pelo comercial"));
    tiles.push(tf("Faturado", rs(f.receita_hotmart_brl, 2), ""));
    tiles.push(tf("CAC por venda", f.vendas_hotmart > 0 ? rs(f.investido_brl / f.vendas_hotmart, 2) : "—",
      roas == null ? "" : "ROAS " + nBR(roas, 2) + "x", roas != null && roas >= 1 ? "up" : ""));
  } else {
    tiles.push(tf("Checkouts", nBR(f.checkouts), f.checkouts > 0 ? rs(f.investido_brl / f.checkouts, 2) + " cada" : "—"));
    tiles.push(tf("Vendas do curso", nBR(f.vendas_principais), "venda direta"));
    tiles.push(tf("Order bumps", nBR(f.vendas_bump), "no checkout"));
    tiles.push(tf("Faturado", rs(f.receita_hotmart_brl, 2), nBR(f.reembolsos) + " reembolso(s)"));
    tiles.push(tf("ROAS real", roas == null ? "—" : nBR(roas, 2) + "x",
      "CAC " + (f.vendas_principais > 0 ? rs(f.investido_brl / f.vendas_principais, 2) : "—"),
      roas != null && roas >= 1 ? "up" : ""));
  }
  document.getElementById("funilCampanhaTiles").innerHTML = tiles.join("");

  var porDia = {};
  linhas.forEach(function (l) {
    if (!porDia[l.data]) porDia[l.data] = { dia: l.data, a: 0, b: 0 };
    porDia[l.data].a += num(l.investido_brl);
    porDia[l.data].b += num(l.receita_hotmart_brl);
  });
  grafico("grafFunilCampanha", Object.keys(porDia).sort().map(function (k) { return porDia[k]; }),
    { titulo: "Investido x faturado do funil", nomeA: "Investido", nomeB: "Faturado",
      eixo: function (v) { return v >= 1000 ? nBR(v / 1000, 0) + "k" : nBR(v); },
      rot: function (v) { return rs(v, 0); } });

  var etapas = [
    ["Impressões", nBR(f.impressoes), "alcance " + nBR(f.alcance_dia) + " (soma dos dias)",
      "CPM " + (cpm == null ? "—" : rs(cpm, 2))],
    ["Cliques no link", nBR(f.cliques_link), "CTR " + pct(ctr),
      "CPC " + (f.cliques_link > 0 ? rs(f.investido_brl / f.cliques_link, 2) : "—")],
    ["Visitas na página", nBR(f.pageviews), "connect " + pct(taxa(f.pageviews, f.cliques_link)),
      f.pageviews > 0 ? rs(f.investido_brl / f.pageviews, 2) + " por visita" : "—"]
  ];
  if (isLeads) {
    etapas.push(["Leads", nBR(f.leads), "por visita " + pct(taxa(f.leads, f.pageviews)),
      "CPL " + (f.leads > 0 ? rs(f.investido_brl / f.leads, 2) : "—")]);
    if (f.conversas > 0) etapas.push(["Conversas no WhatsApp", nBR(f.conversas),
      "por clique " + pct(taxa(f.conversas, f.cliques_link)), rs(f.investido_brl / Math.max(f.conversas, 1), 2) + " cada"]);
    etapas.push(["Vendas (comercial)", nBR(f.vendas_hotmart), "por lead " + pct(taxa(f.vendas_hotmart, f.leads)),
      "CAC " + (f.vendas_hotmart > 0 ? rs(f.investido_brl / f.vendas_hotmart, 2) : "—")]);
  } else {
    etapas.push(["Checkouts iniciados", nBR(f.checkouts), "conversão " + pct(taxa(f.checkouts, f.pageviews)),
      f.checkouts > 0 ? rs(f.investido_brl / f.checkouts, 2) + " por checkout" : "—"]);
    etapas.push(["Compras do curso", nBR(f.vendas_principais), "conversão " + pct(taxa(f.vendas_principais, f.pageviews)),
      "CAC " + (f.vendas_principais > 0 ? rs(f.investido_brl / f.vendas_principais, 2) : "—")]);
  }
  var corpo = etapas.map(function (l) {
    var fraca = l[1] === "0";
    return '<tr class="' + (fraca ? "fraca" : "") + '"><td class="etapa">' + l[0] + "</td>" +
      '<td class="volume">' + l[1] + '</td><td class="med">' + l[2] + '</td><td class="med">' + l[3] + "</td></tr>";
  }).join("");
  document.getElementById("funilCampanhaEtapas").innerHTML =
    '<table class="funil"><thead><tr><th>Etapa</th><th>Volume</th><th>Taxa</th><th>Custo</th></tr></thead><tbody>' +
    corpo + "</tbody></table>";

  var elB = document.getElementById("funilCampanhaBumps");
  if (isLeads) {
    elB.innerHTML = "";
  } else {
    var mb = {};
    (d.funilBumps || []).filter(function (l) { return String(l.funil_id) === String(sel.funil_id); }).forEach(function (l) {
      if (!mb[l.bump]) mb[l.bump] = { bump: l.bump, vendas: 0, receita_brl: 0 };
      mb[l.bump].vendas += num(l.vendas); mb[l.bump].receita_brl += num(l.receita_brl);
    });
    var bumps = Object.keys(mb).map(function (k) { return mb[k]; }).sort(function (a, b) { return b.vendas - a.vendas; });
    if (!bumps.length) {
      elB.innerHTML = '<div class="sub" style="margin-top:6px">Sem order bumps neste período.</div>';
    } else {
      elB.innerHTML = '<table class="larga"><thead><tr><th>Order bump (checkout)</th><th>Vendas</th><th>Faturado</th></tr></thead><tbody>' +
        bumps.map(function (r) { return "<tr><td>" + esc(r.bump) + "</td><td>" + nBR(r.vendas) + "</td><td>" + rs(r.receita_brl, 2) + "</td></tr>"; }).join("") +
        '<tr><td class="etapa">Total</td><td class="volume">' + nBR(bumps.reduce(function (s, r) { return s + r.vendas; }, 0)) +
        '</td><td class="volume">' + rs(bumps.reduce(function (s, r) { return s + r.receita_brl; }, 0), 2) + "</td></tr>" +
        "</tbody></table>";
    }
  }

  document.getElementById("funilCampanhaNota").innerHTML = isLeads
    ? "Este funil gera leads para o comercial; a venda é contabilizada pelo valor, não pelo rastreio do anúncio."
    : "Venda direta pelo tráfego. As compras do curso mais os order bumps do checkout entram neste funil.";
}

/* ---------- desenho ---------- */
function desenhar() {
  var e = escopo();
  tiles(e);
  funil(e);

  grafico("grafVendas", e.dias.map(function (d) {
    return { dia: d.data, a: num(d.vendas_meta), b: num(d.vendas_rastreadas) }; }),
    { titulo: "Vendas por dia", nomeA: "Gerenciador", nomeB: "Hotmart",
      eixo: function (v) { return nBR(v); }, rot: function (v) { return nBR(v); } });

  grafico("grafDinheiro", e.dias.map(function (d) {
    return { dia: d.data, a: num(d.investido_brl), b: num(d.receita_hotmart_brl) }; }),
    { titulo: "Dinheiro por dia", nomeA: "Investido", nomeB: "Faturado",
      eixo: function (v) { return v >= 1000 ? nBR(v / 1000, 0) + "k" : nBR(v); },
      rot: function (v) { return rs(v, 0); } });

  tabelaAds(e);
  tabelaQuebra(e);
  tabelaGeral(e);
  funilCampanha();

  var r = estado.dados.rastreio;
  var totV = soma(r, "vendas"), totR = soma(r, "com_ad_id");
  var p = totV > 0 ? (totR / totV) * 100 : null;
  document.getElementById("rastreioSub").innerHTML = totV === 0
    ? "Sem vendas no período."
    : "<b>" + pct(p) + "</b> das " + nBR(totV) + " vendas chegaram com o ID do anúncio. " +
      (p !== null && p < 70
        ? '<span style="color:var(--critical)">Abaixo de 70%, a diferença acima diz mais sobre rastreio do que sobre a Meta.</span>'
        : "Com esse nível de cobertura, a diferença acima é confiável.");
}

/* ---------- carga ---------- */
async function carregar() {
  var app = document.getElementById("app");
  app.classList.add("carregando");
  var f = "data=gte." + estado.de + "&data=lte." + estado.ate;
  try {
    var r = await Promise.all([
      consultar("v_resumo_dia?select=*&" + f + "&order=data.asc"),
      consultar("v_funil_produto?select=*&" + f),
      consultar("v_anuncios?select=*&" + f),
      consultar("v_quebra?select=*&" + f),
      consultar("v_cruzamento_campanha?select=*&" + f),
      consultar("v_qualidade_rastreio?select=*&" + f),
      consultar("v_ultimas_vendas?select=*"),
      consultar("v_produtos_ativos?select=*"),
      consultar("sync_log?select=job,inicio,status,registros&order=inicio.desc&limit=6"),
      consultar("v_funil_campanha?select=*&" + f),
      consultar("v_funil_bumps?select=*&" + f),
      consultar("v_funis_ativos?select=*")
    ]);
    estado.dados = { dias: r[0], funil: r[1], ads: r[2], quebra: r[3], campanhas: r[4],
      rastreio: r[5], vendas: r[6], produtos: r[7], logs: r[8],
      funilCampanha: r[9], funilBumps: r[10], funis: r[11] };

    montarFiltroProduto();
    desenhar();

    var logs = r[8];
    var ultimo = logs.filter(function (l) { return l.job === "meta-sync"; })[0] || logs[0];
    document.getElementById("rodape").textContent = ultimo
      ? "Última sincronização: " + new Date(ultimo.inicio).toLocaleString("pt-BR") + " · " + ultimo.job + " · " + ultimo.status
      : "Nenhuma sincronização registrada ainda.";
  } catch (e) {
    document.getElementById("rodape").textContent = "Erro ao carregar: " + e.message;
  } finally {
    app.classList.remove("carregando");
  }
}

/* ---------- eventos ---------- */
document.getElementById("formLogin").addEventListener("submit", async function (ev) {
  ev.preventDefault();
  var err = document.getElementById("erroLogin");
  err.textContent = "";
  try {
    await entrar(document.getElementById("email").value.trim(), document.getElementById("senha").value);
    abrirPainel();
  } catch (e) { err.textContent = e.message; }
});

document.querySelectorAll(".pill[data-dias]").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll(".pill[data-dias]").forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
    b.setAttribute("aria-pressed", "true");
    var v = b.dataset.dias;
    document.getElementById("custom").classList.toggle("on", v === "custom");
    if (v === "custom") { document.getElementById("de").value = estado.de; document.getElementById("ate").value = estado.ate; return; }
    if (v === "mes") { estado.ate = hojeISO(); estado.de = estado.ate.slice(0, 8) + "01"; }
    else if (v === "0") { estado.de = estado.ate = hojeISO(); }
    else { estado.ate = hojeISO(); estado.de = menosDias(Number(v) - 1); }
    carregar();
  });
});

document.getElementById("aplicar").addEventListener("click", function () {
  var de = document.getElementById("de").value, ate = document.getElementById("ate").value;
  if (de && ate && de <= ate) { estado.de = de; estado.ate = ate; carregar(); }
});

document.querySelectorAll("#abasTabela .aba").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll("#abasTabela .aba").forEach(function (o) { o.setAttribute("aria-selected", "false"); });
    b.setAttribute("aria-selected", "true");
    estado.aba = b.dataset.aba;
    desenhar();
  });
});

document.querySelectorAll("#abasQuebra .aba").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll("#abasQuebra .aba").forEach(function (o) { o.setAttribute("aria-selected", "false"); });
    b.setAttribute("aria-selected", "true");
    estado.quebra = b.dataset.q;
    desenhar();
  });
});

document.getElementById("btnAtualizar").addEventListener("click", carregar);
document.getElementById("btnSair").addEventListener("click", sair);

var redim;
addEventListener("resize", function () { clearTimeout(redim); redim = setTimeout(function () { if (estado.dados) desenhar(); }, 250); });

function abrirPainel() {
  document.getElementById("login").style.display = "none";
  document.getElementById("app").hidden = false;
  carregar();
}

if (sessao && sessao.token) abrirPainel();
</` + `script>
</body>
</html>
`;
