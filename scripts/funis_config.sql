-- ===============================================================
-- Configuração dos FUNIS por campanha (dados reais, edite à vontade).
-- Idempotente: apaga os dois funis por slug e recria as regras.
-- Rode no SQL Editor do Supabase quando quiser ajustar.
-- ===============================================================

-- recria do zero (as regras caem em cascata)
delete from public.funis where slug in ('leads-wpp', 'terapia-alimentar');

-- 1) Funil de LEADS — Formação Avançada (WhatsApp / comercial)
--    Meta: campanhas cujo nome traz "avançada" e "wpp".
--    Hotmart: o produto real (product_id) + fallback pelo valor cheio.
--    Obs: o nome do produto contém "Terapia Alimentar" também, então
--    NUNCA use produto_regex aqui — ele coincide com o outro funil.
with f as (
  insert into public.funis (slug, nome, tipo, descricao, ordem)
  values ('leads-wpp', 'Formação Avançada (WhatsApp)', 'leads',
          'Gera leads para o comercial. Venda fechada pelo time, contabilizada pelo produto/valor.', 1)
  returning id
)
insert into public.funil_regras_meta (funil_id, tipo, valor, observacao)
select id, 'campaign_regex', '(?=.*avan)(?=.*wpp)', 'nome contém "avançada" e "wpp"' from f;

insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'product_id', '7205571',
       'Formação Avançada em Seletividade e Terapia Alimentar - Extensão Universitária (MEC)'
from public.funis where slug = 'leads-wpp';

insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'valor', '2497', 'fallback: venda avulsa fechada em R$ 2.497'
from public.funis where slug = 'leads-wpp';

-- 2) Funil TERAPIA ALIMENTAR NA PRÁTICA — venda direta pelo tráfego
--    Meta: campanhas cujo nome contém "TAP".
--    Hotmart: o curso (product_id exato) + os order bumps do checkout
--    (também por product_id — a Hotmart não manda is_order_bump na API
--    de sales/history, então quem marca "é bump" é esta regra, não o
--    campo da venda).
with f as (
  insert into public.funis (slug, nome, tipo, descricao, ordem)
  values ('terapia-alimentar', 'Terapia Alimentar na Prática', 'venda_direta',
          'Venda direta pelo tráfego, sem passar pelo comercial. Inclui order bumps.', 2)
  returning id
)
insert into public.funil_regras_meta (funil_id, tipo, valor, observacao)
select id, 'campaign_regex', '\mtap', 'nome da campanha começa uma palavra com "TAP"' from f;

-- curso vendido direto
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select id, 'product_id', '8136815', 'Curso Terapia Alimentar na Prática (venda direta)'
from public.funis where slug = 'terapia-alimentar';

-- order bumps do checkout — produtos reais confirmados nas vendas.
insert into public.funil_regras_venda (funil_id, tipo, valor, observacao)
select f.id, x.tipo, x.valor, x.observacao
from public.funis f
join (values
  ('bump_produto_id', '5724769', 'Guia de Atividades — versão digital'),
  ('bump_produto_id', '7646856', 'Guia de Atividades — versão física'),
  ('bump_produto_id', '5058964', 'Masterclass: engajamento'),
  ('bump_produto_id', '5682736', 'Masterclass: suplementação'),
  ('bump_produto_id', '7633789', 'Masterclass: planejamento terapêutico')
) as x(tipo, valor, observacao) on true
where f.slug = 'terapia-alimentar';

-- Conferir o que ficou:
select f.slug, f.nome, f.tipo, f.ordem,
       (select string_agg(tipo||'='||valor, ' ; ') from public.funil_regras_meta  m where m.funil_id=f.id) as regras_meta,
       (select string_agg(tipo||'='||valor, ' ; ') from public.funil_regras_venda v where v.funil_id=f.id) as regras_venda
from public.funis f where f.slug in ('leads-wpp','terapia-alimentar') order by f.ordem;
