import Shell from "@/components/backoffice/Shell";
import { ActionForm } from "@/components/backoffice/forms";
import { requireStaff } from "@/lib/server/auth";
import { findCustomers, ledgerOf, pointsState } from "@/lib/server/points";
import { query } from "@/lib/server/db";
import { pointsConfig } from "@/config/points";
import { adjustPointsAction } from "../actions";

const when = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });
const LABEL: Record<string, string> = { earn: "Compra", refund: "Devolución", redeem: "Canje", release: "Canje devuelto", expire: "Caducidad", adjust: "Ajuste" };

export default async function PointsPage({ searchParams }: { searchParams: Promise<{ q?: string; cliente?: string }> }) {
  const staff = await requireStaff();
  const { q = "", cliente = "" } = await searchParams;
  const [c] = /^[0-9a-f-]{36}$/.test(cliente) ? await query("select id,email,name from customers where id=$1", [cliente]) : [];
  const found = !c && q ? await findCustomers(q) : [];
  const [state, ledger] = c ? await Promise.all([pointsState(c.id), ledgerOf(c.id)]) : [null, []];
  return (
    <Shell staff={staff} current="/backoffice/puntos" title={pointsConfig.name}>
      <form className="bo-search" role="search">
        <label>
          Cliente
          <input name="q" defaultValue={q} placeholder="Email o nombre" />
        </label>
        <button className="bo-btn is-plain">Buscar</button>
      </form>
      {q && !c && (found.length ? (
        <ul className="bo-results">
          {found.map((f) => (
            <li key={f.id}>
              <a href={`/backoffice/puntos?cliente=${f.id}`}>{f.email}</a> {f.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="bo-note">Ninguna cuenta con ese email o nombre.</p>
      ))}
      {c && state && (
        <>
          <p className="bo-note">
            {c.email}: {state.available} disponibles, {state.pending} pendientes. El saldo es la suma de los movimientos; para corregirlo se añade otro con su motivo.
          </p>
          <ActionForm action={adjustPointsAction} hidden={{ customer: c.id }} submit="Añadir ajuste" tone="plain" className="bo-fields bo-adjust">
            <label>
              Puntos (con signo menos para restar)
              <input name="points" inputMode="text" placeholder="10" required />
            </label>
            <label>
              Motivo
              <input name="reason" maxLength={200} required />
            </label>
          </ActionForm>
          <div className="bo-scroll" tabIndex={0} role="region" aria-label="Movimientos">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Motivo</th>
                  <th>Autor</th>
                  <th className="num">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td>{when(l.at)}</td>
                    <td>
                      {LABEL[l.type]} {l.code}
                    </td>
                    <td>{l.reason}</td>
                    <td>{l.actor}</td>
                    <td className="num">{l.points > 0 ? `+${l.points}` : l.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
