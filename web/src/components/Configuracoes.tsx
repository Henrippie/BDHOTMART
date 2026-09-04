import { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_URL } from "@/lib/supabase";
import { Card, Tabs } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { FunisConfig } from "@/components/FunisConfig";

type Status = Record<string, { preenchido: boolean; valor_publico: string | null; atualizado_em: string | null }>;

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/hotmart-webhook`;

function Botao({ children, onClick, variante = "primario", disabled }: { children: React.ReactNode; onClick: () => void; variante?: "primario" | "ghost"; disabled?: boolean; }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn("min-h-10 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60",
        variante === "primario" ? "bg-foreground text-background" : "border border-border bg-surface text-foreground hover:bg-muted")}>
      {children}
    </button>
  );
}

function Campo({ label, tipo = "text", valor, onChange, placeholder, dica }: { label: string; tipo?: string; valor: string; onChange: (v: string) => void; placeholder?: string; dica?: React.ReactNode; }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {dica && <span className="ml-2 text-xs text-muted-foreground">{dica}</span>}
      <input type={tipo} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoComplete="off"
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-s1" />
    </label>
  );
}

function Selo({ ok }: { ok: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
      ok ? "bg-good/15 text-good" : "bg-critical/15 text-critical")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-good" : "bg-critical")} />
      {ok ? "configurado" : "faltando"}
    </span>
  );
}

export function Configuracoes({ onVoltar }: { onVoltar: () => void }) {
  const [aba, setAba] = useState("integracoes");
  const [status, setStatus] = useState<Status>({});
  const [msg, setMsg] = useState<{ meta?: string; hotmart?: string; fx?: string }>({});

  // Meta
  const [metaToken, setMetaToken] = useState("");
  const [metaContas, setMetaContas] = useState("");
  const [metaVersao, setMetaVersao] = useState("");
  // Hotmart
  const [hottok, setHottok] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [basic, setBasic] = useState("");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc("integracao_status");
    if (error) { setMsg((m) => ({ ...m, meta: "Erro ao ler status: " + error.message })); return; }
    const map: Status = {};
    for (const r of (data ?? []) as any[]) map[r.chave] = { preenchido: r.preenchido, valor_publico: r.valor_publico, atualizado_em: r.atualizado_em };
    setStatus(map);
    setMetaContas(map.meta_ad_account_ids?.valor_publico ?? "");
    setMetaVersao(map.meta_api_version?.valor_publico ?? "v26.0");
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(pares: [string, string, boolean][], area: "meta" | "hotmart") {
    // pares: [chave, valor, sempreSalvar]. Segredos só salvam se digitados.
    try {
      for (const [chave, valor, sempre] of pares) {
        if (!sempre && valor.trim() === "") continue;
        const { error } = await supabase.rpc("integracao_salvar", { p_chave: chave, p_valor: valor });
        if (error) throw new Error(error.message);
      }
      setMsg((m) => ({ ...m, [area]: "Salvo ✓" }));
      setMetaToken(""); setHottok(""); setClientId((v) => v); setClientSecret(""); setBasic("");
      await carregar();
    } catch (e) {
      setMsg((m) => ({ ...m, [area]: "Erro: " + (e instanceof Error ? e.message : String(e)) }));
    }
  }

  async function disparar(job: string, query: string, area: "meta" | "hotmart" | "fx") {
    setMsg((m) => ({ ...m, [area]: "Disparando…" }));
    const { error } = await supabase.rpc("disparar", { p_job: job, p_query: query });
    setMsg((m) => ({ ...m, [area]: error ? "Erro: " + error.message : "Sincronização disparada. Acompanhe em alguns instantes no painel (rodapé) e nas tabelas." }));
  }

  const copiar = (t: string) => navigator.clipboard?.writeText(t).then(() => setMsg((m) => ({ ...m, hotmart: "URL copiada ✓" }))).catch(() => {});

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Configurações — integrações</h2>
        <button onClick={onVoltar} className="min-h-10 rounded-lg border border-border bg-surface px-3 text-sm">← Voltar ao painel</button>
      </div>
      <Tabs value={aba} onChange={setAba} options={[
        { id: "integracoes", label: "Integrações" },
        { id: "funis", label: "Funis por campanha" },
      ]} />

      {aba === "funis" ? <FunisConfig /> : <>
      <p className="text-sm text-muted-foreground">
        As credenciais são guardadas de forma protegida no banco (o painel <b>não</b> lê os valores de volta — só mostra se estão configurados).
        As Edge Functions leem essas credenciais na hora de sincronizar.
      </p>

      {/* META */}
      <Card title="Meta Ads" sub="Token e conta de anúncios da Marketing API.">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1">Token <Selo ok={!!status.meta_access_token?.preenchido} /></span>
          <span className="flex items-center gap-1">Conta <Selo ok={!!status.meta_ad_account_ids?.preenchido} /></span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Access Token" tipo="password" valor={metaToken} onChange={setMetaToken}
            placeholder={status.meta_access_token?.preenchido ? "•••••• (já configurado — deixe em branco para manter)" : "cole o token"} />
          <Campo label="Conta(s) de anúncio" valor={metaContas} onChange={setMetaContas} placeholder="act_1234567890" dica="separe por vírgula" />
          <Campo label="Versão da API" valor={metaVersao} onChange={setMetaVersao} placeholder="v26.0" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Botao onClick={() => salvar([
            ["meta_access_token", metaToken, false],
            ["meta_ad_account_ids", metaContas, true],
            ["meta_api_version", metaVersao || "v26.0", true],
          ], "meta")}>Salvar Meta</Botao>
          <Botao variante="ghost" onClick={() => disparar("meta-sync", "dias=7", "meta")}>Sincronizar Meta (7 dias)</Botao>
          <Botao variante="ghost" onClick={() => disparar("meta-criativos-sync", "limite=12", "meta")}>Sincronizar criativos (melhores anúncios)</Botao>
        </div>
        {msg.meta && <div className="mt-2 text-sm text-muted-foreground">{msg.meta}</div>}
      </Card>

      {/* HOTMART */}
      <Card title="Hotmart" sub="Webhook (tempo real) + credenciais da API (carga histórica).">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-xs font-medium text-muted-foreground">URL do webhook (cole na Hotmart → Ferramentas → Webhook, versão 2.0.0)</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded bg-surface px-2 py-1.5 text-xs">{WEBHOOK_URL}</code>
            <Botao variante="ghost" onClick={() => copiar(WEBHOOK_URL)}>Copiar</Botao>
          </div>
        </div>
        <div className="mb-3 mt-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1">Hottok <Selo ok={!!status.hotmart_hottok?.preenchido} /></span>
          <span className="flex items-center gap-1">Client ID <Selo ok={!!status.hotmart_client_id?.preenchido} /></span>
          <span className="flex items-center gap-1">Client Secret <Selo ok={!!status.hotmart_client_secret?.preenchido} /></span>
          <span className="flex items-center gap-1">Basic <Selo ok={!!status.hotmart_basic_token?.preenchido} /></span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Hottok (do webhook)" tipo="password" valor={hottok} onChange={setHottok}
            placeholder={status.hotmart_hottok?.preenchido ? "•••••• (já configurado)" : "cole o hottok"} />
          <Campo label="Client ID (API)" valor={clientId} onChange={setClientId}
            placeholder={status.hotmart_client_id?.preenchido ? "•••••• (já configurado)" : "client_id"} />
          <Campo label="Client Secret (API)" tipo="password" valor={clientSecret} onChange={setClientSecret}
            placeholder={status.hotmart_client_secret?.preenchido ? "•••••• (já configurado)" : "client_secret"} />
          <Campo label="Basic token (API)" tipo="password" valor={basic} onChange={setBasic}
            placeholder={status.hotmart_basic_token?.preenchido ? "•••••• (já configurado)" : "Basic ..."} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Botao onClick={() => salvar([
            ["hotmart_hottok", hottok, false],
            ["hotmart_client_id", clientId, false],
            ["hotmart_client_secret", clientSecret, false],
            ["hotmart_basic_token", basic, false],
          ], "hotmart")}>Salvar Hotmart</Botao>
          <Botao variante="ghost" onClick={() => disparar("hotmart-backfill", "dias=7", "hotmart")}>Rodar carga (7 dias)</Botao>
        </div>
        {msg.hotmart && <div className="mt-2 text-sm text-muted-foreground">{msg.hotmart}</div>}
      </Card>

      {/* CÂMBIO */}
      <Card title="Câmbio (opcional)" sub="Só é preciso se você anuncia em USD/EUR. Roda sozinho todo dia.">
        <Botao variante="ghost" onClick={() => disparar("fx-sync", "", "fx")}>Atualizar câmbio agora</Botao>
        {msg.fx && <div className="mt-2 text-sm text-muted-foreground">{msg.fx}</div>}
      </Card>

      <details className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Onde pego cada credencial?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Meta Access Token / Conta:</b> developers.facebook.com → seu App → Ferramentas → Graph API Explorer (ou um System User no Business Manager para token longo), permissões <code>ads_read</code>. A conta é o <code>act_XXXX</code>.</li>
          <li><b>Hotmart Hottok:</b> Hotmart → Ferramentas → Webhook (Notificações).</li>
          <li><b>Hotmart Client ID / Secret / Basic:</b> Hotmart → Ferramentas → Credenciais de API (Hotmart Developers).</li>
        </ul>
      </details>
      </>}
    </div>
  );
}
