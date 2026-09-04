-- ===============================================================
-- Melhores criativos: ranking de anúncios por resultado + tabela
-- para guardar a imagem/vídeo de cada um (vem da Graph API, então
-- é sincronizado à parte, só para os anúncios que aparecem no topo).
-- ===============================================================

create table public.meta_ad_creatives (
  ad_id        bigint primary key,
  ad_name      text,
  tipo         text check (tipo in ('imagem', 'video')),
  thumbnail_url text,
  preview_url   text,
  atualizado_em timestamptz not null default now()
);

alter table public.meta_ad_creatives enable row level security;
create policy "leitura autenticada" on public.meta_ad_creatives
  for select to authenticated using (true);
revoke all on public.meta_ad_creatives from anon;

-- Ranking de anúncios por resultado (todo o histórico sincronizado).
-- "resultados" soma vendas + leads + conversas pra funcionar tanto pro
-- funil de venda direta quanto pro de leads/WhatsApp.
create or replace view public.v_top_criativos as
select
  i.ad_id,
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

-- Junta o ranking com a imagem/vídeo já sincronizados (só mostra quem já
-- tem criativo salvo — o resto aparece assim que o sync de criativos rodar).
create or replace view public.v_podium_criativos as
select c.*, cr.tipo, cr.thumbnail_url, cr.preview_url, cr.atualizado_em as criativo_atualizado_em
from public.v_top_criativos c
join public.meta_ad_creatives cr on cr.ad_id = c.ad_id;

alter view public.v_podium_criativos set (security_invoker = on);
grant select on public.v_podium_criativos to authenticated;

-- Libera o novo job de sincronização no disparo manual do painel.
create or replace function public.disparar(p_job text, p_query text default '')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url  text;
  v_req  bigint;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbGxnYWZwcmRuc3d6aWdvbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTAyNDEsImV4cCI6MjEwMzM2NjI0MX0.5sqhhxeR0M-ZocXV-UYKctxxSZoFAVDyT-vQZEeg-BM';
begin
  if p_job not in ('meta-sync', 'hotmart-backfill', 'fx-sync', 'meta-criativos-sync') then
    raise exception 'job inválido: %', p_job;
  end if;
  v_url := 'https://pallgafprdnswzigomyl.supabase.co/functions/v1/' || p_job ||
           case when coalesce(p_query,'') = '' then '' else '?' || p_query end;
  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_req;
  return v_req;
end;
$$;
