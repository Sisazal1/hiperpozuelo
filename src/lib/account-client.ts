"use client";

/** Marca no sensible: evita preguntar por la sesión a quien compra sin cuenta. La sesión real va en cookie httpOnly. */
const FLAG = "hp-account";
export const hasAccountFlag = () => {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};
export const setAccountFlag = (on: boolean) => {
  try {
    if (on) localStorage.setItem(FLAG, "1");
    else localStorage.removeItem(FLAG);
  } catch {}
};

export async function accountPost(action: string, body: object = {}): Promise<{ ok?: true; error?: string; [k: string]: unknown }> {
  try {
    const r = await fetch(`/api/account/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await r.json();
  } catch {
    return { error: "No hay conexión. Vuelve a intentarlo." };
  }
}

/** Al entrar: une los favoritos de este navegador con los de la cuenta. */
export async function afterLogin() {
  setAccountFlag(true);
  let ids: unknown = [];
  try {
    ids = JSON.parse(localStorage.getItem("hp-favorites") || "[]");
  } catch {}
  const r = await accountPost("favorites-merge", { ids });
  if (Array.isArray(r.favorites)) {
    try {
      localStorage.setItem("hp-favorites", JSON.stringify(r.favorites));
    } catch {}
  }
}
