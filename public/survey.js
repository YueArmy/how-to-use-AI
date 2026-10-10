/*
 * 記事内アンケート（共通部品）
 *
 * 記事のHTMLに、置きたい場所へ次の1行を入れるだけで表示される。
 *
 *   <aside class="ai-survey" data-survey="column_03"
 *     data-example-useful="直し方ではなく、意図の形で残す、というところ"
 *     data-example-more="「パターン別の対応」は、どう書けばいい？"></aside>
 *
 * 自由記入の送り先（Google フォーム）を使うときは、次の属性も足す。
 *   data-form-action   … フォームの送信先（https://docs.google.com/forms/d/e/〜/formResponse）
 *   data-entry-useful  … 「役に立ったところ」の entry ID（例：entry.123456）
 *   data-entry-more    … 「もう少し説明がほしかったところ」の entry ID
 *   data-entry-choices … 選んだ選択肢を入れる欄の entry ID（任意）
 *   data-entry-survey  … どの回のアンケートかを入れる欄の entry ID（任意）
 *
 * - 選択肢は計測ツールにイベントとして記録する（survey_submit / survey_choice）
 * - 自由記入は計測ツールには送らない（名前などが書かれる可能性があるため）
 *
 * 設計：claude/Web記事_計測設計_v1.md §4
 */
(() => {
  'use strict';

  const CHOICES = [
    { id: 'tried', label: 'もう試してみた' },
    { id: 'will_try', label: '試してみようと思う' },
    { id: 'useful', label: '考え方として参考になった' },
    { id: 'more_info', label: 'もう少し説明がほしい部分がある' },
    { id: 'no_fit', label: '自分には使いどころがなさそう' },
  ];
  const ANONYMOUS_NOTE = '回答は匿名です。名前やメールアドレスは記録されません。';
  const isProduction = location.hostname === 'yuearmy.github.io';

  const track = (name, params) => { if (typeof window.aiTrack === 'function') window.aiTrack(name, params); };
  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  };

  function sendFreeText(root, values) {
    const action = root.dataset.formAction;
    const form = el('form', { action, method: 'POST', target: `${root.id}-sink`, hidden: '' });
    Object.entries(values).forEach(([name, value]) => {
      if (!name || !value) return;
      const input = el('input', { type: 'hidden', name });
      input.value = value;
      form.appendChild(input);
    });
    root.appendChild(form);
    form.submit();
    form.remove();
  }

  function renderThanks(root, chosen) {
    root.replaceChildren();
    root.appendChild(el('p', { className: 'ai-survey-title', tabindex: '-1' }, 'ありがとうございます！'));
    root.appendChild(el('p', { className: 'ai-survey-lead' },
      'うまくいかなかったことや、もう少し説明がほしかったところは、私が実際にやってみます。そのまま次の投稿のテーマになるかもしれません。役に立ったところは、もう一段詳しく掘り下げるヒントにさせてもらいます。'));

    const canSend = Boolean(root.dataset.formAction && (root.dataset.entryUseful || root.dataset.entryMore));
    if (!canSend && isProduction) return; // 送り先が未設定なら、本番では自由記入を出さない

    const form = el('form', { className: 'ai-survey-form' });
    const fields = [
      { key: 'more', label: 'もう少し説明がほしかったところ、うまくいかなかったこと', example: root.dataset.exampleMore },
      { key: 'useful', label: '役に立ったところ', example: root.dataset.exampleUseful },
    ];
    // 「もう少し説明がほしい」を選んだ人には、その欄を先に出す
    if (!chosen.includes('more_info')) fields.reverse();
    fields.forEach(field => {
      const id = `${root.id}-${field.key}`;
      const wrap = el('div', { className: 'ai-survey-field' });
      wrap.appendChild(el('label', { for: id }, field.label));
      const textarea = el('textarea', { id, name: field.key, rows: '3' });
      if (field.example) textarea.placeholder = `例）${field.example}`;
      wrap.appendChild(textarea);
      form.appendChild(wrap);
    });
    const submit = el('button', { type: 'submit', className: 'ai-survey-submit' }, '書いて送る');
    form.appendChild(submit);
    form.appendChild(el('p', { className: 'ai-survey-note' }, ANONYMOUS_NOTE));
    if (!canSend) {
      form.appendChild(el('p', { className: 'ai-survey-note ai-survey-dev' }, '確認用：自由記入の送り先がまだ設定されていません（本番ではこの欄は表示されません）'));
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const useful = form.elements.useful.value.trim();
      const more = form.elements.more.value.trim();
      if (!useful && !more) return;
      if (canSend) {
        sendFreeText(root, {
          [root.dataset.entryUseful]: useful,
          [root.dataset.entryMore]: more,
          [root.dataset.entryChoices]: chosen.map(id => CHOICES.find(c => c.id === id)?.label).join(' / '),
          [root.dataset.entrySurvey]: root.dataset.survey,
        });
      }
      // 自由記入の中身は計測ツールに送らない。「書いた」ことだけを記録する
      track('survey_comment', { survey_id: root.dataset.survey });
      form.replaceWith(el('p', { className: 'ai-survey-lead' }, '受け取りました。ありがとうございます！'));
    });
    root.appendChild(form);
    const sink = el('iframe', { name: `${root.id}-sink`, title: '送信用', hidden: '' });
    root.appendChild(sink);
  }

  function render(root, index) {
    root.id = root.id || `ai-survey-${index}`;
    root.setAttribute('aria-labelledby', `${root.id}-title`);
    root.appendChild(el('p', { className: 'ai-survey-title', id: `${root.id}-title` }, 'ここまで読んでくださって、ありがとうございます。'));
    [
      '正直に言うと、どこかでつまずいて諦めていないか、この手順が皆さんの仕事で本当に使いやすいか、少し不安に思っています。',
      '試してうまくいかなかったことや、「ここ、どうするの？」と思ったところは、私が実際にやってみます。その疑問が、次の投稿のテーマになるかもしれません。',
      'よければ、教えてください。当てはまるものを選んで（いくつでも）、「送る」を押すだけです。15秒ほどで終わります。',
    ].forEach(text => root.appendChild(el('p', { className: 'ai-survey-lead' }, text)));

    const form = el('form', { className: 'ai-survey-form' });
    const fieldset = el('fieldset');
    fieldset.appendChild(el('legend', { className: 'sr-only' }, 'この記事、どうでしたか？（いくつでも）'));
    CHOICES.forEach(choice => {
      const id = `${root.id}-${choice.id}`;
      const label = el('label', { className: 'ai-survey-choice', for: id });
      const input = el('input', { type: 'checkbox', id, name: 'choice', value: choice.id });
      label.appendChild(input);
      label.appendChild(el('span', {}, choice.label));
      fieldset.appendChild(label);
    });
    form.appendChild(fieldset);
    const submit = el('button', { type: 'submit', className: 'ai-survey-submit', disabled: '' }, '送る');
    form.appendChild(submit);
    form.appendChild(el('p', { className: 'ai-survey-note' }, `${ANONYMOUS_NOTE}ほかの人の回答や集計結果も、この画面には表示されません。`));
    form.addEventListener('change', () => {
      submit.disabled = !form.querySelector('input[name="choice"]:checked');
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const chosen = Array.from(form.querySelectorAll('input[name="choice"]:checked')).map(input => input.value);
      if (!chosen.length) return;
      track('survey_submit', { survey_id: root.dataset.survey, choice_count: chosen.length });
      chosen.forEach(id => track('survey_choice', { survey_id: root.dataset.survey, choice_id: id }));
      renderThanks(root, chosen);
      root.querySelector('.ai-survey-title')?.focus({ preventScroll: true });
    });
    root.appendChild(form);
  }

  const start = () => document.querySelectorAll('.ai-survey[data-survey]').forEach(render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
