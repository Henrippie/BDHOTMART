-- Os IDs de anúncio da Meta têm até 18 dígitos, acima do inteiro seguro do
-- JSON/JS (2^53). Quando um cliente JS (a Edge Function de criativos, por
-- exemplo) lê "ad_id" como número via PostgREST, o valor é arredondado —
-- mesmo estando correto no Postgres. Expõe como texto nas views que
-- alimentam esse caminho, pra não perder precisão na volta.
create or replace view public.v_top_criativos as
select
  i.ad_id::text as ad_id,
  max(i.ad_name)      as ad_name,
  max(i.campaign_name) as campaign_name,
  af.funil_id,
  fn.slug as funil_slug,
  fn.nome as funil_nome,
  fn.tipo as funil_tipo,
  sum(public.para_brl(i.spend, i.currency, i.date_start))          as investido_brl,
  sum(i.impressions)                                                as impressoes,
  sum(i.link_clicks)                                                as cliques_link,
  sum(i.purchases)                                                  as vendas,
  sum(public.para_brl(i.purchase_value, i.currency, i.date_start)) as receita_brl,
  sum(i.leads)                                                      as leads,
  sum(i.conversas)                                                  as conversas,
  (sum(i.purchases) + sum(i.leads) + sum(i.conversas))              as resultados,
  case when sum(public.para_brl(i.spend, i.currency, i.date_start)) > 0
       then sum(public.para_brl(i.purchase_value, i.currency, i.date_start))
            / sum(public.para_brl(i.spend, i.currency, i.date_start))
       else null end as roas
from public.meta_ads_insights i
left join public.v_anuncio_funil af on af.ad_id = i.ad_id
left join public.funis fn on fn.id = af.funil_id
group by i.ad_id, af.funil_id, fn.slug, fn.nome, fn.tipo
having sum(public.para_brl(i.spend, i.currency, i.date_start)) > 0;

alter view public.v_top_criativos set (security_invoker = on);
grant select on public.v_top_criativos to authenticated;

create or replace view public.v_podium_criativos as
select c.*, cr.tipo, cr.thumbnail_url, cr.preview_url, cr.atualizado_em as criativo_atualizado_em
from public.v_top_criativos c
join public.meta_ad_creatives cr on cr.ad_id::text = c.ad_id;

alter view public.v_podium_criativos set (security_invoker = on);
grant select on public.v_podium_criativos to authenticated;
