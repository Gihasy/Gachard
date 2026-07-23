import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gachard — Collect. Play. Trade.",
  description:
    "A next-generation collectible card ecosystem that connects the physical and digital worlds. Collect rare cards. Play your way. Trade with everyone.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0B0E1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
        }}
      >
        <div className="cosmic-bg" data-testid="cosmic-bg" />
        <Navbar />
        <main className="flex-1 w-full" data-testid="main-content">
          {children}
        </main>
        <Footer />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
