export const siteConfig = {
  name: "Hiper Pozuelo",
  contact: null as string | null,
  legalName: "Hiper Pozuelo S.L.",
  taxId: null as string | null,
  address: null as string | null,
  openingHours: null as string | null,
  collection: null as string | null,
  deliveryTime: null as string | null,
  prelaunch: true,
};

export const launchData = [
  ["contact", "Contacto"],
  ["taxId", "CIF"],
  ["address", "Dirección"],
  ["openingHours", "Horario"],
  ["collection", "Recogida"],
  ["deliveryTime", "Plazo de entrega"],
] as const;
