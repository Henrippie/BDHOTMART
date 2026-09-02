-- ===============================================================
-- DADOS DE EXEMPLO (mock) — só para conferir o painel antes de
-- plugar Meta e Hotmart de verdade. Rode scripts/mock_cleanup.sql
-- para apagar tudo. NÃO rode em produção com dados reais.
-- Janela: 2026-08-24 a 2026-09-02.
-- ===============================================================

-- limpa qualquer execução anterior deste mock (idempotente)
delete from public.hotmart_sales       where transaction like 'MOCK-%';
delete from public.meta_insights_quebra where ad_id in (120210001,120210002,120210003);
delete from public.meta_ads_insights    where ad_id in (120210001,120210002,120210003);
delete from public.produto_regras       where observacao = 'mock';
delete from public.fx_rates             where data between date '2026-08-24' and date '2026-09-02';

-- catálogo
insert into public.produtos (product_id, nome, apelido, ativo) values
  (101, 'Método Alpha',  'Método',   true),
  (202, 'Mentoria Beta', 'Mentoria', true)
on conflict (product_id) do update
  set nome = excluded.nome, apelido = excluded.apelido, ativo = true;

-- câmbio (BRL passa direto; deixamos USD/EUR só para o para_brl ter cotação)
insert into public.fx_rates (data, moeda, taxa_brl)
select d::date, m.moeda, m.taxa
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values ('USD', 5.45), ('EUR', 5.95)) m(moeda, taxa)
on conflict (data, moeda) do update set taxa_brl = excluded.taxa_brl;

-- regra explícita anúncio -> produto (camada 1 da atribuição)
insert into public.produto_regras (product_id, tipo, valor, prioridade, observacao) values
  (101, 'campaign_id', '120100001', 10, 'mock'),
  (202, 'campaign_id', '120100002', 10, 'mock');

-- insights diários por anúncio
insert into public.meta_ads_insights
  (date_start, ad_id, account_id, campaign_id, campaign_name, adset_id, adset_name, ad_name,
   spend, impressions, reach, clicks, link_clicks, landing_page_views,
   initiate_checkout, purchases, purchase_value, leads, conversas, currency)
select
  d::date, a.ad_id, 'act_1000', a.campaign_id, a.campaign_name, a.adset_id, a.adset_name, a.ad_name,
  round((a.base_spend * (0.8 + random()*0.4))::numeric, 2)          as spend,
  (a.base_imp * (0.8 + random()*0.4))::bigint                        as impressions,
  (a.base_imp * 0.62)::bigint                                        as reach,
  (a.base_imp * 0.022)::bigint                                       as clicks,
  (a.base_imp * 0.016)::bigint                                       as link_clicks,
  (a.base_imp * 0.011)::bigint                                       as landing_page_views,
  (a.base_imp * 0.0032)::bigint                                      as initiate_checkout,
  (a.base_imp * 0.0013)::bigint                                      as purchases,
  round((a.base_imp * 0.0013 * a.ticket)::numeric, 2)               as purchase_value,
  a.leads, a.conversas, 'BRL'
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values
  (120210001, 120100001, 'Camp Método TOF', 120200001, 'Conjunto Aberto', 'Criativo VSL',        300, 42000, 197.0,  0, 0),
  (120210002, 120100001, 'Camp Método TOF', 120200001, 'Conjunto Aberto', 'Criativo Depoimento', 180, 24000, 197.0,  0, 0),
  (120210003, 120100002, 'Camp Mentoria',   120200002, 'Conjunto Lookalike', 'Criativo Webinar', 420, 30000, 1997.0, 14, 9)
) a(ad_id, campaign_id, campaign_name, adset_id, adset_name, ad_name, base_spend, base_imp, ticket, leads, conversas);

-- quebra por demografia (idade x gênero)
insert into public.meta_insights_quebra
  (date_start, ad_id, tipo, chave1, chave2, campaign_id,
   spend, impressions, reach, clicks, link_clicks, landing_page_views,
   initiate_checkout, purchases, purchase_value, leads, conversas, currency)
select d::date, a.ad_id, 'demografia', dg.idade, dg.genero, a.campaign_id,
  round((a.base_spend * dg.peso)::numeric, 2),
  (a.base_imp * dg.peso)::bigint, (a.base_imp * dg.peso * 0.6)::bigint,
  (a.base_imp * dg.peso * 0.02)::bigint, (a.base_imp * dg.peso * 0.015)::bigint,
  (a.base_imp * dg.peso * 0.01)::bigint, (a.base_imp * dg.peso * 0.003)::bigint,
  (a.base_imp * dg.peso * 0.0012)::bigint, round((a.base_imp * dg.peso * 0.0012 * a.ticket)::numeric, 2),
  0, 0, 'BRL'
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values
  (120210001, 120100001, 300, 42000, 197.0),
  (120210003, 120100002, 420, 30000, 1997.0)
) a(ad_id, campaign_id, base_spend, base_imp, ticket)
cross join (values
  ('25-34','female',0.34),('25-34','male',0.20),
  ('35-44','female',0.22),('35-44','male',0.14),
  ('45-54','female',0.06),('45-54','male',0.04)
) dg(idade, genero, peso);

-- quebra por posicionamento (plataforma x posição)
insert into public.meta_insights_quebra
  (date_start, ad_id, tipo, chave1, chave2, campaign_id,
   spend, impressions, reach, clicks, link_clicks, landing_page_views,
   initiate_checkout, purchases, purchase_value, leads, conversas, currency)
select d::date, a.ad_id, 'posicionamento', pp.plataforma, pp.posicao, a.campaign_id,
  round((a.base_spend * pp.peso)::numeric, 2),
  (a.base_imp * pp.peso)::bigint, (a.base_imp * pp.peso * 0.6)::bigint,
  (a.base_imp * pp.peso * 0.02)::bigint, (a.base_imp * pp.peso * 0.015)::bigint,
  (a.base_imp * pp.peso * 0.01)::bigint, (a.base_imp * pp.peso * 0.003)::bigint,
  (a.base_imp * pp.peso * 0.0012)::bigint, round((a.base_imp * pp.peso * 0.0012 * a.ticket)::numeric, 2),
  0, 0, 'BRL'
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values
  (120210001, 120100001, 300, 42000, 197.0),
  (120210003, 120100002, 420, 30000, 1997.0)
) a(ad_id, campaign_id, base_spend, base_imp, ticket)
cross join (values
  ('facebook','feed',0.30),('facebook','video_feeds',0.10),
  ('instagram','story',0.24),('instagram','feed',0.20),
  ('instagram','reels',0.12),('audience_network','classic',0.04)
) pp(plataforma, posicao, peso);

-- vendas Hotmart RASTREADAS (src = id do anúncio; o trigger deriva meta_ad_id)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, commission_currency, payment_type, installments,
   is_order_bump, buyer_email, buyer_name, buyer_country, src, origem_dados,
   ultimo_evento, ultimo_evento_em)
select
  'MOCK-'||to_char(d,'YYYYMMDD')||'-'||a.ad_id||'-'||g,
  a.product_id, a.pname, 'OFF1', 'APPROVED',
  d + (g||' hours')::interval, d + (g||' hours')::interval,
  a.ticket, 'BRL', round((a.ticket*0.9)::numeric,2), 'BRL',
  (array['CREDIT_CARD','PIX','BILLET'])[1 + floor(random()*3)::int], 1,
  false, 'comprador'||g||'@exemplo.com', 'Comprador '||g, 'BR',
  a.ad_id::text, 'api', 'PURCHASE_APPROVED', d + (g||' hours')::interval
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values
  (120210001, 101, 'Método Alpha',  197.0),
  (120210003, 202, 'Mentoria Beta', 1997.0)
) a(ad_id, product_id, pname, ticket)
cross join generate_series(1, (2 + floor(random()*4))::int) g;

-- order bumps rastreados (produto Método)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, commission_currency, payment_type, installments,
   is_order_bump, buyer_email, src, origem_dados, ultimo_evento, ultimo_evento_em)
select
  'MOCK-BUMP-'||to_char(d,'YYYYMMDD')||'-'||g,
  101, 'Método Alpha', 'BUMP1', 'APPROVED', d, d,
  47.0, 'BRL', 42.3, 'BRL', 'CREDIT_CARD', 1,
  true, 'bump'||g||'@exemplo.com', '120210001', 'api', 'PURCHASE_APPROVED', d
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join generate_series(1, floor(random()*2)::int) g;

-- vendas SEM rastreio (para o gap e a qualidade de rastreio ficarem realistas)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, commission_currency, payment_type, installments,
   is_order_bump, buyer_email, origem_dados, ultimo_evento, ultimo_evento_em)
select
  'MOCK-NORASTREIO-'||to_char(d,'YYYYMMDD')||'-'||g,
  101, 'Método Alpha', 'OFF1', 'APPROVED', d, d,
  197.0, 'BRL', 177.3, 'BRL', 'PIX', 1,
  false, 'organico'||g||'@exemplo.com', 'api', 'PURCHASE_APPROVED', d
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join generate_series(1, floor(random()*3)::int) g;

-- reembolsos rastreados (ROAS real cai depois — igual à vida real)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, commission_currency, payment_type, installments,
   is_order_bump, buyer_email, src, origem_dados, ultimo_evento, ultimo_evento_em)
select
  'MOCK-REF-'||to_char(d,'YYYYMMDD')||'-'||g,
  202, 'Mentoria Beta', 'OFF1', 'REFUNDED', d - interval '3 days', d - interval '3 days',
  1997.0, 'BRL', 1797.3, 'BRL', 'CREDIT_CARD', 12,
  false, 'reembolso'||g||'@exemplo.com', '120210003', 'api', 'PURCHASE_REFUNDED', d
from generate_series(date '2026-08-27', date '2026-09-02', interval '1 day') d
cross join generate_series(1, floor(random()*2)::int) g;

select
  (select count(*) from public.hotmart_sales where transaction like 'MOCK-%') as vendas_mock,
  (select count(*) from public.meta_ads_insights where ad_id in (120210001,120210002,120210003)) as insights_mock,
  (select count(*) from public.meta_insights_quebra where ad_id in (120210001,120210002,120210003)) as quebras_mock;
