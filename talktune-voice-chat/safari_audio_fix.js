// Safari音声自動再生対応の修正コード

class SafariAudioManager {
  constructor() {
    this.audioContext = null;
    this.isUnlocked = false;
    this.pendingAudio = [];
    this.currentAudio = null;
  }

  // ユーザーアクション内でAudioContextを初期化し、無音再生でアンロック
  async initializeAudioContext() {
    try {
      // AudioContextを作成（ユーザーアクション内で実行）
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // 無音再生でアンロック
      await this.unlockAudioContext();
      
      console.log('AudioContext initialized and unlocked for Safari');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      return false;
    }
  }

  // 無音再生によるアンロック処理
  async unlockAudioContext() {
    if (!this.audioContext || this.isUnlocked) return;

    try {
      // 無音のオーディオバッファを作成
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      
      // 無音を再生（これによりアンロック）
      source.start(0);
      
      this.isUnlocked = true;
      console.log('Audio context unlocked with silent audio');
    } catch (error) {
      console.error('Failed to unlock audio context:', error);
    }
  }

  // 自動再生ポリシーをチェック
  checkAutoplayPolicy() {
    if (typeof navigator.getAutoplayPolicy === 'function') {
      const policy = navigator.getAutoplayPolicy('mediaelement');
      console.log('Autoplay policy:', policy);
      return policy;
    }
    return 'unknown';
  }

  // Base64音声データを再生（Safari対応）
  async playAudioFromBase64(base64Data, format = 'mp3') {
    if (!this.audioContext || !this.isUnlocked) {
      console.warn('AudioContext not initialized or unlocked');
      return false;
    }

    try {
      // Base64をArrayBufferに変換
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // AudioBufferにデコード
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // 現在再生中の音声を停止
      if (this.currentAudio) {
        this.currentAudio.stop();
      }

      // AudioBufferSourceを作成して再生
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      this.currentAudio = source;

      // 再生終了時のコールバック
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

  // HTML Audio要素を使った再生（フォールバック）
  async playAudioWithHTMLAudio(base64Data, format = 'mp3') {
    try {
      const audio = new Audio();
      audio.src = `data:audio/${format};base64,${base64Data}`;
      
      // 自動再生ポリシーをチェック
      const policy = this.checkAutoplayPolicy();
      
      if (policy === 'disallowed') {
        console.warn('Autoplay is disallowed, user interaction required');
        return false;
      }

      if (policy === 'allowed-muted') {
        audio.muted = true;
      }

      // 再生を試行
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

  // メイン再生メソッド（Safari対応の優先順位付き）
  async playAudio(base64Data, format = 'mp3') {
    // まずWeb Audio APIを試行
    const webAudioSuccess = await this.playAudioFromBase64(base64Data, format);
    
    if (webAudioSuccess) {
      return true;
    }

    // フォールバックとしてHTML Audio要素を使用
    console.log('Falling back to HTML Audio element');
    return await this.playAudioWithHTMLAudio(base64Data, format);
  }

  // AudioContextの状態を確認
  getAudioContextState() {
    if (!this.audioContext) return 'not-initialized';
    return this.audioContext.state;
  }

  // AudioContextを再開（suspended状態の場合）
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
      }
    }
  }
}

// React Hook for Safari Audio Management
function useSafariAudio() {
  const [audioManager] = useState(() => new SafariAudioManager());
  const [isAudioReady, setIsAudioReady] = useState(false);

  // 初期化関数（ユーザーアクション内で呼び出す）
  const initializeAudio = useCallback(async () => {
    const success = await audioManager.initializeAudioContext();
    setIsAudioReady(success);
    return success;
  }, [audioManager]);

  // 音声再生関数
  const playAudio = useCallback(async (base64Data, format = 'mp3') => {
    if (!isAudioReady) {
      console.warn('Audio not ready, attempting to initialize...');
      const initialized = await initializeAudio();
      if (!initialized) {
        return false;
      }
    }

    return await audioManager.playAudio(base64Data, format);
  }, [audioManager, isAudioReady, initializeAudio]);

  // AudioContextの状態確認
  const getAudioState = useCallback(() => {
    return {
      contextState: audioManager.getAudioContextState(),
      isUnlocked: audioManager.isUnlocked,
      isReady: isAudioReady
    };
  }, [audioManager, isAudioReady]);

  return {
    initializeAudio,
    playAudio,
    getAudioState,
    isAudioReady
  };
}

// 使用例
/*
function VoiceChatComponent() {
  const { initializeAudio, playAudio, isAudioReady } = useSafariAudio();

  const handleStartConversation = async () => {
    // ユーザーアクション内で音声を初期化
    await initializeAudio();
    
    // 会話開始処理...
  };

  const handleTTSResponse = async (base64Audio) => {
    // Safari対応の音声再生
    const success = await playAudio(base64Audio);
    if (!success) {
      console.error('Failed to play TTS audio');
    }
  };

  return (
    <div>
      <button onClick={handleStartConversation}>
        🎤 会話開始
      </button>
      {isAudioReady && <p>音声準備完了</p>}
    </div>
  );
}
*/

export { SafariAudioManager, useSafariAudio };

