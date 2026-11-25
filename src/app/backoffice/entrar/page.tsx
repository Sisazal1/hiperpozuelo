import { redirect } from "next/navigation";
import { ActionForm } from "@/components/backoffice/forms";
import { currentStaff } from "@/lib/server/auth";
import { loginAction } from "../actions";

export default async function LoginPage() {
  if (await currentStaff()) redirect("/backoffice");
  return (
    <div className="bo-login">
      <h1>Backoffice</h1>
      <ActionForm action={loginAction} submit="Entrar">
        <label>
          Tu nombre
          <input name="name" autoComplete="username" required maxLength={40} />
        </label>
        <label>
          Contraseña del equipo
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <label className="bo-check">
          <input name="remember" type="checkbox" />
          <span>Recordarme 30 días en este equipo</span>
        </label>
      </ActionForm>
      <p>Tu nombre queda registrado en cada cobro y cambio de estado.</p>
    </div>
  );
}
