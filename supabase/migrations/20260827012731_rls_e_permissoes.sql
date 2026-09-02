-- ---------------------------------------------------------------
-- Segurança: nada é público. Só usuário logado lê; escrita só pelo
-- service_role (Edge Functions).
-- ---------------------------------------------------------------
alter table public.app_config        enable row level security;
alter table public.produtos          enable row level security;
alter table public.hotmart_sales     enable row level security;
alter table public.meta_ads_insights enable row level security;
alter table public.fx_rates          enable row level security;
alter table public.sync_log          enable row level security;

create policy "leitura autenticada" on public.produtos
  for select to authenticated using (true);
create policy "leitura autenticada" on public.hotmart_sales
  for select to authenticated using (true);
create policy "leitura autenticada" on public.meta_ads_insights
  for select to authenticated using (true);
create policy "leitura autenticada" on public.fx_rates
  for select to authenticated using (true);
create policy "leitura autenticada" on public.sync_log
  for select to authenticated using (true);
create policy "leitura autenticada" on public.app_config
  for select to authenticated using (true);

-- Views herdam as permissões de quem consulta
alter view public.v_hotmart_norm         set (security_invoker = on);
alter view public.v_meta_norm            set (security_invoker = on);
alter view public.v_cruzamento_anuncio   set (security_invoker = on);
alter view public.v_cruzamento_campanha  set (security_invoker = on);
alter view public.v_resumo_dia           set (security_invoker = on);
alter view public.v_resumo_produto       set (security_invoker = on);
alter view public.v_qualidade_rastreio   set (security_invoker = on);
alter view public.v_ultimas_vendas       set (security_invoker = on);

revoke all on public.app_config, public.produtos, public.hotmart_sales,
              public.meta_ads_insights, public.fx_rates, public.sync_log
  from anon;

revoke all on public.v_hotmart_norm, public.v_meta_norm,
              public.v_cruzamento_anuncio, public.v_cruzamento_campanha,
              public.v_resumo_dia, public.v_resumo_produto,
              public.v_qualidade_rastreio, public.v_ultimas_vendas
  from anon;

grant select on public.v_hotmart_norm, public.v_meta_norm,
                public.v_cruzamento_anuncio, public.v_cruzamento_campanha,
                public.v_resumo_dia, public.v_resumo_produto,
                public.v_qualidade_rastreio, public.v_ultimas_vendas
  to authenticated;

-- Catálogo inicial (nomes podem ser ajustados depois pelo painel)
insert into public.app_config (chave, valor, descricao) values
  ('timezone',          'America/Sao_Paulo', 'Fuso usado para fechar o dia'),
  ('meta_api_version',  'v26.0',             'Versão da Marketing API da Meta'),
  ('janela_backfill_dias', '7',              'Dias reprocessados a cada sync (a Meta reprocessa conversões por até 72h)')
on conflict (chave) do nothing;
