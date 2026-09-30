-- Ecolox / Lokly — rattachement des box, parkings, garages et caves
-- A executer dans Supabase SQL Editor avant de tester ce lot.

alter table lots
  add column if not exists rattachement_type text,
  add column if not exists parent_lot_id uuid references lots(id) on delete set null,
  add column if not exists locataire_externe_nom text,
  add column if not exists locataire_externe_email text;

create index if not exists lots_parent_lot_id_idx on lots(parent_lot_id);
