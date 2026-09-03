# BDHOTMART — Painel de performance Meta Ads × Hotmart

Painel web que cruza os dados do gerenciador da **Meta Ads** com as vendas reais
da **Hotmart** para um infoprodutor. Mede a diferença entre o que o gerenciador
diz que vendeu e o que de fato entrou na Hotmart, e mostra o funil por produto.

Stack: **Supabase** (Postgres + Edge Functions em Deno + pg_cron + pg_net + Vault)
para dados/ingestão, e um **app React + TypeScript + Tailwind** (`web/`) para o
painel, com login via Supabase Auth e consultas por PostgREST com o token do usuário.

## Estrutura do repositório

```
web/                 PAINEL — app React + TS + Tailwind (shadcn), usa FunnelChart
supabase/
  migrations/        13 migrations SQL (tabelas, triggers, câmbio, views, RLS, cron, funis)
  functions/
    hotmart-webhook/ recebe o webhook 2.0.0 da Hotmart (verify_jwt off)
    hotmart-backfill/ carga histórica / reconciliação via API da Hotmart
    meta-sync/       Insights API da Meta em 3 passadas (base + 2 quebras)
    fx-sync/         cotação USD/EUR → BRL
    painel/          (LEGADO) versão antiga em HTML puro; ver nota abaixo
scripts/
  mock_seed.sql      dados de exemplo (produtos) para testar o painel
  mock_funis.sql     dados de exemplo dos funis por campanha
  funis_config.sql   configuração real dos funis (edite à vontade)
  mock_cleanup.sql   remove os mocks e o usuário de teste
docs/screenshots/    painel renderizado (desktop/mobile, claro/escuro)
SETUP.md             guia completo de configuração
```

> **O painel é o app em `web/`** (React). A Edge Function `supabase/functions/painel`
> é a primeira versão (HTML puro) e ficou inviável porque o Supabase bloqueia servir
> HTML por Edge Function (força `text/plain` + CSP `sandbox`). Está mantida só para
> referência. Publique o `web/` num host estático — ver `web/README.md`.

## Estado atual

Backend **aplicado e verificado** no projeto Supabase `pallgafprdnswzigomyl`
(`sa-east-1`): tabelas + RLS, triggers, views, 4 funções de ingestão, cron, e o
linter de segurança do Supabase sem avisos.

Falta a configuração de credenciais e a publicação da página — ver **[SETUP.md](SETUP.md)**.

> ⚠️ **Hospedagem do painel:** o Supabase hoje bloqueia servir HTML por Edge
> Function (força `text/plain` + CSP `sandbox`). A página, que é 100% client-side
> e fala com o Supabase por CORS, precisa ser servida de um host estático
> (Vercel/Netlify/Pages) ou do Storage. Detalhes na seção 7 do SETUP.

Este repositório é um espelho versionado; a fonte de verdade em execução é o
projeto Supabase. Para aplicar do zero em outro projeto, use a Supabase CLI:
`supabase db push` (migrations) e `supabase functions deploy` (funções).
