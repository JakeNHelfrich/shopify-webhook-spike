# Shopify Stock Level Tracking System

A serverless system built with AWS and TypeScript that tracks Shopify inventory levels in real-time using webhooks.

## Architecture

```
Shopify Store
    ↓
API Gateway (HTTP endpoint)
    ↓
Lambda Function (TypeScript)
    ↓
DynamoDB Table
```

## Components

### AWS Resources (Terraform)

- **API Gateway**: HTTP endpoint to receive Shopify webhooks
- **Lambda Function**: Processes webhook events and updates inventory
- **DynamoDB Table**: Stores inventory levels with schema:
  - **Primary Key (Hash)**: `shop_variant_id` - Format: `{shop-name}#{variant-id}`
  - **Sort Key (Range)**: `location` - Location/warehouse identifier
  - **Attributes**: `stock_count`, `updated_at`, etc.

### TypeScript Lambda Handler

Processes `inventory_levels/update` webhooks from Shopify and stores inventory data in DynamoDB.

## Prerequisites

- Node.js 20.x or later
- Terraform 1.0+
- AWS CLI configured with appropriate credentials
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Lambda Function

```bash
npm run build
```

This compiles TypeScript to JavaScript and outputs to the `dist` directory.

### 3. Package Lambda Function

```bash
npm run package
```

This creates `lambda_function.zip` containing the compiled code and dependencies, ready for deployment.

### 4. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

The Terraform configuration will output the API Gateway endpoint URL. Copy this URL to use as your Shopify webhook endpoint.

### 5. Configure Shopify Webhook

1. Go to your Shopify store admin
2. Navigate to **Settings > Apps and integrations > Webhooks**
3. Create a new webhook:
   - **Event**: `inventory_levels/update`
   - **URL**: Use the API Gateway endpoint from Terraform output
   - **Format**: JSON

## Project Structure

```
.
├── src/
│   └── handler.ts              # Lambda handler implementation
├── terraform/
│   ├── main.tf                # AWS resource definitions
│   ├── variables.tf           # Input variables
│   └── outputs.tf             # Output values
├── package.json               # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Database Schema

### DynamoDB Table: `shopify-inventory-{environment}`

| Attribute | Type | Role | Example |
|-----------|------|------|---------|
| `shop_variant_id` | String | Primary Key (Hash) | `myshop.myshopify.com#variant-123456` |
| `location` | String | Sort Key (Range) | `warehouse-1` |
| `stock_count` | Number | Data | `50` |
| `inventory_item_id` | Number | Data | `123456789` |
| `location_id` | Number | Data | `987654321` |
| `updated_at` | String (ISO 8601) | Data | `2024-01-15T10:30:00Z` |

## Webhook Payload Example

```json
{
  "inventory_levels": [
    {
      "inventory_item_id": 123456,
      "location_id": 789,
      "available": 50,
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Environment Variables

The Lambda function uses the following environment variables:

- `DYNAMODB_TABLE`: Name of the DynamoDB table (set by Terraform)
- `ENVIRONMENT`: Environment name (dev, staging, prod)

## Security Considerations

### Webhook Signature Verification

The code includes webhook signature verification using HMAC-SHA256. To enable it:

1. Store your Shopify webhook secret in AWS Secrets Manager
2. Update the Lambda to retrieve and use it:

```typescript
const secretArn = process.env.SHOPIFY_WEBHOOK_SECRET_ARN;
// Retrieve from Secrets Manager
// Pass to verifyWebhookSignature()
```

### IAM Permissions

The Lambda execution role has minimal permissions:
- `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:GetItem`, `dynamodb:Query` on the inventory table
- CloudWatch Logs permissions for debugging

## Deployment Workflow

1. **Development**:
   ```bash
   npm run build
   npm run package
   cd terraform && terraform apply
   ```

2. **Testing**:
   ```bash
   # Invoke Lambda with test event
   aws lambda invoke --function-name shopify-webhook-handler-dev \
     --payload '{"test": "data"}' response.json
   ```

3. **Production**:
   ```bash
   terraform apply -var environment=prod
   ```

## Monitoring and Logging

View Lambda logs in CloudWatch:

```bash
aws logs tail /aws/lambda/shopify-webhook-handler-dev --follow
```

Query inventory from DynamoDB:

```bash
aws dynamodb query \
  --table-name shopify-inventory-dev \
  --key-condition-expression "shop_variant_id = :sid" \
  --expression-attribute-values '{":sid":{"S":"myshop#variant-123"}}'
```

## Troubleshooting

### Lambda Not Receiving Webhooks

- Verify API Gateway endpoint in Shopify webhook configuration
- Check Lambda execution role has API Gateway invoke permission
- Review CloudWatch logs for errors

### Items Not Updating in DynamoDB

- Ensure Lambda has DynamoDB write permissions
- Check DynamoDB table name matches environment variable
- Verify webhook payload format matches expected structure

### Terraform Deployment Fails

- Ensure AWS credentials are configured: `aws configure`
- Check AWS region is set: `export AWS_DEFAULT_REGION=us-east-1`
- Verify IAM permissions for creating API Gateway, Lambda, DynamoDB

## Cleanup

To remove all AWS resources:

```bash
cd terraform
terraform destroy
```

To clean local build artifacts:

```bash
npm run clean
```

## References

- [Shopify Webhooks Documentation](https://shopify.dev/docs/api/webhooks/2025-10)
- [AWS Lambda with TypeScript](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
