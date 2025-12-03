import { InventoryLevel } from "../entities/InventoryLevel";

/**
 * Outbound port for inventory persistence
 * Abstracts the storage mechanism from domain logic
 */
export interface InventoryRepository {
  /**
   * Save or update an inventory level
   */
  save(inventory: InventoryLevel): Promise<void>;

  /**
   * Save multiple inventory levels
   */
  saveMany(inventories: InventoryLevel[]): Promise<void>;

  /**
   * Retrieve inventory by shop and variant
   */
  getByShopAndVariant(
    shopName: string,
    variantId: number
  ): Promise<InventoryLevel[]>;

  /**
   * Retrieve inventory by shop, variant, and location
   */
  getByShopVariantAndLocation(
    shopName: string,
    variantId: number,
    locationId: number
  ): Promise<InventoryLevel | null>;
}
