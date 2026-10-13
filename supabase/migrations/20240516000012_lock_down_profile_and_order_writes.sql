-- Security: stop signed-in users from editing columns they must not control.
--
-- 1. profiles: `profiles_update_own` let any user PATCH their own row, including
--    `role` and `approval_status` — i.e. a customer could promote themselves to admin
--    with the public anon key. Users may now only change their display name.
-- 2. orders: customer/rider UPDATE policies allowed any column on rows they can see
--    (e.g. a customer setting `total` or `payment_status = 'paid'`). A trigger now
--    limits customers to cancelling, and riders to delivery fields.
-- Staff (admin / restaurant) and the service role (server code, SQL editor) are unaffected.

revoke update on public.profiles from anon, authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

create or replace function public.orders_guard_update ()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  caller_role text;
  changed text[];
begin
  -- Service role / SQL editor / server-side code with the service key.
  if uid is null then
    return new;
  end if;

  caller_role := public.auth_profile_role();
  if caller_role in ('admin', 'restaurant') then
    return new;
  end if;

  select coalesce(array_agg(n.key), '{}')
    into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value;

  if caller_role = 'rider' then
    if not changed <@ array[
      'delivery_status', 'order_status', 'payment_status', 'rider_id',
      'delivery_proof_url', 'delivery_proof_note', 'delivery_proof_at'
    ] then
      raise exception 'Riders may only update delivery fields' using errcode = '42501';
    end if;
    if new.rider_id is distinct from old.rider_id
       and not (old.rider_id is null and new.rider_id = uid) then
      raise exception 'Riders may only claim unassigned orders for themselves' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Customers: cancel only, and only while the order is still cancellable
  -- (mirrors customerCanCancel in web/lib/customer-orders.ts).
  if not changed <@ array['order_status', 'cancel_reason', 'cancelled_at']
     or new.order_status is distinct from 'cancelled'
     or old.order_status in ('completed', 'cancelled')
     or coalesce(old.delivery_status, '') in ('picked_up', 'on_the_way', 'delivered')
     or not (
       old.order_status in ('pending', 'preparing')
       or (old.order_status = 'delivering' and coalesce(old.delivery_status, '') in ('assigned', ''))
     )
  then
    raise exception 'Customers may only cancel their own pending orders' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;

create trigger orders_guard_update
  before update on public.orders
  for each row
  execute function public.orders_guard_update ();
