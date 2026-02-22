import type { Metadata } from 'next';
import { Bebas_Neue, Source_Serif_4 } from 'next/font/google';
import Providers from './providers';
import PwaRegister from './pwa';
import './globals.css';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display'
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'JelBarber Shop',
  description: 'ระบบบริหารจัดการร้านตัดผม',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-pwa.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: '/icons/icon-pwa.png',
    shortcut: '/icons/icon-pwa.png'
  }
};

export const viewport = {
  themeColor: '#d9b46c'
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${bebas.variable} ${sourceSerif.variable}`}>
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
