import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'

export const MOIS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

export function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const m = MOIS_FR[Number(month) - 1]
  return m ? `${m.charAt(0).toUpperCase()}${m.slice(1)} ${year}` : mois
}

export function cleanPdfText(value: string): string {
  return String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, ' ').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

function eur(n: number): string {
  const sign = n < 0 ? '-' : ''
  const value = Math.abs(Number(n || 0)).toFixed(2).replace('.', ',')
  const [integer, decimals] = value.split(',')
  return `${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${decimals} EUR`
}

function drawWrappedText(page: any, text: string, x: number, y: number, maxWidth: number, font: PDFFont, size: number, color: any, lineHeight = size + 3): number {
  const words = cleanPdfText(text).split(' ')
  let line = ''
  const lines: string[] = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) { lines.push(line); line = word } else line = test
  }
  if (line) lines.push(line)
  for (const item of lines) { page.drawText(item, { x, y, size, font, color }); y -= lineHeight }
  return y
}

export interface QuittancePdfData {
  locataireNom: string
  locataireEmail: string
  proprietaireNom: string
  proprietaireEmail: string
  bienAdresse: string
  bienVille: string
  bienNom: string
  mois: string
  reference: string
  loyerHc: number
  charges: number
  solde: number
  total: number
  signatureDataUrl?: string
  dateSignature: string
}

export async function generateQuittancePdf(params: QuittancePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.035, 0.075, 0.16), blue = rgb(0.11, 0.22, 0.86), blueSoft = rgb(0.94, 0.96, 1)
  const blueLine = rgb(0.77, 0.82, 1), slate = rgb(0.34, 0.41, 0.52), lightText = rgb(0.47, 0.55, 0.67)
  const border = rgb(0.86, 0.89, 0.93), soft = rgb(0.975, 0.98, 0.99), white = rgb(1, 1, 1)
  const margin = 42, contentWidth = width - margin * 2

  page.drawText('EKOLOCS', { x: margin, y: height - 54, size: 21, font: bold, color: blue })
  page.drawText('Gestion locative', { x: margin, y: height - 70, size: 8.5, font: regular, color: lightText })
  page.drawText('QUITTANCE DE LOYER', { x: 210, y: height - 55, size: 17, font: bold, color: navy })
  page.drawText(formatMois(params.mois), { x: 210, y: height - 74, size: 10.5, font: regular, color: slate })
  const refLabel = `Reference : ${params.reference}`
  page.drawText(refLabel, { x: width - margin - regular.widthOfTextAtSize(refLabel, 8), y: height - 72, size: 8, font: regular, color: lightText })
  page.drawLine({ start: { x: margin, y: height - 92 }, end: { x: width - margin, y: height - 92 }, thickness: 1.5, color: blue })

  const cardsY = height - 112, cardH = 92, gap = 12, cardW = (contentWidth - gap) / 2
  page.drawRectangle({ x: margin, y: cardsY - cardH, width: cardW, height: cardH, color: soft, borderColor: border, borderWidth: 0.8 })
  page.drawRectangle({ x: margin + cardW + gap, y: cardsY - cardH, width: cardW, height: cardH, color: soft, borderColor: border, borderWidth: 0.8 })
  page.drawText('INFORMATIONS DU BAILLEUR', { x: margin + 14, y: cardsY - 20, size: 8, font: bold, color: blue })
  page.drawText(params.proprietaireNom || '-', { x: margin + 14, y: cardsY - 42, size: 11, font: bold, color: navy })
  if (params.proprietaireEmail) page.drawText(params.proprietaireEmail, { x: margin + 14, y: cardsY - 60, size: 8.5, font: regular, color: slate })
  const rightX = margin + cardW + gap
  page.drawText('INFORMATIONS DU LOCATAIRE', { x: rightX + 14, y: cardsY - 20, size: 8, font: bold, color: blue })
  page.drawText(params.locataireNom || '-', { x: rightX + 14, y: cardsY - 42, size: 11, font: bold, color: navy })
  if (params.locataireEmail) page.drawText(params.locataireEmail, { x: rightX + 14, y: cardsY - 60, size: 8.5, font: regular, color: slate })

  let y = cardsY - cardH - 18
  page.drawRectangle({ x: margin, y: y - 64, width: contentWidth, height: 64, color: blueSoft, borderColor: blueLine, borderWidth: 0.8 })
  page.drawText('BIEN LOUE', { x: margin + 14, y: y - 18, size: 8, font: bold, color: blue })
  page.drawText(params.bienNom || 'Bien loue', { x: margin + 14, y: y - 38, size: 11, font: bold, color: navy })
  page.drawText(cleanPdfText(`${params.bienAdresse}${params.bienVille ? ` - ${params.bienVille}` : ''}`), { x: margin + 14, y: y - 54, size: 8.5, font: regular, color: slate })

  y -= 84
  page.drawText('DETAIL DU REGLEMENT', { x: margin, y, size: 9, font: bold, color: navy }); y -= 16
  const tableX = margin, tableW = contentWidth, amountW = 125, labelW = tableW - amountW, rowH = 27
  page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: navy })
  page.drawText('LIBELLE', { x: tableX + 12, y: y - 18, size: 8, font: bold, color: white })
  page.drawText('MONTANT', { x: tableX + labelW + 12, y: y - 18, size: 8, font: bold, color: white }); y -= rowH
  const rows = [{ label: 'Loyer hors charges', value: params.loyerHc }, { label: 'Charges', value: params.charges }]
  if (params.solde !== 0) rows.push({ label: 'Solde anterieur', value: params.solde })
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: i % 2 === 0 ? white : soft, borderColor: border, borderWidth: 0.5 })
    page.drawLine({ start: { x: tableX + labelW, y }, end: { x: tableX + labelW, y: y - rowH }, thickness: 0.5, color: border })
    page.drawText(row.label, { x: tableX + 12, y: y - 18, size: 9, font: regular, color: slate })
    const value = eur(row.value)
    page.drawText(value, { x: tableX + tableW - 12 - regular.widthOfTextAtSize(value, 9), y: y - 18, size: 9, font: regular, color: navy }); y -= rowH
  }
  for (const label of ['Lot annexe / complement', 'Regularisation des charges']) {
    page.drawRectangle({ x: tableX, y: y - 22, width: tableW, height: 22, color: white, borderColor: border, borderWidth: 0.5 })
    page.drawLine({ start: { x: tableX + labelW, y }, end: { x: tableX + labelW, y: y - 22 }, thickness: 0.5, color: border })
    page.drawText(label, { x: tableX + 12, y: y - 15, size: 7.5, font: regular, color: lightText })
    page.drawText('-', { x: tableX + tableW - 18, y: y - 15, size: 8, font: regular, color: lightText }); y -= 22
  }
  page.drawRectangle({ x: tableX, y: y - 34, width: tableW, height: 34, color: blueSoft, borderColor: blueLine, borderWidth: 0.8 })
  page.drawText('TOTAL RECU', { x: tableX + 12, y: y - 22, size: 10, font: bold, color: navy })
  const totalText = eur(params.total)
  page.drawText(totalText, { x: tableX + tableW - 12 - bold.widthOfTextAtSize(totalText, 11), y: y - 22, size: 11, font: bold, color: blue }); y -= 52

  page.drawText('INFORMATIONS COMPLEMENTAIRES', { x: margin, y, size: 8, font: bold, color: blue }); y -= 14
  page.drawRectangle({ x: margin, y: y - 46, width: contentWidth, height: 46, color: soft, borderColor: border, borderWidth: 0.6 })
  page.drawText('Mode de paiement', { x: margin + 12, y: y - 17, size: 7.5, font: bold, color: lightText })
  page.drawText('A renseigner', { x: margin + 12, y: y - 34, size: 8.5, font: regular, color: slate })
  page.drawText('Commentaire', { x: margin + 190, y: y - 17, size: 7.5, font: bold, color: lightText })
  page.drawText('Aucun commentaire', { x: margin + 190, y: y - 34, size: 8.5, font: regular, color: slate }); y -= 64

  const legal = `Je soussigne(e), ${params.proprietaireNom}, bailleur du logement designe ci-dessus, declare avoir recu de ${params.locataireNom} la somme de ${eur(params.total)} au titre du loyer et des charges du mois de ${formatMois(params.mois)}, et lui en donne quittance, sous reserve de tous mes droits.`
  y = drawWrappedText(page, legal, margin, y, contentWidth, regular, 8.2, slate, 11); y -= 13
  const bottomCardH = 78, bottomW = (contentWidth - gap) / 2
  page.drawRectangle({ x: margin, y: y - bottomCardH, width: bottomW, height: bottomCardH, color: soft, borderColor: border, borderWidth: 0.6 })
  page.drawText('COORDONNEES BANCAIRES', { x: margin + 12, y: y - 17, size: 7.5, font: bold, color: blue })
  page.drawText('IBAN : a renseigner dans les parametres', { x: margin + 12, y: y - 37, size: 7.5, font: regular, color: slate })
  page.drawText('BIC : a renseigner dans les parametres', { x: margin + 12, y: y - 53, size: 7.5, font: regular, color: slate })
  const sigX = margin + bottomW + gap
  page.drawRectangle({ x: sigX, y: y - bottomCardH, width: bottomW, height: bottomCardH, color: white, borderColor: border, borderWidth: 0.6 })
  page.drawText(`Fait le ${params.dateSignature}`, { x: sigX + 12, y: y - 17, size: 7.5, font: regular, color: slate })
  page.drawText('Signature du bailleur', { x: sigX + 12, y: y - 33, size: 7.5, font: bold, color: navy })
  if (params.signatureDataUrl?.includes('base64,')) {
    try {
      const bytes = Buffer.from(params.signatureDataUrl.split('base64,')[1], 'base64')
      let image
      try { image = await pdfDoc.embedPng(bytes) } catch { image = await pdfDoc.embedJpg(bytes) }
      const dims = image.scaleToFit(bottomW - 30, 34)
      page.drawImage(image, { x: sigX + 12, y: y - 70, width: dims.width, height: dims.height })
    } catch (error) { console.error('Erreur signature PDF:', error) }
  }
  page.drawText('Ekolocs - Quittance generee automatiquement', { x: margin, y: 24, size: 6.8, font: regular, color: lightText })
  page.drawText(params.reference, { x: width - margin - regular.widthOfTextAtSize(params.reference, 6.8), y: 24, size: 6.8, font: regular, color: lightText })
  return pdfDoc.save()
}
