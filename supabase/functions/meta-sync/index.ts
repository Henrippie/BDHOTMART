// ---------------------------------------------------------------
// Sincroniza a Meta em três passadas:
//   1) métricas diárias por anúncio
//   2) quebra por idade e gênero
//   3) quebra por plataforma e posicionamento
// Reprocessa uma janela de dias porque a Meta reatribui conversões
// por até 72h depois do clique.
// ---------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Resolvidos por requisição: primeiro a tabela integracao_config (painel),
// depois os secrets de ambiente como fallback.
let TOKEN = "";
let CONTAS: string[] = [];
let VERSAO = "v26.0";

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

function parseContas(raw: string): string[] {
  return raw.split(",").map((c) => c.trim()).filter(Boolean)
    .map((c) => (c.startsWith("act_") ? c : `act_${c}`));
}

const CAMPOS_BASE = [
  "account_id", "account_currency",
  "campaign_id", "campaign_name",
  "adset_id", "adset_name",
  "ad_id", "ad_name",
  "spend", "impressions", "reach", "clicks", "inline_link_clicks",
  "actions", "action_values",
];

// Ordem de preferência: o primeiro tipo presente vence, para não somar duas
// vezes a mesma conversão contada com nomes diferentes.
const COMPRA = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
const CHECKOUT = ["omni_initiated_checkout", "initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"];
const PAGEVIEW = ["landing_page_view"];
const LEAD = ["lead", "onsite_conversion.lead_grouped", "leadgen_grouped", "offsite_conversion.fb_pixel_lead"];
const CONVERSA = [
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
];

function acao(lista: any[] | undefined, preferencia: string[]): number {
  if (!Array.isArray(lista)) return 0;
  for (const tipo of preferencia) {
    const achado = lista.filter((a) => a?.action_type === tipo);
    if (achado.length) return achado.reduce((s, a) => s + (Number(a.value) || 0), 0);
  }
  return 0;
}

const n = (v: unknown) => Number(v) || 0;

function janela(dias: number) {
  const fim = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const inicio = new Date(fim.getTime() - (dias - 1) * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { since: iso(inicio), until: iso(fim) };
}

/** Percorre a paginação da Insights API. */
async function* paginar(url: string) {
  let proxima: string | null = url;
  while (proxima) {
    const resp = await fetch(proxima);
    const json = await resp.json();
    if (!resp.ok || json.error) {
      throw new Error(json?.error?.message ?? resp.statusText);
    }
    yield json.data ?? [];
    proxima = json?.paging?.next ?? null;
  }
}

function montarUrl(conta: string, range: unknown, campos: string[], breakdowns?: string) {
  const p = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify(range),
    fields: campos.join(","),
    limit: "500",
    access_token: TOKEN,
  });
  if (breakdowns) p.set("breakdowns", breakdowns);
  return `https://graph.facebook.com/${VERSAO}/${conta}/insights?${p}`;
}

/** Métricas comuns a todas as passadas. */
function metricas(r: any) {
  return {
    spend: n(r.spend),
    impressions: n(r.impressions),
    reach: n(r.reach),
    clicks: n(r.clicks),
    link_clicks: n(r.inline_link_clicks),
    landing_page_views: acao(r.actions, PAGEVIEW),
    initiate_checkout: acao(r.actions, CHECKOUT),
    purchases: acao(r.actions, COMPRA),
    purchase_value: acao(r.action_values, COMPRA),
    leads: acao(r.actions, LEAD),
    conversas: acao(r.actions, CONVERSA),
    currency: r.account_currency ?? null,
  };
}

Deno.serve(async (req: Request) => {
  const cfg = await carregarConfig(["meta_access_token", "meta_ad_account_ids", "meta_api_version"]);
  TOKEN = cfg.meta_access_token ?? Deno.env.get("META_ACCESS_TOKEN") ?? "";
  CONTAS = parseContas(cfg.meta_ad_account_ids ?? Deno.env.get("META_AD_ACCOUNT_IDS") ?? Deno.env.get("META_AD_ACCOUNT_ID") ?? "");
  VERSAO = cfg.meta_api_version ?? Deno.env.get("META_API_VERSION") ?? "v26.0";

  if (!TOKEN || CONTAS.length === 0) {
    return new Response(
      JSON.stringify({ erro: "Configure o token e a conta de anúncios da Meta em Configurações." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const dias = Number(url.searchParams.get("dias") ?? "7");
  const comQuebras = url.searchParams.get("quebras") !== "0";
  const range = url.searchParams.get("since") && url.searchParams.get("until")
    ? { since: url.searchParams.get("since")!, until: url.searchParams.get("until")! }
    : janela(Math.max(1, Math.min(dias, 90)));

  const { data: log } = await supabase.from("sync_log")
    .insert({ job: "meta-sync", detalhe: `${range.since} → ${range.until}` })
    .select("id").single();

  const problemas: string[] = [];
  let totalBase = 0, totalQuebra = 0;

  try {
    for (const conta of CONTAS) {
      // ---------- 1. base, por anúncio ----------
      // reach no nível de anúncio às vezes derruba a chamada ("unknown error");
      // tenta com reach e, se falhar, repete sem reach.
      for (const campos of [CAMPOS_BASE, CAMPOS_BASE.filter((c) => c !== "reach")]) {
        try {
          for await (const pagina of paginar(montarUrl(conta, range, campos))) {
            const linhas = pagina.map((r: any) => ({
              date_start: r.date_start,
              ad_id: Number(r.ad_id),
              account_id: r.account_id ?? null,
              campaign_id: r.campaign_id ? Number(r.campaign_id) : null,
              campaign_name: r.campaign_name ?? null,
              adset_id: r.adset_id ? Number(r.adset_id) : null,
              adset_name: r.adset_name ?? null,
              ad_name: r.ad_name ?? null,
              ...metricas(r),
              raw: r,
              atualizado_em: new Date().toISOString(),
            })).filter((l: any) => l.ad_id && l.date_start);

            if (linhas.length) {
              const { error } = await supabase.from("meta_ads_insights")
                .upsert(linhas, { onConflict: "date_start,ad_id" });
              if (error) problemas.push(`${conta} base: ${error.message}`);
              else totalBase += linhas.length;
            }
          }
          break; // deu certo, não tenta a variante sem reach
        } catch (e) {
          if (campos.includes("reach")) continue; // tenta de novo sem reach
          problemas.push(`${conta} base: ${e}`);
        }
      }

      if (!comQuebras) continue;

      // ---------- 2 e 3. quebras ----------
      const passadas: Array<{ tipo: string; breakdowns: string; k1: string; k2: string }> = [
        { tipo: "demografia",     breakdowns: "age,gender",                        k1: "age",                k2: "gender" },
        { tipo: "posicionamento", breakdowns: "publisher_platform,platform_position", k1: "publisher_platform", k2: "platform_position" },
      ];

      for (const p of passadas) {
        // reach nem sempre é liberado junto de breakdowns; cai para sem reach.
        for (const campos of [CAMPOS_BASE, CAMPOS_BASE.filter((c) => c !== "reach")]) {
          try {
            for await (const pagina of paginar(montarUrl(conta, range, campos, p.breakdowns))) {
              const linhas = pagina.map((r: any) => ({
                date_start: r.date_start,
                ad_id: Number(r.ad_id),
                tipo: p.tipo,
                chave1: String(r[p.k1] ?? "desconhecido"),
                chave2: String(r[p.k2] ?? ""),
                campaign_id: r.campaign_id ? Number(r.campaign_id) : null,
                ...metricas(r),
                atualizado_em: new Date().toISOString(),
              })).filter((l: any) => l.ad_id && l.date_start);

              if (linhas.length) {
                const { error } = await supabase.from("meta_insights_quebra")
                  .upsert(linhas, { onConflict: "date_start,ad_id,tipo,chave1,chave2" });
                if (error) problemas.push(`${conta} ${p.tipo}: ${error.message}`);
                else totalQuebra += linhas.length;
              }
            }
            break; // deu certo, não tenta a variante sem reach
          } catch (e) {
            if (campos.includes("reach")) continue; // tenta de novo sem reach
            problemas.push(`${conta} ${p.tipo}: ${e}`);
          }
        }
      }
    }

    await supabase.from("sync_log").update({
      fim: new Date().toISOString(),
      status: problemas.length ? "erro" : "ok",
      registros: totalBase + totalQuebra,
      detalhe: `${range.since} → ${range.until} | base ${totalBase} | quebras ${totalQuebra}` +
               (problemas.length ? ` | ${problemas.join("; ")}` : ""),
    }).eq("id", log?.id);

    return new Response(JSON.stringify({
      ok: problemas.length === 0,
      periodo: range,
      registros: { base: totalBase, quebras: totalQuebra },
      problemas,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    await supabase.from("sync_log").update({
      fim: new Date().toISOString(), status: "erro", detalhe: String(e),
    }).eq("id", log?.id);
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500 });
  }
});
