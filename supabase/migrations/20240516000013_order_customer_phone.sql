-- Customer contact number on each order (riders need to call/text the customer).

alter table public.orders
  add column if not exists customer_phone text;
