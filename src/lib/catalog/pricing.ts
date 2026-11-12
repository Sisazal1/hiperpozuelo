import type { Product } from "@/types/catalog";
export const calculateProductSubtotal = (product:Product, quantity=1) => product.proposed_price_eur * quantity;
export const formatEuroPrice = (amount:number, locale="es-ES") => new Intl.NumberFormat(locale,{style:"currency",currency:"EUR"}).format(amount);
