import { ChatMessage } from '@/types';

interface MessageProps {
  message: ChatMessage;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`flex mb-4 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white'
            : isSystem
            ? 'bg-gray-200 text-gray-600 text-sm italic'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {!isUser && !isSystem && (
          <div className="flex items-center mb-1">
            <span className="text-xs font-semibold text-purple-600">🤖 AI Assistant</span>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
