import {
  BAB6_CONCEPTS,
  PT_ABC_CASE,
  TABLE_6_1_SINGLE_STEP,
  TABLE_6_3_EQUITY_SOLE,
  TABLE_6_5_BALANCE_SHEET,
} from '../data/bab6Data.js';
import {
  computeBalanceSheet,
  computeEquityChange,
  computePtAbcSummary,
  computeSingleStep,
  formatPct,
  formatRp,
} from '../engine/accounting.js';
import { renderBalanceScaleSvg } from './charts.js';

export function renderOverviewView(container, { onNavigate }) {
  const ss = computeSingleStep(TABLE_6_1_SINGLE_STEP, 'actual');
  const eqSole = computeEquityChange(TABLE_6_3_EQUITY_SOLE);
  const nr = computeBalanceSheet(TABLE_6_5_BALANCE_SHEET);
  const abc = computePtAbcSummary(PT_ABC_CASE);

  const curRatio23 = abc.y2023.currentAssets / abc.y2023.shortTermLiab;
  const assetShareCurrent = (nr.totalCurrentAssets / nr.totalAssets) * 100;
  const assetShareFixed = (nr.totalFixedAssets / nr.totalAssets) * 100;

  container.innerHTML = `
    <section class="ledger-mast" aria-label="Pita keseimbangan neraca utama">
      <div class="ledger-mast-top">
        <span class="badge badge-ok">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          NERACA SEIMBANG
        </span>
        <div class="mast-actions">
          <button type="button" class="btn btn-primary btn-sm" data-goto="umkm">
            Buka Pembukuan UMKM
          </button>
        </div>
      </div>

      <div class="ledger-proof-grid">
        <div class="proof-cell">
          <span class="proof-label">Total Aset (Lancar Maju)</span>
          <span class="proof-value">${formatRp(nr.totalAssets)}</span>
        </div>
        <div class="proof-cell">
          <span class="proof-label">Total Liabilitas</span>
          <span class="proof-value">${formatRp(nr.totalLiabilities)}</span>
        </div>
        <div class="proof-cell">
          <span class="proof-label">Total Ekuitas</span>
          <span class="proof-value">${formatRp(nr.totalEquity)}</span>
        </div>
      </div>
    </section>

    <section class="kpi-grid" aria-label="Ikhtisar metrik usaha">
      <article class="kpi-card">
        <span class="kpi-label">Laba Bersih (Rambak Maju)</span>
        <span class="kpi-value">${formatRp(ss.netIncome)}</span>
        <span class="kpi-meta">Single Step aktual (referensi buku: Rp9.495.000)</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Ekuitas Akhir (Laundry Resik)</span>
        <span class="kpi-value">${formatRp(eqSole.endingCapital)}</span>
        <span class="kpi-meta">Usaha perorangan per 31 Des 2023</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Laba Bersih 2023 (PT ABC)</span>
        <span class="kpi-value">${formatRp(abc.y2023.eat, { unitScale: 1_000_000 })}</span>
        <span class="kpi-meta">Tumbuh +147,4% dari Rp380 jt (2022)</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Rasio Lancar 2023 (PT ABC)</span>
        <span class="kpi-value">${formatPct(curRatio23)}</span>
        <span class="kpi-meta">Aset tidak tetap menutup utang jangka pendek</span>
      </article>
    </section>

    <div class="grid-split">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Komposisi Neraca Usaha Jasa Lancar Maju</h3>
            <p class="panel-subtitle">Proporsi aset lancar vs aset tetap serta pendanaan ekuitas</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-goto="statements">Lihat Contoh Laporan</button>
        </div>
        <div class="meter-list" style="margin-bottom:14px;">
          <div class="meter-row">
            <div class="meter-head">
              <span>Aset Tidak Tetap (Lancar)</span>
              <span class="tabular">${formatRp(nr.totalCurrentAssets)} (${assetShareCurrent.toFixed(1)}%)</span>
            </div>
            <div class="meter-track"><div class="meter-fill" style="width:${assetShareCurrent.toFixed(1)}%"></div></div>
          </div>
          <div class="meter-row">
            <div class="meter-head">
              <span>Aset Tetap (Nilai Buku)</span>
              <span class="tabular">${formatRp(nr.totalFixedAssets)} (${assetShareFixed.toFixed(1)}%)</span>
            </div>
            <div class="meter-track"><div class="meter-fill secondary" style="width:${assetShareFixed.toFixed(1)}%"></div></div>
          </div>
          <div class="meter-row">
            <div class="meter-head">
              <span>Pendanaan Ekuitas Pemilik</span>
              <span class="tabular">${formatRp(nr.totalEquity)} (${((nr.totalEquity / nr.totalAssets) * 100).toFixed(1)}%)</span>
            </div>
            <div class="meter-track"><div class="meter-fill" style="width:${((nr.totalEquity / nr.totalAssets) * 100).toFixed(1)}%"></div></div>
          </div>
        </div>
        ${renderBalanceScaleSvg({
          currentAssets: nr.totalCurrentAssets,
          fixedAssets: nr.totalFixedAssets,
          liabilities: nr.totalLiabilities,
          equity: nr.totalEquity,
          isBalanced: nr.isBalanced,
        })}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Pihak Pengguna Laporan Keuangan</h3>
            <p class="panel-subtitle">Manfaat laporan keuangan bagi pemangku kepentingan bisnis</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-goto="casestudy">Analisis Rasio</button>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Fokus Keputusan</th>
              </tr>
            </thead>
            <tbody>
              ${BAB6_CONCEPTS.penggunaLaporan
                .map(
                  (u) => `
                  <tr>
                    <td><strong>${u.pihak}</strong></td>
                    <td>${u.fokus}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Empat Pilar Analisis Laporan Keuangan</h3>
          <p class="panel-subtitle">Kerangka kerja evaluasi sebelum membaca rasio likuiditas, solvabilitas, dan rentabilitas</p>
        </div>
      </div>
      <div class="grid-cards">
        ${BAB6_CONCEPTS.tujuanAnalisis
          .map(
            (item) => `
            <div class="concept-card">
              <h4>${item.kode}</h4>
              <p style="margin:0;font-size:13px;color:var(--text-secondary);">${item.arti}</p>
            </div>
          `
          )
          .join('')}
      </div>
    </section>
  `;

  container.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => onNavigate(btn.dataset.goto));
  });
}
