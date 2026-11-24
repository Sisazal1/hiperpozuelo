import Link from "next/link";
import Shell from "@/components/backoffice/Shell";
import { requireStaff } from "@/lib/server/auth";
import { kpis, tillToday, viewCounts } from "@/lib/server/orders";
import { MODE_LABEL, TENDERS, euros, type PaymentMode, type Tender } from "@/lib/orders/status";

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %` : "—");

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const staff = await requireStaff();
  const days = [7, 30, 90].includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 30;
  const [k, counts, till] = await Promise.all([kpis(days), viewCounts(), tillToday()]);
  const f = k.funnel;
  const steps: [string, number][] = [
    ["Visitas", f.visit],
    ["Fichas vistas", f.product_view],
    ["Cestas creadas", f.add_to_cart],
    ["Checkout iniciado", f.checkout_start],
    ["Pago iniciado", f.payment_start],
    ["Pedidos web", k.web.orders],
  ];
  const max = Math.max(1, ...steps.map((s) => s[1]));
  const maxDay = Math.max(1, ...k.byDay.map((d) => d.total));
  const todo: [string, string, number][] = [
    ["activos", "En curso", counts.activos],
    ["cobrar", "Por cobrar", counts.cobrar],
    ["verificar", "Cobros por verificar", counts.verificar],
    ["devoluciones", "Desistimientos", counts.devoluciones],
    ["revisar", "Revisar (fraude o importe)", counts.revisar],
  ];
  return (
    <Shell
      staff={staff}
      current="/backoffice"
      title="Resumen"
      aside={
        <div className="bo-seg" role="group" aria-label="Periodo">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`/backoffice?dias=${d}`} aria-current={d === days ? "true" : undefined}>
              {d} días
            </a>
          ))}
        </div>
      }
    >
      <ul className="bo-todo">
        {todo.map(([v, label, n]) => (
          <li key={v}>
            <Link href={`/backoffice/pedidos?vista=${v}`} data-hot={n > 0 && v !== "activos" ? "" : undefined}>
              <strong>{n}</strong> {label}
            </Link>
          </li>
        ))}
      </ul>

      <section className="bo-kpis" aria-label="Indicadores">
        {(
          [
            ["Ventas web", euros(k.web.revenue), `${k.web.paid} pedidos cobrados`],
            ["Ticket medio web", k.web.paid ? euros(Math.round(k.web.revenue / k.web.paid)) : "—", "ventas ÷ pedidos cobrados"],
            ["Conversión", pct(k.web.orders, f.visit), "pedidos ÷ visitas"],
            ["Abandono de checkout", f.checkout_start ? pct(Math.max(0, f.checkout_start - k.web.orders), f.checkout_start) : "—", "checkouts sin pedido"],
            ["Ventas TPV", euros(k.pos.revenue), `${k.pos.orders} ${k.pos.orders === 1 ? "ticket" : "tickets"}`],
            ["Devoluciones", pct(k.web.returned, k.web.orders), `${euros(k.refunds)} reembolsados`],
            ["Recompra", pct(k.repeat.repeaters, k.repeat.customers), `${k.repeat.customers} ${k.repeat.customers === 1 ? "cliente" : "clientes"}`],
            ["Envío cobrado", euros(k.web.shipping), "a clientes"],
          ] as const
        ).map(([label, value, hint]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </section>

      <div className="bo-cols">
        <section className="bo-card" aria-labelledby="funnel-t">
          <h2 id="funnel-t">Embudo</h2>
          <ol className="bo-funnel">
            {steps.map(([label, n], i) => (
              <li key={label}>
                <span>{label}</span>
                <span className="bo-bar">
                  <i style={{ width: `${(100 * n) / max}%` }} />
                </span>
                <strong>{n}</strong>
                <small>{i ? pct(n, steps[i - 1][1]) : ""}</small>
              </li>
            ))}
          </ol>
          <p className="bo-note">Recuento agregado propio, sin cookies ni identificadores. El porcentaje es sobre el paso anterior.</p>
        </section>
        <section className="bo-card" aria-labelledby="day-t">
          <h2 id="day-t">Ventas por día</h2>
          {k.byDay.length ? (
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Importe</th>
                  <th className="num">Pedidos</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {k.byDay.slice(-14).map((d) => (
                  <tr key={d.d}>
                    <td>{d.d.split("-").reverse().slice(0, 2).join("/")}</td>
                    <td>
                      <span className="bo-bar" aria-hidden="true">
                        <i style={{ width: `${(100 * d.total) / maxDay}%` }} />
                      </span>
                    </td>
                    <td className="num">{d.n}</td>
                    <td className="num">{euros(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="bo-empty">Aún no hay ventas en este periodo.</p>
          )}
        </section>
        <section className="bo-card" aria-labelledby="mode-t">
          <h2 id="mode-t">Cómo pagan</h2>
          <Table rows={k.byMode.map((r) => [MODE_LABEL[r.k as PaymentMode], r.n, r.total])} />
          <h3>Medio de cobro</h3>
          <Table rows={k.byTender.map((r) => [TENDERS[r.k as Tender] ?? r.k, r.n, r.total])} />
        </section>
        <section className="bo-card" aria-labelledby="till-t">
          <h2 id="till-t">Caja de hoy</h2>
          <Table rows={till.map((r) => [`${TENDERS[r.k as Tender] ?? r.k}${r.to_verify ? ` · ${r.to_verify} por verificar` : ""}`, r.n, r.total])} />
        </section>
      </div>
    </Shell>
  );
}

function Table({ rows }: { rows: [string, number, number][] }) {
  if (!rows.length) return <p className="bo-empty">Sin movimientos.</p>;
  return (
    <table className="bo-table">
      <tbody>
        {rows.map(([label, n, total]) => (
          <tr key={label}>
            <td>{label}</td>
            <td className="num">{n}</td>
            <td className="num">{euros(total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
