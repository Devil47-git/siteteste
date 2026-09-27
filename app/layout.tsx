import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platformă teste",
  description: "Teste teoretice - acces cu Discord",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
