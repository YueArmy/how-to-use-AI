# how-to-use-ai

AI活用コラムのWeb版。

## 使い方

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に静的生成
npm run dev:phone  # スマホで確認（下記）
```

### スマホで見た目を確認する（公開前・自分だけ）

PCとスマホを同じWi-Fiにつないだ状態で:

1. PCで `npm run dev:phone` を実行（作り直してから、家のネットワークに向けて表示する）
2. 表示される `Network: http://192.168.x.x:4321/how-to-use-AI/` をスマホのブラウザで開く
3. 止めるときは `Ctrl + C`

- 同じWi-Fiの中からしか開けず、インターネットには公開されない
- 画面の下に「確認用の表示です（計測はしていません）」の帯が出る。本番では出ない
- 記事を書き換えたら、いったん止めてもう一度 `npm run dev:phone`（`npm run dev` は記事のURLを開けないので使わない）

## 構成

- **記事本体** … `public/posts/<slug>/index.html`
  Claude Design で作った standalone 版から、実行時に展開されるHTMLを取り出して静的化したもの。
  デザインは standalone とそのまま同じ。
- **画像** … `public/images/`（standalone に埋め込まれていた base64 を実ファイル化）
- **一覧ページ** … `public/index.html`（現在のホーム）
- `src/styles/global.css` … 一覧ページ用のデザイントークン

## 記事を追加するとき

1. Claude Design で記事を作り、standalone HTML をエクスポート
2. 展開して `public/posts/<slug>/index.html` に置く（手順は下記）
3. `public/index.html` の記事一覧にカードを追加する
4. 記事の `<head>` か、`article.js` の直前に計測用の1行を入れる
   `<script src="../../analytics.js" defer></script>`
5. アンケートを置くなら、下の「記事内アンケート」の3行を入れる
6. main へのPRを出し、公開日時を決めて「予約公開」する（下記）

## 計測

設計：`claude/Web記事_計測設計_v1.md`（How to use AI プロジェクト）

- `public/analytics.js` … 全ページで読み込む共通部品
  - 本番（`yuearmy.github.io`）で開いたときだけ GTM を読み込み、イベントを送る
  - 手元やスマホ確認では何も送らず、ブラウザのコンソールに出すだけ
  - **最初に一度だけ**：ファイル先頭の `GTM_ID` に GTM のコンテナID（`GTM-XXXXXXX`）を入れる。空のあいだは何も送らない
- 送っているイベント

  | イベント | いつ | 中身 |
  |---|---|---|
  | `section_view` | 節が画面に入った（1閲覧1回） | `section_id`, `section_title` |
  | `section_pass` | 節を最後まで読んだ（目次の✓と同じ基準、1閲覧1回） | `section_id`, `section_title` |
  | `section_dwell` | 別の節に移った・ページを離れた | `section_id`（最初の節より前は `intro`）, `seconds` |
  | `article_complete` | 全部の節を読み終えた | `sections` |
  | `article_copy` | 「本文をコピー」が成功した | なし |
  | `data-track` の値 | `data-track` をつけた要素をクリック | `item_id`（`data-track-id` があれば） |
  | `survey_submit` / `survey_choice` / `survey_comment` | アンケート（下記） | 選んだ数・選んだ選択肢・書いたかどうか |

- 掲示板に貼るリンクには、どこから来たか分かるよう印をつける
  `?utm_source=lineworks&utm_medium=board&utm_campaign=column_03`
- 名前・メールアドレス・自由記入の中身は送らない

### 記事内アンケート

`<head>` に2行、置きたい場所に1つ:

```html
<link rel="stylesheet" href="../../survey.css">
<script src="../../survey.js" defer></script>

<aside class="ai-survey" data-survey="column_03"
  data-example-useful="直し方ではなく、意図の形で残す、というところ"
  data-example-more="「パターン別の対応」は、どう書けばいい？"></aside>
```

- 選択肢（いくつでも）は計測イベントとして記録する
- 送ったあとに自由記入欄が出る。自由記入は Google フォームに送り、計測ツールには送らない
  - Google フォームの送り先と entry ID を `data-form-action` / `data-entry-useful` / `data-entry-more`（任意で `data-entry-choices` / `data-entry-survey`）に入れる
  - 送り先が空のあいだ、本番では自由記入欄を出さない
- `<section>` ではなく `<aside>` にする（`<section>` だと記事の節として数えられてしまう）

## 予約公開

`.github/workflows/scheduled-publish.yml`。公開日時までページは存在しない（main に入っていないので）。

1. 記事を別ブランチで作り、main へのPRを出す
2. PRの本文に公開日時を1行書く（日本時間）: `publish-at: 2026-10-13 12:40`
3. 確認が済んだら、PRに `scheduled-publish` ラベルをつける

- 毎週火曜 12:20（日本時間）に起動し、公開日時まで待ってからマージ → 作り直し → 公開
- 火曜以外に出したいときは、Actions タブ → Scheduled publish → Run workflow を公開30分前以降に押す
- ラベルをつけたあとに変更を足したら、いったんラベルを外して確認し直す
- **最初に一度だけ**：リポジトリに `scheduled-publish` ラベルを作る

### standalone HTML の展開について

エクスポートされる standalone は、巨大な base64 を実行時に展開するローダー形式になっている。
そのままでも開けるが、17MB あって画像もフォントも埋め込まれているので、静的化してから置いている。

やっていること:

- ヘッドレスブラウザで開いて、展開後のDOMを取り出す
- 画像（blob）を `public/images/` に実ファイルとして書き出す
- 埋め込みフォント（40MB）を捨てて、Google Fonts のリンクに差し替える
- Claude Design ランタイム依存のスクリプトを、同じ挙動のバニラJSに置き換える
- デスクトップ幅とモバイル幅の両方でDOMを取り、モバイル用のバーとメニューを合流させる
- レスポンシブの切り替えをメディアクエリで再現する

読了トラッキング（%表示・目次のチェック・リセット）は、standalone の
`Component` クラスと同じロジックをバニラJSで書き直したもの。
localStorage のキーは `ai-article-read`。


## 体験版LP

- ホームは `public/index.html`。記事一覧の下に、小さな「関連コンテンツ」欄と「ゴールから考えるAI活用｜LP Version」リンクを掲載しています。
- 体験版は `public/experience/`。公開先は https://yuearmy.github.io/how-to-use-AI/experience/ です。
- `public/home-experience.css` はホームの関連コンテンツ欄専用スタイルです。
- LPのCSS・JavaScript・画像は `public/experience/` 内で完結し、元記事とホームへ相対リンクで戻れます。
- 相談文の作成はブラウザ内で行い、AIへの送信はしません。入力途中の内容は端末のlocalStorageに保存します。
- 会話は約20秒のデモです。スマホサイズの枠内で、各発言の下に成果物を表示します。
- `main` への更新は既存の `.github/workflows/deploy.yml` でGitHub Pagesに公開されます。
