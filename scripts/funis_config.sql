-- ===============================================================
-- Configuração dos FUNIS por campanha (dados reais, edite à vontade).
-- Idempotente: apaga os dois funis por slug e recria as regras.
-- Rode no SQL Editor do Supabase quando quiser ajustar.
-- ===============================================================

-- recria do zero (as regras caem em cascata)
delete from public.funis where slug in ('leads-wpp', 'terapia-alimentar');

-- 1) Funil de LEADS — Formação Avançada (WhatsApp / comercial)
--    Meta: campanhas cujo nome traz "avançada" e "wpp".
--    Hotmart: toda venda de R$ 2.497 conta como venda deste funil.
with f as (
  insert into public.funis (slug, nome, tipo, descricao, ordem)
  values ('leads-wpp', 'Formação Avançada (WhatsApp)', 'leads',
          'Gera leads para o comercial. Venda fechada pelo time, contabilizada pelo valor.', 1)
  returning id
)
insert into public.funil_regras_meta (funil_id, tipo, valor, observacao)
select id, 'campaign_regex', '(?=.*avan)(?=.*wpp)', 'nome contém "avançada" e "wpp"' from f;

insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'valor', '2497', 'toda venda de R$ 2.497 é deste funil'
from public.funis where slug = 'leads-wpp';

-- 2) Funil TERAPIA ALIMENTAR NA PRÁTICA — venda direta pelo tráfego
--    Meta: campanhas cujo nome contém "TAP".
--    Hotmart: o curso (venda direta) + os order bumps do checkout.
with f as (
  insert into public.funis (slug, nome, tipo, descricao, ordem)
  values ('terapia-alimentar', 'Terapia Alimentar na Prática', 'venda_direta',
          'Venda direta pelo tráfego, sem passar pelo comercial. Inclui order bumps.', 2)
  returning id
)
insert into public.funil_regras_meta (funil_id, tipo, valor, observacao)
select id, 'campaign_regex', '\mtap', 'nome da campanha começa uma palavra com "TAP"' from f;

-- curso vendido direto (ajuste o texto se o nome do produto na Hotmart for outro)
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'produto_regex', 'terapia alimentar', 'curso principal (venda direta)'
from public.funis where slug = 'terapia-alimentar';

-- order bumps do checkout — COMPLETE esta lista com os nomes exatos.
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'bump_regex',
       'guia de atividades|masterclass de suplementa|masterclass de planejamento',
       'order bumps do curso — adicione os demais nomes separados por |'
from public.funis where slug = 'terapia-alimentar';

-- Conferir o que ficou:
select f.slug, f.nome, f.tipo, f.ordem,
       (select string_agg(tipo||'='||valor, ' ; ') from public.funil_regras_meta  m where m.funil_id=f.id) as regras_meta,
       (select string_agg(tipo||'='||valor, ' ; ') from public.funil_regras_venda v where v.funil_id=f.id) as regras_venda
from public.funis f where f.slug in ('leads-wpp','terapia-alimentar') order by f.ordem;
