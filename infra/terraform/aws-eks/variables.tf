variable "project_name" {
  description = "Project name used in AWS resource names."
  type        = string
  default     = "codex"
}

variable "environment" {
  description = "Environment name used in AWS resource names."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region where resources are created."
  type        = string
  default     = "ap-northeast-1"
}

variable "aws_profile" {
  description = "Optional AWS CLI profile name. Leave null to use AWS_PROFILE or environment variables."
  type        = string
  default     = null
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Null lets AWS choose the default supported version."
  type        = string
  default     = null
}

variable "vpc_cidr" {
  description = "CIDR block for the EKS VPC."
  type        = string
  default     = "10.30.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets. Use at least two for EKS."
  type        = list(string)
  default     = ["10.30.0.0/24", "10.30.1.0/24"]
}

variable "node_capacity_type" {
  description = "EKS node capacity type. Use ON_DEMAND for stable first setup or SPOT to reduce cost with interruption risk."
  type        = string
  default     = "ON_DEMAND"
}

variable "node_instance_types" {
  description = "EC2 instance types for the managed node group."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_min_size" {
  description = "Minimum number of worker nodes."
  type        = number
  default     = 1
}

variable "node_desired_size" {
  description = "Desired number of worker nodes."
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker nodes."
  type        = number
  default     = 2
}
