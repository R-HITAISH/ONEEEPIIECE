alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_inr integer not null default 0 check (discount_inr >= 0);

drop function if exists public.create_checkout_order(uuid, uuid[], jsonb, text);
create function public.create_checkout_order(p_user_id uuid,p_item_ids uuid[],p_shipping jsonb,p_payment_method text)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_subtotal integer; v_shipping integer; v_cod_fee integer := 0; v_discount integer := 0; v_total integer;
  v_order_id uuid; v_lock_count integer; v_item_count integer; v_coupon public.coupons%rowtype;
  v_coupon_code text := upper(trim(coalesce(p_shipping ->> 'coupon_code','')));
begin
  if p_user_id is null or p_payment_method not in ('razorpay','cod') then raise exception 'Invalid customer or payment method'; end if;
  if coalesce(array_length(p_item_ids,1),0) < 1 or array_length(p_item_ids,1) > 10 then raise exception 'Cart must contain between one and ten items'; end if;
  if (select count(distinct item_id) from unnest(p_item_ids) as input(item_id)) <> array_length(p_item_ids,1) then raise exception 'Duplicate cart item'; end if;
  if coalesce(p_shipping ->> 'name','') = '' or coalesce(p_shipping ->> 'address','') = '' or coalesce(p_shipping ->> 'city','') = '' or coalesce(p_shipping ->> 'state','') = ''
    or coalesce(p_shipping ->> 'phone','') !~ '^[6-9][0-9]{9}$' or coalesce(p_shipping ->> 'pincode','') !~ '^[0-9]{6}$' then raise exception 'Invalid shipping details'; end if;
  perform id from public.items where id = any(p_item_ids) order by id for update;
  select count(*),coalesce(sum(price_inr),0) into v_item_count,v_subtotal from public.items where id=any(p_item_ids) and status='locked' and stock>0;
  if v_item_count <> array_length(p_item_ids,1) then raise exception 'One or more pieces are unavailable'; end if;
  select count(*) into v_lock_count from public.cart_locks where item_id=any(p_item_ids) and user_id=p_user_id and status='active' and expires_at>now();
  if v_lock_count <> array_length(p_item_ids,1) then raise exception 'Your reservation expired. Return to your bag.'; end if;
  if v_coupon_code <> '' then
    select * into v_coupon from public.coupons where code=v_coupon_code and active=true and (expires_at is null or expires_at>now()) and (usage_limit is null or usage_count<usage_limit) for update;
    if not found then raise exception 'Coupon is invalid or expired'; end if;
    if v_subtotal < v_coupon.minimum_order_inr then raise exception 'Coupon minimum order is not met'; end if;
    v_discount := case when v_coupon.discount_type='percentage' then floor(v_subtotal * least(v_coupon.discount_value,100)::numeric / 100)::integer else least(v_subtotal,v_coupon.discount_value) end;
  end if;
  v_shipping := case when v_subtotal-v_discount >= 1999 then 0 else 99 end;
  if p_payment_method='cod' then v_cod_fee:=49; end if;
  v_total:=v_subtotal-v_discount+v_shipping+v_cod_fee;
  insert into public.orders(user_id,status,total_inr,shipping_cost_inr,cod_fee_inr,coupon_code,discount_inr,payment_method,shipping_name,shipping_address,shipping_city,shipping_state,shipping_pincode,shipping_phone)
  values(p_user_id,case when p_payment_method='cod' then 'placed' else 'pending' end,v_total,v_shipping,v_cod_fee,nullif(v_coupon_code,''),v_discount,p_payment_method,p_shipping->>'name',concat_ws(', ',p_shipping->>'address',nullif(p_shipping->>'extra','')),p_shipping->>'city',p_shipping->>'state',p_shipping->>'pincode',p_shipping->>'phone') returning id into v_order_id;
  insert into public.order_items(order_id,item_id,price_inr) select v_order_id,id,price_inr from public.items where id=any(p_item_ids);
  if v_coupon_code<>'' then update public.coupons set usage_count=usage_count+1 where id=v_coupon.id; end if;
  if p_payment_method='cod' then
    update public.items set stock=greatest(stock-1,0) where id=any(p_item_ids);
    update public.cart_locks set status='converted' where item_id=any(p_item_ids) and user_id=p_user_id and status='active';
  end if;
  return jsonb_build_object('order_id',v_order_id,'subtotal_inr',v_subtotal,'discount_inr',v_discount,'coupon_code',nullif(v_coupon_code,''),'shipping_cost_inr',v_shipping,'cod_fee_inr',v_cod_fee,'total_inr',v_total,'status',case when p_payment_method='cod' then 'placed' else 'pending' end);
end $$;
revoke all on function public.create_checkout_order(uuid,uuid[],jsonb,text) from public,anon,authenticated;
grant execute on function public.create_checkout_order(uuid,uuid[],jsonb,text) to service_role;

create or replace function public.validate_checkout_coupon(p_code text,p_subtotal integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_coupon public.coupons%rowtype; v_discount integer;
begin
  select * into v_coupon from public.coupons where code=upper(trim(p_code)) and active=true and (expires_at is null or expires_at>now()) and (usage_limit is null or usage_count<usage_limit);
  if not found then raise exception 'Coupon is invalid or expired'; end if;
  if p_subtotal < v_coupon.minimum_order_inr then raise exception 'Add more items to use this coupon'; end if;
  v_discount:=case when v_coupon.discount_type='percentage' then floor(p_subtotal * least(v_coupon.discount_value,100)::numeric/100)::integer else least(p_subtotal,v_coupon.discount_value) end;
  return jsonb_build_object('code',v_coupon.code,'discount_inr',v_discount,'subtotal_inr',p_subtotal);
end $$;
revoke all on function public.validate_checkout_coupon(text,integer) from public,anon,authenticated;
grant execute on function public.validate_checkout_coupon(text,integer) to service_role;

create or replace function public.release_checkout_order(p_order_id uuid,p_final_status text default 'cancelled')
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_order public.orders%rowtype;
begin
  if p_final_status not in ('cancelled','failed') then raise exception 'Invalid final status'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if v_order.status in ('paid','placed','shipped','delivered') then return false; end if;
  update public.cart_locks set status='released' where item_id in (select item_id from public.order_items where order_id=p_order_id)
    and user_id=v_order.user_id and status='active';
  if v_order.status='pending' and v_order.coupon_code is not null then
    update public.coupons set usage_count=greatest(usage_count-1,0) where code=v_order.coupon_code;
  end if;
  update public.orders set status=p_final_status,updated_at=now() where id=p_order_id and status='pending';
  return true;
end $$;
revoke all on function public.release_checkout_order(uuid,text) from public,anon,authenticated;
grant execute on function public.release_checkout_order(uuid,text) to service_role;
