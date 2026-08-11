import type { Product } from "../modules/product/product.schema.js";
import type { Cart } from "../generated/prisma/client.js";
export type UnavailableReason = "DELETED" | "OUT_OF_STOCK";

export interface UnavailableItem extends Cart {
  reason: UnavailableReason;
}

export interface MergedItem extends Cart {
  product: Product;
  unitPrice: number;
  lineTotal: number;
  reason?: string;
}

export interface UnavailableItem extends Cart {
  reason: UnavailableReason;
}