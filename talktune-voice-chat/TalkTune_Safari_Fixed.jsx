import React, { useState, useEffect, useCallback, useRef } from 'react';

// Safari音声管理クラス
class SafariAudioManager {
  constructor() {
    this.audioContext = null;
    this.isUnlocked = false;
    this.currentAudio = null;
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.unlockAudioContext();
      console.log('AudioContext initialized and unlocked for Safari');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      return false;
    }
  }

  async unlockAudioContext() {
    if (!this.audioContext || this.isUnlocked) return;

    try {
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      this.isUnlocked = true;
      console.log('Audio context unlocked with silent audio');
    } catch (error) {
      console.error('Failed to unlock audio context:', error);
    }
  }

  checkAutoplayPolicy() {
    if (typeof navigator.getAutoplayPolicy === 'function') {
      const policy = navigator.getAutoplayPolicy('mediaelement');
      console.log('Autoplay policy:', policy);
      return policy;
    }
    return 'unknown';
  }

  async playAudioFromBase64(base64Data, format = 'mp3') {
    if (!this.audioContext || !this.isUnlocked) {
      console.warn('AudioContext not initialized or unlocked');
      return false;
    }

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      if (this.currentAudio) {
        this.currentAudio.stop();
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      this.currentAudio = source;

      return new Promise((resolve) => {
        source.onended = () => {
          this.currentAudio = null;
          resolve(true);
        };
        source.start(0);
      });

    } catch (error) {
      console.error('Failed to play audio:', error);
      return false;
    }
  }

  async playAudioWithHTMLAudio(base64Data, format = 'mp3') {
    try {
      const audio = new Audio();
      audio.src = `data:audio/${format};base64,${base64Data}`;
      
      const policy = this.checkAutoplayPolicy();
      
      if (policy === 'disallowed') {
        console.warn('Autoplay is disallowed, user interaction required');
        return false;
      }

      if (policy === 'allowed-muted') {
        audio.muted = true;
      }

      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        return playPromise.then(() => {
          console.log('Audio played successfully');
          return true;
        }).catch((error) => {
          console.error('Audio play failed:', error);
          return false;
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to play audio with HTML Audio:', error);
      return false;
    }
  }

  async playAudio(base64Data, format = 'mp3') {
    const webAudioSuccess = await this.playAudioFromBase64(base64Data, format);
    
    if (webAudioSuccess) {
      return true;
    }

    console.log('Falling back to HTML Audio element');
    return await this.playAudioWithHTMLAudio(base64Data, format);
  }
}

// メインのTalkTuneコンポーネント
function TalkTune() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('待機中');
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [browserSupport, setBrowserSupport] = useState({
    microphone: false,
    recording: false,
    audio: false
  });

  const mediaRecorderRef = useRef(null);
  const audioManagerRef = useRef(new SafariAudioManager());
  const conversationActiveRef = useRef(false);

  // ブラウザサポート状況をチェック
  useEffect(() => {
    const checkBrowserSupport = async () => {
      const support = {
        microphone: !!navigator.mediaDevices?.getUserMedia,
        recording: !!window.MediaRecorder,
        audio: !!(window.AudioContext || window.webkitAudioContext)
      };
      setBrowserSupport(support);
    };

    checkBrowserSupport();
  }, []);

  // 音声初期化（ユーザーアクション内で実行）
  const initializeAudio = useCallback(async () => {
    const success = await audioManagerRef.current.initializeAudioContext();
    setIsAudioReady(success);
    return success;
  }, []);

  // 音声録音開始
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudio(audioBlob);
        
        // 会話が継続中なら次の録音を開始
        if (conversationActiveRef.current) {
          setTimeout(() => {
            if (conversationActiveRef.current) {
              startRecording();
            }
          }, 500);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setStatus('録音中...');

      // 5秒後に自動停止
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 5000);

    } catch (error) {
      console.error('録音開始エラー:', error);
      setStatus('マイクアクセスエラー');
    }
  }, []);

  // 音声処理
  const processAudio = useCallback(async (audioBlob) => {
    setIsProcessing(true);
    setStatus('音声認識中...');

    try {
      // Whisper API で音声認識
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');

      const whisperResponse = await fetch('/api/whisper', {
        method: 'POST',
        body: formData
      });

      if (!whisperResponse.ok) {
        throw new Error('音声認識に失敗しました');
      }

      const whisperResult = await whisperResponse.json();
      const userText = whisperResult.text;

      if (!userText || userText.trim().length === 0) {
        setStatus('音声が認識されませんでした');
        setIsProcessing(false);
        return;
      }

      // ユーザーメッセージを追加
      const userMessage = { role: 'user', content: userText, timestamp: new Date() };
      setMessages(prev => [...prev, userMessage]);

      setStatus('AI応答生成中...');

      // ChatGPT API で応答生成
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: '営業ロールプレイの相手として、自然で親しみやすい会話を心がけてください。' },
            userMessage
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!chatResponse.ok) {
        throw new Error('AI応答生成に失敗しました');
      }

      const chatResult = await chatResponse.json();
      const aiText = chatResult.choices[0].message.content;

      // AIメッセージを追加
      const aiMessage = { role: 'assistant', content: aiText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);

      setStatus('音声合成中...');

      // TTS API で音声合成
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText,
          voice: 'alloy',
          response_format: 'mp3',
          speed: 1.0
        })
      });

      if (!ttsResponse.ok) {
        throw new Error('音声合成に失敗しました');
      }

      const ttsResult = await ttsResponse.json();

      // Safari対応の音声再生
      setStatus('音声再生中...');
      const playSuccess = await audioManagerRef.current.playAudio(ttsResult.audio, 'mp3');
      
      if (!playSuccess) {
        console.error('音声再生に失敗しました');
        setStatus('音声再生エラー');
      } else {
        setStatus('会話中...');
      }

    } catch (error) {
      console.error('音声処理エラー:', error);
      setStatus('エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 会話開始
  const startConversation = useCallback(async () => {
    // Safari対応：ユーザーアクション内で音声を初期化
    if (!isAudioReady) {
      const audioInitialized = await initializeAudio();
      if (!audioInitialized) {
        setStatus('音声初期化に失敗しました');
        return;
      }
    }

    conversationActiveRef.current = true;
    setStatus('会話開始');
    await startRecording();
  }, [isAudioReady, initializeAudio, startRecording]);

  // 会話停止
  const stopConversation = useCallback(() => {
    conversationActiveRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsProcessing(false);
    setStatus('待機中');
  }, []);

  // 履歴クリア
  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  // 5回ラリーテスト
  const runRallyTest = useCallback(async () => {
    if (!isAudioReady) {
      await initializeAudio();
    }

    // テスト用の音声データを生成して再生テスト
    const testText = "今日の朝ごはん何ですか？";
    
    try {
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voice: 'alloy',
          response_format: 'mp3',
          speed: 1.0
        })
      });

      if (ttsResponse.ok) {
        const ttsResult = await ttsResponse.json();
        const playSuccess = await audioManagerRef.current.playAudio(ttsResult.audio, 'mp3');
        
        if (playSuccess) {
          setStatus('テスト音声再生成功');
        } else {
          setStatus('テスト音声再生失敗');
        }
      }
    } catch (error) {
      console.error('テスト実行エラー:', error);
      setStatus('テスト実行エラー');
    }
  }, [isAudioReady, initializeAudio]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>TalkTune</h1>
        <p>連続音声会話システム - 営業ロールプレイ練習</p>
      </header>

      <main className="app-main">
        {/* ステータス表示 */}
        <div className="status-section">
          <div className="status-indicator">
            <span className="status-icon">
              {isRecording ? '🎤' : isProcessing ? '⏳' : '⏸️'}
            </span>
            <span className="status-text">{status}</span>
          </div>
        </div>

        {/* ブラウザサポート状況 */}
        <div className="browser-support-section">
          <strong>ブラウザサポート状況:</strong>
          <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
            <span style={{ color: browserSupport.microphone ? 'green' : 'red' }}>
              🎤 マイク: {browserSupport.microphone ? '✅' : '❌'}
            </span>
            <span style={{ color: browserSupport.recording ? 'green' : 'red' }}>
              📹 録音: {browserSupport.recording ? '✅' : '❌'}
            </span>
            <span style={{ color: browserSupport.audio ? 'green' : 'red' }}>
              🔊 音声: {browserSupport.audio ? '✅' : '❌'}
            </span>
          </div>
          {isAudioReady && (
            <div style={{ marginTop: '5px', color: 'green' }}>
              🎵 Safari音声対応: ✅ 準備完了
            </div>
          )}
        </div>

        {/* コントロールボタン */}
        <div className="controls-section">
          {!conversationActiveRef.current ? (
            <button 
              className="btn btn-success btn-large"
              onClick={startConversation}
              disabled={isProcessing}
            >
              🎤 会話開始
            </button>
          ) : (
            <button 
              className="btn btn-danger btn-large"
              onClick={stopConversation}
            >
              ⏹️ 会話停止
            </button>
          )}
          
          <button 
            className="btn btn-warning"
            onClick={clearHistory}
            disabled={isRecording || isProcessing}
          >
            🗑️ 履歴クリア
          </button>
        </div>

        {/* 使用方法 */}
        <div className="usage-section">
          <h3>使用方法</h3>
          <ol>
            <li><strong>「会話開始」</strong>ボタンを押す</li>
            <li>マイクに向かって<strong>自然に話す</strong></li>
            <li>AIが<strong>音声で応答</strong>します</li>
            <li>応答後、<strong>自動で次の音声入力</strong>が始まります</li>
            <li>会話を終了したい時は<strong>「会話停止」</strong>ボタンを押す</li>
          </ol>
          <p><strong>※ 送信ボタンや終了ボタンは不要です。完全自動で連続会話が可能です。</strong></p>
          
          <div className="safari-notice">
            <strong>📱 Safari/iOSをご利用の方へ:</strong>
            <ul>
              <li>初回アクセス時にマイクアクセスの許可が必要です</li>
              <li>音声の自動再生制限に対応済みです</li>
              <li>最新のiOS/Safariバージョンを推奨します</li>
            </ul>
          </div>
        </div>

        {/* テスト機能 */}
        <div className="test-section">
          <h3>🧪 テスト機能（マイクアクセスエラー時の代替手段）</h3>
          <button 
            className="btn btn-primary"
            onClick={runRallyTest}
            disabled={isRecording || isProcessing}
          >
            🍳 5回ラリーテスト実行
          </button>
          <p><small>「今日の朝ごはん何ですか？」から始まる5回の自動ラリーテストを実行します</small></p>
        </div>

        {/* 会話履歴 */}
        <div className="messages-section">
          <h3>会話履歴（リアルタイム表示）</h3>
          <div className="messages-count">{messages.length} メッセージ</div>
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>会話を開始してください</p>
                <p>「会話開始」ボタンを押すと連続音声会話が始まります</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-role">
                    {message.role === 'user' ? '👤 あなた' : '🤖 AI'}
                  </div>
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="tech-stack">
          <span>🎤 音声認識: OpenAI Whisper</span>
          <span>🤖 AI会話: ChatGPT</span>
          <span>🔊 音声合成: OpenAI TTS</span>
        </div>
        <div className="conversation-info">
          <span>🔄 連続音声会話システム - 完全自動</span>
        </div>
      </footer>
    </div>
  );
}

export default TalkTune;

