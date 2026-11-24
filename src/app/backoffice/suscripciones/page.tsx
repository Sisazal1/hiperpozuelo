import Shell from "@/components/backoffice/Shell";
import { requireStaff } from "@/lib/server/auth";
import { SUB_LABEL, listSubscriptions } from "@/lib/server/subscriptions";
import { weeksLabel } from "@/config/subscription";
import { getProductById } from "@/lib/catalog/products";

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

export default async function SubscriptionsPage() {
  const staff = await requireStaff();
  const subs = await listSubscriptions();
  return (
    <Shell staff={staff} current="/backoffice/suscripciones" title="Suscripciones">
      {subs.length ? (
        <div className="bo-scroll" tabIndex={0} role="region" aria-label="Lista de suscripciones">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Artículos</th>
                <th>Frecuencia</th>
                <th>Próximo ciclo</th>
                <th>Aviso previo</th>
                <th className="num">Ciclos</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.customer_name}
                    <small>{s.phone}</small>
                  </td>
                  <td>
                    <span className="bo-pill" data-s={s.status === "active" ? "ready" : s.status === "cancelled" ? "cancelled" : "preparing"}>
                      {SUB_LABEL[s.status]}
                    </span>
                    {s.last_event && <small>{s.last_event}</small>}
                  </td>
                  <td>
                    {(s.items as { id: string; n: number }[]).map((i) => `${i.n} × ${getProductById(i.id)?.name_es ?? i.id}`).join(", ")}
                    <small>{s.delivery === "collect" ? "Recogida" : "Domicilio"}</small>
                  </td>
                  <td>{weeksLabel(s.weeks)}</td>
                  <td>{day(s.next_cycle_at)}</td>
                  <td>
                    {day(s.notice_at)}
                    {s.noticed_for && <small>Enviado</small>}
                  </td>
                  <td className="num">{s.cycles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="bo-note">Todavía no hay suscripciones.</p>
      )}
    </Shell>
  );
}
