# Watcher Application

A file system monitoring application with a FastAPI backend and React frontend, featuring advanced video metadata extraction and validation capabilities.

## Features

- File system monitoring with configurable watchers
- Real-time event tracking
- **Video metadata extraction using pymediainfo**
- **Video validation rules with configurable thresholds**
- **Automatic cleanup** - Events are automatically deleted when watchers are removed
- **Smart file exclusion** - Automatically delete unwanted files based on pattern matching
- User authentication and authorization
- Admin and user roles
- Web-based dashboard
- Advanced watcher configuration options

## 🛠️ Project Scripts

The project includes three powerful automation scripts for seamless development and deployment:

### 📦 `install.sh` - Complete Installation
- **One-command setup** for the entire project
- **Automatic dependency installation** (Python, Node.js, npm)
- **Database initialization** and configuration
- **Environment setup** with `.env` file creation
- **Git hooks** for code quality

### 🚀 `run.sh` - Production Ready
- **Start both services** with proper process management
- **Port validation** and conflict detection
- **Graceful shutdown** with Ctrl+C
- **Logging system** for monitoring and debugging

### 🔧 `dev.sh` - Development Workflow
- **Flexible service control** (start individual or both services)
- **Real-time monitoring** and status checking
- **Log viewing** and process management
- **Cleanup utilities** for maintenance

**Quick Start:**
```bash
chmod +x install.sh run.sh dev.sh
./install.sh    # First time setup
./run.sh        # Start application
./dev.sh help   # View all options
```

For complete script documentation, see [SCRIPTS_README.md](SCRIPTS_README.md).

## Watcher Configuration Options

Each watcher can be configured with the following options:

### Basic Settings
- **Name**: A descriptive name for the watcher
- **Path**: The directory path to monitor

### File Watching Configuration
- **Recursive**: Watch subdirectories recursively (default: true)
- **Event Types**: Choose which events to track:
  - File Created
  - File Modified  
  - File Deleted
- **Include Patterns**: File patterns to include (e.g., `*.txt`, `*.log`, `*.py`)
- **Exclude Patterns**: File patterns to exclude (e.g., `*.tmp`, `*.bak`)
- **Auto-delete Excluded**: Automatically delete excluded files after placement (prevents unwanted file accumulation)

### Video Metadata Configuration
- **Extract Video Metadata**: Enable/disable video metadata extraction
- **Video Fields**: Select which video properties to extract:
  - Resolution (width, height)
  - Codec information
  - Bitrate and frame rate
  - Duration and aspect ratios
- **Audio Fields**: Select which audio properties to extract:
  - Audio codec
  - Channel count and sample rate
  - Audio bitrate
- **General Fields**: Select which container properties to extract:
  - File format and size
  - Overall duration and bitrate
- **Custom Fields**: Add custom pymediainfo fields

### Video Validation Rules
- **Enable Validation**: Turn on/off validation checking
- **Validation Rules**: Define conditions for accepting/rejecting video files:
  - **Field**: Metadata field to check (e.g., `video_height`, `general_file_size`)
  - **Operator**: Comparison operator (`>`, `<`, `>=`, `<=`, `==`, `!=`, `in`, `not_in`)
  - **Value**: Threshold or expected value
  - **Action**: What happens if rule fails (`reject` or `accept`)
  - **Description**: Human-readable explanation of the rule

#### Validation Examples
- **Reject 4K videos**: `video_height > 1080` → Reject files taller than 1080px
- **Reject large files**: `general_file_size > 1000000000` → Reject files larger than 1GB
- **Accept only H.264**: `video_codec_name == "H.264"` → Accept only H.264 encoded videos
- **Reject short videos**: `general_duration < 30` → Reject videos shorter than 30 seconds
- **Accept specific formats**: `general_format_name in ["MP4", "AVI", "MKV"]` → Accept only these formats

### Pattern Examples
- `*.txt` - All text files
- `*.log` - All log files
- `*.mp4` - All MP4 video files
- `*.{mp4,avi,mkv}` - Multiple video formats
- `data_*` - Files starting with "data_"
- `temp*` - Files starting with "temp"

## Supported Video Formats

The application automatically detects and extracts metadata from:
- **MP4, AVI, MKV, MOV, WMV, FLV, WebM, M4V, 3GP, TS**

## 🚀 Quick Setup with Scripts

The project includes comprehensive automation scripts for easy setup and management.

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- **MediaInfo library** (required for pymediainfo)

### MediaInfo Installation

**Ubuntu/Debian:**
```bash
sudo apt-get install mediainfo
```

**macOS:**
```bash
brew install mediainfo
```

**Windows:**
Download from [MediaInfo website](https://mediaarea.net/en/MediaInfo/Download)

### Automated Setup (Recommended)

1. **Make scripts executable:**
```bash
chmod +x install.sh run.sh dev.sh
```

2. **Run the installation script:**
```bash
./install.sh
```

This script will:
- ✅ Check system requirements
- ✅ Install Node.js if needed
- ✅ Create Python virtual environment
- ✅ Install all dependencies
- ✅ Initialize database
- ✅ Build frontend
- ✅ Create environment configuration
- ✅ Set up Git hooks

3. **Start the application:**
```bash
./run.sh
```

### Manual Setup (Alternative)

If you prefer manual setup or encounter issues with the automated scripts:

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. **Reset database** (if upgrading from old version):
```bash
python reset_db.py
```

4. Create the first admin user (choose one method):

**Interactive method:**
```bash
python create_admin.py
```

**Command line method:**
```bash
python create_admin_simple.py admin mypassword admin@example.com
```

5. Start the backend server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8976
```

The backend will be available at:
- API: http://127.0.0.1:8976
- Documentation: http://127.0.0.1:8976/docs

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:5173

### Development Workflow

For development, use the flexible development script:

```bash
# Start both services
./dev.sh both

# Start only backend
./dev.sh backend

# Start only frontend
./dev.sh frontend

# View logs
./dev.sh logs

# Check service status
./dev.sh status

# Stop all services
./dev.sh stop

# Clean up temporary files
./dev.sh clean
```

### Script Documentation

For detailed information about all available scripts, see [SCRIPTS_README.md](SCRIPTS_README.md).

## Usage

1. Open your browser and go to http://localhost:5173
2. Login with your admin credentials
3. Create watchers to monitor specific directories:
   - Enter a name and path
   - Click "Show Config" to access file watching options
   - Click "Show Video" to access video metadata options
   - Enable video metadata extraction
   - **Enable validation rules** and add your conditions
   - Configure event types, patterns, and video metadata fields
   - Click "Add" to create the watcher
4. Start watchers to begin monitoring
5. Add video files to the watched directory
6. View real-time events in the Events page
7. Click "Show Details" on video events to view extracted metadata and validation results

## Data Management

### Automatic Cleanup
- **Cascade Deletion**: When a watcher is deleted, all its associated events are automatically removed
- **Process Cleanup**: Watcher processes are properly terminated and cleaned up
- **Database Consistency**: Orphaned events are automatically detected and cleaned up on startup

### Manual Cleanup (Admin Only)
- **Cleanup Endpoint**: `POST /watchers/cleanup` - Remove orphaned events and get statistics
- **Statistics Endpoint**: `GET /watchers/stats` - View database statistics and event counts

### Database Maintenance
- **Startup Cleanup**: Automatic cleanup of orphaned events when application starts
- **Shutdown Cleanup**: Proper cleanup of all running watchers when application shuts down
- **Transaction Safety**: All deletions are wrapped in database transactions for data integrity

## Video Metadata Example

When a video file is detected, the system can extract information like:

**Video Track:**
- Resolution: 1920x1080
- Codec: H.264
- Bitrate: 2.5Mbps
- Frame Rate: 30fps
- Duration: 120.5s

**Audio Track:**
- Codec: AAC
- Channels: 2
- Sample Rate: 48kHz
- Bitrate: 128kbps

**General Info:**
- Format: MP4
- File Size: 350MB
- Overall Bitrate: 2.6Mbps

## Validation Results

The system provides detailed validation results:

**Passed Validation:**
- ✅ All rules passed
- File meets all requirements
- Video metadata stored normally

**Failed Validation:**
- ❌ One or more rules failed
- Detailed breakdown of which rules failed
- Shows expected vs. actual values
- Indicates whether file was rejected or accepted

## API Endpoints

- `POST /auth/login` - User login
- `GET /users/` - List users (admin only)
- `POST /users/` - Create user (admin only)
- `GET /watchers/` - List watchers
- `POST /watchers/` - Create watcher
- `DELETE /watchers/{id}` - Delete watcher (with automatic event cleanup)
- `POST /watchers/{id}/start` - Start watcher
- `POST /watchers/{id}/stop` - Stop watcher
- `GET /watchers/running` - List running watchers
- `POST /watchers/cleanup` - Clean up orphaned events (admin only)
- `GET /watchers/stats` - Get database statistics (admin only)
- `GET /events/` - List events (includes video metadata and validation results)

## Database

The application uses SQLite as the database. The database file (`watcher.db`) will be created automatically in the backend directory when you first run the application.

**New Tables/Fields:**
- `watchers.video_config` - JSON field storing video metadata configuration and validation rules
- `events.video_metadata` - JSON field storing extracted video metadata
- `events.validation_result` - JSON field storing validation results

**Relationships:**
- `watchers` → `events` (one-to-many with cascade delete)
- When a watcher is deleted, all its events are automatically removed

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Admin role required for user management and cleanup operations
- CORS is enabled for development

## Development

### Backend Development

The backend is built with:
- FastAPI
- SQLAlchemy
- Pydantic
- JWT authentication
- Watchdog for file system monitoring
- **pymediainfo for video metadata extraction**
- **Custom validation engine for video rules**
- **Automatic cleanup and process management**

### Frontend Development

The frontend is built with:
- React 18
- TypeScript
- Vite
- Bootstrap 5
- React Router

## Troubleshooting

### Script Issues
1. **Permission denied**: Run `chmod +x install.sh run.sh dev.sh`
2. **Script not found**: Ensure you're in the project root directory
3. **Installation fails**: Check system requirements (Python 3.8+, Node.js 16+)
4. **Port conflicts**: Scripts automatically detect and report port conflicts
5. **Service won't start**: Use `./dev.sh logs` to view detailed error logs

### General Issues
6. **Database issues**: Delete `watcher.db` and recreate the admin user
7. **Port conflicts**: Change the port in the startup commands or `.env` file
8. **CORS issues**: Check that the frontend URL is allowed in the backend CORS settings
9. **Path not found**: Ensure the directory path exists and is accessible
10. **No events showing**: Check that the watcher is started and the path is valid

### Video Metadata Issues
6. **Video metadata not working**: Ensure MediaInfo is installed and pymediainfo can access it
7. **Large file processing**: Video metadata extraction may take time for large files
8. **Validation rules not working**: Check that the field names match the selected metadata fields
9. **Type conversion errors**: Ensure validation values match the expected data types

### Events Page Issues
10. **Video Info/Validation columns empty**: 
    - Check browser console for debug information
    - Ensure watcher has video metadata extraction enabled
    - Verify video files are being processed
    - Check if database needs to be reset: `python reset_db.py`
    - Look for MediaInfo installation issues

### Data Cleanup Issues
11. **Events not deleted when watcher removed**:
    - Check database cascade delete configuration
    - Run manual cleanup: `POST /watchers/cleanup`
    - Verify database schema is up to date
    - Check for orphaned events in statistics

### Debugging Steps
1. **Check browser console** for detailed event data logs
2. **Verify MediaInfo installation**: `mediainfo --version`
3. **Check backend logs** for video processing errors
4. **Reset database** if upgrading from old version
5. **Test with simple video files** (small MP4 files work best)
6. **Verify file permissions** on watched directories
7. **Check database statistics** via admin endpoints
8. **Run manual cleanup** if orphaned events exist

### Common Solutions
- **Database schema mismatch**: Run `python reset_db.py` to recreate database
- **MediaInfo not found**: Install MediaInfo library for your OS
- **No video events**: Ensure watcher is started and video files are added
- **Validation not working**: Check that validation rules reference correct field names
- **Orphaned events**: Use cleanup endpoint or restart application
- **Process cleanup issues**: Check watcher service logs for termination errors
