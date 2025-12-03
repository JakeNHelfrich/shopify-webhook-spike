/**
 * Type definitions for Shopify EventBridge webhook events
 */

export interface ShopifyWebhookMetadata {
  'x-shopify-shop-domain'?: string;
  'X-Shopify-Shop-Domain'?: string;
  'x-shopify-topic'?: string;
  'X-Shopify-Topic'?: string;
  'x-shopify-hmac-sha256'?: string;
  'X-Shopify-Hmac-SHA256'?: string;
  [key: string]: string | undefined;
}

export interface InventoryLevelPayload {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
  admin_graphql_api_id?: string;
}

export interface ShopifyEventBridgeDetail {
  payload: unknown;
  metadata: unknown;
}

export interface ShopifyEventBridgeEvent {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: unknown[];
  detail: ShopifyEventBridgeDetail;
}

/**
 * Type guards for runtime validation
 */

export function isShopifyEventBridgeEvent(event: unknown): event is ShopifyEventBridgeEvent {
  if (typeof event !== 'object' || event === null) {
    return false;
  }

  const e = event as Record<string, unknown>;
  return (
    typeof e.version === 'string' &&
    typeof e.id === 'string' &&
    typeof e['detail-type'] === 'string' &&
    typeof e.source === 'string' &&
    typeof e.detail === 'object' &&
    e.detail !== null
  );
}

export function isShopifyEventBridgeDetail(detail: unknown): detail is ShopifyEventBridgeDetail {
  if (typeof detail !== 'object' || detail === null) {
    return false;
  }

  const d = detail as Record<string, unknown>;
  return (
    isInventoryLevelPayload(d.payload) &&
    typeof d.metadata === 'object' &&
    d.metadata !== null
  );
}

export function isInventoryLevelPayloadArray(payload: unknown): payload is InventoryLevelPayload[] {
  if (!Array.isArray(payload)) {
    return false;
  }

  return payload.every(item => isInventoryLevelPayload(item));
}

export function isInventoryLevelPayload(item: unknown): item is InventoryLevelPayload {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const i = item as Record<string, unknown>;
  return (
    typeof i.inventory_item_id === 'number' &&
    typeof i.location_id === 'number' &&
    typeof i.available === 'number' &&
    typeof i.updated_at === 'string'
  );
}

export function isShopifyWebhookMetadata(metadata: unknown): metadata is ShopifyWebhookMetadata {
  if (typeof metadata !== 'object' || metadata === null) {
    return false;
  }

  const m = metadata as Record<string, unknown>;
  return Object.values(m).every(v => v === undefined || typeof v === 'string');
}
