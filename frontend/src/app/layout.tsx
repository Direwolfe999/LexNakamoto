import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LexNakamoto — sBTC Escrow Protocol",
  description:
    "Milestone-based sBTC escrow with dispute resolution and settlement tracking on Stacks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon/favicon-96x96.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body
        className={`${inter.variable} min-h-screen bg-gray-950 font-sans text-white antialiased`}
      >
        <ClientProviders>
          {/* Background gradient orbs */}
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-500/[0.07] blur-[120px]" />
            <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/[0.05] blur-[120px]" />
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.03] blur-[120px]" />
          </div>

          <main className="mx-auto max-w-7xl px-6 pb-20 pt-24">
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
