"""
FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.config import settings
from app.utils.mongodb import MongoDBClient

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Chat Service...")

    # Test MongoDB connection
    if await MongoDBClient.ping():
        logger.info("MongoDB connection successful")
    else:
        logger.warning("MongoDB connection failed - service may not work correctly")

    yield

    # Shutdown
    logger.info("Shutting down Chat Service...")
    await MongoDBClient.close()


# Create FastAPI app
app = FastAPI(
    title="Chat Service",
    description="HTML Modification Chat Backend with Vector Search",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    mongo_ok = await MongoDBClient.ping()

    return {
        "status": "healthy" if mongo_ok else "degraded",
        "services": {
            "mongodb": "ok" if mongo_ok else "error",
        }
    }


# API info endpoint
@app.get("/")
async def root():
    """API information"""
    return {
        "service": "Chat Service",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }


# Import and register routers
from app.routes import session, chat
app.include_router(session.router, prefix="/session", tags=["Session"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
