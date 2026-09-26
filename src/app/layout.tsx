import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VidMaker", template: "%s · VidMaker" },
  description: "Type a topic, get a finished 60-second story Short.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
