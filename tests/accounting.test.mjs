import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CUSTOM_BUSINESS,
  PT_ABC_CASE,
  TABLE_6_1_SINGLE_STEP,
  TABLE_6_2_MULTIPLE_STEP,
  TABLE_6_3_EQUITY_SOLE,
  TABLE_6_4_RETAINED_PT,
  TABLE_6_5_BALANCE_SHEET,
} from '../app/src/data/bab6Data.js';
import {
  computeBalanceSheet,
  computeCustomBusiness,
  computeEquityChange,
  computeMultipleStep,
  computePtAbcSummary,
  computeRatiosFromSnapshot,
  computeSingleStep,
} from '../app/src/engine/accounting.js';
import {
  computeUmkmAccounting,
  DEFAULT_UMKM_STATE,
  getAccountLedger,
  nextJournalId,
  sanitizeUmkmState,
  UMKM_QUICK_PRESETS,
  validateJournalEntry,
} from '../app/src/engine/journalEngine.js';
import { generateCustomWorkbookBytes } from '../app/src/engine/xlsxExporter.js';

test('Tabel 6.1 Single Step (Toko Rambak Maju): mode aktual vs cetakan buku', () => {
  const actual = computeSingleStep(TABLE_6_1_SINGLE_STEP, 'actual');
  assert.equal(actual.totalRevenue, 32150000);
  assert.equal(actual.totalExpense, 23655000);
  assert.equal(actual.netIncome, 8495000);

  const book = computeSingleStep(TABLE_6_1_SINGLE_STEP, 'book');
  assert.equal(book.totalRevenue, 33150000);
  assert.equal(book.netIncome, 9495000);
});

test('Tabel 6.2 Multiple Step (Toko Lancar Transportasi): perhitungan HPP & laba usaha', () => {
  const actual = computeMultipleStep(TABLE_6_2_MULTIPLE_STEP, 'actual');
  assert.equal(actual.goodsAvailable, 17837000);
  assert.equal(actual.cogsTotal, 15262000);
  assert.equal(actual.grossProfit, 17183000);
  assert.equal(actual.sellingTotal, 6120000);
  assert.equal(actual.adminTotal, 5800000);
  assert.equal(actual.operatingExpenseTotal, 11920000);
  assert.equal(actual.operatingIncome, 5263000);
  assert.equal(actual.otherNet, 500000);
  assert.equal(actual.ebt, 5763000);
});

test('Tabel 6.3 & 6.4 Perubahan Ekuitas & Laba Ditahan (Laundry Resik)', () => {
  const eq1 = computeEquityChange(TABLE_6_3_EQUITY_SOLE);
  assert.equal(eq1.netChange, 5178000);
  assert.equal(eq1.endingCapital, 26628000);

  const eq2 = computeEquityChange(TABLE_6_4_RETAINED_PT);
  assert.equal(eq2.netChange, 7625000);
  assert.equal(eq2.endingCapital, 31075000);
});

test('Tabel 6.5 Neraca (Usaha Jasa Lancar Maju): seimbang Rp31.075.000', () => {
  const nr = computeBalanceSheet(TABLE_6_5_BALANCE_SHEET);
  assert.equal(nr.totalCurrentAssets, 13250000);
  assert.equal(nr.totalFixedAssets, 17825000);
  assert.equal(nr.totalAssets, 31075000);
  assert.equal(nr.totalLiabilities, 6200000);
  assert.equal(nr.totalEquity, 24875000);
  assert.equal(nr.isBalanced, true);
});

test('Kasus PT ABC (2022 & 2023) dan 10 Rasio Bab 6', () => {
  const summary = computePtAbcSummary(PT_ABC_CASE);
  assert.equal(summary.y2022.isBalanced, true);
  assert.equal(summary.y2023.isBalanced, true);
  assert.equal(summary.y2023.totalAssets, 16840);
  assert.equal(summary.y2023.eat, 940);

  const ratios23 = computeRatiosFromSnapshot(summary.y2023);
  assert.equal(ratios23.length, 10);

  const byId = Object.fromEntries(ratios23.map((r) => [r.id, r.value]));
  assert.ok(Math.abs(byId['current-ratio'] - 5140 / 2650) < 1e-6);
  assert.ok(Math.abs(byId['quick-ratio'] - (5140 - 2500) / 2650) < 1e-6);
  assert.ok(Math.abs(byId['ltl-equity'] - 4000 / 10190) < 1e-6);
  assert.ok(Math.abs(byId['debt-equity'] - 6650 / 10190) < 1e-6);
  assert.ok(Math.abs(byId['debt-assets'] - 6650 / 16840) < 1e-6);
  assert.ok(Math.abs(byId['interest-coverage'] - 1850 / 440) < 1e-6);
  assert.ok(Math.abs(byId['gross-margin'] - 9630 / 24860) < 1e-6);
  assert.ok(Math.abs(byId['roe'] - 940 / 10190) < 1e-6);
});

test('Kalkulator Usaha Mandiri & Browser XLSX Exporter menghasilkan ZIP valid', () => {
  const calc = computeCustomBusiness(DEFAULT_CUSTOM_BUSINESS);
  assert.equal(calc.isBalanced, true);
  assert.equal(calc.totalAssets, 53500000);
  assert.equal(calc.endingCapital, 39610000);

  const bytes = generateCustomWorkbookBytes(DEFAULT_CUSTOM_BUSINESS, calc);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.equal(bytes[2], 0x03);
  assert.equal(bytes[3], 0x04);
  assert.ok(bytes.length > 2500);
});

test('Mesin Double-Entry UMKM: Debit = Kredit, Neraca Seimbang, dan Arus Kas Sinkron', () => {
  const report = computeUmkmAccounting(DEFAULT_UMKM_STATE.entries);
  assert.equal(report.isJournalBalanced, true);
  assert.equal(report.isTrialBalanced, true);
  assert.equal(report.balanceSheet.isBalanced, true);
  assert.equal(report.cashFlow.isCashReconciled, true);
  assert.equal(report.journalTotalDebit, report.journalTotalCredit);
  assert.equal(report.cashFlow.endingCash, report.cashFlow.cashLedgerBalance);
  assert.ok(report.incomeStatement.netIncome > 0);

  // Tolak transaksi tidak seimbang (Debit != Kredit)
  const badCheck = validateJournalEntry({
    id: 'JRN-BAD',
    date: '2026-11-26',
    description: 'Transaksi tidak seimbang',
    lines: [
      { accountCode: '1-101', debit: 500000, credit: 0 },
      { accountCode: '4-101', debit: 0, credit: 400000 },
    ],
  });
  assert.equal(badCheck.valid, false);
  assert.ok(badCheck.errors.some((e) => e.includes('≠')));

  // Ekspor Excel 4 sheet UMKM
  const bytes = generateCustomWorkbookBytes(DEFAULT_UMKM_STATE, report);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.ok(bytes.length > 3500);
});

test('Stress & Destructive Test: jurnal kosong, ID unik pasca hapus, JSON rusak, pembagi nol & 16 preset', () => {
  // 1. Jurnal kosong (user menghapus semua transaksi)
  const emptyRep = computeUmkmAccounting([]);
  assert.equal(emptyRep.isJournalBalanced, true);
  assert.equal(emptyRep.balanceSheet.isBalanced, true);
  assert.equal(emptyRep.cashFlow.isCashReconciled, true);
  const emptyXlsx = generateCustomWorkbookBytes(
    { businessName: 'Kosong', periodLabel: '2026', entries: [] },
    emptyRep
  );
  const emptyText = new TextDecoder().decode(emptyXlsx);
  assert.equal(emptyText.includes('SUM(E5:E4)'), false);
  assert.equal(emptyText.includes('SUM(C5:C4)'), false);

  // 2. ID unik setelah menghapus transaksi di tengah
  const afterDelete = DEFAULT_UMKM_STATE.entries.filter((e) => e.id !== 'JRN-002');
  assert.equal(nextJournalId(afterDelete), 'JRN-014');

  // 3. Penolakan JSON rusak / tidak seimbang / berbahaya
  assert.equal(sanitizeUmkmState(null).ok, false);
  assert.equal(sanitizeUmkmState({ entries: 'bad' }).ok, false);
  assert.equal(
    sanitizeUmkmState({
      entries: [
        {
          id: 'J1',
          date: '2026-11-26',
          description: 'Negatif',
          lines: [
            { accountCode: '1-101', debit: -100, credit: 0 },
            { accountCode: '4-101', debit: 0, credit: -100 },
          ],
        },
      ],
    }).ok,
    false
  );
  assert.equal(
    sanitizeUmkmState({
      entries: [
        {
          id: 'J1',
          date: '2026-11-26',
          description: 'Kode palsu',
          lines: [
            { accountCode: '9-999', debit: 1000, credit: 0 },
            { accountCode: '4-101', debit: 0, credit: 1000 },
          ],
        },
      ],
    }).ok,
    false
  );

  // 4. Stress test seluruh 16 preset transaksi UMKM
  const stressEntries = UMKM_QUICK_PRESETS.map((p, idx) => ({
    id: `JRN-${String(idx + 1).padStart(3, '0')}`,
    date: '2026-11-26',
    description: p.label,
    presetId: p.id,
    lines: [
      { accountCode: p.debit, debit: (idx + 1) * 150000, credit: 0 },
      { accountCode: p.credit, debit: 0, credit: (idx + 1) * 150000 },
    ],
  }));
  const stressRep = computeUmkmAccounting(stressEntries);
  assert.equal(stressRep.isJournalBalanced, true);
  assert.equal(stressRep.isTrialBalanced, true);
  assert.equal(stressRep.balanceSheet.isBalanced, true);
  assert.equal(stressRep.cashFlow.isCashReconciled, true);

  // 5. Pembagi nol pada rasio keuangan tidak menghasilkan NaN atau Infinity
  const zeroRatios = computeRatiosFromSnapshot({
    cash: 0,
    inventory: 0,
    currentAssets: 0,
    fixedAssets: 0,
    totalAssets: 0,
    shortTermLiab: 0,
    longTermLiab: 0,
    totalLiab: 0,
    totalEquity: 0,
    sales: 0,
    grossProfit: 0,
    ebit: 0,
    interest: 0,
    eat: 0,
  });
  for (const r of zeroRatios) {
    assert.equal(Number.isFinite(r.value), true);
  }

  // 6. Jurnal Split Multi-Baris (3 akun) & Buku Besar Running Balance
  const splitEntry = {
    id: 'JRN-099',
    date: '2026-11-26',
    description: 'Penjualan campuran tunai + tempo',
    presetId: 'split',
    lines: [
      { accountCode: '1-101', debit: 1000000, credit: 0 },
      { accountCode: '1-102', debit: 500000, credit: 0 },
      { accountCode: '4-101', debit: 0, credit: 1500000 },
    ],
  };
  assert.equal(validateJournalEntry(splitEntry).valid, true);
  const splitRep = computeUmkmAccounting([...DEFAULT_UMKM_STATE.entries, splitEntry]);
  assert.equal(splitRep.isJournalBalanced, true);
  assert.equal(splitRep.balanceSheet.isBalanced, true);
  assert.equal(splitRep.cashFlow.isCashReconciled, true);

  const cashLedger = getAccountLedger([...DEFAULT_UMKM_STATE.entries, splitEntry], '1-101');
  assert.equal(cashLedger.endingBalance, splitRep.cashFlow.endingCash);
  assert.ok(cashLedger.rows.length > 5);
});
