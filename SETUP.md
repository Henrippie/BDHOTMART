# Painel Meta Ads × Hotmart — Guia de configuração

Painel que cruza o que o **gerenciador da Meta** diz que vendeu com o que **de
fato entrou na Hotmart**, mostra o funil por produto e mede o *gap* entre os dois
lados.

- **Projeto Supabase:** `painel-vendas-meta-hotmart` (`pallgafprdnswzigomyl`), região `sa-east-1` (São Paulo).
- **Banco:** Postgres 17 + `pg_cron` + `pg_net` + Vault.
- **Ingestão:** 4 Edge Functions (Deno).
- **Painel:** uma única página HTML (SVG à mão, sem framework, sem CDN), com login via Supabase Auth.

> Fuso de referência: `America/Sao_Paulo`. Todos os horários de cron abaixo estão em **UTC** (Brasília = UTC−3).

---

## 0. O que já está pronto

Aplicado e verificado neste projeto:

- **Tabelas** (`public`): `hotmart_sales`, `meta_ads_insights`, `meta_insights_quebra`, `produto_regras`, `produtos`, `fx_rates`, `sync_log`, `app_config`. Todas com RLS ligado.
- **Triggers** em `hotmart_sales`: deriva os IDs da Meta a partir do rastreio, e ignora evento antigo (não deixa um "boleto impresso" atrasado sobrescrever um "aprovado").
- **Função de câmbio** `para_brl(valor, moeda, data)` (`security invoker`, `search_path` fixo).
- **Views** (todas `security_invoker = on`): `v_hotmart_norm`, `v_meta_norm`, `v_resumo_dia`, `v_resumo_produto`, `v_funil_produto`, `v_anuncios`, `v_quebra`, `v_cruzamento_anuncio`, `v_cruzamento_campanha`, `v_qualidade_rastreio`, `v_ultimas_vendas`, `v_ad_produto`, `v_produtos_ativos`.
- **Edge Functions:** `hotmart-webhook`, `hotmart-backfill`, `meta-sync`, `fx-sync`, `painel`.
- **Cron** (via `pg_cron` + `pg_net`, chave lida do **Vault**): `fx-sync` 08:45, `meta-sync?dias=7` 09:00, `hotmart-backfill?dias=7` 09:15 (UTC).
- **Linter de segurança do Supabase:** zero avisos.

O que **falta você fazer**: gravar os segredos (seção 2), gravar a `service_role key` no Vault (seção 5), configurar o webhook e o `src` na Hotmart (seção 3), rodar a carga inicial (seção 6) e **publicar a página do painel** (seção 7 — leia com atenção, tem uma pegadinha da plataforma).

---

## 1. Credenciais — onde pegar cada uma

### Hotmart
1. Entre em **Hotmart → Ferramentas → Webhook (Notificações)** e em **Ferramentas → Credenciais de API (Hotmart Developers)**.
2. Anote:
   - `HOTMART_HOTTOK` — o *hottok* do webhook (Ferramentas → Webhook).
   - `HOTMART_CLIENT_ID` e `HOTMART_CLIENT_SECRET` — em Credenciais de API.
   - `HOTMART_BASIC_TOKEN` — o **Basic** que aparece junto das credenciais (é o `client_id:client_secret` em base64; a Hotmart já entrega pronto).

### Meta (Marketing API)
1. Em **developers.facebook.com → seu App → Ferramentas → Graph API Explorer** (ou um System User no Business Manager, recomendado para token de longa duração).
2. Gere um token com as permissões `ads_read` (e `read_insights`).
3. Anote:
   - `META_ACCESS_TOKEN` — o token.
   - `META_AD_ACCOUNT_IDS` — o(s) id(s) da conta de anúncios, separados por vírgula. Pode ser com ou sem o prefixo `act_` (o código normaliza).
   - `META_API_VERSION` — opcional; padrão `v26.0`.

### Supabase
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem como variáveis padrão dentro das Edge Functions — **não precisa configurar**.
- A **anon key** (pública, usada pelo painel no navegador) você encontra em **Project Settings → API**.

---

## 2. Gravar os segredos das Edge Functions

Pelo dashboard: **Edge Functions → Manage secrets**, ou pela CLI:

```bash
supabase secrets set \
  HOTMART_HOTTOK="..." \
  HOTMART_CLIENT_ID="..." \
  HOTMART_CLIENT_SECRET="..." \
  HOTMART_BASIC_TOKEN="..." \
  META_ACCESS_TOKEN="..." \
  META_AD_ACCOUNT_IDS="act_1234567890" \
  META_API_VERSION="v26.0" \
  --project-ref pallgafprdnswzigomyl
```

Opcional: `FX_MOEDAS` (padrão `USD,EUR`).

---

## 3. Webhook e `src` na Hotmart

### 3.1 Webhook
- **URL:** `https://pallgafprdnswzigomyl.supabase.co/functions/v1/hotmart-webhook`
- **Versão:** 2.0.0
- **Eventos:** marque compra aprovada, completa, reembolso, chargeback, cancelamento, protesto, boleto impresso e expirado.
- A função valida o header `x-hotmart-hottok` contra `HOTMART_HOTTOK` e responde **401** se não bater; responde **500** em erro de gravação (assim a Hotmart reenvia o evento).

### 3.2 `src` nos anúncios — **a regra que faz tudo funcionar**
No link do checkout da Hotmart, use os parâmetros de rastreio da Meta. **Limites da Hotmart:**
`src` e `sck` aceitam **no máximo 30 caracteres** e **não aceitam underline `_`** (é reservado); o pipe `|` é permitido.

Padrão recomendado (o id puro do anúncio cabe em 30 caracteres):

```
src={{ad.id}}&sck={{campaign.id}}
```

A partir do `ad_id` o resto (conjunto, campanha, produto) se resolve sozinho pelas
views. O trigger `fn_derivar_ids_meta` varre `src`, `sck`, `utm_content`,
`utm_term` e `utm_campaign` (nessa ordem) procurando grupos de 8+ dígitos:
3 números = `campanha|conjunto|anuncio`, 2 = `campanha|anuncio`, 1 = `anuncio`.

> Se você já usa UTMs, pode mandar o id também em `utm_content={{ad.id}}` — o webhook lê os dois.

---

## 4. Atribuição anúncio → produto

A view `v_ad_produto` resolve em duas camadas:
1. **Regra explícita** em `produto_regras` (menor `prioridade` ganha).
2. **Aprendida pelas vendas** — o produto que mais vendeu por aquele `ad_id`.

Com o rastreio funcionando, a camada 2 monta a atribuição sozinha. A regra manual
só é necessária para **campanha nova** (ainda sem vendas) e para **topo de funil**
que nunca gera venda direta. Exemplo de regra manual:

```sql
insert into public.produto_regras (product_id, tipo, valor, prioridade, observacao)
values (123456, 'campaign_id', '120200000000123', 10, 'Campanha TOF do Método');
-- tipos aceitos: ad_id | adset_id | campaign_id | campaign_regex | ad_regex
```

---

## 5. Agendamento (cron) e o Vault

Os jobs já estão criados, mas **só disparam depois** que você gravar a
`service_role key` no Vault (a função `disparar_funcao` lê a chave de lá — nunca
do código):

```sql
select vault.create_secret('COLE_A_SERVICE_ROLE_KEY_AQUI', 'service_role_key');
```

Pegue a `service_role key` em **Project Settings → API → service_role** (é secreta;
não exponha no navegador).

Conferir os jobs:

```sql
select jobid, schedule, command, active from cron.job order by jobid;
```

A janela de **7 dias** existe de propósito: a Meta reatribui conversões por até
72h e reembolso/chargeback mudam o passado.

Disparar na mão (para testar), por exemplo o sync da Meta dos últimos 7 dias:

```sql
select public.disparar_funcao('meta-sync', 'dias=7');
```

---

## 6. Carga inicial (histórico)

Depois de gravar os segredos, rode uma carga maior de uma vez. Use o token do
usuário logado ou a `service_role` no header `Authorization: Bearer ...`:

```bash
BASE="https://pallgafprdnswzigomyl.supabase.co/functions/v1"
AUTH="Authorization: Bearer <SERVICE_ROLE_KEY>"

# câmbio de hoje
curl -X POST "$BASE/fx-sync" -H "$AUTH"

# Meta: últimos 30 dias (com quebras de demografia e posicionamento)
curl -X POST "$BASE/meta-sync?dias=30" -H "$AUTH"

# Hotmart: intervalo explícito
curl -X POST "$BASE/hotmart-backfill?since=2026-06-01&until=2026-09-02" -H "$AUTH"
```

Parâmetros úteis: `meta-sync?dias=N&quebras=0` (sem quebras, mais rápido);
`hotmart-backfill?dias=N` ou `?since=&until=`. Acompanhe em `sync_log`.

---

## 7. Publicar a página do painel  ⚠️ leia isto

A página está deployada como a Edge Function `painel`, **mas a plataforma do
Supabase hoje bloqueia servir HTML por Edge Function**: o gateway reescreve o
`Content-Type` para `text/plain` e injeta `Content-Security-Policy: default-src
'none'; sandbox` em qualquer resposta HTML, independentemente de autenticação.
Resultado: aberta direto em
`.../functions/v1/painel`, a página aparece como **código-fonte**, sem estilo e
sem JavaScript. Isso é uma proteção antiphishing do Supabase, não um bug do código.

O HTML/JS do painel está **correto e testado** (veja `docs/screenshots/`, renderizado
em navegador headless em desktop e em 390px, claro e escuro). Ele é 100%
client-side e conversa com o Supabase por CORS usando a anon key + o token do
usuário — então **funciona a partir de qualquer origem**. Só precisa ser servido
de um lugar que entregue `text/html` de verdade. Opções:

1. **Host estático** (Vercel, Netlify, Cloudflare Pages, GitHub Pages): publique
   um único `index.html` com o conteúdo do painel. É o caminho mais simples e
   gratuito. O conteúdo da página é o valor do template `HTML` em
   `supabase/functions/painel/pagina.ts` (basta salvar aquele HTML como
   `index.html`).
2. **Supabase Storage** (bucket público): pode servir o HTML, mas confirme antes
   que o objeto vem com `Content-Type: text/html` e sem `content-disposition:
   attachment` no seu projeto.

> A **anon key** já é pública por design (vai no navegador de qualquer jeito).
> Quem protege os dados é o RLS + o login; sem sessão válida, o PostgREST não
> devolve nada.

### Criar o usuário que faz login no painel
O painel usa **email/senha** (Supabase Auth). Crie o usuário em
**Authentication → Users → Add user** (marque *Auto Confirm*), ou via SQL/admin API.

---

## 8. Testar com dados de exemplo

Antes de plugar as fontes reais, dá para popular o banco com um mock e conferir o
painel:

```bash
# aplica o mock (janela 24/08 a 02/09, 2 produtos, vendas rastreadas, bumps,
# reembolsos e vendas sem rastreio)
psql "$DATABASE_URL" -f scripts/mock_seed.sql
# ...confira o painel...
psql "$DATABASE_URL" -f scripts/mock_cleanup.sql   # limpa tudo
```

(ou cole o conteúdo no **SQL Editor** do dashboard.) O `mock_seed.sql` também
cria/depende de um usuário de teste `teste@painel.local` só se você seguir o passo
de auth; o `mock_cleanup.sql` remove os dados e esse usuário.

---

## 9. Consultas do dia a dia

```sql
-- Resumo dos últimos 7 dias: investido, vendas dos dois lados, gap, ROAS
select data, investido_brl, vendas_meta, vendas_hotmart, vendas_rastreadas,
       gap_vendas, roas_meta, roas_real, roas_geral
from public.v_resumo_dia
where data >= (now() at time zone 'America/Sao_Paulo')::date - 7
order by data desc;

-- Onde está o gap por campanha, no mês
select campaign_name,
       sum(vendas_meta)     as meta,
       sum(vendas_hotmart)  as hotmart,
       sum(gap_vendas)      as gap,
       round(sum(receita_hotmart_brl)) as faturado_brl
from public.v_cruzamento_campanha
where data >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
group by campaign_name
order by gap desc;

-- Qualidade do rastreio (quanto das vendas chega com id de anúncio)
select round(100.0 * sum(com_ad_id) / nullif(sum(vendas),0), 1) as pct_rastreado
from public.v_qualidade_rastreio
where data >= (now() at time zone 'America/Sao_Paulo')::date - 30;

-- Funil consolidado por produto no período (componentes brutos; a taxa some sobre a soma)
select produto,
       sum(investido_brl) invest, sum(impressoes) impr, sum(cliques_link) cliques,
       sum(pageviews) visitas, sum(checkouts) checkouts,
       sum(vendas_rastreadas) compras, sum(receita_hotmart_brl) receita
from public.v_funil_produto
where data >= (now() at time zone 'America/Sao_Paulo')::date - 30
group by produto order by invest desc;

-- Anúncios que mais consumiram verba (últimos 7 dias)
select ad_name, campaign_name,
       sum(investido_brl) invest, sum(vendas_hotmart) vendas,
       case when sum(investido_brl)>0
            then round(sum(receita_hotmart_brl)/sum(investido_brl),2) end as roas_real
from public.v_anuncios
where data >= (now() at time zone 'America/Sao_Paulo')::date - 7
group by ad_name, campaign_name
order by invest desc limit 20;

-- Como andou cada job de sincronização
select job, inicio, fim, status, registros, detalhe
from public.sync_log order by inicio desc limit 20;
```

---

## 10. Por que os dois lados nunca batem (é esperado)

- A **Meta atribui a venda ao dia do clique**; a **Hotmart, ao dia da aprovação**. Boleto e Pix atrasado jogam a venda para outro dia.
- **Order bump** gera uma conversão no pixel e às vezes duas transações na Hotmart (marcadas com `is_order_bump`).
- **Reembolso e chargeback não desfazem** a conversão do lado da Meta — por isso o ROAS real cai depois.
- **Alcance não é aditivo:** somar o alcance diário conta a mesma pessoa mais de uma vez. Na interface aparece como "soma dos dias", nunca como público único.

Por isso o painel mostra os **dois números** e o gap, em vez de forçar os dois a
baterem. A taxa de conversão em compra usa a **Hotmart** de propósito: é o único
jeito de a conta fechar com o dinheiro que caiu.
