import { ProcessInventoryWebhookUseCase, WebhookInventoryLevelDTO } from "../ProcessInventoryWebhookUseCase";
import { InventoryRepository } from "../../ports/InventoryRepository";
import { WebhookValidator } from "../../ports/WebhookValidator";
import { InventoryLevel } from "../../entities/InventoryLevel";

// Mock implementations
class MockInventoryRepository implements InventoryRepository {
  saveAsync: jest.Mock = jest.fn().mockResolvedValue(undefined);
  saveManyAsync: jest.Mock = jest.fn().mockResolvedValue(undefined);

  async save(inventory: InventoryLevel): Promise<void> {
    return this.saveAsync(inventory);
  }

  async saveMany(inventories: InventoryLevel[]): Promise<void> {
    return this.saveManyAsync(inventories);
  }

  async getByShopAndVariant(): Promise<InventoryLevel[]> {
    throw new Error("Not implemented");
  }

  async getByShopVariantAndLocation(): Promise<InventoryLevel | null> {
    throw new Error("Not implemented");
  }
}

class MockWebhookValidator implements WebhookValidator {
  validateMock: jest.Mock = jest.fn().mockReturnValue(true);

  validate(body: string, signature: string | undefined): boolean {
    return this.validateMock(body, signature);
  }
}

describe("ProcessInventoryWebhookUseCase", () => {
  let useCase: ProcessInventoryWebhookUseCase;
  let mockRepository: MockInventoryRepository;
  let mockValidator: MockWebhookValidator;

  beforeEach(() => {
    mockRepository = new MockInventoryRepository();
    mockValidator = new MockWebhookValidator();
    useCase = new ProcessInventoryWebhookUseCase(mockRepository, mockValidator);
  });

  describe("successful processing", () => {
    it("should process valid webhook with single inventory level", async () => {
      const request = {
        shopName: "myshop",
        rawBody: JSON.stringify({
          inventory_levels: [
            {
              inventory_item_id: 12345,
              location_id: 789,
              available: 50,
              updated_at: "2024-01-15T10:30:00Z",
            },
          ],
        }),
        signature: "valid-signature",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.saveManyAsync).toHaveBeenCalledTimes(1);
    });

    it("should process webhook with multiple inventory levels", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
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
            updated_at: "2024-01-15T10:30:00Z",
          },
          {
            inventory_item_id: 12347,
            location_id: 791,
            available: 0,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass valid InventoryLevel entities to repository", async () => {
      const request = {
        shopName: "myshop.myshopify.com",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      await useCase.execute(request);

      expect(mockRepository.saveManyAsync).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            shopName: "myshop.myshopify.com",
            variantId: 12345,
            locationId: 789,
            available: 50,
          }),
        ])
      );
    });
  });

  describe("validation failures", () => {
    it("should throw when webhook signature is invalid", async () => {
      mockValidator.validateMock.mockReturnValue(false);

      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "invalid-signature",
        inventoryLevels: [],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Invalid webhook signature"
      );
    });

    it("should throw when shop name is empty", async () => {
      const request = {
        shopName: "",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Shop name is required"
      );
    });

    it("should throw when shop name is whitespace", async () => {
      const request = {
        shopName: "   ",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Shop name is required"
      );
    });

    it("should throw when inventory levels is not an array", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: null as unknown as Array<WebhookInventoryLevelDTO>,
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Inventory levels must be an array"
      );
    });

    it("should throw when inventory levels array is empty", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Inventory levels array cannot be empty"
      );
    });

    it("should throw when inventory level has invalid date format", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: "invalid-date",
          },
        ],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Invalid date format"
      );
    });

    it("should throw when inventory level has negative stock", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: -1,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Available stock cannot be negative"
      );
    });

    it("should throw when inventory level has invalid variant ID", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 0,
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Variant ID must be positive"
      );
    });
  });

  describe("partial failures", () => {
    it("should report errors when some saves fail", async () => {
      mockRepository.saveManyAsync.mockRejectedValueOnce(
        new Error("DynamoDB error")
      );
      mockRepository.saveAsync
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Individual save failed"))
        .mockResolvedValueOnce(undefined);

      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
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
            updated_at: "2024-01-15T10:30:00Z",
          },
          {
            inventory_item_id: 12347,
            location_id: 791,
            available: 25,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].reason).toContain("Individual save failed");
    });

    it("should continue saving after batch failure", async () => {
      mockRepository.saveManyAsync.mockRejectedValueOnce(
        new Error("Batch failed")
      );
      mockRepository.saveAsync.mockResolvedValue(undefined);

      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
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
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(mockRepository.saveAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should handle very large stock quantities", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: Number.MAX_SAFE_INTEGER,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
    });

    it("should handle zero stock quantity", async () => {
      const request = {
        shopName: "myshop",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 0,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
    });

    it("should handle shop names with special characters", async () => {
      const request = {
        shopName: "my-special-shop.myshopify.com",
        rawBody: "raw",
        signature: "sig",
        inventoryLevels: [
          {
            inventory_item_id: 12345,
            location_id: 789,
            available: 50,
            updated_at: "2024-01-15T10:30:00Z",
          },
        ],
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
    });
  });
});
