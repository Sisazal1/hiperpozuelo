import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets-src", "products-src");
const ambientSourceDir = path.join(root, "assets-src", "ai-src");
const outputDir = path.join(root, "public", "products");
const ambientOutputDir = path.join(root, "public", "ai");
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
const ambientFiles = (await fs.readdir(ambientSourceDir).catch(() => [])).filter((file) => /\.png$/i.test(file));
await fs.mkdir(ambientOutputDir, { recursive: true });
for (const file of ambientFiles) { const slug = path.parse(file).name; const image = sharp(path.join(ambientSourceDir, file)); for (const width of sizes) { await image.clone().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(ambientOutputDir, `${slug}-${width}.webp`)); await image.clone().resize({ width, withoutEnlargement: true }).avif({ quality: 65 }).toFile(path.join(ambientOutputDir, `${slug}-${width}.avif`)); } }
console.log(`Procesadas ${files.length} imágenes de producto y ${ambientFiles.length} ambientales.`);
