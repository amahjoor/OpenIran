import type { Metadata } from "next";
import "./globals.css";

function getMetadataBase() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!configuredUrl) return new URL("http://localhost:3000");
  if (configuredUrl.startsWith("http://") || configuredUrl.startsWith("https://")) {
    return new URL(configuredUrl);
  }

  return new URL(`https://${configuredUrl}`);
}

export const metadata: Metadata = {
  title: "OpenIran",
  description: "High-signal monitoring of the situation in Iran. Real-time tracking of news, strikes, internet status, and aviation signals.",
  metadataBase: getMetadataBase(),
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
