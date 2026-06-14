import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Strategy-Pack Image Studio',
  description: 'Strategy-pack-driven ecommerce image workflow studio.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
