import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'JevSlop — writing quality signals', description: 'Evaluate eight writing-quality dimensions in public note articles with TypeSafe Jev. JevSlop is not an AI-authorship detector.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
