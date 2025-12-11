"""
Session Management Routes

Endpoints:
- POST /session/start - Create new session with HTML
- GET /session/{session_id} - Get session status
- DELETE /session/{session_id} - End session and cleanup

Dependencies:
- app.models.session
- app.services (HTMLParser)
- app.utils.mongodb

Note: Vector DB (Pinecone) removed - using rule-based section extraction instead
"""

from datetime import datetime, timedelta
from typing import Optional
import uuid
import logging

from fastapi import APIRouter, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorCollection

from app.models.session import (
    SessionCreate,
    SessionResponse,
    SessionStatus,
    SessionStats,
    SessionDocument,
)
from app.services.html_parser import HTMLParser
from app.utils.mongodb import get_collection, SESSIONS_COLLECTION
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def generate_session_id() -> str:
    """Generate unique session ID"""
    return f"sess_{uuid.uuid4().hex[:12]}"


@router.post("/start", response_model=SessionResponse)
async def start_session(request: SessionCreate):
    """
    Start a new chat session

    1. Parse HTML into AST
    2. Store session in MongoDB
    3. Return session ID and stats

    Note: No vector embeddings - using rule-based section extraction
    """
    try:
        # 1. Generate session ID
        session_id = generate_session_id()
        logger.info(f"Starting new session: {session_id}")

        # 2. Parse HTML with HTMLParser
        parser = HTMLParser(request.html)
        parse_result = parser.parse()
        logger.info(f"Parsed HTML: {parse_result.total_nodes} nodes, {parse_result.total_text_nodes} text nodes, {parse_result.total_sections} sections")

        # 3. Build session stats (no vector count - using rule-based extraction)
        stats = SessionStats(
            node_count=parse_result.total_nodes,
            text_node_count=parse_result.total_text_nodes,
            section_count=parse_result.total_sections,
            vector_count=0,  # No vector DB
            html_size=parse_result.html_size
        )

        # 4. Store session document in MongoDB
        collection: AsyncIOMotorCollection = get_collection(SESSIONS_COLLECTION)

        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=settings.SESSION_TTL_MINUTES)

        session_doc = {
            "session_id": session_id,
            "status": SessionStatus.ACTIVE.value,
            "original_html": request.html,
            "current_html": request.html,
            "stats": stats.model_dump(),
            "ast_nodes": {node.node_id: node.model_dump() for node in parse_result.nodes},
            "section_index": parse_result.section_index,
            "created_at": now,
            "last_active_at": now,
            "expires_at": expires_at
        }

        await collection.insert_one(session_doc)
        logger.info(f"Session {session_id} stored in MongoDB")

        # 5. Return SessionResponse
        return SessionResponse(
            session_id=session_id,
            status=SessionStatus.ACTIVE,
            stats=stats,
            expires_at=expires_at,
            created_at=now,
            last_active_at=now
        )

    except Exception as e:
        logger.error(f"Failed to start session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """
    Get session status and information
    """
    # TODO: Implement in Phase 2
    #
    # Implementation steps:
    # 1. Query MongoDB for session
    # 2. Check if expired
    # 3. Return session info or 404

    collection: AsyncIOMotorCollection = get_collection(SESSIONS_COLLECTION)

    session = await collection.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    # Check expiration
    if session.get("expires_at") and session["expires_at"] < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Session {session_id} has expired"
        )

    return SessionResponse(
        session_id=session["session_id"],
        status=SessionStatus(session.get("status", "active")),
        stats=SessionStats(**session.get("stats", {})) if session.get("stats") else None,
        expires_at=session.get("expires_at"),
        created_at=session.get("created_at"),
        last_active_at=session.get("last_active_at"),
    )


@router.delete("/{session_id}")
async def end_session(session_id: str):
    """
    End session and cleanup resources

    1. Delete session from MongoDB

    Note: No Pinecone cleanup - using rule-based section extraction
    """
    collection: AsyncIOMotorCollection = get_collection(SESSIONS_COLLECTION)

    # Find session
    session = await collection.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    # Delete from MongoDB
    result = await collection.delete_one({"session_id": session_id})
    mongo_deleted = result.deleted_count > 0

    return {
        "success": mongo_deleted,
        "message": "Session terminated",
        "cleanup": {
            "mongo_deleted": mongo_deleted
        }
    }


async def update_session_activity(session_id: str):
    """
    Update session last activity time

    Called by chat endpoints to keep session alive.
    """
    collection: AsyncIOMotorCollection = get_collection(SESSIONS_COLLECTION)

    await collection.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "last_active_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=settings.SESSION_TTL_MINUTES)
            }
        }
    )
