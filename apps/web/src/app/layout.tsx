import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kolorowanki',
  description: 'Darmowe kolorowanki do druku dla dzieci',
};

// Root layout – required by Next.js App Router.
// The locale-specific layout ([locale]/layout.tsx) wraps content with
// the correct language context and navigation.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="bg-zinc-50 antialiased dark:bg-zinc-950">{children}</body>
    </html>
  );
}
