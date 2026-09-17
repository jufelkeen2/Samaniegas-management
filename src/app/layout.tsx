import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const bodyFont = DM_Sans({ variable: "--font-body", subsets: ["latin"] });
const displayFont = Manrope({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Samaniegas Management | Gestión de landscaping",
  description: "Clientes, servicios y pagos en un solo lugar",
  applicationName: "Samaniegas Management",
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icon-512.png", sizes: "512x512", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}><AppShell>{children}</AppShell></body></html>;
}
