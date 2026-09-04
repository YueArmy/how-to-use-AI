# how-to-use-ai

AI活用コラムのWeb版。掲示板に投稿した記事を、読みやすい形で置いておくためのリポジトリ。

## 使い方

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ に静的生成
npm run preview  # ビルド結果を確認
```

## 記事の追加

`src/pages/posts/` に `YYYY-MM-DD-slug.md` を置くだけ。frontmatter はこの形。

```yaml
---
layout: ../../layouts/PostLayout.astro
title: "記事タイトル"
titleLines:            # 見出しの改行位置を指定（省略可）
  - "AI活用は"
  - "「何ができるか」ではなく"
  - "「何をしたいか」"
highlightLast: true    # 最終行をアクセント色にする
description: "リード文。一覧にも出る"
date: "2026.09"
minutes: 10
category: "考え方 / 実践メモ"
eyebrow: "AI PRACTICE / NOTES"
---
```

## 仕組み

- `src/styles/global.css` … デザイントークン（色・フォント・余白）。Claude Design で作った standalone 版から抽出
- `src/layouts/PostLayout.astro` … 記事の外枠（見出し・メタ情報・フッター）
- `src/components/ReadingUI.astro` … 上部プログレスバー、右側のセクションナビ、プロセスのチェックリスト

### 読了トラッキング

- `h2` を1セクションとして数える
- スクロールしてセクションを通過すると読了扱いになり、右上のリングが埋まる
- 末尾の「やってみるときのプロセス」はチェックできる
- 記録は localStorage（記事ごと）。右上の ↺ でリセット

## 注意

日本語で `**強調**` を書くとき、閉じる `**` の直後が日本語だと Markdown が太字として解釈しない。
`<strong>〜</strong>` で書くのが確実。
