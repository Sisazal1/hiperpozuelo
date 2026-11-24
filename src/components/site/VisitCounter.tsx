"use client";
import { useEffect } from "react";
import { track } from "@/lib/track";

/** Una visita por carga completa que no venga de la propia web: sin cookies ni almacenamiento. */
export default function VisitCounter() {
  useEffect(() => {
    if (!document.referrer.startsWith(location.origin)) track("visit");
  }, []);
  return null;
}
