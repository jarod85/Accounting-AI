-- Row level security and constraint tests. Run with: npm run db:test
-- (needs Docker and `supabase start`). Everything runs in a transaction that is
-- rolled back, so the local database is left unchanged.
begin;

select plan(19);

-- Two users: Alice owns the data, Bob tries to reach it.
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-------------------------------------------------------------------------------
-- Alice can manage her own expenses.
-------------------------------------------------------------------------------
select pg_temp.sign_in_as('11111111-1111-1111-1111-111111111111');
set local role authenticated;

select lives_ok(
  $$ insert into public.expenses (id, receipt_path, receipt_mime_type, purchase_date, status, category)
     values ('aaaaaaaa-0000-0000-0000-000000000001',
             '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001.jpg',
             'image/jpeg', '2026-07-01', 'confirmed', 'work_other') $$,
  'Alice can add an expense in her own folder'
);

select lives_ok(
  $$ insert into public.expenses (id, receipt_path, receipt_mime_type, purchase_date)
     values ('aaaaaaaa-0000-0000-0000-000000000002',
             '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000002.pdf',
             'application/pdf', '2026-06-30') $$,
  'Alice can add a second expense'
);

select is(
  (select count(*)::int from public.expenses), 2,
  'Alice sees both of her expenses'
);

select is(
  (select user_id from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the signed-in user'
);

select throws_ok(
  $$ insert into public.expenses (receipt_path, receipt_mime_type)
     values ('22222222-2222-2222-2222-222222222222/x.jpg', 'image/jpeg') $$,
  '42501', null,
  'Alice cannot point an expense at a receipt in Bob''s folder'
);

select lives_ok(
  $$ insert into public.user_settings (occupation) values ('Nurse') $$,
  'Alice can save her settings'
);

-------------------------------------------------------------------------------
-- Generated financial year and CHECK constraints.
-------------------------------------------------------------------------------
select is(
  (select financial_year::int from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  2027,
  '1 July 2026 is in financial year 2027 (2026-27)'
);

select is(
  (select financial_year::int from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  2026,
  '30 June 2026 is in financial year 2026 (2025-26)'
);

select throws_ok(
  $$ update public.expenses set category = 'snacks' where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  '23514', null,
  'An unknown category is rejected'
);

select throws_ok(
  $$ update public.expenses set total_cents = 1000, gst_cents = 2000 where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  '23514', null,
  'GST larger than the total is rejected'
);

select throws_ok(
  $$ update public.expenses set work_use_percent = 101 where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  '23514', null,
  'Work use above 100% is rejected'
);

-------------------------------------------------------------------------------
-- Confirmed expenses cannot be deleted (five-year record keeping).
-------------------------------------------------------------------------------
delete from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 1,
  'A confirmed expense is not deleted'
);

delete from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select is(
  (select count(*)::int from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000002'), 0,
  'An unconfirmed expense can be deleted'
);

-------------------------------------------------------------------------------
-- Receipt storage: Alice's folder only.
-------------------------------------------------------------------------------
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('receipts', '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001.jpg') $$,
  'Alice can upload into her own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('receipts', '22222222-2222-2222-2222-222222222222/sneaky.jpg') $$,
  '42501', null,
  'Alice cannot upload into Bob''s folder'
);

-------------------------------------------------------------------------------
-- Bob cannot see or change anything of Alice's.
-------------------------------------------------------------------------------
reset role;
select pg_temp.sign_in_as('22222222-2222-2222-2222-222222222222');
set local role authenticated;

select is((select count(*)::int from public.expenses), 0, 'Bob sees none of Alice''s expenses');
select is((select count(*)::int from public.user_settings), 0, 'Bob sees none of Alice''s settings');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'receipts'), 0,
  'Bob sees none of Alice''s receipts'
);

update public.expenses set merchant_name = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select is(
  (select merchant_name from public.expenses where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'Bob''s update of Alice''s expense changes nothing'
);

select * from finish();
rollback;
