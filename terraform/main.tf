terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB Table for storing Shopify inventory levels
resource "aws_dynamodb_table" "shopify_inventory" {
  name           = "shopify-inventory-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "shop_variant_id"
  range_key      = "location"

  attribute {
    name = "shop_variant_id"
    type = "S"
  }

  attribute {
    name = "location"
    type = "S"
  }

  ttl {
    attribute_name = "expiration"
    enabled        = false
  }

  tags = {
    Name        = "shopify-inventory"
    Environment = var.environment
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "shopify-webhook-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
  }
}

# IAM Policy for Lambda to write to DynamoDB
resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "lambda-dynamodb-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.shopify_inventory.arn
      }
    ]
  })
}

# IAM Policy for Lambda CloudWatch Logs
resource "aws_iam_role_policy" "lambda_logs_policy" {
  name = "lambda-logs-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"
      }
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "shopify_webhook_handler" {
  filename      = "lambda_function.zip"
  function_name = "shopify-webhook-handler-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "dist/handler.handler"
  runtime       = "nodejs.20.x"
  timeout       = 30

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.shopify_inventory.name
      ENVIRONMENT    = var.environment
    }
  }

  source_code_hash = filebase64sha256("lambda_function.zip")

  tags = {
    Environment = var.environment
  }
}

# EventBridge Rule for Shopify Webhooks
resource "aws_cloudwatch_event_rule" "shopify_webhook" {
  name            = "shopify-webhook-rule-${var.environment}"
  description     = "Route Shopify webhook events to Lambda"
  event_bus_name  = "default"

  tags = {
    Environment = var.environment
  }
}

# EventBridge Target
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.shopify_webhook.name
  target_id = "ShopifyWebhookLambda"
  arn       = aws_lambda_function.shopify_webhook_handler.arn
}

# Lambda Permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.shopify_webhook_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.shopify_webhook.arn
}

# API Gateway for receiving webhooks
resource "aws_apigatewayv2_api" "shopify_webhook_api" {
  name          = "shopify-webhook-api-${var.environment}"
  protocol_type = "HTTP"

  tags = {
    Environment = var.environment
  }
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.shopify_webhook_api.id
  name        = "$default"
  auto_deploy = true
}

# API Gateway Integration with Lambda
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.shopify_webhook_api.id
  integration_type = "AWS_PROXY"
  integration_method = "POST"
  payload_format_version = "2.0"
  target_arn       = "arn:aws:apigatewayv2:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.shopify_webhook_handler.arn}/invocations"
}

# API Gateway Route
resource "aws_apigatewayv2_route" "webhook_route" {
  api_id    = aws_apigatewayv2_api.shopify_webhook_api.id
  route_key = "POST /webhook"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.shopify_webhook_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.shopify_webhook_api.id}/*/*"
}

data "aws_caller_identity" "current" {}
