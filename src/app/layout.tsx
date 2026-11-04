import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://app.ekolocs.fr'),
  applicationName: 'Ekolocs',
  title: 'Ekolocs — Gestion autonome de vos investissements immobiliers',
  icons: {icon: [{url: '/ekolocs-favicon.png?v=6', type: 'image/png', sizes: '32x32'}], shortcut: '/ekolocs-favicon.png?v=6', apple: '/ekolocs-apple-icon.png?v=6'},
  description: 'Gérez vos biens, locataires, quittances et rentabilité en un seul endroit.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-blue-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}
