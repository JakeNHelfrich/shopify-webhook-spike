import { InventoryLevel } from "../InventoryLevel";

describe("InventoryLevel", () => {
  describe("constructor and validation", () => {
    it("should create a valid inventory level", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const level = new InventoryLevel(
        "myshop.myshopify.com",
        12345,
        789,
        50,
        date,
        987654
      );

      expect(level.shopName).toBe("myshop.myshopify.com");
      expect(level.variantId).toBe(12345);
      expect(level.locationId).toBe(789);
      expect(level.available).toBe(50);
      expect(level.updatedAt).toEqual(date);
      expect(level.inventoryItemId).toBe(987654);
    });

    it("should throw when shop name is empty", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("", 12345, 789, 50, date);
      }).toThrow("Shop name is required");
    });

    it("should throw when shop name is whitespace", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("   ", 12345, 789, 50, date);
      }).toThrow("Shop name is required");
    });

    it("should throw when variant ID is zero", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("myshop", 0, 789, 50, date);
      }).toThrow("Variant ID must be positive");
    });

    it("should throw when variant ID is negative", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("myshop", -1, 789, 50, date);
      }).toThrow("Variant ID must be positive");
    });

    it("should throw when location ID is zero", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("myshop", 12345, 0, 50, date);
      }).toThrow("Location ID must be positive");
    });

    it("should throw when location ID is negative", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("myshop", 12345, -1, 50, date);
      }).toThrow("Location ID must be positive");
    });

    it("should throw when available stock is negative", () => {
      const date = new Date();
      expect(() => {
        new InventoryLevel("myshop", 12345, 789, -1, date);
      }).toThrow("Available stock cannot be negative");
    });

    it("should allow zero available stock", () => {
      const date = new Date();
      const level = new InventoryLevel("myshop", 12345, 789, 0, date);
      expect(level.available).toBe(0);
    });

    it("should throw when updated date is invalid", () => {
      expect(() => {
        new InventoryLevel(
          "myshop",
          12345,
          789,
          50,
          "2024-01-15" as unknown as Date
        );
      }).toThrow("Updated date must be a valid Date");
    });

    it("should throw when updated date is null", () => {
      expect(() => {
        new InventoryLevel("myshop", 12345, 789, 50, null as unknown as Date);
      }).toThrow("Updated date must be a valid Date");
    });
  });

  describe("getCompositeKey", () => {
    it("should generate composite key with shop name and variant ID", () => {
      const level = new InventoryLevel("myshop", 12345, 789, 50, new Date());
      expect(level.getCompositeKey()).toBe("myshop#12345");
    });

    it("should handle shop names with special characters", () => {
      const level = new InventoryLevel(
        "my-shop.myshopify.com",
        12345,
        789,
        50,
        new Date()
      );
      expect(level.getCompositeKey()).toBe("my-shop.myshopify.com#12345");
    });
  });

  describe("getLocationKey", () => {
    it("should return location ID as string", () => {
      const level = new InventoryLevel("myshop", 12345, 789, 50, new Date());
      expect(level.getLocationKey()).toBe("789");
    });

    it("should handle large location IDs", () => {
      const level = new InventoryLevel(
        "myshop",
        12345,
        999999999,
        50,
        new Date()
      );
      expect(level.getLocationKey()).toBe("999999999");
    });
  });

  describe("edge cases", () => {
    it("should handle maximum safe integer for IDs", () => {
      const maxInt = Number.MAX_SAFE_INTEGER;
      const level = new InventoryLevel(
        "myshop",
        maxInt,
        maxInt,
        maxInt,
        new Date()
      );

      expect(level.variantId).toBe(maxInt);
      expect(level.locationId).toBe(maxInt);
      expect(level.available).toBe(maxInt);
    });

    it("should handle very recent dates", () => {
      const now = new Date();
      const level = new InventoryLevel("myshop", 12345, 789, 50, now);
      expect(level.updatedAt.getTime()).toBe(now.getTime());
    });

    it("should handle old dates", () => {
      const oldDate = new Date("1970-01-01T00:00:00Z");
      const level = new InventoryLevel("myshop", 12345, 789, 50, oldDate);
      expect(level.updatedAt).toEqual(oldDate);
    });
  });
});
