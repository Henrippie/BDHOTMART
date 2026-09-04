// ---------------------------------------------------------------
// Carga histórica / reconciliação diária da Hotmart.
// Roda todo dia depois do fechamento para pegar vendas que o webhook
// perdeu e atualizar status que mudaram (reembolso, chargeback).
//   POST /hotmart-backfill?dias=7
//   POST /hotmart-backfill?since=2026-06-01&until=2026-08-27
// ---------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Resolvidos por requisição: tabela integracao_config (painel) e, como
// fallback, os secrets de ambiente.
let CLIENT_ID = "";
let CLIENT_SECRET = "";
let BASIC = "";

const OAUTH = "https://api-sec-vlc.hotmart.com/security/oauth/token";
const API = "https://developers.hotmart.com/payments/api/v1/sales/history";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function carregarConfig(chaves: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const { data } = await supabase.from("integracao_config").select("chave,valor").in("chave", chaves);
    for (const r of data ?? []) if (r.valor) map[r.chave] = String(r.valor);
  } catch (_) { /* tabela pode não existir ainda */ }
  return map;
}

async function token(): Promise<string> {
  const url = `${OAUTH}?${new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  })}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${BASIC}`,
      "Content-Type": "application/json",
    },
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) {
    throw new Error(`OAuth Hotmart falhou: ${JSON.stringify(j)}`);
  }
  return j.access_token;
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : (isNaN(Number(v)) ? null : Number(v));

const paraData = (ms: unknown): string | null =>
  typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null;

/** Alguns campos de rastreio chegam como querystring ("src=x&sck=y"). */
function lerQuerystring(texto: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof texto !== "string" || !texto.includes("=")) return out;
  try {
    for (const [k, v] of new URLSearchParams(texto.replace(/^\?/, ""))) {
      if (v.trim() !== "") out[k.toLowerCase()] = v.trim();
    }
  } catch { /* ignora */ }
  return out;
}

function mapear(item: any) {
  const c = item?.purchase ?? {};
  const p = item?.product ?? {};
  const b = item?.buyer ?? {};
  const t = c?.tracking ?? {};

  const src = t.source ?? null;
  const sck = t.source_sck ?? t.sck ?? null;
  const extras = { ...lerQuerystring(src), ...lerQuerystring(sck), ...lerQuerystring(t.external_code) };

  const produtor = (item?.commissions ?? []).find(
    (x: any) => String(x?.source ?? "").toUpperCase() === "PRODUCER",
  );

  return {
    transaction: String(c.transaction),
    product_id: num(p.id),
    product_name: p.name ?? null,
    offer_code: c?.offer?.code ?? null,
    status: c.status ?? "UNKNOWN",
    order_date: paraData(c.order_date),
    approved_date: paraData(c.approved_date),
    price_value: num(c?.price?.value),
    currency: c?.price?.currency_code ?? c?.price?.currency_value ?? null,
    producer_value: num(produtor?.value),
    commission_currency: produtor?.currency_code ?? produtor?.currency_value ?? null,
    payment_type: c?.payment?.method ?? c?.payment?.type ?? null,
    installments: num(c?.payment?.installments_number),
    is_order_bump: Boolean(c?.order_bump?.is_order_bump ?? false),
    buyer_email: b.email ?? null,
    buyer_name: b.name ?? null,
    buyer_country: b?.address?.country ?? null,
    src: extras.src ?? (typeof src === "string" && !src.includes("=") ? src : null),
    sck: extras.sck ?? (typeof sck === "string" && !sck.includes("=") ? sck : null),
    utm_source: extras.utm_source ?? null,
    utm_medium: extras.utm_medium ?? null,
    utm_campaign: extras.utm_campaign ?? null,
    utm_content: extras.utm_content ?? null,
    utm_term: extras.utm_term ?? null,
    origem_dados: "api",
    raw: item,
    ultimo_evento: "BACKFILL",
    ultimo_evento_em: paraData(c.approved_date) ?? paraData(c.order_date) ?? new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  const cfg = await carregarConfig(["hotmart_client_id", "hotmart_client_secret", "hotmart_basic_token"]);
  CLIENT_ID = cfg.hotmart_client_id ?? Deno.env.get("HOTMART_CLIENT_ID") ?? "";
  CLIENT_SECRET = cfg.hotmart_client_secret ?? Deno.env.get("HOTMART_CLIENT_SECRET") ?? "";
  BASIC = cfg.hotmart_basic_token ?? Deno.env.get("HOTMART_BASIC_TOKEN") ?? "";

  if (!CLIENT_ID || !CLIENT_SECRET || !BASIC) {
    return new Response(
      JSON.stringify({ erro: "Configure as credenciais da API da Hotmart em Configurações." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const dias = Math.max(1, Math.min(Number(url.searchParams.get("dias") ?? "7"), 365));
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  const fim = until ? new Date(`${until}T23:59:59Z`) : new Date();
  const inicio = since
    ? new Date(`${since}T00:00:00Z`)
    : new Date(fim.getTime() - dias * 86400000);

  const { data: log } = await supabase.from("sync_log")
    .insert({ job: "hotmart-backfill", detalhe: `${inicio.toISOString()} → ${fim.toISOString()}` })
    .select("id").single();

  try {
    const bearer = await token();
    let pageToken: string | null = null;
    let total = 0;

    do {
      const params = new URLSearchParams({
        max_results: "500",
        start_date: String(inicio.getTime()),
        end_date: String(fim.getTime()),
      });
      if (pageToken) params.set("page_token", pageToken);

      const r = await fetch(`${API}?${params}`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(`sales/history: ${JSON.stringify(j)}`);

      const linhas = (j.items ?? [])
        .filter((i: any) => i?.purchase?.transaction)
        .map(mapear);

      if (linhas.length) {
        const { error } = await supabase.from("hotmart_sales")
          .upsert(linhas, { onConflict: "transaction" });
        if (error) throw new Error(error.message);
        total += linhas.length;
      }

      pageToken = j?.page_info?.next_page_token ?? null;
    } while (pageToken);

    await supabase.from("sync_log").update({
      fim: new Date().toISOString(), status: "ok", registros: total,
    }).eq("id", log?.id);

    return new Response(JSON.stringify({ ok: true, registros: total }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    await supabase.from("sync_log").update({
      fim: new Date().toISOString(), status: "erro", detalhe: String(e),
    }).eq("id", log?.id);
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500 });
  }
});
