import fs from "node:fs";
const file="src/data/seed/hiper-pozuelo-catalogo-estimado.json";
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const ids=new Set(data.products.map(p=>p.id)); const slugs=new Set(data.products.map(p=>p.slug)); const categories=new Set(data.categories.map(c=>c.id)); const errors=[];
if(ids.size!==data.products.length) errors.push("duplicate product ids"); if(slugs.size!==data.products.length) errors.push("duplicate product slugs");
for(const p of data.products){if(!categories.has(p.category_id)) errors.push(`invalid category ${p.id}`); for(const id of p.cross_sell_ids) if(!ids.has(id)) errors.push(`invalid cross-sell ${p.id} -> ${id}`); if(p.orderable!==false||p.catalog_status!=="proposed_not_verified") errors.push(`unsafe product ${p.id}`);}
for(const b of data.bundles){const total=b.product_ids.reduce((sum,id)=>sum+(data.products.find(p=>p.id===id)?.proposed_price_eur??NaN),0); if(!b.product_ids.every(id=>ids.has(id))) errors.push(`invalid bundle ${b.id}`); if(Math.abs(total-b.estimated_total_eur)>.001) errors.push(`bundle total mismatch ${b.id}`); if(b.orderable!==false||b.catalog_status!=="proposed_not_verified") errors.push(`unsafe bundle ${b.id}`);}
if(errors.length){console.error(errors.join("\n"));process.exit(1)} console.log(`Catalog valid: ${data.products.length} products, ${data.categories.length} categories, ${data.bundles.length} bundles`);
