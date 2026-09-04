import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function Card({ title, sub, children, className }: { title?: string; sub?: ReactNode; children: ReactNode; className?: string; }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-surface p-4 sm:p-5", className)}>
      {title && <h2 className="text-base font-bold">{title}</h2>}
      {sub && <div className="mt-0.5 text-sm text-muted-foreground">{sub}</div>}
      <div className={title ? "mt-3" : ""}>{children}</div>
    </section>
  );
}

export function Tile({ rot, val, nota, tone }: { rot: string; val: string; nota?: ReactNode; tone?: "up" | "down" | "" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="text-xs font-medium text-muted-foreground">{rot}</div>
      <div className={cn("mt-1 text-2xl font-bold tnum", tone === "up" && "text-good", tone === "down" && "text-critical")}>{val}</div>
      {nota && <div className="mt-1 text-xs text-muted-foreground">{nota}</div>}
    </div>
  );
}

export function Pill({ active, children, onClick, title }: { active: boolean; children: ReactNode; onClick: () => void; title?: string; }) {
  return (
    <button
      type="button" onClick={onClick} title={title} aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3.5 text-sm font-medium transition",
        active ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export function Tabs({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (id: string) => void; }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.id} role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
          className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === o.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Legenda({ items }: { items: { cor: string; nome: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.nome} className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.cor }} />{it.nome}
        </span>
      ))}
    </div>
  );
}

export type Col<T> = { key: string; label: string; render: (r: T) => ReactNode; tone?: (r: T) => string; sort?: (r: T) => number | string; };

export function DataTable<T extends Record<string, any>>({ cols, rows, padrao }: { cols: Col<T>[]; rows: T[]; padrao?: string; }) {
  const [ord, setOrd] = useState<{ col: string; dir: number } | null>(padrao ? { col: padrao, dir: -1 } : null);
  if (!rows.length) return <div className="py-6 text-center text-sm text-muted-foreground">Nada aqui neste período.</div>;

  const sorted = [...rows];
  if (ord) {
    const c = cols.find((x) => x.key === ord.col);
    const val = (r: T) => (c?.sort ? c.sort(r) : (r[ord.col] as number | string));
    sorted.sort((a, b) => {
      let va = val(a), vb = val(b);
      if (va == null) va = -Infinity as any;
      if (vb == null) vb = -Infinity as any;
      if (typeof va === "number" && typeof vb === "number") return ord.dir * (va - vb);
      return ord.dir * String(va).localeCompare(String(vb), "pt-BR");
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm tnum">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {cols.map((c) => (
              <th key={c.key} onClick={() => setOrd((o) => ({ col: c.key, dir: o && o.col === c.key && o.dir === -1 ? 1 : -1 }))}
                className="cursor-pointer select-none whitespace-nowrap px-2 py-2 font-medium hover:text-foreground">
                {c.label}{ord?.col === c.key ? (ord.dir === 1 ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 300).map((r, i) => (
            <tr key={i} className="border-b border-border/60">
              {cols.map((c) => (
                <td key={c.key} className={cn("whitespace-nowrap px-2 py-2", c.tone && c.tone(r))}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
