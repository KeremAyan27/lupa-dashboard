import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "Lupa — CEO Dashboard · %s",
    default: "Lupa — CEO Dashboard · Overview",
  },
  description:
    "Mobile-first decision support system: KPIs, sales analytics, stock and collections with rule-based anomaly alerts.",
  applicationName: "Lupa",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lupa",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F8FA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the stored theme before first paint (light is the default).
const THEME_INIT = `try{if(localStorage.getItem("atlas-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${sora.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
