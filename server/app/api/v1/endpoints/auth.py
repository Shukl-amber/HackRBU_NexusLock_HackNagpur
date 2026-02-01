from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.core.database import get_public_db
from app.api.deps import get_current_user
from app.schemas.user import UserCreate, UserLogin, UserResponse, AuthResponse
from app.crud import user as user_crud
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post(
    "/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
async def signup(credentials: UserCreate, db: AsyncSession = Depends(get_public_db)):
    existing_user = await user_crud.get_user_by_email(db, credentials.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    password_hash = hash_password(credentials.password)
    user = await user_crud.create_user(
        db, email=credentials.email, password_hash=password_hash, name=credentials.name
    )

    access_token = create_access_token(
        {"sub": str(user.id), "email": user.email}, expires_delta=timedelta(days=7)
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_public_db)):
    user = await user_crud.get_user_by_email(db, credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    access_token = create_access_token(
        {"sub": str(user.id), "email": user.email}, expires_delta=timedelta(days=7)
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/auth/me", response_model=UserResponse)
async def me(
    user_id=Depends(get_current_user), db: AsyncSession = Depends(get_public_db)
):
    user = await user_crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return UserResponse.model_validate(user)
