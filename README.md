# how-to-use-ai

AI活用コラムのWeb版。

## 使い方

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に静的生成
```

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

- ホームは `public/index.html`。記事一覧と別枠で、体験版へのカードを掲載しています。
- 体験版は `public/experience/`。公開先は https://yuearmy.github.io/how-to-use-AI/experience/ です。
- `public/home-experience.css` はホームの体験版カード専用スタイルです。
- LPのCSS・JavaScript・画像は `public/experience/` 内で完結し、元記事とホームへ相対リンクで戻れます。
- 相談文の作成はブラウザ内で行い、AIへの送信はしません。入力途中の内容は端末のlocalStorageに保存します。
- 会話は約20秒のデモです。スマホサイズの枠内で、各発言の下に成果物を表示します。
- `main` への更新は既存の `.github/workflows/deploy.yml` でGitHub Pagesに公開されます。
