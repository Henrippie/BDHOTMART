// Serve o painel. A página é pública; os dados ficam atrás do login
// do Supabase Auth + RLS.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { HTML } from "./pagina.ts";

Deno.serve(() =>
  new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  })
);
