/**
 * Mesin Akuntansi & Analisis Rasio Keuangan (Bab 6)
 * Pure ESM, zero side-effects, aman diuji via node --test maupun browser.
 */

export function formatRp(value, { unitScale = 1, decimals = 0 } = {}) {
  const scaled = Number(value || 0);
  const abs = Math.abs(scaled);
  const formatted = abs.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const suffix = unitScale === 1_000_000 ? ' jt' : '';
  return scaled < 0 ? `-Rp${formatted}${suffix}` : `Rp${formatted}${suffix}`;
}

export function formatPct(ratioDecimal, decimals = 2) {
  if (!Number.isFinite(ratioDecimal)) return '0,00%';
  return `${(ratioDecimal * 100).toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatTimes(val, decimals = 2) {
  if (!Number.isFinite(val)) return '0,00x';
  return `${val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kali`;
}

export function sumAmounts(items) {
  return items.reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

export function computeSingleStep(data, mode = 'actual') {
  const calcRevenue = sumAmounts(data.revenues);
  const calcExpense = sumAmounts(data.expenses);
  const calcNet = calcRevenue - calcExpense;

  if (mode === 'book' && data.bookValues) {
    return {
      totalRevenue: data.bookValues.totalRevenue,
      totalExpense: data.bookValues.totalExpense,
      netIncome: data.bookValues.netIncome,
    };
  }
  return {
    totalRevenue: calcRevenue,
    totalExpense: calcExpense,
    netIncome: calcNet,
  };
}

export function computeMultipleStep(data, mode = 'actual') {
  const goodsAvailable = data.cogs.beginningInventory + data.cogs.netPurchases;
  const cogsTotal = goodsAvailable - data.cogs.endingInventory;
  const grossProfit = data.sales - cogsTotal;
  const sellingTotal = sumAmounts(data.sellingExpenses);
  const adminTotal = sumAmounts(data.adminExpenses);
  const operatingExpenseTotal = sellingTotal + adminTotal;
  const operatingIncome = grossProfit - operatingExpenseTotal;
  const otherNet = data.otherRevenue - data.otherExpense;
  const ebt = operatingIncome + otherNet;

  if (mode === 'book' && data.bookValues) {
    return { ...data.bookValues };
  }
  return {
    goodsAvailable,
    cogsTotal,
    grossProfit,
    sellingTotal,
    adminTotal,
    operatingExpenseTotal,
    operatingIncome,
    otherNet,
    ebt,
  };
}

export function computeEquityChange(data) {
  const netChange = data.netIncome - data.deduction;
  const endingCapital = data.beginningCapital + netChange;
  return { netChange, endingCapital };
}

export function computeBalanceSheet(data) {
  const totalCurrentAssets = sumAmounts(data.currentAssets);
  const fixedRows = data.fixedAssets.map((fa) => ({
    ...fa,
    netValue: fa.cost - fa.accDep,
  }));
  const totalFixedAssets = fixedRows.reduce((acc, r) => acc + r.netValue, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalShortTermLiabilities = sumAmounts(data.shortTermLiabilities);
  const totalLongTermLiabilities = sumAmounts(data.longTermLiabilities);
  const totalLiabilities = totalShortTermLiabilities + totalLongTermLiabilities;
  const totalEquity = sumAmounts(data.equity);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const diff = totalAssets - totalLiabilitiesAndEquity;

  return {
    totalCurrentAssets,
    fixedRows,
    totalFixedAssets,
    totalAssets,
    totalShortTermLiabilities,
    totalLongTermLiabilities,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity,
    diff,
    isBalanced: Math.round(diff) === 0,
  };
}

export function safeDiv(numerator, denominator) {
  if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return 0;
  }
  return numerator / denominator;
}

export function computePtAbcSummary(ptAbc) {
  const sumYear = (rows, key) => rows.reduce((s, r) => s + r[key], 0);
  const bs = ptAbc.balanceSheet;
  const is = ptAbc.incomeStatement;

  const summary = {};
  for (const yr of ['y2022', 'y2023']) {
    const cash = bs.currentAssets.find((a) => a.name.toLowerCase().includes('kas'))?.[yr] || 0;
    const inventory = bs.currentAssets.find((a) => a.name.toLowerCase().includes('persediaan'))?.[yr] || 0;
    const currentAssets = sumYear(bs.currentAssets, yr);
    const fixedAssets = sumYear(bs.fixedAssets, yr);
    const totalAssets = currentAssets + fixedAssets;

    const shortTermLiab = sumYear(bs.shortTermLiabilities, yr);
    const longTermLiab = sumYear(bs.longTermLiabilities, yr);
    const totalLiab = shortTermLiab + longTermLiab;
    const totalEquity = sumYear(bs.equity, yr);
    const totalLiabEquity = totalLiab + totalEquity;

    const sales = is.sales[yr];
    const cogs = is.cogs[yr];
    const grossProfit = sales - cogs;
    const opex = sumYear(is.operatingExpenses, yr);
    const ebit = grossProfit - opex;
    const interest = is.interestExpense[yr];
    const ebt = ebit - interest;
    const tax = is.taxExpense[yr];
    const eat = ebt - tax;

    summary[yr] = {
      cash,
      inventory,
      currentAssets,
      fixedAssets,
      totalAssets,
      shortTermLiab,
      longTermLiab,
      totalLiab,
      totalEquity,
      totalLiabEquity,
      isBalanced: Math.round(totalAssets - totalLiabEquity) === 0,
      sales,
      cogs,
      grossProfit,
      opex,
      ebit,
      interest,
      ebt,
      tax,
      eat,
    };
  }

  return summary;
}

export function computeRatiosFromSnapshot(snap) {
  const currentRatio = safeDiv(snap.currentAssets, snap.shortTermLiab);
  const quickRatio = safeDiv(
    snap.currentAssets - (snap.inventoryAndPrepaid ?? snap.inventory ?? 0),
    snap.shortTermLiab
  );
  const cashRatio = safeDiv(snap.cash, snap.shortTermLiab);

  const ltlToEquity = safeDiv(snap.longTermLiab, snap.totalEquity);
  const debtToEquity = safeDiv(snap.totalLiab, snap.totalEquity);
  const debtToAssets = safeDiv(snap.totalLiab, snap.totalAssets);
  const interestCoverage = safeDiv(snap.ebit, snap.interest);

  const grossMargin = safeDiv(snap.grossProfit, snap.sales);
  const netMargin = safeDiv(snap.eat, snap.sales);
  const roe = safeDiv(snap.eat, snap.totalEquity);

  return [
    {
      id: 'current-ratio',
      category: 'Likuiditas',
      name: 'Rasio Lancar (Current Ratio)',
      formula: 'Total Aset Tidak Tetap / Total Kewajiban Jangka Pendek × 100%',
      value: currentRatio,
      kind: 'pct',
      book2023: '194%',
      status: currentRatio >= 1.5 ? 'ok' : currentRatio >= 1 ? 'warn' : 'err',
      statusText: currentRatio >= 1.5 ? 'Sangat Likuid' : currentRatio >= 1 ? 'Cukup Aman' : 'Ketat',
    },
    {
      id: 'quick-ratio',
      category: 'Likuiditas',
      name: 'Rasio Cepat (Quick Ratio)',
      formula: '(Aset Tidak Tetap - Persediaan & Beban Dibayar di Muka) / Kewajiban Jangka Pendek × 100%',
      value: quickRatio,
      kind: 'pct',
      book2023: '100%',
      status: quickRatio >= 0.9 ? 'ok' : quickRatio >= 0.6 ? 'warn' : 'err',
      statusText: quickRatio >= 0.9 ? 'Sehat' : quickRatio >= 0.6 ? 'Moderat' : 'Rendah',
    },
    {
      id: 'cash-ratio',
      category: 'Likuiditas',
      name: 'Rasio Kas (Cash Ratio)',
      formula: 'Kas / Total Kewajiban Jangka Pendek × 100%',
      value: cashRatio,
      kind: 'pct',
      book2023: '— (rumus hlm. 168)',
      status: cashRatio >= 0.25 ? 'ok' : 'warn',
      statusText: cashRatio >= 0.25 ? 'Cadangan Kas Kuat' : 'Perlu Penguatan Kas',
    },
    {
      id: 'ltl-equity',
      category: 'Solvabilitas',
      name: 'Utang Jangka Panjang terhadap Modal',
      formula: 'Utang Jangka Panjang / Total Modal × 100%',
      value: ltlToEquity,
      kind: 'pct',
      book2023: '39%',
      status: ltlToEquity <= 0.6 ? 'ok' : 'warn',
      statusText: ltlToEquity <= 0.6 ? 'Struktur Konservatif' : 'Leverage Tinggi',
    },
    {
      id: 'debt-equity',
      category: 'Solvabilitas',
      name: 'Total Utang terhadap Modal (DER)',
      formula: 'Total Kewajiban / Total Modal × 100%',
      value: debtToEquity,
      kind: 'pct',
      book2023: '62% (cetakan buku)',
      status: debtToEquity <= 1.0 ? 'ok' : 'warn',
      statusText: debtToEquity <= 1.0 ? 'Utang < Ekuitas' : 'Utang > Ekuitas',
    },
    {
      id: 'debt-assets',
      category: 'Solvabilitas',
      name: 'Total Utang terhadap Total Aset (DAR)',
      formula: 'Total Utang / Total Aset × 100%',
      value: debtToAssets,
      kind: 'pct',
      book2023: '4% (typo buku, aktual 39,49%)',
      status: debtToAssets <= 0.5 ? 'ok' : 'warn',
      statusText: debtToAssets <= 0.5 ? 'Mayoritas Dibiayai Modal' : 'Dominan Utang',
    },
    {
      id: 'interest-coverage',
      category: 'Solvabilitas',
      name: 'Rasio Cakupan Bunga (TIE)',
      formula: 'Laba Sebelum Bunga & Pajak (EBIT) / Beban Bunga',
      value: interestCoverage,
      kind: 'times',
      book2023: '4 kali',
      status: interestCoverage >= 3 ? 'ok' : interestCoverage >= 1.5 ? 'warn' : 'err',
      statusText: interestCoverage >= 3 ? 'Bunga Tertutup Nyaman' : 'Margin Bunga Tipis',
    },
    {
      id: 'gross-margin',
      category: 'Rentabilitas',
      name: 'Rasio Laba Kotor (GPM)',
      formula: 'Laba Kotor / Penjualan Bersih × 100%',
      value: grossMargin,
      kind: 'pct',
      book2023: '39%',
      status: grossMargin >= 0.3 ? 'ok' : 'warn',
      statusText: grossMargin >= 0.3 ? 'Margin Kotor Solid' : 'Margin Kotor Tertekan',
    },
    {
      id: 'net-margin',
      category: 'Rentabilitas',
      name: 'Rasio Laba Bersih (NPM)',
      formula: 'Laba Bersih Setelah Pajak / Penjualan Bersih × 100%',
      value: netMargin,
      kind: 'pct',
      book2023: '— (rumus hlm. 169)',
      status: netMargin >= 0.03 ? 'ok' : 'warn',
      statusText: netMargin >= 0.03 ? 'Profitabilitas Positif' : 'Margin Bersih Tipis',
    },
    {
      id: 'roe',
      category: 'Rentabilitas',
      name: 'Pengembalian Modal (ROE)',
      formula: 'Laba Bersih Setelah Pajak / Modal × 100%',
      value: roe,
      kind: 'pct',
      book2023: '9%',
      status: roe >= 0.08 ? 'ok' : roe > 0 ? 'warn' : 'err',
      statusText: roe >= 0.08 ? 'Imbal Hasil Baik' : 'Imbal Hasil Moderat',
    },
  ];
}

export function computeCustomBusiness(state) {
  const totalRevenue = sumAmounts(state.revenues);
  const salesRevenue = Number(state.revenues[0]?.amount || 0);
  const cogs = Number(state.cogs || 0);
  const grossProfit = salesRevenue - cogs;
  const totalOpex = sumAmounts(state.expenses);
  const otherIncome = state.revenues.slice(1).reduce((s, r) => s + Number(r.amount || 0), 0);
  const ebit = grossProfit + otherIncome - totalOpex;
  const interest = Number(state.interestExpense || 0);
  const ebt = ebit - interest;
  const tax = Number(state.taxExpense || 0);
  const eat = ebt - tax;

  const beginningCapital = Number(state.beginningCapital || 0);
  const drawings = Number(state.drawings || 0);
  const endingCapital = beginningCapital + eat - drawings;

  const currentAssets = sumAmounts(state.currentAssets);
  const cash = state.currentAssets
    .filter((a) => a.isCash)
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const inventoryAndPrepaid = state.currentAssets
    .filter((a) => a.isInventoryOrPrepaid)
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const fixedAssets = sumAmounts(state.fixedAssets);
  const totalAssets = currentAssets + fixedAssets;

  const shortTermLiab = sumAmounts(state.shortTermLiabilities);
  const longTermLiab = sumAmounts(state.longTermLiabilities);
  const totalLiab = shortTermLiab + longTermLiab;
  const totalLiabAndEquity = totalLiab + endingCapital;
  const balanceDiff = totalAssets - totalLiabAndEquity;

  const ratios = computeRatiosFromSnapshot({
    cash,
    inventoryAndPrepaid,
    currentAssets,
    fixedAssets,
    totalAssets,
    shortTermLiab,
    longTermLiab,
    totalLiab,
    totalEquity: endingCapital,
    sales: salesRevenue || totalRevenue,
    grossProfit,
    ebit,
    interest,
    eat,
  });

  return {
    totalRevenue,
    salesRevenue,
    cogs,
    grossProfit,
    totalOpex,
    otherIncome,
    ebit,
    interest,
    ebt,
    tax,
    eat,
    beginningCapital,
    drawings,
    endingCapital,
    currentAssets,
    cash,
    inventoryAndPrepaid,
    fixedAssets,
    totalAssets,
    shortTermLiab,
    longTermLiab,
    totalLiab,
    totalLiabAndEquity,
    balanceDiff,
    isBalanced: Math.round(balanceDiff) === 0,
    ratios,
  };
}
