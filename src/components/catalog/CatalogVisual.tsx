import Image from "next/image";
export default function CatalogVisual({ image, label, className = "" }: { image?: string; label: string; className?: string }) { return image ? <Image src={image} alt="" width={480} height={480} sizes="(max-width: 700px) 50vw, 25vw" className={className} /> : <span className={`category-tile ${className}`} aria-hidden="true">{label.slice(0, 1)}</span>; }
