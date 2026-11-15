import {
  Bath,
  Boxes,
  Hammer,
  NotebookPen,
  PartyPopper,
  Shirt,
  Sparkles,
  Sprout,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  kitchen: UtensilsCrossed,
  bathroom: Bath,
  cleaning: Sparkles,
  organization: Boxes,
  stationery: NotebookPen,
  decoration_party: PartyPopper,
  diy: Hammer,
  textiles: Shirt,
  garden: Sprout,
};

export function CategoryIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = icons[id] ?? Boxes;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />;
}

/** Class that sets the soft background/foreground colours for a category tile (see globals.css). */
export const toneClass = (id: string) => `tone-${id}`;
