import { Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

import './globals.css';
import Providers from './providers';

const bodyFont = Manrope({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className={`${bodyFont.className} min-h-screen bg-slate-950 text-slate-50`}>
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
