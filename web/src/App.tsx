import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, periodo, tudo, type Row } from "@/lib/supabase";
import { nBR, rs, pct, roasFmt, taxa, custo, soma, num, brData, hojeISO, menosDias } from "@/lib/format";
import { Card, Tile, Pill, Tabs, Legenda, DataTable, type Col } from "@/components/ui/primitives";
import { LineChart, type Ponto } from "@/components/LineChart";
import { FunnelVisual, type EtapaFunil } from "@/components/FunnelVisual";
import { Configuracoes } from "@/components/Configuracoes";
import { MelhoresCriativos } from "@/components/MelhoresCriativos";
import { metricasDoFunil } from "@/lib/funis";

const CAMPOS_F = ["investido_brl", "impressoes", "alcance_dia", "cliques", "cliques_link",
  "pageviews", "checkouts", "vendas_meta", "receita_meta_brl", "leads", "conversas",
  "vendas_hotmart", "vendas_rastreadas", "receita_hotmart_brl", "reembolsos"] as const;

type Agg = Record<string, number>;
function agregar(linhas: Row[]): Agg {
  const f: Agg = {};
  CAMPOS_F.forEach((k) => { f[k] = soma(linhas, k); });
  return f;
}

interface Dados {
  dias: Row[]; funil: Row[]; ads: Row[]; quebra: Row[]; campanhas: Row[]; rastreio: Row[];
  vendas: Row[]; produtos: Row[]; logs: Row[]; funilCampanha: Row[]; funilBumps: Row[]; funis: Row[];
  criativos: Row[];
}

// ─── Theme ───────────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    try { return localStorage.getItem("painel_tema") || "system"; } catch { return "system"; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try { localStorage.setItem("painel_tema", theme); } catch { /* ignore */ }
  }, [theme]);
  return { theme, setTheme };
}

// ─── Login ───────────────────────────────────────────────────────────────────
function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setCarregando(false);
    if (error) setErro(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
    else onOk();
  }

  return (
    <div className="grid min-h-full place-items-center p-6">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-xl font-bold">Painel de vendas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Meta Ads × Hotmart</p>
        <label className="mt-5 block text-sm font-medium" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-s1" />
        <label className="mt-3 block text-sm font-medium" htmlFor="senha">Senha</label>
        <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-s1" />
        {erro && <div className="mt-3 text-sm text-critical">{erro}</div>}
        <button type="submit" disabled={carregando}
          className="mt-5 w-full rounded-lg bg-foreground py-2.5 font-semibold text-background disabled:opacity-60">
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setPronto(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!pronto) return null;
  if (!session) return <Login onOk={() => { /* onAuthStateChange cuida */ }} />;
  return <Painel onSair={() => supabase.auth.signOut()} />;
}

function Painel({ onSair }: { onSair: () => void }) {
  const { theme, setTheme } = useTheme();
  const [de, setDe] = useState(menosDias(6));
  const [ate, setAte] = useState(hojeISO());
  const [preset, setPreset] = useState("7");
  const [produto, setProduto] = useState("todos");
  const [funilSlug, setFunilSlug] = useState<string | null>(null);
  const [quebra, setQuebra] = useState("genero");
  const [abaDiff, setAbaDiff] = useState("campanhas");
  const [tela, setTela] = useState<"painel" | "config">("painel");
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async (d: string, a: string) => {
    setCarregando(true); setErro("");
    try {
      const [dias, funil, ads, quebraR, campanhas, rastreio, vendas, produtos, logs, funilCampanha, funilBumps, funis, criativos] =
        await Promise.all([
          periodo("v_resumo_dia", d, a), periodo("v_funil_produto", d, a), periodo("v_anuncios", d, a),
          periodo("v_quebra", d, a), periodo("v_cruzamento_campanha", d, a), periodo("v_qualidade_rastreio", d, a),
          tudo("v_ultimas_vendas"), tudo("v_produtos_ativos"), tudo("sync_log", "inicio"),
          periodo("v_funil_campanha", d, a), periodo("v_funil_bumps", d, a), tudo("v_funis_ativos"),
          tudo("v_podium_criativos"),
        ]);
      setDados({ dias, funil, ads, quebra: quebraR, campanhas, rastreio, vendas, produtos, logs, funilCampanha, funilBumps, funis, criativos });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(de, ate); }, [de, ate, carregar]);

  function aplicarPreset(v: string) {
    setPreset(v);
    if (v === "custom") return;
    if (v === "mes") { const h = hojeISO(); setDe(h.slice(0, 8) + "01"); setAte(h); }
    else if (v === "0") { const h = hojeISO(); setDe(h); setAte(h); }
    else { setAte(hojeISO()); setDe(menosDias(Number(v) - 1)); }
  }

  const escopo = useMemo(() => {
    if (!dados) return null;
    if (produto === "todos") {
      const diasOrd = [...dados.dias].sort((a, b) => (a.data < b.data ? -1 : 1));
      const f = agregar(dados.ads);
      f.vendas_hotmart = soma(diasOrd, "vendas_hotmart");
      f.vendas_rastreadas = soma(diasOrd, "vendas_rastreadas");
      f.receita_hotmart_brl = soma(diasOrd, "receita_hotmart_brl");
      f.reembolsos = soma(diasOrd, "reembolsos");
      const recRastr = soma(diasOrd, "receita_rastreada_brl");
      const dseries: Ponto[] = diasOrd.map((x) => ({ dia: x.data, a: num(x.vendas_meta), b: num(x.vendas_rastreadas) }));
      const dmoney: Ponto[] = diasOrd.map((x) => ({ dia: x.data, a: num(x.investido_brl), b: num(x.receita_hotmart_brl) }));
      return { f, recRastr, dias: diasOrd, ads: dados.ads, quebra: dados.quebra, dseries, dmoney, nDias: diasOrd.length };
    }
    const pid = Number(produto);
    const fdias = dados.funil.filter((l) => Number(l.product_id) === pid);
    const f = agregar(fdias);
    const recRastr = f.receita_hotmart_brl;
    const porDia: Record<string, Ponto> = {};
    fdias.forEach((l) => {
      const k = l.data;
      if (!porDia[k]) porDia[k] = { dia: k, a: 0, b: 0 };
      porDia[k].a += num(l.vendas_meta); porDia[k].b += num(l.vendas_rastreadas);
    });
    const dseries = Object.values(porDia).sort((x, y) => (x.dia < y.dia ? -1 : 1));
    const money: Record<string, Ponto> = {};
    fdias.forEach((l) => {
      const k = l.data;
      if (!money[k]) money[k] = { dia: k, a: 0, b: 0 };
      money[k].a += num(l.investido_brl); money[k].b += num(l.receita_hotmart_brl);
    });
    const dmoney = Object.values(money).sort((x, y) => (x.dia < y.dia ? -1 : 1));
    const diasUnicos = new Set(fdias.map((l) => l.data)).size;
    const diasOrd = [...fdias].sort((a, b) => (a.data < b.data ? -1 : 1));
    return { f, recRastr, dias: diasOrd, ads: dados.ads.filter((l) => Number(l.product_id) === pid),
      quebra: dados.quebra.filter((l) => Number(l.product_id) === pid), dseries, dmoney, nDias: diasUnicos };
  }, [dados, produto]);

  if (erro) return <div className="p-6 text-critical">Erro ao carregar: {erro}</div>;
  if (!dados || !escopo) return <div className="grid min-h-full place-items-center text-muted-foreground">Carregando…</div>;

  const f = escopo.f;
  const gap = f.vendas_meta - f.vendas_rastreadas;
  const gapPct = f.vendas_meta > 0 ? (gap / f.vendas_meta) * 100 : null;
  const roasMeta = custo(f.receita_meta_brl, f.investido_brl);
  const roasReal = custo(escopo.recRastr, f.investido_brl);
  const roasGeral = custo(f.receita_hotmart_brl, f.investido_brl);
  const cac = custo(f.investido_brl, f.vendas_rastreadas);
  const nomeProduto = produto === "todos" ? "todos os produtos"
    : (dados.produtos.find((p) => String(p.product_id) === produto)?.produto ?? "#" + produto);

  // estágios do funil de engajamento (o topo é impressões, mas o silhueta
  // começa nos cliques para não achatar tudo)
  const etapasProduto: EtapaFunil[] = [
    { label: "Cliques no link", value: f.cliques_link },
    { label: "Visitas", value: f.pageviews },
    { label: "Checkouts", value: f.checkouts },
    { label: "Compras", value: f.vendas_rastreadas },
  ];
  if (f.leads > 0) etapasProduto.splice(3, 0, { label: "Leads", value: f.leads });

  const produtosFiltro = dados.produtos.filter((p) => num(p.vendas) > 0 || p.tem_anuncio);
  const totV = soma(dados.rastreio, "vendas"), totR = soma(dados.rastreio, "com_ad_id");
  const pctRastr = totV > 0 ? (totR / totV) * 100 : null;

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
      {/* header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight">Meta Ads × Hotmart</h1>
          <div className="text-xs text-muted-foreground sm:text-sm">
            {brData(de)} a {brData(ate)} · {nomeProduto} · faturamento {rs(f.receita_hotmart_brl, 2)}
          </div>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Tema"
            className="min-h-10 rounded-lg border border-border bg-surface px-2 text-sm">
            <option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option>
          </select>
          <button onClick={() => setTela((t) => (t === "config" ? "painel" : "config"))}
            className="min-h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm sm:flex-none" title="Configurações">
            {tela === "config" ? "Painel" : "⚙"}
          </button>
          <button onClick={() => carregar(de, ate)} className="min-h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm sm:flex-none">Atualizar</button>
          <button onClick={onSair} className="min-h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm sm:flex-none">Sair</button>
        </div>
      </header>

      {tela === "config" ? (
        <div className="mt-5"><Configuracoes onVoltar={() => { setTela("painel"); carregar(de, ate); }} /></div>
      ) : (<>

      {/* filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Período</span>
        {[["0", "Hoje"], ["7", "7 dias"], ["30", "30 dias"], ["mes", "Mês atual"], ["custom", "Escolher"]].map(([v, l]) => (
          <Pill key={v} active={preset === v} onClick={() => aplicarPreset(v)}>{l}</Pill>
        ))}
        {preset === "custom" && (
          <span className="flex items-center gap-2">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" />
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Produto</span>
        <Pill active={produto === "todos"} onClick={() => setProduto("todos")}>Todos</Pill>
        {produtosFiltro.map((p) => (
          <Pill key={p.product_id} active={produto === String(p.product_id)} onClick={() => setProduto(String(p.product_id))} title={p.produto}>
            {p.produto.length > 34 ? p.produto.slice(0, 33) + "…" : p.produto}
          </Pill>
        ))}
      </div>

      {carregando && <div className="mt-2 text-xs text-muted-foreground">Atualizando…</div>}

      {/* tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile rot="Investido" val={rs(f.investido_brl, 2)} nota={`${nBR(escopo.nDias)} dia(s) no período`} />
        <Tile rot="Vendas no gerenciador" val={nBR(f.vendas_meta)} nota="compras reportadas pela Meta" />
        <Tile rot="Vendas na Hotmart" val={nBR(f.vendas_hotmart)} nota={`${nBR(f.vendas_rastreadas)} com rastreio`} />
        <Tile rot="Diferença" val={(gap >= 0 ? "+" : "") + nBR(gap)} tone={gap < 0 ? "up" : (gapPct || 0) >= 20 ? "down" : ""}
          nota={`${nBR(f.vendas_meta)} − ${nBR(f.vendas_rastreadas)} rastreadas${gapPct === null ? "" : " · " + pct(Math.abs(gapPct))}`} />
        <Tile rot="ROAS do gerenciador" val={roasFmt(roasMeta)} nota="receita que a Meta atribui" />
        <Tile rot="ROAS real" val={roasFmt(roasReal)} tone={roasReal != null && roasMeta != null && roasReal >= roasMeta ? "up" : ""} nota="só vendas Hotmart rastreadas" />
        <Tile rot="ROAS sobre tudo" val={roasFmt(roasGeral)} nota="faturamento total ÷ investido" />
        <Tile rot="CAC real" val={cac == null ? "—" : rs(cac, 2)} nota={`${nBR(f.reembolsos)} reembolso(s) no período`} />
      </div>

      <div className="mt-4 grid gap-4">
        {/* Funil do produto */}
        <Card title="Funil" sub="Do clique à compra. Passe o mouse numa etapa para destacá-la.">
          <FunnelVisual itens={etapasProduto} />
          <div className="mt-2 text-xs text-muted-foreground">
            Topo: {nBR(f.impressoes)} impressões · alcance {nBR(f.alcance_dia)} (soma dos dias) ·
            CPM {f.impressoes > 0 ? rs((f.investido_brl / f.impressoes) * 1000, 2) : "—"} ·
            CTR de link {pct(taxa(f.cliques_link, f.impressoes))}
          </div>
        </Card>

        {/* Funis por campanha */}
        <FunisPorCampanha dados={dados} slug={funilSlug} setSlug={setFunilSlug} />

        {/* Gráficos — lado a lado no desktop */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Vendas: gerenciador × Hotmart" sub="Compras que a Meta reporta contra vendas aprovadas na Hotmart com rastreio.">
            <Legenda items={[{ cor: "var(--s1)", nome: "Gerenciador (Meta)" }, { cor: "var(--s2)", nome: "Hotmart (rastreadas)" }]} />
            <div className="mt-2"><LineChart data={escopo.dseries} nomeA="Gerenciador" nomeB="Hotmart" rot={(v) => nBR(v)} eixo={(v) => nBR(v)} /></div>
          </Card>
          <Card title="Investimento × faturamento" sub="Ambos em reais, no mesmo eixo.">
            <Legenda items={[{ cor: "var(--s1)", nome: "Investido" }, { cor: "var(--s2)", nome: "Faturado" }]} />
            <div className="mt-2"><LineChart data={escopo.dmoney} nomeA="Investido" nomeB="Faturado" rot={(v) => rs(v, 0)} eixo={(v) => (v >= 1000 ? nBR(v / 1000, 0) + "k" : nBR(v))} /></div>
          </Card>
        </div>

        {/* Anúncios */}
        <Card title="Anúncios que mais performaram" sub="Clique num cabeçalho para reordenar.">
          <AdsTable ads={escopo.ads} />
        </Card>

        {/* Quebras */}
        <Card title="Quem viu e onde" sub="Quebra da entrega. A barra mostra a fatia do investimento.">
          <Tabs value={quebra} onChange={setQuebra} options={[
            { id: "genero", label: "Gênero" }, { id: "idade", label: "Idade" },
            { id: "plataforma", label: "Plataforma" }, { id: "posicionamento", label: "Posicionamento" }]} />
          <div className="mt-3"><Quebras linhas={escopo.quebra} tipo={quebra} /></div>
        </Card>

        {/* Onde está a diferença */}
        <Card title="Onde está a diferença" sub="O mesmo período, por campanha, por dia e venda a venda.">
          <Tabs value={abaDiff} onChange={setAbaDiff} options={[
            { id: "campanhas", label: "Campanhas" }, { id: "dias", label: "Dia a dia" }, { id: "vendas", label: "Últimas vendas" }]} />
          <div className="mt-3"><Diferenca dados={dados} escopo={escopo} produto={produto} aba={abaDiff} de={de} ate={ate} /></div>
        </Card>

        {/* Qualidade do rastreio */}
        <Card title="Qualidade do rastreio">
          <div className="text-sm">
            {totV === 0 ? "Sem vendas no período." : (
              <><b>{pct(pctRastr)}</b> das {nBR(totV)} vendas chegaram com o ID do anúncio.{" "}
                {pctRastr !== null && pctRastr < 70
                  ? <span className="text-critical">Abaixo de 70%, a diferença acima diz mais sobre rastreio do que sobre a Meta.</span>
                  : "Com esse nível de cobertura, a diferença acima é confiável."}</>
            )}
          </div>
          <details className="mt-3 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Por que o gerenciador e a Hotmart nunca batem exatamente</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><b>Janela de atribuição.</b> A Meta credita a venda ao dia do clique; a Hotmart, ao dia da aprovação.</li>
              <li><b>Reprocessamento.</b> A Meta reatribui conversões por até 72h; os últimos 3 dias ainda mudam.</li>
              <li><b>Rastreio perdido.</b> Sem <code>src</code>/<code>sck</code> a venda existe, mas não volta ao anúncio.</li>
              <li><b>Order bump.</b> O pixel dispara uma compra; a Hotmart pode gerar duas transações.</li>
              <li><b>Reembolso e chargeback.</b> A Meta não desfaz a conversão; a Hotmart sim — por isso o ROAS real cai.</li>
              <li><b>Alcance não soma.</b> Aparece como "soma dos dias", não como público único.</li>
            </ul>
          </details>
        </Card>

        {/* Melhores criativos */}
        <MelhoresCriativos criativos={dados.criativos} />
      </div>

      <div className="mt-6 pb-6 text-center text-xs text-muted-foreground">
        {(() => {
          const ultimo = dados.logs.find((l) => l.job === "meta-sync") ?? dados.logs[0];
          return ultimo ? `Última sincronização: ${new Date(ultimo.inicio).toLocaleString("pt-BR")} · ${ultimo.job} · ${ultimo.status}` : "Nenhuma sincronização registrada ainda.";
        })()}
      </div>
      </>)}
    </div>
  );
}

// ─── Funis por campanha ──────────────────────────────────────────────────────
const CAMPOS_FC = ["investido_brl", "impressoes", "alcance_dia", "cliques", "cliques_link", "pageviews",
  "checkouts", "vendas_meta", "receita_meta_brl", "leads", "conversas", "vendas_hotmart",
  "vendas_principais", "vendas_bump", "vendas_rastreadas", "receita_hotmart_brl", "liquido_brl", "reembolsos"];

type Extra = { cpm: number | null; ctr: number | null; roas: number | null; nDias: number };
type TileDado = { rot: string; val: string; nota?: string; tone?: "up" | "down" | "" };

const METRIC_CATALOG: Record<string, (f: Agg, e: Extra) => TileDado> = {
  investido: (f, e) => ({ rot: "Investido", val: rs(f.investido_brl, 2), nota: `${nBR(e.nDias)} dia(s)` }),
  cpm: (_f, e) => ({ rot: "CPM", val: e.cpm == null ? "—" : rs(e.cpm, 2), nota: "por mil impressões" }),
  ctr: (f, e) => ({ rot: "CTR de link", val: pct(e.ctr), nota: `${nBR(f.cliques_link)} cliques` }),
  leads: (f) => ({ rot: "Leads", val: nBR(f.leads), nota: f.leads > 0 ? "CPL " + rs(f.investido_brl / f.leads, 2) : "—" }),
  conversas: (f) => ({ rot: "Conversas", val: nBR(f.conversas), nota: f.conversas > 0 ? rs(f.investido_brl / f.conversas, 2) + " cada" : "—" }),
  vendas_hotmart: (f) => ({ rot: "Vendas", val: nBR(f.vendas_hotmart), nota: "fechadas pelo comercial" }),
  vendas_principais: (f) => ({ rot: "Vendas do curso", val: nBR(f.vendas_principais), nota: "venda direta" }),
  vendas_bump: (f) => ({ rot: "Order bumps", val: nBR(f.vendas_bump), nota: "no checkout" }),
  faturado: (f) => ({ rot: "Faturado", val: rs(f.receita_hotmart_brl, 2), nota: f.reembolsos > 0 ? `${nBR(f.reembolsos)} reembolso(s)` : undefined }),
  cac: (f) => ({ rot: "CAC por venda", val: f.vendas_hotmart > 0 ? rs(f.investido_brl / f.vendas_hotmart, 2) : "—" }),
  roas: (_f, e) => ({ rot: "ROAS real", val: roasFmt(e.roas), tone: e.roas != null && e.roas >= 1 ? "up" : "" }),
  checkouts: (f) => ({ rot: "Checkouts", val: nBR(f.checkouts), nota: f.checkouts > 0 ? rs(f.investido_brl / f.checkouts, 2) + " cada" : "—" }),
};

function FunisPorCampanha({ dados, slug, setSlug }: { dados: Dados; slug: string | null; setSlug: (s: string) => void; }) {
  const lista = dados.funis;
  if (!lista.length) return null;
  const sel = lista.find((x) => x.slug === slug) ?? lista[0];

  const linhas = dados.funilCampanha.filter((l) => String(l.funil_id) === String(sel.funil_id));
  const f: Agg = {}; CAMPOS_FC.forEach((k) => { f[k] = soma(linhas, k); });
  const isLeads = sel.tipo === "leads";
  const cpm = f.impressoes > 0 ? (f.investido_brl / f.impressoes) * 1000 : null;
  const ctr = taxa(f.cliques_link, f.impressoes);
  const roas = custo(f.receita_hotmart_brl, f.investido_brl);
  const nDias = new Set(linhas.map((l) => l.data)).size;

  const money: Record<string, Ponto> = {};
  linhas.forEach((l) => { const k = l.data; if (!money[k]) money[k] = { dia: k, a: 0, b: 0 }; money[k].a += num(l.investido_brl); money[k].b += num(l.receita_hotmart_brl); });
  const dmoney = Object.values(money).sort((x, y) => (x.dia < y.dia ? -1 : 1));

  const etapas: EtapaFunil[] = isLeads
    ? [{ label: "Cliques", value: f.cliques_link }, { label: "Visitas", value: f.pageviews },
       { label: "Leads", value: f.leads }, ...(f.conversas > 0 ? [{ label: "Conversas", value: f.conversas }] : []),
       { label: "Vendas", value: f.vendas_hotmart }]
    : [{ label: "Cliques", value: f.cliques_link }, { label: "Visitas", value: f.pageviews },
       { label: "Checkouts", value: f.checkouts }, { label: "Compras", value: f.vendas_principais }];

  const bumpsMap: Record<string, { bump: string; vendas: number; receita_brl: number }> = {};
  dados.funilBumps.filter((l) => String(l.funil_id) === String(sel.funil_id)).forEach((l) => {
    if (!bumpsMap[l.bump]) bumpsMap[l.bump] = { bump: l.bump, vendas: 0, receita_brl: 0 };
    bumpsMap[l.bump].vendas += num(l.vendas); bumpsMap[l.bump].receita_brl += num(l.receita_brl);
  });
  const bumps = Object.values(bumpsMap).sort((a, b) => b.vendas - a.vendas);
  const metricas = metricasDoFunil(sel);
  const extra: Extra = { cpm, ctr, roas, nDias };

  return (
    <Card title="Funis por campanha" sub="Cada funil junta as campanhas da Meta (por atribuição manual ou nome) com as vendas da Hotmart que pertencem a ele. Independe do filtro de produto.">
      <Tabs value={sel.slug} onChange={setSlug} options={lista.map((x) => ({ id: x.slug, label: x.nome }))} />
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricas.map((k) => {
          const calc = METRIC_CATALOG[k];
          if (!calc) return null;
          const t = calc(f, extra);
          return <Tile key={k} rot={t.rot} val={t.val} nota={t.nota} tone={t.tone} />;
        })}
      </div>

      <div className="mt-4"><FunnelVisual itens={etapas} /></div>

      <div className="mt-4">
        <Legenda items={[{ cor: "var(--s1)", nome: "Investido" }, { cor: "var(--s2)", nome: "Faturado" }]} />
        <div className="mt-2"><LineChart data={dmoney} nomeA="Investido" nomeB="Faturado" rot={(v) => rs(v, 0)} eixo={(v) => (v >= 1000 ? nBR(v / 1000, 0) + "k" : nBR(v))} /></div>
      </div>

      {!isLeads && (
        <div className="mt-4">
          <div className="mb-1 text-sm font-semibold">Order bumps do checkout</div>
          {bumps.length ? (
            <DataTable
              rows={bumps} padrao="vendas"
              cols={[
                { key: "bump", label: "Order bump", render: (r) => r.bump, sort: (r) => r.bump },
                { key: "vendas", label: "Vendas", render: (r) => nBR(r.vendas), sort: (r) => r.vendas },
                { key: "receita_brl", label: "Faturado", render: (r) => rs(r.receita_brl, 2), sort: (r) => r.receita_brl },
              ] as Col<{ bump: string; vendas: number; receita_brl: number }>[]}
            />
          ) : <div className="text-sm text-muted-foreground">Sem order bumps neste período.</div>}
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        {isLeads ? "Este funil gera leads para o comercial; a venda é contabilizada pelo valor, não pelo rastreio do anúncio."
          : "Venda direta pelo tráfego. As compras do curso mais os order bumps do checkout entram neste funil."}
      </div>
    </Card>
  );
}

// ─── Anúncios ────────────────────────────────────────────────────────────────
function AdsTable({ ads }: { ads: Row[] }) {
  const m = new Map<string, any>();
  ads.forEach((l) => {
    const k = String(l.ad_id);
    if (!m.has(k)) m.set(k, { ad_id: l.ad_id, ad_name: l.ad_name, campaign_name: l.campaign_name,
      investido_brl: 0, impressoes: 0, alcance_dia: 0, cliques_link: 0, pageviews: 0, checkouts: 0,
      vendas_meta: 0, vendas_hotmart: 0, receita_hotmart_brl: 0, leads: 0, conversas: 0 });
    const a = m.get(k);
    ["investido_brl", "impressoes", "alcance_dia", "cliques_link", "pageviews", "checkouts", "vendas_meta", "vendas_hotmart", "receita_hotmart_brl", "leads", "conversas"]
      .forEach((c) => { a[c] += num(l[c]); });
    if (!a.ad_name && l.ad_name) a.ad_name = l.ad_name;
  });
  const linhas = Array.from(m.values()).map((a) => ({
    ...a,
    cpm: a.impressoes > 0 ? (a.investido_brl / a.impressoes) * 1000 : null,
    ctr: taxa(a.cliques_link, a.impressoes), connect: taxa(a.pageviews, a.cliques_link),
    custo_checkout: custo(a.investido_brl, a.checkouts), cac: custo(a.investido_brl, a.vendas_hotmart),
    roas: custo(a.receita_hotmart_brl, a.investido_brl), cpl: custo(a.investido_brl, a.leads + a.conversas),
  }));
  const temLead = linhas.some((r) => r.leads + r.conversas > 0);

  const cols: Col<any>[] = [
    { key: "ad_name", label: "Anúncio", sort: (r) => r.ad_name || "", render: (r) => (
      <div><div>{r.ad_name || "#" + r.ad_id}</div>{r.campaign_name && <div className="text-xs text-muted-foreground">{r.campaign_name}</div>}</div>) },
    { key: "investido_brl", label: "Investido", sort: (r) => r.investido_brl, render: (r) => rs(r.investido_brl, 2) },
    { key: "alcance_dia", label: "Alcance", sort: (r) => r.alcance_dia, render: (r) => nBR(r.alcance_dia) },
    { key: "cpm", label: "CPM", sort: (r) => r.cpm ?? -1, render: (r) => (r.cpm == null ? "—" : rs(r.cpm, 2)) },
    { key: "ctr", label: "CTR link", sort: (r) => r.ctr ?? -1, render: (r) => pct(r.ctr) },
    { key: "connect", label: "Connect", sort: (r) => r.connect ?? -1, render: (r) => pct(r.connect) },
    { key: "checkouts", label: "Checkouts", sort: (r) => r.checkouts, render: (r) => nBR(r.checkouts) },
    { key: "custo_checkout", label: "Custo/check.", sort: (r) => r.custo_checkout ?? -1, render: (r) => (r.custo_checkout == null ? "—" : rs(r.custo_checkout, 2)) },
    ...(temLead ? [
      { key: "leads", label: "Leads", sort: (r: any) => r.leads + r.conversas, render: (r: any) => nBR(r.leads + r.conversas) },
      { key: "cpl", label: "CPL", sort: (r: any) => r.cpl ?? -1, render: (r: any) => (r.cpl == null ? "—" : rs(r.cpl, 2)) },
    ] : []),
    { key: "vendas_hotmart", label: "Vendas", sort: (r) => r.vendas_hotmart, render: (r) => nBR(r.vendas_hotmart) },
    { key: "cac", label: "CAC", sort: (r) => r.cac ?? -1, render: (r) => (r.cac == null ? "—" : rs(r.cac, 2)) },
    { key: "roas", label: "ROAS real", sort: (r) => r.roas ?? -1, render: (r) => roasFmt(r.roas) },
  ];
  return <DataTable rows={linhas} cols={cols} padrao="investido_brl" />;
}

// ─── Quebras ─────────────────────────────────────────────────────────────────
const QUEBRAS: Record<string, { tipo: string; campo: string; titulo: string }> = {
  genero: { tipo: "demografia", campo: "chave2", titulo: "Gênero" },
  idade: { tipo: "demografia", campo: "chave1", titulo: "Faixa etária" },
  plataforma: { tipo: "posicionamento", campo: "chave1", titulo: "Plataforma" },
  posicionamento: { tipo: "posicionamento", campo: "chave2", titulo: "Posicionamento" },
};
const TRADUZ: Record<string, string> = {
  female: "Feminino", male: "Masculino", unknown: "Não informado", facebook: "Facebook", instagram: "Instagram",
  messenger: "Messenger", audience_network: "Audience Network", feed: "Feed", story: "Stories", reels: "Reels",
  video_feeds: "Feed de vídeo", explore: "Explorar", marketplace: "Marketplace", search: "Busca",
  right_hand_column: "Coluna direita", instream_video: "Vídeo in-stream", profile_feed: "Feed do perfil",
};
const rotuloQ = (v: string) => TRADUZ[v] || (v === "" ? "Não informado" : v);

function Quebras({ linhas, tipo }: { linhas: Row[]; tipo: string }) {
  const cfg = QUEBRAS[tipo];
  const m = new Map<string, any>();
  linhas.filter((l) => l.tipo === cfg.tipo).forEach((l) => {
    const k = String(l[cfg.campo] ?? "");
    if (!m.has(k)) m.set(k, { chave: k, investido_brl: 0, impressoes: 0, cliques_link: 0, checkouts: 0, vendas_meta: 0 });
    const a = m.get(k);
    ["investido_brl", "impressoes", "cliques_link", "checkouts", "vendas_meta"].forEach((c) => { a[c] += num(l[c]); });
  });
  const rows = Array.from(m.values());
  if (!rows.length) return <div className="py-6 text-center text-sm text-muted-foreground">Ainda não há quebra de {cfg.titulo.toLowerCase()} neste período.</div>;
  const total = rows.reduce((s, r) => s + r.investido_brl, 0);
  const maior = rows.reduce((s, r) => Math.max(s, r.investido_brl), 0);
  rows.sort((a, b) => b.investido_brl - a.investido_brl);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm tnum">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="px-2 py-2 font-medium">{cfg.titulo}</th><th className="px-2 py-2 font-medium">Investido</th>
          <th className="px-2 py-2 font-medium">Fatia</th><th className="px-2 py-2 font-medium">Impressões</th>
          <th className="px-2 py-2 font-medium">CTR link</th><th className="px-2 py-2 font-medium">Checkouts</th>
          <th className="px-2 py-2 font-medium">Compras</th><th className="px-2 py-2 font-medium">Custo/compra</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const fatia = total > 0 ? (r.investido_brl / total) * 100 : 0;
            const larg = maior > 0 ? (r.investido_brl / maior) * 100 : 0;
            return (
              <tr key={i} className="border-b border-border/60">
                <td className="relative px-2 py-2">
                  <span className="absolute inset-y-1 left-0 rounded" style={{ width: `${larg}%`, background: "color-mix(in srgb, var(--s1) 16%, transparent)" }} />
                  <span className="relative">{rotuloQ(r.chave)}</span>
                </td>
                <td className="px-2 py-2">{rs(r.investido_brl, 2)}</td><td className="px-2 py-2">{pct(fatia)}</td>
                <td className="px-2 py-2">{nBR(r.impressoes)}</td><td className="px-2 py-2">{pct(taxa(r.cliques_link, r.impressoes))}</td>
                <td className="px-2 py-2">{nBR(r.checkouts)}</td><td className="px-2 py-2">{nBR(r.vendas_meta)}</td>
                <td className="px-2 py-2">{r.vendas_meta > 0 ? rs(r.investido_brl / r.vendas_meta, 2) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-muted-foreground">Compras aqui são as reportadas pela Meta — a quebra por gênero e posicionamento só existe do lado dela.</div>
    </div>
  );
}

// ─── Diferença ───────────────────────────────────────────────────────────────
function Diferenca({ dados, escopo, produto, aba, de, ate }: { dados: Dados; escopo: any; produto: string; aba: string; de: string; ate: string; }) {
  if (aba === "campanhas") {
    const origem = produto === "todos" ? dados.campanhas : escopo.ads;
    const m = new Map<string, any>();
    origem.forEach((l: Row) => {
      const k = String(l.campaign_id || "sem");
      if (!m.has(k)) m.set(k, { campaign_id: l.campaign_id, campaign_name: l.campaign_name, investido_brl: 0, vendas_meta: 0, vendas_hotmart: 0, receita_hotmart_brl: 0, receita_meta_brl: 0 });
      const a = m.get(k);
      ["investido_brl", "vendas_meta", "vendas_hotmart", "receita_hotmart_brl", "receita_meta_brl"].forEach((c) => { a[c] += num(l[c]); });
      if (!a.campaign_name && l.campaign_name) a.campaign_name = l.campaign_name;
    });
    const rows = Array.from(m.values()).map((a) => ({ ...a, gap: a.vendas_meta - a.vendas_hotmart, roas_real: custo(a.receita_hotmart_brl, a.investido_brl), cac: custo(a.investido_brl, a.vendas_hotmart) }));
    const cols: Col<any>[] = [
      { key: "campaign_name", label: "Campanha", sort: (r) => r.campaign_name || "", render: (r) => r.campaign_name || (r.campaign_id ? "#" + r.campaign_id : "Sem campanha") },
      { key: "investido_brl", label: "Investido", sort: (r) => r.investido_brl, render: (r) => rs(r.investido_brl, 2) },
      { key: "vendas_meta", label: "Meta", sort: (r) => r.vendas_meta, render: (r) => nBR(r.vendas_meta) },
      { key: "vendas_hotmart", label: "Hotmart", sort: (r) => r.vendas_hotmart, render: (r) => nBR(r.vendas_hotmart) },
      { key: "gap", label: "Dif.", sort: (r) => r.gap, tone: (r) => (r.gap > 0 ? "text-critical" : "text-good"), render: (r) => (r.gap > 0 ? "+" : "") + nBR(r.gap) },
      { key: "receita_hotmart_brl", label: "Faturado", sort: (r) => r.receita_hotmart_brl, render: (r) => rs(r.receita_hotmart_brl, 2) },
      { key: "roas_real", label: "ROAS real", sort: (r) => r.roas_real ?? -1, render: (r) => roasFmt(r.roas_real) },
      { key: "cac", label: "CAC", sort: (r) => r.cac ?? -1, render: (r) => (r.cac == null ? "—" : rs(r.cac, 2)) },
    ];
    return <DataTable rows={rows} cols={cols} padrao="investido_brl" />;
  }
  if (aba === "dias") {
    const rows = escopo.dias.slice().reverse();
    const cols: Col<any>[] = [
      { key: "data", label: "Dia", sort: (r) => r.data, render: (r) => brData(r.data) },
      { key: "investido_brl", label: "Investido", sort: (r) => num(r.investido_brl), render: (r) => rs(r.investido_brl, 2) },
      { key: "vendas_meta", label: "Meta", sort: (r) => num(r.vendas_meta), render: (r) => nBR(r.vendas_meta) },
      { key: "vendas_rastreadas", label: "Hotmart rastr.", sort: (r) => num(r.vendas_rastreadas), render: (r) => nBR(r.vendas_rastreadas) },
      { key: "vendas_hotmart", label: "Hotmart total", sort: (r) => num(r.vendas_hotmart), render: (r) => nBR(r.vendas_hotmart) },
      { key: "receita_hotmart_brl", label: "Faturado", sort: (r) => num(r.receita_hotmart_brl), render: (r) => rs(r.receita_hotmart_brl, 2) },
    ];
    return <DataTable rows={rows} cols={cols} />;
  }
  const rows = dados.vendas.filter((v) => {
    const dia = (v.approved_date || v.order_date || "").slice(0, 10);
    if (dia < de || dia > ate) return false;
    if (produto === "todos") return true;
    return String(v.product_id) === produto;
  });
  const cols: Col<any>[] = [
    { key: "produto", label: "Produto", sort: (r) => r.produto || "", render: (r) => (<span>{r.produto || "—"}{r.is_order_bump && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">bump</span>}</span>) },
    { key: "approved_date", label: "Aprovada", sort: (r) => r.approved_date || r.order_date || "", render: (r) => { const x = r.approved_date || r.order_date; return x ? new Date(x).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"; } },
    { key: "status", label: "Status", sort: (r) => r.status, render: (r) => r.status },
    { key: "price_value", label: "Valor", sort: (r) => num(r.price_value), render: (r) => (r.currency || "") + " " + nBR(r.price_value, 2) },
    { key: "meta_ad_id", label: "Anúncio", sort: (r) => r.meta_ad_id || 0, render: (r) => (r.meta_ad_id ? "#" + r.meta_ad_id : <span className="text-critical">sem rastreio</span>) },
    { key: "comprador", label: "Comprador", sort: (r) => r.comprador || "", render: (r) => r.comprador || "—" },
  ];
  return <DataTable rows={rows} cols={cols} />;
}
