import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/state/store";
import GlobalNavbar from "@/components/navigation/GlobalNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";
import { siteConfig } from "@/config/site";
import CookieBanner from "@/components/site/CookieBanner";
import { Bricolage_Grotesque, Inter } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Hiper Pozuelo",
  description: "Compra práctica para tu hogar en Hiper Pozuelo.",
  icons: { icon: "/brand/hiper-pozuelo-logo-transparent.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${display.variable} ${sans.variable}`}><StoreProvider><div className="prelaunch-bar">Preapertura: aún no se cobra ni se envía ningún pedido</div><GlobalNavbar />{children}<SiteFooter /><CartDrawer /><CookieBanner /></StoreProvider></body></html>;
}
