output "api_gateway_url" {
  description = "API Gateway endpoint URL for Shopify webhooks"
  value       = "${aws_apigatewayv2_api.shopify_webhook_api.api_endpoint}/webhook"
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for inventory storage"
  value       = aws_dynamodb_table.shopify_inventory.name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.shopify_webhook_handler.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.shopify_webhook_handler.arn
}
