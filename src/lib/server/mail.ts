import "server-only";

// Punto único de envío de email. Todavía no hay proveedor: `mailEnabled` es false, la web no ofrece
// verificar el email ni recuperar la contraseña, y `pnpm check:launch` lo marca como bloqueo.
// Para conectarlo: implementar `transport` y los flujos que dependen de él.
export type Mail = { to: string; subject: string; text: string };
const transport: ((m: Mail) => Promise<void>) | null = null;

export const mailEnabled = () => transport !== null;

/** Devuelve false si no se ha enviado: quien llama nunca debe decir que sí. */
export async function sendMail(m: Mail): Promise<boolean> {
  const send = transport as ((m: Mail) => Promise<void>) | null;
  if (!send) return false;
  await send(m);
  return true;
}
