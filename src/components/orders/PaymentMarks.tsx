"use client";
import { useEffect, useState } from "react";
import { MARK_PATHS } from "./marks";

export type Methods = { online: string[]; wallets: string[]; later: boolean };
let memo: Promise<Methods> | null = null;

export function usePaymentMethods() {
  const [m, setM] = useState<Methods | null>(null);
  useEffect(() => {
    memo ??= fetch("/api/payment-methods")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => {
        memo = null;
        return { online: ["card"], wallets: [], later: false };
      });
    memo.then(setM);
  }, []);
  return m;
}

const NAMES: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  bizum: "Bizum",
  paypal: "PayPal",
  klarna: "Klarna",
  link: "Link",
  cash: "Efectivo",
};

export function methodNames(m: Methods) {
  return [
    ...(m.online.includes("card") ? ["visa", "mastercard", "amex"] : []),
    ...m.wallets,
    ...m.online.filter((x) => x !== "card"),
  ];
}

export default function PaymentMarks({ keys, label = "Métodos de pago aceptados" }: { keys: string[]; label?: string }) {
  if (!keys.length) return null;
  return (
    <ul className="pay-marks" aria-label={label}>
      {keys.map((k) => (
        <li key={k} data-mark={k}>
          {k === "mastercard" ? (
            <svg viewBox="0 0 24 16" role="img" aria-label={NAMES[k]}>
              <circle cx="8" cy="8" r="7" fill="#eb001b" />
              <circle cx="16" cy="8" r="7" fill="#f79e1b" />
              <path d="M12 2.26a7 7 0 0 1 0 11.48 7 7 0 0 1 0-11.48z" fill="#ff5f00" />
            </svg>
          ) : MARK_PATHS[k] ? (
            <svg viewBox="0 0 24 24" role="img" aria-label={NAMES[k]}>
              <path d={MARK_PATHS[k].d} fill={MARK_PATHS[k].fill} />
            </svg>
          ) : (
            (NAMES[k] ?? k)
          )}
        </li>
      ))}
    </ul>
  );
}
