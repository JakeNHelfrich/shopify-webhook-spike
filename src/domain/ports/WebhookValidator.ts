/**
 * Outbound port for webhook validation
 * Abstracts signature verification from domain logic
 */
export interface WebhookValidator {
  /**
   * Verify the authenticity of a webhook
   * Returns true if valid, false otherwise
   */
  validate(body: string, signature: string | undefined): boolean;
}
