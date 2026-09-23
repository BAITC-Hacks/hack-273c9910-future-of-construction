import type { Metadata, Viewport } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "cyrillic"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: { default: "Аким — город начинается с вас", template: "%s · Аким" },
  description: "Исследуйте Казахстан на карте, планируйте развитие районов Астаны и проверяйте свои решения в симуляторе городского бюджета.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f9f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${sourceSerif.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
