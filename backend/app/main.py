from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, watchers, events, users
from .db import engine, Base, cleanup_orphaned_events
from .watcher_service import cleanup_all_watchers

app = FastAPI(title="File Watcher API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(watchers.router, prefix="/watchers", tags=["watchers"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(users.router)

@app.on_event("startup")
async def startup_event():
    """Clean up orphaned events on startup"""
    cleanup_orphaned_events()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up all watchers on shutdown"""
    cleanup_all_watchers()

@app.get("/")
def read_root():
    return {"message": "File Watcher API"}