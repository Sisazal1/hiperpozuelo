export type PaymentMethodId = "card" | "applepay" | "googlepay" | "paypal" | "bizum" | "klarna";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  hint: string;
  /** Brand marks (see PaymentLogos) shown next to the method. */
  brands: ("visa" | "mastercard" | "amex" | "applepay" | "googlepay" | "paypal" | "bizum" | "klarna")[];
};

/**
 * Payment is simulated until a real provider is connected. The methods and
 * brand marks are real so the screen looks like the final one, but the
 * checkout never asks for card data and never claims a charge was made.
 */
export const paymentMethods: PaymentMethod[] = [
  { id: "card", label: "Tarjeta de crédito o débito", hint: "Visa, Mastercard y American Express", brands: ["visa", "mastercard", "amex"] },
  { id: "applepay", label: "Apple Pay", hint: "Pago rápido desde tu dispositivo Apple", brands: ["applepay"] },
  { id: "googlepay", label: "Google Pay", hint: "Pago rápido con tu cuenta de Google", brands: ["googlepay"] },
  { id: "paypal", label: "PayPal", hint: "Paga con tu cuenta de PayPal", brands: ["paypal"] },
  { id: "bizum", label: "Bizum", hint: "Pago desde tu móvil con tu banco", brands: ["bizum"] },
  { id: "klarna", label: "Klarna", hint: "Paga más tarde o en plazos", brands: ["klarna"] },
];

export const getPaymentMethod = (id: string) => paymentMethods.find((method) => method.id === id);
