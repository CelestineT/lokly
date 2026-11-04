create table public.account_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 kind text not null check (kind in ('legacy','trial','lifetime')),
 trial_ends_at timestamptz,
 created_at timestamptz not null default now(),
 check ((kind='trial' and trial_ends_at is not null) or (kind<>'trial' and trial_ends_at is null))
);
alter table public.account_access enable row level security;
revoke all on public.account_access from public,anon,authenticated;
grant select on public.account_access to authenticated;
grant all on public.account_access to service_role;
create policy account_access_own_read on public.account_access for select to authenticated using ((select auth.uid())=user_id);

create table public.billing_test_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 stripe_subscription_id text not null unique,
 stripe_customer_id text not null,
 plan text not null check (plan in ('essentiel','patrimoine','investisseur')),
 status text not null,
 updated_at timestamptz not null default now()
);
alter table public.billing_test_subscriptions enable row level security;
revoke all on public.billing_test_subscriptions from public,anon,authenticated;
grant select on public.billing_test_subscriptions to authenticated;
grant all on public.billing_test_subscriptions to service_role;
create policy billing_test_own_read on public.billing_test_subscriptions for select to authenticated using ((select auth.uid())=user_id);

-- Preserve every existing account, independently of any Stripe test.
insert into public.account_access(user_id,kind) select id,'legacy' from auth.users on conflict do nothing;
create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;
create function app_private.initialize_account_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.account_access(user_id,kind,trial_ends_at)
 values(new.id,'trial',now()+interval '30 days') on conflict do nothing;
 return new;
end;
$$;
revoke all on function app_private.initialize_account_access() from public,anon,authenticated;
create trigger initialize_commercial_access after insert on auth.users
 for each row execute function app_private.initialize_account_access();
