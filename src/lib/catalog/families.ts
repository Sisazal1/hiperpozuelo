// Imágenes de AMBIENTE (estancias), nunca fotos de producto: ver src/data/image-manifest.json.
export const families = [
  { id: "kitchen", label: "Cocina", image: "/ai/packs-cocina-4x5-800.webp", intro: "Utensilios y accesorios para cocinar desde el primer día.", tagline: "Cocina lista. Sin dar mil vueltas." },
  { id: "bathroom", label: "Baño", image: "/ai/packs-bano-4x5-800.webp", intro: "Lo práctico para tener el baño equipado y ordenado.", tagline: "Baño a punto en un clic." },
  { id: "cleaning", label: "Limpieza", image: "/ai/packs-limpieza-4x5-800.webp", intro: "Los básicos para limpiar suelos, superficies y cocina.", tagline: "Todo para limpiar. Nada que no uses." },
  { id: "stationery", label: "Estudio", image: "/ai/packs-estudio-4x5-800.webp", intro: "Material para estudiar, organizarte y trabajar en casa.", tagline: "Escritorio listo para rendir." },
] as const;
