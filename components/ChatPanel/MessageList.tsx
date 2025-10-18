'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import Message from './Message';

export default function MessageList() {
  const chatMessages = useStore((state) => state.chatMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (chatMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-sm">대화를 시작하세요</p>
          <p className="text-xs mt-1">HTML 수정 요청을 입력하면 AI가 응답합니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {chatMessages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
