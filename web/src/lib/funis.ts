// Catálogo de métricas que podem aparecer num funil — usado tanto pra
// desenhar os tiles no painel quanto pros checkboxes em Configurações.
export const METRICA_LABELS: Record<string, string> = {
  investido: "Investido",
  cpm: "CPM",
  ctr: "CTR de link",
  leads: "Leads",
  conversas: "Conversas",
  vendas_hotmart: "Vendas (total)",
  vendas_principais: "Vendas do curso",
  vendas_bump: "Order bumps",
  faturado: "Faturado",
  cac: "CAC por venda",
  roas: "ROAS real",
  checkouts: "Checkouts",
};

export const METRICA_KEYS = Object.keys(METRICA_LABELS);

export const METRICAS_PADRAO_LEADS = ["investido", "cpm", "ctr", "leads", "conversas", "vendas_hotmart", "faturado", "cac"];
export const METRICAS_PADRAO_VENDA = ["investido", "cpm", "ctr", "checkouts", "vendas_principais", "vendas_bump", "faturado", "roas"];

export function metricasDoFunil(f: { tipo?: string; metricas?: string[] | null }): string[] {
  if (f.metricas && f.metricas.length) return f.metricas;
  return f.tipo === "leads" ? METRICAS_PADRAO_LEADS : METRICAS_PADRAO_VENDA;
}
