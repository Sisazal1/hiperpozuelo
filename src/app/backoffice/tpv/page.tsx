import Shell from "@/components/backoffice/Shell";
import Pos from "@/components/backoffice/Pos";
import { ActionForm } from "@/components/backoffice/forms";
import { requireStaff } from "@/lib/server/auth";
import { stockMap } from "@/lib/server/orders";
import { findAction } from "../actions";

export default async function PosPage() {
  const staff = await requireStaff();
  const stock = Object.fromEntries(await stockMap());
  return (
    <Shell
      staff={staff}
      current="/backoffice/tpv"
      title="TPV"
      aside={
        <ActionForm action={findAction} submit="Entregar pedido web" tone="plain" className="is-inline" hideOk>
          <label>
            Código del QR
            <input name="code" placeholder="HP-" autoComplete="off" required />
          </label>
        </ActionForm>
      }
    >
      <Pos stock={stock} />
    </Shell>
  );
}
