alter table public.hotmart_sales
  add column ultimo_evento     text,
  add column ultimo_evento_em  timestamptz;

-- Só aplica o evento se ele for mais novo que o último já registrado.
-- Evita que um "boleto impresso" atrasado sobrescreva um "aprovado".
create or replace function public.fn_ignorar_evento_antigo()
returns trigger
language plpgsql
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

create trigger trg_ignorar_evento_antigo
  before update on public.hotmart_sales
  for each row execute function public.fn_ignorar_evento_antigo();
