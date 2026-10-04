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
  proprietaireTelephone?: string
  bienAdresse: string
  bienVille: string
  bienNom: string
  lotNom?: string
  typeLogement?: string
  specificiteLogement?: string
  surface?: number | string
  mois: string
  reference: string
  loyerHc: number
  charges: number
  solde: number
  total: number
  fraisAnnexes?: number
  regularisationCharges?: number
  modePaiement?: string
  commentaire?: string
  iban?: string
  bic?: string
  signatureDataUrl?: string
  dateSignature: string
}

export async function generateQuittancePdf(params: QuittancePdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const { width, height } = page.getSize()
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.035, 0.075, 0.16), blue = rgb(0.11, 0.22, 0.86), slate = rgb(0.34, 0.41, 0.52)
  const lightText = rgb(0.47, 0.55, 0.67), border = rgb(0.82, 0.86, 0.92), soft = rgb(0.975, 0.98, 0.99)
  const blueSoft = rgb(0.96, 0.97, 1), white = rgb(1, 1, 1)
  const margin = 42, contentWidth = width - margin * 2, gap = 10

  page.drawText('EKOLOCS', { x: margin, y: height - 48, size: 20, font: bold, color: blue })
  page.drawText('Gestion locative', { x: margin, y: height - 63, size: 8, font: regular, color: lightText })
  const title = 'QUITTANCE DE LOYER'
  const titleSize = 16
  const titleX = width - margin - bold.widthOfTextAtSize(title, titleSize)
  page.drawText(title, { x: titleX, y: height - 48, size: titleSize, font: bold, color: navy })
  const period = formatMois(params.mois)
  page.drawText(period, { x: width - margin - regular.widthOfTextAtSize(period, 9.5), y: height - 64, size: 9.5, font: regular, color: slate })
  const ref = `N° quittance : ${params.reference}`
  page.drawText(ref, { x: width - margin - regular.widthOfTextAtSize(ref, 7.5), y: height - 76, size: 7.5, font: regular, color: lightText })
  page.drawLine({ start: { x: margin, y: height - 88 }, end: { x: width - margin, y: height - 88 }, thickness: 1.2, color: blue })

  const infoY = height - 106, infoH = 78, infoW = (contentWidth - gap) / 2
  page.drawRectangle({ x: margin, y: infoY - infoH, width: infoW, height: infoH, color: white, borderColor: border, borderWidth: 0.7 })
  page.drawRectangle({ x: margin + infoW + gap, y: infoY - infoH, width: infoW, height: infoH, color: white, borderColor: border, borderWidth: 0.7 })
  page.drawText('INFORMATIONS DU BAILLEUR', { x: margin + 12, y: infoY - 17, size: 7.5, font: bold, color: blue })
  page.drawText(params.proprietaireNom || '-', { x: margin + 12, y: infoY - 35, size: 10, font: bold, color: navy })
  if (params.proprietaireTelephone) page.drawText(params.proprietaireTelephone, { x: margin + 12, y: infoY - 50, size: 8, font: regular, color: slate })
  if (params.proprietaireEmail) page.drawText(params.proprietaireEmail, { x: margin + 12, y: infoY - 64, size: 8, font: regular, color: slate })
  const locX = margin + infoW + gap
  page.drawText('INFORMATIONS DU LOCATAIRE', { x: locX + 12, y: infoY - 17, size: 7.5, font: bold, color: blue })
  page.drawText(params.locataireNom || '-', { x: locX + 12, y: infoY - 35, size: 10, font: bold, color: navy })
  if (params.locataireEmail) page.drawText(params.locataireEmail, { x: locX + 12, y: infoY - 52, size: 8, font: regular, color: slate })

  let y = infoY - infoH - 14
  const propertyH = 66, propertyW = (contentWidth - gap * 2) / 3
  const blocks = [
    { title: 'IMMEUBLE', lines: [params.bienNom || '-'] },
    { title: 'ADRESSE DE LA LOCATION', lines: [params.bienAdresse || '-', params.bienVille || ''] },
    { title: 'TYPE DE LOGEMENT', lines: [params.typeLogement || 'À renseigner', params.specificiteLogement || params.lotNom || '', params.surface ? `${params.surface} m²` : ''] },
  ]
  blocks.forEach((block, index) => {
    const x = margin + index * (propertyW + gap)
    page.drawRectangle({ x, y: y - propertyH, width: propertyW, height: propertyH, color: blueSoft, borderColor: border, borderWidth: 0.7 })
    page.drawText(block.title, { x: x + 10, y: y - 16, size: 6.8, font: bold, color: blue })
    let lineY = y - 34
    block.lines.filter(Boolean).slice(0, 3).forEach((line, i) => {
      page.drawText(cleanPdfText(String(line)), { x: x + 10, y: lineY, size: i === 0 ? 8.5 : 7.5, font: i === 0 ? bold : regular, color: i === 0 ? navy : slate })
      lineY -= 13
    })
  })

  y -= propertyH + 14
  const financeH = 180, messageW = 150, financeX = margin + messageW + gap, financeW = contentWidth - messageW - gap
  page.drawRectangle({ x: margin, y: y - financeH, width: messageW, height: financeH, color: white, borderColor: border, borderWidth: 0.7 })
  page.drawText('MESSAGE / INFORMATIONS', { x: margin + 10, y: y - 17, size: 7, font: bold, color: blue })
  drawWrappedText(page, params.commentaire || 'Aucune information complémentaire.', margin + 10, y - 37, messageW - 20, regular, 7.5, slate, 10)

  page.drawText('LIBELLÉ', { x: financeX + 10, y: y - 15, size: 7, font: bold, color: navy })
  page.drawText('MONTANT HT', { x: financeX + financeW - 122, y: y - 15, size: 6.5, font: bold, color: navy })
  page.drawText('MONTANT TTC', { x: financeX + financeW - 62, y: y - 15, size: 6.5, font: bold, color: navy })
  page.drawRectangle({ x: financeX, y: y - financeH, width: financeW, height: financeH, borderColor: border, borderWidth: 0.7 })
  const col1 = financeX + financeW - 135, col2 = financeX + financeW - 70
  page.drawLine({ start: { x: col1, y }, end: { x: col1, y: y - financeH }, thickness: 0.5, color: border })
  page.drawLine({ start: { x: col2, y }, end: { x: col2, y: y - financeH }, thickness: 0.5, color: border })
  const financialRows: Array<{ label: string; value?: number; detail?: string }> = [
    { label: 'Loyer', value: params.loyerHc },
    { label: 'Charges (acompte)', value: params.charges, detail: 'Eau / gaz / électricité / internet selon sélection' },
    { label: `Solde dû${params.mois ? ` au ${formatMois(params.mois)}` : ''}`, value: params.solde || undefined },
    { label: 'Frais annexes', value: params.fraisAnnexes },
    { label: 'Régularisation des charges', value: params.regularisationCharges },
  ]
  const headerH = 25, rowH = 25
  let rowTop = y - headerH
  page.drawLine({ start: { x: financeX, y: rowTop }, end: { x: financeX + financeW, y: rowTop }, thickness: 0.6, color: border })
  for (const row of financialRows) {
    const labelY = rowTop - 16
    page.drawText(row.label, { x: financeX + 10, y: labelY, size: 7.2, font: regular, color: slate })
    if (row.detail) page.drawText(row.detail, { x: financeX + 10, y: labelY - 8, size: 5.3, font: regular, color: lightText })
    if (row.value !== undefined && Number(row.value) !== 0) {
      const value = eur(Number(row.value))
      page.drawText(value, { x: financeX + financeW - 8 - regular.widthOfTextAtSize(value, 7), y: labelY, size: 7, font: regular, color: navy })
    }
    rowTop -= rowH
    page.drawLine({ start: { x: financeX, y: rowTop }, end: { x: financeX + financeW, y: rowTop }, thickness: 0.5, color: border })
  }
  const totalY = y - financeH + 8
  page.drawText('TOTAL ÉCHÉANCE', { x: financeX + 10, y: totalY, size: 8.5, font: bold, color: navy })
  const totalText = eur(params.total)
  page.drawText(totalText, { x: financeX + financeW - 8 - bold.widthOfTextAtSize(totalText, 9), y: totalY, size: 9, font: bold, color: blue })

  y -= financeH + 13
  page.drawText('MODE DE PAIEMENT', { x: margin, y, size: 7, font: bold, color: blue })
  page.drawText(params.modePaiement || 'À renseigner', { x: margin + 100, y, size: 7.5, font: regular, color: slate })

  // Zone volontairement libre pour accueillir un cachet « PAYÉ ».
  y -= 12
  const stampH = 48
  page.drawRectangle({ x: margin, y: y - stampH, width: contentWidth, height: stampH, color: white, borderColor: border, borderWidth: 0.6 })
  page.drawText('CACHET PAYÉ', { x: margin + 10, y: y - 16, size: 7, font: bold, color: lightText })

  y -= stampH + 10
  const bottomH = 72, bankW = (contentWidth - gap) / 2
  page.drawRectangle({ x: margin, y: y - bottomH, width: bankW, height: bottomH, color: soft, borderColor: border, borderWidth: 0.6 })
  page.drawText('COORDONNÉES BANCAIRES', { x: margin + 10, y: y - 16, size: 7, font: bold, color: blue })
  page.drawText(`BIC : ${params.bic || 'à renseigner dans les paramètres'}`, { x: margin + 10, y: y - 35, size: 7, font: regular, color: slate })
  page.drawText(`IBAN : ${params.iban || 'à renseigner dans les paramètres'}`, { x: margin + 10, y: y - 51, size: 7, font: regular, color: slate })
  const sigX = margin + bankW + gap
  page.drawRectangle({ x: sigX, y: y - bottomH, width: bankW, height: bottomH, color: white, borderColor: border, borderWidth: 0.6 })
  page.drawText(`Fait le ${params.dateSignature}`, { x: sigX + 10, y: y - 16, size: 7, font: regular, color: slate })
  page.drawText('Signature du bailleur', { x: sigX + 10, y: y - 31, size: 7, font: bold, color: navy })
  if (params.signatureDataUrl?.includes('base64,')) {
    try {
      const bytes = Buffer.from(params.signatureDataUrl.split('base64,')[1], 'base64')
      let image
      try { image = await pdfDoc.embedPng(bytes) } catch { image = await pdfDoc.embedJpg(bytes) }
      const dims = image.scaleToFit(bankW - 30, 31)
      page.drawImage(image, { x: sigX + 10, y: y - 67, width: dims.width, height: dims.height })
    } catch (error) { console.error('Erreur signature PDF:', error) }
  }
  page.drawText('Ekolocs - Quittance générée automatiquement', { x: margin, y: 22, size: 6.5, font: regular, color: lightText })
  page.drawText(params.reference, { x: width - margin - regular.widthOfTextAtSize(params.reference, 6.5), y: 22, size: 6.5, font: regular, color: lightText })
  return pdfDoc.save()
}
