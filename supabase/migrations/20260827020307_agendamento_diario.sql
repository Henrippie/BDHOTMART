create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- ---------------------------------------------------------------
-- Dispara uma Edge Function usando a service_role key guardada no Vault.
-- A chave é gravada uma única vez com:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- ---------------------------------------------------------------
create or replace function public.disparar_funcao(p_funcao text, p_query text default '')
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_key text;
  v_url text;
  v_req bigint;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets
   where name = 'service_role_key'
   limit 1;

  if v_key is null then
    raise exception 'Grave a service_role key no Vault com o nome service_role_key';
  end if;

  v_url := 'https://pallgafprdnswzigomyl.supabase.co/functions/v1/' || p_funcao ||
           case when p_query = '' then '' else '?' || p_query end;

  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_req;

  return v_req;
end;
$$;

revoke all on function public.disparar_funcao(text, text) from public, anon, authenticated;

-- Horários em UTC (Brasília = UTC-3)
select cron.schedule('fx-diario',       '45 8 * * *', $$select public.disparar_funcao('fx-sync')$$);
select cron.schedule('meta-diario',     '0 9 * * *',  $$select public.disparar_funcao('meta-sync', 'dias=7')$$);
select cron.schedule('hotmart-diario', '15 9 * * *',  $$select public.disparar_funcao('hotmart-backfill', 'dias=7')$$);
