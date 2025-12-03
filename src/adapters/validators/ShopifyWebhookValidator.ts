import * as crypto from "crypto";
import { WebhookValidator } from "../../domain/ports/WebhookValidator";

/**
 * Shopify webhook validator
 * Implements HMAC-SHA256 signature verification
 * See: https://shopify.dev/docs/apps/build/webhooks/manage-webhooks#verify-webhook-authenticity
 */
export class ShopifyWebhookValidator implements WebhookValidator {
  constructor(private sharedSecret: string) {}

  validate(body: string, signature: string | undefined): boolean {
    if (!signature) {
      console.warn("Missing X-Shopify-Hmac-SHA256 signature");
      return false;
    }

    if (!body) {
      console.warn("Empty webhook body");
      return false;
    }

    const hash = crypto
      .createHmac("sha256", this.sharedSecret)
      .update(body, "utf8")
      .digest("base64");

    const isValid = hash === signature;

    if (!isValid) {
      console.warn(`Invalid webhook signature. Expected: ${hash}, Got: ${signature}`);
    }

    return isValid;
  }
}
