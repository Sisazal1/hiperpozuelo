const fields = [
  ["contact", "Contacto"], ["taxId", "CIF"], ["address", "Dirección"],
  ["openingHours", "Horario"], ["collection", "Recogida"], ["deliveryTime", "Plazo de entrega"],
];
console.log("Datos comerciales pendientes para el lanzamiento:");
for (const [, label] of fields) console.log(`- ${label}`);
