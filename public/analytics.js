/*
 * 計測の共通部品（全ページで読み込む）
 *
 * - 本番（yuearmy.github.io）で開いたときだけ GTM を読み込む
 * - 手元の確認（localhost や家のWi-Fiの IP アドレス）では GTM を読み込まず、
 *   画面上部に「確認用」の帯を出す。記録したいイベントはコンソールにだけ出す
 * - 個人を特定できる情報は送らない（自由記入は送らない）
 *
 * 設計：claude/Web記事_計測設計_v1.md（How to use AI プロジェクト）
 */
(() => {
  'use strict';

  // GTM のコンテナID（例：'GTM-ABC1234'）。空のあいだは何も送らない。
  const GTM_ID = '';

  const PRODUCTION_HOSTS = ['yuearmy.github.io'];
  const isProduction = PRODUCTION_HOSTS.includes(location.hostname);

  window.dataLayer = window.dataLayer || [];

  /**
   * イベントを記録する。
   * @param {string} name   イベント名（例：'section_view'）
   * @param {object} params 値（例：{ section_id: 's1' }）
   */
  function track(name, params = {}) {
    const payload = Object.assign({ event: name, page_path: location.pathname }, params);
    if (isProduction) {
      window.dataLayer.push(payload);
    } else {
      // 確認用：送らずにコンソールにだけ出す
      console.debug('[計測・確認用（送信しません）]', payload);
    }
  }
  window.aiTrack = track;

  if (isProduction && GTM_ID) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(script);
  }

  // 確認用の帯
  if (!isProduction) {
    const showBanner = () => {
      if (document.querySelector('.preview-banner')) return;
      const banner = document.createElement('div');
      banner.className = 'preview-banner';
      banner.setAttribute('role', 'note');
      banner.textContent = '確認用の表示です（計測はしていません）';
      Object.assign(banner.style, {
        position: 'fixed', left: '0', right: '0', bottom: '0', zIndex: '9999',
        padding: '6px 12px', font: '600 12px/1.4 system-ui, sans-serif',
        textAlign: 'center', color: '#fff', background: 'rgba(180, 60, 40, .92)',
        pointerEvents: 'none',
      });
      document.body.appendChild(banner);
    };
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner, { once: true });
  }

  // data-track をつけた要素のクリックを記録する
  // 例：<button data-track="prompt_copy" data-track-id="s2-prompt">コピー</button>
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-track]');
    if (!el) return;
    track(el.dataset.track, el.dataset.trackId ? { item_id: el.dataset.trackId } : {});
  });
})();
