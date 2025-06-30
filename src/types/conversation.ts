export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ConversationState {
  messages: Message[];
  isProcessing: boolean;
}

