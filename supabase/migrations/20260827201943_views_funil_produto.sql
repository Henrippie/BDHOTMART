-- ---------------------------------------------------------------
-- Funil por produto e por dia.
-- Devolve os COMPONENTES brutos; as taxas o painel calcula sobre a
-- soma do período (média de taxa diária mente).
-- ---------------------------------------------------------------
create or replace view public.v_funil_produto as
with m as (
  select
    i.date_start                                                    as data,
    v.product_id,
    sum(public.para_brl(i.spend, i.currency, i.date_start))         as investido_brl,
    sum(i.impressions)                                              as impressoes,
    sum(i.reach)                                                    as alcance_dia,
    sum(i.clicks)                                                   as cliques,
    sum(i.link_clicks)                                              as cliques_link,
    sum(i.landing_page_views)                                       as pageviews,
    sum(i.initiate_checkout)                                        as checkouts,
    sum(i.purchases)                                                as vendas_meta,
    sum(public.para_brl(i.purchase_value, i.currency, i.date_start)) as receita_meta_brl,
    sum(i.leads)                                                    as leads,
    sum(i.conversas)                                                as conversas
  from public.meta_ads_insights i
  join public.v_ad_produto v on v.ad_id = i.ad_id
  group by i.date_start, v.product_id
),
h as (
  select
    data, product_id,
    count(*)         filter (where e_venda)                as vendas_hotmart,
    count(*)         filter (where e_venda and tem_rastreio) as vendas_rastreadas,
    count(*)         filter (where e_venda and is_order_bump) as vendas_bump,
    sum(valor_brl)   filter (where e_venda)                as receita_hotmart_brl,
    sum(liquido_brl) filter (where e_venda)                as liquido_brl,
    count(*)         filter (where e_reembolso)            as reembolsos
  from public.v_hotmart_norm
  group by data, product_id
)
select
  coalesce(m.data, h.data)             as data,
  coalesce(m.product_id, h.product_id) as product_id,
  coalesce(pr.apelido, pr.nome, coalesce(m.product_id, h.product_id)::text) as produto,
  coalesce(m.investido_brl, 0)     as investido_brl,
  coalesce(m.impressoes, 0)        as impressoes,
  coalesce(m.alcance_dia, 0)       as alcance_dia,
  coalesce(m.cliques, 0)           as cliques,
  coalesce(m.cliques_link, 0)      as cliques_link,
  coalesce(m.pageviews, 0)         as pageviews,
  coalesce(m.checkouts, 0)         as checkouts,
  coalesce(m.vendas_meta, 0)       as vendas_meta,
  coalesce(m.receita_meta_brl, 0)  as receita_meta_brl,
  coalesce(m.leads, 0)             as leads,
  coalesce(m.conversas, 0)         as conversas,
  coalesce(h.vendas_hotmart, 0)    as vendas_hotmart,
  coalesce(h.vendas_rastreadas, 0) as vendas_rastreadas,
  coalesce(h.vendas_bump, 0)       as vendas_bump,
  coalesce(h.receita_hotmart_brl, 0) as receita_hotmart_brl,
  coalesce(h.liquido_brl, 0)       as liquido_brl,
  coalesce(h.reembolsos, 0)        as reembolsos
from m
full outer join h on m.data = h.data and m.product_id = h.product_id
left join public.produtos pr on pr.product_id = coalesce(m.product_id, h.product_id);

alter view public.v_funil_produto set (security_invoker = on);
grant select on public.v_funil_produto to authenticated;

-- ---------------------------------------------------------------
-- Anúncios: o mesmo funil, no nível do criativo
-- ---------------------------------------------------------------
create or replace view public.v_anuncios as
with m as (
  select
    i.date_start as data, i.ad_id,
    max(i.ad_name) as ad_name, max(i.adset_name) as adset_name,
    max(i.campaign_id) as campaign_id, max(i.campaign_name) as campaign_name,
    sum(public.para_brl(i.spend, i.currency, i.date_start)) as investido_brl,
    sum(i.impressions) as impressoes,
    sum(i.reach)       as alcance_dia,
    sum(i.clicks)      as cliques,
    sum(i.link_clicks) as cliques_link,
    sum(i.landing_page_views) as pageviews,
    sum(i.initiate_checkout)  as checkouts,
    sum(i.purchases)          as vendas_meta,
    sum(public.para_brl(i.purchase_value, i.currency, i.date_start)) as receita_meta_brl,
    sum(i.leads)     as leads,
    sum(i.conversas) as conversas
  from public.meta_ads_insights i
  group by i.date_start, i.ad_id
),
h as (
  select data, meta_ad_id as ad_id,
         count(*)       filter (where e_venda)     as vendas_hotmart,
         sum(valor_brl) filter (where e_venda)     as receita_hotmart_brl,
         count(*)       filter (where e_reembolso) as reembolsos
  from public.v_hotmart_norm
  where meta_ad_id is not null
  group by data, meta_ad_id
)
select
  coalesce(m.data, h.data) as data,
  coalesce(m.ad_id, h.ad_id) as ad_id,
  m.ad_name, m.adset_name, m.campaign_id, m.campaign_name,
  v.product_id, v.origem_atribuicao,
  coalesce(m.investido_brl, 0)  as investido_brl,
  coalesce(m.impressoes, 0)     as impressoes,
  coalesce(m.alcance_dia, 0)    as alcance_dia,
  coalesce(m.cliques, 0)        as cliques,
  coalesce(m.cliques_link, 0)   as cliques_link,
  coalesce(m.pageviews, 0)      as pageviews,
  coalesce(m.checkouts, 0)      as checkouts,
  coalesce(m.vendas_meta, 0)    as vendas_meta,
  coalesce(m.receita_meta_brl, 0) as receita_meta_brl,
  coalesce(m.leads, 0)          as leads,
  coalesce(m.conversas, 0)      as conversas,
  coalesce(h.vendas_hotmart, 0) as vendas_hotmart,
  coalesce(h.receita_hotmart_brl, 0) as receita_hotmart_brl,
  coalesce(h.reembolsos, 0)     as reembolsos
from m
full outer join h on m.data = h.data and m.ad_id = h.ad_id
left join public.v_ad_produto v on v.ad_id = coalesce(m.ad_id, h.ad_id);

alter view public.v_anuncios set (security_invoker = on);
grant select on public.v_anuncios to authenticated;

-- ---------------------------------------------------------------
-- Quebras já com o produto anexado
-- ---------------------------------------------------------------
create or replace view public.v_quebra as
select
  q.date_start as data,
  q.tipo, q.chave1, q.chave2,
  v.product_id,
  sum(public.para_brl(q.spend, q.currency, q.date_start)) as investido_brl,
  sum(q.impressions) as impressoes,
  sum(q.reach)       as alcance_dia,
  sum(q.clicks)      as cliques,
  sum(q.link_clicks) as cliques_link,
  sum(q.landing_page_views) as pageviews,
  sum(q.initiate_checkout)  as checkouts,
  sum(q.purchases)   as vendas_meta,
  sum(q.leads)       as leads,
  sum(q.conversas)   as conversas
from public.meta_insights_quebra q
left join public.v_ad_produto v on v.ad_id = q.ad_id
group by q.date_start, q.tipo, q.chave1, q.chave2, v.product_id;

alter view public.v_quebra set (security_invoker = on);
grant select on public.v_quebra to authenticated;
