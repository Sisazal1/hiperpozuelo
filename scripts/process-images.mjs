import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "public", "products-src");
const outputDir = path.join(root, "public", "products");
const manifestPath = path.join(root, "src", "data", "product-images.json");
const sizes = [400, 800, 1600];
const files = (await fs.readdir(sourceDir).catch(() => [])).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
const manifest = {};
await fs.mkdir(outputDir, { recursive: true });
for (const file of files) {
  const parsed = path.parse(file); const slug = parsed.name;
  const input = path.join(sourceDir, file); const image = sharp(input); const metadata = await image.metadata();
  const entry = { blurDataURL: await image.clone().resize(24).jpeg({ quality: 35 }).toBuffer().then((buffer) => `data:image/jpeg;base64,${buffer.toString("base64")}`), widths: {} };
  for (const width of sizes) { const base = `/products/${slug}-${width}`; await image.clone().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(outputDir, `${slug}-${width}.webp`)); await image.clone().resize({ width, withoutEnlargement: true }).avif({ quality: 65 }).toFile(path.join(outputDir, `${slug}-${width}.avif`)); entry.widths[width] = { webp: `${base}.webp`, avif: `${base}.avif` }; }
  manifest[slug] = { ...entry, sourceWidth: metadata.width ?? null, sourceHeight: metadata.height ?? null };
}
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Procesadas ${files.length} imágenes. Manifest actualizado en src/data/product-images.json.`);
