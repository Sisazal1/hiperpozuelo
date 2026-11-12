import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/state/store";
import GlobalNavbar from "@/components/navigation/GlobalNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import CartDrawer from "@/components/cart/CartDrawer";

export const metadata: Metadata = {
  title: "Hiper Pozuelo",
  description: "Base técnica de Hiper Pozuelo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><StoreProvider><GlobalNavbar />{children}<SiteFooter /><CartDrawer /></StoreProvider></body></html>;
}
