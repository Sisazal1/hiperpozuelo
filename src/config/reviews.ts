export const reviewConfig = {
  /** Días naturales desde la entrega o recogida (art. 20.4 RDL 1/2007). */
  days: 30,
  maxText: 1000,
  /** Únicos motivos para retirar una reseña. Nunca por ser negativa. */
  reasons: { spam: "Spam", insults: "Insultos", personal: "Datos personales", illegal: "Contenido ilegal" } as Record<string, string>,
};

export type SubjectType = "product" | "bundle";
export type PublicReview = { id: number; rating: number; body: string; name: string; at: string; edited: boolean; reply: string | null; replyAt: string | null };
export type ReviewData = { enabled: boolean; count: number; average: number; dist: number[]; list: PublicReview[] };
export const NO_REVIEWS: ReviewData = { enabled: false, count: 0, average: 0, dist: [0, 0, 0, 0, 0], list: [] };
export type OwnReview = PublicReview & { status: string; reason: string | null; code: string };
export type OwnState = { signedIn: boolean; canReview: { code: string; until: string } | null; name: string; mine: OwnReview[] };

export const avgText = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
