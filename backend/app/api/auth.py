from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user, get_db
from ..core.security import create_access_token, hash_password, verify_password
from ..models import User
from ..schemas import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # Normalize emails for case-insensitive matching.
    normalized_email = payload.email.lower()
    # Enforce unique emails to keep login deterministic.
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=normalized_email,
        role=payload.role,
        location=payload.location,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_payload = create_access_token(user.id)
    return Token(access_token=token_payload["token"], expires_in=token_payload["expires_in"])


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # Return the same error for user/pass mismatches.
    normalized_email = payload.email.lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token_payload = create_access_token(user.id)
    return Token(access_token=token_payload["token"], expires_in=token_payload["expires_in"])


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
