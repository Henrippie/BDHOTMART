-- ===============================================================
-- Funis nomeados por tipo de campanha.
-- Cada funil tem regras do lado da Meta (quais campanhas/anuncios)
-- e regras do lado da Hotmart (o que conta como venda daquele funil).
-- ===============================================================

create table public.funis (
  id         bigserial primary key,
  slug       text not null unique,
  nome       text not null,
  tipo       text not null default 'venda_direta',  -- 'leads' | 'venda_direta'
  descricao  text,
  ativo      boolean not null default true,
  ordem      int not null default 100,
  criado_em  timestamptz not null default now()
);

-- Lado Meta: quais campanhas/anuncios pertencem ao funil.
create table public.funil_regras_meta (
  id          bigserial primary key,
  funil_id    bigint not null references public.funis(id) on delete cascade,
  tipo        text not null check (tipo in
                ('campaign_regex','ad_regex','campaign_id','adset_id','ad_id')),
  valor       text not null,
  prioridade  int not null default 100,
  observacao  text
);
create index idx_frm_funil on public.funil_regras_meta (funil_id);

-- Lado Hotmart: quais vendas contam para o funil.
--   valor          -> price_value = valor
--   product_id     -> product_id  = valor
--   produto_regex  -> product_name casa o regex
--   offer_code     -> offer_code  = valor
--   bump_regex     -> is_order_bump e product_name casa o regex
--   bump_produto_id-> is_order_bump e product_id = valor
create table public.funil_regras_venda (
  id          bigserial primary key,
  funil_id    bigint not null references public.funis(id) on delete cascade,
  tipo        text not null check (tipo in
                ('valor','product_id','produto_regex','offer_code','bump_regex','bump_produto_id')),
  valor       text not null,
  observacao  text
);
create index idx_frv_funil on public.funil_regras_venda (funil_id);

-- ---------------------------------------------------------------
-- Resolve o funil de cada ANUNCIO (menor prioridade ganha).
-- ---------------------------------------------------------------
create or replace view public.v_anuncio_funil as
with base as (
  select distinct ad_id, adset_id, campaign_id, campaign_name, ad_name
  from public.meta_ads_insights
),
match as (
  select b.ad_id, r.funil_id,
         row_number() over (partition by b.ad_id order by r.prioridade, r.funil_id) rn
  from base b
  join public.funil_regras_meta r on
       (r.tipo = 'ad_id'          and r.valor = b.ad_id::text)
    or (r.tipo = 'adset_id'       and r.valor = b.adset_id::text)
    or (r.tipo = 'campaign_id'    and r.valor = b.campaign_id::text)
    or (r.tipo = 'campaign_regex' and b.campaign_name ~* r.valor)
    or (r.tipo = 'ad_regex'       and b.ad_name       ~* r.valor)
)
select ad_id, funil_id from match where rn = 1;

alter view public.v_anuncio_funil set (security_invoker = on);
grant select on public.v_anuncio_funil to authenticated;

-- ---------------------------------------------------------------
-- Resolve o funil de cada VENDA (uma venda conta em um funil só;
-- desempata pela ordem do funil).
-- ---------------------------------------------------------------
create or replace view public.v_venda_funil as
with match as (
  select s.transaction, r.funil_id,
         row_number() over (partition by s.transaction order by f.ordem, r.funil_id) rn
  from public.hotmart_sales s
  join public.funil_regras_venda r on
       (r.tipo = 'valor'           and s.price_value = (r.valor)::numeric)
    or (r.tipo = 'product_id'      and s.product_id  = (r.valor)::bigint)
    or (r.tipo = 'produto_regex'   and coalesce(s.product_name,'') ~* r.valor)
    or (r.tipo = 'offer_code'      and s.offer_code = r.valor)
    or (r.tipo = 'bump_regex'      and s.is_order_bump and coalesce(s.product_name,'') ~* r.valor)
    or (r.tipo = 'bump_produto_id' and s.is_order_bump and s.product_id = (r.valor)::bigint)
  join public.funis f on f.id = r.funil_id
)
select transaction, funil_id from match where rn = 1;

alter view public.v_venda_funil set (security_invoker = on);
grant select on public.v_venda_funil to authenticated;

-- ---------------------------------------------------------------
-- Funil por campanha e por dia (componentes brutos; taxas no front).
-- ---------------------------------------------------------------
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
    count(*) filter (where s.status in ('APPROVED','COMPLETE') and not s.is_order_bump) as vendas_principais,
    count(*) filter (where s.status in ('APPROVED','COMPLETE') and s.is_order_bump)     as vendas_bump,
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

-- ---------------------------------------------------------------
-- Order bumps por funil (para a quebra "o que vendeu no checkout").
-- ---------------------------------------------------------------
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
where s.is_order_bump
group by vf.funil_id,
  (coalesce(s.approved_date, s.order_date) at time zone 'America/Sao_Paulo')::date,
  coalesce(s.product_name, '(sem nome)');

alter view public.v_funil_bumps set (security_invoker = on);
grant select on public.v_funil_bumps to authenticated;

-- ---------------------------------------------------------------
-- Catálogo de funis para o seletor do painel.
-- ---------------------------------------------------------------
create or replace view public.v_funis_ativos as
select f.id as funil_id, f.slug, f.nome, f.tipo, f.ordem
from public.funis f
where f.ativo
order by f.ordem, f.nome;

alter view public.v_funis_ativos set (security_invoker = on);
grant select on public.v_funis_ativos to authenticated;

-- ---------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------
alter table public.funis              enable row level security;
alter table public.funil_regras_meta  enable row level security;
alter table public.funil_regras_venda enable row level security;

create policy "leitura autenticada" on public.funis
  for select to authenticated using (true);
create policy "escrita autenticada" on public.funis
  for all to authenticated using (true) with check (true);

create policy "leitura autenticada" on public.funil_regras_meta
  for select to authenticated using (true);
create policy "escrita autenticada" on public.funil_regras_meta
  for all to authenticated using (true) with check (true);

create policy "leitura autenticada" on public.funil_regras_venda
  for select to authenticated using (true);
create policy "escrita autenticada" on public.funil_regras_venda
  for all to authenticated using (true) with check (true);

revoke all on public.funis, public.funil_regras_meta, public.funil_regras_venda from anon;
revoke all on public.v_anuncio_funil, public.v_venda_funil, public.v_funil_campanha,
              public.v_funil_bumps, public.v_funis_ativos from anon;
