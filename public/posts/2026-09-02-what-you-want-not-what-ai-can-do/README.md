# how-to-use-ai

AI活用コラムのWeb版。

## 使い方

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に静的生成
```

## 構成

```
public/posts/<slug>/     記事本体（Claude Design のエクスポートをそのまま置く）
  index.html
  support.js             Claude Design のランタイム
  vendor/                React / ReactDOM / Babel（CDNから落とさないようローカルに同梱）
  images/
src/pages/index.astro    記事一覧（配列で管理）
src/styles/global.css    一覧ページ用のデザイントークン
```

## 記事を追加するとき

1. Claude Design から「HTML Web記事デザイン」形式でエクスポート（`site/` フォルダが入ったzip）
2. `public/posts/<slug>/` に中身を展開
3. `index.html` の `<head>` に `<title>` と `<meta name="description">` を足す
4. `vendor/` を用意して、`support.js` のCDN参照をローカルに書き換える（下記）
5. `src/pages/index.astro` の `posts` 配列に1件足す

### vendor の用意

`support.js` は初期状態だと unpkg から React / ReactDOM / Babel を読み込む。
ネットに出られない環境や、CDN が落ちたときに記事が真っ白になるので、ローカルに同梱している。

```bash
npm i --no-save --prefix /tmp/vend react@18.3.1 react-dom@18.3.1 @babel/standalone@7.29.0
mkdir -p public/posts/<slug>/vendor
cp /tmp/vend/node_modules/react/umd/react.production.min.js          public/posts/<slug>/vendor/
cp /tmp/vend/node_modules/react-dom/umd/react-dom.production.min.js  public/posts/<slug>/vendor/
cp /tmp/vend/node_modules/@babel/standalone/babel.min.js             public/posts/<slug>/vendor/

sed -i \
  -e 's|https://unpkg.com/react@18.3.1/umd/react.production.min.js|./vendor/react.production.min.js|g' \
  -e 's|https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js|./vendor/react-dom.production.min.js|g' \
  -e 's|https://unpkg.com/@babel/standalone@7.29.0/babel.min.js|./vendor/babel.min.js|g' \
  public/posts/<slug>/support.js
```

## 注意

- 記事はクライアントサイドで描画される。JSを切ると本文は出ない
- フォントは Google Fonts から読む。オフラインだと明朝が当たらない（表示自体はされる）
- 読了トラッキングの localStorage キーは `ai-article-read`。記事が増えたら衝突するので、
  2本目を追加するときにキーを記事ごとに分ける必要がある
