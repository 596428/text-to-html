"""
Gemini API Key Manager with Load Balancing
Strategy: Least Connection + Round Robin
"""

from typing import List, Optional, Tuple
from dataclasses import dataclass, field
import logging

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class APIKeyInfo:
    """API 키 정보"""
    key: str
    index: int
    active_requests: int = 0
    total_requests: int = 0
    error_count: int = 0


class GeminiKeyManager:
    """
    Gemini API Key Manager

    Load Balancing Strategy:
    1. Least Connection: 현재 활성 요청이 가장 적은 키 선택
    2. Round Robin: 동일한 활성 요청 수일 경우 순차 선택
    """

    _instance: Optional["GeminiKeyManager"] = None
    _keys: List[APIKeyInfo] = field(default_factory=list)
    _round_robin_index: int = 0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_keys()
        return cls._instance

    def _initialize_keys(self):
        """Initialize API keys from settings"""
        self._keys = []
        self._round_robin_index = 0

        # Collect all GEMINI_API_KEY_N from settings
        for i in range(1, 11):  # Support up to 10 keys
            key_attr = f"GEMINI_API_KEY_{i}"
            key_value = getattr(settings, key_attr, None)

            if key_value and key_value.strip():
                self._keys.append(APIKeyInfo(
                    key=key_value.strip(),
                    index=i
                ))

        if not self._keys:
            raise ValueError("No Gemini API keys configured")

        logger.info(f"Initialized {len(self._keys)} Gemini API keys")

    def get_key(self) -> Tuple[str, int]:
        """
        Get the best available API key

        Returns:
            Tuple of (api_key, key_index)
        """
        if not self._keys:
            raise ValueError("No API keys available")

        # Find key with minimum active requests
        min_active = min(k.active_requests for k in self._keys)
        candidates = [k for k in self._keys if k.active_requests == min_active]

        # Round robin among candidates
        if len(candidates) == 1:
            selected = candidates[0]
        else:
            # Select next in round robin order
            selected = None
            for _ in range(len(self._keys)):
                self._round_robin_index = (self._round_robin_index + 1) % len(self._keys)
                if self._keys[self._round_robin_index] in candidates:
                    selected = self._keys[self._round_robin_index]
                    break

            if selected is None:
                selected = candidates[0]

        # Increment active requests
        selected.active_requests += 1
        selected.total_requests += 1

        logger.debug(
            f"Selected key {selected.index} "
            f"(active: {selected.active_requests}, total: {selected.total_requests})"
        )

        return selected.key, selected.index

    def release_key(self, key_index: int, is_error: bool = False):
        """
        Release a key after request completion

        Args:
            key_index: The index of the key to release
            is_error: Whether the request resulted in an error
        """
        for key_info in self._keys:
            if key_info.index == key_index:
                key_info.active_requests = max(0, key_info.active_requests - 1)
                if is_error:
                    key_info.error_count += 1
                break

    def get_stats(self) -> List[dict]:
        """Get statistics for all keys"""
        return [
            {
                "index": k.index,
                "active_requests": k.active_requests,
                "total_requests": k.total_requests,
                "error_count": k.error_count
            }
            for k in self._keys
        ]

    @property
    def key_count(self) -> int:
        """Number of configured keys"""
        return len(self._keys)


# Singleton instance getter
def get_key_manager() -> GeminiKeyManager:
    """Get key manager singleton"""
    return GeminiKeyManager()
