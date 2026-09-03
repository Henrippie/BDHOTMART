export const num = (v: unknown): number => Number(v) || 0;

export function nBR(v: unknown, d = 0): string {
  return num(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export const rs = (v: unknown, d = 0): string => "R$ " + nBR(v, d);
export const pct = (v: number | null | undefined): string =>
  v === null || v === undefined || isNaN(v) ? "—" : nBR(v, 1) + "%";
export const roasFmt = (v: number | null): string => (v == null ? "—" : nBR(v, 2) + "x");

export function taxa(a: number, b: number): number | null {
  return b > 0 ? (a / b) * 100 : null;
}
export function custo(g: number, q: number): number | null {
  return q > 0 ? g / q : null;
}
export function soma<T extends Record<string, unknown>>(arr: T[], k: keyof T): number {
  return arr.reduce((s, o) => s + (Number(o[k]) || 0), 0);
}

export const brData = (iso: string): string => (iso || "").split("-").reverse().join("/");
export const diaCurto = (iso: string): string => {
  const p = (iso || "").split("-");
  return p.length === 3 ? p[2] + "/" + p[1] : iso;
};

export function hojeISO(): string {
  return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
}
export function menosDias(n: number): string {
  const d = new Date(Date.now() - 3 * 3600e3);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
