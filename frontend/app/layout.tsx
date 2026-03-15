import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenIran",
  description: "High-signal monitoring of the situation in Iran. Real-time tracking of news, strikes, internet status, and aviation signals.",
  icons: {
    icon: "/OpenIran.png",
    apple: "/OpenIran.png",
  },
  openGraph: {
    title: "OpenIran",
    description: "High-signal monitoring of the situation in Iran.",
    images: ["/OpenIran.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenIran",
    description: "High-signal monitoring of the situation in Iran.",
    images: ["/OpenIran.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
