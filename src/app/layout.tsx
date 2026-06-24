import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque: a contemporary grotesque with subtle editorial
// character, more distinctive than a neutral UI sans while staying
// professional. Numbers stay in Geist Mono for clean, legible data.
const fontSans = Bricolage_Grotesque({
  variable: "--font-sans-src",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mercury · Weather, beautifully clear",
  description:
    "A fast, calm weather app. Current conditions, an hourly view, and a seven-day forecast for anywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
