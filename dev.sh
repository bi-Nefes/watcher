#!/bin/bash

# Watcher Project Development Script
# This script provides options for development workflow

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  backend     Start only the backend service"
    echo "  frontend    Start only the frontend service"
    echo "  both        Start both services (default)"
    echo "  logs        Show logs for running services"
    echo "  stop        Stop all running services"
    echo "  status      Show status of services"
    echo "  clean       Clean up logs and temporary files"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backend    # Start only backend"
    echo "  $0 frontend   # Start only frontend"
    echo "  $0 both       # Start both services"
    echo "  $0 logs       # Show logs"
    echo "  $0 stop       # Stop all services"
}

# Function to check if service is running
is_service_running() {
    local service=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Service is running
    else
        return 1  # Service is not running
    fi
}

# Function to get service PID
get_service_pid() {
    local port=$1
    lsof -ti :$port 2>/dev/null || echo ""
}

# Function to start backend
start_backend() {
    print_status "Starting backend service..."
    
    if is_service_running "backend" 8976; then
        print_warning "Backend is already running on port 8976"
        return
    fi
    
    cd backend
    
    # Check if virtual environment exists
    if [[ ! -d "venv" ]]; then
        print_error "Python virtual environment not found. Please run './install.sh' first."
        exit 1
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Start backend with reload
    nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8976 --reload > ../logs/backend.log 2>&1 &
    
    cd ..
    
    # Wait for backend to start
    sleep 3
    
    if is_service_running "backend" 8976; then
        print_success "Backend started successfully on http://127.0.0.1:8976"
    else
        print_error "Backend failed to start. Check logs/backend.log for details."
        exit 1
    fi
}

# Function to start frontend
start_frontend() {
    print_status "Starting frontend service..."
    
    if is_service_running "frontend" 5173; then
        print_warning "Frontend is already running on port 5173"
        return
    fi
    
    cd frontend
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        print_error "Node.js dependencies not found. Please run './install.sh' first."
        exit 1
    fi
    
    # Start frontend in development mode
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    
    cd ..
    
    # Wait for frontend to start
    sleep 5
    
    if is_service_running "frontend" 5173; then
        print_success "Frontend started successfully on http://localhost:5173"
    else
        print_error "Frontend failed to start. Check logs/frontend.log for details."
        exit 1
    fi
}

# Function to start both services
start_both() {
    print_status "Starting both services..."
    start_backend
    start_frontend
    print_success "Both services are running!"
    echo ""
    echo "🌐 Services:"
    echo "   Backend:  http://127.0.0.1:8976"
    echo "   Frontend: http://localhost:5173"
    echo ""
    echo "📝 Logs:"
    echo "   Backend:  logs/backend.log"
    echo "   Frontend: logs/frontend.log"
    echo ""
    echo "Use '$0 logs' to view logs or '$0 stop' to stop services"
}

# Function to show logs
show_logs() {
    echo "📝 Service Logs"
    echo "==============="
    echo ""
    
    if [[ -f "logs/backend.log" ]]; then
        echo "🔧 Backend Log (last 20 lines):"
        echo "--------------------------------"
        tail -n 20 logs/backend.log
        echo ""
    else
        print_warning "Backend log file not found"
    fi
    
    if [[ -f "logs/frontend.log" ]]; then
        echo "🎨 Frontend Log (last 20 lines):"
        echo "--------------------------------"
        tail -n 20 logs/frontend.log
        echo ""
    else
        print_warning "Frontend log file not found"
    fi
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    
    # Stop backend
    local backend_pid=$(get_service_pid 8976)
    if [[ -n "$backend_pid" ]]; then
        print_status "Stopping backend (PID: $backend_pid)..."
        kill $backend_pid 2>/dev/null || true
        print_success "Backend stopped"
    else
        print_warning "Backend is not running"
    fi
    
    # Stop frontend
    local frontend_pid=$(get_service_pid 5173)
    if [[ -n "$frontend_pid" ]]; then
        print_status "Stopping frontend (PID: $frontend_pid)..."
        kill $frontend_pid 2>/dev/null || true
        print_success "Frontend stopped"
    else
        print_warning "Frontend is not running"
    fi
    
    print_success "All services stopped"
}

# Function to show status
show_status() {
    echo "📊 Service Status"
    echo "================="
    echo ""
    
    # Check backend
    if is_service_running "backend" 8976; then
        local backend_pid=$(get_service_pid 8976)
        print_success "Backend: Running (PID: $backend_pid) on http://127.0.0.1:8976"
    else
        print_error "Backend: Not running"
    fi
    
    # Check frontend
    if is_service_running "frontend" 5173; then
        local frontend_pid=$(get_service_pid 5173)
        print_success "Frontend: Running (PID: $frontend_pid) on http://localhost:5173"
    else
        print_error "Frontend: Not running"
    fi
}

# Function to clean up
clean_up() {
    print_status "Cleaning up..."
    
    # Remove log files
    if [[ -d "logs" ]]; then
        rm -rf logs/*
        print_success "Logs cleaned"
    fi
    
    # Remove Python cache files
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type d -name "__pycache__" -delete 2>/dev/null || true
    print_success "Python cache cleaned"
    
    # Remove Node.js cache
    if [[ -d "frontend/node_modules/.cache" ]]; then
        rm -rf frontend/node_modules/.cache
        print_success "Node.js cache cleaned"
    fi
    
    print_success "Cleanup completed"
}

# Check if we're in the project directory
if [[ ! -f "backend/requirements.txt" ]] || [[ ! -f "frontend/package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Parse command line arguments
case "${1:-both}" in
    "backend")
        start_backend
        ;;
    "frontend")
        start_frontend
        ;;
    "both")
        start_both
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "clean")
        clean_up
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown option: $1"
        show_usage
        exit 1
        ;;
esac
