import { FunnelChart, type FunnelStage } from "@/components/ui/funnel-chart";
import { nBR } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";

export interface EtapaFunil { label: string; value: number; display?: string; }

const RAMP = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Monta os estágios com um degradê sequencial (o funil é sequencial). */
export function montarEstagios(itens: EtapaFunil[]): FunnelStage[] {
  return itens.map((it, i) => {
    const c0 = RAMP[Math.min(i, RAMP.length - 1)];
    const c1 = RAMP[Math.min(i + 1, RAMP.length - 1)];
    return {
      label: it.label,
      value: Math.max(it.value, 0),
      displayValue: it.display ?? nBR(it.value),
      gradient: [
        { offset: "0%", color: c0 },
        { offset: "100%", color: c1 },
      ],
    } satisfies FunnelStage;
  });
}

export function FunnelVisual({ itens }: { itens: EtapaFunil[] }) {
  const mobile = useIsMobile();
  const dados = montarEstagios(itens);
  if (!dados.length || dados[0].value <= 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Sem volume no topo do funil neste período.</div>;
  }
  // No celular o funil vertical usa muito melhor a largura estreita.
  return (
    <FunnelChart
      data={dados}
      orientation={mobile ? "vertical" : "horizontal"}
      layers={3}
      edges="curved"
      grid
      labelLayout="spread"
      staggerDelay={0.1}
      heightFloor={0.16}
      heightCurve={0.5}
      formatValue={(v) => nBR(v)}
      formatPercentage={(p) => (p >= 10 ? `${Math.round(p)}%` : `${p.toFixed(1)}%`)}
    />
  );
}
