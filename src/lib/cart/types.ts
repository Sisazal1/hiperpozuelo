export type ProductLine = {
  lineId: string;
  type: "product";
  productId: string;
  quantity: number;
  quantities: Record<string, number>;
  categoryId?: string;
};

export type BundleLine = {
  lineId: string;
  type: "bundle";
  bundleId: string;
  tier: string;
  quantity: number;
  quantities: Record<string, number>;
  categoryId?: string;
};

export type CustomBundleLine = {
  lineId: string;
  type: "custom_bundle";
  productIds: string[];
  quantities: Record<string, number>;
  quantity: number;
  categoryId?: string;
};

export type CartLine = ProductLine | BundleLine | CustomBundleLine;
