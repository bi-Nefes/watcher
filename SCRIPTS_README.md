# Watcher Project Scripts

This document explains how to use the automation scripts for the Watcher project.

## 📁 Available Scripts

### 1. `install.sh` - Installation Script
**Purpose**: Complete project setup and dependency installation

**What it does**:
- ✅ Checks system requirements (Python 3, Node.js, npm)
- ✅ Installs Node.js if not present
- ✅ Creates Python virtual environment
- ✅ Installs Python dependencies from `requirements.txt`
- ✅ Installs Node.js dependencies from `package.json`
- ✅ Initializes SQLite database
- ✅ Builds frontend for production
- ✅ Creates environment configuration file (`.env`)
- ✅ Sets up Git pre-commit hooks
- ✅ Sets proper file permissions

**Usage**:
```bash
./install.sh
```

**Requirements**:
- Ubuntu/Debian-based system
- Python 3.8+
- Git repository initialized

---

### 2. `run.sh` - Production Running Script
**Purpose**: Start both services for production use

**What it does**:
- ✅ Loads environment variables from `.env`
- ✅ Checks port availability
- ✅ Starts backend service (FastAPI)
- ✅ Starts frontend service (Vite dev server)
- ✅ Manages process lifecycle
- ✅ Provides graceful shutdown with Ctrl+C
- ✅ Logs output to `logs/` directory

**Usage**:
```bash
./run.sh
```

**Features**:
- Automatic port checking
- Process management
- Signal handling
- Logging to files

---

### 3. `dev.sh` - Development Script
**Purpose**: Flexible development workflow management

**What it does**:
- ✅ Start individual services or both
- ✅ Service status monitoring
- ✅ Log viewing
- ✅ Service management (start/stop)
- ✅ Cleanup utilities

**Usage**:
```bash
# Start both services
./dev.sh both

# Start only backend
./dev.sh backend

# Start only frontend
./dev.sh frontend

# Show service status
./dev.sh status

# View logs
./dev.sh logs

# Stop all services
./dev.sh stop

# Clean up temporary files
./dev.sh clean

# Show help
./dev.sh help
```

---

## 🚀 Quick Start Guide

### First Time Setup
1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd watcher
   ```

2. **Run installation**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Start the application**:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

4. **Open in browser**:
   - Frontend: http://localhost:5173
   - Backend API: http://127.0.0.1:8976

### Development Workflow
1. **Start services for development**:
   ```bash
   chmod +x dev.sh
   ./dev.sh both
   ```

2. **Monitor logs**:
   ```bash
   ./dev.sh logs
   ```

3. **Check service status**:
   ```bash
   ./dev.sh status
   ```

4. **Stop services**:
   ```bash
   ./dev.sh stop
   ```

---

## ⚙️ Configuration

### Environment Variables (`.env`)
The scripts automatically create a `.env` file with default values:

```env
# Watcher Project Environment Variables
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8976
FRONTEND_PORT=5173
DATABASE_URL=sqlite:///./backend/data/watcher.db
SECRET_KEY=your-secret-key-here-change-in-production
```

**Customization**:
- Edit `.env` file to change ports or configuration
- Restart services after changes

---

## 📊 Service Ports

| Service | Default Port | URL |
|---------|--------------|-----|
| Backend | 8976 | http://127.0.0.1:8976 |
| Frontend | 5173 | http://localhost:5173 |

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Permission Denied
```bash
chmod +x install.sh run.sh dev.sh
```

#### 2. Port Already in Use
```bash
# Check what's using the port
lsof -i :8976
lsof -i :5173

# Kill the process or change ports in .env
```

#### 3. Python Virtual Environment Issues
```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 4. Node.js Dependencies Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 5. Database Issues
```bash
# Remove and recreate database
rm -f backend/data/watcher.db
./install.sh
```

### Log Files
- **Backend logs**: `logs/backend.log`
- **Frontend logs**: `logs/frontend.log`

View logs in real-time:
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log
```

---

## 🛠️ Advanced Usage

### Custom Ports
1. Edit `.env` file
2. Change `BACKEND_PORT` and `FRONTEND_PORT`
3. Restart services

### Development Mode
```bash
# Start only backend for API development
./dev.sh backend

# Start only frontend for UI development
./dev.sh frontend

# In another terminal, start the other service
```

### Production Deployment
```bash
# Build frontend for production
cd frontend
npm run build

# Start backend only
cd ../backend
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8976
```

---

## 📝 Script Features

### Error Handling
- ✅ Comprehensive error checking
- ✅ Graceful failure handling
- ✅ User-friendly error messages
- ✅ Automatic cleanup on errors

### Process Management
- ✅ Background process management
- ✅ PID tracking
- ✅ Signal handling (SIGINT, SIGTERM)
- ✅ Graceful shutdown

### Logging
- ✅ Structured logging
- ✅ Color-coded output
- ✅ File-based logging
- ✅ Real-time log viewing

### Security
- ✅ Non-root execution
- ✅ Environment variable validation
- ✅ Port availability checking
- ✅ Process isolation

---

## 🔧 Maintenance

### Regular Cleanup
```bash
# Clean temporary files and logs
./dev.sh clean

# Update dependencies
cd backend && source venv/bin/activate && pip install -r requirements.txt --upgrade
cd ../frontend && npm update
```

### Database Backup
```bash
# Backup SQLite database
cp backend/data/watcher.db backend/data/watcher.db.backup.$(date +%Y%m%d_%H%M%S)
```

---

## 📚 Additional Resources

- **Backend Documentation**: Check `backend/README.md` if available
- **Frontend Documentation**: Check `frontend/README.md` if available
- **API Documentation**: http://127.0.0.1:8976/docs (when backend is running)

---

## 🆘 Support

If you encounter issues:

1. **Check logs**: `./dev.sh logs`
2. **Check status**: `./dev.sh status`
3. **Restart services**: `./dev.sh stop && ./dev.sh both`
4. **Reinstall**: `./install.sh`

---

**Happy coding! 🚀**
