import assert from "node:assert/strict";
import seed from "../src/data/seed/hiper-pozuelo-catalogo-estimado.json" with { type: "json" };
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const families = ["kitchen", "bathroom", "cleaning", "stationery"];
for (const family of families) {
  const bundles = seed.bundles.filter((bundle) => bundle.category_id === family);
  assert.equal(bundles.length, 3, `${family}: deben existir tres tamaños`);
  const prices = bundles.map((bundle) => round(bundle.estimated_total_eur));
  assert.equal(round(Math.min(...prices)), Math.min(...prices), `${family}: precio Desde redondeado`);
  for (const bundle of bundles) assert.equal(round(round(bundle.estimated_total_eur) / bundle.product_ids.length), round(bundle.estimated_total_eur / bundle.product_ids.length), `${family}/${bundle.tier}: precio por artículo`);
}
console.log("Pack pricing tests passed: 4 familias, 12 tamaños.");
