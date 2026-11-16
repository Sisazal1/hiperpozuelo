import Image from "next/image";
import {
  Archive,
  Bath,
  BookOpen,
  Box,
  Brush,
  ChefHat,
  CookingPot,
  Droplets,
  Flower2,
  Gift,
  GlassWater,
  Hammer,
  Lamp,
  Layers,
  Package,
  Palette,
  PartyPopper,
  PenLine,
  Scissors,
  Shirt,
  ShoppingBasket,
  Sparkles,
  SprayCan,
  Sticker,
  Trash2,
  Utensils,
  WashingMachine,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Visual honesto para productos sin foto real: icono de línea de la subcategoría sobre el
// tono de su categoría. NUNCA una foto de ambiente ni generada con IA en lugar del producto.
const BY_SUBCATEGORY: Record<string, LucideIcon> = {
  Utensilios: Utensils,
  Conservación: Box,
  Preparación: ChefHat,
  "Almacenaje de cocina": Archive,
  "Botellas y vasos": GlassWater,
  "Textil cocina": Layers,
  "Accesorios de baño": Bath,
  "Organización de baño": Archive,
  "Textil baño": Layers,
  Lavandería: WashingMachine,
  Fregado: Droplets,
  "Paños y bayetas": Sparkles,
  Residuos: Trash2,
  "Útiles de limpieza": SprayCan,
  Cestas: ShoppingBasket,
  Organizadores: Archive,
  Cajas: Package,
  Armario: Shirt,
  "Almacenaje textil": Package,
  Cuadernos: BookOpen,
  Escritura: PenLine,
  Organización: Archive,
  "Dibujo y color": Palette,
  Accesorios: Scissors,
  Decoración: Lamp,
  "Regalo y envoltorio": Gift,
  Fiesta: PartyPopper,
  Adhesivos: Sticker,
  "Adhesivos y manualidades": Scissors,
};
const BY_CATEGORY: Record<string, LucideIcon> = {
  kitchen: CookingPot,
  bathroom: Bath,
  cleaning: Brush,
  organization: Archive,
  stationery: PenLine,
  decoration_party: PartyPopper,
  diy: Hammer,
  textiles: Layers,
  garden: Flower2,
};
export const categoryIcon = (categoryId: string) => BY_CATEGORY[categoryId] ?? Wrench;

export default function ProductVisual({
  image,
  subcategory,
  categoryId,
  name,
  size = "md",
  className = "",
  priority = false,
}: {
  image?: string;
  subcategory?: string;
  categoryId: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}) {
  if (image)
    return (
      <span className={`product-visual has-photo pv-${size} ${className}`}>
        <Image src={image} alt={name ?? ""} fill sizes="(max-width: 700px) 50vw, 25vw" priority={priority} />
      </span>
    );
  const Icon = (subcategory && BY_SUBCATEGORY[subcategory]) || categoryIcon(categoryId);
  return (
    <span className={`product-visual pv-${size} pv-cat-${categoryId} ${className}`} aria-hidden="true">
      <span className="pv-ring" />
      <Icon className="pv-icon" strokeWidth={1.25} />
    </span>
  );
}
