-- ---------------------------------------------------------------
-- Métricas de topo e meio de funil que faltavam
-- ---------------------------------------------------------------
alter table public.meta_ads_insights
  add column reach     bigint default 0,
  add column leads     bigint default 0,
  add column conversas bigint default 0;

-- ---------------------------------------------------------------
-- Quebras: demografia (idade/gênero) e posicionamento
-- ---------------------------------------------------------------
create table public.meta_insights_quebra (
  date_start          date   not null,
  ad_id               bigint not null,
  tipo                text   not null,   -- 'demografia' | 'posicionamento'
  chave1              text   not null,   -- idade | plataforma
  chave2              text   not null default '',  -- gênero | posicionamento
  campaign_id         bigint,
  spend               numeric(14,2) default 0,
  impressions         bigint default 0,
  reach               bigint default 0,
  clicks              bigint default 0,
  link_clicks         bigint default 0,
  landing_page_views  bigint default 0,
  initiate_checkout   bigint default 0,
  purchases           bigint default 0,
  purchase_value      numeric(14,2) default 0,
  leads               bigint default 0,
  conversas           bigint default 0,
  currency            text,
  atualizado_em       timestamptz not null default now(),
  primary key (date_start, ad_id, tipo, chave1, chave2)
);

create index idx_quebra_tipo on public.meta_insights_quebra (tipo, date_start);

-- ---------------------------------------------------------------
-- Regras explícitas de "este anúncio vende tal produto"
-- ---------------------------------------------------------------
create table public.produto_regras (
  id          bigserial primary key,
  product_id  bigint not null,
  tipo        text   not null check (tipo in
                ('ad_id','adset_id','campaign_id','campaign_regex','ad_regex')),
  valor       text   not null,
  prioridade  int    not null default 100,
  observacao  text,
  criado_em   timestamptz not null default now()
);

create index idx_regras_produto on public.produto_regras (product_id);

alter table public.meta_insights_quebra enable row level security;
alter table public.produto_regras       enable row level security;

create policy "leitura autenticada" on public.meta_insights_quebra
  for select to authenticated using (true);
create policy "leitura autenticada" on public.produto_regras
  for select to authenticated using (true);
create policy "escrita autenticada" on public.produto_regras
  for all to authenticated using (true) with check (true);

revoke all on public.meta_insights_quebra, public.produto_regras from anon;
