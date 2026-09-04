-- ===============================================================
-- Corrige dois problemas nos funis por campanha:
--
-- 1) A Hotmart nunca manda "is_order_bump" na API de sales/history
--    (o campo sempre chegava vazio), então nenhum bump era contado
--    como bump. Agora quem decide se a venda é bump é a própria
--    regra do funil (bump_regex / bump_produto_id) — não depende
--    mais de s.is_order_bump.
--
-- 2) "Formação Avançada em Seletividade e Terapia Alimentar" tem
--    "terapia alimentar" no nome, então a regra frouxa
--    produto_regex='terapia alimentar' do funil "Terapia Alimentar
--    na Prática" também casava com ela. Trocado por product_id
--    exato dos dois lados.
-- ===============================================================

create or replace view public.v_venda_funil as
with match as (
  select s.transaction, r.funil_id,
         (r.tipo in ('bump_regex', 'bump_produto_id')) as is_bump,
         row_number() over (partition by s.transaction order by f.ordem, r.funil_id) rn
  from public.hotmart_sales s
  join public.funil_regras_venda r on
       (r.tipo = 'valor'           and s.price_value = (r.valor)::numeric)
    or (r.tipo = 'product_id'      and s.product_id  = (r.valor)::bigint)
    or (r.tipo = 'produto_regex'   and coalesce(s.product_name,'') ~* r.valor)
    or (r.tipo = 'offer_code'      and s.offer_code = r.valor)
    or (r.tipo = 'bump_regex'      and coalesce(s.product_name,'') ~* r.valor)
    or (r.tipo = 'bump_produto_id' and s.product_id = (r.valor)::bigint)
  join public.funis f on f.id = r.funil_id
)
select transaction, funil_id, is_bump from match where rn = 1;

alter view public.v_venda_funil set (security_invoker = on);
grant select on public.v_venda_funil to authenticated;

create or replace view public.v_funil_campanha as
with m as (
  select af.funil_id, i.date_start as data,
    sum(public.para_brl(i.spend, i.currency, i.date_start))          as investido_brl,
    sum(i.impressions)                                               as impressoes,
    sum(i.reach)                                                     as alcance_dia,
    sum(i.clicks)                                                    as cliques,
    sum(i.link_clicks)                                               as cliques_link,
    sum(i.landing_page_views)                                        as pageviews,
    sum(i.initiate_checkout)                                         as checkouts,
    sum(i.purchases)                                                 as vendas_meta,
    sum(public.para_brl(i.purchase_value, i.currency, i.date_start)) as receita_meta_brl,
    sum(i.leads)                                                     as leads,
    sum(i.conversas)                                                 as conversas
  from public.meta_ads_insights i
  join public.v_anuncio_funil af on af.ad_id = i.ad_id
  group by af.funil_id, i.date_start
),
h as (
  select vf.funil_id,
    (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date as data,
    count(*) filter (where s.status in ('APPROVED','COMPLETE'))                        as vendas_hotmart,
    count(*) filter (where s.status in ('APPROVED','COMPLETE') and not vf.is_bump)     as vendas_principais,
    count(*) filter (where s.status in ('APPROVED','COMPLETE') and vf.is_bump)         as vendas_bump,
    count(*) filter (where s.status in ('APPROVED','COMPLETE') and s.meta_ad_id is not null) as vendas_rastreadas,
    sum(public.para_brl(s.price_value, s.currency,
        (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date))
        filter (where s.status in ('APPROVED','COMPLETE'))                             as receita_hotmart_brl,
    sum(public.para_brl(s.producer_value, coalesce(s.commission_currency, s.currency),
        (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date))
        filter (where s.status in ('APPROVED','COMPLETE'))                             as liquido_brl,
    count(*) filter (where s.status in ('REFUNDED','CHARGEBACK','CANCELED','DISPUTE')) as reembolsos
  from public.hotmart_sales s
  join public.v_venda_funil vf on vf.transaction = s.transaction
  group by vf.funil_id, (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date
)
select
  coalesce(m.funil_id, h.funil_id)  as funil_id,
  fn.slug, fn.nome, fn.tipo,
  coalesce(m.data, h.data)          as data,
  coalesce(m.investido_brl, 0)      as investido_brl,
  coalesce(m.impressoes, 0)         as impressoes,
  coalesce(m.alcance_dia, 0)        as alcance_dia,
  coalesce(m.cliques, 0)            as cliques,
  coalesce(m.cliques_link, 0)       as cliques_link,
  coalesce(m.pageviews, 0)          as pageviews,
  coalesce(m.checkouts, 0)          as checkouts,
  coalesce(m.vendas_meta, 0)        as vendas_meta,
  coalesce(m.receita_meta_brl, 0)   as receita_meta_brl,
  coalesce(m.leads, 0)              as leads,
  coalesce(m.conversas, 0)          as conversas,
  coalesce(h.vendas_hotmart, 0)     as vendas_hotmart,
  coalesce(h.vendas_principais, 0)  as vendas_principais,
  coalesce(h.vendas_bump, 0)        as vendas_bump,
  coalesce(h.vendas_rastreadas, 0)  as vendas_rastreadas,
  coalesce(h.receita_hotmart_brl, 0) as receita_hotmart_brl,
  coalesce(h.liquido_brl, 0)        as liquido_brl,
  coalesce(h.reembolsos, 0)         as reembolsos
from m
full outer join h on m.funil_id = h.funil_id and m.data = h.data
join public.funis fn on fn.id = coalesce(m.funil_id, h.funil_id);

alter view public.v_funil_campanha set (security_invoker = on);
grant select on public.v_funil_campanha to authenticated;

create or replace view public.v_funil_bumps as
select vf.funil_id,
  (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date as data,
  coalesce(s.product_name, '(sem nome)') as bump,
  count(*) filter (where s.status in ('APPROVED','COMPLETE')) as vendas,
  sum(public.para_brl(s.price_value, s.currency,
      (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date))
      filter (where s.status in ('APPROVED','COMPLETE')) as receita_brl
from public.hotmart_sales s
join public.v_venda_funil vf on vf.transaction = s.transaction
where vf.is_bump
group by vf.funil_id,
  (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date,
  coalesce(s.product_name, '(sem nome)');

alter view public.v_funil_bumps set (security_invoker = on);
grant select on public.v_funil_bumps to authenticated;

-- ---------------------------------------------------------------
-- Regras de venda por produto real (product_id), no lugar de preço
-- (varia com moeda/parcelamento) e regex frouxo de nome.
-- ---------------------------------------------------------------
delete from public.funil_regras_venda
where funil_id in (select id from public.funis where slug in ('leads-wpp', 'terapia-alimentar'));

-- Formação Avançada (WhatsApp): produto real + fallback pelo valor cheio.
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'product_id', '7205571',
       'Formação Avançada em Seletividade e Terapia Alimentar - Extensão Universitária (MEC)'
from public.funis where slug = 'leads-wpp';

insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'valor', '2497', 'fallback: venda avulsa fechada em R$ 2.497'
from public.funis where slug = 'leads-wpp';

-- Terapia Alimentar na Prática: curso principal por product_id exato
-- (o nome "terapia alimentar" também aparece na Formação Avançada,
-- por isso não dá pra usar regex de nome aqui).
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'product_id', '8136815', 'Curso Terapia Alimentar na Prática (venda direta)'
from public.funis where slug = 'terapia-alimentar';

-- Order bumps do checkout (produtos reais confirmados nas vendas).
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select f.id, x.tipo, x.valor, x.observacao
from public.funis f
join (values
  ('bump_produto_id', '5724769', 'Guia de Atividades — versão digital'),
  ('bump_produto_id', '7646856', 'Guia de Atividades — versão física'),
  ('bump_produto_id', '5058964', 'Masterclass: engajamento'),
  ('bump_produto_id', '5682736', 'Masterclass: suplementação'),
  ('bump_produto_id', '7633789', 'Masterclass: planejamento terapêutico')
) as x(tipo, valor, observacao) on true
where f.slug = 'terapia-alimentar';
