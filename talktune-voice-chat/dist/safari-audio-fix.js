// Safari音声自動再生対応の改良版修正スクリプト v2
(function() {
    console.log("Safari音声自動再生修正スクリプト v2 を読み込み中...");
    
    // Safari音声管理クラス
    class SafariAudioManager {
        constructor() {
            this.audioContext = null;
            this.isUnlocked = false;
            this.currentAudio = null;
            this.isInitialized = false;
            this.pendingAudio = [];
        }

        async initializeAudioContext() {
            if (this.isInitialized) return true;
            
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext created:", this.audioContext.state);
                
                // 無音再生でアンロック
                await this.unlockAudioContext();
                this.isInitialized = true;
                console.log("Safari音声管理初期化完了");
                return true;
            } catch (error) {
                console.error("AudioContext初期化エラー:", error);
                return false;
            }
        }

        async unlockAudioContext() {
            if (this.isUnlocked) return;
            
            try {
                // Web Audio APIでの無音再生
                if (this.audioContext && this.audioContext.state === "suspended") {
                    await this.audioContext.resume();
                }
                
                // HTML Audioでの無音再生
                const silentAudio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT");
                silentAudio.volume = 0.01;
                await silentAudio.play();
                
                this.isUnlocked = true;
                console.log("Safari音声アンロック完了");
            } catch (error) {
                console.warn("音声アンロック警告:", error);
            }
        }

        async playAudioFromBase64(base64Data) {
            try {
                console.log("Safari音声再生開始:", base64Data.substring(0, 50) + "...");
                
                // AudioContextが初期化されていない場合は初期化
                if (!this.isInitialized) {
                    await this.initializeAudioContext();
                }
                
                // Base64データをBlobに変換
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: "audio/mpeg" });
                const audioUrl = URL.createObjectURL(blob);
                
                // HTML Audioで再生
                const audio = new Audio(audioUrl);
                audio.volume = 1.0;
                
                // 再生完了後にURLを解放
                audio.addEventListener("ended", () => {
                    URL.revokeObjectURL(audioUrl);
                    console.log("Safari音声再生完了");
                });
                
                // 再生開始
                await audio.play();
                this.currentAudio = audio;
                
                return true;
            } catch (error) {
                console.error("Safari音声再生エラー:", error);
                return false;
            }
        }
    }

    // グローバルインスタンス作成
    window.safariAudioManager = new SafariAudioManager();
    console.log("Safari音声管理インスタンス作成完了");

    // TTS APIレスポンスをインターセプト
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        // TTS APIのレスポンスを検出
        if (args[0] && args[0].includes && args[0].includes("/tts")) {
            console.log("TTS APIレスポンス検出");
            
            // レスポンスをクローンして処理
            const clonedResponse = response.clone();
            try {
                const data = await clonedResponse.json();
                if (data.audio) {
                    console.log("TTS音声データ検出、Safari音声再生開始");
                    await window.safariAudioManager.playAudioFromBase64(data.audio);
                }
            } catch (error) {
                console.warn("TTS音声データ処理警告:", error);
            }
        }
        
        return response;
    };

    // ボタンクリックイベントで音声初期化
    function initializeOnUserAction() {
        console.log("ユーザーアクション検出、Safari音声初期化");
        window.safariAudioManager.initializeAudioContext();
    }

    // DOMContentLoaded後にイベントリスナーを設定
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupEventListeners);
    } else {
        setupEventListeners();
    }

    function setupEventListeners() {
        // 会話開始ボタン
        const startButton = document.querySelector("button");
        if (startButton) {
            startButton.addEventListener("click", initializeOnUserAction);
            console.log("会話開始ボタンにイベントリスナー設定");
        }

        // 5回ラリーテストボタン
        setTimeout(() => {
            const testButton = document.querySelector("button[onclick*=\"ラリー\"], button:contains(\"ラリー\")");
            if (testButton) {
                testButton.addEventListener("click", initializeOnUserAction);
                console.log("5回ラリーテストボタンにイベントリスナー設定");
            }
        }, 1000);

        // 全てのボタンに対してイベントリスナーを設定
        document.addEventListener("click", function(event) {
            if (event.target.tagName === "BUTTON") {
                initializeOnUserAction();
            }
        });
    }

    console.log("Safari音声自動再生修正スクリプト v2 読み込み完了");
})();
