import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ApeX | High-Frequency Trading Exchange Simulator",
  description: "A production-grade, real-time trading exchange matching engine and portfolio simulator built with Next.js 14, TypeScript, and WebSockets.",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased text-slate-100 bg-[#030712] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
