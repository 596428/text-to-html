from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from dotenv import load_dotenv
from workflows.simple_image_to_html import generate_html_from_image

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image to HTML Generator", version="1.0.0")

# CORS middleware for Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    prompt: str = ""

class HTMLResponse(BaseModel):
    html: str
    success: bool
    message: str = ""

@app.get("/status")
async def status_check():
    """Status check endpoint"""
    logger.info("Status check called")
    return {
        "status": "healthy",
        "service": "image-to-html-generator",
        "version": "1.0.0"
    }

@app.post("/generate", response_model=HTMLResponse)
async def generate_html(request: ImageRequest):
    """
    Generate HTML from image using simple single-shot generation

    Optimized for single image → complete HTML
    Uses Gemini API directly without complex workflow
    """
    logger.info(f"Generate request received - mime_type: {request.mime_type}, prompt length: {len(request.prompt)}")

    try:
        # Simple single-shot generation
        html_output, success, error = await generate_html_from_image(
            request.image_base64,
            request.mime_type,
            request.prompt
        )

        if not success:
            logger.error(f"[Simple Generation] Error: {error}")
            raise HTTPException(status_code=500, detail=error)

        logger.info("[Simple Generation] HTML generation completed successfully")

        return HTMLResponse(
            html=html_output,
            success=True,
            message="HTML generated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in generate_html: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
