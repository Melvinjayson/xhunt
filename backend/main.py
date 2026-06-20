import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import auth, users

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s  %(name)s  %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%S',
)
logger = logging.getLogger('xhunt.auth')

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title='X-Hunt Auth Service',
    version='1.1.0',
    description='Production authentication & user management for X-Hunt',
    docs_url='/docs' if not settings.is_production else None,
    redoc_url='/redoc' if not settings.is_production else None,
)

# ---------------------------------------------------------------------------
# CORS — must come before routers
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ---------------------------------------------------------------------------
# Global exception handler — never leak stack traces to clients
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    logger.exception('Unhandled error on %s %s', request.method, request.url.path)
    return JSONResponse({'detail': 'Internal server error'}, status_code=500)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(users.router)


# ---------------------------------------------------------------------------
# Startup — fail fast if critical config is missing
# ---------------------------------------------------------------------------
@app.on_event('startup')
async def _startup() -> None:
    try:
        settings.validate_required()
        logger.info('X-Hunt Auth Service starting — env=%s', settings.app_env)
    except RuntimeError as exc:
        logger.critical('Startup validation failed: %s', exc)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get('/health', tags=['ops'])
async def health() -> dict:
    return {'status': 'ok', 'env': settings.app_env}
