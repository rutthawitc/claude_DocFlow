#!/bin/bash

# DocFlow AWS Deployment Script
# This script deploys the DocFlow infrastructure and application to AWS

set -e  # Exit on any error

# Configuration
STACK_NAME="docflow-infrastructure"
REGION="us-east-1"
ENVIRONMENT="production"
INSTANCE_TYPE="t3.medium"
KEY_PAIR_NAME=""
DATABASE_PASSWORD=""
DOMAIN_NAME=""
CERTIFICATE_ARN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    if ! command -v jq &> /dev/null; then
        warning "jq is not installed. Some features may not work properly."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured. Please run 'aws configure' first."
    fi
    
    success "All dependencies are available."
}

# Get user inputs
get_inputs() {
    log "Getting deployment configuration..."
    
    if [ -z "$KEY_PAIR_NAME" ]; then
        echo -n "Enter your EC2 Key Pair name: "
        read KEY_PAIR_NAME
    fi
    
    if [ -z "$DATABASE_PASSWORD" ]; then
        echo -n "Enter database password (min 8 characters): "
        read -s DATABASE_PASSWORD
        echo
        if [ ${#DATABASE_PASSWORD} -lt 8 ]; then
            error "Database password must be at least 8 characters long."
        fi
    fi
    
    echo -n "Enter domain name (optional, press enter to skip): "
    read DOMAIN_NAME
    
    if [ -n "$DOMAIN_NAME" ]; then
        echo -n "Enter SSL certificate ARN from ACM (optional): "
        read CERTIFICATE_ARN
    fi
    
    echo -n "Enter AWS region (default: us-east-1): "
    read input_region
    REGION=${input_region:-$REGION}
    
    echo -n "Enter environment (development/staging/production, default: production): "
    read input_env
    ENVIRONMENT=${input_env:-$ENVIRONMENT}
    
    echo -n "Enter EC2 instance type (default: t3.medium): "
    read input_instance
    INSTANCE_TYPE=${input_instance:-$INSTANCE_TYPE}
}

# Validate key pair exists
validate_key_pair() {
    log "Validating EC2 Key Pair..."
    
    if ! aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$REGION" &> /dev/null; then
        error "Key pair '$KEY_PAIR_NAME' does not exist in region '$REGION'."
    fi
    
    success "Key pair validation passed."
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying AWS infrastructure..."
    
    # Build parameters
    PARAMETERS="ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
    PARAMETERS="$PARAMETERS ParameterKey=InstanceType,ParameterValue=$INSTANCE_TYPE"
    PARAMETERS="$PARAMETERS ParameterKey=KeyPairName,ParameterValue=$KEY_PAIR_NAME"
    PARAMETERS="$PARAMETERS ParameterKey=DatabasePassword,ParameterValue=$DATABASE_PASSWORD"
    
    if [ -n "$DOMAIN_NAME" ]; then
        PARAMETERS="$PARAMETERS ParameterKey=DomainName,ParameterValue=$DOMAIN_NAME"
    fi
    
    if [ -n "$CERTIFICATE_ARN" ]; then
        PARAMETERS="$PARAMETERS ParameterKey=CertificateArn,ParameterValue=$CERTIFICATE_ARN"
    fi
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file aws/cloudformation/docflow-infrastructure.yaml \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --parameter-overrides $PARAMETERS \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION" \
        --tags Environment="$ENVIRONMENT" Project="DocFlow"
    
    if [ $? -eq 0 ]; then
        success "Infrastructure deployed successfully."
    else
        error "Infrastructure deployment failed."
    fi
}

# Get stack outputs
get_stack_outputs() {
    log "Retrieving stack outputs..."
    
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME-$ENVIRONMENT" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    if command -v jq &> /dev/null; then
        ALB_DNS=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LoadBalancerDNS") | .OutputValue')
        DB_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DatabaseEndpoint") | .OutputValue')
        REDIS_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="RedisEndpoint") | .OutputValue')
        S3_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="S3BucketName") | .OutputValue')
        
        log "Application Load Balancer DNS: $ALB_DNS"
        log "Database Endpoint: $DB_ENDPOINT"
        log "Redis Endpoint: $REDIS_ENDPOINT"
        log "S3 Bucket: $S3_BUCKET"
    else
        log "Stack outputs (install jq for formatted output):"
        echo "$OUTPUTS"
    fi
}

# Wait for instances to be ready
wait_for_instances() {
    log "Waiting for EC2 instances to be ready..."
    
    # Get Auto Scaling Group name
    ASG_NAME="$ENVIRONMENT-docflow-asg"
    
    # Wait for instances to be in service
    aws autoscaling wait instance-in-service \
        --auto-scaling-group-name "$ASG_NAME" \
        --region "$REGION"
    
    success "EC2 instances are ready."
}

# Deploy application
deploy_application() {
    log "Setting up application deployment..."
    
    # Get the first instance IP from Auto Scaling Group
    INSTANCE_IPS=$(aws ec2 describe-instances \
        --filters "Name=tag:aws:autoscaling:groupName,Values=$ENVIRONMENT-docflow-asg" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].[PublicIpAddress]' \
        --output text \
        --region "$REGION")
    
    if [ -z "$INSTANCE_IPS" ]; then
        error "No running instances found."
    fi
    
    FIRST_INSTANCE_IP=$(echo "$INSTANCE_IPS" | head -n1)
    log "Connecting to instance: $FIRST_INSTANCE_IP"
    
    # Copy deployment files
    log "Copying deployment files..."
    scp -i ~/.ssh/"$KEY_PAIR_NAME".pem -o StrictHostKeyChecking=no \
        docker-compose.production.yml \
        aws/scripts/setup-application.sh \
        ec2-user@"$FIRST_INSTANCE_IP":/home/ec2-user/
    
    # Run setup script
    log "Running application setup..."
    ssh -i ~/.ssh/"$KEY_PAIR_NAME".pem -o StrictHostKeyChecking=no \
        ec2-user@"$FIRST_INSTANCE_IP" \
        "chmod +x setup-application.sh && ./setup-application.sh"
    
    success "Application setup completed."
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and alerts..."
    
    # Create CloudWatch alarms for the application
    aws cloudformation deploy \
        --template-file aws/cloudformation/monitoring.yaml \
        --stack-name "$STACK_NAME-monitoring-$ENVIRONMENT" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            LoadBalancerFullName="$(aws elbv2 describe-load-balancers --names "$ENVIRONMENT-docflow-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text --region "$REGION" | cut -d'/' -f2-)" \
        --region "$REGION"
    
    success "Monitoring setup completed."
}

# Main deployment function
main() {
    echo "======================================"
    echo "    DocFlow AWS Deployment Script     "
    echo "======================================"
    echo
    
    check_dependencies
    get_inputs
    validate_key_pair
    
    log "Starting deployment with the following configuration:"
    log "Environment: $ENVIRONMENT"
    log "Region: $REGION"
    log "Instance Type: $INSTANCE_TYPE"
    log "Key Pair: $KEY_PAIR_NAME"
    [ -n "$DOMAIN_NAME" ] && log "Domain: $DOMAIN_NAME"
    echo
    
    echo -n "Do you want to proceed? (y/n): "
    read confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        log "Deployment cancelled."
        exit 0
    fi
    
    deploy_infrastructure
    get_stack_outputs
    wait_for_instances
    deploy_application
    setup_monitoring
    
    echo
    success "======================================"
    success "  DocFlow deployment completed!      "
    success "======================================"
    echo
    
    if [ -n "$ALB_DNS" ]; then
        log "Your application is available at:"
        if [ -n "$CERTIFICATE_ARN" ]; then
            log "https://$ALB_DNS"
        else
            log "http://$ALB_DNS"
        fi
    fi
    
    if [ -n "$DOMAIN_NAME" ]; then
        log "Don't forget to configure your DNS to point to: $ALB_DNS"
    fi
    
    log "Next steps:"
    log "1. Configure your GitHub Actions secrets with the deployment details"
    log "2. Set up your domain DNS records (if applicable)"
    log "3. Monitor your application in CloudWatch"
    log "4. Set up regular backups"
}

# Run main function
main "$@"