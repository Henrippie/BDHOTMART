-- Etapas escolhíveis da visualização em funil (silhueta), separado das
-- métricas dos tiles: cliques, visitas, leads, conversas, checkouts, vendas.
alter table public.funis add column if not exists etapas text[];

create or replace view public.v_funis_ativos as
select f.id as funil_id, f.slug, f.nome, f.tipo, f.ordem, f.metricas, f.etapas
from public.funis f
where f.ativo
order by f.ordem, f.nome;

alter view public.v_funis_ativos set (security_invoker = on);
grant select on public.v_funis_ativos to authenticated;
