// ---------------------------------------------------------------
// Cotação diária USD/EUR -> BRL, para consolidar a campanha que roda
// no exterior junto com as vendas em real.
// ---------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const MOEDAS = (Deno.env.get("FX_MOEDAS") ?? "USD,EUR").split(",").map((m) => m.trim());

Deno.serve(async () => {
  const pares = MOEDAS.map((m) => `${m}-BRL`).join(",");
  const hoje = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const r = await fetch(`https://economia.awesomeapi.com.br/json/last/${pares}`);
    const j = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(j));

    const linhas = Object.values(j as Record<string, any>)
      .map((c: any) => ({
        data: hoje,
        moeda: String(c.code).toUpperCase(),
        taxa_brl: Number(c.bid),
      }))
      .filter((l) => l.taxa_brl > 0);

    if (linhas.length) {
      const { error } = await supabase.from("fx_rates")
        .upsert(linhas, { onConflict: "data,moeda" });
      if (error) throw new Error(error.message);
    }

    await supabase.from("sync_log").insert({
      job: "fx-sync", fim: new Date().toISOString(),
      status: "ok", registros: linhas.length,
      detalhe: linhas.map((l) => `${l.moeda}=${l.taxa_brl}`).join(" "),
    });

    return new Response(JSON.stringify({ ok: true, cotacoes: linhas }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    await supabase.from("sync_log").insert({
      job: "fx-sync", fim: new Date().toISOString(), status: "erro", detalhe: String(e),
    });
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500 });
  }
});
