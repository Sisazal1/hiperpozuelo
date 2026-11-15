import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { StoreProvider } from "@/state/store";
import AnnouncementBar from "@/components/site/AnnouncementBar";
import GlobalNavbar from "@/components/navigation/GlobalNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import CookieBanner from "@/components/site/CookieBanner";
import RouteProgress from "@/components/site/RouteProgress";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} · ${siteConfig.tagline}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: siteConfig.name,
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: "/",
  },
  twitter: { card: "summary", title: siteConfig.name, description: siteConfig.description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c8102e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <StoreProvider>
          <a className="skip-link" href="#main-content">Saltar al contenido</a>
          <RouteProgress />
          <AnnouncementBar />
          <GlobalNavbar />
          <main id="main-content" tabIndex={-1}>{children}</main>
          <SiteFooter />
          <CartDrawer />
          <CookieBanner />
        </StoreProvider>
      </body>
    </html>
  );
}
