import { InventoryLevel } from "../entities/InventoryLevel";
import { InventoryRepository } from "../ports/InventoryRepository";
import { WebhookValidator } from "../ports/WebhookValidator";

/**
 * Input DTO for webhook data
 */
export interface WebhookInventoryLevelDTO {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
}

export interface ProcessInventoryWebhookRequest {
  shopName: string;
  rawBody: string;
  signature: string | undefined;
  inventoryLevel: WebhookInventoryLevelDTO;
}

export interface ProcessInventoryWebhookResponse {
  success: boolean;
  processedCount: number;
  errors: Array<{
    index: number;
    reason: string;
  }>;
}

/**
 * Use case for processing inventory level updates from Shopify webhooks
 * Core business logic isolated from infrastructure concerns
 */
export class ProcessInventoryWebhookUseCase {
  constructor(
    private inventoryRepository: InventoryRepository,
    private webhookValidator: WebhookValidator
  ) { }

  async execute(
    request: ProcessInventoryWebhookRequest
  ): Promise<ProcessInventoryWebhookResponse> {
    this.validateRequest(request);

    const inventoryLevel = this.transformToEntity(
      request.shopName,
      request.inventoryLevel
    );

    const result = await this.saveInventory(inventoryLevel);

    return result;
  }

  private validateRequest(request: ProcessInventoryWebhookRequest): void {
    if (!request.shopName || request.shopName.trim().length === 0) {
      throw new Error("Shop name is required");
    }

    if (!request.inventoryLevel || typeof request.inventoryLevel !== 'object') {
      throw new Error("Inventory level is required");
    }
  }

  private transformToEntity(
    shopName: string,
    dto: WebhookInventoryLevelDTO
  ): InventoryLevel {
    const updatedAt = new Date(dto.updated_at);
    if (isNaN(updatedAt.getTime())) {
      throw new Error(
        `Invalid date format for updated_at: ${dto.updated_at}`
      );
    }

    return new InventoryLevel(
      shopName,
      dto.inventory_item_id,
      dto.location_id,
      dto.available,
      updatedAt,
      dto.inventory_item_id
    );
  }

  private async saveInventory(
    inventory: InventoryLevel
  ): Promise<ProcessInventoryWebhookResponse> {
    try {
      await this.inventoryRepository.save(inventory);
      return {
        success: true,
        processedCount: 1,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        processedCount: 0,
        errors: [
          {
            index: 0,
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        ],
      };
    }
  }
}
