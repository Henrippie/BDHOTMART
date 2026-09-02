-- ---------------------------------------------------------------
-- Bases normalizadas
-- ---------------------------------------------------------------

-- Vendas Hotmart normalizadas por dia (data de aprovação, fuso SP)
create or replace view public.v_hotmart_norm as
select
  (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date as data,
  s.transaction,
  s.product_id,
  s.product_name,
  s.offer_code,
  s.status,
  s.is_order_bump,
  s.currency,
  s.price_value,
  public.para_brl(s.price_value, s.currency,
    (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date) as valor_brl,
  public.para_brl(s.producer_value, coalesce(s.commission_currency, s.currency),
    (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date) as liquido_brl,
  s.meta_ad_id,
  s.meta_adset_id,
  s.meta_campaign_id,
  s.src,
  s.sck,
  s.utm_campaign,
  s.utm_content,
  (s.status in ('APPROVED', 'COMPLETE'))                              as e_venda,
  (s.status in ('REFUNDED', 'CHARGEBACK', 'CANCELED', 'DISPUTE'))     as e_reembolso,
  (s.meta_ad_id is not null or s.meta_campaign_id is not null)        as tem_rastreio
from public.hotmart_sales s;

-- Métricas Meta normalizadas (gasto convertido para BRL)
create or replace view public.v_meta_norm as
select
  i.date_start as data,
  i.ad_id, i.ad_name,
  i.adset_id, i.adset_name,
  i.campaign_id, i.campaign_name,
  i.currency,
  i.spend,
  public.para_brl(i.spend, i.currency, i.date_start)          as investido_brl,
  i.impressions, i.clicks, i.link_clicks, i.landing_page_views,
  i.initiate_checkout,
  i.purchases                                                  as vendas_meta,
  i.purchase_value,
  public.para_brl(i.purchase_value, i.currency, i.date_start)  as receita_meta_brl
from public.meta_ads_insights i;

-- ---------------------------------------------------------------
-- Cruzamento por ANÚNCIO
-- ---------------------------------------------------------------
create or replace view public.v_cruzamento_anuncio as
with m as (
  select data, ad_id,
         max(ad_name) as ad_name, max(adset_id) as adset_id, max(adset_name) as adset_name,
         max(campaign_id) as campaign_id, max(campaign_name) as campaign_name,
         sum(investido_brl) as investido_brl,
         sum(impressions) as impressoes, sum(clicks) as cliques,
         sum(landing_page_views) as pageviews,
         sum(initiate_checkout) as checkouts,
         sum(vendas_meta) as vendas_meta,
         sum(receita_meta_brl) as receita_meta_brl
  from public.v_meta_norm group by data, ad_id
),
h as (
  select data, meta_ad_id as ad_id,
         count(*) filter (where e_venda)                     as vendas_hotmart,
         sum(valor_brl) filter (where e_venda)               as receita_hotmart_brl,
         sum(liquido_brl) filter (where e_venda)             as liquido_hotmart_brl,
         count(*) filter (where e_reembolso)                 as reembolsos
  from public.v_hotmart_norm
  where meta_ad_id is not null
  group by data, meta_ad_id
)
select
  coalesce(m.data, h.data)                                   as data,
  coalesce(m.ad_id, h.ad_id)                                 as ad_id,
  m.ad_name, m.adset_id, m.adset_name, m.campaign_id, m.campaign_name,
  coalesce(m.investido_brl, 0)                               as investido_brl,
  coalesce(m.impressoes, 0)                                  as impressoes,
  coalesce(m.cliques, 0)                                     as cliques,
  coalesce(m.pageviews, 0)                                   as pageviews,
  coalesce(m.checkouts, 0)                                   as checkouts,
  coalesce(m.vendas_meta, 0)                                 as vendas_meta,
  coalesce(m.receita_meta_brl, 0)                            as receita_meta_brl,
  coalesce(h.vendas_hotmart, 0)                              as vendas_hotmart,
  coalesce(h.receita_hotmart_brl, 0)                         as receita_hotmart_brl,
  coalesce(h.liquido_hotmart_brl, 0)                         as liquido_hotmart_brl,
  coalesce(h.reembolsos, 0)                                  as reembolsos,
  coalesce(m.vendas_meta, 0) - coalesce(h.vendas_hotmart, 0) as gap_vendas,
  case when coalesce(m.vendas_meta, 0) > 0
       then round(((coalesce(m.vendas_meta,0) - coalesce(h.vendas_hotmart,0))::numeric
                   / m.vendas_meta) * 100, 1) end            as gap_pct,
  case when coalesce(m.investido_brl, 0) > 0
       then round(coalesce(m.receita_meta_brl,0) / m.investido_brl, 2) end     as roas_meta,
  case when coalesce(m.investido_brl, 0) > 0
       then round(coalesce(h.receita_hotmart_brl,0) / m.investido_brl, 2) end  as roas_real,
  case when coalesce(h.vendas_hotmart, 0) > 0
       then round(coalesce(m.investido_brl,0) / h.vendas_hotmart, 2) end       as cac_real
from m full outer join h on m.data = h.data and m.ad_id = h.ad_id;

-- ---------------------------------------------------------------
-- Cruzamento por CAMPANHA
-- ---------------------------------------------------------------
create or replace view public.v_cruzamento_campanha as
with m as (
  select data, campaign_id, max(campaign_name) as campaign_name,
         sum(investido_brl) as investido_brl,
         sum(impressions) as impressoes, sum(clicks) as cliques,
         sum(landing_page_views) as pageviews,
         sum(vendas_meta) as vendas_meta,
         sum(receita_meta_brl) as receita_meta_brl
  from public.v_meta_norm group by data, campaign_id
),
h as (
  select data, meta_campaign_id as campaign_id,
         count(*) filter (where e_venda)       as vendas_hotmart,
         sum(valor_brl) filter (where e_venda) as receita_hotmart_brl,
         count(*) filter (where e_reembolso)   as reembolsos
  from public.v_hotmart_norm
  where meta_campaign_id is not null
  group by data, meta_campaign_id
),
-- vendas rastreadas só até o anúncio: sobem para a campanha via insights
h_via_ad as (
  select v.data, mn.campaign_id,
         count(*) filter (where v.e_venda)       as vendas_hotmart,
         sum(v.valor_brl) filter (where v.e_venda) as receita_hotmart_brl,
         count(*) filter (where v.e_reembolso)   as reembolsos
  from public.v_hotmart_norm v
  join (select distinct ad_id, campaign_id from public.meta_ads_insights) mn
    on mn.ad_id = v.meta_ad_id
  where v.meta_campaign_id is null and v.meta_ad_id is not null
  group by v.data, mn.campaign_id
),
h_total as (
  select coalesce(a.data, b.data) as data,
         coalesce(a.campaign_id, b.campaign_id) as campaign_id,
         coalesce(a.vendas_hotmart,0) + coalesce(b.vendas_hotmart,0)             as vendas_hotmart,
         coalesce(a.receita_hotmart_brl,0) + coalesce(b.receita_hotmart_brl,0)   as receita_hotmart_brl,
         coalesce(a.reembolsos,0) + coalesce(b.reembolsos,0)                     as reembolsos
  from h a full outer join h_via_ad b on a.data = b.data and a.campaign_id = b.campaign_id
)
select
  coalesce(m.data, h_total.data)               as data,
  coalesce(m.campaign_id, h_total.campaign_id) as campaign_id,
  m.campaign_name,
  coalesce(m.investido_brl, 0)                 as investido_brl,
  coalesce(m.impressoes, 0)                    as impressoes,
  coalesce(m.cliques, 0)                       as cliques,
  coalesce(m.pageviews, 0)                     as pageviews,
  coalesce(m.vendas_meta, 0)                   as vendas_meta,
  coalesce(m.receita_meta_brl, 0)              as receita_meta_brl,
  coalesce(h_total.vendas_hotmart, 0)          as vendas_hotmart,
  coalesce(h_total.receita_hotmart_brl, 0)     as receita_hotmart_brl,
  coalesce(h_total.reembolsos, 0)              as reembolsos,
  coalesce(m.vendas_meta, 0) - coalesce(h_total.vendas_hotmart, 0) as gap_vendas,
  case when coalesce(m.vendas_meta, 0) > 0
       then round(((coalesce(m.vendas_meta,0) - coalesce(h_total.vendas_hotmart,0))::numeric
                   / m.vendas_meta) * 100, 1) end as gap_pct,
  case when coalesce(m.investido_brl, 0) > 0
       then round(coalesce(m.receita_meta_brl,0) / m.investido_brl, 2) end          as roas_meta,
  case when coalesce(m.investido_brl, 0) > 0
       then round(coalesce(h_total.receita_hotmart_brl,0) / m.investido_brl, 2) end as roas_real,
  case when coalesce(h_total.vendas_hotmart, 0) > 0
       then round(coalesce(m.investido_brl,0) / h_total.vendas_hotmart, 2) end      as cac_real
from m full outer join h_total on m.data = h_total.data and m.campaign_id = h_total.campaign_id;
