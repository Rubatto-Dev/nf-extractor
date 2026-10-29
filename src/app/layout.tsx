import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "nf-extractor",
  description: "Foto ou PDF de nota fiscal → dados revisados → CSV.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-dvh bg-fundo font-sans text-tinta">{children}</body>
    </html>
  );
}
