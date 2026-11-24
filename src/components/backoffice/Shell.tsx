import Link from "next/link";
import { BarChart3, Boxes, Coins, LogOut, RefreshCw, ReceiptText, ScanLine, Star } from "lucide-react";
import Flash from "./Flash";
import { logoutAction } from "@/app/backoffice/actions";

const NAV = [
  ["/backoffice", "Resumen", BarChart3],
  ["/backoffice/pedidos", "Pedidos", ReceiptText],
  ["/backoffice/tpv", "TPV", ScanLine],
  ["/backoffice/suscripciones", "Suscripciones", RefreshCw],
  ["/backoffice/resenas", "Reseñas", Star],
  ["/backoffice/puntos", "Puntos", Coins],
  ["/backoffice/inventario", "Inventario", Boxes],
] as const;

export default function Shell({ staff, current, title, aside, children }: { staff: string; current: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bo-shell">
      <nav className="bo-nav" aria-label="Backoffice">
        <Link className="bo-brand" href="/backoffice">
          Hiper Pozuelo
        </Link>
        {NAV.map(([href, label, Icon]) => (
          <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>
            <Icon size={18} aria-hidden="true" /> {label}
          </Link>
        ))}
        <form action={logoutAction} className="bo-out">
          <span>{staff}</span>
          <button>
            <LogOut size={16} aria-hidden="true" /> Salir
          </button>
        </form>
      </nav>
      <div className="bo-main">
        <header className="bo-head">
          <h1>{title}</h1>
          {aside}
        </header>
        <Flash />
        {children}
      </div>
    </div>
  );
}
