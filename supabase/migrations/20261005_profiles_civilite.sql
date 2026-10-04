alter table public.profiles
  add column if not exists civilite text;

alter table public.profiles
  drop constraint if exists profiles_civilite_check;

alter table public.profiles
  add constraint profiles_civilite_check
  check (civilite is null or civilite in ('M.', 'Mme'));
