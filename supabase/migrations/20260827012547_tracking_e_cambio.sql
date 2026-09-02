-- ---------------------------------------------------------------
-- Deriva os IDs da Meta a partir de src / sck / utm
-- Convenção: quando houver 3 números, a ordem é campanha|adset|anuncio
-- ---------------------------------------------------------------
create or replace function public.fn_derivar_ids_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txt  text;
  v_nums bigint[];
begin
  new.meta_ad_id       := null;
  new.meta_adset_id    := null;
  new.meta_campaign_id := null;

  foreach v_txt in array array[new.src, new.sck, new.utm_content, new.utm_term, new.utm_campaign]
  loop
    if v_txt is null or btrim(v_txt) = '' then
      continue;
    end if;

    select array_agg((m[1])::bigint order by ord)
      into v_nums
      from regexp_matches(v_txt, '(\d{8,})', 'g') with ordinality as t(m, ord);

    if v_nums is null then
      continue;
    end if;

    if array_length(v_nums, 1) >= 3 then
      new.meta_campaign_id := coalesce(new.meta_campaign_id, v_nums[1]);
      new.meta_adset_id    := coalesce(new.meta_adset_id,    v_nums[2]);
      new.meta_ad_id       := coalesce(new.meta_ad_id,       v_nums[3]);
    elsif array_length(v_nums, 1) = 2 then
      new.meta_campaign_id := coalesce(new.meta_campaign_id, v_nums[1]);
      new.meta_ad_id       := coalesce(new.meta_ad_id,       v_nums[2]);
    else
      new.meta_ad_id       := coalesce(new.meta_ad_id,       v_nums[1]);
    end if;
  end loop;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_derivar_ids_meta
  before insert or update on public.hotmart_sales
  for each row execute function public.fn_derivar_ids_meta();

-- ---------------------------------------------------------------
-- Conversão para BRL usando a cotação mais recente até a data
-- ---------------------------------------------------------------
create or replace function public.para_brl(p_valor numeric, p_moeda text, p_data date)
returns numeric
language sql
stable
security definer
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
