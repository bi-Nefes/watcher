import time
import os
import fnmatch
from multiprocessing import Process
from typing import Dict, Any, Optional, List, Tuple
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import Event
from .schemas import VideoMetadataConfig, ValidationRule

_running_processes: Dict[int, Process] = {}

def validate_video_metadata(metadata: Dict[str, Any], rules: List[ValidationRule]) -> Tuple[bool, Dict[str, Any]]:
    """Validate video metadata against rules."""
    rules_checked = []
    failed_rules = []
    
    for rule in rules:
        if rule.field not in metadata:
            # Field not found in metadata, skip this rule
            continue
        
        field_value = metadata[rule.field]
        rules_checked.append(rule.field)
        
        # Special handling for duration fields - convert from milliseconds to seconds
        if rule.field in ['general_duration', 'video_duration'] and isinstance(field_value, (int, float)):
            original_value = field_value
            field_value = field_value / 1000.0  # Convert milliseconds to seconds
            print(f"   Converting {rule.field}: {original_value}ms -> {field_value}s")
        
        # Try to convert field_value to the same type as rule.value for comparison
        try:
            if isinstance(rule.value, (int, float)) and isinstance(field_value, str):
                field_value = float(field_value)
            elif isinstance(rule.value, str) and isinstance(field_value, (int, float)):
                field_value = str(field_value)
        except (ValueError, TypeError):
            # Can't convert, skip this rule
            continue
        
        # Apply validation logic
        rule_passed = False
        
        if rule.operator == ">":
            rule_passed = field_value > rule.value
        elif rule.operator == "<":
            rule_passed = field_value < rule.value
        elif rule.operator == ">=":
            rule_passed = field_value >= rule.value
        elif rule.operator == "<=":
            rule_passed = field_value <= rule.value
        elif rule.operator == "==":
            rule_passed = field_value == rule.value
        elif rule.operator == "!=":
            rule_passed = field_value != rule.value
        elif rule.operator == "in":
            rule_passed = field_value in rule.value
        elif rule.operator == "not_in":
            rule_passed = field_value not in rule.value
        else:
            # Unknown operator, skip this rule
            continue
        
        # For reject rules: if condition is TRUE, the file should be rejected (rule FAILED)
        # For accept rules: if condition is TRUE, the file should be accepted (rule PASSED)
        if rule.action == "reject":
            # Invert the logic for reject rules
            rule_passed = not rule_passed
        
        # If rule failed, add to failed rules
        if not rule_passed:
            failed_rules.append({
                "field": rule.field,
                "operator": rule.operator,
                "expected_value": rule.value,
                "actual_value": field_value,
                "action": rule.action,
                "description": rule.description
            })
    
    # Determine if validation passed
    # If any rule with action="reject" failed, the file is rejected
    # If any rule with action="accept" failed, the file is rejected
    rejected = any(rule["action"] == "reject" for rule in failed_rules)
    
    validation_result = {
        "valid": not rejected,
        "rules_checked": rules_checked,
        "failed_rules": failed_rules,
        "passed": not rejected
    }
    
    return not rejected, validation_result

def extract_video_metadata(file_path: str, video_config: Optional[VideoMetadataConfig]) -> Optional[Dict[str, Any]]:
    """Extract video metadata using pymediainfo if enabled and file is a video."""
    if not video_config or not video_config.extract_video_metadata:
        return None
    
    # Check if file is a video by extension
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ts'}
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext not in video_extensions:
        return None
    
    try:
        from pymediainfo import MediaInfo
        
        media_info = MediaInfo.parse(file_path)
        if not media_info.tracks:
            return None
        
        metadata = {}
        
        # Extract general info
        for track in media_info.tracks:
            if track.track_type == "General":
                for field in video_config.general_fields:
                    if hasattr(track, field) and getattr(track, field) is not None:
                        metadata[f"general_{field}"] = getattr(track, field)
            
            elif track.track_type == "Video":
                for field in video_config.video_fields:
                    if hasattr(track, field) and getattr(track, field) is not None:
                        metadata[f"video_{field}"] = getattr(track, field)
            
            elif track.track_type == "Audio":
                for field in video_config.audio_fields:
                    if hasattr(track, field) and getattr(track, field) is not None:
                        metadata[f"audio_{field}"] = getattr(track, field)
        
        # Add custom fields if specified
        for field in video_config.custom_fields:
            for track in media_info.tracks:
                if hasattr(track, field) and getattr(track, field) is not None:
                    metadata[f"custom_{field}"] = getattr(track, field)
                    break
        
        return metadata if metadata else None
        
    except Exception as e:
        print(f"Error extracting video metadata from {file_path}: {e}")
        return None

class _Handler(FileSystemEventHandler):
    def __init__(self, watcher_id: int, config: Dict[str, Any], video_config: Optional[VideoMetadataConfig] = None):
        self.watcher_id = watcher_id
        self.config = config or {}
        self.video_config = video_config
        
        # Default configuration
        self.recursive = self.config.get('recursive', True)
        self.include_patterns = self.config.get('include_patterns', ['*'])
        self.exclude_patterns = self.config.get('exclude_patterns', [])
        self.event_types = self.config.get('event_types', ['created', 'modified', 'deleted'])
        self.auto_delete_excluded = self.config.get('auto_delete_excluded', True)  # New option

    def _should_track_file(self, file_path: str) -> bool:
        """Check if the file should be tracked based on patterns."""
        filename = os.path.basename(file_path)
        
        # Check exclude patterns first
        for pattern in self.exclude_patterns:
            if fnmatch.fnmatch(filename, pattern):
                return False
        
        # Check include patterns
        for pattern in self.include_patterns:
            if fnmatch.fnmatch(filename, pattern):
                return True
        
        return False

    def _log(self, event_type: str, file_path: str):
        """Log an event if it matches the configuration."""
        if event_type not in self.event_types:
            return
        
        # Check if file should be tracked
        should_track = self._should_track_file(file_path)
        
        # If file is excluded and it's a 'created' event, delete it immediately (if enabled)
        if not should_track and event_type == 'created' and os.path.exists(file_path) and self.auto_delete_excluded:
            try:
                os.remove(file_path)
                print(f"🗑️  Excluded file {file_path} automatically deleted")
                # Log the deletion event
                self._log_deletion_event(file_path, "excluded_auto_delete")
                return
            except Exception as e:
                print(f"❌ Failed to delete excluded file {file_path}: {e}")
        
        # If file should not be tracked, don't proceed with normal logging
        if not should_track:
            return
        
        # Extract video metadata if enabled
        video_metadata = None
        validation_result = None
        file_rejected = False
        
        if event_type in ['created', 'modified'] and self.video_config:
            video_metadata = extract_video_metadata(file_path, self.video_config)
            
            # Debug: Log extracted metadata
            if video_metadata:
                print(f"📹 Extracted metadata for {file_path}:")
                for key, value in video_metadata.items():
                    print(f"   {key}: {value}")
            
            # Apply validation if enabled
            if (video_metadata and self.video_config.enable_validation and 
                self.video_config.validation_rules):
                
                print(f"🔍 Validation enabled for {file_path}")
                print(f"   Rules to check: {len(self.video_config.validation_rules)}")
                for rule in self.video_config.validation_rules:
                    print(f"   Rule: {rule.field} {rule.operator} {rule.value} -> {rule.action}")
                
                is_valid, validation_result = validate_video_metadata(
                    video_metadata, self.video_config.validation_rules
                )
                
                print(f"   Validation result: {validation_result}")
                
                # Check if file should be rejected
                if not is_valid:
                    file_rejected = True
                    print(f"🚫 Video validation failed for {file_path}")
                    print(f"   Validation result: {validation_result}")
                    
                    # Handle rejected file per configuration
                    try:
                        if os.path.exists(file_path):
                            handling = getattr(self.video_config, 'reject_handling', 'delete')
                            if handling == 'move':
                                target_dir = getattr(self.video_config, 'reject_move_to_dir', None)
                                if target_dir and isinstance(target_dir, str):
                                    try:
                                        os.makedirs(target_dir, exist_ok=True)
                                        base = os.path.basename(file_path)
                                        dest_path = os.path.join(target_dir, base)
                                        # If destination exists, append timestamp
                                        if os.path.exists(dest_path):
                                            name, ext = os.path.splitext(base)
                                            dest_path = os.path.join(target_dir, f"{name}_{int(time.time())}{ext}")
                                        os.replace(file_path, dest_path)
                                        print(f"📁 Rejected file moved to: {dest_path}")
                                    except Exception as move_err:
                                        print(f"❌ Failed to move rejected file, falling back to delete: {move_err}")
                                        os.remove(file_path)
                                        print(f"🗑️  Rejected file deleted: {file_path}")
                                else:
                                    # No valid dir; delete as fallback
                                    os.remove(file_path)
                                    print(f"🗑️  Rejected file deleted (no valid move dir): {file_path}")
                            else:
                                os.remove(file_path)
                                print(f"🗑️  Rejected file deleted: {file_path}")
                            # Change event type to indicate rejection
                            event_type = "rejected"
                        else:
                            print(f"⚠️  File {file_path} no longer exists, cannot handle rejection")
                    except Exception as e:
                        print(f"❌ Error handling rejected file {file_path}: {e}")
                else:
                    print(f"✅ Video validation passed for {file_path}")
            else:
                print(f"⚠️  Validation not enabled or no rules for {file_path}")
                if not video_metadata:
                    print("   No video metadata extracted")
                if not self.video_config.enable_validation:
                    print("   Validation not enabled")
                if not self.video_config.validation_rules:
                    print("   No validation rules")
            
        db: Session = SessionLocal()
        try:
            event = Event(
                watcher_id=self.watcher_id, 
                event_type=event_type, 
                file_path=file_path,
                video_metadata=video_metadata,
                validation_result=validation_result
            )
            db.add(event)
            db.commit()
        except Exception as e:
            print(f"Error logging event: {e}")
        finally:
            db.close()

    def _log_deletion_event(self, file_path: str, reason: str):
        """Log when an excluded file is automatically deleted."""
        try:
            db: Session = SessionLocal()
            event = Event(
                watcher_id=self.watcher_id, 
                event_type="deleted", 
                file_path=file_path,
                video_metadata=None,
                validation_result={"reason": reason, "auto_deleted": True}
            )
            db.add(event)
            db.commit()
            print(f"📝 Logged auto-deletion event for {file_path}")
        except Exception as e:
            print(f"Error logging auto-deletion event: {e}")
        finally:
            db.close()

    def on_created(self, event):
        if not event.is_directory:
            self._log("created", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self._log("modified", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self._log("deleted", event.src_path)


def _run_observer(watcher_id: int, path: str, config: Dict[str, Any], video_config: Optional[VideoMetadataConfig] = None):
    observer = Observer()
    handler = _Handler(watcher_id=watcher_id, config=config, video_config=video_config)
    
    # Use recursive setting from config
    recursive = config.get('recursive', True) if config else True
    
    observer.schedule(handler, path=path, recursive=recursive)
    observer.start()
    try:
        while True:
            time.sleep(1)
    finally:
        observer.stop()
        observer.join()


def start_watcher(watcher_id: int, path: str, config: Dict[str, Any] = None, video_config: Optional[VideoMetadataConfig] = None) -> bool:
    if watcher_id in _running_processes and _running_processes[watcher_id].is_alive():
        return False
    
    # Validate path exists
    if not os.path.exists(path):
        return False
    
    p = Process(target=_run_observer, args=(watcher_id, path, config, video_config), daemon=True)
    p.start()
    _running_processes[watcher_id] = p
    return True


def stop_watcher(watcher_id: int) -> bool:
    """Stop a watcher and clean up its process."""
    p = _running_processes.get(watcher_id)
    if not p:
        return False
    
    try:
        if p.is_alive():
            p.terminate()
            p.join(timeout=5)
            if p.is_alive():
                # Force kill if still alive
                p.kill()
                p.join(timeout=2)
    except Exception as e:
        print(f"Error stopping watcher {watcher_id}: {e}")
    finally:
        # Always remove from running processes
        _running_processes.pop(watcher_id, None)
    
    return True


def cleanup_watcher(watcher_id: int) -> bool:
    """Clean up a watcher completely - stop process and remove from tracking."""
    # Stop the watcher process
    stop_watcher(watcher_id)
    
    # Additional cleanup if needed
    print(f"Cleaned up watcher {watcher_id}")
    return True


def list_running() -> Dict[int, bool]:
    """List all running watchers and their status."""
    print(f"🔍 list_running called")
    print(f"🔍 _running_processes keys: {list(_running_processes.keys())}")
    result = {wid: proc.is_alive() for wid, proc in _running_processes.items()}
    print(f"🔍 Returning result: {result}")
    return result


def cleanup_all_watchers() -> None:
    """Clean up all running watchers. Useful for shutdown."""
    for watcher_id in list(_running_processes.keys()):
        cleanup_watcher(watcher_id)