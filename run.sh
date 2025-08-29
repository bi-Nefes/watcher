#!/bin/bash

# Watcher Project Running Script
# This script starts both backend and frontend services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to cleanup background processes
cleanup() {
    print_status "Shutting down services..."
    
    # Kill backend process
    if [[ -n "$BACKEND_PID" ]]; then
        print_status "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi
    
    # Kill frontend process
    if [[ -n "$FRONTEND_PID" ]]; then
        print_status "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the project directory
if [[ ! -f "backend/requirements.txt" ]] || [[ ! -f "frontend/package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    print_warning "Environment file not found. Creating default .env file..."
    cat > .env << EOF
# Watcher Project Environment Variables
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8976
FRONTEND_PORT=5173
DATABASE_URL=sqlite:///./backend/data/watcher.db
SECRET_KEY=your-secret-key-here-change-in-production
EOF
    print_success "Default .env file created"
fi

# Source environment variables
export $(cat .env | grep -v '^#' | xargs)

# Default values if not in .env
BACKEND_HOST=${BACKEND_HOST:-127.0.0.1}
BACKEND_PORT=${BACKEND_PORT:-8976}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

print_status "Starting Watcher Project Services..."
echo "=========================================="
echo "Backend: http://$BACKEND_HOST:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo ""

# Check if virtual environment exists
if [[ ! -d "backend/venv" ]]; then
    print_error "Python virtual environment not found. Please run './install.sh' first."
    exit 1
fi

# Check if node_modules exists
if [[ ! -d "frontend/node_modules" ]]; then
    print_error "Node.js dependencies not found. Please run './install.sh' first."
    exit 1
fi

# Function to check if port is available
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "Port $port is already in use by another $service service"
        print_status "Please stop the service using port $port or change the port in .env file"
        exit 1
    fi
}

# Check if ports are available
print_status "Checking port availability..."
check_port $BACKEND_PORT "backend"
check_port $FRONTEND_PORT "frontend"
print_success "Ports are available"

# Start backend service
print_status "Starting backend service..."
cd backend

# Activate virtual environment
source venv/bin/activate

# Start backend in background
python3 -m uvicorn app.main:app --host $BACKEND_HOST --port $BACKEND_PORT --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend failed to start. Check logs/backend.log for details."
    exit 1
fi

print_success "Backend started successfully (PID: $BACKEND_PID)"

# Go back to project root
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Start frontend service
print_status "Starting frontend service..."
cd frontend

# Start frontend in background
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend failed to start. Check logs/frontend.log for details."
    # Stop backend before exiting
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "Frontend started successfully (PID: $FRONTEND_PID)"

# Go back to project root
cd ..

print_success "All services are running!"
echo ""
echo "🌐 Services:"
echo "   Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "📝 Logs:"
echo "   Backend:  logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop services
wait
