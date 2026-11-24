import Link from "next/link";
import { Coins } from "lucide-react";
import { ordersEnabled } from "@/config/commerce";
import { pointsConfig, pointsFor, pointsLabel } from "@/config/points";
import "./points.css";

/** «Con esta compra sumas N puntos». Con 0 puntos no dice nada. */
export default function PointsNote({ goodsCents }: { goodsCents: number }) {
  const n = pointsFor(goodsCents);
  if (!ordersEnabled || !n) return null;
  return (
    <p className="pts-note">
      <Coins size={18} aria-hidden="true" />
      <span>
        Con esta compra sumas <strong>{pointsLabel(n)}</strong> si tienes cuenta. <Link href="/condiciones#puntos">{pointsConfig.name}</Link>
      </span>
    </p>
  );
}
