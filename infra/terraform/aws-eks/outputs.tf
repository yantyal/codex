output "cluster_name" {
  description = "EKS cluster name."
  value       = aws_eks_cluster.this.name
}

output "aws_region" {
  description = "AWS region where the EKS cluster is created."
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS account ID used by the provider."
  value       = data.aws_caller_identity.current.account_id
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker images."
  value       = aws_ecr_repository.app.repository_url
}

output "kubectl_update_command" {
  description = "Command that configures kubectl for this cluster."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.this.name}"
}
