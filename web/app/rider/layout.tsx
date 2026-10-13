import type { Metadata } from "next";
import { legacyCss } from "@/lib/legacy-css";

export const metadata: Metadata = {
  title: {
    default: "Rider",
    template: "%s | Rider — Crispy Crave",
  },
  description: "Deliveries, tracking, and proof of delivery.",
};

export default function RiderRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        rel="stylesheet"
      />
      <link href={legacyCss("rider-portal.css")} rel="stylesheet" />
      {children}
    </>
  );
}
