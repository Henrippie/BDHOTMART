-- ---------------------------------------------------------------
-- Resumo do DIA: o número do gerenciador contra o extrato da Hotmart
-- ---------------------------------------------------------------
create or replace view public.v_resumo_dia as
with m as (
  select data,
         sum(investido_brl)    as investido_brl,
         sum(impressions)      as impressoes,
         sum(clicks)           as cliques,
         sum(landing_page_views) as pageviews,
         sum(initiate_checkout)  as checkouts,
         sum(vendas_meta)      as vendas_meta,
         sum(receita_meta_brl) as receita_meta_brl
  from public.v_meta_norm group by data
),
h as (
  select data,
         count(*) filter (where e_venda)                              as vendas_hotmart,
         count(*) filter (where e_venda and tem_rastreio)             as vendas_rastreadas,
         count(*) filter (where e_venda and not tem_rastreio)         as vendas_sem_rastreio,
         count(*) filter (where e_venda and is_order_bump)            as vendas_order_bump,
         sum(valor_brl)   filter (where e_venda)                      as receita_hotmart_brl,
         sum(valor_brl)   filter (where e_venda and tem_rastreio)     as receita_rastreada_brl,
         sum(liquido_brl) filter (where e_venda)                      as liquido_hotmart_brl,
         count(*) filter (where e_reembolso)                          as reembolsos,
         sum(valor_brl)   filter (where e_reembolso)                  as valor_reembolsado_brl
  from public.v_hotmart_norm group by data
)
select
  coalesce(m.data, h.data)                       as data,
  coalesce(m.investido_brl, 0)                   as investido_brl,
  coalesce(m.impressoes, 0)                      as impressoes,
  coalesce(m.cliques, 0)                         as cliques,
  coalesce(m.pageviews, 0)                       as pageviews,
  coalesce(m.checkouts, 0)                       as checkouts,
  coalesce(m.vendas_meta, 0)                     as vendas_meta,
  coalesce(m.receita_meta_brl, 0)                as receita_meta_brl,
  coalesce(h.vendas_hotmart, 0)                  as vendas_hotmart,
  coalesce(h.vendas_rastreadas, 0)               as vendas_rastreadas,
  coalesce(h.vendas_sem_rastreio, 0)             as vendas_sem_rastreio,
  coalesce(h.vendas_order_bump, 0)               as vendas_order_bump,
  coalesce(h.receita_hotmart_brl, 0)             as receita_hotmart_brl,
  coalesce(h.receita_rastreada_brl, 0)           as receita_rastreada_brl,
  coalesce(h.liquido_hotmart_brl, 0)             as liquido_hotmart_brl,
  coalesce(h.reembolsos, 0)                      as reembolsos,
  coalesce(h.valor_reembolsado_brl, 0)           as valor_reembolsado_brl,
  -- o gap: o que a Meta diz que vendeu menos o que a Hotmart confirma com rastreio
  coalesce(m.vendas_meta, 0) - coalesce(h.vendas_rastreadas, 0) as gap_vendas,
  case when coalesce(m.vendas_meta, 0) > 0
       then round(((coalesce(m.vendas_meta,0) - coalesce(h.vendas_rastreadas,0))::numeric
                   / m.vendas_meta) * 100, 1) end as gap_pct,
  coalesce(m.receita_meta_brl, 0) - coalesce(h.receita_rastreada_brl, 0) as gap_receita_brl,
  case when coalesce(m.investido_brl,0) > 0
       then round(coalesce(m.receita_meta_brl,0)     / m.investido_brl, 2) end as roas_meta,
  case when coalesce(m.investido_brl,0) > 0
       then round(coalesce(h.receita_rastreada_brl,0)/ m.investido_brl, 2) end as roas_real,
  case when coalesce(m.investido_brl,0) > 0
       then round(coalesce(h.receita_hotmart_brl,0)  / m.investido_brl, 2) end as roas_geral,
  case when coalesce(h.vendas_rastreadas,0) > 0
       then round(coalesce(m.investido_brl,0) / h.vendas_rastreadas, 2) end    as cac_real,
  case when coalesce(h.vendas_hotmart,0) > 0
       then round(coalesce(h.receita_hotmart_brl,0) / h.vendas_hotmart, 2) end as ticket_medio_brl
from m full outer join h on m.data = h.data;

-- ---------------------------------------------------------------
-- Desempenho por PRODUTO
-- ---------------------------------------------------------------
create or replace view public.v_resumo_produto as
select
  v.data,
  v.product_id,
  coalesce(p.apelido, p.nome, v.product_name, v.product_id::text) as produto,
  count(*) filter (where v.e_venda)                          as vendas,
  count(*) filter (where v.e_venda and v.tem_rastreio)       as vendas_rastreadas,
  count(*) filter (where v.e_venda and v.is_order_bump)      as vendas_order_bump,
  sum(v.valor_brl)   filter (where v.e_venda)                as receita_brl,
  sum(v.liquido_brl) filter (where v.e_venda)                as liquido_brl,
  count(*) filter (where v.e_reembolso)                      as reembolsos,
  (select coalesce(sum(c.investido_brl), 0)
     from public.v_cruzamento_campanha c
    where c.data = v.data)                                   as investido_dia_brl
from public.v_hotmart_norm v
left join public.produtos p on p.product_id = v.product_id
group by v.data, v.product_id, coalesce(p.apelido, p.nome, v.product_name, v.product_id::text);

-- ---------------------------------------------------------------
-- Qualidade do rastreio: quanto do faturamento consegue ser atribuído
-- ---------------------------------------------------------------
create or replace view public.v_qualidade_rastreio as
select
  data,
  count(*) filter (where e_venda)                                            as vendas,
  count(*) filter (where e_venda and src   is not null and src   <> '')      as com_src,
  count(*) filter (where e_venda and sck   is not null and sck   <> '')      as com_sck,
  count(*) filter (where e_venda and utm_campaign is not null
                                 and utm_campaign <> '')                     as com_utm,
  count(*) filter (where e_venda and meta_ad_id is not null)                 as com_ad_id,
  count(*) filter (where e_venda and meta_campaign_id is not null)           as com_campaign_id,
  case when count(*) filter (where e_venda) > 0
       then round((count(*) filter (where e_venda and tem_rastreio))::numeric
                  / count(*) filter (where e_venda) * 100, 1) end            as pct_rastreado
from public.v_hotmart_norm
group by data;

-- ---------------------------------------------------------------
-- Últimas vendas (e-mail mascarado — o painel não precisa do dado cru)
-- ---------------------------------------------------------------
create or replace view public.v_ultimas_vendas as
select
  s.transaction,
  s.approved_date,
  s.order_date,
  s.status,
  coalesce(p.apelido, p.nome, s.product_name) as produto,
  s.price_value,
  s.currency,
  s.is_order_bump,
  s.payment_type,
  s.src, s.sck, s.utm_campaign, s.utm_content,
  s.meta_ad_id, s.meta_campaign_id,
  case when s.buyer_email is null then null
       else left(s.buyer_email, 2) || '***' || substring(s.buyer_email from position('@' in s.buyer_email))
  end as comprador
from public.hotmart_sales s
left join public.produtos p on p.product_id = s.product_id
order by coalesce(s.approved_date, s.order_date) desc
limit 300;
