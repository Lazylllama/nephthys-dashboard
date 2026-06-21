import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Nephthys Dashboard",
  description: "Simple operational dashboard for Nephthys support data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
