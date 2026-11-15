import type { Metadata } from "next";
import Styleguide from "@/components/styleguide/Styleguide";
export const metadata: Metadata = { title: "Styleguide · Hiper Pozuelo", robots: { index: false, follow: false } };
export default function StyleguidePage() { return <Styleguide/>; }
