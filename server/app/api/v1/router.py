"""API v1 router assembly - combines all endpoint routers."""

from fastapi import APIRouter

from app.api.v1.endpoints import proof, admin

api_router = APIRouter()
api_router.include_router(proof.router, tags=["proofs"])
api_router.include_router(admin.router, tags=["admin"])
