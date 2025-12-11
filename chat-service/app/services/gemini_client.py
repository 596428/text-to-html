"""
Gemini API Client

Responsibilities:
- Wrap Google Generative AI SDK
- Handle API key rotation via GeminiKeyManager
- Provide content generation and embedding APIs
- Track token usage

Dependencies:
- google-generativeai
- app.utils.api_key_manager

Implementation Notes:
- Use gemini-2.5-flash for generation
- Use text-embedding-004 for embeddings
- Implement retry with backoff for 429 errors
- Log token usage to MongoDB
"""

from typing import List, Optional, Dict, Any
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import logging
import asyncio

from app.utils.api_key_manager import GeminiKeyManager, get_key_manager
from app.config import settings

logger = logging.getLogger(__name__)

# Safety settings - 낮은 수준으로 설정 (HTML 수정 분석용)
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}


class GeminiClient:
    """
    Gemini API client with load balancing

    Usage:
        client = GeminiClient()
        response = await client.generate_content("Hello!")
        embeddings = await client.embed_texts(["text1", "text2"])
    """

    def __init__(self):
        """Initialize Gemini client"""
        self.key_manager = get_key_manager()
        self.generation_model = "gemini-2.5-flash"
        self.embedding_model = settings.EMBEDDING_MODEL

    async def generate_content(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate content using Gemini

        Args:
            prompt: Input prompt
            temperature: Generation temperature
            max_tokens: Max output tokens

        Returns:
            Dict with text, tokens_used, key_index

        Raises:
            Exception: If generation fails after retries
        """
        # Get API key from key manager
        key, key_idx = self.key_manager.get_key()
        is_error = False

        try:
            # Define async wrapper for retry
            async def _generate():
                # Configure genai with key
                genai.configure(api_key=key)

                # Create model
                model = genai.GenerativeModel(self.generation_model)

                # Create generation config
                config_dict = {
                    "temperature": temperature,
                }
                if max_tokens:
                    config_dict["max_output_tokens"] = max_tokens
                else:
                    config_dict["max_output_tokens"] = 8192

                generation_config = genai.types.GenerationConfig(**config_dict)

                # Generate content (synchronous call)
                response = model.generate_content(
                    prompt,
                    generation_config=generation_config,
                    safety_settings=SAFETY_SETTINGS
                )

                return response

            # Execute with retry logic
            response = await self._retry_with_backoff(_generate)

            # Extract text from response
            result_text = response.text

            # Return response with metadata
            return {
                "text": result_text,
                "tokens_used": 0,  # Gemini SDK doesn't provide token count in response
                "key_index": key_idx
            }

        except Exception as e:
            is_error = True
            logger.error(f"Content generation failed: {e}")
            raise

        finally:
            # Always release key
            self.key_manager.release_key(key_idx, is_error=is_error)

    async def embed_texts(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Generate embeddings for texts

        Args:
            texts: List of texts to embed
            batch_size: Batch size for API calls

        Returns:
            List of embedding vectors
        """
        # TODO: Implement in Phase 2 - Session B
        #
        # Implementation steps:
        # 1. Get API key from key manager
        # 2. Configure genai with key
        # 3. Batch embed texts
        # 4. Release key
        # 5. Return embedding vectors

        raise NotImplementedError("GeminiClient.embed_texts() - To be implemented in Phase 2")

    async def _retry_with_backoff(
        self,
        func,
        max_retries: int = 3,
        initial_delay: float = 1.0
    ) -> Any:
        """
        Retry function with exponential backoff

        Args:
            func: Async function to retry
            max_retries: Maximum retry attempts
            initial_delay: Initial delay in seconds

        Returns:
            Function result

        Raises:
            Exception: Last exception if all retries fail
        """
        delay = initial_delay
        last_exception = None

        for attempt in range(max_retries):
            try:
                return await func()
            except Exception as e:
                last_exception = e
                error_msg = str(e)

                # Check if it's a rate limit error (429)
                if "429" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Rate limit hit (attempt {attempt + 1}/{max_retries}), "
                            f"retrying in {delay}s"
                        )
                        await asyncio.sleep(delay)
                        delay *= 2  # Exponential backoff
                        continue

                # For non-429 errors, raise immediately
                raise

        # All retries exhausted
        logger.error(f"All {max_retries} retries exhausted")
        raise last_exception

    def _configure_api(self, api_key: str):
        """
        Configure genai with API key

        Args:
            api_key: Gemini API key
        """
        genai.configure(api_key=api_key)

    def _create_generation_config(
        self,
        temperature: float,
        max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """
        Create generation configuration

        Args:
            temperature: Temperature value
            max_tokens: Max tokens

        Returns:
            Config dict
        """
        config = {
            "temperature": temperature,
        }
        if max_tokens:
            config["max_output_tokens"] = max_tokens
        return config
