import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import AnalyticsWrapper from '../components/analytics'
import './globals.css'
import { MessageCircle } from 'lucide-react'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ACIPI - Agendamento de Salas',
  description: 'Agende salas de reuniao, auditorios e espacos de trabalho na Associacao Comercial e Industrial de Piracicaba.',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-center" />
        <AnalyticsWrapper />
        
        {/* Botão Flutuante de Atendimento WhatsApp Global */}
        <a
          id="whatsapp-button"
          href="https://wa.me/551934171766"
          target="_blank"
          rel="noopener noreferrer"
          className="group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-12 sm:h-14 items-center rounded-full bg-primary px-3 sm:px-4 font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-500 hover:-translate-y-1 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 pointer-events-auto"
        >
          <MessageCircle className="size-6 shrink-0" />
          <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out group-hover:max-w-[250px] group-hover:pl-2 group-hover:opacity-100">
            Falar com Atendente
          </span>
        </a>
      </body>
    </html>
  )
}
