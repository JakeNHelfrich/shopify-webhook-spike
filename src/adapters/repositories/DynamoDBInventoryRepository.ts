import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { InventoryLevel } from "../../domain/entities/InventoryLevel";
import { InventoryRepository } from "../../domain/ports/InventoryRepository";

/**
 * DynamoDB adapter for inventory persistence
 * Implements the InventoryRepository interface
 */
export class DynamoDBInventoryRepository implements InventoryRepository {
  constructor(
    private docClient: DynamoDBDocumentClient,
    private tableName: string
  ) {}

  async save(inventory: InventoryLevel): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        shop_variant_id: inventory.getCompositeKey(),
        location: inventory.getLocationKey(),
      },
      UpdateExpression:
        "SET #stock = :stock, #updated = :updated, #item_id = :item_id, #location_id = :location_id",
      ExpressionAttributeNames: {
        "#stock": "stock_count",
        "#updated": "updated_at",
        "#item_id": "inventory_item_id",
        "#location_id": "location_id",
      },
      ExpressionAttributeValues: {
        ":stock": inventory.available,
        ":updated": inventory.updatedAt.toISOString(),
        ":item_id": inventory.inventoryItemId,
        ":location_id": inventory.locationId,
      },
    });

    await this.docClient.send(command);
  }

  async saveMany(inventories: InventoryLevel[]): Promise<void> {
    const promises = inventories.map((inv) => this.save(inv));
    await Promise.all(promises);
  }

  async getByShopAndVariant(
    shopName: string,
    variantId: number
  ): Promise<InventoryLevel[]> {
    // Note: This would require a query operation
    // For now, this is a placeholder implementation
    // In production, you'd add a GSI for querying by shop_variant_id
    throw new Error("Not implemented");
  }

  async getByShopVariantAndLocation(
    shopName: string,
    variantId: number,
    locationId: number
  ): Promise<InventoryLevel | null> {
    // Note: This would require a get operation
    // Placeholder for now
    throw new Error("Not implemented");
  }
}
