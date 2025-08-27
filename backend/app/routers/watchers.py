from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..db import get_db, cleanup_orphaned_events, SessionLocal
from ..models import Watcher, Event
from ..schemas import WatcherCreate, WatcherOut, WatcherUpdate
from ..deps import get_current_user, require_admin
from ..watcher_service import start_watcher, stop_watcher, list_running

router = APIRouter()

@router.post("/", response_model=WatcherOut)
def create_watcher(data: WatcherCreate, db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    watcher = Watcher(
        name=data.name, 
        path=data.path, 
        config=data.config,
        video_config=data.video_config.dict() if data.video_config else None
    )
    db.add(watcher)
    db.commit()
    db.refresh(watcher)
    return watcher

@router.get("/", response_model=list[WatcherOut])
def list_watchers(db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    return db.query(Watcher).all()

@router.get("/{watcher_id}", response_model=WatcherOut)
def get_watcher(watcher_id: int, db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    watcher = db.get(Watcher, watcher_id)
    if not watcher:
        raise HTTPException(status_code=404, detail="Not found")
    return watcher

@router.delete("/{watcher_id}")
def delete_watcher(watcher_id: int, db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    watcher = db.get(Watcher, watcher_id)
    if not watcher:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Count associated events before deletion
    event_count = db.query(Event).filter(Event.watcher_id == watcher_id).count()
    
    # Stop the watcher process if it's running
    stop_watcher(watcher_id)
    
    # Delete the watcher (this will cascade delete all associated events)
    db.delete(watcher)
    db.commit()
    
    return {
        "ok": True, 
        "message": f"Watcher '{watcher.name}' deleted successfully",
        "events_deleted": event_count,
        "details": f"Deleted {event_count} associated events"
    }

@router.put("/{watcher_id}", response_model=WatcherOut)
def update_watcher(watcher_id: int, data: WatcherUpdate, db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    watcher = db.get(Watcher, watcher_id)
    if not watcher:
        raise HTTPException(status_code=404, detail="Not found")
    if data.name is not None:
        watcher.name = data.name
    if data.path is not None:
        watcher.path = data.path
    if data.config is not None:
        watcher.config = data.config
    if data.video_config is not None:
        watcher.video_config = data.video_config.dict() if hasattr(data.video_config, 'dict') else data.video_config
    db.add(watcher)
    db.commit()
    db.refresh(watcher)
    return watcher

@router.post("/{watcher_id}/start")
def start_w(watcher_id: int, db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    watcher = db.get(Watcher, watcher_id)
    if not watcher:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Convert video_config from JSON back to VideoMetadataConfig if it exists
    video_config = None
    if watcher.video_config:
        from ..schemas import VideoMetadataConfig
        video_config = VideoMetadataConfig(**watcher.video_config)
    
    ok = start_watcher(watcher_id, watcher.path, watcher.config, video_config)
    return {"started": ok}

@router.post("/{watcher_id}/stop")
def stop_w(watcher_id: int, _: None = Depends(get_current_user)):
    ok = stop_watcher(watcher_id)
    return {"stopped": ok}

@router.get("/running")
def running(_: None = Depends(get_current_user)):
    return list_running()

@router.post("/cleanup", dependencies=[Depends(require_admin)])
def cleanup_database():
    """Clean up orphaned events and return database statistics."""
    try:
        # Clean up orphaned events
        orphaned_count = cleanup_orphaned_events()
        
        # Get database statistics
        db = SessionLocal()
        try:
            watcher_count = db.query(Watcher).count()
            event_count = db.query(Event).count()
            
            # Group events by watcher
            events_by_watcher = db.query(Event.watcher_id, func.count(Event.id)).group_by(Event.watcher_id).all()
            
            stats = {
                "watchers": watcher_count,
                "total_events": event_count,
                "events_by_watcher": {str(wid): count for wid, count in events_by_watcher},
                "orphaned_events_cleaned": orphaned_count
            }
            
            return {
                "success": True,
                "message": f"Database cleanup completed. Cleaned up {orphaned_count} orphaned events.",
                "statistics": stats
            }
            
        finally:
            db.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_database_stats():
    """Get database statistics."""
    try:
        db = SessionLocal()
        try:
            watcher_count = db.query(Watcher).count()
            event_count = db.query(Event).count()
            
            # Count events with video metadata
            video_events = db.query(Event).filter(Event.video_metadata.isnot(None)).count()
            
            # Count events with validation results
            validation_events = db.query(Event).filter(Event.validation_result.isnot(None)).count()
            
            # Group events by watcher
            events_by_watcher = db.query(Event.watcher_id, func.count(Event.id)).group_by(Event.watcher_id).all()
            
            stats = {
                "watchers": watcher_count,
                "total_events": event_count,
                "events_with_video_metadata": video_events,
            "events_with_validation": validation_events,
                "events_by_watcher": {str(wid): count for wid, count in events_by_watcher}
            }
            
            return stats
            
        finally:
            db.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")