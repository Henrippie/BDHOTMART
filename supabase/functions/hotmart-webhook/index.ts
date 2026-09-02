// ---------------------------------------------------------------
// Receptor de webhook da Hotmart (versão 2.0.0)
// Grava cada evento de compra em public.hotmart_sales, de forma
// idempotente e preservando o payload cru em `raw`.
// Autenticação: header x-hotmart-hottok (por isso verify_jwt = false).
// ---------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const HOTTOK = Deno.env.get("HOTMART_HOTTOK") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// evento da Hotmart -> status guardado no banco
const STATUS_POR_EVENTO: Record<string, string> = {
  PURCHASE_APPROVED: "APPROVED",
  PURCHASE_COMPLETE: "COMPLETE",
  PURCHASE_REFUNDED: "REFUNDED",
  PURCHASE_CHARGEBACK: "CHARGEBACK",
  PURCHASE_CANCELED: "CANCELED",
  PURCHASE_PROTEST: "DISPUTE",
  PURCHASE_EXPIRED: "EXPIRED",
  PURCHASE_DELAYED: "DELAYED",
  PURCHASE_BILLET_PRINTED: "BILLET_PRINTED",
  PURCHASE_OUT_OF_SHOPPING_CART: "ABANDONED",
};

const CHAVES_RASTREIO = [
  "src", "sck", "utm_source", "utm_medium",
  "utm_campaign", "utm_content", "utm_term",
];

/** Varre o JSON inteiro atrás das chaves de rastreio, em qualquer profundidade. */
function varrerRastreio(raiz: unknown): Record<string, string> {
  const achados: Record<string, string> = {};
  const vistos = new WeakSet<object>();

  const anda = (no: unknown) => {
    if (!no || typeof no !== "object") return;
    if (vistos.has(no as object)) return;
    vistos.add(no as object);

    for (const [chave, valor] of Object.entries(no as Record<string, unknown>)) {
      const k = chave.toLowerCase().replace(/-/g, "_");
      if (
        CHAVES_RASTREIO.includes(k) && !achados[k] &&
        (typeof valor === "string" || typeof valor === "number") &&
        String(valor).trim() !== ""
      ) {
        achados[k] = String(valor).trim();
      }
      if (valor && typeof valor === "object") anda(valor);
    }
  };

  anda(raiz);
  return achados;
}

/** xcod e sckPaymentLink às vezes chegam como querystring: "src=x&sck=y". */
function lerQuerystring(texto: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof texto !== "string" || !texto.includes("=")) return out;
  try {
    for (const [k, v] of new URLSearchParams(texto.replace(/^\?/, ""))) {
      const chave = k.toLowerCase().replace(/-/g, "_");
      if (CHAVES_RASTREIO.includes(chave) && v.trim() !== "") out[chave] = v.trim();
    }
  } catch { /* formato inesperado: ignora */ }
  return out;
}

const paraData = (ms: unknown): string | null =>
  typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null;

const num = (v: unknown): number | null =>
  typeof v === "number" ? v : (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : null);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let corpo: Record<string, any>;
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ erro: "JSON inválido" }), { status: 400 });
  }

  // Autenticidade: a Hotmart envia o hottok no header (e, em versões
  // antigas, dentro do corpo).
  const hottokRecebido = req.headers.get("x-hotmart-hottok") ??
    req.headers.get("X-HOTMART-HOTTOK") ?? corpo?.hottok ?? "";

  if (!HOTTOK || hottokRecebido !== HOTTOK) {
    console.warn("hottok inválido");
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401 });
  }

  const d = corpo?.data ?? {};
  const compra = d.purchase ?? {};
  const produto = d.product ?? {};
  const comprador = d.buyer ?? {};

  const transacao = compra.transaction ?? d.transaction ?? corpo.id;
  if (!transacao) {
    return new Response(JSON.stringify({ erro: "sem transaction" }), { status: 400 });
  }

  // rastreio: varredura geral + campos nomeados da Hotmart + querystrings
  // (o mais específico vence)
  const t = compra?.tracking ?? {};
  const nomeados: Record<string, string> = {};
  if (typeof t.source === "string" && t.source.trim() && !t.source.includes("=")) {
    nomeados.src = t.source.trim();
  }
  const sckNomeado = t.source_sck ?? t.sck;
  if (typeof sckNomeado === "string" && sckNomeado.trim() && !sckNomeado.includes("=")) {
    nomeados.sck = sckNomeado.trim();
  }

  const rastreio = {
    ...varrerRastreio(corpo),
    ...nomeados,
    ...lerQuerystring(t.source),
    ...lerQuerystring(t.source_sck),
    ...lerQuerystring(t.external_code),
    ...lerQuerystring(compra?.origin?.xcod),
    ...lerQuerystring(compra?.sckPaymentLink),
  };
  if (!rastreio.sck && typeof compra?.sckPaymentLink === "string" &&
      !compra.sckPaymentLink.includes("=")) {
    rastreio.sck = compra.sckPaymentLink.trim();
  }

  // comissão do produtor = o que de fato entra no bolso
  const comissaoProdutor = (d.commissions ?? []).find(
    (c: any) => String(c?.source ?? "").toUpperCase() === "PRODUCER",
  );

  const preco = compra.price ?? compra.full_price ?? {};

  const linha = {
    transaction: String(transacao),
    product_id: num(produto.id),
    product_name: produto.name ?? null,
    offer_code: compra?.offer?.code ?? null,
    status: compra.status ?? STATUS_POR_EVENTO[corpo.event] ?? corpo.event ?? "UNKNOWN",
    order_date: paraData(compra.order_date),
    approved_date: paraData(compra.approved_date),
    price_value: num(preco.value),
    currency: preco.currency_value ?? preco.currency_code ?? null,
    producer_value: num(comissaoProdutor?.value),
    commission_currency: comissaoProdutor?.currency_value ?? null,
    payment_type: compra?.payment?.type ?? null,
    installments: num(compra?.payment?.installments_number),
    is_order_bump: Boolean(
      compra?.order_bump?.is_order_bump ?? compra?.is_order_bump ?? false,
    ),
    buyer_email: comprador.email ?? null,
    buyer_name: comprador.name ?? null,
    buyer_country: comprador?.address?.country_iso ?? compra?.checkout_country?.iso ?? null,
    src: rastreio.src ?? null,
    sck: rastreio.sck ?? null,
    utm_source: rastreio.utm_source ?? null,
    utm_medium: rastreio.utm_medium ?? null,
    utm_campaign: rastreio.utm_campaign ?? null,
    utm_content: rastreio.utm_content ?? null,
    utm_term: rastreio.utm_term ?? null,
    origem_dados: "webhook",
    raw: corpo,
    ultimo_evento: corpo.event ?? null,
    ultimo_evento_em: paraData(corpo.creation_date) ?? new Date().toISOString(),
  };

  const { error } = await supabase
    .from("hotmart_sales")
    .upsert(linha, { onConflict: "transaction" });

  if (error) {
    console.error("falha ao gravar", error);
    // 500 faz a Hotmart reenviar o evento — é o que queremos.
    return new Response(JSON.stringify({ erro: error.message }), { status: 500 });
  }

  // grava o produto no catálogo na primeira vez que aparece
  if (linha.product_id) {
    await supabase.from("produtos")
      .upsert({ product_id: linha.product_id, nome: linha.product_name ?? String(linha.product_id) },
              { onConflict: "product_id", ignoreDuplicates: true });
  }

  return new Response(JSON.stringify({ ok: true, transaction: linha.transaction }), {
    headers: { "Content-Type": "application/json" },
  });
});
