// ---------------------------------------------------------------
// Busca a imagem/vídeo dos anúncios que mais performaram (ranking
// já calculado no banco, view v_top_criativos) e salva em
// meta_ad_creatives — usado pela seção "Melhores criativos" do painel.
//   POST /meta-criativos-sync?limite=12
// ---------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

let TOKEN = "";
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

Deno.serve(async (req: Request) => {
  const cfg = await carregarConfig(["meta_access_token", "meta_api_version"]);
  TOKEN = cfg.meta_access_token ?? Deno.env.get("META_ACCESS_TOKEN") ?? "";
  VERSAO = cfg.meta_api_version ?? Deno.env.get("META_API_VERSION") ?? "v26.0";

  if (!TOKEN) {
    return new Response(
      JSON.stringify({ erro: "Configure o token da Meta em Configurações." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const limite = Math.max(1, Math.min(Number(url.searchParams.get("limite") ?? "12"), 30));

  const { data: log } = await supabase.from("sync_log")
    .insert({ job: "meta-criativos-sync", detalhe: `top ${limite}` })
    .select("id").single();

  const problemas: string[] = [];
  let total = 0;

  try {
    const { data: top, error } = await supabase.from("v_top_criativos")
      .select("ad_id")
      .order("resultados", { ascending: false })
      .order("receita_brl", { ascending: false })
      .limit(limite);
    if (error) throw new Error(error.message);

    for (const row of top ?? []) {
      const adId = row.ad_id;
      try {
        const p = new URLSearchParams({
          fields: "name,preview_shareable_link,creative{thumbnail_url,image_url,video_id}",
          access_token: TOKEN,
        });
        const r = await fetch(`https://graph.facebook.com/${VERSAO}/${adId}?${p}`);
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j?.error?.message ?? r.statusText);

        const creative = j.creative ?? {};
        const tipo = creative.video_id ? "video" : "imagem";
        const thumbnail = creative.thumbnail_url ?? creative.image_url ?? null;
        if (!thumbnail) { problemas.push(`${adId}: sem imagem/thumbnail`); continue; }

        const { error: upErr } = await supabase.from("meta_ad_creatives").upsert({
          ad_id: adId,
          ad_name: j.name ?? null,
          tipo,
          thumbnail_url: thumbnail,
          preview_url: j.preview_shareable_link ?? null,
          atualizado_em: new Date().toISOString(),
        }, { onConflict: "ad_id" });
        if (upErr) throw new Error(upErr.message);
        total++;
      } catch (e) {
        problemas.push(`${adId}: ${e}`);
      }
    }

    await supabase.from("sync_log").update({
      fim: new Date().toISOString(),
      status: problemas.length ? "erro" : "ok",
      registros: total,
      detalhe: `top ${limite} | salvos ${total}` + (problemas.length ? ` | ${problemas.join("; ")}` : ""),
    }).eq("id", log?.id);

    return new Response(JSON.stringify({ ok: problemas.length === 0, salvos: total, problemas }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    await supabase.from("sync_log").update({
      fim: new Date().toISOString(), status: "erro", detalhe: String(e),
    }).eq("id", log?.id);
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500 });
  }
});
