/* Pure grading and storage operations. No network or DOM dependencies. */
(function (root) {
  'use strict';
  const KEY = 'boki2-study.review.fixed-assets';
  function parseAmount(value) {
    const s = String(value).trim().replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/，/g, ',').replace(/,/g, '');
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isSafeInteger(n) ? n : null;
  }
  function gradeNumeric(value, answer) {
    if (!String(value).trim()) return { status: 'empty', messages: ['金額を入力してください。'] };
    const n = parseAmount(value);
    if (n === null) return { status: 'invalid', messages: ['円・小数・符号を付けず、整数で入力してください。'] };
    return { status: n === answer.amount ? 'correct' : 'wrong', messages: [] };
  }
  function gradeJournal(rows, answer) {
    const totals = { debit: {}, credit: {} }, messages = [];
    for (const side of ['debit', 'credit']) {
      rows[side].forEach((row, i) => {
        const a = row.account.trim(), s = String(row.amount).trim();
        if (!a && !s) return;
        const n = parseAmount(s);
        if (!a || n === null || n <= 0) messages.push(`${side === 'debit' ? '借方' : '貸方'}${i + 1}行目の科目と正の整数金額をそろえてください。`);
        else {
          totals[side][a] = (totals[side][a] || 0) + n;
          if (!Number.isSafeInteger(totals[side][a])) messages.push('金額が大きすぎます。');
        }
      });
    }
    if (messages.length) return { status: 'invalid', messages };
    const lengths = ['debit', 'credit'].map(s => Object.keys(totals[s]).length);
    if (!lengths[0] && !lengths[1]) return { status: 'empty', messages: ['仕訳を入力してください。'] };
    if (!lengths[0] || !lengths[1]) return { status: 'invalid', messages: ['借方と貸方の両方を入力してください。'] };
    const diff = {}, match = [];
    for (const side of ['debit', 'credit']) {
      const expected = Object.fromEntries(answer[side].map(r => [r.account, r.amount]));
      diff[side] = { missing: [], extra: [], amountMismatch: [] };
      for (const a of Object.keys(expected)) {
        if (!(a in totals[side])) diff[side].missing.push(a);
        else if (totals[side][a] !== expected[a]) diff[side].amountMismatch.push(a);
      }
      for (const a of Object.keys(totals[side])) if (!(a in expected)) diff[side].extra.push(a);
      match.push(Object.values(diff[side]).every(a => a.length === 0));
    }
    return { status: match.every(Boolean) ? 'correct' : 'wrong', messages, diff, userTotals: totals };
  }
  function loadReview(storage) {
    let raw;
    try { raw = storage.getItem(KEY); } catch (_) { return { status: 'unavailable', entries: {} }; }
    if (raw === null) return { status: 'ok', entries: {} };
    try {
      const d = JSON.parse(raw);
      if (d && typeof d.schemaVersion === 'number' && d.schemaVersion !== 1) return { status: 'unsupported-version', entries: {} };
      if (!d || d.schemaVersion !== 1 || d.unitId !== 'fixed-assets' || !d.entries || typeof d.entries !== 'object' || Array.isArray(d.entries)) throw Error();
      const entries = {};
      for (const [id, item] of Object.entries(d.entries)) {
        if (!/^fa-\d{3}$/.test(id) || !item || !['wrong', 'revealed'].includes(item.reason)) throw Error();
        entries[id] = { reason: item.reason };
      }
      return { status: 'ok', entries };
    } catch (_) { return { status: 'corrupt', entries: {} }; }
  }
  function applyOutcome(entries, id, outcome) {
    const next = { ...entries };
    if (outcome === 'correct') delete next[id];
    else if (['wrong', 'revealed'].includes(outcome)) next[id] = { reason: outcome };
    return next;
  }
  function saveReview(storage, entries, status) {
    if (['corrupt', 'unsupported-version', 'unavailable'].includes(status)) return status;
    try { storage.setItem(KEY, JSON.stringify({ schemaVersion: 1, unitId: 'fixed-assets', entries })); return 'ok'; }
    catch (_) { return 'write-failed'; }
  }
  function resetReview(storage) {
    try { storage.removeItem(KEY); return 'ok'; } catch (_) { return 'unavailable'; }
  }
  root.Boki2Core = { KEY, parseAmount, gradeNumeric, gradeJournal, loadReview, applyOutcome, saveReview, resetReview };
})(typeof window === 'undefined' ? globalThis : window);
