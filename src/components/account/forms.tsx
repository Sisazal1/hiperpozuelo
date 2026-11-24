"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { accountPost, afterLogin, hasAccountFlag, setAccountFlag } from "@/lib/account-client";

/** Formulario de cuenta: un solo envío a la vez, error junto al botón y recarga al guardar. */
export function AccForm({
  action,
  submit,
  children,
  tone = "primary",
  extra,
  onDone,
  confirm,
}: {
  action: string;
  submit: string;
  children?: ReactNode;
  tone?: "primary" | "secondary" | "ink";
  extra?: Record<string, unknown>;
  onDone?: () => void | Promise<void>;
  confirm?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="acc-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || (confirm && !window.confirm(confirm))) return;
        const f = new FormData(e.currentTarget);
        const body: Record<string, unknown> = { ...extra };
        for (const el of Array.from(e.currentTarget.elements) as HTMLInputElement[])
          if (el.name) body[el.name] = el.type === "checkbox" ? el.checked : (f.get(el.name) ?? "");
        setBusy(true);
        setError("");
        const r = await accountPost(action, body);
        if (r.error) {
          setError(r.error);
          setBusy(false);
          return;
        }
        await (onDone ? onDone() : location.reload());
      }}
    >
      {children}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button className={`btn btn-${tone}`} disabled={busy} aria-busy={busy}>
        {busy ? "Un momento…" : submit}
      </button>
    </form>
  );
}

export function Field({ name, label, hint, ...props }: { name: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `acc-${name}`;
  return (
    <div className="acc-field">
      <label htmlFor={props.id ?? id}>{label}</label>
      <input id={id} name={name} aria-describedby={hint ? `${props.id ?? id}-h` : undefined} {...props} />
      {hint && <small id={`${props.id ?? id}-h`}>{hint}</small>}
    </div>
  );
}

const PASSWORD = { type: "password", minLength: 10, maxLength: 128, required: true, autoComplete: "new-password", hint: "Al menos 10 caracteres." } as const;

export function Consents({ prefix = "" }: { prefix?: string }) {
  return (
    <>
      <label className="acc-check">
        <input type="checkbox" name="terms" required id={`${prefix}terms`} />
        <span>Acepto las condiciones y he leído la política de privacidad.</span>
      </label>
      <p className="acc-legal">
        <Link href="/condiciones">Condiciones</Link> · <Link href="/privacidad">Privacidad</Link>
      </p>
      <label className="acc-check">
        <input type="checkbox" name="marketing" id={`${prefix}marketing`} />
        <span>Quiero recibir ofertas y novedades. Opcional.</span>
      </label>
    </>
  );
}

const enter = async () => {
  await afterLogin();
  location.assign("/account");
};

export function SignIn({ google }: { google: boolean }) {
  return (
    <>
      <AccForm action="login" submit="Entrar" tone="ink" onDone={enter}>
        <Field name="email" label="Email" type="email" autoComplete="username" required />
        <Field name="password" label="Contraseña" type="password" autoComplete="current-password" required maxLength={128} />
      </AccForm>
      {google && (
        <a className="btn btn-secondary" href="/api/google/start">
          Continuar con Google
        </a>
      )}
    </>
  );
}

export function SignUp() {
  return (
    <AccForm action="register" submit="Crear cuenta" tone="secondary" onDone={enter}>
      <Field name="email" id="alta-email" label="Email" type="email" autoComplete="email" required />
      <Field name="password" id="alta-password" label="Contraseña" {...PASSWORD} />
      <Consents prefix="alta-" />
    </AccForm>
  );
}

/** Después de comprar como invitado: solo pide contraseña y vincula ese pedido. */
export function ClaimOrder({ token, email, children }: { token: string; email?: string | null; children?: ReactNode }) {
  return (
    <section className="acc-claim" aria-labelledby="claim-t">
      <div>
        <h2 id="claim-t">Crea tu cuenta con este email</h2>
        <p>
          {email ? `${email}. ` : ""}Opcional: guarda este pedido y síguelo sin buscar el código. {children}
        </p>
        <p>
          ¿Ya tienes cuenta? <Link href={`/account?pedido=${token}`}>Entra y añade este pedido</Link>.
        </p>
      </div>
      <AccForm action="claim" submit="Crear cuenta" tone="secondary" extra={{ token }} onDone={enter}>
        <Field name="password" id="claim-password" label="Contraseña" {...PASSWORD} />
        <Consents prefix="claim-" />
      </AccForm>
    </section>
  );
}

export function LinkToken({ token }: { token: string }) {
  return (
    <AccForm action="link-token" submit="Añadir a mi cuenta" tone="secondary" extra={{ token }} />
  );
}

export function LinkOrder() {
  return (
    <AccForm action="link" submit="Añadir pedido" tone="secondary">
      <Field name="code" label="Código de pedido" placeholder="HP-XXXXXX" autoComplete="off" required />
      <Field name="contact" label="Email o teléfono de la compra" autoComplete="off" required />
    </AccForm>
  );
}

const leave = async () => {
  setAccountFlag(false);
  location.assign("/account");
};
export function SignOut() {
  return <AccForm action="logout" submit="Cerrar sesión" tone="secondary" onDone={leave} />;
}
export function SignOutAll() {
  return <AccForm action="logout-all" submit="Cerrar sesión en todos los dispositivos" tone="secondary" onDone={leave} />;
}

export function Profile({ name, phone, marketing }: { name: string | null; phone: string | null; marketing: boolean }) {
  return (
    <AccForm action="profile" submit="Guardar datos" tone="secondary">
      <Field name="name" label="Nombre" defaultValue={name ?? ""} autoComplete="name" maxLength={80} />
      <Field name="phone" label="Teléfono" defaultValue={phone ?? ""} type="tel" inputMode="tel" autoComplete="tel" />
      <label className="acc-check">
        <input type="checkbox" name="marketing" defaultChecked={marketing} />
        <span>Quiero recibir ofertas y novedades.</span>
      </label>
    </AccForm>
  );
}

export function Password({ has }: { has: boolean }) {
  return (
    <AccForm action="password" submit="Cambiar contraseña" tone="secondary">
      {has && <Field name="current" label="Contraseña actual" type="password" autoComplete="current-password" required maxLength={128} />}
      <Field name="next" label="Contraseña nueva" {...PASSWORD} hint="Al menos 10 caracteres. Cierra la sesión en los demás dispositivos." />
    </AccForm>
  );
}

export function NewAddress() {
  return (
    <AccForm action="address-add" submit="Guardar dirección" tone="secondary">
      <Field name="postalCode" label="Código postal" inputMode="numeric" autoComplete="postal-code" required maxLength={5} />
      <Field name="line" label="Calle, número y piso" autoComplete="street-address" required />
      <Field name="note" label="Indicaciones (opcional)" />
    </AccForm>
  );
}
export function RemoveAddress({ id, label }: { id: number; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="acc-link"
      disabled={busy}
      aria-label={`Eliminar ${label}`}
      onClick={async () => {
        setBusy(true);
        await accountPost("address-remove", { id });
        location.reload();
      }}
    >
      Eliminar
    </button>
  );
}

export function DeleteAccount({ has }: { has: boolean }) {
  return (
    <AccForm
      action="delete"
      submit="Eliminar mi cuenta"
      tone="secondary"
      confirm="Vas a eliminar tu cuenta. No se puede deshacer. ¿Continuar?"
      onDone={async () => {
        setAccountFlag(false);
        location.assign("/account?eliminada=1");
      }}
    >
      {has && <Field name="password" id="del-password" label="Tu contraseña" type="password" autoComplete="current-password" required maxLength={128} />}
    </AccForm>
  );
}

/** Al llegar con sesión (también desde Google): marca el navegador y une favoritos una vez. */
export function AccountSync() {
  useEffect(() => {
    if (!hasAccountFlag()) void afterLogin();
  }, []);
  return null;
}
