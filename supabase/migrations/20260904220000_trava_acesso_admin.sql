-- ===============================================================
-- Varredura de segurança: o cadastro público da Supabase Auth está
-- habilitado (confirmado por teste real: signup funcionou pro anon
-- key, só pede confirmação de e-mail). Como toda policy de RLS deste
-- projeto era "authenticated -> true", qualquer pessoa que criasse
-- conta e confirmasse o e-mail virava admin: lia todas as vendas/
-- anúncios e (pior) conseguia chamar integracao_salvar via RPC e
-- sobrescrever o token da Meta / hottok da Hotmart.
--
-- Fix: allowlist de e-mails (public.admins) + public.eh_admin(), e
-- toda policy/RPC passa a checar isso em vez de "true". O toggle de
-- cadastro público em si (Auth → Providers → Email → "Allow new
-- users to sign up") fica fora do alcance de uma migration SQL —
-- precisa ser desligado no painel da Supabase; isso aqui é a
-- segunda camada de defesa que não depende desse toggle.
-- ===============================================================

create table if not exists public.admins (
  email      text primary key,
  criado_em  timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (email) values ('aline@blessad.com.br')
on conflict (email) do nothing;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.eh_admin() from public;
revoke all on function public.eh_admin() from anon;
grant execute on function public.eh_admin() to authenticated;

-- ---------------------------------------------------------------
-- Policies: troca "true" por eh_admin() em tudo que era liberado
-- pra qualquer authenticated.
-- ---------------------------------------------------------------
drop policy if exists "leitura autenticada" on public.app_config;
create policy "leitura autenticada" on public.app_config for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.funis;
drop policy if exists "escrita autenticada" on public.funis;
create policy "leitura autenticada" on public.funis for select to authenticated using (public.eh_admin());
create policy "escrita autenticada" on public.funis for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "leitura autenticada" on public.funil_regras_meta;
drop policy if exists "escrita autenticada" on public.funil_regras_meta;
create policy "leitura autenticada" on public.funil_regras_meta for select to authenticated using (public.eh_admin());
create policy "escrita autenticada" on public.funil_regras_meta for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "leitura autenticada" on public.funil_regras_venda;
drop policy if exists "escrita autenticada" on public.funil_regras_venda;
create policy "leitura autenticada" on public.funil_regras_venda for select to authenticated using (public.eh_admin());
create policy "escrita autenticada" on public.funil_regras_venda for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "leitura autenticada" on public.fx_rates;
create policy "leitura autenticada" on public.fx_rates for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.hotmart_sales;
create policy "leitura autenticada" on public.hotmart_sales for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.meta_ad_creatives;
create policy "leitura autenticada" on public.meta_ad_creatives for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.meta_ads_insights;
create policy "leitura autenticada" on public.meta_ads_insights for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.meta_insights_quebra;
create policy "leitura autenticada" on public.meta_insights_quebra for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.produto_regras;
drop policy if exists "escrita autenticada" on public.produto_regras;
create policy "leitura autenticada" on public.produto_regras for select to authenticated using (public.eh_admin());
create policy "escrita autenticada" on public.produto_regras for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "leitura autenticada" on public.produtos;
create policy "leitura autenticada" on public.produtos for select to authenticated using (public.eh_admin());

drop policy if exists "leitura autenticada" on public.sync_log;
create policy "leitura autenticada" on public.sync_log for select to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------
-- RPCs SECURITY DEFINER: bypassam RLS por definição, então cada uma
-- precisa checar eh_admin() explicitamente.
-- ---------------------------------------------------------------
create or replace function public.integracao_salvar(p_chave text, p_valor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'não autorizado';
  end if;
  if p_chave not in (
    'meta_access_token','meta_ad_account_ids','meta_api_version',
    'hotmart_hottok','hotmart_client_id','hotmart_client_secret','hotmart_basic_token'
  ) then
    raise exception 'chave inválida: %', p_chave;
  end if;
  insert into public.integracao_config (chave, valor, atualizado_em)
  values (p_chave, nullif(btrim(p_valor), ''), now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
end;
$$;

create or replace function public.integracao_status()
returns table (chave text, preenchido boolean, valor_publico text, atualizado_em timestamptz)
language sql
security definer
set search_path = public
as $$
  with chaves(chave, publico) as (values
    ('meta_access_token', false), ('meta_ad_account_ids', true), ('meta_api_version', true),
    ('hotmart_hottok', false), ('hotmart_client_id', false),
    ('hotmart_client_secret', false), ('hotmart_basic_token', false)
  )
  select k.chave,
         (c.valor is not null and c.valor <> '')          as preenchido,
         case when k.publico then c.valor else null end    as valor_publico,
         c.atualizado_em
  from chaves k
  left join public.integracao_config c on c.chave = k.chave
  where public.eh_admin()
  order by k.chave;
$$;

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
  if not public.eh_admin() then
    raise exception 'não autorizado';
  end if;
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

-- ---------------------------------------------------------------
-- Views que tinham GRANT pro anon "sobrando" de migrations antigas
-- (inofensivo hoje porque as tabelas de base não concedem SELECT ao
-- anon e as views são security_invoker — confirmado com um teste
-- real via REST sem login, tudo voltou "permission denied" — mas
-- sem necessidade nenhuma de deixar o grant existir).
-- ---------------------------------------------------------------
revoke all on public.v_ad_produto, public.v_anuncios, public.v_funil_produto,
              public.v_produtos_ativos, public.v_quebra,
              public.v_top_criativos, public.v_podium_criativos
  from anon;
