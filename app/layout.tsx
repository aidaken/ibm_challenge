// ShiftFix — written by IBM Bob

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ShiftFix",
  description:
    "AI agent that covers call-out shifts without the manager texting anyone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
