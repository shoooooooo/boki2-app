(function () {
  'use strict';
  const main = document.getElementById('main'), data = window.Boki2Data && window.Boki2Data['fixed-assets-v1'], core = window.Boki2Core;
  if (!data || !core) { main.textContent = '問題データを読み込めませんでした。data/fixed-assets-v1.js と core.js の配置を確認してください。'; return; }
  const yen = n => n.toLocaleString('ja-JP') + '円';
  let storage;
  try {
    const testMode = new URLSearchParams(location.search).get('storage');
    if (testMode === 'deny') storage = { getItem() { throw Error('deny'); } };
    else if (testMode === 'quota') storage = { getItem: () => null, setItem() { throw Error('quota'); }, removeItem() {} };
    else storage = window.localStorage;
  } catch (_) { storage = { getItem() { throw Error('unavailable'); } }; }
  let { status: storageStatus, entries } = core.loadReview(storage);
  function el(tag, text, parent, cls) {
    const e = document.createElement(tag); if (text !== undefined && text !== null) e.textContent = text;
    if (cls) e.className = cls; if (parent) parent.appendChild(e); return e;
  }
  function link(text, href, parent, cls) { const a = el('a', text, parent, cls); a.href = href; return a; }
  function button(text, parent, handler, cls) { const b = el('button', text, parent, cls); b.type = 'button'; b.addEventListener('click', handler); return b; }
  function heading(kicker, title) { el('p', kicker, main, 'eyebrow'); el('h1', title, main); }
  function marked() { return data.questions.filter(q => Object.hasOwn(entries, q.id)); }
  function updateStatus() {
    const messages = {
      ok: 'この端末のブラウザに保存しています。',
      unavailable: 'この端末では保存できません。再読込やタブを閉じると復習リストは失われます。',
      corrupt: '保存データを読み取れませんでした。元データを保護し、今回の復習はメモリ上だけで続けます。',
      'unsupported-version': '未対応の保存形式です。元データを保護し、今回の復習はメモリ上だけで続けます。',
      'write-failed': '保存に失敗しました。再読込すると今回の変更は失われます。'
    };
    document.getElementById('storage-status').textContent = messages[storageStatus];
    document.getElementById('review-count').textContent = marked().length;
    document.getElementById('reset-storage').hidden = !['corrupt', 'unsupported-version'].includes(storageStatus);
  }
  document.getElementById('reset-storage').addEventListener('click', () => {
    if (!window.confirm('この単元の保存データを削除します。新しい形式のデータも失われます。他のデータは削除しません。よろしいですか？')) return;
    storageStatus = core.resetReview(storage); if (storageStatus === 'ok') entries = {};
    updateStatus(); render();
  });
  function record(q, outcome) { entries = core.applyOutcome(entries, q.id, outcome); storageStatus = core.saveReview(storage, entries, storageStatus); updateStatus(); }
  function top() {
    const hero = el('section', null, main, 'hero'); el('p', '01 / COMMERCIAL BOOKKEEPING', hero, 'eyebrow'); el('h1', data.title, hero);
    el('p', '買ったとき、使ったとき、手放すとき。\n仕訳と計算を、ひとつずつ確かめましょう。', hero, 'lead');
    ['全24問', '仕訳17問・計算7問', '端末内に復習を保存'].forEach(t => el('span', t, hero, 'tag'));
    const actions = el('div', null, hero, 'actions'); link('解説から始める →', '#lesson-acquisition', actions, 'button'); link('問題を解く', '#q-fa-001', actions, 'button secondary');
    el('p', data.scopeNote, main, 'note');
    const sec = el('section', null, main, 'section'); el('h2', '学ぶ順番', sec);
    const cards = el('div', null, sec, 'cards'); data.lessons.forEach((l, i) => { const c = el('article', null, cards, 'card'); el('span', 'LESSON 0' + (i + 1), c, 'eyebrow'); el('h3', l.title, c); el('p', l.subtitle, c); link('解説を読む →', '#lesson-' + l.id, c); });
    const detail = el('details', null, main); el('summary', 'この単元のルールと対象外', detail); const ul = el('ul', null, detail); data.conventions.forEach(t => el('li', t, ul)); el('p', '今回の対象外：' + data.excluded.join('、'), detail);
    const list = el('section', null, main, 'section'); el('h2', '問題一覧', list); el('p', '色付きの番号は復習対象です。正答1回でリストから外れますが、習得を保証するものではありません。', list, 'lead');
    const qs = el('ol', null, list, 'question-list'); data.questions.forEach((q, i) => { const li = el('li', null, qs); const a = link(String(i + 1).padStart(2, '0') + (Object.hasOwn(entries, q.id) ? ' 復習' : ''), '#q-' + q.id, li, Object.hasOwn(entries, q.id) ? 'marked' : ''); a.setAttribute('aria-label', `問題${i + 1} ${q.type === 'journal' ? '仕訳' : '計算'}`); });
  }
  function lesson(id) {
    const l = data.lessons.find(l => l.id === id); if (!l) { location.hash = '#top'; return; }
    heading('READ / 考え方を読む', l.title); const paper = el('article', null, main, 'paper'); l.paragraphs.forEach(t => el('p', t, paper));
    const actions = el('div', null, main, 'actions'); link('この内容の問題へ →', '#q-' + data.questions.find(q => q.lessonId === id).id, actions, 'button'); link('単元へ戻る', '#top', actions, 'button secondary');
  }
  function showAnswer(q, parent) {
    el('h3', '正解', parent);
    if (q.type === 'numeric') el('p', q.answer.label + '：' + yen(q.answer.amount), parent);
    else { const a = el('div', null, parent, 'answer'); for (const side of ['debit', 'credit']) { const col = el('div', null, a); el('h3', side === 'debit' ? '借方' : '貸方', col); q.answer[side].forEach(r => el('p', r.account + ' ' + yen(r.amount), col)); } }
    el('h3', '考え方', parent); const steps = el('ol', null, parent); q.explanation.steps.forEach(t => el('li', t, steps));
    q.explanation.pitfalls.forEach(t => el('p', '確認：' + t, parent));
  }
  function question(id) {
    const q = data.questions.find(q => q.id === id); if (!q) { location.hash = '#top'; return; }
    const index = data.questions.indexOf(q); const meta = el('div', null, main, 'question-meta'); el('span', `PRACTICE / ${String(index + 1).padStart(2, '0')} OF 24`, meta); link('対応する解説へ', '#lesson-' + q.lessonId, meta);
    el('h1', q.type === 'journal' ? '仕訳で確かめる' : '計算で確かめる', main);
    const paper = el('section', null, main, 'paper'); el('p', q.prompt, paper, 'prompt'); const cs = el('ul', null, paper, 'conditions'); q.conditions.forEach(t => el('li', t, cs));
    const form = el('form', null, paper); form.noValidate = true; let amount; const inputs = { debit: [], credit: [] };
    if (q.type === 'numeric') { const wrap = el('div', null, form, 'numeric'); const label = el('label', q.answer.label + '（円）', wrap); amount = el('input', null, label); amount.type = 'text'; amount.inputMode = 'numeric'; amount.autocomplete = 'off'; amount.id = 'numeric-answer'; }
    else {
      el('p', '必要な行だけ使い、使わない行は空欄にします。行順は問いません。同じ科目の分割入力もできます。', form, 'conditions');
      const grid = el('div', null, form, 'journal'); for (const side of ['debit', 'credit']) { const field = el('fieldset', null, grid); const sideName = side === 'debit' ? '借方' : '貸方'; el('legend', sideName, field);
        for (let i = 0; i < 4; i++) { const line = el('div', null, field, 'entry-row'); const al = el('label', `${sideName}${i + 1} 科目`, line); const select = el('select', null, al); select.id = `${side}-${i}-account`; const empty = el('option', '選んでください', select); empty.value = ''; q.accountChoices.forEach(a => { const o = el('option', a, select); o.value = a; }); const ml = el('label', `${sideName}${i + 1} 金額（円）`, line); const input = el('input', null, ml); input.id = `${side}-${i}-amount`; input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off'; inputs[side].push({ select, input }); }
      }
    }
    const message = el('p', '', form, 'error'); message.setAttribute('role', 'alert');
    const actions = el('div', null, form, 'actions'); const submit = el('button', '採点する', actions); submit.type = 'submit';
    const reveal = button('分からない・答えを見る', actions, () => finish('revealed'), 'secondary');
    let finished = false; const output = el('div', null, paper); output.setAttribute('aria-live', 'polite');
    function finish(status, grading) {
      if (finished) return; finished = true;
      const wasMarked = Object.hasOwn(entries, q.id); record(q, status);
      form.querySelectorAll('input,select,button').forEach(e => { e.disabled = true; });
      const result = el('section', null, output, 'result' + (status === 'correct' ? '' : ' wrong'));
      const h = el('h2', status === 'correct' ? '○ 正解です' : status === 'revealed' ? '答えを確認しました' : '△ もう一度確かめましょう', result); h.tabIndex = -1;
      el('p', status === 'correct' ? (wasMarked ? '復習リストから外しました。習得を保証するものではありません。' : '理由も解説で確認しましょう。') : '復習リストに追加しました。解説を読んで、もう一度取り組めます。', result);
      if (grading && grading.diff && status === 'wrong') { for (const side of ['debit', 'credit']) { const d = grading.diff[side]; const parts = [['不足', d.missing], ['余分', d.extra], ['金額違い', d.amountMismatch]].filter(p => p[1].length).map(p => p[0] + '：' + p[1].join('・')); if (parts.length) el('p', (side === 'debit' ? '借方 ' : '貸方 ') + parts.join(' / '), result); }
        const sums = Object.values(grading.userTotals).map(s => Object.values(s).reduce((a, b) => a + b, 0)); if (sums[0] !== sums[1]) el('p', '入力した借方と貸方の合計も一致していません。', result);
      }
      showAnswer(q, result); const more = el('div', null, result, 'actions'); button('もう一度解く', more, () => { questionReset(); }, 'secondary'); link('復習リストへ', '#review', more, 'button secondary'); h.focus();
    }
    function questionReset() { render(); }
    form.addEventListener('submit', event => { event.preventDefault(); if (finished) return; const r = q.type === 'numeric' ? core.gradeNumeric(amount.value, q.answer) : core.gradeJournal(Object.fromEntries(['debit', 'credit'].map(s => [s, inputs[s].map(r => ({ account: r.select.value, amount: r.input.value }))])), q.answer); if (['empty', 'invalid'].includes(r.status)) { message.textContent = r.messages.join(' '); return; } message.textContent = ''; finish(r.status, r); });
    const nav = el('div', null, main, 'actions'); if (index > 0) link('← 前の問題', '#q-' + data.questions[index - 1].id, nav, 'button secondary'); if (index < data.questions.length - 1) link('次の問題 →', '#q-' + data.questions[index + 1].id, nav, 'button secondary'); link('問題一覧', '#top', nav, 'button secondary');
    el('p', '途中の入力は保存されません。採点・答えの確認後は「もう一度解く」で再挑戦できます。', main, 'conditions');
  }
  function review() {
    heading('REVIEW / 間違いから、もう一度', '復習リスト'); const qs = marked(); el('p', `${qs.length}問が復習対象です。誤答・答えの確認で追加し、正答すると外れます。`, main, 'lead');
    if (!qs.length) el('p', '今は復習対象がありません。問題を解いて、迷ったところを見つけましょう。', main, 'note');
    const ul = el('ul', null, main, 'review-list'); qs.forEach(q => { const li = el('li', null, ul); el('small', `${q.id} / ${entries[q.id].reason === 'wrong' ? '誤答' : '答えを確認'}`, li); link(q.prompt, '#q-' + q.id, li); });
    const actions = el('div', null, main, 'actions'); if (qs.length) link('復習を始める →', '#q-' + qs[0].id, actions, 'button'); link('単元へ戻る', '#top', actions, 'button secondary');
  }
  function render() {
    main.replaceChildren(); const route = location.hash.slice(1) || 'top';
    if (route === 'main') { top(); }
    else if (route === 'top') top(); else if (route === 'review') review(); else if (route.startsWith('lesson-')) lesson(route.slice(7)); else if (route.startsWith('q-')) question(route.slice(2)); else { location.hash = '#top'; return; }
    updateStatus(); document.title = (main.querySelector('h1')?.textContent || data.title) + ' | 簿記の小さな練習帳'; main.focus();
  }
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); }); render();
})();
