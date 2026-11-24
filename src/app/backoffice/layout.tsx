import type { Metadata } from "next";
import "./backoffice.css";

export const metadata: Metadata = { title: "Backoffice", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="bo">{children}</div>;
}
