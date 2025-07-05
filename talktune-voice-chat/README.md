# TalkTune - 連続音声会話システム

## 🎯 概要

TalkTuneは、OpenAI APIを活用したリアルタイム音声会話システムです。ユーザーが音声で話しかけると、AIが音声で応答し、連続的な会話を実現します。

## 🌐 本番環境

- **URL**: https://talktune.biz/
- **SSL**: Let's Encrypt証明書
- **ホスティング**: VPS + Docker + Nginx

## ✨ 主な機能

### 🎤 音声機能
- **音声認識**: OpenAI Whisper API
- **AI応答生成**: ChatGPT API
- **音声合成**: OpenAI TTS API
- **連続会話**: 自動で次の音声入力開始

### 📱 Safari/iOS対応
- **音声自動再生**: Safari制限を回避
- **ハウリング対策**: エコーキャンセレーション
- **レスポンシブ対応**: モバイル最適化

### 🔒 セキュリティ
- **HTTPS**: SSL/TLS暗号化
- **API認証**: OpenAI API Key管理
- **CORS対応**: クロスオリジン制御

## 🛠️ 技術スタック

### フロントエンド
- **HTML5**: セマンティックマークアップ
- **CSS3**: レスポンシブデザイン
- **JavaScript**: ES6+ / Web Audio API
- **React**: コンポーネントベース（Safari修正版）

### バックエンド
- **Node.js**: サーバーサイド実行環境
- **Express**: Webアプリケーションフレームワーク
- **OpenAI API**: 音声認識・生成・TTS

### インフラ
- **Docker**: コンテナ化
- **Nginx**: リバースプロキシ・SSL終端
- **Let's Encrypt**: SSL証明書
- **VPS**: Ubuntu 22.04

## 📁 プロジェクト構成

```
talktune-voice-chat/
├── server.js                    # Node.js サーバー
├── package.json                 # 依存関係
├── Dockerfile                   # Docker設定
├── .env                         # 環境変数
├── dist/                        # ビルド済みファイル
│   ├── index.html              # メインHTML
│   └── assets/                 # CSS/JS アセット
├── safari_audio_fix.js         # Safari音声修正スクリプト
├── TalkTune_Safari_Fixed.jsx   # Safari対応Reactコンポーネント
└── README.md                   # このファイル
```

## 🚀 セットアップ手順

### 1. 環境変数設定

`.env` ファイルを作成：

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=production
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. 開発サーバー起動

```bash
npm start
```

### 4. Docker実行

```bash
# イメージビルド
docker build -t talktune-voice-chat .

# コンテナ起動
docker run -d --name talktune -p 3000:3000 talktune-voice-chat
```

## 🔧 本番環境デプロイ

### VPS + Docker + Nginx構成

1. **Dockerコンテナ起動**
```bash
docker run -d --name continuous-voice-chat -p 3000:3000 continuous-voice-chat-safari-v2
```

2. **Nginx設定** (`/etc/nginx/sites-available/talktune.biz`)
```nginx
server {
    server_name talktune.biz www.talktune.biz;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/talktune.biz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/talktune.biz/privkey.pem;
}
```

3. **SSL証明書取得**
```bash
certbot --nginx -d talktune.biz -d www.talktune.biz
```

## 📱 Safari/iOS対応

### 音声自動再生修正

`safari_audio_fix.js` により以下の問題を解決：

- **ユーザーアクション要求**: 初回クリックでAudioContext初期化
- **音声制限回避**: 無音再生による事前アンロック
- **TTS自動再生**: Web Audio API + HTML Audio フォールバック

### 使用方法

```javascript
// Safari修正スクリプトの読み込み
<script src="/safari_audio_fix.js"></script>

// 音声初期化（ユーザーアクション内で実行）
if (window.safariAudioManager) {
    await window.safariAudioManager.initializeAudio();
}
```

## 🧪 テスト機能

### 5回ラリーテスト

マイクアクセスエラー時の代替テスト機能：

1. 「今日の朝ごはん何ですか？」
2. 「それは美味しそうですね。どこで買ったんですか？」
3. 「なるほど、そのお店は人気なんですね。他におすすめの商品はありますか？」
4. 「価格はどのくらいですか？」
5. 「ありがとうございました。また利用させていただきます。」

## 🔍 トラブルシューティング

### よくある問題

#### 1. マイクアクセスエラー
- **原因**: ブラウザのマイク許可が必要
- **解決**: ブラウザ設定でマイクアクセスを許可

#### 2. 音声が聞こえない（Safari）
- **原因**: Safari音声自動再生制限
- **解決**: Safari修正スクリプトが適用済み

#### 3. ハウリング発生
- **原因**: マイクとスピーカーの音響フィードバック
- **解決**: ヘッドフォン使用またはアプリ化推奨

#### 4. SSL証明書エラー
- **原因**: Let's Encrypt証明書の期限切れ
- **解決**: `certbot renew` で更新

## 📊 API使用量

### OpenAI API
- **Whisper**: 音声認識（$0.006/分）
- **GPT-4**: テキスト生成（$0.03/1Kトークン）
- **TTS**: 音声合成（$0.015/1Kキャラクター）

## 🔮 今後の改善予定

### 短期的改善
- **音量調整機能**: ユーザー側での音量制御
- **ハウリング検出**: 簡易的な検出・警告
- **接続品質表示**: リアルタイム状況通知

### 長期的改善
- **iOSアプリ化**: ネイティブアプリでの品質向上
- **多言語対応**: 英語・中国語等の対応
- **音声品質向上**: より自然な音声合成

## 📞 サポート

### 技術的問題
- **GitHub Issues**: バグ報告・機能要求
- **ドキュメント**: 詳細な技術仕様

### 運用状況
- **稼働監視**: 24時間自動監視
- **SSL更新**: Let's Encrypt自動更新
- **バックアップ**: 定期的なコードバックアップ

---

**開発・運用**: AI Roleplay Team  
**最終更新**: 2025年7月5日  
**バージョン**: v2.0 (Safari対応版)

