import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./experience.css";
import { StoreProvider } from "@/state/store";
import GlobalNavbar from "@/components/navigation/GlobalNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import CookieBanner from "@/components/site/CookieBanner";
import WelcomeScratch from "@/components/marketing/WelcomeScratch";
import AnnouncementTicker from "@/components/site/AnnouncementTicker";
import IntroSplash from "@/components/motion/IntroSplash";
import RouteProgress from "@/components/motion/RouteProgress";
import Toaster from "@/components/motion/Toaster";
import StoreChrome from "@/components/site/StoreChrome";
import VisitCounter from "@/components/site/VisitCounter";
import ScrollReveal from "@/components/motion/ScrollReveal";
import { Bricolage_Grotesque, Inter } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Hiper Pozuelo · Tu casa lista en un pack", template: "%s · Hiper Pozuelo" },
  description:
    "Packs y básicos para equipar cocina, baño, limpieza y estudio. Precio claro, envío gratis desde 30 € y recogida gratis en Pozuelo de Alarcón.",
  icons: { icon: "/brand/hiper-pozuelo-logo-transparent.png" },
  openGraph: { type: "website", locale: "es_ES", siteName: "Hiper Pozuelo", images: ["/ai/hero-home-16x9-1600.webp"] },
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${sans.variable}`}>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <StoreChrome>
          <IntroSplash />
        </StoreChrome>
        <StoreProvider>
          <RouteProgress />
          <ScrollReveal />
          <StoreChrome>
            <AnnouncementTicker />
            <GlobalNavbar />
          </StoreChrome>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <StoreChrome>
            <SiteFooter />
            <CartDrawer />
            <CookieBanner />
            <WelcomeScratch />
            <VisitCounter />
          </StoreChrome>
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
