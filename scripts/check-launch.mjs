const fields = [
  ["contact", "Contacto"], ["taxId", "CIF"], ["address", "Dirección"],
  ["openingHours", "Horario"], ["collection", "Recogida"], ["deliveryTime", "Plazo de entrega"],
];
console.log("Datos comerciales pendientes para el lanzamiento:");
for (const [, label] of fields) console.log(`- ${label}`);

// Bloqueos técnicos: lo que la web no puede hacer hasta que se conecte.
const blockers = [
  "Email: sin proveedor no se envía el aviso previo de 15 días de las suscripciones (sendDueNotices en src/lib/server/subscriptions.ts).",
  "Stripe: el webhook de producción debe escuchar invoice.paid, invoice.payment_failed, customer.subscription.updated y customer.subscription.deleted.",
  "Puntos Hiper: la tasa y la recompensa de src/config/points.ts son una propuesta sin margen validado.",
  "Email: sin proveedor (src/lib/server/mail.ts) no hay verificación de email ni recuperación de contraseña en las cuentas.",
];
console.log("\nBloqueos de lanzamiento:");
for (const b of blockers) console.log(`- ${b}`);
