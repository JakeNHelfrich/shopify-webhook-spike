import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ProcessInventoryWebhookUseCase } from "./domain/usecases/ProcessInventoryWebhookUseCase";
import { DynamoDBInventoryRepository } from "./adapters/repositories/DynamoDBInventoryRepository";
import { ShopifyWebhookValidator } from "./adapters/validators/ShopifyWebhookValidator";
import { WebhookPayloadParser } from "./adapters/parsers/WebhookPayloadParser";

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "shopify-inventory-dev";
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || "";

// Initialize adapters and use case
const inventoryRepository = new DynamoDBInventoryRepository(
  docClient,
  DYNAMODB_TABLE
);
const webhookValidator = new ShopifyWebhookValidator(SHOPIFY_WEBHOOK_SECRET);
const useCase = new ProcessInventoryWebhookUseCase(
  inventoryRepository,
  webhookValidator
);

/**
 * Main Lambda handler for processing Shopify webhooks
 * Orchestrates request/response handling and error management
 */
export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> {
  console.log("Received webhook event", {
    requestId: context.awsRequestId,
    path: event.rawPath,
    method: event.requestContext.http.method,
  });

  try {
    // Extract raw body
    const body = event.body || "";
    if (!body) {
      console.warn("Empty request body");
      return buildErrorResponse(400, "Empty request body");
    }

    // Parse webhook payload
    const inventoryLevels = WebhookPayloadParser.parseInventoryLevels(body);
    const shopName = WebhookPayloadParser.extractShopName(
      event.headers as Record<string, string>
    );
    const signature = WebhookPayloadParser.extractSignature(
      event.headers as Record<string, string>
    );
    const topic = WebhookPayloadParser.extractTopic(
      event.headers as Record<string, string>
    );

    console.log("Parsed webhook", {
      topic,
      shopName,
      levelCount: inventoryLevels.length,
    });

    // Only process inventory_levels/update webhooks
    if (topic !== "inventory_levels/update") {
      console.log(`Skipping unsupported webhook topic: ${topic}`);
      return buildSuccessResponse(
        { message: "Webhook type not supported", processed: 0 }
      );
    }

    // Execute use case
    const result = await useCase.execute({
      shopName,
      rawBody: body,
      signature,
      inventoryLevels,
    });

    if (!result.success && result.errors.length > 0) {
      console.warn("Some inventory updates failed", {
        processed: result.processedCount,
        errors: result.errors,
      });
      return buildErrorResponse(
        207,
        "Partial success: some inventory updates failed",
        { ...result, partialSuccess: true }
      );
    }

    console.log("Webhook processed successfully", {
      processed: result.processedCount,
    });

    return buildSuccessResponse({
      message: "Webhook processed successfully",
      processed: result.processedCount,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("signature")) {
      console.warn("Webhook signature validation failed", { error: errorMessage });
      return buildErrorResponse(401, "Unauthorized: Invalid signature");
    }

    if (errorMessage.includes("Invalid")) {
      console.warn("Invalid webhook payload", { error: errorMessage });
      return buildErrorResponse(400, `Bad request: ${errorMessage}`);
    }

    console.error("Unexpected error processing webhook", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return buildErrorResponse(
      500,
      "Internal server error",
      error instanceof Error ? error.message : undefined
    );
  }
}

/**
 * Build success response
 */
function buildSuccessResponse(data: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

/**
 * Build error response
 */
function buildErrorResponse(
  statusCode: number,
  message: string,
  details?: unknown
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    body: JSON.stringify({
      error: message,
      details,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
}
