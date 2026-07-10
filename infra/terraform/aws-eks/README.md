# AWS EKS Terraform

This directory creates a small AWS EKS environment for the application.

The default values are intentionally small, but EKS is not free. The EKS control plane, EC2 worker node, EBS volumes, and data transfer can create AWS charges. Run `terraform destroy` when the environment is no longer needed.

## What Terraform Creates

- VPC for the cluster
- Two public subnets
- Internet gateway and route table
- EKS cluster
- One managed node group
- ECR repository for the app image
- EBS CSI Driver so Kubernetes `PersistentVolumeClaim` can create EBS volumes

This first setup does not create NAT Gateway to keep costs lower. Worker nodes are placed in public subnets, but SSH access is not enabled.

## Requirements

- Terraform 1.6 or later
- AWS CLI
- kubectl
- AWS credentials with permission to create VPC, EKS, IAM, ECR, and EC2 resources

## AWS Account and Credentials

Do not write AWS access keys or secret keys in Terraform files, Kubernetes YAML files, or README files.

Terraform uses the same credential sources as the AWS CLI. For local work, use one of these options.

Use an AWS CLI profile.

```powershell
aws configure --profile codex-dev
$env:AWS_PROFILE = "codex-dev"
```

Or set `aws_profile` in `terraform.tfvars`.

```hcl
aws_profile = "codex-dev"
```

Or use temporary environment variables.

```powershell
$env:AWS_ACCESS_KEY_ID = "..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_SESSION_TOKEN = "..."
```

For CD from GitHub Actions, prefer GitHub OIDC with an AWS IAM Role. Store the role ARN and AWS region in GitHub Secrets or Variables, not in this repository. Long-lived access keys should be avoided when possible.

## Setup

Copy the example variables file.

```powershell
Copy-Item infra\terraform\aws-eks\terraform.tfvars.example infra\terraform\aws-eks\terraform.tfvars
```

Edit `terraform.tfvars` if needed.

Initialize Terraform.

```powershell
terraform -chdir=infra\terraform\aws-eks init
```

Check the plan.

```powershell
terraform -chdir=infra\terraform\aws-eks plan
```

Create the environment.

```powershell
terraform -chdir=infra\terraform\aws-eks apply
```

Configure kubectl.

```powershell
aws eks update-kubeconfig --region ap-northeast-1 --name codex-dev
```

## Push the Docker Image to ECR

Get the ECR repository URL.

```powershell
$repo = terraform -chdir=infra\terraform\aws-eks output -raw ecr_repository_url
```

Login to ECR.

```powershell
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $repo
```

Build and push the image.

```powershell
docker build -t "$repo:1.4.0" .
docker push "$repo:1.4.0"
```

Update `k8s/deployment.yaml` so `image` points to the ECR image, then apply the manifests.

```powershell
kubectl apply -f k8s/
kubectl get pods
kubectl get svc
```

## Cleanup

Delete Kubernetes resources first so the PVC and EBS volume can be released.

```powershell
kubectl delete -f k8s/
terraform -chdir=infra\terraform\aws-eks destroy
```
