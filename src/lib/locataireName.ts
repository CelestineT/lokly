export type LocataireIdentity = {
  civilite?: string | null
  nom_famille?: string | null
  prenom?: string | null
  nom?: string | null
}

export function formatLocataireName(locataire: LocataireIdentity | null | undefined, fallback: string | number = 'Locataire') {
  const fallbackText = typeof fallback === 'string' ? fallback : 'Locataire'
  if (!locataire) return fallbackText
  const civilite = locataire.civilite?.trim()
  const nomFamille = locataire.nom_famille?.trim()
  const prenom = locataire.prenom?.trim()
  const identiteStructuree = [civilite, nomFamille, prenom].filter(Boolean).join(' ')
  return identiteStructuree || locataire.nom?.trim() || fallbackText
}
