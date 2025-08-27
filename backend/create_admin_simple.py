#!/usr/bin/env python3
"""
Simple script to create the first admin user with command line arguments.
Usage: python create_admin_simple.py <username> <password> <email>
"""

import sys
import os

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
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    if len(sys.argv) != 4:
        print("Usage: python create_admin_simple.py <username> <password> <email>")
        print("Example: python create_admin_simple.py admin mypassword admin@example.com")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    email = sys.argv[3]
    
    # Validate inputs
    if len(password) < 6:
        print("❌ Password must be at least 6 characters long!")
        sys.exit(1)
    
    if '@' not in email:
        print("❌ Please provide a valid email address!")
        sys.exit(1)
    
    # Initialize database
    init_db()
    
    # Create the admin user
    success = create_admin_user(username, password, email)
    
    if success:
        print("🎉 Admin user created successfully!")
    else:
        print("💥 Failed to create admin user.")
        sys.exit(1)

if __name__ == "__main__":
    main()
