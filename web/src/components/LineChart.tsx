import { useEffect, useRef, useState } from "react";
import { brData, diaCurto } from "@/lib/format";

export interface Ponto { dia: string; a: number; b: number; }

interface Props {
  data: Ponto[];
  nomeA: string;
  nomeB: string;
  rot: (v: number) => string;
  eixo: (v: number) => string;
}

export function LineChart({ data, nomeA, nomeB, rot, eixo }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => { if (ref.current) setW(Math.max(ref.current.clientWidth, 300)); };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (!data.length) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</div>;
  }

  const L = 46, R = 16, T = 12, B = 30;
  const alturaPlot = w < 520 ? 170 : 210;
  const H = alturaPlot + T + B;

  let maxV = 1;
  data.forEach((p) => { maxV = Math.max(maxV, p.a, p.b); });
  const passo = Math.pow(10, Math.floor(Math.log10(maxV)));
  const teto = Math.ceil(maxV / (passo / 2)) * (passo / 2) || 1;

  const x = (i: number) => L + (data.length === 1 ? (w - L - R) / 2 : (i * (w - L - R)) / (data.length - 1));
  const y = (v: number) => T + alturaPlot - (v / teto) * alturaPlot;

  const caminho = (k: "a" | "b") =>
    data.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(p[k]).toFixed(1)).join(" ");

  const passoRotulo = Math.ceil(data.length / (w < 520 ? 5 : 9));
  const ult = data[data.length - 1];

  function onMove(ev: React.MouseEvent | React.TouchEvent) {
    const svg = (ev.currentTarget as SVGElement).getBoundingClientRect();
    const cx = "touches" in ev ? ev.touches[0].clientX : (ev as React.MouseEvent).clientX;
    const posX = (cx - svg.left) * (w / svg.width);
    let best = Infinity, idx = 0;
    data.forEach((_, k) => { const d = Math.abs(x(k) - posX); if (d < best) { best = d; idx = k; } });
    setHover(idx);
  }

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(null)}
      >
        {[0, teto / 2, teto].map((v, i) => (
          <g key={i}>
            <line x1={L} y1={y(v)} x2={w - R} y2={y(v)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">{eixo(v)}</text>
          </g>
        ))}
        {data.map((p, i) =>
          i % passoRotulo === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{diaCurto(p.dia)}</text>
          ) : null
        )}
        <path d={caminho("a")} fill="none" stroke="var(--s1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={caminho("b")} fill="none" stroke="var(--s2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.length <= 40 && data.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.a)} r={3.2} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />
            <circle cx={x(i)} cy={y(p.b)} r={3.2} fill="var(--s2)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
        <text x={x(data.length - 1)} y={Math.min(Math.max(y(ult.a) - 8, T + 10), T + alturaPlot)} textAnchor="end" fontSize={12} fontWeight={650} fill="var(--s1)">{rot(ult.a)}</text>
        <text x={x(data.length - 1)} y={Math.min(Math.max(y(ult.b) + 14, T + 10), T + alturaPlot)} textAnchor="end" fontSize={12} fontWeight={650} fill="var(--s2)">{rot(ult.b)}</text>
        {hover !== null && (
          <line x1={x(hover)} y1={T} x2={x(hover)} y2={T + alturaPlot} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.55} />
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg tnum">
          <div className="mb-1 font-semibold">{brData(data[hover].dia)}</div>
          <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--s1)" }} />{nomeA}<b className="ml-auto">{rot(data[hover].a)}</b></div>
          <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--s2)" }} />{nomeB}<b className="ml-auto">{rot(data[hover].b)}</b></div>
        </div>
      )}
    </div>
  );
}
