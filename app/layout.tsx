import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = { themeColor: '#ffffff' };
export const metadata: Metadata = {
  metadataBase: new URL('https://jevslop.pages.dev'),
  title: { default: 'JevSlop — writing quality signals', template: '%s · JevSlop' },
  description: 'Read a public note article with TypeSafe Jev and get a whole-article AI Slop judgment plus eight detail signals. Not an AI-authorship detector.',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  openGraph: {
    type: 'website', title: 'JevSlop — writing quality signals',
    description: 'A whole-article writing-quality judgment with eight transparent detail signals.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'JevSlop' }],
  },
  twitter: {
    card: 'summary_large_image', title: 'JevSlop — writing quality signals',
    description: 'A whole-article writing-quality judgment with eight transparent detail signals.',
    images: ['/og-image.png'],
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
