'use client';

import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatPanel() {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">AI 챗봇</h2>
            <p className="text-xs text-gray-500">HTML 수정 요청을 입력하세요</p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <MessageList />

      {/* Message Input */}
      <MessageInput />
    </div>
  );
}
