import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, tudo, type Row } from "@/lib/supabase";
import { Card } from "@/components/ui/primitives";
import { rs, nBR, num, brData } from "@/lib/format";
import { METRICA_LABELS, METRICA_KEYS, METRICAS_PADRAO_LEADS, METRICAS_PADRAO_VENDA, metricasDoFunil } from "@/lib/funis";
import { cn } from "@/lib/utils";

function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Botao({ children, onClick, variante = "primario", disabled, small }: {
  children: React.ReactNode; onClick: () => void; variante?: "primario" | "ghost" | "critico"; disabled?: boolean; small?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn(small ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-4 text-sm", "rounded-lg font-semibold transition disabled:opacity-60",
        variante === "primario" && "bg-foreground text-background",
        variante === "ghost" && "border border-border bg-surface text-foreground hover:bg-muted",
        variante === "critico" && "border border-critical/40 bg-critical/10 text-critical hover:bg-critical/20")}>
      {children}
    </button>
  );
}

type Funil = { id: number; slug: string; nome: string; tipo: string; ativo: boolean; ordem: number; metricas: string[] | null };

function FormFunil({ inicial, onSalvar, onCancelar }: { inicial?: Funil; onSalvar: (f: Partial<Funil> & { nome: string }) => void; onCancelar: () => void; }) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? "venda_direta");
  const [metricas, setMetricas] = useState<string[]>(inicial ? metricasDoFunil(inicial) : METRICAS_PADRAO_VENDA);

  useEffect(() => {
    if (!inicial) setMetricas(tipo === "leads" ? METRICAS_PADRAO_LEADS : METRICAS_PADRAO_VENDA);
  }, [tipo, inicial]);

  function toggle(k: string) {
    setMetricas((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nome do funil</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Lançamento de setembro"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-s1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-s1">
            <option value="venda_direta">Venda direta (curso, order bumps)</option>
            <option value="leads">Geração de leads (comercial/WhatsApp)</option>
          </select>
        </label>
      </div>
      <div className="mt-3">
        <span className="text-sm font-medium">Métricas exibidas no funil</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {METRICA_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => toggle(k)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition",
                metricas.includes(k) ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted")}>
              {METRICA_LABELS[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Botao onClick={() => nome.trim() && onSalvar({ id: inicial?.id, nome: nome.trim(), tipo, metricas })} disabled={!nome.trim()}>
          {inicial ? "Salvar alterações" : "Criar funil"}
        </Botao>
        <Botao variante="ghost" onClick={onCancelar}>Cancelar</Botao>
      </div>
    </div>
  );
}

export function FunisConfig() {
  const [funis, setFunis] = useState<Funil[]>([]);
  const [campanhas, setCampanhas] = useState<Row[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [editando, setEditando] = useState<number | "novo" | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    try {
      const [f, c] = await Promise.all([tudo("funis", "ordem"), tudo("v_campanhas_funil")]);
      setFunis(f as Funil[]);
      setCampanhas((c as Row[]).sort((a, b) => num(b.investido_bruto) - num(a.investido_bruto)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarFunil(f: Partial<Funil> & { nome: string }) {
    setMsg("");
    const linha = { nome: f.nome, tipo: f.tipo, metricas: f.metricas, slug: undefined as string | undefined };
    if (f.id) {
      const { error } = await supabase.from("funis").update({ nome: linha.nome, tipo: linha.tipo, metricas: linha.metricas }).eq("id", f.id);
      if (error) { setMsg("Erro: " + error.message); return; }
    } else {
      const base = slugify(f.nome) || "funil";
      let slug = base, n = 2;
      while (funis.some((x) => x.slug === slug)) { slug = `${base}-${n++}`; }
      const { error } = await supabase.from("funis").insert({
        nome: linha.nome, tipo: linha.tipo, metricas: linha.metricas, slug,
        ordem: (funis.reduce((m, x) => Math.max(m, x.ordem), 0) || 0) + 1,
      });
      if (error) { setMsg("Erro: " + error.message); return; }
    }
    setEditando(null);
    await carregar();
  }

  async function excluirFunil(id: number, nome: string) {
    if (!confirm(`Excluir o funil "${nome}"? As campanhas atribuídas a ele ficam sem funil.`)) return;
    const { error } = await supabase.from("funis").delete().eq("id", id);
    setMsg(error ? "Erro: " + error.message : "Funil excluído.");
    await carregar();
  }

  async function atribuir(campaignId: string, funilId: number | null) {
    setCampanhas((cs) => cs.map((c) => (c.campaign_id === campaignId
      ? { ...c, funil_id: funilId, funil_nome: funis.find((f) => f.id === funilId)?.nome ?? null }
      : c)));
    await supabase.from("funil_regras_meta").delete().eq("tipo", "campaign_id").eq("valor", campaignId);
    if (funilId) {
      const { error } = await supabase.from("funil_regras_meta").insert({
        funil_id: funilId, tipo: "campaign_id", valor: campaignId, prioridade: 1, observacao: "atribuído manualmente",
      });
      if (error) setMsg("Erro ao atribuir: " + error.message);
    }
  }

  const campanhasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return campanhas;
    return campanhas.filter((c) => (c.campaign_name ?? "").toLowerCase().includes(q));
  }, [campanhas, busca]);

  if (carregando) return <Card title="Funis"><div className="py-6 text-center text-sm text-muted-foreground">Carregando…</div></Card>;
  if (erro) return <Card title="Funis"><div className="text-sm text-critical">Erro ao carregar: {erro}</div></Card>;

  return (
    <div className="grid gap-4">
      <Card title="Funis" sub="Crie funis e escolha quais métricas aparecem em cada um.">
        <div className="grid gap-2">
          {funis.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-surface p-3">
              {editando === f.id ? (
                <FormFunil inicial={f} onSalvar={salvarFunil} onCancelar={() => setEditando(null)} />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.tipo === "leads" ? "Geração de leads" : "Venda direta"} · {metricasDoFunil(f).length} métrica(s)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Botao small variante="ghost" onClick={() => setEditando(f.id)}>Editar</Botao>
                    <Botao small variante="critico" onClick={() => excluirFunil(f.id, f.nome)}>Excluir</Botao>
                  </div>
                </div>
              )}
            </div>
          ))}
          {editando === "novo" ? (
            <FormFunil onSalvar={salvarFunil} onCancelar={() => setEditando(null)} />
          ) : (
            <Botao variante="ghost" onClick={() => setEditando("novo")}>+ Novo funil</Botao>
          )}
        </div>
        {msg && <div className="mt-2 text-sm text-muted-foreground">{msg}</div>}
      </Card>

      <Card title="Campanhas" sub="Atribua cada campanha da Meta a um funil. Isso vale mais do que qualquer regra por nome.">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar campanha…"
          className="mb-3 w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-s1" />
        {campanhasFiltradas.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma campanha sincronizada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">Campanha</th>
                <th className="px-2 py-2 font-medium">Período</th>
                <th className="px-2 py-2 font-medium">Investido</th>
                <th className="px-2 py-2 font-medium">Funil</th>
              </tr></thead>
              <tbody>
                {campanhasFiltradas.map((c) => (
                  <tr key={c.campaign_id} className="border-b border-border/60">
                    <td className="px-2 py-2">{c.campaign_name || "#" + c.campaign_id}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{brData(c.primeira_data)} – {brData(c.ultima_data)}</td>
                    <td className="px-2 py-2 tnum">{rs(c.investido_bruto, 2)}</td>
                    <td className="px-2 py-2">
                      <select value={c.funil_id ?? ""} onChange={(e) => atribuir(c.campaign_id, e.target.value ? Number(e.target.value) : null)}
                        className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-s1">
                        <option value="">— nenhum —</option>
                        {funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2 text-xs text-muted-foreground">{nBR(campanhasFiltradas.length)} campanha(s) com dados sincronizados.</div>
      </Card>
    </div>
  );
}
