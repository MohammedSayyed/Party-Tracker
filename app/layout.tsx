import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Party Tab",
  description: "Track what we order. No login. No names.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10233f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-cream text-ink antialiased">
        <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">{children}</div>
      </body>
    </html>
  );
}
