import {
  TABLE_6_1_SINGLE_STEP,
  TABLE_6_2_MULTIPLE_STEP,
  TABLE_6_3_EQUITY_SOLE,
  TABLE_6_4_RETAINED_PT,
  TABLE_6_5_BALANCE_SHEET,
} from '../data/bab6Data.js';
import {
  computeBalanceSheet,
  computeEquityChange,
  computeMultipleStep,
  computeSingleStep,
  formatRp,
} from '../engine/accounting.js';

const SUBTABS = [
  { id: 't61', label: '6.1 LR Single Step' },
  { id: 't62', label: '6.2 LR Multiple Step' },
  { id: 't63', label: '6.3 & 6.4 Ekuitas' },
  { id: 't65', label: '6.5 Neraca' },
];

function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderStatementsView(container, state, { onStateChange }) {
  const activeTab = state.statementTab || 't61';
  const calcMode = state.calcMode || 'actual';
  const searchQuery = (state.statementQuery || '').trim().toLowerCase();

  const matches = (text) => !searchQuery || text.toLowerCase().includes(searchQuery);

  let bodyHtml = '';

  if (activeTab === 't61') {
    const calc = computeSingleStep(TABLE_6_1_SINGLE_STEP, calcMode);
    const revRows = TABLE_6_1_SINGLE_STEP.revenues.filter((r) => matches(r.name) || matches(r.code));
    const expRows = TABLE_6_1_SINGLE_STEP.expenses.filter((e) => matches(e.name) || matches(e.code));

    bodyHtml = `
      <div class="alert alert-warn" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div><strong>Catatan Rekonsiliasi:</strong> ${TABLE_6_1_SINGLE_STEP.bookValues.errataNote}</div>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${TABLE_6_1_SINGLE_STEP.company} — ${TABLE_6_1_SINGLE_STEP.title}</h3>
            <p class="panel-subtitle">${TABLE_6_1_SINGLE_STEP.period}</p>
          </div>
          <span class="badge ${calcMode === 'actual' ? 'badge-ok' : 'badge-warn'}">
            ${calcMode === 'actual' ? 'Hitungan Rumus Aktual' : 'Mode Cetakan Buku'}
          </span>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Uraian Akun</th>
                <th class="num">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="row-section"><td colspan="3">Pendapatan</td></tr>
              ${revRows
                .map(
                  (r) => `
                  <tr>
                    <td class="code-tag">${r.code}</td>
                    <td>${r.name}</td>
                    <td class="num">${formatRp(r.amount, { decimals: 2 })}</td>
                  </tr>`
                )
                .join('')}
              <tr class="row-subtotal">
                <td></td>
                <td>Total Pendapatan</td>
                <td class="num">${formatRp(calc.totalRevenue, { decimals: 2 })}</td>
              </tr>
              <tr class="row-section"><td colspan="3">Biaya-Biaya</td></tr>
              ${expRows
                .map(
                  (e) => `
                  <tr>
                    <td class="code-tag">${e.code}</td>
                    <td>${e.name}</td>
                    <td class="num">${formatRp(e.amount, { decimals: 2 })}</td>
                  </tr>`
                )
                .join('')}
              <tr class="row-subtotal">
                <td></td>
                <td>Jumlah Biaya</td>
                <td class="num">${formatRp(calc.totalExpense, { decimals: 2 })}</td>
              </tr>
              <tr class="row-total">
                <td></td>
                <td>Laba Bersih</td>
                <td class="num">${formatRp(calc.netIncome, { decimals: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  } else if (activeTab === 't62') {
    const d = TABLE_6_2_MULTIPLE_STEP;
    const calc = computeMultipleStep(d, calcMode);

    const rows = [
      { kind: 'subtotal', code: '4-100', name: 'Hasil Penjualan', val: d.sales },
      { kind: 'section', name: 'Harga Pokok Penjualan' },
      { kind: 'row', code: '5-101', name: 'Persediaan barang 1 Desember', val: d.cogs.beginningInventory },
      { kind: 'row', code: '5-102', name: 'Pembelian bersih', val: d.cogs.netPurchases },
      { kind: 'subtotal', code: '', name: 'Barang dagangan tersedia dijual', val: calc.goodsAvailable },
      { kind: 'row', code: '5-103', name: 'Persediaan barang dagangan 31 Desember', val: d.cogs.endingInventory },
      { kind: 'subtotal', code: '', name: 'Harga Pokok Barang yang Dijual', val: calc.cogsTotal },
      { kind: 'total', code: '', name: 'Laba Kotor Penjualan', val: calc.grossProfit },
      { kind: 'section', name: 'Biaya Penjualan' },
      ...d.sellingExpenses.map((x) => ({ kind: 'row', ...x, val: x.amount })),
      { kind: 'subtotal', code: '', name: 'Jumlah Biaya Penjualan', val: calc.sellingTotal },
      { kind: 'section', name: 'Biaya Umum dan Administrasi' },
      ...d.adminExpenses.map((x) => ({ kind: 'row', ...x, val: x.amount })),
      { kind: 'subtotal', code: '', name: 'Jumlah Biaya Umum dan Administrasi', val: calc.adminTotal },
      { kind: 'subtotal', code: '', name: 'Jumlah Biaya Usaha', val: calc.operatingExpenseTotal },
      { kind: 'subtotal', code: '', name: 'Laba Usaha', val: calc.operatingIncome },
      { kind: 'row', code: '4-900', name: 'Pendapatan Lain-Lain: Pendapatan sewa', val: d.otherRevenue },
      { kind: 'row', code: '5-900', name: 'Biaya Lain-Lain', val: d.otherExpense },
      { kind: 'subtotal', code: '', name: 'Selisih Pendapatan & Biaya Lain-Lain', val: calc.otherNet },
      { kind: 'total', code: '', name: 'Laba Bersih Sebelum Pajak', val: calc.ebt },
    ].filter((r) => r.kind !== 'row' || matches(r.name) || matches(r.code || ''));

    bodyHtml = `
      <div class="alert alert-warn" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div><strong>Catatan Rekonsiliasi:</strong> ${d.bookValues.errataNote}</div>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${d.company} — ${d.title}</h3>
            <p class="panel-subtitle">${d.period}</p>
          </div>
          <span class="badge ${calcMode === 'actual' ? 'badge-ok' : 'badge-warn'}">
            ${calcMode === 'actual' ? 'Hitungan Rumus Aktual' : 'Mode Cetakan Buku'}
          </span>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Uraian Akun</th>
                <th class="num">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((r) => {
                  if (r.kind === 'section') {
                    return `<tr class="row-section"><td colspan="3">${r.name}</td></tr>`;
                  }
                  const cls = r.kind === 'subtotal' ? 'row-subtotal' : r.kind === 'total' ? 'row-total' : '';
                  return `
                    <tr class="${cls}">
                      <td class="code-tag">${r.code || ''}</td>
                      <td>${r.name}</td>
                      <td class="num">${formatRp(r.val, { decimals: 2 })}</td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  } else if (activeTab === 't63') {
    const eq1 = computeEquityChange(TABLE_6_3_EQUITY_SOLE);
    const eq2 = computeEquityChange(TABLE_6_4_RETAINED_PT);

    const renderEquityCard = (tbl, calc) => `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${tbl.tableLabel} · ${tbl.title}</h3>
            <p class="panel-subtitle">${tbl.company} | ${tbl.period}</p>
          </div>
          <span class="badge badge-ok">100% Sesuai</span>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Uraian</th>
                <th class="num">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>${tbl.beginningLabel}</td><td class="num">${formatRp(tbl.beginningCapital, { decimals: 2 })}</td></tr>
              <tr><td>${tbl.netIncomeLabel}</td><td class="num">${formatRp(tbl.netIncome, { decimals: 2 })}</td></tr>
              <tr><td>${tbl.deductionLabel}</td><td class="num">${formatRp(tbl.deduction, { decimals: 2 })}</td></tr>
              <tr class="row-subtotal"><td>Penambahan dalam modal</td><td class="num">${formatRp(calc.netChange, { decimals: 2 })}</td></tr>
              <tr class="row-total"><td>${tbl.endingLabel}</td><td class="num">${formatRp(calc.endingCapital, { decimals: 2 })}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `;

    bodyHtml = `<div class="grid-split">${renderEquityCard(TABLE_6_3_EQUITY_SOLE, eq1)}${renderEquityCard(TABLE_6_4_RETAINED_PT, eq2)}</div>`;
  } else if (activeTab === 't65') {
    const d = TABLE_6_5_BALANCE_SHEET;
    const calc = computeBalanceSheet(d);

    bodyHtml = `
      <section class="ledger-mast">
        <div class="ledger-mast-top">
          <span class="badge badge-ok">${calc.isBalanced ? 'NERACA SEIMBANG' : 'SELISIH'}</span>
        </div>
        <div class="ledger-proof-grid">
          <div class="proof-cell">
            <span class="proof-label">Jumlah Aset</span>
            <span class="proof-value">${formatRp(calc.totalAssets)}</span>
          </div>
          <div class="proof-cell">
            <span class="proof-label">Total Liabilitas</span>
            <span class="proof-value">${formatRp(calc.totalLiabilities)}</span>
          </div>
          <div class="proof-cell">
            <span class="proof-label">Total Ekuitas</span>
            <span class="proof-value">${formatRp(calc.totalEquity)}</span>
          </div>
        </div>
      </section>

      <div class="alert alert-warn" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>${d.errataNote}</div>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">${d.company} — ${d.title}</h3>
            <p class="panel-subtitle">${d.period}</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Akun Neraca</th>
                <th class="num">Nilai / Akumulasi (Rp)</th>
                <th class="num">Nilai Bersih / Golongan (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="row-section"><td colspan="4">Aset Tidak Tetap (Aset Lancar)</td></tr>
              ${d.currentAssets
                .filter((a) => matches(a.name) || matches(a.code))
                .map(
                  (a) => `
                  <tr>
                    <td class="code-tag">${a.code}</td>
                    <td>${a.name}</td>
                    <td class="num">${formatRp(a.amount, { decimals: 2 })}</td>
                    <td class="num"></td>
                  </tr>`
                )
                .join('')}
              <tr class="row-subtotal">
                <td></td>
                <td>Jumlah Aset Tidak Tetap</td>
                <td></td>
                <td class="num">${formatRp(calc.totalCurrentAssets, { decimals: 2 })}</td>
              </tr>
              <tr class="row-section"><td colspan="4">Aset Tetap</td></tr>
              ${calc.fixedRows
                .filter((f) => matches(f.name) || matches(f.code))
                .map(
                  (f) => `
                  <tr>
                    <td class="code-tag">${f.code}</td>
                    <td>${f.name} ${f.accDep > 0 ? `(Perolehan ${formatRp(f.cost)} - Akum. Depresiasi ${formatRp(f.accDep)})` : ''}</td>
                    <td class="num">${formatRp(f.cost)}</td>
                    <td class="num">${formatRp(f.netValue, { decimals: 2 })}</td>
                  </tr>`
                )
                .join('')}
              <tr class="row-subtotal">
                <td></td>
                <td>Jumlah Aset Tetap</td>
                <td></td>
                <td class="num">${formatRp(calc.totalFixedAssets, { decimals: 2 })}</td>
              </tr>
              <tr class="row-total">
                <td></td>
                <td>JUMLAH ASET</td>
                <td></td>
                <td class="num">${formatRp(calc.totalAssets, { decimals: 2 })}</td>
              </tr>
              <tr class="row-section"><td colspan="4">Liabilitas Jangka Pendek</td></tr>
              ${d.shortTermLiabilities
                .filter((l) => matches(l.name) || matches(l.code))
                .map(
                  (l) => `
                  <tr>
                    <td class="code-tag">${l.code}</td>
                    <td>${l.name}</td>
                    <td class="num">${formatRp(l.amount, { decimals: 2 })}</td>
                    <td class="num"></td>
                  </tr>`
                )
                .join('')}
              <tr class="row-subtotal">
                <td></td>
                <td>Jumlah Liabilitas Jangka Pendek</td>
                <td></td>
                <td class="num">${formatRp(calc.totalShortTermLiabilities, { decimals: 2 })}</td>
              </tr>
              <tr>
                <td class="code-tag">2-200</td>
                <td>Liabilitas Jangka Panjang</td>
                <td></td>
                <td class="num">${formatRp(calc.totalLongTermLiabilities)}</td>
              </tr>
              <tr class="row-subtotal">
                <td></td>
                <td>Jumlah Liabilitas</td>
                <td></td>
                <td class="num">${formatRp(calc.totalLiabilities, { decimals: 2 })}</td>
              </tr>
              <tr>
                <td class="code-tag">3-100</td>
                <td>Ekuitas Pemilik Usaha</td>
                <td></td>
                <td class="num">${formatRp(calc.totalEquity, { decimals: 2 })}</td>
              </tr>
              <tr class="row-total">
                <td></td>
                <td>TOTAL LIABILITAS DAN EKUITAS</td>
                <td></td>
                <td class="num">${formatRp(calc.totalLiabilitiesAndEquity, { decimals: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  container.innerHTML = `
    <div class="toolbar no-print">
      <div class="tab-bar" style="border:none;padding:0;" role="tablist" aria-label="Pilih contoh laporan keuangan">
        ${SUBTABS.map(
          (t) => `<button type="button" role="tab" aria-selected="${activeTab === t.id}" class="tab-btn ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
        ).join('')}
      </div>

      <div class="toolbar-controls">
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="stmt-search" type="search" value="${esc(state.statementQuery || '')}" placeholder="Cari nama atau kode akun..." aria-label="Cari akun laporan" />
        </div>

        <div class="segmented" role="group" aria-label="Mode angka perhitungan">
          <button type="button" class="${calcMode === 'actual' ? 'active' : ''}" data-mode="actual">Rumus Aktual</button>
          <button type="button" class="${calcMode === 'book' ? 'active' : ''}" data-mode="book">Cetakan Buku</button>
        </div>
      </div>
    </div>

    ${bodyHtml}
  `;

  container.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => onStateChange({ statementTab: btn.dataset.tab }));
  });

  container.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => onStateChange({ calcMode: btn.dataset.mode }));
  });

  const searchInput = container.querySelector('#stmt-search');
  if (searchInput) {
    let timer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => onStateChange({ statementQuery: e.target.value }), 180);
    });
  }
}
