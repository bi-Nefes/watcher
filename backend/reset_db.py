#!/usr/bin/env python3
"""
Script to reset the database and recreate it with the new schema.
This will ensure all new fields (video_metadata, validation_result) are properly created.
"""

import os
import sys

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def reset_database():
    """Reset the database by removing the old file and recreating it."""
    
    db_path = "watcher.db"
    
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"✅ Removed old database: {db_path}")
        except Exception as e:
            print(f"❌ Error removing database: {e}")
            return False
    else:
        print(f"ℹ️  No existing database found at: {db_path}")
    
    try:
        from app.db import init_db
        from app.models import User, UserRole
        from app.auth import hash_password
        from sqlalchemy.orm import Session
        from app.db import SessionLocal
        
        # Initialize new database
        print("🔄 Initializing new database...")
        init_db()
        print("✅ Database initialized successfully")
        
        # Create a default admin user
        print("🔄 Creating default admin user...")
        db = SessionLocal()
        try:
            # Check if admin user already exists
            existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
            if not existing_admin:
                admin_user = User(
                    username="admin",
                    password_hash=hash_password("admin123"),
                    email="admin@example.com",
                    role=UserRole.admin
                )
                db.add(admin_user)
                db.commit()
                print("✅ Default admin user created:")
                print("   Username: admin")
                print("   Password: admin123")
                print("   Email: admin@example.com")
            else:
                print("ℹ️  Admin user already exists")
        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
            db.rollback()
        finally:
            db.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False

def main():
    print("🗄️  Database Reset Tool")
    print("=" * 40)
    
    confirm = input("This will DELETE the existing database and create a new one. Continue? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    print("\n🔄 Starting database reset...")
    
    if reset_database():
        print("\n🎉 Database reset completed successfully!")
        print("\nNext steps:")
        print("1. Start the backend: uvicorn app.main:app --reload")
        print("2. Start the frontend: npm run dev")
        print("3. Login with admin/admin123")
        print("4. Create watchers with video metadata enabled")
        print("5. Add video files to test the system")
    else:
        print("\n💥 Database reset failed. Check the error messages above.")

if __name__ == "__main__":
    main()
