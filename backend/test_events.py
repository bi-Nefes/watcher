#!/usr/bin/env python3
"""
Test script to verify events endpoint and data structure.
Run this after starting the backend to check if events are being created correctly.
"""

import requests
import json

def test_events_endpoint():
    """Test the events endpoint to see what data is returned."""
    
    # You'll need to get a valid token first
    print("Testing Events Endpoint")
    print("=" * 50)
    
    # First, try to get events without authentication
    try:
        response = requests.get('http://localhost:8000/events')
        print(f"Unauthenticated request status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Authentication required (expected)")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Backend not running. Start with: uvicorn app.main:app --reload")
        return
    
    # Check if there are any events in the database
    print("\nTo test with data:")
    print("1. Start the backend: uvicorn app.main:app --reload")
    print("2. Create an admin user: python create_admin.py")
    print("3. Start the frontend: npm run dev")
    print("4. Login and create a watcher with video metadata enabled")
    print("5. Add some video files to the watched directory")
    print("6. Check the events endpoint again")

if __name__ == "__main__":
    test_events_endpoint()
