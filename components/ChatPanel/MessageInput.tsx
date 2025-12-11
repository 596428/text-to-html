'use client';

import { useState, KeyboardEvent } from 'react';
import { useStore } from '@/lib/store';
import { PLACEHOLDERS } from '@/lib/constants';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const addMessage = useStore((state) => state.addMessage);
  const isGenerating = useStore((state) => state.isGenerating);
  const setGenerating = useStore((state) => state.setGenerating);

  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const addVersion = useStore((state) => state.addVersion);
  const setError = useStore((state) => state.setError);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');

    // 사용자 메시지 추가
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // HTML 수정 요청 처리
    setGenerating(true);
    setError(null);

    try {
      // 현재 HTML 가져오기
      const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

      if (!currentHTML) {
        addMessage({
          role: 'system',
          content: '먼저 레이아웃 에디터에서 HTML을 생성해주세요.',
          timestamp: new Date(),
        });
        setGenerating(false);
        return;
      }

      // API 호출
      const response = await fetch('/api/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHTML, userRequest: userMessage })
      });

      const data = await response.json();

      if (data.error) {
        addMessage({
          role: 'system',
          content: `오류: ${data.error}`,
          timestamp: new Date(),
        });
        setError(data.error);
      } else if (data.noChange) {
        // HTML 수정 외 요청 (질문, 일반 대화 등) - 완곡히 거절
        addMessage({
          role: 'assistant',
          content: data.message || '죄송합니다. 저는 HTML 수정 전용 어시스턴트입니다. "헤더 배경색을 파란색으로 바꿔줘"와 같이 HTML 수정과 관련된 요청을 해주세요.',
          timestamp: new Date(),
        });
      } else {
        // HTML 수정 성공 - 수정 내용 표시
        addMessage({
          role: 'assistant',
          content: `✅ ${data.message || '수정이 완료되었습니다.'} 프리뷰 패널에서 확인하세요!`,
          timestamp: new Date(),
        });

        // 새 버전 추가
        addVersion(data.html, `챗봇 수정: ${userMessage}`);
        setError(null);
      }
    } catch (error) {
      addMessage({
        role: 'system',
        content: '수정 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      });
      setError('수정에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS.CHAT_INPUT}
          disabled={isGenerating}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isGenerating}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              전송중...
            </span>
          ) : (
            '전송'
          )}
        </button>
      </div>
      <div className="text-xs text-gray-400 mt-2">
        💡 Tip: Enter로 전송, Shift+Enter로 줄바꿈
      </div>
    </div>
  );
}
