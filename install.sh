#!/bin/bash

# Watcher Project Installation Script
# This script installs all dependencies and sets up the project

set -e  # Exit on any error

echo "🚀 Starting Watcher Project Installation..."
echo "=========================================="

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if we're in the project directory
if [[ ! -f "backend/requirements.txt" ]] || [[ ! -f "frontend/package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Checking system requirements..."

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
if [[ -z "$PYTHON_VERSION" ]]; then
    print_error "Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

print_success "Python $PYTHON_VERSION found"

# Check Node.js version
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js..."
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION found"
fi

# Check npm version
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm $NPM_VERSION found"

print_status "Installing Python dependencies..."

# Install Python dependencies
cd backend
if [[ -d "venv" ]]; then
    print_warning "Virtual environment already exists. Activating..."
    source venv/bin/activate
else
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Upgrade pip
pip install --upgrade pip

# Install requirements
print_status "Installing Python packages..."
pip install -r requirements.txt

print_success "Python dependencies installed"

# Go back to project root
cd ..

print_status "Installing Node.js dependencies..."

# Install frontend dependencies
cd frontend
npm install

print_success "Node.js dependencies installed"

# Go back to project root
cd ..

print_status "Setting up database..."

# Create database directory if it doesn't exist
mkdir -p backend/data

# Initialize database (this will create the SQLite database)
cd backend
python3 -c "
from app.db import engine, Base
from app.models import Watcher, Event, User
Base.metadata.create_all(bind=engine)
print('Database initialized successfully')
"

# Go back to project root
cd ..

print_status "Building frontend..."

# Build the frontend
cd frontend
npm run build

print_success "Frontend built successfully"

# Go back to project root
cd ..

print_status "Setting up environment..."

# Create .env file if it doesn't exist
if [[ ! -f ".env" ]]; then
    cat > .env << EOF
# Watcher Project Environment Variables
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8976
FRONTEND_PORT=5173
DATABASE_URL=sqlite:///./backend/data/watcher.db
SECRET_KEY=your-secret-key-here-change-in-production
EOF
    print_success "Environment file created"
else
    print_warning "Environment file already exists"
fi

print_status "Setting up Git hooks..."

# Create pre-commit hook if it doesn't exist
if [[ ! -f ".git/hooks/pre-commit" ]]; then
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to run tests and linting

echo "Running pre-commit checks..."

# Check Python syntax
cd backend
python3 -m py_compile app/main.py
python3 -m py_compile app/watcher_service.py
cd ..

# Check TypeScript compilation
cd frontend
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Frontend build failed"
    exit 1
fi
cd ..

echo "Pre-commit checks passed"
EOF

    chmod +x .git/hooks/pre-commit
    print_success "Git pre-commit hook created"
else
    print_warning "Git pre-commit hook already exists"
fi

print_status "Setting permissions..."

# Make scripts executable
chmod +x run.sh
chmod +x install.sh

print_success "Installation completed successfully!"
echo ""
echo "🎉 Your Watcher project is now ready!"
echo ""
echo "Next steps:"
echo "1. Review and customize the .env file if needed"
echo "2. Run './run.sh' to start the application"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "For development:"
echo "- Backend: cd backend && source venv/bin/activate && python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8976"
echo "- Frontend: cd frontend && npm run dev"
echo ""
echo "Happy coding! 🚀"
