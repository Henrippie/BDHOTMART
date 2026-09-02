drop view if exists public.v_ultimas_vendas;

create view public.v_ultimas_vendas as
select
  s.transaction,
  s.approved_date,
  s.order_date,
  s.status,
  s.product_id,
  coalesce(p.apelido, p.nome, s.product_name) as produto,
  s.price_value,
  s.currency,
  s.is_order_bump,
  s.payment_type,
  s.src, s.sck, s.utm_campaign, s.utm_content,
  s.meta_ad_id, s.meta_campaign_id,
  case when s.buyer_email is null then null
       else left(s.buyer_email, 2) || '***' || substring(s.buyer_email from position('@' in s.buyer_email))
  end as comprador
from public.hotmart_sales s
left join public.produtos p on p.product_id = s.product_id
order by coalesce(s.approved_date, s.order_date) desc
limit 300;

alter view public.v_ultimas_vendas set (security_invoker = on);
revoke all on public.v_ultimas_vendas from anon;
grant select on public.v_ultimas_vendas to authenticated;
