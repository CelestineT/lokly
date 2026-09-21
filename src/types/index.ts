// ── Types Lokly ────────────────────────────────────────────

export type Bien = {
  id: string
  proprietaire_id: string
  nom: string           // ex: "APT1 Émile Zola"
  adresse: string
  ville: string
  code_postal: string
  type: 'appartement' | 'maison' | 'studio' | 'autre'
  type_location: 'meuble' | 'non_meuble'
  surface_m2: number | null
  nb_pieces: number | null
  prix_achat: number | null
  created_at: string
}

export type Locataire = {
  id: string
  proprietaire_id: string
  bien_id: string
  nom: string
  email: string
  telephone: string | null
  date_entree: string       // ISO date
  date_sortie: string | null
  loyer_hc: number
  charges: number
  caution: number
  caution_payee: boolean
  echeance_bail: string | null  // ISO date
  duree_bail_ans: number
  mode_paiement: string         // ex: "Avant le 5"
  resilitation_anticipee: boolean
  commentaire: string | null
  actif: boolean
  created_at: string
}

export type Quittance = {
  id: string
  proprietaire_id: string
  locataire_id: string
  bien_id: string
  mois: string          // ex: "2026-09"
  loyer_hc: number
  charges: number
  total: number
  solde: number
  caution_affichee: boolean
  date_signature: string
  pdf_url: string | null
  envoyee: boolean
  commentaire: string | null
  created_at: string
}

export type Depense = {
  id: string
  proprietaire_id: string
  bien_id: string
  categorie: 'credit' | 'assurance' | 'taxe_fonciere' | 'travaux' | 'gestion' | 'autre'
  libelle: string
  montant: number
  date: string
  recurrente: boolean
  periodicite: 'mensuelle' | 'annuelle' | null
  created_at: string
}

export type Alerte = {
  id: string
  proprietaire_id: string
  bien_id: string | null
  locataire_id: string | null
  type: 'bail_expiration' | 'loyer_retard' | 'caution_manquante' | 'autre'
  message: string
  niveau: 'info' | 'warning' | 'danger'
  lue: boolean
  created_at: string
}
