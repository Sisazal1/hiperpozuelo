import { Truck } from "lucide-react";
import { amountToFreeShipping, commerceConfig, shippingProgress } from "@/config/commerce";
import { formatEuroPrice } from "@/lib/catalog/pricing";

/** Free-shipping meter. Hidden for an empty cart; always driven by commerceConfig. */
export function ShippingProgress({ subtotal }: { subtotal: number }) {
  if (subtotal <= 0) return null;
  const remaining = amountToFreeShipping(subtotal);
  const reached = remaining === 0;
  return (
    <div className={`ship-meter ${reached ? "is-reached" : ""}`}>
      <p>
        <Truck size={16} aria-hidden="true" />
        {reached ? (
          <span><strong>¡Envío gratis conseguido!</strong></span>
        ) : (
          <span>Te faltan <strong>{formatEuroPrice(remaining)}</strong> para el envío gratis</span>
        )}
      </p>
      <div
        className="ship-meter__track"
        role="progressbar"
        aria-label={`Progreso hacia el envío gratis desde ${formatEuroPrice(commerceConfig.freeShippingThreshold)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shippingProgress(subtotal))}
      >
        <span style={{ transform: `scaleX(${shippingProgress(subtotal) / 100})` }} />
      </div>
    </div>
  );
}
