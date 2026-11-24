"use server";
import { redirect } from "next/navigation";
import { login, logout, requireStaff } from "@/lib/server/auth";
import {
  OrderError,
  addNote,
  clearReview,
  posSale,
  priceLines,
  recordCharge,
  recordRefund,
  rejectPayment,
  setShipping,
  setStatus,
  setStock,
  verifyPayment,
} from "@/lib/server/orders";
import { query } from "@/lib/server/db";
import { COURIERS, TENDERS, courierById, type OrderStatus, type Tender } from "@/lib/orders/status";

export type ActionState = { error?: string; ok?: string };
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const tenderOf = (f: FormData): Tender => {
  const t = str(f, "tender");
  if (!(t in TENDERS)) throw new OrderError("Elige un medio de cobro.");
  return t as Tender;
};

async function run(fn: (staff: string) => Promise<string | void>): Promise<ActionState> {
  const staff = await requireStaff();
  try {
    const ok = await fn(staff);
    return { ok: ok || "Guardado" };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("backoffice", (e as Error).message);
    return { error: "No se ha podido guardar. Vuelve a intentarlo." };
  }
}

export async function loginAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await login(str(f, "name"), str(f, "password"));
  if (r === "ok") redirect("/backoffice");
  return {
    error: {
      bad: "Contraseña incorrecta.",
      blocked: "Demasiados intentos. Espera 15 minutos.",
      off: "El backoffice no está configurado en este entorno.",
    }[r],
  };
}
export async function logoutAction() {
  await logout();
  redirect("/backoffice/entrar");
}

export async function statusAction(_: ActionState, f: FormData) {
  return run((s) => setStatus(str(f, "id"), str(f, "to") as OrderStatus, s));
}
export async function shippingAction(_: ActionState, f: FormData) {
  return run(async (s) => {
    const c = courierById(str(f, "courier"));
    if (!c || !COURIERS.includes(c)) throw new OrderError("Elige un transportista.");
    await setShipping(str(f, "id"), c.id, str(f, "tracking"), s, c.name);
  });
}
export async function chargeAction(_: ActionState, f: FormData) {
  return run(async (s) => {
    await recordCharge(str(f, "id"), tenderOf(f), str(f, "reference"), s);
    return "Cobro registrado. Queda por verificar.";
  });
}
export async function verifyAction(_: ActionState, f: FormData) {
  return run((s) => verifyPayment(Number(str(f, "payment")), s));
}
export async function rejectAction(_: ActionState, f: FormData) {
  return run((s) => rejectPayment(Number(str(f, "payment")), s));
}
export async function refundAction(_: ActionState, f: FormData) {
  return run(async (s) => {
    const cents = Math.round(Number(str(f, "amount").replace(",", ".")) * 100);
    await recordRefund(str(f, "id"), cents, tenderOf(f), str(f, "reference"), s);
    return "Reembolso registrado.";
  });
}
export async function reviewAction(_: ActionState, f: FormData) {
  return run((s) => clearReview(str(f, "id"), s));
}
export async function noteAction(_: ActionState, f: FormData) {
  return run((s) => addNote(str(f, "id"), str(f, "note"), s));
}
export async function stockAction(_: ActionState, f: FormData) {
  return run(async (s) => {
    const v = str(f, "units").trim();
    if (!/^\d{1,5}$/.test(v)) throw new OrderError("Escribe un número de unidades.");
    await setStock(str(f, "product"), Number(v), s);
  });
}

export async function posAction(input: {
  lines: { productId: string; quantity: number }[];
  tender: string;
  reference: string;
  requestKey: string;
}): Promise<ActionState & { id?: string; code?: string }> {
  let sale: { id: string; code: string } | null = null;
  const r = await run(async (s) => {
    const lines = priceLines(input.lines.map((l) => ({ type: "product", productId: l.productId, quantity: l.quantity })));
    if (!lines) throw new OrderError("El ticket está vacío o tiene un producto no válido.");
    if (!(input.tender in TENDERS)) throw new OrderError("Elige un medio de cobro.");
    const o = await posSale(lines, input.tender as Tender, input.reference, s, input.requestKey.slice(0, 64));
    sale = { id: o.id, code: o.code };
  });
  return { ...r, ...(sale ?? {}) };
}

/** Buscador de mostrador: código leído del QR → ficha del pedido. */
export async function findAction(_: ActionState, f: FormData): Promise<ActionState> {
  await requireStaff();
  const [o] = await query("select id from orders where code=$1", [str(f, "code").trim().toUpperCase()]);
  if (!o) return { error: "No hay ningún pedido con ese código." };
  redirect(`/backoffice/pedidos/${o.id}`);
}
