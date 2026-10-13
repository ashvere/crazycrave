import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND_LOGO_SRC } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: "Crispy Crave",
    template: "%s | Crispy Crave",
  },
  description:
    "Order meals, snacks, and drinks from Pototan restaurants — delivery or pickup.",
  applicationName: "Crispy Crave",
  icons: {
    icon: [{ url: BRAND_LOGO_SRC, sizes: "192x192", type: "image/png" }],
    apple: [{ url: BRAND_LOGO_SRC, sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
