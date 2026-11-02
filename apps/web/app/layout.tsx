import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Kin — Good blood. Human by nature.', template: '%s · Kin' },
  description:
    'A community blood donor coordination platform. Find relevant requests, offer your time, and connect on your terms.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>
          <Header />
          <div id="main-content">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
