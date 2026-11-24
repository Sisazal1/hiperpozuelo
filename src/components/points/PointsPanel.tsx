import Link from "next/link";
import { pointsConfig, pointsLabel } from "@/config/points";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import type { pointsState } from "@/lib/server/points";
import "./points.css";

const day = (iso: string | Date) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
const LABEL: Record<string, string> = { earn: "Compra", refund: "Devolución", redeem: "Canje", release: "Canje devuelto", expire: "Caducidad", adjust: "Ajuste de la tienda" };

export default function PointsPanel({ s }: { s: Awaited<ReturnType<typeof pointsState>> }) {
  const { points, euros } = pointsConfig.reward;
  const have = Math.max(0, s.available);
  const missing = Math.max(0, points - have);
  return (
    <section className="acc-block" aria-labelledby="a-pts">
      <h2 id="a-pts">{pointsConfig.name}</h2>
      <dl className="pts-balance">
        <div>
          <dt>Disponibles</dt>
          <dd>{s.available}</dd>
        </div>
        <div>
          <dt>Pendientes</dt>
          <dd>{s.pending}</dd>
        </div>
      </dl>
      <p>{missing ? `Te faltan ${pointsLabel(missing)} para ${formatEuroPrice(euros)} de descuento.` : `Tienes ${formatEuroPrice(euros)} de descuento para usar al pagar.`}</p>
      <span className="pts-bar" role="img" aria-label={`${Math.min(have, points)} de ${points} puntos`}>
        <b style={{ transform: `scaleX(${Math.min(1, have / points)})` }} />
      </span>
      <p>
        {s.expiresAt ? `Caducan el ${day(s.expiresAt)} si no compras antes. ` : ""}
        {s.pending > 0 ? `Los pendientes se pueden usar ${pointsConfig.maturityDays} días después de la entrega o recogida. ` : ""}
        <Link className="text-link" href="/condiciones#puntos">
          Cómo funcionan
        </Link>
      </p>
      {s.history.length > 0 && (
        <details className="acc-more">
          <summary>Ver el historial</summary>
          <table className="pts-history">
            <thead>
              <tr>
                <th scope="col">Movimiento</th>
                <th scope="col">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {s.history.map((h, i) => (
                <tr key={i}>
                  <td>
                    {LABEL[h.type]}
                    {h.code ? ` · ${h.code}` : ""}
                    {h.type === "adjust" ? `: ${h.reason}` : ""}
                    <small>
                      {day(h.at)}
                      {h.pending ? (h.delivered_at ? ` · disponibles el ${day(new Date(new Date(h.delivered_at).getTime() + pointsConfig.maturityDays * 86400_000))}` : " · pendientes de la entrega") : ""}
                    </small>
                  </td>
                  <td>
                    {h.points > 0 ? "+" : "−"}
                    {Math.abs(h.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
