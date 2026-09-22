import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

interface QuittanceData {
  locataireNom: string
  locataireEmail: string
  bienAdresse: string
  mois: string
  loyerHc: number
  charges: number
  solde: number
  total: number
  proprietaireNom: string
  dateSignature: string
}

export async function generateQuittancePdf(data: QuittanceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const margin = 50

  // Titre
  page.drawText('QUITTANCE DE LOYER', {
    x: margin,
    y: height - 80,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.5),
  })

  // Mois
  page.drawText(`Période : ${data.mois}`, {
    x: margin,
    y: height - 110,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  // Ligne séparatrice
  page.drawLine({
    start: { x: margin, y: height - 125 },
    end: { x: width - margin, y: height - 125 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })

  // Bailleur
  page.drawText('BAILLEUR', { x: margin, y: height - 155, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) })
  page.drawText(data.proprietaireNom, { x: margin, y: height - 172, size: 12, font })

  // Locataire
  page.drawText('LOCATAIRE', { x: margin, y: height - 210, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) })
  page.drawText(data.locataireNom, { x: margin, y: height - 227, size: 12, font })

  // Bien
  page.drawText('BIEN LOUÉ', { x: margin, y: height - 265, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) })
  page.drawText(data.bienAdresse, { x: margin, y: height - 282, size: 12, font })

  // Ligne séparatrice
  page.drawLine({
    start: { x: margin, y: height - 310 },
    end: { x: width - margin, y: height - 310 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })

  // Détail des sommes
  page.drawText('DÉTAIL DU RÈGLEMENT', { x: margin, y: height - 335, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) })

  page.drawText('Loyer hors charges :', { x: margin, y: height - 360, size: 12, font })
  page.drawText(`${data.loyerHc.toFixed(2)} €`, { x: width - margin - 80, y: height - 360, size: 12, font })

  page.drawText('Charges :', { x: margin, y: height - 382, size: 12, font })
  page.drawText(`${data.charges.toFixed(2)} €`, { x: width - margin - 80, y: height - 382, size: 12, font })

  if (data.solde !== 0) {
    page.drawText('Solde :', { x: margin, y: height - 404, size: 12, font })
    page.drawText(`${data.solde.toFixed(2)} €`, { x: width - margin - 80, y: height - 404, size: 12, font })
  }

  // Total
  page.drawLine({
    start: { x: margin, y: height - 420 },
    end: { x: width - margin, y: height - 420 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  page.drawText('TOTAL RÉGLÉ :', { x: margin, y: height - 442, size: 13, font: fontBold })
  page.drawText(`${data.total.toFixed(2)} €`, { x: width - margin - 80, y: height - 442, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.5) })

  // Texte légal
  const legal = `Je soussigné(e) ${data.proprietaireNom}, bailleur, déclare avoir reçu de ${data.locataireNom} la somme de ${data.total.toFixed(2)} € au titre du loyer et des charges du logement désigné ci-dessus pour la période de ${data.mois}, et lui en donne quittance.`

  page.drawText('DÉCLARATION', { x: margin, y: height - 490, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) })
  
  // Texte sur plusieurs lignes
  const words = legal.split(' ')
  let line = ''
  let y = height - 510
  for (const word of words) {
    const test = line + word + ' '
    if (font.widthOfTextAtSize(test, 11) > width - margin * 2) {
      page.drawText(line.trim(), { x: margin, y, size: 11, font })
      y -= 18
      line = word + ' '
    } else {
      line = test
    }
  }
  if (line.trim()) page.drawText(line.trim(), { x: margin, y, size: 11, font })

  // Date et signature
  page.drawText(`Fait le ${data.dateSignature}`, { x: margin, y: 120, size: 11, font })
  page.drawText('Signature du bailleur :', { x: margin, y: 90, size: 11, font })
  page.drawText(data.proprietaireNom, { x: margin, y: 65, size: 12, font: fontBold })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}