#!/bin/bash

set -e

echo "Setting up HandoverKey development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✓ Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo "✓ Created .env file"
else
    echo "✓ .env file already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"

# Start Docker services
echo "Starting Docker services..."
docker-compose up -d
echo "✓ Docker services started"

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
cd packages/database
npm run migrate:dev
cd ../..
echo "✓ Database migrations completed"

# Build packages
echo "Building packages..."
npm run build
echo "✓ Packages built"

# Start the API server
echo "Starting the API server..."
npm run dev --workspace=packages/api & API_PID=$!
echo $API_PID > .pids
echo "✓ API Development server started"

# Start the Web server
echo "Starting the Web server..."
npm run dev --workspace=apps/web & WEB_PID=$!
echo $WEB_PID >> .pids
echo "✓ Web server started"

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - RabbitMQ: localhost:5672"
echo "  - RabbitMQ Management: http://localhost:15672 (admin/admin)"
echo "  - Visit the web app: http://localhost:3000"
echo "  - API will be available at: http://localhost:3001"
echo ""
echo "To stop services: ./scripts/stop-all.sh"
echo "To view logs: docker-compose logs -f" 