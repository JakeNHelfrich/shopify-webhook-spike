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
  inventoryLevels: WebhookInventoryLevelDTO[];
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
  ) {}

  async execute(
    request: ProcessInventoryWebhookRequest
  ): Promise<ProcessInventoryWebhookResponse> {
    // Step 1: Validate webhook signature
    if (!this.webhookValidator.validate(request.rawBody, request.signature)) {
      throw new Error("Invalid webhook signature");
    }

    // Step 2: Validate request data
    this.validateRequest(request);

    // Step 3: Transform DTO to domain entities
    const inventoryLevels = this.transformToEntities(
      request.shopName,
      request.inventoryLevels
    );

    // Step 4: Save to repository
    const result = await this.saveInventories(inventoryLevels);

    return result;
  }

  private validateRequest(request: ProcessInventoryWebhookRequest): void {
    if (!request.shopName || request.shopName.trim().length === 0) {
      throw new Error("Shop name is required");
    }

    if (!Array.isArray(request.inventoryLevels)) {
      throw new Error("Inventory levels must be an array");
    }

    if (request.inventoryLevels.length === 0) {
      throw new Error("Inventory levels array cannot be empty");
    }
  }

  private transformToEntities(
    shopName: string,
    dtos: WebhookInventoryLevelDTO[]
  ): InventoryLevel[] {
    return dtos.map((dto) => {
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
    });
  }

  private async saveInventories(
    inventories: InventoryLevel[]
  ): Promise<ProcessInventoryWebhookResponse> {
    const errors: Array<{ index: number; reason: string }> = [];
    let successCount = 0;

    try {
      await this.inventoryRepository.saveMany(inventories);
      successCount = inventories.length;
    } catch (error) {
      // If batch save fails, try individual saves to get granular error tracking
      for (let i = 0; i < inventories.length; i++) {
        try {
          await this.inventoryRepository.save(inventories[i]);
          successCount++;
        } catch (err) {
          errors.push({
            index: i,
            reason: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      processedCount: successCount,
      errors,
    };
  }
}
