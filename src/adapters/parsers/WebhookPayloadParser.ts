import { WebhookInventoryLevelDTO } from "../../domain/usecases/ProcessInventoryWebhookUseCase";
import {
  isShopifyEventBridgeEvent,
  isShopifyEventBridgeDetail,
  isInventoryLevelPayloadArray,
  isShopifyWebhookMetadata,
  type ShopifyEventBridgeEvent,
  type ShopifyWebhookMetadata,
} from "../types/EventBridgeTypes";

export interface ParsedWebhookResult {
  inventoryLevel: WebhookInventoryLevelDTO;
  headers: ShopifyWebhookMetadata;
  body: string;
}

/**
 * Parses and validates webhook payload structure
 */
export class WebhookPayloadParser {
  /**
   * Parse EventBridge event and extract inventory levels and metadata
   */
  static parseEventBridgeEvent(event: unknown): ParsedWebhookResult {
    if (!isShopifyEventBridgeEvent(event)) {
      throw new Error("Invalid EventBridge event structure");
    }

    const eventBridgeEvent = event as ShopifyEventBridgeEvent;
    const detail = eventBridgeEvent.detail;

    if (!isShopifyEventBridgeDetail(detail)) {
      throw new Error("Invalid EventBridge detail structure");
    }

    if (!isShopifyWebhookMetadata(detail.metadata)) {
      throw new Error("Invalid metadata in EventBridge event");
    }

    const inventoryLevel = detail.payload as WebhookInventoryLevelDTO;
    const headers = detail.metadata as ShopifyWebhookMetadata;
    const body = JSON.stringify({ inventory_levels: [inventoryLevel] });

    return {
      inventoryLevel,
      headers,
      body,
    };
  }

  /**
   * Parse and extract inventory levels from webhook payload
   */
  static parseInventoryLevels(body: string): WebhookInventoryLevelDTO[] {
    try {
      const payload = JSON.parse(body);

      if (!Array.isArray(payload.inventory_levels)) {
        throw new Error("Missing or invalid inventory_levels array");
      }

      // Validate each inventory level entry
      payload.inventory_levels.forEach((level: unknown, index: number) => {
        this.validateInventoryLevel(level, index);
      });

      return payload.inventory_levels as WebhookInventoryLevelDTO[];
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("Invalid JSON in webhook body");
      }
      throw error;
    }
  }

  /**
   * Extract shop name from headers
   */
  static extractShopName(headers: Record<string, string | undefined>): string {
    const shopDomain =
      headers["x-shopify-shop-domain"] ||
      headers["X-Shopify-Shop-Domain"] ||
      headers["x-shopify-shop-api-call-limit"];

    if (!shopDomain) {
      throw new Error("Unable to extract shop name from headers");
    }

    return shopDomain;
  }

  /**
   * Extract webhook topic from headers
   */
  static extractTopic(headers: Record<string, string | undefined>): string {
    return (
      headers["x-shopify-topic"] ||
      headers["X-Shopify-Topic"] ||
      "unknown"
    );
  }

  /**
   * Extract webhook signature from headers
   */
  static extractSignature(headers: Record<string, string | undefined>): string | undefined {
    return (
      headers["x-shopify-hmac-sha256"] ||
      headers["X-Shopify-Hmac-SHA256"]
    );
  }

  private static validateInventoryLevel(
    level: unknown,
    index: number
  ): void {
    if (typeof level !== "object" || level === null) {
      throw new Error(`Invalid inventory level at index ${index}: not an object`);
    }

    const obj = level as Record<string, unknown>;

    if (typeof obj.inventory_item_id !== "number") {
      throw new Error(
        `Invalid inventory_item_id at index ${index}: must be a number`
      );
    }

    if (typeof obj.location_id !== "number") {
      throw new Error(
        `Invalid location_id at index ${index}: must be a number`
      );
    }

    if (typeof obj.available !== "number") {
      throw new Error(
        `Invalid available stock at index ${index}: must be a number`
      );
    }

    if (typeof obj.updated_at !== "string") {
      throw new Error(
        `Invalid updated_at at index ${index}: must be a string (ISO 8601)`
      );
    }
  }
}
