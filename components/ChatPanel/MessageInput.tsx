'use client';

import { useState, KeyboardEvent } from 'react';
import { useStore } from '@/lib/store';
import { PLACEHOLDERS } from '@/lib/constants';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const addMessage = useStore((state) => state.addMessage);
  const isGenerating = useStore((state) => state.isGenerating);
  const setGenerating = useStore((state) => state.setGenerating);

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

    // TODO: P2-A에서 API 연동 시 실제 AI 응답 처리
    // 현재는 임시 응답만 표시
    setGenerating(true);

    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: '이 메시지는 임시 응답입니다. P2-A Gemini API 통합 후 실제 AI 응답으로 대체됩니다.',
        timestamp: new Date(),
      });
      setGenerating(false);
    }, 1000);
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
