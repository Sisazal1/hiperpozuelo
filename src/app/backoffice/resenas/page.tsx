import Link from "next/link";
import Shell from "@/components/backoffice/Shell";
import { ActionForm } from "@/components/backoffice/forms";
import { requireStaff } from "@/lib/server/auth";
import { listReviews, subjectName, subjectPath } from "@/lib/server/reviews";
import { reviewConfig } from "@/config/reviews";
import { removeReviewAction, replyReviewAction, restoreReviewAction } from "../actions";

const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" });

export default async function ReviewsPage() {
  const staff = await requireStaff();
  const reviews = await listReviews();
  return (
    <Shell staff={staff} current="/backoffice/resenas" title="Reseñas">
      <p className="bo-note">Solo se retira spam, insultos, datos personales o contenido ilegal, y el motivo queda registrado. Una reseña negativa no se retira: se responde.</p>
      {reviews.length ? (
        <div className="bo-scroll" tabIndex={0} role="region" aria-label="Lista de reseñas">
          <table className="bo-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Reseña</th>
                <th>Estado</th>
                <th>Responder</th>
                <th>Moderar</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`${subjectPath(r.subject_type, r.subject_id) ?? "/"}#resenas`}>{subjectName(r.subject_type, r.subject_id)}</Link>
                    <small>
                      {r.code} · {day(r.created_at)}
                    </small>
                  </td>
                  <td style={{ whiteSpace: "pre-line", minWidth: 220, overflowWrap: "anywhere" }}>
                    <strong>{r.rating}/5</strong> {r.public_name}
                    <small>{r.body || "Sin texto"}</small>
                  </td>
                  <td>
                    <span className="bo-pill" data-s={r.status === "published" ? "ready" : "cancelled"}>
                      {r.status === "published" ? "Publicada" : "Retirada"}
                    </span>
                    {r.status === "removed" && (
                      <small>
                        {r.removed_reason}: {r.removed_detail} ({r.removed_by}, {day(r.removed_at)})
                      </small>
                    )}
                  </td>
                  <td>
                    {r.status === "published" && (
                      <ActionForm action={replyReviewAction} hidden={{ id: String(r.id) }} submit="Guardar respuesta" tone="plain">
                        <label>
                          Respuesta pública
                          <textarea name="reply" rows={2} maxLength={600} defaultValue={r.reply ?? ""} />
                        </label>
                      </ActionForm>
                    )}
                  </td>
                  <td>
                    {r.status === "published" ? (
                      <ActionForm action={removeReviewAction} hidden={{ id: String(r.id) }} submit="Retirar" tone="danger">
                        <label>
                          Motivo
                          <select name="reason" defaultValue="">
                            <option value="" disabled>
                              Elegir
                            </option>
                            {Object.entries(reviewConfig.reasons).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Qué incumple
                          <input name="detail" maxLength={300} />
                        </label>
                      </ActionForm>
                    ) : (
                      <ActionForm action={restoreReviewAction} hidden={{ id: String(r.id) }} submit="Volver a publicar" tone="plain" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="bo-note">Todavía no hay reseñas.</p>
      )}
    </Shell>
  );
}
