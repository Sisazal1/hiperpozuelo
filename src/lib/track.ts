// Contador agregado del embudo: un nombre de paso, sin cookies, sin identificadores y sin terceros.
export type FunnelStep = "visit" | "product_view" | "add_to_cart" | "checkout_start" | "payment_start";
export function track(name: FunnelStep) {
  try {
    if (navigator.webdriver && !(window as any).__hpTrack) return;
    navigator.sendBeacon?.("/api/track", JSON.stringify({ name }));
  } catch {}
}
