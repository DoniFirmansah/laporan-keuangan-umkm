import { PT_ABC_CASE } from '../data/bab6Data.js';
import {
  computePtAbcSummary,
  computeRatiosFromSnapshot,
  formatPct,
  formatRp,
  formatTimes,
} from '../engine/accounting.js';

export function renderCaseStudyView(container, state, { onStateChange }) {
  const summary = computePtAbcSummary(PT_ABC_CASE);
  const ratios22 = computeRatiosFromSnapshot(summary.y2022);
  const ratios23 = computeRatiosFromSnapshot(summary.y2023);
  const activeCat = state.ratioCategory || 'Semua';

  const categories = ['Semua', 'Likuiditas', 'Solvabilitas', 'Rentabilitas'];
  const filteredRatios = ratios23.filter(
    (r) => activeCat === 'Semua' || r.category === activeCat
  );

  const fmtVal = (r) => (r.kind === 'times' ? formatTimes(r.value) : formatPct(r.value));
  const fmtDelta = (v22, v23) => {
    const diff = v23 - v22;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toLocaleString('id-ID')} jt (${sign}${((diff / v22) * 100).toFixed(1)}%)`;
  };

  const renderCompRows = (rows) =>
    rows
      .map(
        (r) => `
        <tr>
          <td class="code-tag">${r.code}</td>
          <td>${r.name}</td>
          <td class="num">${formatRp(r.y2022)}</td>
          <td class="num">${formatRp(r.y2023)}</td>
          <td class="num">${fmtDelta(r.y2022, r.y2023)}</td>
        </tr>`
      )
      .join('');

  container.innerHTML = `
    <section class="ledger-mast">
      <div class="ledger-mast-top">
        <span class="badge badge-ok">Neraca 2022 &amp; 2023 Seimbang</span>
      </div>
      <div class="ledger-proof-grid">
        <div class="proof-cell">
          <span class="proof-label">Total Aset PT ABC (2023)</span>
          <span class="proof-value">Rp16.840 jt</span>
          <span class="proof-sub">2022: Rp16.780 jt</span>
        </div>
        <div class="proof-cell">
          <span class="proof-label">Penjualan Bersih (2023)</span>
          <span class="proof-value">Rp24.860 jt</span>
          <span class="proof-sub">2022: Rp20.750 jt</span>
        </div>
        <div class="proof-cell">
          <span class="proof-label">Laba Bersih Setelah Pajak</span>
          <span class="proof-value">Rp940 jt</span>
          <span class="proof-sub">Naik +147,4% YoY</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Analisis 10 Rasio Keuangan PT ABC (2022 vs 2023)</h3>
          <p class="panel-subtitle">Perbandingan rasio Likuiditas, Solvabilitas, dan Rentabilitas beserta rumus baku</p>
        </div>
        <div class="tab-bar" style="border:none;padding:0;" role="tablist" aria-label="Filter kategori rasio">
          ${categories
            .map(
              (c) => `<button type="button" role="tab" aria-selected="${activeCat === c}" class="tab-btn ${activeCat === c ? 'active' : ''}" data-cat="${c}">${c}</button>`
            )
            .join('')}
        </div>
      </div>

      <div class="grid-cards">
        ${filteredRatios
          .map((r23) => {
            const r22 = ratios22.find((x) => x.id === r23.id);
            const maxBar = r23.kind === 'times' ? 6 : 2.5;
            const w22 = Math.min(100, Math.max(4, (r22.value / maxBar) * 100));
            const w23 = Math.min(100, Math.max(4, (r23.value / maxBar) * 100));
            const badgeCls = r23.status === 'ok' ? 'badge-ok' : r23.status === 'warn' ? 'badge-warn' : 'badge-err';

            return `
              <article class="ratio-card">
                <div class="ratio-head">
                  <div>
                    <span class="code-tag">${r23.category}</span>
                    <h4 class="ratio-name">${r23.name}</h4>
                  </div>
                  <span class="badge ${badgeCls}">${r23.statusText}</span>
                </div>
                <div class="ratio-formula">${r23.formula}</div>
                <div class="ratio-values">
                  <div>
                    <span class="proof-label">2023 (Aktual)</span>
                    <div class="kpi-value" style="font-size:19px">${fmtVal(r23)}</div>
                  </div>
                  <div style="text-align:right">
                    <span class="proof-label">2022</span>
                    <div class="tabular" style="font-size:14.5px;font-weight:600;color:var(--text-secondary)">${fmtVal(r22)}</div>
                  </div>
                </div>
                <div class="meter-list">
                  <div class="meter-row">
                    <div class="meter-head"><span>2023</span><span class="tabular">Ref: ${r23.book2023}</span></div>
                    <div class="meter-track"><div class="meter-fill" style="width:${w23.toFixed(1)}%"></div></div>
                  </div>
                  <div class="meter-row">
                    <div class="meter-head"><span>2022</span><span class="tabular">${fmtVal(r22)}</span></div>
                    <div class="meter-track"><div class="meter-fill secondary" style="width:${w22.toFixed(1)}%"></div></div>
                  </div>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>

    <div class="stack-col">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Neraca Komparatif PT ABC</h3>
            <p class="panel-subtitle">${PT_ABC_CASE.unitLabel} · Per 31 Des 2022 &amp; 2023</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Pos Neraca</th>
                <th class="num">2022 (Jt)</th>
                <th class="num">2023 (Jt)</th>
                <th class="num">Pertumbuhan YoY</th>
              </tr>
            </thead>
            <tbody>
              <tr class="row-section"><td colspan="5">Aset Tidak Tetap (Lancar)</td></tr>
              ${renderCompRows(PT_ABC_CASE.balanceSheet.currentAssets)}
              <tr class="row-subtotal"><td></td><td>Total Aset Tidak Tetap</td><td class="num">${formatRp(summary.y2022.currentAssets)}</td><td class="num">${formatRp(summary.y2023.currentAssets)}</td><td class="num">${fmtDelta(summary.y2022.currentAssets, summary.y2023.currentAssets)}</td></tr>
              <tr class="row-section"><td colspan="5">Aset Tetap</td></tr>
              ${renderCompRows(PT_ABC_CASE.balanceSheet.fixedAssets)}
              <tr class="row-subtotal"><td></td><td>Total Aset Tetap</td><td class="num">${formatRp(summary.y2022.fixedAssets)}</td><td class="num">${formatRp(summary.y2023.fixedAssets)}</td><td class="num">${fmtDelta(summary.y2022.fixedAssets, summary.y2023.fixedAssets)}</td></tr>
              <tr class="row-total"><td></td><td>Total Aset</td><td class="num">${formatRp(summary.y2022.totalAssets)}</td><td class="num">${formatRp(summary.y2023.totalAssets)}</td><td class="num">${fmtDelta(summary.y2022.totalAssets, summary.y2023.totalAssets)}</td></tr>
              <tr class="row-section"><td colspan="5">Kewajiban &amp; Ekuitas</td></tr>
              ${renderCompRows(PT_ABC_CASE.balanceSheet.shortTermLiabilities)}
              <tr class="row-subtotal"><td></td><td>Total Kewajiban Jangka Pendek</td><td class="num">${formatRp(summary.y2022.shortTermLiab)}</td><td class="num">${formatRp(summary.y2023.shortTermLiab)}</td><td class="num">${fmtDelta(summary.y2022.shortTermLiab, summary.y2023.shortTermLiab)}</td></tr>
              ${renderCompRows(PT_ABC_CASE.balanceSheet.longTermLiabilities)}
              <tr class="row-subtotal"><td></td><td>Total Kewajiban</td><td class="num">${formatRp(summary.y2022.totalLiab)}</td><td class="num">${formatRp(summary.y2023.totalLiab)}</td><td class="num">${fmtDelta(summary.y2022.totalLiab, summary.y2023.totalLiab)}</td></tr>
              ${renderCompRows(PT_ABC_CASE.balanceSheet.equity)}
              <tr class="row-total"><td></td><td>Total Kewajiban &amp; Ekuitas</td><td class="num">${formatRp(summary.y2022.totalLiabEquity)}</td><td class="num">${formatRp(summary.y2023.totalLiabEquity)}</td><td class="num">${fmtDelta(summary.y2022.totalLiabEquity, summary.y2023.totalLiabEquity)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Laporan Laba Rugi Komparatif PT ABC</h3>
            <p class="panel-subtitle">${PT_ABC_CASE.unitLabel} · Periode 2022 &amp; 2023</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Pos Laba Rugi</th>
                <th class="num">2022 (Jt)</th>
                <th class="num">2023 (Jt)</th>
                <th class="num">Pertumbuhan YoY</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="code-tag">4-100</td><td>Penjualan bersih</td><td class="num">${formatRp(summary.y2022.sales)}</td><td class="num">${formatRp(summary.y2023.sales)}</td><td class="num">${fmtDelta(summary.y2022.sales, summary.y2023.sales)}</td></tr>
              <tr><td class="code-tag">5-100</td><td>Harga pokok penjualan</td><td class="num">${formatRp(summary.y2022.cogs)}</td><td class="num">${formatRp(summary.y2023.cogs)}</td><td class="num">${fmtDelta(summary.y2022.cogs, summary.y2023.cogs)}</td></tr>
              <tr class="row-subtotal"><td></td><td>Laba kotor</td><td class="num">${formatRp(summary.y2022.grossProfit)}</td><td class="num">${formatRp(summary.y2023.grossProfit)}</td><td class="num">${fmtDelta(summary.y2022.grossProfit, summary.y2023.grossProfit)}</td></tr>
              <tr class="row-section"><td colspan="5">Beban Operasi</td></tr>
              ${renderCompRows(PT_ABC_CASE.incomeStatement.operatingExpenses)}
              <tr class="row-subtotal"><td></td><td>Total beban operasi</td><td class="num">${formatRp(summary.y2022.opex)}</td><td class="num">${formatRp(summary.y2023.opex)}</td><td class="num">${fmtDelta(summary.y2022.opex, summary.y2023.opex)}</td></tr>
              <tr class="row-subtotal"><td></td><td>EBIT (Sebelum Bunga &amp; Pajak)</td><td class="num">${formatRp(summary.y2022.ebit)}</td><td class="num">${formatRp(summary.y2023.ebit)}</td><td class="num">${fmtDelta(summary.y2022.ebit, summary.y2023.ebit)}</td></tr>
              <tr><td class="code-tag">5-301</td><td>Beban bunga</td><td class="num">${formatRp(summary.y2022.interest)}</td><td class="num">${formatRp(summary.y2023.interest)}</td><td class="num">${fmtDelta(summary.y2022.interest, summary.y2023.interest)}</td></tr>
              <tr class="row-subtotal"><td></td><td>EBT (Sebelum Pajak)</td><td class="num">${formatRp(summary.y2022.ebt)}</td><td class="num">${formatRp(summary.y2023.ebt)}</td><td class="num">${fmtDelta(summary.y2022.ebt, summary.y2023.ebt)}</td></tr>
              <tr><td class="code-tag">5-401</td><td>Pajak penghasilan</td><td class="num">${formatRp(summary.y2022.tax)}</td><td class="num">${formatRp(summary.y2023.tax)}</td><td class="num">${fmtDelta(summary.y2022.tax, summary.y2023.tax)}</td></tr>
              <tr class="row-total"><td></td><td>Laba Bersih Setelah Pajak (EAT)</td><td class="num">${formatRp(summary.y2022.eat)}</td><td class="num">${formatRp(summary.y2023.eat)}</td><td class="num">${fmtDelta(summary.y2022.eat, summary.y2023.eat)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  container.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => onStateChange({ ratioCategory: btn.dataset.cat }));
  });
}
