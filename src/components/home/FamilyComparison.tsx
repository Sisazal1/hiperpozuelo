"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllBundles } from "@/lib/catalog/bundles";
import { getFamilyPricing } from "@/lib/catalog/pack-pricing";
import { formatEuroPrice } from "@/lib/catalog/pricing";
import type { BundleTier } from "@/types/catalog";
const families = [{id:"kitchen",label:"Cocina"},{id:"bathroom",label:"Baño"},{id:"cleaning",label:"Limpieza"},{id:"stationery",label:"Estudio"}];
const tiers: BundleTier[]=["small","medium","large"]; const labels={small:"Pequeño",medium:"Mediano",large:"Grande"};
export default function FamilyComparison(){const [family,setFamily]=useState("kitchen");const bundles=getAllBundles().filter(b=>b.category_id===family);const pricing=getFamilyPricing(family);return <Reveal><section className="home-section comparison-section"><div className="home-section-heading"><div><span className="eyebrow">Compara sin sorpresas</span><h2>El tamaño que encaja contigo.</h2></div><p>Las cifras salen de los productos incluidos en cada pack.</p></div><div className="comparison-tabs" role="tablist" aria-label="Familia de packs">{families.map(item=><button key={item.id} role="tab" aria-selected={family===item.id} className={family===item.id?"selected":""} onClick={()=>setFamily(item.id)}>{item.label}</button>)}</div><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th scope="col">Tamaño</th><th scope="col">Artículos</th><th scope="col">Precio</th><th scope="col">Precio por artículo</th><th scope="col">Ver pack</th></tr></thead><tbody>{tiers.map(tier=>{const bundle=bundles.find(b=>b.tier===tier);const item=bundle?pricing.byTier[tier]:undefined;return <tr key={tier}><th scope="row">{labels[tier]}</th><td>{item?.itemCount??0}</td><td><strong>{formatEuroPrice(item?.packTotal??0)}</strong></td><td>{formatEuroPrice(item?.pricePerItem??0)}</td><td>{bundle&&<Link href={`/packs/${family}/${tier}`} aria-label={`Ver pack ${labels[tier]}`}><ArrowRight size={17}/></Link>}</td></tr>})}</tbody></table></div></section></Reveal>}
function Reveal({children}:{children:React.ReactNode}){return <div className="home-reveal" data-revealed="true">{children}</div>}
