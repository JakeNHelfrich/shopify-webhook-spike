/**
 * Domain entity representing a single inventory level record
 * This is the core business object that tracks stock at a location
 */
export class InventoryLevel {
  constructor(
    readonly shopName: string,
    readonly variantId: number,
    readonly locationId: number,
    readonly available: number,
    readonly updatedAt: Date,
    readonly inventoryItemId?: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.shopName || this.shopName.trim().length === 0) {
      throw new Error("Shop name is required");
    }
    if (this.variantId <= 0) {
      throw new Error("Variant ID must be positive");
    }
    if (this.locationId <= 0) {
      throw new Error("Location ID must be positive");
    }
    if (this.available < 0) {
      throw new Error("Available stock cannot be negative");
    }
    if (!this.updatedAt || !(this.updatedAt instanceof Date)) {
      throw new Error("Updated date must be a valid Date");
    }
  }

  /**
   * Generate composite key for storage
   */
  getCompositeKey(): string {
    return `${this.shopName}#${this.variantId}`;
  }

  /**
   * Get location as string for sort key
   */
  getLocationKey(): string {
    return this.locationId.toString();
  }
}
