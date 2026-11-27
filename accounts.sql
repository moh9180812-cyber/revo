-- شغّل الملف ده مرة واحدة في Supabase > SQL Editor (بعد schema.sql)
-- حسابات الزباين: كل زبون يشوف بياناته وطلباته هو بس، وصاحب المتجر بس يشوف الكل.
-- Customer accounts: each customer sees only their own data. Only the owner sees everything.

-- 1) مين هو صاحب المتجر؟ جدول صغير فيه إيميل الأدمن (التغيير في مكان واحد بس).
-- لتغيير الأدمن: شغّل  insert into owners values ('الإيميل-الجديد');  و  delete from owners where email = 'الإيميل-القديم';
create table if not exists public.owners (email text primary key);
alter table public.owners enable row level security;
revoke all on public.owners from anon, authenticated;  -- من غير policies: محدش من الموقع يقدر يقراه
insert into public.owners values ('boulder5353@gmail.com') on conflict do nothing;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users u join public.owners o on o.email = u.email
                 where u.id = auth.uid());
$$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- 2) جدول بيانات الزبون (الاسم والموبايل والعنوان)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  phone text default '',
  city text default '',
  address text default '',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select, insert, update on public.profiles to authenticated;

-- 3) ربط الطلب بالزبون (اختياري: الزائر من غير حساب لسه يقدر يطلب)
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;

drop policy if exists "customers can insert" on public.orders;
drop policy if exists "owner can read" on public.orders;
drop policy if exists "owner can update" on public.orders;
drop policy if exists "insert orders" on public.orders;
drop policy if exists "read orders" on public.orders;
drop policy if exists "owner update orders" on public.orders;

create policy "insert orders" on public.orders for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));
create policy "read orders" on public.orders for select to authenticated
  using (public.is_owner() or user_id = auth.uid());
create policy "owner update orders" on public.orders for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
