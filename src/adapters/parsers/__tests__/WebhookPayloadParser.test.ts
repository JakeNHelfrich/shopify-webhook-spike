import { WebhookPayloadParser } from "../WebhookPayloadParser";

describe("WebhookPayloadParser", () => {
  describe("parseInventoryLevels", () => {
    it("should parse valid inventory levels from JSON", () => {
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

      const result = WebhookPayloadParser.parseInventoryLevels(body);

      expect(result).toHaveLength(1);
      expect(result[0].inventory_item_id).toBe(12345);
      expect(result[0].location_id).toBe(789);
      expect(result[0].available).toBe(50);
      expect(result[0].updated_at).toBe("2024-01-15T10:30:00Z");
    });

    it("should parse multiple inventory levels", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
          {
            inventory_item_id: 12346,
            location_id: 790,
            available: 100,
            updated_at: "2024-01-15T10:31:00Z",
          },
        ],
      });

      const result = WebhookPayloadParser.parseInventoryLevels(body);

      expect(result).toHaveLength(2);
      expect(result[1].inventory_item_id).toBe(12346);
    });

    it("should throw on invalid JSON", () => {
      const body = "{ invalid json }";

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid JSON in webhook body");
    });

    it("should throw on missing inventory_levels array", () => {
      const body = JSON.stringify({ data: [] });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Missing or invalid inventory_levels array");
    });

    it("should throw when inventory_levels is not an array", () => {
      const body = JSON.stringify({ inventory_levels: { foo: "bar" } });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Missing or invalid inventory_levels array");
    });

    it("should throw when inventory level is not an object", () => {
      const body = JSON.stringify({
        inventory_levels: ["not an object"],
      });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid inventory level at index 0: not an object");
    });

    it("should throw when inventory_item_id is missing", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid inventory_item_id at index 0: must be a number");
    });

    it("should throw when inventory_item_id is not a number", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: "12345",
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid inventory_item_id at index 0: must be a number");
    });

    it("should throw when location_id is not a number", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: 12345,
            location_id: "789",
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid location_id at index 0: must be a number");
    });

    it("should throw when available is not a number", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: "50",
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid available stock at index 0: must be a number");
    });

    it("should throw when updated_at is not a string", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: 1705316400000,
          },
        ],
      });

      expect(() => {
        WebhookPayloadParser.parseInventoryLevels(body);
      }).toThrow("Invalid updated_at at index 0: must be a string");
    });
  });

  describe("extractShopName", () => {
    it("should extract shop name from x-shopify-shop-domain header", () => {
      const headers = { "x-shopify-shop-domain": "myshop.myshopify.com" };
      expect(WebhookPayloadParser.extractShopName(headers)).toBe(
        "myshop.myshopify.com"
      );
    });

    it("should extract shop name from X-Shopify-Shop-Domain (capitalized)", () => {
      const headers = { "X-Shopify-Shop-Domain": "myshop.myshopify.com" };
      expect(WebhookPayloadParser.extractShopName(headers)).toBe(
        "myshop.myshopify.com"
      );
    });

    it("should prefer x-shopify-shop-domain over fallback headers", () => {
      const headers = {
        "x-shopify-shop-domain": "primary.myshopify.com",
        "x-shopify-shop-api-call-limit": "fallback.myshopify.com",
      };
      expect(WebhookPayloadParser.extractShopName(headers)).toBe(
        "primary.myshopify.com"
      );
    });

    it("should throw when no shop domain header is present", () => {
      const headers = {};

      expect(() => {
        WebhookPayloadParser.extractShopName(headers);
      }).toThrow("Unable to extract shop name from headers");
    });

    it("should handle case-insensitive header lookup", () => {
      const headers = { "X-Shopify-Shop-Domain": "test.myshopify.com" };
      expect(WebhookPayloadParser.extractShopName(headers)).toBe(
        "test.myshopify.com"
      );
    });
  });

  describe("extractTopic", () => {
    it("should extract topic from x-shopify-topic header", () => {
      const headers = { "x-shopify-topic": "inventory_levels/update" };
      expect(WebhookPayloadParser.extractTopic(headers)).toBe(
        "inventory_levels/update"
      );
    });

    it("should extract topic from X-Shopify-Topic (capitalized)", () => {
      const headers = { "X-Shopify-Topic": "inventory_levels/update" };
      expect(WebhookPayloadParser.extractTopic(headers)).toBe(
        "inventory_levels/update"
      );
    });

    it("should return 'unknown' when topic header is missing", () => {
      const headers = {};
      expect(WebhookPayloadParser.extractTopic(headers)).toBe("unknown");
    });
  });

  describe("extractSignature", () => {
    it("should extract signature from x-shopify-hmac-sha256 header", () => {
      const headers = { "x-shopify-hmac-sha256": "abc123signature" };
      expect(WebhookPayloadParser.extractSignature(headers)).toBe(
        "abc123signature"
      );
    });

    it("should extract signature from X-Shopify-Hmac-SHA256 (capitalized)", () => {
      const headers = { "X-Shopify-Hmac-SHA256": "abc123signature" };
      expect(WebhookPayloadParser.extractSignature(headers)).toBe(
        "abc123signature"
      );
    });

    it("should return undefined when signature header is missing", () => {
      const headers = {};
      expect(WebhookPayloadParser.extractSignature(headers)).toBeUndefined();
    });
  });

  describe("integration scenarios", () => {
    it("should parse a complete realistic webhook payload", () => {
      const body = JSON.stringify({
        inventory_levels: [
          {
            inventory_item_id: 111,
            location_id: 1,
            available: 25,
            updated_at: "2024-01-15T10:30:00Z",
          },
          {
            inventory_item_id: 111,
            location_id: 2,
            available: 15,
            updated_at: "2024-01-15T10:30:00Z",
          },
          {
            inventory_item_id: 222,
            location_id: 1,
            available: 0,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      });

      const headers = {
        "x-shopify-shop-domain": "mystore.myshopify.com",
        "x-shopify-topic": "inventory_levels/update",
        "x-shopify-hmac-sha256": "oL8zW+VpOZdxPkNaXoLYqw98OKk=",
      };

      const levels = WebhookPayloadParser.parseInventoryLevels(body);
      const shop = WebhookPayloadParser.extractShopName(headers);
      const topic = WebhookPayloadParser.extractTopic(headers);
      const sig = WebhookPayloadParser.extractSignature(headers);

      expect(levels).toHaveLength(3);
      expect(shop).toBe("mystore.myshopify.com");
      expect(topic).toBe("inventory_levels/update");
      expect(sig).toBe("oL8zW+VpOZdxPkNaXoLYqw98OKk=");
    });
  });
});
