/* Original practice data, v1. All amounts are synthetic, in yen. */
(function (root) {
  'use strict';
  const money = n => n.toLocaleString('ja-JP');
  const accounts = ['現金', '当座預金', '未払金', '未収入金', '買掛金', '売掛金', '備品', '車両運搬具', '建物', '土地', '減価償却費', '備品減価償却累計額', '車両運搬具減価償却累計額', '建物減価償却累計額', '固定資産売却益', '固定資産売却損', '支払手数料'];
  const questions = [];
  function add(topic, type, prompt, conditions, answer, facts, steps, pitfall) {
    const lessonId = ({ acquisition: 'acquisition', annual: 'depreciation', monthly: 'monthly', openingSale: 'sale', midSale: 'sale' })[topic];
    questions.push({ id: `fa-${String(questions.length + 1).padStart(3, '0')}`, topic, type, lessonId, prompt, conditions, answer, facts, accountChoices: type === 'journal' ? accounts.slice() : undefined, explanation: { steps, pitfalls: [pitfall] } });
  }
  const row = (account, amount) => ({ account, amount });
  function acquire(asset, price, fees, payment, total, numeric) {
    const feeText = fees.map(f => `${f[0]}${money(f[1])}円`).join('、');
    add('acquisition', numeric ? 'numeric' : 'journal', `×1年4月1日、${asset}を${money(price)}円で購入し、${feeText}がかかった。代金と付随費用はすべて${payment === '未払金' ? '翌月払いとした' : payment + 'から支払った'}。${numeric ? '取得原価を答えてください。' : '取得時の仕訳を答えてください。'}`,
      ['購入代金・付随費用に税は含めない。消費税は考慮しない。', '付随費用はいずれも取得して使用するために直接必要なものとする。'],
      numeric ? { amount: total, label: '取得原価' } : { debit: [row(asset, total)], credit: [row(payment, total)] },
      { kind: 'acquisition', asset, payment, price, incidentals: fees.map(f => f[1]), target: 'cost' },
      [`取得原価に購入代金と取得に直接必要な付随費用を含める。`, `${money(price)}${fees.map(f => ' ＋ ' + money(f[1])).join('')} ＝ ${money(total)}円。`, asset === '土地' ? '土地は取得原価で記録し、減価償却は行わない。' : '使用開始時の資産の取得原価となる。'],
      payment === '未払金' ? '商品以外の固定資産の後払いには買掛金ではなく未払金を使う。' : '取得のための付随費用を、この問題では支払手数料などの費用にしない。');
  }
  acquire('備品', 300000, [['引取運賃', 10000], ['据付費', 20000]], '現金', 330000, false);
  acquire('車両運搬具', 1200000, [['購入手数料', 30000]], '当座預金', 1230000, false);
  acquire('建物', 10000000, [['仲介手数料', 300000]], '当座預金', 10300000, false);
  acquire('土地', 5000000, [['仲介手数料', 150000], ['整地費用', 250000]], '当座預金', 5400000, false);
  acquire('備品', 500000, [['据付費', 40000]], '未払金', 540000, false);
  acquire('車両運搬具', 1800000, [['引取運賃', 20000], ['試運転費', 10000]], '現金', 1830000, true);
  function depreciate(topic, asset, cost, residualRate, lifeYears, months, amount, numeric, date) {
    const residual = residualRate ? '取得原価の10%' : 'ゼロ';
    add(topic, numeric ? 'numeric' : 'journal', `取得原価${money(cost)}円の${asset}について、×2年3月31日の決算で${numeric ? '当期の減価償却費を答えてください。' : '当期の減価償却の仕訳を答えてください。'}${date ? (parseInt(date, 10) < 4 ? '×2年' : '×1年') + date + 'に取得して直ちに使用を開始した。' : '当期首以前から使用している。'}`,
      [`定額法・間接法。耐用年数${lifeYears}年、残存価額${residual}。`, '会計期間は×1年4月1日〜×2年3月31日。', `当期の償却対象は${months}か月。取得月から月割計算する。`, '償却可能額は十分に残っており、過年度の誤りはない。税は考慮しない。'],
      numeric ? { amount, label: '当期の減価償却費' } : { debit: [row('減価償却費', amount)], credit: [row(asset + '減価償却累計額', amount)] },
      { kind: 'straight-line', asset, cost, residualRate, lifeYears, months, target: 'depreciation' },
      [`年間償却額は（取得原価 − 残存価額）÷ 耐用年数。`, `（${money(cost)} − ${money(cost * residualRate)}）÷ ${lifeYears} × ${months}/12 ＝ ${money(amount)}円。`, '間接法では資産自体を減らさず、その資産の減価償却累計額を貸方に記録する。'],
      topic === 'monthly' ? '取得月を含めた使用月数を数える。年額をそのまま計上しない。' : '残存価額を差し引いてから耐用年数で割る。');
  }
  depreciate('annual', '備品', 600000, 0, 5, 12, 120000, false);
  depreciate('annual', '車両運搬具', 2400000, 0, 6, 12, 400000, false);
  depreciate('annual', '建物', 12000000, 0, 30, 12, 400000, false);
  depreciate('annual', '備品', 500000, 0.1, 5, 12, 90000, true);
  depreciate('annual', '車両運搬具', 1800000, 0, 5, 12, 360000, true);
  depreciate('monthly', '備品', 600000, 0, 5, 10, 100000, false, '6月10日');
  depreciate('monthly', '車両運搬具', 2400000, 0, 5, 6, 240000, false, '10月1日');
  depreciate('monthly', '備品', 960000, 0, 4, 3, 60000, true, '1月15日');
  depreciate('monthly', '建物', 12000000, 0, 25, 9, 360000, true, '7月1日');
  depreciate('monthly', '備品', 800000, 0.1, 6, 8, 80000, true, '8月20日');
  function sell(topic, asset, cost, prior, price, payment, lifeYears, months, currentExpense, gainLoss, numeric) {
    const current = topic === 'midSale' ? { cost, residualRate: 0, lifeYears, months } : null;
    const accumulated = prior + currentExpense, book = cost - accumulated;
    const debit = [row(payment, price), row(asset + '減価償却累計額', accumulated)];
    const credit = [row(asset, cost)];
    if (gainLoss > 0) credit.push(row('固定資産売却益', gainLoss));
    else debit.push(row('固定資産売却損', -gainLoss));
    const date = topic === 'openingSale' ? '×2年4月1日（期首）' : `×2年${3 + months}月20日`;
    add(topic, numeric ? 'numeric' : 'journal', `${date}、取得原価${money(cost)}円、前期末の減価償却累計額${money(prior)}円の${asset}を${money(price)}円で売却した。代金は${payment === '未収入金' ? '翌月に受け取る' : payment + 'で受け取った'}。${numeric ? '売却直前の帳簿価額を答えてください。' : '売却の仕訳を答えてください。'}${current ? '当期分の減価償却を記帳した後の、売却仕訳のみを解答すること。' : ''}`,
      ['会計期間は4月1日〜翌3月31日。定額法・間接法。税は考慮しない。', current ? `耐用年数${lifeYears}年・残存価額ゼロ。当期首から売却月を含む${months}か月分の減価償却を先に記帳する。` : '期首売却につき当期の減価償却費は計上しない。', '前期末まで適正に記帳済み。売却損益は売却価額と売却直前の帳簿価額の差額。'],
      numeric ? { amount: book, label: '売却直前の帳簿価額' } : { debit, credit },
      { kind: 'sale', asset, cost, priorAccumulated: prior, price, payment, current, target: numeric ? 'bookValue' : 'gainLoss' },
      [current ? `先に当期の償却を記帳する：${money(cost)} ÷ ${lifeYears} × ${months}/12 ＝ ${money(currentExpense)}円（借方 減価償却費／貸方 ${asset}減価償却累計額）。` : '期首売却なので当期償却額は0円。', `売却時の累計額は${money(prior)} ＋ ${money(currentExpense)} ＝ ${money(accumulated)}円。帳簿価額は${money(cost)} − ${money(accumulated)} ＝ ${money(book)}円。`, `売却価額${money(price)}円と帳簿価額の差は${money(Math.abs(gainLoss))}円の売却${gainLoss > 0 ? '益' : '損'}。`, '売却時は資産の取得原価を貸方、累計額を借方にして帳簿から除く。'],
      current ? '当期の償却を先に記帳済みとして答える。売却仕訳に減価償却費を重ねて含めない。' : '売却損益は取得原価との差ではなく、帳簿価額との差で求める。');
  }
  sell('openingSale', '備品', 600000, 360000, 300000, '現金', 5, 0, 0, 60000, false);
  sell('openingSale', '車両運搬具', 2000000, 1200000, 650000, '当座預金', 5, 0, 0, -150000, false);
  sell('openingSale', '備品', 1000000, 400000, 700000, '未収入金', 5, 0, 0, 100000, false);
  sell('midSale', '備品', 1200000, 480000, 650000, '現金', 5, 6, 120000, 50000, false);
  sell('midSale', '車両運搬具', 2400000, 960000, 1000000, '当座預金', 5, 9, 360000, -80000, false);
  sell('midSale', '備品', 900000, 450000, 400000, '未収入金', 5, 4, 60000, 10000, false);
  sell('midSale', '建物', 12000000, 3600000, 8000000, '当座預金', 30, 6, 200000, -200000, false);
  sell('midSale', '備品', 600000, 240000, 350000, '現金', 5, 3, 30000, 20000, true);
  root.Boki2Data = root.Boki2Data || {};
  root.Boki2Data['fixed-assets-v1'] = {
    dataVersion: 'fixed-assets-v1', unitId: 'fixed-assets', title: '有形固定資産（基本）',
    scopeNote: '2級の学習に向けた基礎の確認です。3級と重なる論点を扱い、2級の全範囲を網羅するものではありません。',
    excluded: ['定率法・生産高比例法', '除却・買換え・建設仮勘定', '資本的支出・割賦購入・リース', '税・圧縮記帳'],
    conventions: ['会計期間は4月1日〜翌3月31日。金額は円、税は考慮しません。', '減価償却は定額法・間接法。残存価額・耐用年数は各問の条件を使います。土地は償却しません。', '取得月・売却月を含めて月割計算します。すべて円単位で割り切れます。', '期中売却は当期分の償却を先に記帳し、問題で指定した売却仕訳のみを答えます。'],
    accounts,
    lessons: [
      { id: 'acquisition', title: '取得原価をつかむ', subtitle: '購入代金と、使い始めるまでの費用', paragraphs: ['固定資産を使うために直接必要な付随費用は、購入代金に加えて取得原価に含めます。引取運賃や据付費などが例です。', '固定資産の後払いは未払金、売却代金の後日受取は未収入金を使います。商品売買の買掛金・売掛金とは区別します。', '例：備品200,000円と据付費10,000円を現金で支払う。借方 備品210,000円／貸方 現金210,000円。', '土地も付随費用を含めて取得原価で記録しますが、減価償却はしません。'] },
      { id: 'depreciation', title: '1年分の減価償却', subtitle: '使う期間に費用を配分する', paragraphs: ['定額法の年額は（取得原価 − 残存価額）÷ 耐用年数です。残存価額は問題文の指定を確認します。', '例：備品600,000円、残存価額ゼロ、耐用年数5年なら、年額は120,000円です。', '間接法では借方 減価償却費120,000円／貸方 備品減価償却累計額120,000円。取得原価はそのまま残します。', '直接法は資産科目を直接減らしますが、この練習帳の採点問題は間接法に統一しています。'] },
      { id: 'monthly', title: '使った月数で考える', subtitle: '期中取得を月割計算する', paragraphs: ['期中に取得した場合、年額に使用月数/12を掛けます。この単元では取得月を1か月と数えます。', '例：年額120,000円の備品を6月10日から使う。翌3月まで10か月なので120,000 × 10/12 ＝ 100,000円です。', '月の数え方を最初に確かめましょう。年額を求めたところで止めず、当期分まで計算します。'] },
      { id: 'sale', title: '売却時の帳簿価額', subtitle: '取得原価ではなく、残った価値と比べる', paragraphs: ['帳簿価額は取得原価 − 減価償却累計額。売却価額が帳簿価額を超えれば売却益、下回れば売却損です。', '例：取得原価600,000円、累計額360,000円の備品を期首に300,000円で売却。帳簿価額240,000円との差60,000円が売却益です。', '仕訳は借方 現金300,000円・備品減価償却累計額360,000円／貸方 備品600,000円・固定資産売却益60,000円。', '期中売却は当期首から売却月までの償却を先に記帳します。その後の累計額を使って売却を処理します。この単元では売却仕訳だけを入力します。'] }
    ], questions
  };
})(typeof window === 'undefined' ? globalThis : window);
