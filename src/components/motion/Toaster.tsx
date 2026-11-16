"use client";
import { useEffect, useState } from "react";
import { Check, Heart, HeartOff } from "lucide-react";

type Toast = { id: number; message: string; icon?: "heart" | "unheart" | "check"; leaving?: boolean };
const ICONS = { heart: Heart, unheart: HeartOff, check: Check };

/** Lanza un toast desde cualquier sitio sin contexto: toast("Guardado en favoritos", "heart"). */
export function toast(message: string, icon: Toast["icon"] = "check") {
  window.dispatchEvent(new CustomEvent("hp:toast", { detail: { message, icon } }));
}

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { message, icon } = (e as CustomEvent).detail as Toast;
      const id = Date.now() + Math.random();
      setItems((x) => [...x.slice(-2), { id, message, icon }]);
      window.setTimeout(() => setItems((x) => x.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 2400);
      window.setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 2700);
    };
    window.addEventListener("hp:toast", on);
    return () => window.removeEventListener("hp:toast", on);
  }, []);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => {
        const Icon = ICONS[t.icon || "check"];
        return (
          <div key={t.id} className={`toast ${t.leaving ? "is-leaving" : ""}`}>
            <span className="toast-icon">
              <Icon size={16} />
            </span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
