import './globals.css';
import Providers from './providers';
import { Analytics } from "@vercel/analytics/next"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Analytics/>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}