-- Accounting AI: initial schema.
--
-- Two tables (user_settings, expenses) and one private storage bucket (receipts).
-- Row level security (RLS) is on everywhere: a signed-in user can only ever see
-- and change their own rows and files.
--
-- The CHECK lists below mirror the enums in packages/core. A unit test
-- (packages/core/src/database-schema.test.ts) fails if the two drift apart.

------------------------------------------------------------------------------
-- user_settings: the user's tax situation, one row per user.
------------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  occupation text not null default '',
  business_description text not null default '',
  gst_registered boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage their own settings"
  on public.user_settings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

------------------------------------------------------------------------------
-- expenses: one row per receipt.
------------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- processing -> needs_review (or failed) -> confirmed
  status text not null default 'processing'
    check (status in ('processing', 'needs_review', 'confirmed', 'failed')),

  merchant_name text,
  merchant_abn text check (merchant_abn ~ '^[0-9]{11}$'),
  purchase_date date,
  -- Australian financial year, named by the year it ends in: 2026-07-01 -> 2027.
  financial_year smallint generated always as (
    (extract(year from purchase_date)::int + case when extract(month from purchase_date) >= 7 then 1 else 0 end)::smallint
  ) stored,

  -- Money is always stored as whole cents.
  total_cents integer check (total_cents >= 0),
  gst_cents integer check (gst_cents >= 0 and (total_cents is null or gst_cents <= total_cents)),
  currency text not null default 'AUD' check (currency ~ '^[A-Z]{3}$'),

  category text check (category in (
    'work_car', 'work_travel', 'work_clothing', 'work_self_education', 'work_other',
    'business_equipment', 'business_software', 'business_supplies', 'business_phone_internet',
    'business_motor_vehicle', 'business_travel', 'business_advertising',
    'business_professional_fees', 'business_education', 'business_other',
    'gift_donation', 'tax_affairs', 'volunteering', 'personal'
  )),
  work_use_percent smallint not null default 100 check (work_use_percent between 0 and 100),
  is_asset boolean not null default false,

  description text not null default '',
  user_note text,
  ai_rationale text,
  low_confidence_fields text[] not null default '{}'
    check (low_confidence_fields <@ array['merchantName', 'purchaseDate', 'totalCents', 'category']),

  -- Path inside the "receipts" bucket: "<user id>/<expense id>.<ext>".
  receipt_path text not null unique,
  receipt_mime_type text not null
    check (receipt_mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),

  failure_reason text,
  -- Raw AI output plus model and token usage, kept for audit.
  extraction jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_financial_year_idx on public.expenses (user_id, financial_year);

alter table public.expenses enable row level security;

create policy "Users read their own expenses"
  on public.expenses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- The receipt must live in the user's own storage folder.
create policy "Users add their own expenses"
  on public.expenses
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and split_part(receipt_path, '/', 1) = (select auth.uid())::text
  );

create policy "Users update their own expenses"
  on public.expenses
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and split_part(receipt_path, '/', 1) = (select auth.uid())::text
  );

-- The ATO expects records to be kept for five years, so confirmed expenses
-- cannot be deleted by accident. Move one back to review first to delete it.
create policy "Users delete their own unconfirmed expenses"
  on public.expenses
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and status <> 'confirmed');

------------------------------------------------------------------------------
-- Keep updated_at current on every change.
------------------------------------------------------------------------------
create function public.set_updated_at()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- receipts bucket: private; each user reads and writes only "<their id>/...".
-- There is no update policy, so a stored receipt can never be overwritten.
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760, -- 10 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Users read their own receipts"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own receipts"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own receipts"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
