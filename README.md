# AI Roleplay App - 音声対話システム

## 🎯 プロジェクト概要

このリポジトリは、AI技術を活用した音声対話システムの開発プロジェクトです。

## 📁 プロジェクト構成

### 🎤 TalkTune - 連続音声会話システム

**ディレクトリ**: `talktune-voice-chat/`

OpenAI APIを活用したリアルタイム音声会話システム。ユーザーが音声で話しかけると、AIが音声で応答し、連続的な会話を実現します。

#### 主な機能
- **音声認識**: OpenAI Whisper API
- **AI応答生成**: ChatGPT API  
- **音声合成**: OpenAI TTS API
- **Safari/iOS対応**: 音声自動再生制限を回避
- **SSL対応**: HTTPS暗号化通信

#### 本番環境
- **URL**: https://talktune.biz/
- **技術スタック**: Node.js + Docker + Nginx + Let's Encrypt

詳細は [`talktune-voice-chat/README.md`](./talktune-voice-chat/README.md) をご覧ください。

### 🚀 Next.js アプリケーション

**ディレクトリ**: `src/`, `public/`, etc.

Next.jsベースのWebアプリケーション開発環境。

#### セットアップ

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## 🛠️ 開発環境

### 必要な環境
- **Node.js**: 18.0以上
- **npm/yarn/pnpm**: パッケージマネージャー
- **Docker**: コンテナ実行環境（TalkTune用）

### 環境変数設定

各プロジェクトで `.env.example` を `.env` にコピーして設定：

```bash
# TalkTune用
cp talktune-voice-chat/.env.example talktune-voice-chat/.env
```

## 🚀 デプロイ

### TalkTune（本番環境）
- **VPS**: Ubuntu 22.04 + Docker + Nginx
- **SSL**: Let's Encrypt自動更新
- **監視**: 24時間稼働監視

### Next.js アプリ
- **Vercel**: 推奨デプロイ先
- **その他**: Netlify, AWS, GCP等

詳細なデプロイ手順は各プロジェクトのREADMEを参照してください。

## 📚 技術スタック

### フロントエンド
- **Next.js**: React フレームワーク
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS

### バックエンド
- **Node.js**: サーバーサイド実行環境
- **Express**: Webアプリケーションフレームワーク
- **OpenAI API**: AI機能統合

### インフラ
- **Docker**: コンテナ化
- **Nginx**: リバースプロキシ
- **Let's Encrypt**: SSL証明書

## 🔧 開発ガイドライン

### コミット規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### ブランチ戦略
- **main**: 本番環境用
- **develop**: 開発環境用
- **feature/***: 機能開発用
- **hotfix/***: 緊急修正用

## 📞 サポート

### 技術的問題
- **Issues**: GitHub Issues でバグ報告・機能要求
- **Discussions**: 技術的な質問・議論

### プロジェクト管理
- **Projects**: GitHub Projects でタスク管理
- **Wiki**: 詳細な技術仕様書

## 📊 プロジェクト状況

### TalkTune
- **状況**: 本番稼働中 ✅
- **URL**: https://talktune.biz/
- **最終更新**: 2025年7月5日

### Next.js App
- **状況**: 開発中 🚧
- **環境**: 開発環境構築済み

## 🔮 今後の予定

### 短期的目標
- **TalkTune**: 音質改善・ハウリング対策
- **Next.js**: 基本機能実装

### 長期的目標
- **モバイルアプリ**: iOS/Android ネイティブアプリ
- **多言語対応**: 英語・中国語等
- **AI機能拡張**: より高度な対話機能

---

**開発チーム**: AI Roleplay Team  
**最終更新**: 2025年7月5日  
**ライセンス**: MIT License

