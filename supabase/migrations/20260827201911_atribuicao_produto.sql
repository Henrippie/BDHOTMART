-- ---------------------------------------------------------------
-- De qual produto é cada anúncio.
-- Ordem: regra explícita > aprendido pelas vendas > sem atribuição.
-- ---------------------------------------------------------------
create or replace view public.v_ad_produto as
with base as (
  select distinct i.ad_id, i.adset_id, i.campaign_id, i.campaign_name, i.ad_name
  from public.meta_ads_insights i
),
explicita as (
  select ad_id, product_id from (
    select b.ad_id, r.product_id,
           row_number() over (partition by b.ad_id order by r.prioridade, r.id) rn
    from base b
    join public.produto_regras r on
         (r.tipo = 'ad_id'          and r.valor = b.ad_id::text)
      or (r.tipo = 'adset_id'       and r.valor = b.adset_id::text)
      or (r.tipo = 'campaign_id'    and r.valor = b.campaign_id::text)
      or (r.tipo = 'campaign_regex' and b.campaign_name ~* r.valor)
      or (r.tipo = 'ad_regex'       and b.ad_name       ~* r.valor)
  ) t where rn = 1
),
aprendida as (
  select ad_id, product_id from (
    select s.meta_ad_id as ad_id, s.product_id, count(*) as n,
           row_number() over (partition by s.meta_ad_id order by count(*) desc, s.product_id) rn
    from public.hotmart_sales s
    where s.meta_ad_id is not null
      and s.product_id is not null
      and s.status in ('APPROVED', 'COMPLETE')
    group by s.meta_ad_id, s.product_id
  ) t where rn = 1
)
select
  b.ad_id, b.adset_id, b.campaign_id, b.campaign_name, b.ad_name,
  coalesce(e.product_id, a.product_id) as product_id,
  case when e.product_id is not null then 'regra'
       when a.product_id is not null then 'vendas'
       else 'sem atribuicao' end       as origem_atribuicao
from base b
left join explicita e on e.ad_id = b.ad_id
left join aprendida a on a.ad_id = b.ad_id;

alter view public.v_ad_produto set (security_invoker = on);
grant select on public.v_ad_produto to authenticated;

-- ---------------------------------------------------------------
-- Catálogo de produtos que aparece no filtro do painel
-- ---------------------------------------------------------------
create or replace view public.v_produtos_ativos as
select p.product_id,
       coalesce(p.apelido, p.nome, p.product_id::text) as produto,
       (select count(*) from public.hotmart_sales s
         where s.product_id = p.product_id
           and s.status in ('APPROVED','COMPLETE'))    as vendas,
       exists (select 1 from public.v_ad_produto v
                where v.product_id = p.product_id)     as tem_anuncio
from public.produtos p
where p.ativo
order by 3 desc;

alter view public.v_produtos_ativos set (security_invoker = on);
grant select on public.v_produtos_ativos to authenticated;
