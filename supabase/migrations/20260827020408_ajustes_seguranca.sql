-- search_path fixo no trigger de ordenação de eventos
create or replace function public.fn_ignorar_evento_antigo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.ultimo_evento_em is not null
     and new.ultimo_evento_em is not null
     and new.ultimo_evento_em < old.ultimo_evento_em then
    return old;
  end if;
  return new;
end;
$$;

-- Funções de trigger não devem ser chamáveis pela API
revoke all on function public.fn_derivar_ids_meta()   from public, anon, authenticated;
revoke all on function public.fn_ignorar_evento_antigo() from public, anon, authenticated;

-- para_brl passa a rodar com as permissões de quem chama (as views são invoker)
create or replace function public.para_brl(p_valor numeric, p_moeda text, p_data date)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when p_valor is null then null
    when upper(coalesce(p_moeda, 'BRL')) = 'BRL' then p_valor
    else p_valor * coalesce(
      (select f.taxa_brl
         from public.fx_rates f
        where f.moeda = upper(p_moeda) and f.data <= p_data
        order by f.data desc
        limit 1),
      1)
  end;
$$;

revoke all on function public.para_brl(numeric, text, date) from public, anon;
grant execute on function public.para_brl(numeric, text, date) to authenticated, service_role;
