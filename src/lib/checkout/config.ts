import { commerceConfig } from "@/config/commerce";
export const logisticsConfig = {
  mode: "demo" as const,
  deliveryCost: commerceConfig.standardShippingFee,
  freeDeliveryThreshold: commerceConfig.freeShippingThreshold,
  collectCost: commerceConfig.collectionFee,
  deliveryEstimate: null as string | null,
  pickupWindows: [] as string[],
  storeAddress: null as string | null,
};
