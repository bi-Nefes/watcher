from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./watcher.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

def init_db():
    from . import models  # noqa
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def cleanup_orphaned_events():
    """Remove any events that reference non-existent watchers."""
    from .models import Event, Watcher
    
    db = SessionLocal()
    try:
        # Find events with watcher_id that don't exist in watchers table
        orphaned_events = db.query(Event).outerjoin(Watcher, Event.watcher_id == Watcher.id).filter(Watcher.id.is_(None)).all()
        
        if orphaned_events:
            count = len(orphaned_events)
            print(f"🧹 Found {count} orphaned events, cleaning up...")
            
            for event in orphaned_events:
                db.delete(event)
            
            db.commit()
            print(f"✅ Cleaned up {count} orphaned events")
            return count
        else:
            print("ℹ️  No orphaned events found")
            return 0
            
    except Exception as e:
        print(f"❌ Error cleaning up orphaned events: {e}")
        db.rollback()
        return 0
    finally:
        db.close()