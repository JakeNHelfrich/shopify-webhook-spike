output "eventbridge_rule_arn" {
  description = "EventBridge rule ARN for Shopify webhooks"
  value       = aws_cloudwatch_event_rule.shopify_webhook.arn
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
