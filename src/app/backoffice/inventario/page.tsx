import Shell from "@/components/backoffice/Shell";
import { ActionForm } from "@/components/backoffice/forms";
import { requireStaff } from "@/lib/server/auth";
import { stockMap } from "@/lib/server/orders";
import { searchProducts } from "@/lib/catalog/products";
import { getCategoryById } from "@/lib/catalog/categories";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import { stockAction } from "../actions";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaff();
  const { q = "" } = await searchParams;
  const stock = await stockMap();
  const products = searchProducts(q);
  return (
    <Shell staff={staff} current="/backoffice/inventario" title="Inventario">
      <form className="bo-search" role="search">
        <label>
          Buscar
          <input name="q" defaultValue={q} placeholder="Producto o subcategoría" />
        </label>
        <button className="bo-btn is-plain">Buscar</button>
      </form>
      <p className="bo-note">
        {stock.size} de 48 productos inventariados. Al contar uno, cada venta web o de mostrador descuenta sus unidades y la web deja de vender lo que no hay. Los packs descuentan sus componentes.
      </p>
      <div className="bo-scroll" tabIndex={0} role="region" aria-label="Inventario">
        <table className="bo-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="num">Precio</th>
              <th>Unidades</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const n = stock.get(p.id);
              return (
                <tr key={p.id}>
                  <td>
                    {p.name_es}
                    <small className="mono">{p.id}</small>
                  </td>
                  <td>{getCategoryById(p.category_id)?.name_es}</td>
                  <td className="num">{formatEuroPrice(p.proposed_price_eur)}</td>
                  <td>
                    <ActionForm action={stockAction} hidden={{ product: p.id }} submit="Guardar" tone="plain" className="is-inline" hideOk>
                      <input key={n ?? "none"} name="units" inputMode="numeric" defaultValue={n ?? ""} placeholder="—" aria-label={`Unidades de ${p.name_es}`} data-low={n !== undefined && n <= 3 ? "" : undefined} />
                    </ActionForm>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
