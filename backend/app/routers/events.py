from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Event
from ..schemas import EventOut
from ..deps import get_current_user

router = APIRouter()

@router.get("/", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    return db.query(Event).order_by(Event.id.desc()).limit(500).all()