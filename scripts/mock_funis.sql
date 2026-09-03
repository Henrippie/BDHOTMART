-- ===============================================================
-- DADOS DE EXEMPLO (mock) dos FUNIS por campanha — só para conferir
-- a seção "Funis por campanha" do painel. Requer scripts/funis_config.sql
-- já rodado. Limpe com scripts/mock_cleanup.sql. Janela: 24/08–02/09.
-- ===============================================================
delete from public.hotmart_sales    where transaction like 'MOCK-%';
delete from public.meta_ads_insights where account_id = 'act_1000';
delete from public.fx_rates          where data between date '2026-08-24' and date '2026-09-02';

insert into public.fx_rates (data, moeda, taxa_brl)
select d::date, 'USD', 5.45 from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
on conflict do nothing;

-- Meta insights: 1 anúncio por funil, com nomes que casam as regras
insert into public.meta_ads_insights
  (date_start, ad_id, account_id, campaign_id, campaign_name, adset_id, adset_name, ad_name,
   spend, impressions, reach, clicks, link_clicks, landing_page_views,
   initiate_checkout, purchases, purchase_value, leads, conversas, currency)
select d::date, a.ad_id, 'act_1000', a.campaign_id, a.campaign_name, a.adset_id, 'Conjunto', a.ad_name,
  round((a.base_spend*(0.85+random()*0.3))::numeric,2),
  (a.base_imp*(0.85+random()*0.3))::bigint, (a.base_imp*0.6)::bigint,
  (a.base_imp*0.02)::bigint, (a.base_imp*0.016)::bigint, (a.base_imp*0.011)::bigint,
  (a.base_imp*0.004)::bigint, a.purchases, round((a.purchases*a.ticket)::numeric,2),
  a.leads, a.conversas, 'BRL'
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values
  (130210001, 130100001, 'Formação Avançada WPP - TOF',        130200001, 'Criativo Lead WPP', 350, 45000, 0,   0.0,  40, 22),
  (130210002, 130100002, 'TAP - Terapia Alimentar Prospecção', 130200002, 'Criativo VSL TAP',  300, 30000, 5, 497.0,  0,  0)
) a(ad_id, campaign_id, campaign_name, adset_id, ad_name, base_spend, base_imp, purchases, ticket, leads, conversas);

-- WPP: vendas de R$ 2.497 (fechadas pelo comercial; sem rastreio)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, payment_type, installments, is_order_bump,
   buyer_email, origem_dados, ultimo_evento, ultimo_evento_em)
select 'MOCK-WPP-'||to_char(d,'YYYYMMDD')||'-'||g, 501, 'Formação Avançada', 'FA1', 'APPROVED', d, d,
  2497.0, 'BRL', 2247.3, 'CREDIT_CARD', 12, false, 'lead'||g||'@ex.com', 'api', 'PURCHASE_APPROVED', d
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join generate_series(1, (1+floor(random()*2))::int) g;

-- TAP: curso vendido direto (rastreado ao anúncio)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, payment_type, installments, is_order_bump,
   buyer_email, src, origem_dados, ultimo_evento, ultimo_evento_em)
select 'MOCK-TAP-'||to_char(d,'YYYYMMDD')||'-'||g, 601, 'Curso Terapia Alimentar na Prática', 'TAP1', 'APPROVED', d, d,
  497.0, 'BRL', 447.3, 'CREDIT_CARD', 1, false, 'aluno'||g||'@ex.com', '130210002', 'api', 'PURCHASE_APPROVED', d
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join generate_series(1, (2+floor(random()*3))::int) g;

-- TAP: order bumps do checkout (transações próprias)
insert into public.hotmart_sales
  (transaction, product_id, product_name, offer_code, status, order_date, approved_date,
   price_value, currency, producer_value, payment_type, installments, is_order_bump,
   buyer_email, src, origem_dados, ultimo_evento, ultimo_evento_em)
select 'MOCK-BUMP-'||to_char(d,'YYYYMMDD')||'-'||b.pid||'-'||g, b.pid, b.pname, 'BUMP', 'APPROVED', d, d,
  b.preco, 'BRL', round((b.preco*0.9)::numeric,2), 'CREDIT_CARD', 1, true,
  'aluno'||g||'@ex.com', '130210002', 'api', 'PURCHASE_APPROVED', d
from generate_series(date '2026-08-24', date '2026-09-02', interval '1 day') d
cross join (values
  (611,'Guia de Atividades', 47.0),
  (612,'Masterclass de Suplementação', 97.0),
  (613,'Masterclass de Planejamento', 97.0)
) b(pid, pname, preco)
cross join generate_series(1, floor(random()*2)::int) g;
