-- ---------------------------------------------------------------
-- Painel de cruzamento Meta Ads x Hotmart — tabelas base
-- ---------------------------------------------------------------

create table public.app_config (
  chave         text primary key,
  valor         text,
  descricao     text,
  atualizado_em timestamptz not null default now()
);

create table public.produtos (
  product_id  bigint primary key,
  nome        text not null,
  apelido     text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- Vendas vindas da Hotmart (webhook em tempo real + backfill via API)
create table public.hotmart_sales (
  transaction         text primary key,
  product_id          bigint,
  product_name        text,
  offer_code          text,
  status              text not null,
  order_date          timestamptz,
  approved_date       timestamptz,
  price_value         numeric(14,2),
  currency            text,
  producer_value      numeric(14,2),
  commission_currency text,
  payment_type        text,
  installments        int,
  is_order_bump       boolean not null default false,
  buyer_email         text,
  buyer_name          text,
  buyer_country       text,
  -- rastreio bruto
  src                 text,
  sck                 text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  utm_term            text,
  -- ids da Meta derivados do rastreio
  meta_ad_id          bigint,
  meta_adset_id       bigint,
  meta_campaign_id    bigint,
  origem_dados        text not null default 'webhook',
  raw                 jsonb,
  recebido_em         timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create index idx_hs_approved   on public.hotmart_sales (approved_date);
create index idx_hs_order      on public.hotmart_sales (order_date);
create index idx_hs_produto    on public.hotmart_sales (product_id);
create index idx_hs_status     on public.hotmart_sales (status);
create index idx_hs_ad         on public.hotmart_sales (meta_ad_id);
create index idx_hs_campanha   on public.hotmart_sales (meta_campaign_id);

-- Métricas diárias da Meta, no nível de anúncio
create table public.meta_ads_insights (
  date_start          date   not null,
  ad_id               bigint not null,
  account_id          text,
  campaign_id         bigint,
  campaign_name       text,
  adset_id            bigint,
  adset_name          text,
  ad_name             text,
  spend               numeric(14,2) not null default 0,
  impressions         bigint default 0,
  clicks              bigint default 0,
  link_clicks         bigint default 0,
  landing_page_views  bigint default 0,
  initiate_checkout   bigint default 0,
  purchases           bigint default 0,
  purchase_value      numeric(14,2) default 0,
  currency            text,
  raw                 jsonb,
  atualizado_em       timestamptz not null default now(),
  primary key (date_start, ad_id)
);

create index idx_mai_campanha on public.meta_ads_insights (campaign_id, date_start);
create index idx_mai_data     on public.meta_ads_insights (date_start);

-- Câmbio para consolidar campanhas em EUR/USD junto com BRL
create table public.fx_rates (
  data      date not null,
  moeda     text not null,
  taxa_brl  numeric(14,6) not null,
  primary key (data, moeda)
);

-- Log de execução dos jobs de sincronização
create table public.sync_log (
  id         bigserial primary key,
  job        text not null,
  inicio     timestamptz not null default now(),
  fim        timestamptz,
  status     text not null default 'running',
  registros  int default 0,
  detalhe    text
);

create index idx_sync_job on public.sync_log (job, inicio desc);
