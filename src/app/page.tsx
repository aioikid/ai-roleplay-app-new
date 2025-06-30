'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTTS } from '@/hooks/useTTS';
import { ChatBubble } from '@/components/ChatBubble';
import { RecordButton } from '@/components/RecordButton';
import { Message } from '@/types/conversation';
import { createAudioFormData } from '@/utils/audioConverter';
import axios from 'axios';

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { speak, isSpeaking, isSupported: ttsSupported } = useTTS({
    lang: 'ja-JP',
    rate: 0.9,
    pitch: 1.0
  });

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleAudioReady = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Step 1: Convert audio to text using Whisper
      const formData = createAudioFormData(audioBlob);
      const whisperResponse = await axios.post('/api/whisper-proxy', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const userText = whisperResponse.data.text;
      if (!userText || userText.trim() === '') {
        console.log('No speech detected');
        setIsProcessing(false);
        return;
      }

      // Add user message to conversation
      const userMessage: Message = {
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };

      setConversation(prev => [...prev, userMessage]);

      // Step 2: Get AI response using ChatGPT
      const chatResponse = await axios.post('/api/chatgpt-reply', {
        conversation: conversation,
        userMessage: userText,
      });

      const aiResponse = chatResponse.data.response;
      
      // Add AI message to conversation
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };

      setConversation(prev => [...prev, aiMessage]);

      // Step 3: Speak the AI response using TTS
      if (ttsSupported) {
        speak(aiResponse);
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      // Add error message to conversation
      const errorMessage: Message = {
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。',
        timestamp: Date.now(),
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [conversation, speak, ttsSupported]);

  const {
    isListening,
    isRecording,
    startListening,
    stopListening
  } = useAudioRecorder({
    onAudioReady: handleAudioReady,
    silenceThreshold: 0.01,
    silenceDuration: 2000
  });

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI営業ロールプレイ
          </h1>
          <p className="text-gray-600 text-lg">
            録音ボタンを押して、AI顧客との会話を始めましょう
          </p>
          {!ttsSupported && (
            <div className="mt-2 text-yellow-600 text-sm">
              ⚠️ お使いのブラウザは音声合成に対応していません
            </div>
          )}
        </div>

        {/* Chat Container */}
        <div 
          ref={chatContainerRef}
          className="bg-white rounded-lg shadow-lg p-6 mb-6 h-96 overflow-y-auto"
        >
          {conversation.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🎤</div>
                <p>録音ボタンを押して会話を開始してください</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conversation.map((message, index) => (
                <ChatBubble key={index} message={message} />
              ))}
              {(isProcessing || isSpeaking) && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>
                        {isSpeaking ? 'AI が話しています...' : 'AI が考えています...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center space-y-4">
          <RecordButton
            isListening={isListening}
            isRecording={isRecording}
            isProcessing={isProcessing || isSpeaking}
            onToggleListening={handleToggleListening}
          />
          
          {conversation.length > 0 && (
            <button
              onClick={clearConversation}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 underline"
            >
              会話をクリア
            </button>
          )}
        </div>

        {/* Status */}
        <div className="text-center mt-6 text-sm text-gray-500">
          {isListening && !isRecording && (
            <p>🎧 音声を聞き取り中... 話しかけてください</p>
          )}
          {isRecording && (
            <p>🔴 録音中... 話し終わったら少し待ってください</p>
          )}
          {isProcessing && (
            <p>⚙️ 音声を処理中... しばらくお待ちください</p>
          )}
          {isSpeaking && (
            <p>🔊 AI が応答しています... 終了後に次の発言をどうぞ</p>
          )}
        </div>
      </div>
    </div>
  );
}

