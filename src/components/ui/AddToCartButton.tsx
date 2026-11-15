"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useStore } from "@/state/store";

type Props = {
  productId: string;
  productName: string;
  quantity?: number;
  className?: string;
  label?: string;
  icon?: boolean;
};

/** Adds a product and confirms it with a short, quiet state change (no layout shift). */
export function AddToCartButton({ productId, productName, quantity = 1, className = "btn btn-primary btn-sm", label = "Añadir", icon = true }: Props) {
  const { addProduct } = useStore();
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  return (
    <button
      type="button"
      className={`${className} ${done ? "is-done" : ""}`}
      aria-label={`${label} ${productName} a la cesta`}
      onClick={() => {
        addProduct(productId, quantity);
        setDone(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1400);
      }}
    >
      <span className="btn__swap" aria-live="polite">
        {done ? <><Check size={16} aria-hidden="true" /> Añadido</> : <>{icon && <Plus size={16} aria-hidden="true" />} {label}</>}
      </span>
    </button>
  );
}
