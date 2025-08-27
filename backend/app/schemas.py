from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator, field_validator
from .models import UserRole

class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    role: UserRole = UserRole.user

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    username: str
    password: str

class ValidationRule(BaseModel):
    """A validation rule for video metadata"""
    field: str  # e.g., "video_height", "video_bit_rate", "general_file_size"
    operator: str  # ">", "<", ">=", "<=", "==", "!=", "in", "not_in"
    value: Union[int, float, str, List[Union[int, float, str]]]  # threshold value or list for "in" operator
    action: str = "reject"  # "reject" or "accept"
    description: Optional[str] = None  # human-readable description

class VideoMetadataConfig(BaseModel):
    """Configuration for video metadata extraction and validation"""
    extract_video_metadata: bool = False
    video_fields: List[str] = [
        "width", "height", "codec_name", "bit_rate", "frame_rate", "duration",
        "display_aspect_ratio", "pixel_aspect_ratio"
    ]
    audio_fields: List[str] = [
        "codec_name", "channels", "sample_rate", "bit_rate"
    ]
    general_fields: List[str] = [
        "format_name", "file_size", "duration", "overall_bit_rate"
    ]
    custom_fields: List[str] = []
    
    # Validation rules
    validation_rules: List[ValidationRule] = []
    enable_validation: bool = False
    # What to do with rejected files: 'delete' or 'move'
    reject_handling: Optional[str] = 'delete'
    # If reject_handling == 'move', move rejected files to this directory
    reject_move_to_dir: Optional[str] = None

class WatcherCreate(BaseModel):
    name: str
    path: str
    config: Dict[str, Any] = {}
    video_config: Optional[VideoMetadataConfig] = None

class WatcherUpdate(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    video_config: Optional[VideoMetadataConfig] = None

class WatcherOut(BaseModel):
    id: int
    name: str
    path: str
    config: Dict[str, Any]
    video_config: Optional[VideoMetadataConfig] = None
    class Config:
        from_attributes = True

class EventOut(BaseModel):
    id: int
    watcher_id: int
    event_type: str
    file_path: str
    created_at: Optional[datetime] = None
    video_metadata: Optional[Dict[str, Any]] = None
    validation_result: Optional[Dict[str, Any]] = None  # Validation results
    class Config:
        from_attributes = True