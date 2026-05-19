from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import criteria, evaluations, locations, profiles
from core.config import settings

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def _value_error_to_422(request: Request, exc: ValueError) -> JSONResponse:
    """Domain-level ValueError (e.g. CR > 0.10, matrix size mismatch) → HTTP 422."""
    return JSONResponse(status_code=422, content={"detail": str(exc)})


app.include_router(profiles.router)
app.include_router(criteria.router)
app.include_router(locations.router)
app.include_router(evaluations.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Перевірка доступності сервісу."""
    return {"status": "ok", "version": settings.app_version}
