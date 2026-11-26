/**
 * Mesin Akuntansi Double-Entry UMKM (Prinsip Debit === Kredit)
 * Menghasilkan otomatis:
 * 1. Validasi Ketat Jurnal (Total Debit === Total Kredit)
 * 2. Buku Besar & Neraca Saldo (Trial Balance)
 * 3. Laporan Laba Rugi (Income Statement)
 * 4. Laporan Perubahan Ekuitas & Neraca (Balance Sheet: Aset = Liabilitas + Ekuitas)
 * 5. Laporan Arus Kas (Cash Flow: Operasi, Investasi, Pendanaan -> Kas Akhir = Kas Neraca)
 */

export const UMKM_CHART_OF_ACCOUNTS = [
  // Aset
  { code: '1-101', name: 'Kas & Bank', category: 'asset', normalSide: 'debit', isCash: true, cashFlowGroup: 'cash' },
  { code: '1-102', name: 'Piutang Usaha', category: 'asset', normalSide: 'debit', isLiquid: true, cashFlowGroup: 'operating' },
  { code: '1-103', name: 'Persediaan Barang Dagang', category: 'asset', normalSide: 'debit', cashFlowGroup: 'operating' },
  { code: '1-104', name: 'Perlengkapan & Dibayar di Muka', category: 'asset', normalSide: 'debit', cashFlowGroup: 'operating' },
  { code: '1-201', name: 'Peralatan & Mesin Usaha', category: 'asset', isFixed: true, normalSide: 'debit', cashFlowGroup: 'investing' },
  { code: '1-202', name: 'Akumulasi Penyusutan Peralatan', category: 'asset', isFixed: true, contra: true, normalSide: 'credit', cashFlowGroup: 'non_cash' },

  // Liabilitas
  { code: '2-101', name: 'Utang Usaha (Supplier)', category: 'liability', normalSide: 'credit', cashFlowGroup: 'operating' },
  { code: '2-102', name: 'Utang Pajak & Biaya Akrual', category: 'liability', normalSide: 'credit', cashFlowGroup: 'operating' },
  { code: '2-201', name: 'Utang Bank / Pinjaman Usaha', category: 'liability', isLongTerm: true, normalSide: 'credit', cashFlowGroup: 'financing' },

  // Ekuitas
  { code: '3-101', name: 'Modal Pemilik', category: 'equity', normalSide: 'credit', cashFlowGroup: 'financing' },
  { code: '3-201', name: 'Prive / Penarikan Pemilik', category: 'equity', contra: true, normalSide: 'debit', cashFlowGroup: 'financing' },

  // Pendapatan
  { code: '4-101', name: 'Penjualan Produk / Jasa', category: 'revenue', normalSide: 'credit', cashFlowGroup: 'operating' },
  { code: '4-201', name: 'Pendapatan Lain-Lain', category: 'revenue', normalSide: 'credit', cashFlowGroup: 'operating' },

  // Beban
  { code: '5-101', name: 'Harga Pokok Penjualan (HPP)', category: 'expense', isCogs: true, normalSide: 'debit', cashFlowGroup: 'operating' },
  { code: '5-201', name: 'Beban Gaji & Upah Karyawan', category: 'expense', normalSide: 'debit', cashFlowGroup: 'operating' },
  { code: '5-202', name: 'Beban Sewa, Listrik & Air', category: 'expense', normalSide: 'debit', cashFlowGroup: 'operating' },
  { code: '5-203', name: 'Beban Pemasaran & Operasional', category: 'expense', normalSide: 'debit', cashFlowGroup: 'operating' },
  { code: '5-204', name: 'Beban Penyusutan Peralatan', category: 'expense', normalSide: 'debit', cashFlowGroup: 'non_cash' },
  { code: '5-301', name: 'Beban Bunga & Pajak', category: 'expense', normalSide: 'debit', cashFlowGroup: 'operating' },
];

export const ACCOUNT_MAP = Object.fromEntries(UMKM_CHART_OF_ACCOUNTS.map((a) => [a.code, a]));

export const UMKM_QUICK_PRESETS = [
  { id: 'cash-sale', label: 'Penjualan Tunai (Masuk Kas)', debit: '1-101', credit: '4-101', hint: 'Menambah Kas & Penjualan' },
  { id: 'credit-sale', label: 'Penjualan Kredit / Tempo (Piutang)', debit: '1-102', credit: '4-101', hint: 'Menambah Piutang Usaha & Penjualan' },
  { id: 'collect-ar', label: 'Terima Pelunasan Piutang', debit: '1-101', credit: '1-102', hint: 'Piutang cair menjadi Kas' },
  { id: 'buy-stock-cash', label: 'Beli Stok Barang Tunai', debit: '1-103', credit: '1-101', hint: 'Menambah Persediaan, Kas berkurang' },
  { id: 'buy-stock-credit', label: 'Beli Stok Barang Tempo (Utang)', debit: '1-103', credit: '2-101', hint: 'Menambah Persediaan & Utang Usaha' },
  { id: 'record-cogs', label: 'Catat HPP Barang Terjual', debit: '5-101', credit: '1-103', hint: 'Mengakui biaya pokok stok yang terjual' },
  { id: 'pay-salary', label: 'Bayar Gaji Karyawan', debit: '5-201', credit: '1-101', hint: 'Beban Gaji bertambah, Kas berkurang' },
  { id: 'pay-rent-util', label: 'Bayar Sewa / Listrik / Air', debit: '5-202', credit: '1-101', hint: 'Beban Sewa & Utilitas bertambah, Kas berkurang' },
  { id: 'pay-marketing', label: 'Bayar Promosi / Operasional Lain', debit: '5-203', credit: '1-101', hint: 'Beban Pemasaran bertambah, Kas berkurang' },
  { id: 'buy-equipment', label: 'Beli Peralatan Usaha Tunai', debit: '1-201', credit: '1-101', hint: 'Arus Kas Aktivitas Investasi keluar' },
  { id: 'depreciation', label: 'Catat Penyusutan Peralatan', debit: '5-204', credit: '1-202', hint: 'Beban non-kas (tidak memotong Kas)' },
  { id: 'owner-capital', label: 'Setoran Modal Pemilik (Tunai)', debit: '1-101', credit: '3-101', hint: 'Arus Kas Aktivitas Pendanaan masuk' },
  { id: 'owner-draw', label: 'Penarikan Prive Pemilik', debit: '3-201', credit: '1-101', hint: 'Arus Kas Aktivitas Pendanaan keluar' },
  { id: 'bank-loan', label: 'Terima Pinjaman Bank', debit: '1-101', credit: '2-201', hint: 'Kas & Utang Bank bertambah' },
  { id: 'pay-ap', label: 'Bayar Utang Supplier', debit: '2-101', credit: '1-101', hint: 'Mengurangi Utang Usaha & Kas' },
  { id: 'pay-loan', label: 'Cicilan Pokok Pinjaman Bank', debit: '2-201', credit: '1-101', hint: 'Arus Kas Aktivitas Pendanaan keluar' },
];

export const DEFAULT_UMKM_STATE = {
  businessName: 'Kedai Kopi & Roti Nusantara',
  ownerName: 'UMKM Mandiri',
  periodLabel: 'November 2026',
  entries: [
    {
      id: 'JRN-001',
      date: '2026-11-01',
      description: 'Setoran modal awal pemilik ke kas usaha',
      presetId: 'owner-capital',
      lines: [
        { accountCode: '1-101', debit: 25000000, credit: 0 },
        { accountCode: '3-101', debit: 0, credit: 25000000 },
      ],
    },
    {
      id: 'JRN-002',
      date: '2026-11-02',
      description: 'Pembelian mesin espresso & etalase toko tunai',
      presetId: 'buy-equipment',
      lines: [
        { accountCode: '1-201', debit: 12000000, credit: 0 },
        { accountCode: '1-101', debit: 0, credit: 12000000 },
      ],
    },
    {
      id: 'JRN-003',
      date: '2026-11-03',
      description: 'Pembelian stok biji kopi, susu & tepung (tunai)',
      presetId: 'buy-stock-cash',
      lines: [
        { accountCode: '1-103', debit: 6500000, credit: 0 },
        { accountCode: '1-101', debit: 0, credit: 6500000 },
      ],
    },
    {
      id: 'JRN-004',
      date: '2026-11-05',
      description: 'Pembelian stok kemasan & bahan baku tempo 14 hari',
      presetId: 'buy-stock-credit',
      lines: [
        { accountCode: '1-103', debit: 2500000, credit: 0 },
        { accountCode: '2-101', debit: 0, credit: 2500000 },
      ],
    },
    {
      id: 'JRN-005',
      date: '2026-11-10',
      description: 'Penjualan harian gerai & pesan antar (tunai/QRIS)',
      presetId: 'cash-sale',
      lines: [
        { accountCode: '1-101', debit: 14800000, credit: 0 },
        { accountCode: '4-101', debit: 0, credit: 14800000 },
      ],
    },
    {
      id: 'JRN-006',
      date: '2026-11-12',
      description: 'Penjualan katering rapat kantor (pembayaran tempo)',
      presetId: 'credit-sale',
      lines: [
        { accountCode: '1-102', debit: 3200000, credit: 0 },
        { accountCode: '4-101', debit: 0, credit: 3200000 },
      ],
    },
    {
      id: 'JRN-007',
      date: '2026-11-15',
      description: 'Pengakuan Harga Pokok Penjualan bahan terjual',
      presetId: 'record-cogs',
      lines: [
        { accountCode: '5-101', debit: 6200000, credit: 0 },
        { accountCode: '1-103', debit: 0, credit: 6200000 },
      ],
    },
    {
      id: 'JRN-008',
      date: '2026-11-18',
      description: 'Pelunasan sebagian tagihan katering kantor',
      presetId: 'collect-ar',
      lines: [
        { accountCode: '1-101', debit: 2000000, credit: 0 },
        { accountCode: '1-102', debit: 0, credit: 2000000 },
      ],
    },
    {
      id: 'JRN-009',
      date: '2026-11-20',
      description: 'Pembayaran sewa tempat & tagihan listrik/air',
      presetId: 'pay-rent-util',
      lines: [
        { accountCode: '5-202', debit: 2400000, credit: 0 },
        { accountCode: '1-101', debit: 0, credit: 2400000 },
      ],
    },
    {
      id: 'JRN-010',
      date: '2026-11-22',
      description: 'Pembayaran gaji 2 barista & kasir',
      presetId: 'pay-salary',
      lines: [
        { accountCode: '5-201', debit: 3600000, credit: 0 },
        { accountCode: '1-101', debit: 0, credit: 3600000 },
      ],
    },
    {
      id: 'JRN-011',
      date: '2026-11-24',
      description: 'Pelunasan utang kemasan kepada supplier',
      presetId: 'pay-ap',
      lines: [
        { accountCode: '2-101', debit: 1500000, credit: 0 },
        { accountCode: '1-101', debit: 0, credit: 1500000 },
      ],
    },
    {
      id: 'JRN-012',
      date: '2026-11-25',
      description: 'Penarikan prive pemilik untuk kebutuhan pribadi',
      presetId: 'owner-draw',
      lines: [
        { accountCode: '3-201', debit: 1000000, credit: 0 },
        { accountCode: '1-101', debit: 0, credit: 1000000 },
      ],
    },
    {
      id: 'JRN-013',
      date: '2026-11-26',
      description: 'Penyesuaian penyusutan peralatan bulan November',
      presetId: 'depreciation',
      lines: [
        { accountCode: '5-204', debit: 250000, credit: 0 },
        { accountCode: '1-202', debit: 0, credit: 250000 },
      ],
    },
  ],
};

export function validateJournalEntry(entry) {
  const errors = [];
  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Data transaksi tidak valid.'], totalDebit: 0, totalCredit: 0 };
  }
  if (!entry.date) errors.push('Tanggal transaksi wajib diisi.');
  if (!entry.description || String(entry.description).trim().length < 3) {
    errors.push('Keterangan transaksi minimal 3 karakter.');
  }
  const lines = Array.isArray(entry.lines) ? entry.lines : [];
  if (lines.length < 2) {
    errors.push('Jurnal minimal memiliki 2 baris (sisi Debit dan sisi Kredit).');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const acc = ACCOUNT_MAP[ln.accountCode];
    if (!acc) {
      errors.push(`Baris ${i + 1}: kode akun "${ln.accountCode}" tidak ditemukan.`);
    }
    const d = Number(ln.debit || 0);
    const c = Number(ln.credit || 0);
    if (!Number.isFinite(d) || !Number.isFinite(c) || d < 0 || c < 0) {
      errors.push(`Baris ${i + 1}: nominal tidak boleh negatif.`);
    }
    if (d > 0 && c > 0) {
      errors.push(`Baris ${i + 1}: satu baris akun hanya boleh mengisi Debit ATAU Kredit.`);
    }
    totalDebit += d;
    totalCredit += c;
  }

  if (totalDebit <= 0 || totalCredit <= 0) {
    errors.push('Total Debit dan Total Kredit harus lebih besar dari Rp0.');
  }
  if (Math.round(totalDebit) !== Math.round(totalCredit)) {
    errors.push(
      `Prinsip keseimbangan gagal: Total Debit (Rp${totalDebit.toLocaleString('id-ID')}) ≠ Total Kredit (Rp${totalCredit.toLocaleString('id-ID')}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
  };
}

function classifyCashFlowActivity(entry) {
  const counterparts = (entry.lines || []).filter((l) => l.accountCode !== '1-101');
  if (counterparts.some((l) => ACCOUNT_MAP[l.accountCode]?.cashFlowGroup === 'investing')) {
    return 'investing';
  }
  if (counterparts.some((l) => ACCOUNT_MAP[l.accountCode]?.cashFlowGroup === 'financing')) {
    return 'financing';
  }
  return 'operating';
}

export function computeUmkmAccounting(entries = []) {
  const ledgerMap = new Map();
  for (const acc of UMKM_CHART_OF_ACCOUNTS) {
    ledgerMap.set(acc.code, {
      ...acc,
      totalDebit: 0,
      totalCredit: 0,
      balance: 0,
    });
  }

  let journalTotalDebit = 0;
  let journalTotalCredit = 0;
  const unbalancedEntries = [];

  const cashFlowItems = {
    operating: [],
    investing: [],
    financing: [],
  };

  for (const entry of entries) {
    const check = validateJournalEntry(entry);
    if (!check.valid) {
      unbalancedEntries.push({ id: entry.id, errors: check.errors });
    }
    journalTotalDebit += check.totalDebit;
    journalTotalCredit += check.totalCredit;

    let entryCashDelta = 0;
    for (const ln of entry.lines || []) {
      const d = Number(ln.debit || 0);
      const c = Number(ln.credit || 0);
      const row = ledgerMap.get(ln.accountCode);
      if (row) {
        row.totalDebit += d;
        row.totalCredit += c;
      }
      if (ln.accountCode === '1-101') {
        entryCashDelta += d - c;
      }
    }

    if (entryCashDelta !== 0) {
      const activity = classifyCashFlowActivity(entry);
      cashFlowItems[activity].push({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        amount: entryCashDelta,
      });
    }
  }

  const trialBalance = [];
  let tbDebit = 0;
  let tbCredit = 0;

  for (const row of ledgerMap.values()) {
    const net = row.totalDebit - row.totalCredit;
    row.balance = row.normalSide === 'debit' ? net : -net;
    const tbD = net > 0 ? net : 0;
    const tbC = net < 0 ? -net : 0;
    tbDebit += tbD;
    tbCredit += tbC;
    if (row.totalDebit > 0 || row.totalCredit > 0) {
      trialBalance.push({
        ...row,
        tbDebit: tbD,
        tbCredit: tbC,
      });
    }
  }

  const getBal = (code) => ledgerMap.get(code)?.balance || 0;

  // 1. Laporan Laba Rugi
  const revenueAccounts = [...ledgerMap.values()].filter((a) => a.category === 'revenue' && a.balance !== 0);
  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0);
  const cogs = getBal('5-101');
  const grossProfit = getBal('4-101') - cogs;
  const operatingExpenses = [...ledgerMap.values()].filter(
    (a) => a.category === 'expense' && !a.isCogs && a.balance !== 0
  );
  const totalOperatingExpenses = operatingExpenses.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = cogs + totalOperatingExpenses;
  const netIncome = totalRevenue - totalExpenses;

  // 2. Laporan Perubahan Ekuitas & Neraca
  const ownerCapital = getBal('3-101');
  const ownerDrawings = getBal('3-201');
  const endingEquity = ownerCapital - ownerDrawings + netIncome;

  const currentAssetAccounts = [...ledgerMap.values()].filter(
    (a) => a.category === 'asset' && !a.isFixed && a.balance !== 0
  );
  const totalCurrentAssets = currentAssetAccounts.reduce((s, a) => s + a.balance, 0);

  const equipmentGross = getBal('1-201');
  const accDep = getBal('1-202');
  const totalFixedAssets = equipmentGross - accDep;
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const shortTermLiabAccounts = [...ledgerMap.values()].filter(
    (a) => a.category === 'liability' && !a.isLongTerm && a.balance !== 0
  );
  const longTermLiabAccounts = [...ledgerMap.values()].filter(
    (a) => a.category === 'liability' && a.isLongTerm && a.balance !== 0
  );
  const totalShortTermLiab = shortTermLiabAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLongTermLiab = longTermLiabAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = totalShortTermLiab + totalLongTermLiab;
  const totalLiabilitiesAndEquity = totalLiabilities + endingEquity;
  const balanceDiff = totalAssets - totalLiabilitiesAndEquity;

  // 3. Laporan Arus Kas
  const sumCf = (arr) => arr.reduce((s, x) => s + x.amount, 0);
  const operatingCash = sumCf(cashFlowItems.operating);
  const investingCash = sumCf(cashFlowItems.investing);
  const financingCash = sumCf(cashFlowItems.financing);
  const netCashChange = operatingCash + investingCash + financingCash;
  const beginningCash = 0;
  const endingCash = beginningCash + netCashChange;
  const cashLedgerBalance = getBal('1-101');

  return {
    journalTotalDebit,
    journalTotalCredit,
    isJournalBalanced:
      unbalancedEntries.length === 0 && Math.round(journalTotalDebit) === Math.round(journalTotalCredit),
    unbalancedEntries,
    trialBalance,
    tbDebit,
    tbCredit,
    isTrialBalanced: Math.round(tbDebit) === Math.round(tbCredit),
    incomeStatement: {
      revenueAccounts,
      totalRevenue,
      cogs,
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      totalExpenses,
      netIncome,
    },
    balanceSheet: {
      currentAssetAccounts,
      totalCurrentAssets,
      equipmentGross,
      accDep,
      totalFixedAssets,
      totalAssets,
      shortTermLiabAccounts,
      longTermLiabAccounts,
      totalShortTermLiab,
      totalLongTermLiab,
      totalLiabilities,
      ownerCapital,
      ownerDrawings,
      netIncome,
      endingEquity,
      totalLiabilitiesAndEquity,
      balanceDiff,
      isBalanced: Math.round(balanceDiff) === 0,
    },
    cashFlow: {
      items: cashFlowItems,
      operatingCash,
      investingCash,
      financingCash,
      netCashChange,
      beginningCash,
      endingCash,
      cashLedgerBalance,
      isCashReconciled: Math.round(endingCash) === Math.round(cashLedgerBalance),
    },
  };
}
