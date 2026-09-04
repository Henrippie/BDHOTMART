import { Card } from "@/components/ui/primitives";
import { rs, nBR, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Row } from "@/lib/supabase";

// Ordem visual do pódio: 2º à esquerda, 1º no centro (mais alto), 3º à direita.
const ORDEM_PODIO = [1, 0, 2];
const ALTURA = ["h-40 sm:h-48", "h-52 sm:h-64", "h-32 sm:h-40"]; // por posição visual
const MEDALHA = ["🥈", "🥇", "🥉"];

function metricaPrincipal(r: Row): { rot: string; val: string } {
  if (r.funil_tipo === "leads") {
    const leads = num(r.leads) + num(r.conversas);
    return { rot: "resultados", val: `${nBR(leads)} lead(s)` };
  }
  if (num(r.vendas) > 0) return { rot: "vendas", val: `${nBR(r.vendas)} venda(s) · ${rs(r.receita_brl, 0)}` };
  return { rot: "resultados", val: `${nBR(r.resultados)} resultado(s)` };
}

function CardCriativo({ r, posicao }: { r: Row; posicao: number }) {
  const metrica = metricaPrincipal(r);
  return (
    <a
      href={r.preview_url ?? undefined}
      target="_blank" rel="noreferrer"
      className={cn(
        "group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-center transition hover:border-s1/60",
        !r.preview_url && "pointer-events-none",
      )}
    >
      <div className={cn("relative w-full max-w-[180px] overflow-hidden rounded-xl bg-muted", ALTURA[posicao])}>
        <img src={r.thumbnail_url} alt={r.ad_name ?? "criativo"} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        {r.tipo === "video" && (
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-sm text-black">▶</span>
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 text-lg drop-shadow">{MEDALHA[posicao]}</span>
      </div>
      <div className="w-full max-w-[180px]">
        <div className="truncate text-sm font-semibold" title={r.ad_name}>{r.ad_name || "#" + r.ad_id}</div>
        {r.funil_nome && <div className="truncate text-xs text-muted-foreground">{r.funil_nome}</div>}
        <div className="mt-1 text-xs font-medium text-good">{metrica.val}</div>
        <div className="text-xs text-muted-foreground">investido {rs(r.investido_brl, 0)}</div>
      </div>
    </a>
  );
}

export function MelhoresCriativos({ criativos }: { criativos: Row[] }) {
  const top3 = [...criativos]
    .sort((a, b) => num(b.resultados) - num(a.resultados) || num(b.receita_brl) - num(a.receita_brl))
    .slice(0, 3);

  return (
    <Card title="Melhores criativos" sub="Os 3 anúncios com mais resultado (vendas, leads e conversas somados). Clique num criativo para ver o anúncio completo.">
      {top3.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Ainda sem criativos sincronizados. Vá em Configurações → Meta Ads e clique em "Sincronizar criativos".
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-center gap-4 py-2 sm:gap-6">
          {ORDEM_PODIO.filter((i) => top3[i]).map((i) => (
            <CardCriativo key={top3[i].ad_id} r={top3[i]} posicao={i} />
          ))}
        </div>
      )}
    </Card>
  );
}
