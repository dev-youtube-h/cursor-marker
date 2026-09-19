# cursor-marker

マウスカーソルにマーカーを追従させるデスクトップアプリです (Electron + React + TypeScript)。

## できること

- 画面全体を覆う透明・クリックスルーのオーバーレイに、カーソル追従のマーカーを描画
- ごく小さなコントロールバー: ON/OFF・設定・最小化・終了
- 設定: マーカーのサイズ / 色 / クリック時に光るかどうか (設定は自動保存)

## 構成

| ファイル                      | 役割                                           |
| ----------------------------- | ---------------------------------------------- |
| `src/main/index.ts`           | ウィンドウ生成、IPC、ON/OFF の制御             |
| `src/main/overlay.ts`         | 全ディスプレイを覆う透明オーバーレイウィンドウ |
| `src/main/tracker.ts`         | カーソル位置の取得とグローバルクリックの検知   |
| `src/main/settings.ts`        | 設定の読み書き (userData/marker-settings.json) |
| `src/renderer/src/overlay.ts` | マーカーの描画ループ (React を使わない素の TS) |
| `src/renderer/src/App.tsx`    | コントロールバーと設定パネル                   |
| `src/shared/global.d.ts`      | 3 プロセス共通の型定義                         |

## 滑らかに動かすための工夫

- ウィンドウは動かさず、オーバーレイ内のマーカーを `translate3d` だけで動かす (GPU 合成のみでレイアウト・ペイントを起こさない)
- メインプロセスは 8ms 間隔でカーソル位置を送るだけ。描画側は `requestAnimationFrame` で
  **速度からの先読み + 指数平滑** を行い、IPC のゆらぎを描画から切り離している
- フレーム間隔に依存しない平滑化なので、コマ落ちしても追従の速さが変わらない
- `backgroundThrottling: false` と各種スロットリング無効化スイッチで、非フォーカス時も描画を止めない

## クリック検知について

グローバルなクリック検知にはネイティブフック (`uiohook-napi`) を使います。
読み込めない環境では位置の追従だけが動き、設定画面で「クリック時に光る」が無効になります。

カーソル位置は通常 `screen.getCursorScreenPoint()` のポーリングで取得しますが、
これが更新されない環境 (WSLg など) では、自動的にネイティブフックの座標へ切り替わります
(この場合はフックが動いている必要があるので「クリック時に光る」を ON にしてください)。

## プライバシーと配布について

- **ネットワーク通信は一切行いません。** 収集・送信するデータはありません
- 設定は端末内 (`%APPDATA%/cursor-marker/marker-settings.json`) にのみ保存されます
- クリックを検知するために OS 全体の入力フック (libuiohook) を使います。
  マウスのボタン押下と移動だけを読み取り、キー入力は一切扱いません。
  フックは **「マーカー ON」かつ「クリック時に光る ON」のときだけ** 起動し、
  どちらかを OFF にすると停止します
- 配布している exe はコード署名していないため、初回起動時に Windows SmartScreen の
  警告が出ます。「詳細情報」→「実行」で起動できます。
  入力フックを使う都合上、セキュリティソフトが警告を出す場合もあります

## セットアップ

```bash
$ npm install
```

### 開発

```bash
$ npm run dev
```

### ビルド (Windows のみ)

```bash
# dist/ にインストーラー版と portable 版を出力
$ npm run build:win
```

- `cursor-marker-<version>-setup.exe` … インストーラー版 (NSIS)
- `cursor-marker-<version>-portable.exe` … インストール不要の単体 exe

Windows 向けのビルドには Windows 環境が必要です。
リポジトリに `v*` のタグを push すると GitHub Actions (windows-latest) が
両方をビルドして GitHub Releases に公開します。

```bash
$ npm version patch   # package.json の version を上げる
$ git push --follow-tags
```

### ネイティブモジュールについて

`uiohook-napi` は N-API のプリビルドをそのまま利用できるため、
`electron-builder install-app-deps` によるリビルドは行っていません
(`npmRebuild: false` / postinstall なし)。
ソースからのビルドが必要なネイティブモジュールを追加する場合は、
`postinstall: electron-builder install-app-deps` を戻してください。
