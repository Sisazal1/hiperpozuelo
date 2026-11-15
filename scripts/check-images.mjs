import fs from "node:fs/promises";
import seed from "../src/data/seed/hiper-pozuelo-catalogo-estimado.json" with { type: "json" };
const manifest = JSON.parse(await fs.readFile(new URL("../src/data/product-images.json", import.meta.url), "utf8"));
const categories = new Map(seed.categories.map((category) => [category.id, category.name_es]));
const missing = seed.products.filter((product) => !manifest[product.slug]).sort((a, b) => `${categories.get(a.category_id)}${a.name_es}`.localeCompare(`${categories.get(b.category_id)}${b.name_es}`));
for (const product of missing) console.log(`${categories.get(product.category_id)} · ${product.slug}`);
console.log(`\nSin foto: ${missing.length}/${seed.products.length}`);
