import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Visual Design - Agência de Design Digital em Maputo",
  description: "Transformamos ideias em realidade digital. Web design, desenvolvimento e marketing digital que geram resultados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-MZ">
      <body className={`${exo2.variable} ${exo2.className} antialiased`} style={{ fontFamily: 'var(--font-exo-2)', fontWeight: 900 }}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
