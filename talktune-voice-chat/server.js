const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// 静的ファイルの配信（React アプリ）
app.use(express.static(path.join(__dirname, 'dist')));

// ファイルアップロード設定
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// OpenAI API設定
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Whisper API エンドポイント
app.post('/api/whisper', upload.single('audio'), async (req, res) => {
  try {
    console.log('Whisper API リクエスト受信');
    
    if (!req.file) {
      return res.status(400).json({ error: '音声ファイルが見つかりません' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API キーが設定されていません' });
    }

    // ファイルをffmpegでMP3に変換
    const inputPath = req.file.path;
    const outputPath = inputPath + '.mp3';
    
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-acodec', 'mp3',
      '-ar', '16000',
      '-ac', '1',
      '-y',
      outputPath
    ]);

    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg failed with code ${code}`));
        }
      });
    });

    // OpenAI Whisper APIに送信（axiosを使用）
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(outputPath), 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ja');

    const response = await axios.post(`${OPENAI_BASE_URL}/audio/transcriptions`, formData, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders()
      }
    });

    const result = response.data;
    console.log('Whisper API 応答:', result);

    // 一時ファイルを削除
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json(result);

  } catch (error) {
    console.error('Whisper API エラー:', error);
    
    // 一時ファイルのクリーンアップ
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (req.file && fs.existsSync(req.file.path + '.mp3')) {
      fs.unlinkSync(req.file.path + '.mp3');
    }

    res.status(500).json({ 
      error: '音声認識に失敗しました',
      details: error.message 
    });
  }
});

// ChatGPT API エンドポイント
app.post('/api/chat', async (req, res) => {
  try {
    console.log('ChatGPT API リクエスト受信');
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API キーが設定されていません' });
    }

    const { model, messages, temperature, max_tokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'メッセージが無効です' });
    }

    const response = await axios.post(`${OPENAI_BASE_URL}/chat/completions`, {
      model: model || 'gpt-4',
      messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 500
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;
    console.log('ChatGPT API 応答:', result);

    res.json(result);

  } catch (error) {
    console.error('ChatGPT API エラー:', error);
    res.status(500).json({ 
      error: 'AI応答の生成に失敗しました',
      details: error.message 
    });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    openai_configured: !!OPENAI_API_KEY
  });
});

// React アプリのルーティング（SPA対応）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 連続音声会話サーバーが起動しました`);
  console.log(`📍 ポート: ${PORT}`);
  console.log(`🔑 OpenAI API: ${OPENAI_API_KEY ? '設定済み' : '未設定'}`);
  console.log(`🌐 アクセス: http://localhost:${PORT}`);
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('未処理の例外:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason);
});


// TTS API エンドポイント（gpt-4o-mini-tts）
app.post('/api/tts', async (req, res) => {
  try {
    console.log('TTS API リクエスト受信');
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API キーが設定されていません' });
    }

    const { text, voice, response_format, speed } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'テキストが指定されていません' });
    }

    const response = await axios.post(`${OPENAI_BASE_URL}/audio/speech`, {
      model: 'tts-1',
      input: text,
      voice: voice || 'alloy',
      response_format: response_format || 'mp3',
      speed: speed || 1.0
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });

    console.log('TTS API 応答受信、サイズ:', response.data.byteLength);

    // 音声データをBase64エンコードして返す
    const audioBase64 = Buffer.from(response.data).toString('base64');
    
    res.json({
      audio: audioBase64,
      format: response_format || 'mp3'
    });

  } catch (error) {
    console.error('TTS API エラー:', error);
    res.status(500).json({ 
      error: '音声合成に失敗しました',
      details: error.message 
    });
  }
});

