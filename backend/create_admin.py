#!/usr/bin/env python3
"""
Script to create the first admin user for the Watcher application.
Run this script once to set up the initial admin user.
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.db import SessionLocal, init_db
from app.models import User, UserRole
from app.auth import hash_password

def create_admin_user(username: str, password: str, email: str):
    """Create an admin user in the database."""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            print(f"User with username '{username}' or email '{email}' already exists!")
            return False
        
        # Create new admin user
        admin_user = User(
            username=username,
            password_hash=hash_password(password),
            email=email,
            role=UserRole.admin
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"   Email: {email}")
        print(f"   Role: {admin_user.role}")
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    print("🔧 Watcher Admin User Creation")
    print("=" * 40)
    
    # Initialize database
    print("Initializing database...")
    init_db()
    
    # Get user input
    print("\nPlease provide admin user details:")
    username = input("Username: ").strip()
    if not username:
        print("❌ Username is required!")
        return
    
    password = input("Password: ").strip()
    if not password:
        print("❌ Password is required!")
        return
    
    if len(password) < 6:
        print("❌ Password must be at least 6 characters long!")
        return
    
    email = input("Email: ").strip()
    if not email:
        print("❌ Email is required!")
        return
    
    if '@' not in email:
        print("❌ Please provide a valid email address!")
        return
    
    # Confirm creation
    print(f"\nAbout to create admin user:")
    print(f"  Username: {username}")
    print(f"  Email: {email}")
    print(f"  Role: admin")
    
    confirm = input("\nProceed? (y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("❌ Admin user creation cancelled.")
        return
    
    # Create the admin user
    print("\nCreating admin user...")
    success = create_admin_user(username, password, email)
    
    if success:
        print("\n🎉 Setup complete!")
        print("You can now start the application and login with your admin credentials.")
    else:
        print("\n💥 Setup failed. Please check the error messages above.")

if __name__ == "__main__":
    main()
