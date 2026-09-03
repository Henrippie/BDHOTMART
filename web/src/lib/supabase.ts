import { createClient } from "@supabase/supabase-js";

// A anon key é pública por design (vai para o navegador). Quem protege os
// dados é o RLS + o login. Pode sobrescrever por variável de ambiente do Vite.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://pallgafprdnswzigomyl.supabase.co";
const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGxnYWZwcmRuc3d6aWdvbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTAyNDEsImV4cCI6MjEwMzM2NjI0MX0.5sqhhxeR0M-ZocXV-UYKctxxSZoFAVDyT-vQZEeg-BM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "painel_sessao" },
});

export type Row = Record<string, any>;

/** Consulta uma view no intervalo [de, ate] pela coluna data. */
export async function periodo(view: string, de: string, ate: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from(view)
    .select("*")
    .gte("data", de)
    .lte("data", ate);
  if (error) throw new Error(`${view}: ${error.message}`);
  return data ?? [];
}

export async function tudo(view: string, order?: string): Promise<Row[]> {
  let q = supabase.from(view).select("*");
  if (order) q = q.order(order, { ascending: false });
  const { data, error } = await q;
  if (error) throw new Error(`${view}: ${error.message}`);
  return data ?? [];
}
