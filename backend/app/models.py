import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, JSON, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base

class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)

class Watcher(Base):
    __tablename__ = "watchers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    path = Column(Text, nullable=False)
    config = Column(JSON, nullable=False, default={})
    video_config = Column(JSON, nullable=True)  # Video metadata configuration
    events = relationship("Event", back_populates="watcher", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    watcher_id = Column(Integer, ForeignKey("watchers.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # created | modified | deleted | rejected
    file_path = Column(Text, nullable=False)
    video_metadata = Column(JSON, nullable=True)  # Extracted video metadata
    validation_result = Column(JSON, nullable=True)  # Video validation results
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    watcher = relationship("Watcher", back_populates="events")