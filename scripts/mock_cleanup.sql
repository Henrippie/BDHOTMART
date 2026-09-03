-- ===============================================================
-- Apaga os dados de exemplo (mock_seed.sql e mock_funis.sql) e o
-- usuário de teste. NÃO apaga a configuração real de funis.
-- Rode antes de plugar as fontes reais.
-- ===============================================================
delete from public.hotmart_sales       where transaction like 'MOCK-%';
delete from public.meta_insights_quebra where ad_id in (120210001,120210002,120210003);
delete from public.meta_ads_insights    where account_id = 'act_1000';
delete from public.produto_regras       where observacao = 'mock';
delete from public.fx_rates             where data between date '2026-08-24' and date '2026-09-02';
delete from public.produtos             where product_id in (101,202,501,601,611,612,613);

-- usuário de teste (troque o e-mail se tiver usado outro)
delete from auth.identities where user_id in (select id from auth.users where email = 'teste@painel.local');
delete from auth.users      where email = 'teste@painel.local';
