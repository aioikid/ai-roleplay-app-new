# Node.js 20 Alpine ベースイメージ
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# システムパッケージの更新とffmpegのインストール
RUN apk update && apk add --no-cache \
    ffmpeg \
    curl

# package.jsonをコピー
COPY package.json ./

# 依存関係をインストール（package-lock.jsonを無視）
RUN npm install --omit=dev

# アプリケーションのソースコードをコピー
COPY . .

# ポート3000を公開
EXPOSE 3000

# アプリケーションを起動
CMD ["node", "server.js"]

