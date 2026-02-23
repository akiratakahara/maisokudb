# マイソクDB — 仕様書

## 概要
マイソク（物件概要書）PDFを読み込み、AIで物件情報を自動抽出してデータベース化するiOS/Androidアプリ。

## 技術スタック
- **フロントエンド**: Expo React Native (SDK 54) + Expo Router
- **バックエンド**: Next.js 14 (App Router) + Prisma + PostgreSQL
- **AI**: Anthropic Claude API（PDF解析・情報抽出・メール生成）
- **言語**: TypeScript
- **UI**: 全て日本語

## デザイン
- ダークテーマ: 背景 `#0A0A09`, アクセント `#E8443A`, テキスト `#F5F0E8`
- モダンでクリーンなUI
- 角丸カード、適切な余白

## 画面構成（モバイル）

### 1. ホーム / 物件リスト（タブ: 物件一覧）
- 物件カード一覧（物件名、価格、間取り、面積、最寄駅）
- 検索バー（物件名、住所、価格帯で検索）
- フィルタ（価格帯、間取り、面積、築年数）
- ソート（価格順、面積順、築年数順、登録日順）

### 2. PDF読み込み（タブ: 読み込み）
- 「PDFを選択」ボタン（DocumentPicker）
- 読み込み中のプログレス表示
- AI抽出結果のプレビュー（編集可能）
- 「保存」ボタンでDB登録

### 3. 物件詳細
- 全抽出項目の表示
- 編集機能
- 「紹介メール生成」ボタン → AIがメール文面を自動生成
- 「比較に追加」ボタン
- 元のPDFプレビュー

### 4. マトリクス比較（タブ: 比較）
- X軸・Y軸の項目を自由に選択（ドロップダウン）
  - 選択肢: 価格、面積、㎡単価、築年数、駅距離、管理費、階数
- 散布図（各物件をドットで表示）
- ドットタップで物件詳細ポップアップ
- 比較テーブル表示（選択した物件を横並び）

### 5. 設定（タブ: 設定）
- アカウント情報
- AI利用回数表示
- プラン表示（Free/Pro）
- ログアウト

## AI抽出項目
- 物件名
- 所在地
- 最寄駅・徒歩分数
- 価格（売買価格 or 賃料）
- 管理費・修繕積立金
- 敷金・礼金
- 間取り（1K, 2LDK等）
- 専有面積（㎡）
- バルコニー面積
- 築年月
- 構造（RC, SRC, 木造等）
- 階数（建物/所在階）
- 設備（エアコン、オートロック、宅配BOX等 → JSON配列）
- 取引態様
- 管理会社・連絡先
- 備考

## API エンドポイント

### 認証
- POST /api/auth/register — 新規登録
- POST /api/auth/login — ログイン

### 物件
- GET /api/properties — 物件一覧（検索・フィルタ・ソート対応）
- GET /api/properties/:id — 物件詳細
- POST /api/properties — 物件登録
- PUT /api/properties/:id — 物件更新
- DELETE /api/properties/:id — 物件削除

### AI
- POST /api/ai/extract — PDFからAI抽出（PDF送信 → 抽出結果JSON返却）
- POST /api/ai/email — 紹介メール文生成（物件IDを送信）

### ヘルスチェック
- GET /api/health

## Prismaスキーマ

### User
- id, email, password, name, plan(free/pro), aiUsageCount, createdAt, updatedAt

### Property
- id, userId
- name, address, nearestStation, walkMinutes
- price, managementFee, repairReserve, deposit, keyMoney
- layout, area, balconyArea
- builtDate, structure, floors, floor
- equipment (Json)
- transactionType, managementCompany, contactInfo
- notes
- pdfUrl (元PDFの保存パス)
- createdAt, updatedAt

## 料金プラン
- Free: 月10回AI抽出 / 50物件保存
- Pro ¥1,480/月: 無制限

## セットアップ
- モバイル: `mobile/` ディレクトリ（Expo）
- バックエンド: `backend/` ディレクトリ（Next.js）
- package.jsonはそれぞれに作成
- Prisma schemaは `backend/prisma/schema.prisma`
- binaryTargets = ["native", "linux-musl-openssl-3.0.x"]

## 重要
- エラーメッセージは全て日本語
- UIテキストは全て日本語
- ダミーデータ5件を含むseedスクリプト作成
- expo-document-pickerでPDF選択
- PDFはbase64エンコードしてAPIに送信
- マトリクス図はreact-native-chart-kitまたはvictory-nativeで実装
