import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "BetLab", template: "%s | BetLab" },
  description: "Centre privé d'analyse et de suivi des paris football.",
  applicationName: "BetLab",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BetLab" },
};

export const viewport: Viewport = {
  themeColor: "#07101c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
