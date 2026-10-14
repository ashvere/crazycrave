-- Customer ratings: one per delivered order, stars for the food (shop) and the rider.

create table if not exists public.order_ratings (
  order_id bigint primary key references public.orders (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  shop_id bigint not null references public.restaurants (id) on delete cascade,
  rider_id uuid references auth.users (id) on delete set null,
  food_rating smallint not null check (food_rating between 1 and 5),
  rider_rating smallint check (rider_rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists order_ratings_shop_id_idx on public.order_ratings (shop_id);
create index if not exists order_ratings_rider_id_idx on public.order_ratings (rider_id);

alter table public.order_ratings enable row level security;

drop policy if exists "order_ratings_select_all" on public.order_ratings;
drop policy if exists "order_ratings_customer_insert" on public.order_ratings;

-- Shop averages show on the storefront, so ratings are readable by everyone.
create policy "order_ratings_select_all"
  on public.order_ratings
  for select
  to anon, authenticated
  using (true);

-- Customers rate their own order once it's delivered; shop and rider must match the order.
create policy "order_ratings_customer_insert"
  on public.order_ratings
  for insert
  to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      where o.id = order_ratings.order_id
        and o.customer_id = auth.uid()
        and (o.delivery_status = 'delivered' or o.order_status = 'completed')
        and o.shop_id = order_ratings.shop_id
        and o.rider_id is not distinct from order_ratings.rider_id
    )
    and (order_ratings.rider_id is not null or order_ratings.rider_rating is null)
  );

grant select on public.order_ratings to anon, authenticated;
grant insert on public.order_ratings to authenticated;
