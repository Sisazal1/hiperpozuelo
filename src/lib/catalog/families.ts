// Imágenes de AMBIENTE (estancias), nunca fotos de producto: ver src/data/image-manifest.json.
// Los nombres de /ai/packs-*-4x5 no coinciden con lo que enseñan (la de «baño» es una cocina y la de
// «limpieza» un baño): aquí cada familia usa la imagen por su contenido real.
export const families = [
  { id: "kitchen", label: "Cocina", image: "/ai/packs-bano-4x5-1600.webp", images: ["/ai/packs-bano-4x5-1600.webp", "/ai/pack-cocina.webp"], intro: "Utensilios y accesorios para cocinar desde el primer día.", tagline: "Cocina lista. Sin dar mil vueltas." },
  { id: "bathroom", label: "Baño", image: "/ai/packs-limpieza-4x5-1600.webp", images: ["/ai/packs-limpieza-4x5-1600.webp", "/ai/pack-bano.webp"], intro: "Lo práctico para tener el baño equipado y ordenado.", tagline: "Baño a punto en un clic." },
  { id: "cleaning", label: "Limpieza", image: "/ai/pack-limpieza.webp", images: ["/ai/pack-limpieza.webp"], intro: "Los básicos para limpiar suelos, superficies y cocina.", tagline: "Todo para limpiar. Nada que no uses." },
  { id: "stationery", label: "Estudio", image: "/ai/packs-estudio-4x5-1600.webp", images: ["/ai/packs-estudio-4x5-1600.webp", "/ai/pack-estudio.webp"], intro: "Material para estudiar, organizarte y trabajar en casa.", tagline: "Escritorio listo para rendir." },
] as const;
