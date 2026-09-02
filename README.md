# BDHOTMART — Painel de performance Meta Ads × Hotmart

Painel web que cruza os dados do gerenciador da **Meta Ads** com as vendas reais
da **Hotmart** para um infoprodutor. Mede a diferença entre o que o gerenciador
diz que vendeu e o que de fato entrou na Hotmart, e mostra o funil por produto.

Stack: **Supabase** (Postgres + Edge Functions em Deno + pg_cron + pg_net + Vault).
O painel é uma única página HTML (SVG à mão, sem framework, sem CDN), com login via
Supabase Auth e consultas por PostgREST com o token do usuário.

## Estrutura do repositório

```
supabase/
  migrations/        12 migrations SQL (tabelas, triggers, câmbio, views, RLS, cron)
  functions/
    hotmart-webhook/ recebe o webhook 2.0.0 da Hotmart (verify_jwt off)
    hotmart-backfill/ carga histórica / reconciliação via API da Hotmart
    meta-sync/       Insights API da Meta em 3 passadas (base + 2 quebras)
    fx-sync/         cotação USD/EUR → BRL
    painel/          serve a página (index.ts) + o HTML (pagina.ts)
scripts/
  mock_seed.sql      dados de exemplo para testar o painel
  mock_cleanup.sql   remove o mock e o usuário de teste
docs/screenshots/    painel renderizado (desktop/mobile, claro/escuro)
SETUP.md             guia completo de configuração
```

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
