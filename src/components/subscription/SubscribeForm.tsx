"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ShieldCheck, Store, Truck } from "lucide-react";
import { zoneFor, type DeliveryMethod } from "@/config/commerce";
import { pricedItems, subscriptionConfig, subscriptionQuote, weeksLabel } from "@/config/subscription";
import { hasAccountFlag } from "@/lib/account-client";
import { readDraft, saveDraft, type Draft } from "@/lib/subscription-draft";
import { WeeksPicker, cents, subscriptionPost } from "./parts";

const EMPTY = { name: "", phone: "", email: "", postalCode: "", line: "", note: "" };
type Form = typeof EMPTY;

export default function SubscribeForm() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [delivery, setDelivery] = useState<DeliveryMethod>("collect");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    setDraft(readDraft());
    if (new URLSearchParams(location.search).has("cancelada")) setError("Pago cancelado: no se ha cobrado nada ni se ha creado la suscripción.");
    if (!hasAccountFlag()) return;
    fetch("/api/account/me")
      .then((r) => r.json())
      .then(({ customer: c, addresses }) => {
        if (!c) return;
        const a = addresses?.[0];
        setForm((f) => ({ name: f.name || c.name || "", email: f.email || c.email || "", phone: f.phone || c.phone || "", line: f.line || a?.line || "", postalCode: f.postalCode || a?.postal_code || "", note: f.note || a?.note || "" }));
      })
      .catch(() => {});
  }, []);
  if (!draft) return <div className="skeleton-block" style={{ height: 420 }} aria-hidden="true" />;
  const priced = pricedItems(draft.items);
  const quote = subscriptionQuote(priced, delivery);
  if (!priced.length || quote.missing)
    return (
      <div className="refill-empty">
        <p>{priced.length ? `El mínimo por ciclo es ${cents(subscriptionConfig.minAfterDiscount * 100)}.` : "Todavía no has elegido qué quieres recibir."}</p>
        <Link className="btn btn-secondary" href="/reposicion">
          Elegir artículos
        </Link>
      </div>
    );
  const zone = zoneFor(form.postalCode);
  const next = new Date(Date.now() + draft.weeks * 7 * 86400_000).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === "postalCode" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors(({ [k]: _, ...rest }) => rest);
  };
  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`co-field co-field-${k}`}>
      <label htmlFor={`su-${k}`}>{label}</label>
      <input id={`su-${k}`} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `su-${k}-err` : undefined} {...props} />
      {errors[k] && (
        <p className="field-error" id={`su-${k}-err`} role="alert">
          {errors[k]}
        </p>
      )}
    </div>
  );
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const consent = (e.currentTarget.elements.namedItem("consent") as HTMLInputElement).checked;
    setBusy(true);
    setError("");
    setErrors({});
    const r = await subscriptionPost("start", {
      items: draft.items,
      weeks: draft.weeks,
      delivery,
      consent,
      customer: { name: form.name, email: form.email, phone: form.phone },
      address: { line: form.line, postalCode: form.postalCode, note: form.note },
    });
    if (r.url) {
      location.assign(r.url);
      return;
    }
    setBusy(false);
    if (r.fields) {
      setErrors(r.fields);
      document.getElementById(`su-${Object.keys(r.fields)[0]}`)?.focus();
    } else setError(r.error ?? "No hemos podido iniciar el pago.");
  };
  return (
    <form className="checkout-single" onSubmit={submit} noValidate ref={formRef}>
      <section className="checkout-order-review co-form">
        <h1>Tu suscripción</h1>
        <fieldset className="co-block">
          <legend>1. Tus datos</legend>
          <div className="co-grid">
            {field("name", "Nombre y apellidos", { autoComplete: "name", required: true })}
            {field("phone", "Teléfono", { type: "tel", inputMode: "tel", autoComplete: "tel", required: true })}
            {field("email", "Email", { type: "email", inputMode: "email", autoComplete: "email", required: true })}
          </div>
        </fieldset>
        <fieldset className="co-block">
          <legend>2. Entrega de cada ciclo</legend>
          <div className="co-options">
            <label className="co-option">
              <input type="radio" name="delivery" value="collect" checked={delivery === "collect"} onChange={() => setDelivery("collect")} />
              <span className="co-option-body">
                <strong>
                  <Store size={17} aria-hidden="true" /> Recogida en tienda
                </strong>
                <small>Pozuelo de Alarcón, con tu código QR</small>
              </span>
              <b>Gratis</b>
            </label>
            <label className="co-option">
              <input type="radio" name="delivery" value="delivery" checked={delivery === "delivery"} onChange={() => setDelivery("delivery")} />
              <span className="co-option-body">
                <strong>
                  <Truck size={17} aria-hidden="true" /> Envío a domicilio
                </strong>
                <small>Pozuelo de Alarcón y Aravaca</small>
              </span>
              <b>{cents(subscriptionQuote(priced, "delivery").shipping).replace(/^0,00 €$/, "Gratis")}</b>
            </label>
          </div>
          {delivery === "delivery" && (
            <div className="co-grid co-address">
              {field("postalCode", "Código postal", { inputMode: "numeric", autoComplete: "postal-code", required: true })}
              {field("line", "Calle, número y piso", { autoComplete: "street-address", required: true })}
              {field("note", "Indicaciones para el reparto (opcional)")}
              {form.postalCode.length === 5 && !errors.postalCode && (
                <p className={`co-zone ${zone ? "is-ok" : "is-out"}`} role="status">
                  {zone ? (
                    <>
                      <Check size={15} aria-hidden="true" /> Repartimos en {zone}
                    </>
                  ) : (
                    "Aún no repartimos en ese código postal. Puedes recogerlo gratis en tienda."
                  )}
                </p>
              )}
            </div>
          )}
        </fieldset>
        <div className="co-block">
          <WeeksPicker
            legend="3. Cada cuánto"
            value={draft.weeks}
            onChange={(weeks) => {
              setDraft({ ...draft, weeks });
              saveDraft({ ...draft, weeks });
            }}
          />
        </div>
      </section>
      <aside className="checkout-sidebar" aria-label="Resumen de la suscripción">
        <h2 className="co-summary-title">Antes de pagar</h2>
        <ul className="refill-lines">
          {priced.map((i) => (
            <li key={i.id}>
              <span>
                {i.n} × {i.name}
              </span>
              <b>{cents(i.unit * i.n)}</b>
            </li>
          ))}
        </ul>
        <div className="checkout-breakdown">
          <div>
            <span>Descuento de suscripción</span>
            <strong>-{cents(quote.discount)}</strong>
          </div>
          <div>
            <span>{delivery === "collect" ? "Recogida" : "Envío"}</span>
            <strong>{quote.shipping ? cents(quote.shipping) : "Gratis"}</strong>
          </div>
          <div className="checkout-total" aria-live="polite">
            <span>Hoy y en cada ciclo, IVA incluido</span>
            <strong>{cents(quote.total)}</strong>
          </div>
        </div>
        <dl className="refill-terms">
          <div>
            <dt>Frecuencia</dt>
            <dd>{weeksLabel(draft.weeks)}</dd>
          </div>
          <div>
            <dt>Próximo cobro</dt>
            <dd>{next}</dd>
          </div>
          <div>
            <dt>Cómo cancelar</dt>
            <dd>En tu enlace de gestión, en dos clics y sin coste. Te lo damos al terminar el pago.</dd>
          </div>
        </dl>
        <label className="acc-check">
          <input type="checkbox" name="consent" id="su-consent" aria-describedby={errors.consent ? "su-consent-err" : undefined} />
          <span>
            Autorizo a Hiper Pozuelo a cobrarme {cents(quote.total)} {weeksLabel(draft.weeks).toLowerCase()} en mi tarjeta hasta que cancele.
          </span>
        </label>
        {errors.consent && (
          <p className="field-error" id="su-consent-err" role="alert">
            {errors.consent}
          </p>
        )}
        {error && (
          <div className="checkout-error" role="alert">
            {error}
          </div>
        )}
        <button type="submit" className={`summary-cta checkout-pay ${busy ? "is-loading" : ""}`} disabled={busy} aria-busy={busy}>
          {busy ? "Abriendo el pago…" : `Suscribirme y pagar ${cents(quote.total)}`}
        </button>
        <p className="checkout-trust">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Pagas con tarjeta en la página cifrada de Stripe.</span>
        </p>
        <p className="co-legal">
          Al continuar aceptas las <Link href="/condiciones#suscripcion">condiciones de la suscripción</Link> y la <Link href="/privacidad">privacidad</Link>. Tienes 14 días para <Link href="/envios-y-devoluciones">desistir</Link> de cada pedido.
        </p>
      </aside>
    </form>
  );
}
