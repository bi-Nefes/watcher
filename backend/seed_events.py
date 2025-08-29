from datetime import datetime, timedelta
import random

from app.db import SessionLocal
from app.models import Watcher, Event


def main() -> None:
    db = SessionLocal()
    try:
        watcher = db.query(Watcher).first()
        if not watcher:
            watcher = Watcher(
                name="Demo Watcher",
                path="/tmp/demo",
                config={
                    "recursive": True,
                    "include_patterns": ["*"],
                    "exclude_patterns": [],
                    "event_types": ["created", "modified", "deleted", "rejected"],
                },
                video_config=None,
            )
            db.add(watcher)
            db.commit()
            db.refresh(watcher)

        event_types = ["created", "modified", "deleted", "rejected"]
        file_names = [
            "sample1.mp4",
            "clip2.mkv",
            "movie3.mov",
            "audio.aac",
            "tmp.tmp",
            "video4.mp4",
            "series_s01e01.mp4",
            "trailer.mkv",
        ]

        sample_metas = [
            {"general_duration": 24, "video_width": 1920, "video_height": 1080, "video_codec_name": "h264"},
            {"general_duration": 65, "video_width": 1280, "video_height": 720, "video_codec_name": "hevc"},
            {"general_duration": 12, "video_width": 3840, "video_height": 2160, "video_codec_name": "h265"},
            None,
        ]
        sample_validations = [
            {"rules_checked": 3, "passed": True},
            {"rules_checked": 3, "passed": False, "reason": "duration > 30"},
            None,
        ]

        now = datetime.utcnow()
        events_to_create = 30

        for i in range(events_to_create):
            et = random.choice(event_types)
            fname = random.choice(file_names)
            meta = random.choice(sample_metas)
            val = random.choice(sample_validations)

            e = Event(
                watcher_id=watcher.id,
                event_type=et,
                file_path=f"/tmp/demo/{i:03d}-{fname}",
                video_metadata=meta,
                validation_result=val,
                created_at=now - timedelta(minutes=random.randint(0, 600)),
            )
            db.add(e)

        db.commit()
        print(f"Seeded {events_to_create} events for watcher id={watcher.id} ({watcher.name})")
    finally:
        db.close()


if __name__ == "__main__":
    main()


