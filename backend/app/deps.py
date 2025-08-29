from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, UserRole
from .auth import decode_token

class DebugOAuth2PasswordBearer(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> str:
        print(f"🔐 OAuth2PasswordBearer called")
        print(f"🔐 Headers: {dict(request.headers)}")
        token = await super().__call__(request)
        print(f"🔐 Extracted token: {token[:20]}..." if token else "No token")
        return token

oauth2_scheme = DebugOAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    print(f"🔐 get_current_user called with token: {token[:20]}..." if token else "No token")
    username = decode_token(token)
    print(f"🔐 Decoded username: {username}")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.username == username).first()
    print(f"🔐 Found user: {user.username if user else 'None'}")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user