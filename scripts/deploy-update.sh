#!/bin/bash
set -e

# DocFlow Docker Image Update Script
# Usage: ./deploy-update.sh [version] [environment]

VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"production"}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "docker-compose.yml" ]]; then
    print_error "docker-compose.yml not found. Please run this script from the DocFlow project root."
    exit 1
fi

print_status "🚀 DocFlow Update Deployment - Version: $VERSION"
echo "=================================================="

# Function to build and push (for development machine)
build_and_push() {
    print_status "Building Docker image..."

    if [[ ! -f "Dockerfile.prod.simple" ]]; then
        print_error "Dockerfile.prod.simple not found"
        exit 1
    fi

    # Build image
    docker build -t rutthawitc/docflow:$VERSION -f Dockerfile.prod.simple .

    if [[ "$VERSION" != "latest" ]]; then
        # Tag as latest too
        docker tag rutthawitc/docflow:$VERSION rutthawitc/docflow:latest
    fi

    print_success "Image built successfully"

    # Push to Docker Hub
    print_status "Pushing to Docker Hub..."
    docker push rutthawitc/docflow:$VERSION

    if [[ "$VERSION" != "latest" ]]; then
        docker push rutthawitc/docflow:latest
    fi

    print_success "Image pushed successfully"
}

# Function to update production
update_production() {
    print_status "Updating production deployment..."

    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_status "Services are running, performing rolling update..."

        # Create backup
        print_status "Creating backup..."
        docker-compose exec db pg_dump -U postgres docflow_db > backups/pre-update-backup_$(date +%Y%m%d_%H%M%S).sql || true

        # Pull new image
        docker-compose pull app

        # Rolling update
        docker-compose up -d --no-deps app

        # Wait for app to be ready
        print_status "Waiting for application to be ready..."
        sleep 30

        # Health check
        if curl -s http://localhost:3004/api/health | grep -q "healthy"; then
            print_success "Application is healthy after update"
        else
            print_warning "Application health check failed, checking logs..."
            docker-compose logs app | tail -20
        fi

    else
        print_status "Services not running, performing full restart..."

        # Pull images
        docker-compose pull

        # Start services
        docker-compose up -d

        # Wait for services
        sleep 30
    fi

    # Show final status
    print_status "Final deployment status:"
    docker-compose ps
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."

    # Check container status
    if docker-compose ps | grep -q "unhealthy\|Exit"; then
        print_error "Some containers are unhealthy or stopped"
        docker-compose ps
        return 1
    fi

    # Check application health
    if curl -s http://localhost:3004/api/health >/dev/null; then
        print_success "✅ Health endpoint responding"
    else
        print_error "❌ Health endpoint not responding"
        return 1
    fi

    # Check database connection
    if docker-compose exec db psql -U postgres -d docflow_db -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "✅ Database connection working"
    else
        print_error "❌ Database connection failed"
        return 1
    fi

    print_success "🎉 Deployment verification successful!"
}

# Main execution flow
case "$ENVIRONMENT" in
    "build")
        build_and_push
        ;;
    "production")
        update_production
        verify_deployment
        ;;
    "dev")
        print_status "Development environment - building and pushing..."
        build_and_push
        ;;
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        echo "Usage: $0 [version] [build|production|dev]"
        echo ""
        echo "Examples:"
        echo "  $0 v1.0.1 build       # Build and push new image"
        echo "  $0 latest production  # Update production with latest image"
        echo "  $0 v1.0.1 dev         # Build and push from development"
        exit 1
        ;;
esac

print_success "🚀 DocFlow update completed successfully!"
echo ""
echo "Next steps:"
if [[ "$ENVIRONMENT" == "build" || "$ENVIRONMENT" == "dev" ]]; then
    echo "  • Run on production: ./deploy-update.sh $VERSION production"
else
    echo "  • Test the application functionality"
    echo "  • Monitor logs: docker-compose logs -f app"
fi