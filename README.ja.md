# JevSlop（日本語）

公開note記事をTypeSafe Jevで8つの文章品質軸から評価し、透明性のあるSlop Scoreを表示するOSSです。**AIが書いたかどうかを判定するものではありません。** [English README](README.md)

## 使い方

公開された `https://note.com/<ユーザー名>/n/<記事ID>` を貼り、**分析する**を押します。記事をサーバー側で取得し、タイトルと表示本文を抽出してJevへ送り、固定の8軸を評価します。Slop Scoreの計算はアプリケーションコードが行います。

- 日本語 / English UI。初回はブラウザ言語を参考にし、設定で即時切替できます。
- 8つの独立したJev `Score`、各軸の確率分布・Confidence・処理時間を表示。
- タブ内の比較履歴とCSV/JSON出力。本文とAPIキーは出力しません。
- 本文の省略・無断分割を行わない全文評価。
- キーボード操作、フォーカス、Escapeで閉じる設定ダイアログ、モバイル表示に対応。

`AI Slop` / `Not AI Slop` は文章の特徴を表示するための仮の境界ラベルです。著者が人間かAIかの確率・判定ではありません。

## 自分のAPIキーを使う

画面右上の設定アイコンから、TypeSafe APIキーを入力します。入力欄はpassword形式で、保存済みのキーを再表示しません。既定ではメモリと `sessionStorage` に保持し、タブを閉じると消えます。**このデバイスに保存する**を明示的にオンにした場合だけ `localStorage` にも保存します。

運営者共通キーは使いません。Cloudflare Pagesの環境変数に `TYPESAFE_API_KEY` を設定する必要もありません。

## 通信とプライバシー

```text
ブラウザ -- 同一オリジンのPOST + Authorization --> JevSlop Pages Function
Pages Function -- 公開note HTMLを取得 --> note.com
Pages Function -- ユーザーのキー + タイトル/本文 --> TypeSafe API
```

分析時だけキーを同一オリジンのFunctionへ送り、Functionは固定送信先のTypeSafeへ転送します。キー、本文、結果、リクエスト本文を保存・ログ・分析サービス・URL・エクスポートへ出しません。SDKのログと自動リトライも無効です。Functionはアプリケーションログを出力しませんが、Cloudflareのプラットフォーム標準メタデータはCloudflareのポリシーに従います。

Jevへ渡すstateは `{ title, body }` だけです。URL、著者、日時、比較ラベル、実験グループは含めません。履歴は現在のタブのメモリだけに保持します。

## ローカル起動

Node.js 22.12以降が必要です。

```sh
npm install
npm run dev
```

静的ビルド後、Cloudflare Pages Functions互換のローカルサーバーが `http://localhost:8788` で起動します。APIキーは設定画面へ入力してください。確認コマンドは次のとおりです。

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

## Cloudflare Pages

[TKY-27/JevSlop](https://github.com/TKY-27/JevSlop)をGitHub連携し、次を指定します。

| 設定 | 値 |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Production branch | `main` |
| Build command | `npx next build` |
| Build output directory | `out` |
| Root directory | `/`（リポジトリルート） |
| Environment variables | 不要 |

Next.jsは静的exportで、`functions/` の `/api/evaluate` Pages FunctionがAPIを担当します。Functionディレクトリを削除せず、共通のTypeSafeキーを追加しないでください。DashboardでGitHub連携してDeployすれば公開できます。

## 制約

無料で全文公開されたnote記事だけに対応します。有料・非公開・削除済み・非HTML・大きすぎるページや未対応レイアウトは評価しません。画像・音声・動画・埋め込み先は対象外です。TypeSafeの上限、通信状態、言語ごとの評価差が結果に影響します。Confidenceは正しさの保証ではありません。

## License

MIT。詳細は [LICENSE](LICENSE) を参照してください。
