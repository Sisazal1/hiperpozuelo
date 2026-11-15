import { brandMarks, type BrandMarkId } from "./brand-marks";

export type PaymentBrand = BrandMarkId | "bizum";

/**
 * Recognisable payment brand chips. Bizum is not in the open icon set, so it is a
 * simple wordmark; swap in the official asset from Bizum's brand portal at launch.
 */
export function PaymentLogo({ brand }: { brand: PaymentBrand }) {
  if (brand === "bizum") {
    return (
      <span className="pay-chip pay-chip--bizum" role="img" aria-label="Bizum">
        <span aria-hidden="true">bizum</span>
      </span>
    );
  }
  const mark = brandMarks[brand];
  return (
    <span className={`pay-chip pay-chip--${brand}`} role="img" aria-label={mark.title}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={mark.path} fill={brand === "klarna" ? "#0b051d" : mark.hex} />
      </svg>
    </span>
  );
}

export function PaymentLogos({ brands, className }: { brands: PaymentBrand[]; className?: string }) {
  return (
    <span className={`pay-chips ${className ?? ""}`}>
      {brands.map((brand) => (
        <PaymentLogo key={brand} brand={brand} />
      ))}
    </span>
  );
}
