-- Separate live billing state. Run once; preserve the existing sandbox tables.
create table if not exists public.billing_subscriptions (user_id uuid primary key references auth.users(id) on delete cascade,stripe_subscription_id text unique not null,stripe_customer_id text not null,plan text not null check(plan in ('essentiel','patrimoine','investisseur')),status text not null,interval text not null check(interval in ('month','year')),current_period_end timestamptz,cancel_at_period_end boolean not null default false,updated_at timestamptz not null default now());
alter table public.billing_subscriptions enable row level security;
revoke all on public.billing_subscriptions from anon,authenticated;
grant select on public.billing_subscriptions to authenticated;
grant all on public.billing_subscriptions to service_role;
drop policy if exists billing_subscriptions_own_read on public.billing_subscriptions;
create policy billing_subscriptions_own_read on public.billing_subscriptions for select to authenticated using ((select auth.uid())=user_id);
create table if not exists public.billing_checkout_sessions(
user_id uuid primary key references auth.users(id) on delete cascade,
token uuid not null,lock_until timestamptz not null,
session_id text,session_url text,expires_at timestamptz,
plan text,interval text
);
alter table public.billing_checkout_sessions enable row level security;
revoke all on public.billing_checkout_sessions from anon,authenticated;
grant all on public.billing_checkout_sessions to service_role;
create or replace function public.reserve_billing_checkout(p_user_id uuid,p_token uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.billing_checkout_sessions%rowtype;
begin
 insert into public.billing_checkout_sessions(user_id,token,lock_until) values(p_user_id,p_token,now()+interval '60 seconds') on conflict do nothing;
 select * into r from public.billing_checkout_sessions where user_id=p_user_id for update;
 if r.token=p_token then return jsonb_build_object('state','reserved');end if;
 if r.session_url is not null and r.expires_at>now()+interval '30 seconds' then return jsonb_build_object('state','existing','url',r.session_url,'session_id',r.session_id,'plan',r.plan,'interval',r.interval);end if;
 if r.lock_until>now() then return jsonb_build_object('state','busy');end if;
 update public.billing_checkout_sessions set token=p_token,lock_until=now()+interval '60 seconds',session_id=null,session_url=null,expires_at=null where user_id=p_user_id;
 return jsonb_build_object('state','reserved');
end $$;
revoke all on function public.reserve_billing_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_billing_checkout(uuid,uuid) to service_role;