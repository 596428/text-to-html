"""
Chat Routes

Endpoints:
- POST /chat - Send message and get modification response

Dependencies:
- app.models.chat
- app.services (EmbeddingService, ContextBuilder, IntentAnalyzer, ModificationEngine)
- app.routes.session (update_session_activity)
"""

from datetime import datetime
import uuid
import time
import logging

from fastapi import APIRouter, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorCollection

from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ChatResponseType,
    SearchResult,
    DebugInfo,
    ChatMessage,
    ChatMessageRole,
)
from app.models.common import IntentType
from app.services.section_extractor import SectionExtractor, build_context_from_sections
from app.services.intent_analyzer import IntentAnalyzer
from app.services.modification_engine import ModificationEngine
from app.utils.mongodb import get_collection, SESSIONS_COLLECTION, CHAT_HISTORY_COLLECTION
from app.routes.session import update_session_activity
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """
    Process chat message and return modification

    Flow:
    1. Validate session exists
    2. Embed user message
    3. Search for relevant sections
    4. Analyze intent
    5. Generate modification (patch or full)
    6. Update session and history
    7. Return response
    """
    start_time = time.time()

    try:
        # 1. Get session from MongoDB
        session = await _get_session_or_404(request.session_id)
        logger.info(f"Processing message for session: {request.session_id}")

        # 2. Update session activity
        await update_session_activity(request.session_id)

        # 3. Extract relevant sections using rule-based matching (no Vector DB)
        current_html = session.get("current_html", "")
        section_extractor = SectionExtractor()
        extracted_sections = section_extractor.find_relevant_sections(
            html=current_html,
            user_request=request.message,
            max_sections=5
        )
        logger.info(f"Found {len(extracted_sections)} relevant sections (rule-based)")

        # Convert to SearchResult objects for compatibility
        search_result_objects = [
            SearchResult(
                node_id=None,
                section_id=section.section_id,
                selector=None,
                type="section",
                content=section.text_content[:200],
                score=section.score
            )
            for section in extracted_sections
        ]

        # 4. Analyze intent with IntentAnalyzer
        intent_analyzer = IntentAnalyzer()
        analysis = await intent_analyzer.analyze(
            message=request.message,
            search_results=search_result_objects
        )
        logger.info(f"Intent: {analysis.intent}, confidence: {analysis.confidence}")

        # 5. Build context from extracted sections
        html_context, context_size = build_context_from_sections(extracted_sections)

        # Create html_fragments dict for compatibility with modification_engine
        html_fragments = {
            section.section_id: section.html
            for section in extracted_sections
        }
        sections_included = [section.section_id for section in extracted_sections]

        logger.info(f"Context built: {context_size} bytes, {len(sections_included)} sections")

        # 6. Generate modification with ModificationEngine
        modification_engine = ModificationEngine()

        if analysis.intent == IntentType.OFF_TOPIC:
            # HTML과 무관한 요청 - 완곡히 거절
            response = modification_engine.process_off_topic()
            logger.info("Off-topic request detected, returning decline message")
        elif analysis.intent == IntentType.UNCLEAR:
            # 불명확한 요청 - 자세한 설명 요청
            response = modification_engine.process_unclear()
            logger.info("Unclear request detected, asking for clarification")
        elif analysis.intent == IntentType.LOCAL_CHANGE:
            response = await modification_engine.process_local_change(
                message=request.message,
                context=html_fragments,
                analysis=analysis
            )
        elif analysis.intent == IntentType.GLOBAL_CHANGE:
            response = await modification_engine.process_global_change(
                message=request.message,
                full_html=session.get("current_html", ""),
                analysis=analysis
            )
        elif analysis.intent == IntentType.QUERY:
            # HTML 관련 질문
            context_html = "\n".join(html_fragments.values())
            response = await modification_engine.process_query(
                message=request.message,
                context_html=context_html
            )
        else:
            # Fallback - 예상치 못한 intent
            response = modification_engine.process_unclear()
            logger.warning(f"Unexpected intent: {analysis.intent}")

        # Update processing time
        response.processing_time = time.time() - start_time

        # Add debug info if needed
        # Get intent value (handle both enum and string)
        intent_value = analysis.intent.value if hasattr(analysis.intent, 'value') else str(analysis.intent)
        response.debug = _build_debug_info(
            search_results=[
                {"section_id": s.section_id, "content": s.text_content[:100], "score": s.score}
                for s in extracted_sections
            ],
            target_sections=sections_included,
            context_size=context_size,
            intent=intent_value,
            confidence=analysis.confidence,
            reasoning=analysis.reasoning
        )

        # 7. Save to chat history
        await _save_chat_message(
            session_id=request.session_id,
            role=ChatMessageRole.USER,
            content=request.message
        )

        # Get type value (handle both enum and string due to use_enum_values)
        type_value = response.type.value if hasattr(response.type, 'value') else str(response.type)
        await _save_chat_message(
            session_id=request.session_id,
            role=ChatMessageRole.ASSISTANT,
            content=response.message or "",
            analysis=analysis.model_dump(),
            result={
                "type": type_value,
                "patches_count": len(response.patches) if response.patches else 0
            }
        )

        # 8. Update session HTML if full replacement
        if response.type in (ChatResponseType.FULL, "full") and response.html:
            await _update_session_html(request.session_id, response.html)

        logger.info(f"Response generated in {response.processing_time:.2f}s")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


async def _get_session_or_404(session_id: str) -> dict:
    """
    Get session from MongoDB or raise 404

    Args:
        session_id: Session ID

    Returns:
        Session document

    Raises:
        HTTPException: If session not found or expired
    """
    collection: AsyncIOMotorCollection = get_collection(SESSIONS_COLLECTION)

    session = await collection.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    if session.get("expires_at") and session["expires_at"] < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Session {session_id} has expired"
        )

    return session


async def _save_chat_message(
    session_id: str,
    role: ChatMessageRole,
    content: str,
    analysis: dict = None,
    result: dict = None
):
    """
    Save chat message to history

    Args:
        session_id: Session ID
        role: Message role
        content: Message content
        analysis: Optional analysis data
        result: Optional result data
    """
    collection: AsyncIOMotorCollection = get_collection(CHAT_HISTORY_COLLECTION)

    message = ChatMessage(
        message_id=f"msg_{uuid.uuid4().hex[:8]}",
        role=role,
        content=content,
        timestamp=datetime.utcnow(),
        analysis=analysis,
        result=result
    )

    # Upsert chat history document
    await collection.update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": message.model_dump()},
            "$set": {"updated_at": datetime.utcnow()},
            "$setOnInsert": {"created_at": datetime.utcnow()}
        },
        upsert=True
    )


async def _update_session_html(session_id: str, new_html: str):
    """
    Update session's current HTML

    Args:
        session_id: Session ID
        new_html: New HTML content
    """
    collection: AsyncIOMotorCollection = get_collection(SESSIONS_COLLECTION)

    await collection.update_one(
        {"session_id": session_id},
        {"$set": {"current_html": new_html}}
    )


def _build_debug_info(
    search_results: list,
    target_sections: list,
    context_size: int,
    intent: str,
    confidence: float,
    fallback_reason: str = None,
    reasoning: str = None
) -> DebugInfo:
    """
    Build debug information for response

    Args:
        search_results: Vector search results
        target_sections: Target section IDs
        context_size: Context size in bytes
        intent: Detected intent
        confidence: Confidence score
        fallback_reason: Reason for fallback (if any)
        reasoning: LLM's analysis reasoning

    Returns:
        DebugInfo object
    """
    return DebugInfo(
        search_results=[
            SearchResult(
                node_id=r.get("node_id"),
                section_id=r.get("section_id"),
                selector=r.get("selector"),
                type=r.get("type", "text"),
                content=r.get("content", "")[:100],
                score=r.get("score", 0.0)
            )
            for r in search_results[:5]  # Top 5 only
        ],
        target_sections=target_sections,
        context_size=f"{context_size / 1024:.1f}KB",
        intent=intent,
        confidence=confidence,
        fallback_reason=fallback_reason,
        reasoning=reasoning
    )
