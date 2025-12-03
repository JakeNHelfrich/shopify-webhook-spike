import { ShopifyWebhookValidator } from "../ShopifyWebhookValidator";
import * as crypto from "crypto";

describe("ShopifyWebhookValidator", () => {
  let validator: ShopifyWebhookValidator;
  const testSecret = "test-webhook-secret";

  beforeEach(() => {
    validator = new ShopifyWebhookValidator(testSecret);
  });

  describe("valid signatures", () => {
    it("should validate correct HMAC-SHA256 signature", () => {
      const body = JSON.stringify({ inventory_levels: [] });
      const expectedSignature = crypto
        .createHmac("sha256", testSecret)
        .update(body, "utf8")
        .digest("base64");

      const result = validator.validate(body, expectedSignature);

      expect(result).toBe(true);
    });

    it("should validate signature for complex JSON payload", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      });

      const expectedSignature = crypto
        .createHmac("sha256", testSecret)
        .update(body, "utf8")
        .digest("base64");

      const result = validator.validate(body, expectedSignature);

      expect(result).toBe(true);
    });

    it("should validate signature with different secrets", () => {
      const differentSecret = "different-secret";
      const differentValidator = new ShopifyWebhookValidator(differentSecret);
      const body = "test body";

      const expectedSignature = crypto
        .createHmac("sha256", differentSecret)
        .update(body, "utf8")
        .digest("base64");

      const result = differentValidator.validate(body, expectedSignature);

      expect(result).toBe(true);
    });
  });

  describe("invalid signatures", () => {
    it("should reject incorrect signature", () => {
      const body = JSON.stringify({ inventory_levels: [] });
      const incorrectSignature = "incorrect-signature-value";

      const result = validator.validate(body, incorrectSignature);

      expect(result).toBe(false);
    });

    it("should reject signature from different secret", () => {
      const body = JSON.stringify({ inventory_levels: [] });
      const wrongSecret = "wrong-secret";

      const wrongSignature = crypto
        .createHmac("sha256", wrongSecret)
        .update(body, "utf8")
        .digest("base64");

      const result = validator.validate(body, wrongSignature);

      expect(result).toBe(false);
    });

    it("should reject if body was tampered with", () => {
      const originalBody = JSON.stringify({ inventory_levels: [] });
      const tamperedBody = JSON.stringify({
        inventory_levels: [
          { inventory_item_id: 999, location_id: 999, available: 999, updated_at: "2024-01-15T10:30:00Z" },
        ],
      });

      const signature = crypto
        .createHmac("sha256", testSecret)
        .update(originalBody, "utf8")
        .digest("base64");

      const result = validator.validate(tamperedBody, signature);

      expect(result).toBe(false);
    });

    it("should reject signature with extra whitespace", () => {
      const body = JSON.stringify({ inventory_levels: [] });
      const correctSignature = crypto
        .createHmac("sha256", testSecret)
        .update(body, "utf8")
        .digest("base64");

      const signatureWithSpace = ` ${correctSignature} `;

      const result = validator.validate(body, signatureWithSpace);

      expect(result).toBe(false);
    });
  });

  describe("missing signature", () => {
    it("should return false when signature is undefined", () => {
      const body = "test body";

      const result = validator.validate(body, undefined);

      expect(result).toBe(false);
    });

    it("should handle undefined gracefully", () => {
      const body = JSON.stringify({ inventory_levels: [] });

      expect(() => {
        validator.validate(body, undefined);
      }).not.toThrow();
    });
  });

  describe("empty body", () => {
    it("should return false for empty body", () => {
      const result = validator.validate("", "some-signature");

      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle very long body", () => {
      const longBody = JSON.stringify({
        inventory_levels: Array.from({ length: 1000 }, (_, i) => ({
          inventory_item_id: i,
          location_id: i,
          available: i,
          updated_at: "2024-01-15T10:30:00Z",
        })),
      });

      const signature = crypto
        .createHmac("sha256", testSecret)
        .update(longBody, "utf8")
        .digest("base64");

      const result = validator.validate(longBody, signature);

      expect(result).toBe(true);
    });

    it("should handle body with special characters", () => {
      const bodyWithSpecialChars = JSON.stringify({
        inventory_levels: [],
        special: "!@#$%^&*()_+-=[]{}|;:',.<>?/",
      });

      const signature = crypto
        .createHmac("sha256", testSecret)
        .update(bodyWithSpecialChars, "utf8")
        .digest("base64");

      const result = validator.validate(bodyWithSpecialChars, signature);

      expect(result).toBe(true);
    });

    it("should handle UTF-8 encoded characters", () => {
      const bodyWithUtf8 = JSON.stringify({
        inventory_levels: [],
        message: "Hello 世界 🌍",
      });

      const signature = crypto
        .createHmac("sha256", testSecret)
        .update(bodyWithUtf8, "utf8")
        .digest("base64");

      const result = validator.validate(bodyWithUtf8, signature);

      expect(result).toBe(true);
    });

    it("should use base64 encoding for signature comparison", () => {
      const body = "test";
      const hexSignature = crypto
        .createHmac("sha256", testSecret)
        .update(body, "utf8")
        .digest("hex"); // Wrong encoding

      const result = validator.validate(body, hexSignature);

      expect(result).toBe(false);
    });
  });

  describe("secret variations", () => {
    it("should handle secrets with special characters", () => {
      const specialSecret = "secret!@#$%^&*()";
      const specialValidator = new ShopifyWebhookValidator(specialSecret);
      const body = "test";

      const signature = crypto
        .createHmac("sha256", specialSecret)
        .update(body, "utf8")
        .digest("base64");

      const result = specialValidator.validate(body, signature);

      expect(result).toBe(true);
    });

    it("should handle empty secret", () => {
      const emptyValidator = new ShopifyWebhookValidator("");
      const body = "test";

      const signature = crypto
        .createHmac("sha256", "")
        .update(body, "utf8")
        .digest("base64");

      const result = emptyValidator.validate(body, signature);

      expect(result).toBe(true);
    });

    it("should handle very long secret", () => {
      const longSecret = "x".repeat(10000);
      const longValidator = new ShopifyWebhookValidator(longSecret);
      const body = "test";

      const signature = crypto
        .createHmac("sha256", longSecret)
        .update(body, "utf8")
        .digest("base64");

      const result = longValidator.validate(body, signature);

      expect(result).toBe(true);
    });
  });
});
