-- ===============================================================
-- Configuração visual dos funis: atribuir campanha por campanha (em
-- vez de só regex) e escolher quais métricas aparecem em cada funil.
-- ===============================================================

alter table public.funis add column if not exists metricas text[];

-- Uma campanha real por linha, com o funil que ela cai hoje (se algum).
-- campaign_id sai como texto: tem até 18 dígitos, acima do inteiro
-- seguro do JS/JSON (2^53) — perderia precisão se voltasse como number.
create or replace view public.v_campanhas_funil as
select
  c.campaign_id::text as campaign_id,
  c.campaign_name,
  c.investido_bruto,
  c.primeira_data,
  c.ultima_data,
  c.funil_id,
  fn.slug as funil_slug,
  fn.nome as funil_nome
from (
  select
    i.campaign_id,
    max(i.campaign_name)                          as campaign_name,
    min(i.date_start)                              as primeira_data,
    max(i.date_start)                              as ultima_data,
    sum(i.spend)                                    as investido_bruto,
    mode() within group (order by af.funil_id)      as funil_id
  from public.meta_ads_insights i
  left join public.v_anuncio_funil af on af.ad_id = i.ad_id
  where i.campaign_id is not null
  group by i.campaign_id
) c
left join public.funis fn on fn.id = c.funil_id;

alter view public.v_campanhas_funil set (security_invoker = on);
grant select on public.v_campanhas_funil to authenticated;
revoke all on public.v_campanhas_funil from anon;

-- v_funis_ativos passa a levar as métricas escolhidas pro painel.
create or replace view public.v_funis_ativos as
select f.id as funil_id, f.slug, f.nome, f.tipo, f.ordem, f.metricas
from public.funis f
where f.ativo
order by f.ordem, f.nome;

alter view public.v_funis_ativos set (security_invoker = on);
grant select on public.v_funis_ativos to authenticated;
