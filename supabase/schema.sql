-- ═══════════════════════════════════════════════════════
-- LOKLY — Schéma Supabase
-- Colle ce SQL dans : Supabase → SQL Editor → New query
-- ═══════════════════════════════════════════════════════

-- Extension UUID (déjà active sur Supabase)
create extension if not exists "uuid-ossp";

-- ── BIENS ───────────────────────────────────────────────
create table biens (
  id               uuid primary key default uuid_generate_v4(),
  proprietaire_id  uuid references auth.users(id) on delete cascade not null,
  nom              text not null,
  adresse          text not null,
  ville            text not null,
  code_postal      text not null,
  type             text not null default 'appartement',
  type_location    text not null default 'non_meuble',  -- 'meuble' | 'non_meuble'
  surface_m2       numeric(6,2),
  nb_pieces        integer,
  prix_achat       numeric(12,2),
  created_at       timestamptz default now()
);

-- ── LOCATAIRES ──────────────────────────────────────────
create table locataires (
  id               uuid primary key default uuid_generate_v4(),
  proprietaire_id  uuid references auth.users(id) on delete cascade not null,
  bien_id          uuid references biens(id) on delete cascade not null,
  nom              text not null,
  email            text not null,
  telephone        text,
  date_entree      date not null,
  date_sortie      date,
  loyer_hc         numeric(10,2) not null,
  charges          numeric(10,2) not null default 0,
  caution          numeric(10,2) not null default 0,
  caution_payee    boolean default false,
  echeance_bail    date,
  duree_bail_ans   integer not null default 3,
  mode_paiement        text not null default 'Avant le 5',
  resilitation_anticipee boolean default false,   -- résiliation anticipée de bail
  commentaire          text,                      -- pavé commentaires libre
  actif                boolean default true,
  created_at           timestamptz default now()
);

-- ── QUITTANCES ──────────────────────────────────────────
create table quittances (
  id               uuid primary key default uuid_generate_v4(),
  proprietaire_id  uuid references auth.users(id) on delete cascade not null,
  locataire_id     uuid references locataires(id) on delete cascade not null,
  bien_id          uuid references biens(id) on delete cascade not null,
  mois             text not null,        -- format: "2026-09"
  loyer_hc         numeric(10,2) not null,
  charges          numeric(10,2) not null,
  total            numeric(10,2) not null,
  solde            numeric(10,2) not null default 0,
  caution_affichee boolean default false,
  date_signature   date not null default current_date,
  pdf_url          text,
  envoyee          boolean default false,
  commentaire      text,                      -- pavé commentaires sur la quittance
  created_at       timestamptz default now(),
  unique(locataire_id, mois)
);

-- ── DÉPENSES ────────────────────────────────────────────
create table depenses (
  id               uuid primary key default uuid_generate_v4(),
  proprietaire_id  uuid references auth.users(id) on delete cascade not null,
  bien_id          uuid references biens(id) on delete cascade not null,
  categorie        text not null,
  libelle          text not null,
  montant          numeric(10,2) not null,
  date             date not null,
  recurrente       boolean default false,
  periodicite      text,
  created_at       timestamptz default now()
);

-- ── ALERTES ─────────────────────────────────────────────
create table alertes (
  id               uuid primary key default uuid_generate_v4(),
  proprietaire_id  uuid references auth.users(id) on delete cascade not null,
  bien_id          uuid references biens(id),
  locataire_id     uuid references locataires(id),
  type             text not null,
  message          text not null,
  niveau           text not null default 'info',
  lue              boolean default false,
  created_at       timestamptz default now()
);

-- ── ROW LEVEL SECURITY (RLS) ────────────────────────────
-- Chaque utilisateur ne voit QUE ses propres données

alter table biens       enable row level security;
alter table locataires  enable row level security;
alter table quittances  enable row level security;
alter table depenses    enable row level security;
alter table alertes     enable row level security;

-- Policies : accès uniquement au propriétaire
create policy "proprio_biens"      on biens      for all using (auth.uid() = proprietaire_id);
create policy "proprio_locataires" on locataires  for all using (auth.uid() = proprietaire_id);
create policy "proprio_quittances" on quittances  for all using (auth.uid() = proprietaire_id);
create policy "proprio_depenses"   on depenses    for all using (auth.uid() = proprietaire_id);
create policy "proprio_alertes"    on alertes     for all using (auth.uid() = proprietaire_id);
