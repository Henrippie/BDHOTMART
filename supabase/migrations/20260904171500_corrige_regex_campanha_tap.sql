-- A regra original ('\mtap', "TAP" como palavra isolada) não batia com
-- os nomes reais das campanhas ("CTAP ...", "CURSO TERAPIA ALIMENTAR NA
-- PRÁTICA..."), então o funil "Terapia Alimentar na Prática" nunca via
-- investimento/leads da Meta. Troca para casar "CTAP" ou "Terapia Alimentar".
update public.funil_regras_meta
set valor = 'ctap|terapia alimentar',
    observacao = 'nome da campanha contém "CTAP" ou "Terapia Alimentar"'
where funil_id = (select id from public.funis where slug = 'terapia-alimentar')
  and tipo = 'campaign_regex';
