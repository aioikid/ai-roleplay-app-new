import React from 'react';

interface RecordButtonProps {
  isListening: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  onToggleListening: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isListening,
  isRecording,
  isProcessing,
  onToggleListening
}) => {
  const getButtonText = () => {
    if (isProcessing) return '処理中...';
    if (isRecording) return '録音中...';
    if (isListening) return '聞き取り中';
    return '録音開始';
  };

  const getButtonColor = () => {
    if (isProcessing) return 'bg-yellow-500 hover:bg-yellow-600';
    if (isRecording) return 'bg-red-500 hover:bg-red-600 animate-pulse';
    if (isListening) return 'bg-green-500 hover:bg-green-600';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  return (
    <button
      onClick={onToggleListening}
      disabled={isProcessing}
      className={`
        px-8 py-4 rounded-full text-white font-semibold text-lg
        transition-all duration-200 transform hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${getButtonColor()}
        shadow-lg hover:shadow-xl
      `}
    >
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isRecording ? 'bg-white animate-pulse' : 
          isListening ? 'bg-white' : 
          'bg-white/80'
        }`} />
        <span>{getButtonText()}</span>
      </div>
    </button>
  );
};

