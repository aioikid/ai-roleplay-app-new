import React from 'react';
import { Message } from '@/types/conversation';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  if (isSystem) {
    return null; // Don't display system messages
  }
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <div className="text-sm font-medium mb-1">
          {isUser ? 'あなた' : 'AI顧客'}
        </div>
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
        </div>
        {message.timestamp && (
          <div className="text-xs opacity-70 mt-1">
            {new Date(message.timestamp).toLocaleTimeString('ja-JP')}
          </div>
        )}
      </div>
    </div>
  );
};

