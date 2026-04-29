import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plataforma Drop",
  description: "B2B Dropshipping & White Label Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
