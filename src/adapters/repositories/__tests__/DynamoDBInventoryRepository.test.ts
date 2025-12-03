import { DynamoDBInventoryRepository } from "../DynamoDBInventoryRepository";
import { InventoryLevel } from "../../../domain/entities/InventoryLevel";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Mock the DynamoDB Document Client
jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(),
  },
  UpdateCommand: jest.fn(),
}));

describe("DynamoDBInventoryRepository", () => {
  let mockDocClient: jest.Mocked<DynamoDBDocumentClient>;
  let repository: DynamoDBInventoryRepository;
  const tableName = "test-inventory-table";

  beforeEach(() => {
    mockDocClient = {
      send: jest.fn(),
    } as unknown as jest.Mocked<DynamoDBDocumentClient>;

    repository = new DynamoDBInventoryRepository(mockDocClient, tableName);
  });

  describe("save", () => {
    it("should save inventory level to DynamoDB", async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const inventory = new InventoryLevel(
        "myshop",
        12345,
        789,
        50,
        new Date("2024-01-15T10:30:00Z"),
        987654
      );

      await repository.save(inventory);

      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: tableName,
            Key: {
              shop_variant_id: "myshop#12345",
              location: "789",
            },
          }),
        })
      );
    });

    it("should throw when DynamoDB save fails", async () => {
      mockDocClient.send.mockRejectedValueOnce(new Error("DynamoDB error"));

      const inventory = new InventoryLevel(
        "myshop",
        12345,
        789,
        50,
        new Date(),
        987654
      );

      await expect(repository.save(inventory)).rejects.toThrow(
        "DynamoDB error"
      );
    });

    it("should format date as ISO string", async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const testDate = new Date("2024-01-15T10:30:00.123Z");
      const inventory = new InventoryLevel(
        "myshop",
        12345,
        789,
        50,
        testDate,
        987654
      );

      await repository.save(inventory);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ExpressionAttributeValues: expect.objectContaining({
              ":updated": testDate.toISOString(),
            }),
          }),
        })
      );
    });
  });

  describe("saveMany", () => {
    it("should save multiple inventory levels", async () => {
      mockDocClient.send.mockResolvedValue({});

      const inventories = [
        new InventoryLevel("myshop", 12345, 789, 50, new Date(), 987654),
        new InventoryLevel("myshop", 12346, 790, 100, new Date(), 987655),
        new InventoryLevel("myshop", 12347, 791, 25, new Date(), 987656),
      ];

      await repository.saveMany(inventories);

      expect(mockDocClient.send).toHaveBeenCalledTimes(3);
    });

    it("should handle empty inventory list", async () => {
      const inventories: InventoryLevel[] = [];

      await repository.saveMany(inventories);

      expect(mockDocClient.send).not.toHaveBeenCalled();
    });

    it("should propagate errors from individual saves", async () => {
      mockDocClient.send
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Save failed"))
        .mockResolvedValueOnce({});

      const inventories = [
        new InventoryLevel("myshop", 12345, 789, 50, new Date(), 987654),
        new InventoryLevel("myshop", 12346, 790, 100, new Date(), 987655),
        new InventoryLevel("myshop", 12347, 791, 25, new Date(), 987656),
      ];

      await expect(repository.saveMany(inventories)).rejects.toThrow(
        "Save failed"
      );
    });
  });

  describe("getByShopAndVariant", () => {
    it("should throw not implemented error", async () => {
      await expect(
        repository.getByShopAndVariant("myshop", 12345)
      ).rejects.toThrow("Not implemented");
    });
  });

  describe("getByShopVariantAndLocation", () => {
    it("should throw not implemented error", async () => {
      await expect(
        repository.getByShopVariantAndLocation("myshop", 12345, 789)
      ).rejects.toThrow("Not implemented");
    });
  });
});
