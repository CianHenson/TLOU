import type { Metadata } from 'next';
import { FlashProvider } from '@/components/flash';
import { AutoCapitalize } from '@/components/auto-capitalize';
import { settings } from '@/lib/biz';
import './globals.css';

// Every page reads live data (MySQL + session cookie), so nothing is prerendered at build time.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await settings();
  return {
    title: { default: s.business_name, template: `%s · ${s.business_name}` },
    description: s.tagline,
  };
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body><AutoCapitalize /><FlashProvider>{children}</FlashProvider></body>
    </html>
  );
}
