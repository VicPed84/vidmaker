import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidMaker Wedge",
  description: "Script in, ready-to-post video out.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
