# JevSlop

公開されたnote記事のURLからタイトルと本文を抽出し、TypeSafe Jevで文章の特徴を8軸評価するローカルWebアプリです。**AIが書いたかどうかを判定するものではありません。**

## 起動

Node.js 22.12以降（Node.js 22 LTSを推奨）が必要です。

```sh
npm install
cp .env.example .env.local
# .env.local の TYPESAFE_API_KEY を設定
npm run dev
```

[http://127.0.0.1:3000](http://127.0.0.1:3000)を開き、`https://note.com/ユーザー名/n/記事ID` を入力してください。既存の `.env.local` がある場合は上書きせず編集してください。

## 評価と比較

- Jevへ送るstateは **`{ title, body }`のみ**。URL・著者・日時・比較ラベルは送りません。
- 公式SDK `@typesafe-ai/sdk` 0.6.0を使用し、`jev-1.13.0` に8つの独立したScoreを1回の `systemOne` で問い合わせます。自動リトライは無効です。
- APIのScoreと確率は別々に小数2桁へ丸められるため、確率からの再計算とは微差が生じます。生の値を保持し、丸め誤差の範囲を検証します。
- 5段階Scoreの0–4を25倍して正規化。良質さの軸は反転し、固定の重みでSlop Scoreを計算します。式・重み・確率・Confidenceは画面で確認できます。
- 初期画面はJevSlopロゴとURL欄だけです。評価後は「AI Slop / Not AI Slop」を表示し、「詳細を見る」で数値を開きます。丸め前のSlop Score 50以上をAI Slopとする仮の表示基準で、AI執筆を判定するものではありません。
- 記事を続けて評価すると比較表に追加されます。行の選択、ラベル編集、並び替え、個別・一括削除、CSV/JSON出力に対応します。
- 履歴はタブ内のメモリのみです。再読み込みすると消えるため、必要な数値は事前に書き出してください。本文は履歴にも書き出しにも含めません。
- 処理段階、結果の表示、確率分布にアニメーションを使用し、OSの「視差効果を減らす」設定に従います。

## 制約とデータ

無料で全文公開されているテキスト記事が対象です。有料・会員限定・非公開記事には対応しません。本文が100文字未満、HTMLが3 MiB超、noteのHTML構造変更時は明示的にエラーにします。取得は20秒、Jevは60秒でタイムアウトします。

タイトルと本文を評価時にTypeSafeへ送信します。Jevは画像・音声・動画を評価しません。画像中心の記事や埋め込み先の内容は評価に含まれません。日本語の評価精度は英語と同等ではなく、Confidenceは正しさの保証でもありません。

公式上限は1リクエスト64k tokens、state＋最長の質問32k tokensです。全文を送り、サービスが受け付けない場合はエラーとします。本文の切り詰め・分割評価は行いません。

APIキーはサーバーだけで読み取り、ブラウザへ渡しません。ローカルサーバーはloopbackにバインドし、評価APIは外部Originを拒否します。SDKのリクエストログを無効化し、記事本文・評価結果を外部DBやサーバーファイルへ保存しません。

`.env.local`、`.env.*`（`.env.example`を除く）、`.tmp/`、`data/`、テスト生成物はGitの対象外です。キー、取得した記事HTML・本文、実験結果をコミットしないでください。CSV/JSONのダウンロード先やスクリーンショットも公開前に確認してください。

## 検証

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

単体テストは合成HTMLと公式SDKの差し替え可能な通信機能を使い、抽出・1回の8軸呼び出し・正規化・50の区分境界・エラー・CSV出力を検証します。実キーや実記事をテストへ保存しません。E2Eは通常の画面で公開URLを評価し、詳細・比較・書き出しまで確認します。

[`SPEC.md`](SPEC.md)が製品仕様、[`EXPERIMENT.md`](EXPERIMENT.md)が実験手順です。2026-09-18の明示依頼で入力をタイトル＋本文へ変更し、8軸・重みは維持しています。

## 参照

[公式skill](https://github.com/typesafe-ai/skills) / [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) / [Score](https://docs.typesafe.ai/primitives/score) / [モデルと上限](https://docs.typesafe.ai/models)

UIはGoogleの検索画面を参考に、[TypeSafe公式](https://typesafe.ai/)のピンクをアクセントに使用しています。[Impeccable](https://impeccable.style/slop/)のレイアウト・動き・文言の指摘、[Microsoftの文体指針](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice)、[NN/gのマイクロコピー指針](https://www.nngroup.com/articles/3-cs-microcopy/)を確認し、不要な副題や重複説明を省いています。PC・スマホ対応、動きを減らす設定に対応。
