const fields = [
  ["contact", "Contacto"], ["taxId", "CIF"], ["address", "Dirección"],
  ["openingHours", "Horario"], ["collection", "Recogida"], ["deliveryTime", "Plazo de entrega"],
];
console.log("Datos comerciales pendientes para el lanzamiento:");
for (const [, label] of fields) console.log(`- ${label}`);

// Bloqueos técnicos: lo que la web no puede hacer hasta que se conecte.
const blockers = [
  "Email: sin proveedor (src/lib/server/mail.ts) no hay verificación de email ni recuperación de contraseña en las cuentas.",
];
console.log("\nBloqueos de lanzamiento:");
for (const b of blockers) console.log(`- ${b}`);
