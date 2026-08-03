import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Antigravity PhotoBooth — Digital PhotoBooth Platform',
  description: 'Capture browser photos, apply custom frames, and download instantly via QR code.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
