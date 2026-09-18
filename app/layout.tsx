import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'JevSlop — noteの文章品質を比較する', description: '8つの独立した評価軸から、文章の情報密度と定型性を読み解くローカル実験ツール。' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
