"""
Gemini API 키 관리 모듈 (Least Connection + Round Robin)

TypeScript 버전과 동일한 로직:
- 여러 API 키를 로드하여 부하 분산
- Least Connection: 현재 활성 요청이 가장 적은 키 선택
- Round Robin: 동일한 사용량일 경우 순환 선택
"""

import os
from typing import Tuple
import google.generativeai as genai
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class GeminiAPIManager:
    """Gemini API 키 관리자 (Least Connection + Round Robin)"""

    def __init__(self):
        # 환경변수에서 API 키 로드 (최대 10개)
        self.keys = [
            os.getenv('GEMINI_API_KEY_1'),
            os.getenv('GEMINI_API_KEY_2'),
            os.getenv('GEMINI_API_KEY_3'),
            os.getenv('GEMINI_API_KEY_4'),
            os.getenv('GEMINI_API_KEY_5'),
            os.getenv('GEMINI_API_KEY_6'),
            os.getenv('GEMINI_API_KEY_7'),
            os.getenv('GEMINI_API_KEY_8'),
            os.getenv('GEMINI_API_KEY_9'),
            os.getenv('GEMINI_API_KEY_10'),
        ]

        # None 제거 (TypeScript의 filter(Boolean)과 동일)
        self.keys = [k for k in self.keys if k]

        if not self.keys:
            raise ValueError(
                "Gemini API 키가 설정되지 않았습니다. "
                ".env 파일에 GEMINI_API_KEY_1, GEMINI_API_KEY_2 등을 설정하세요."
            )

        # 각 키의 현재 활성 요청 수 추적 (메모리 기반)
        self.key_usage_count = {i: 0 for i in range(len(self.keys))}

        # Round Robin용 마지막 사용 인덱스
        self.last_used_index = 0

        logger.info(f"[Gemini] Initialized with {len(self.keys)} API keys")

    def get_client(self) -> Tuple[genai.GenerativeModel, int, callable]:
        """
        API 클라이언트 가져오기

        Returns:
            Tuple[genai.GenerativeModel, int, callable]:
                - model: Gemini 생성 모델
                - key_number: 사용 중인 키 번호 (1부터 시작)
                - decrement_usage: 요청 완료 시 호출할 함수
        """
        # Least Connection: 가장 적게 사용중인 키들 찾기
        min_usage = min(self.key_usage_count.values())
        candidate_indices = [
            i for i, usage in self.key_usage_count.items()
            if usage == min_usage
        ]

        # Round Robin: 후보가 여러 개면 순환 선택
        selected_index = candidate_indices[self.last_used_index % len(candidate_indices)]
        self.last_used_index += 1

        # 선택된 키의 사용 카운트 증가
        self.key_usage_count[selected_index] = min_usage + 1

        key = self.keys[selected_index]
        key_number = selected_index + 1  # 1부터 시작

        logger.info(
            f"[Gemini] Using API Key #{key_number}/{len(self.keys)} "
            f"(active: {min_usage + 1})"
        )

        # Gemini 모델 생성
        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-2.5-flash')

        # 요청 완료 시 카운트 감소 함수
        def decrement_usage():
            current_count = self.key_usage_count[selected_index]
            self.key_usage_count[selected_index] = max(0, current_count - 1)
            logger.info(
                f"[Gemini] Released API Key #{key_number} "
                f"(active: {max(0, current_count - 1)})"
            )

        return model, key_number, decrement_usage


# 싱글톤 인스턴스
gemini_manager = GeminiAPIManager()
