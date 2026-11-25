"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { avgText, reviewConfig, type OwnReview, type OwnState, type PublicReview, type ReviewData, type SubjectType } from "@/config/reviews";
import { hasAccountFlag } from "@/lib/account-client";
import "./reviews.css";

export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span className="rv-stars" role="img" aria-label={`${Number.isInteger(value) ? value : avgText(value)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((k) => (
        <i key={k} aria-hidden="true">
          <Star size={size} />
          <b style={{ clipPath: `inset(0 ${100 - Math.max(0, Math.min(1, value - k + 1)) * 100}% 0 0)` }}>
            <Star size={size} fill="currentColor" />
          </b>
        </i>
      ))}
    </span>
  );
}

/** Arriba de la ficha. Sin reseñas no hay estrellas ni nota. */
export function RatingLink({ data }: { data: ReviewData }) {
  if (!data.enabled) return null;
  return (
    <a className="rv-link" href="#resenas">
      {data.count ? (
        <>
          <Stars value={data.average} /> <span>{avgText(data.average)}</span> <u>{data.count === 1 ? "1 reseña" : `${data.count} reseñas`}</u>
        </>
      ) : (
        <u>Sé el primero en opinar</u>
      )}
    </a>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });

function Item({ r, children }: { r: PublicReview; children?: React.ReactNode }) {
  return (
    <li className="rv-item">
      <div className="rv-item-head">
        <Stars value={r.rating} />
        <strong>{r.name}</strong>
        <span className="rv-verified">
          <BadgeCheck size={16} aria-hidden="true" /> Compra verificada
        </span>
      </div>
      <small>
        {day(r.at)}
        {r.edited ? " · editada" : ""}
      </small>
      {r.body && <p>{r.body}</p>}
      {r.reply && (
        <div className="rv-reply">
          <strong>Respuesta de Hiper Pozuelo</strong>
          <p>{r.reply}</p>
        </div>
      )}
      {children}
    </li>
  );
}

async function send(body: object): Promise<string> {
  try {
    const r = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    return d.error ?? "";
  } catch {
    return "No hay conexión. Vuelve a intentarlo.";
  }
}

function ReviewForm({ type, id, name, editing, onDone, onCancel }: { type: SubjectType; id: string; name: string; editing?: OwnReview; onDone: (msg: string) => void; onCancel?: () => void }) {
  const [rating, setRating] = useState(editing?.rating ?? 0);
  const [text, setText] = useState(editing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="rv-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const publicName = new FormData(e.currentTarget).get("name");
        if (!rating) {
          setError("Elige de 1 a 5 estrellas.");
          return;
        }
        setBusy(true);
        setError("");
        const err = await send({ action: editing ? "edit" : "create", review: editing?.id, type, id, rating, text, name: publicName });
        setBusy(false);
        if (err) setError(err);
        else onDone(editing ? "Reseña actualizada." : "Gracias. Tu reseña está guardada.");
      }}
    >
      <fieldset className="rv-rate">
        <legend>Tu valoración</legend>
        <div>
          {[1, 2, 3, 4, 5].map((k) => (
            <label key={k} data-on={k <= rating || undefined}>
              <input type="radio" name="rating" value={k} checked={rating === k} onChange={() => setRating(k)} />
              <Star size={28} fill={k <= rating ? "currentColor" : "none"} aria-hidden="true" />
              <span className="sr-only">{k === 1 ? "1 estrella" : `${k} estrellas`}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="rv-field">
        <label htmlFor="rv-text">Tu opinión (opcional)</label>
        <textarea id="rv-text" rows={4} maxLength={reviewConfig.maxText} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="rv-count" />
        <small id="rv-count">
          {text.length} de {reviewConfig.maxText}
        </small>
      </div>
      <div className="rv-field">
        <label htmlFor="rv-name">Nombre que se verá</label>
        <input id="rv-name" name="name" defaultValue={editing?.name ?? name} maxLength={40} required minLength={2} autoComplete="off" />
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="rv-actions">
        <button className="btn rv-submit" disabled={busy} aria-busy={busy}>
          {busy ? "Un momento…" : editing ? "Guardar cambios" : "Publicar reseña"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Dejarlo como está
          </button>
        )}
      </div>
    </form>
  );
}

export default function Reviews({ type, id, data }: { type: SubjectType; id: string; data: ReviewData }) {
  const [own, setOwn] = useState<OwnState | null>(null);
  const [sort, setSort] = useState("recent");
  const [edit, setEdit] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => {
    fetch(`/api/reviews?type=${type}&id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOwn)
      .catch(() => {});
  }, [type, id]);
  useEffect(() => {
    if (data.enabled && hasAccountFlag()) load();
  }, [data.enabled, load]);
  if (!data.enabled) return null;
  const mine = own?.mine ?? [];
  const mineIds = new Set(mine.map((m) => m.id));
  const list = data.list.filter((r) => !mineIds.has(r.id));
  if (sort === "high") list.sort((a, b) => b.rating - a.rating);
  if (sort === "low") list.sort((a, b) => a.rating - b.rating);
  const done = (m: string) => {
    setMsg(m);
    setEdit(null);
    load();
  };
  return (
    <section className="pdp-section rv" id="resenas" aria-labelledby="resenas-t">
      <div className="rv-side">
        <h2 id="resenas-t">Reseñas</h2>
        {data.count > 0 ? (
          <>
            <p className="rv-average">
              <b>{avgText(data.average)}</b>
              <span>
                <Stars value={data.average} size={22} />
                {data.count === 1 ? "1 reseña" : `${data.count} reseñas`}
              </span>
            </p>
            <ul className="rv-dist">
              {[5, 4, 3, 2, 1].map((k) => (
                <li key={k}>
                  <span>{k === 1 ? "1 estrella" : `${k} estrellas`}</span>
                  <i aria-hidden="true">
                    <b style={{ transform: `scaleX(${data.dist[k - 1] / data.count})` }} />
                  </i>
                  <span>{data.dist[k - 1]}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Aún no hay reseñas. Si lo has comprado, puedes ser el primero.</p>
        )}
        <p className="rv-how">
          Solo opina quien lo ha comprado aquí y ya lo ha recibido: comprobamos que el pedido está entregado y vinculado a su cuenta. Se publican todas, buenas y malas, en el orden que elijas y sin dar nada a cambio. Solo
          retiramos spam, insultos, datos personales o contenido ilegal. <Link href="/condiciones#resenas">Cómo funcionan</Link>
        </p>
      </div>
      <div className="rv-main">
        <div role="status" aria-live="polite">
          {msg && <p className="rv-msg">{msg}</p>}
        </div>
        {own?.canReview && edit === null && (
          <>
            <p>
              Tu pedido {own.canReview.code} está entregado. Puedes opinar hasta el {own.canReview.until}.
            </p>
            <ReviewForm type={type} id={id} name={own.name} onDone={done} />
          </>
        )}
        {!own?.signedIn && (
          <p className="rv-hint">
            ¿Lo has comprado? <Link href="/account">Entra o crea tu cuenta</Link>, añade tu pedido y opina hasta {reviewConfig.days} días después de recibirlo.
          </p>
        )}
        {(mine.length > 0 || list.length > 0) && (
          <>
            {list.length > 1 && (
              <div className="rv-sort">
                <label htmlFor="rv-sort">Ordenar</label>
                <select id="rv-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recent">Más recientes</option>
                  <option value="high">Mejor valoradas</option>
                  <option value="low">Peor valoradas</option>
                </select>
              </div>
            )}
            <ul className="rv-list">
              {mine.map((r) =>
                edit === r.id ? (
                  <li key={r.id} className="rv-item">
                    <ReviewForm type={type} id={id} name={own!.name} editing={r} onDone={done} onCancel={() => setEdit(null)} />
                  </li>
                ) : (
                  <Item key={r.id} r={r}>
                    {r.status === "removed" && <p className="rv-own">Retirada por la tienda. Motivo: {r.reason}.</p>}
                    <div className="rv-actions">
                      {r.status === "published" && (
                        <button type="button" className="rv-text-btn" onClick={() => setEdit(r.id)}>
                          Editar mi reseña
                        </button>
                      )}
                      <button
                        type="button"
                        className="rv-text-btn"
                        onClick={async () => {
                          if (!window.confirm("¿Borrar tu reseña?")) return;
                          const err = await send({ action: "delete", review: r.id });
                          done(err || "Reseña borrada.");
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  </Item>
                ),
              )}
              {list.map((r) => (
                <Item key={r.id} r={r} />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
