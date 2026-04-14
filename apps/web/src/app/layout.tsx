import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

import './globals.css';
import Providers from './providers';

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

const displayFont = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className={`${bodyFont.className} ${displayFont.variable} min-h-screen bg-slate-950 text-slate-50`}>
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
