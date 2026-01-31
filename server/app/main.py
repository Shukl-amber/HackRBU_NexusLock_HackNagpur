"""FastAPI application - main entry point for ConsentVault DPI API."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import uuid

from app.core.config import settings
from app.api.v1.router import api_router
from app.services.redis import blacklist


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add X-Request-ID header to all responses for tracing."""

    async def dispatch(self, request: Request, call_next):
        """Generate unique request ID and add to response headers."""
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown.

    Handles:
    - Redis connection on startup
    - Redis cleanup on shutdown
    """
    # Startup
    await blacklist.connect()
    yield
    # Shutdown
    await blacklist.close()


app = FastAPI(
    title="ConsentVault DPI API",
    description="DPDP-compliant consent management with ZKP verification",
    version="1.0.0",
    contact={"name": "ConsentVault Team", "email": "support@consentvault.gov.in"},
    lifespan=lifespan,
)

# Request ID middleware
app.add_middleware(RequestIDMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler to sanitize errors."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Don't log sensitive data, just error type
    print(f"[{request_id}] Unhandled error: {type(exc).__name__}")

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with sanitized messages."""
    request_id = getattr(request.state, "request_id", "unknown")

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "request_id": request_id,
        },
    )


# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    """Health check endpoint - tests all critical connections.

    Returns:
        Dictionary with status of:
        - Overall system status (healthy/degraded)
        - Public database connection
        - Private database connection
        - Redis connection
    """
    from app.core.database import public_engine, private_engine
    from sqlalchemy import text

    health_status = {"status": "healthy", "databases": {}, "redis": "disconnected"}

    # Check public database
    try:
        async with public_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["databases"]["public"] = "connected"
    except Exception:
        health_status["databases"]["public"] = "disconnected"
        health_status["status"] = "degraded"

    # Check private database
    try:
        async with private_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["databases"]["private"] = "connected"
    except Exception:
        health_status["databases"]["private"] = "disconnected"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        if blacklist.redis:
            await blacklist.redis.ping()
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "disconnected"
            health_status["status"] = "degraded"
    except Exception:
        health_status["redis"] = "disconnected"
        health_status["status"] = "degraded"

    return health_status
