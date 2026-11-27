-- شغّل الملف ده مرة واحدة في Supabase > SQL Editor
create table if not exists orders (
  id uuid primary key,
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  notes text default '',
  items jsonb not null,
  total numeric not null,
  status text not null default 'new'
);

alter table orders enable row level security;

-- أي زبون يقدر يضيف طلب (بس)
create policy "customers can insert" on orders for insert to anon
  with check (status = 'new');

-- صاحب المتجر (مسجّل دخول) بس يقدر يقرا ويعدّل
create policy "owner can read" on orders for select to authenticated using (true);
create policy "owner can update" on orders for update to authenticated using (true);
