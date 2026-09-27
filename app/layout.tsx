import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Site teste departamentul medical los santos",
  description: "Teste teoretice Departamentul Medical Los Santos - acces cu Discord",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
