import { defineConfig } from 'astro/config';

// GitHub Pages（https://<user>.github.io/<repo>/）に置く前提。
// リポジトリ名がURLのサブパスになるので base が必要。
// 独自ドメインに移すときは base を '/' にして site を書き換える。
export default defineConfig({
  site: 'https://YueArmy.github.io',
  base: '/how-to-use-AI',
  trailingSlash: 'always',
  markdown: {
    shikiConfig: { theme: 'github-dark' },
  },
});
