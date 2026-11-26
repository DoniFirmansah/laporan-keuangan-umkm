import {
  computeCustomBusiness,
  formatPct,
  formatRp,
  formatTimes,
} from '../engine/accounting.js';
import { downloadCustomWorkbook } from '../engine/xlsxExporter.js';

function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderBuilderView(
  container,
  state,
  { onUpdateCustom, onOpenAddDialog, onOpenResetDialog, onToast }
) {
  const custom = state.customBusiness;
  const calc = computeCustomBusiness(custom);

  const renderGroupRows = (groupKey, items) =>
    items
      .map(
        (item, idx) => `
        <tr>
          <td>${esc(item.name)}</td>
          <td class="num">
            <input
              type="number"
              class="num-input"
              min="0"
              step="1000"
              value="${Number(item.amount || 0)}"
              data-group="${groupKey}"
              data-idx="${idx}"
              aria-label="Nominal ${esc(item.name)}"
            />
          </td>
          <td style="width:44px;text-align:right">
            ${
              items.length > 1
                ? `<button type="button" class="icon-btn" data-del-group="${groupKey}" data-del-idx="${idx}" aria-label="Hapus ${esc(item.name)}" title="Hapus akun">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>`
                : ''
            }
          </td>
        </tr>`
      )
      .join('');

  container.innerHTML = `
    <section class="ledger-mast">
      <div class="ledger-mast-top">
        <span class="badge ${calc.isBalanced ? 'badge-ok' : 'badge-err'}">
          ${calc.isBalanced ? 'NERACA SEIMBANG' : 'TIDAK SEIMBANG'}
        </span>
        <div class="mast-actions">
          <button type="button" id="add-account-btn" class="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Akun
          </button>
          <button type="button" id="reset-builder-btn" class="btn btn-ghost btn-sm">Reset Contoh</button>
          <button type="button" id="export-custom-xlsx" class="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Unduh Laporan Excel
          </button>
        </div>
      </div>

      <div class="ledger-proof-grid">
        <div class="proof-cell">
          <span class="proof-label">Total Aset</span>
          <span class="proof-value">${formatRp(calc.totalAssets)}</span>
        </div>
        <div class="proof-cell">
          <span class="proof-label">Liabilitas + Ekuitas Akhir</span>
          <span class="proof-value">${formatRp(calc.totalLiabAndEquity)}</span>
        </div>
        <div class="proof-cell">
          <span class="proof-label">Selisih Keseimbangan</span>
          <span class="proof-value">${formatRp(calc.balanceDiff)}</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="grid-form">
        <div class="field-group">
          <label for="b-company">Nama Perusahaan / UMKM</label>
          <input id="b-company" type="text" value="${esc(custom.companyName)}" placeholder="Contoh: Toko Maju Bersama" />
        </div>
        <div class="field-group">
          <label for="b-period">Periode Laporan</label>
          <input id="b-period" type="text" value="${esc(custom.periodLabel)}" placeholder="Contoh: 31 Desember 2023" />
        </div>
        <div class="field-group">
          <label for="b-entity">Bentuk Badan Usaha</label>
          <select id="b-entity">
            <option value="perorangan" ${custom.entityType === 'perorangan' ? 'selected' : ''}>Usaha Perorangan (Prive)</option>
            <option value="pt" ${custom.entityType === 'pt' ? 'selected' : ''}>Perseroan Terbatas (Dividen)</option>
          </select>
        </div>
      </div>
    </section>

    <div class="grid-split">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Input Laba Rugi &amp; Perubahan Ekuitas</h3>
            <p class="panel-subtitle">Perubahan angka langsung memperbarui Laba Bersih &amp; Modal Akhir</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr><th>Akun Pendapatan &amp; Beban</th><th class="num">Nominal (Rp)</th><th></th></tr>
            </thead>
            <tbody>
              <tr class="row-section"><td colspan="3">Pendapatan</td></tr>
              ${renderGroupRows('revenues', custom.revenues)}
              <tr>
                <td>Harga Pokok Penjualan (HPP)</td>
                <td class="num"><input type="number" class="num-input" min="0" step="1000" data-scalar="cogs" value="${custom.cogs}" aria-label="Harga Pokok Penjualan"/></td>
                <td></td>
              </tr>
              <tr class="row-section"><td colspan="3">Beban Usaha, Bunga &amp; Pajak</td></tr>
              ${renderGroupRows('expenses', custom.expenses)}
              <tr>
                <td>Beban Bunga</td>
                <td class="num"><input type="number" class="num-input" min="0" step="1000" data-scalar="interestExpense" value="${custom.interestExpense}" aria-label="Beban Bunga"/></td>
                <td></td>
              </tr>
              <tr>
                <td>Pajak Penghasilan</td>
                <td class="num"><input type="number" class="num-input" min="0" step="1000" data-scalar="taxExpense" value="${custom.taxExpense}" aria-label="Pajak Penghasilan"/></td>
                <td></td>
              </tr>
              <tr class="row-total">
                <td>Laba Bersih Setelah Pajak (EAT)</td>
                <td class="num">${formatRp(calc.eat)}</td>
                <td></td>
              </tr>
              <tr>
                <td>Modal Awal Periode</td>
                <td class="num"><input type="number" class="num-input" min="0" step="1000" data-scalar="beginningCapital" value="${custom.beginningCapital}" aria-label="Modal Awal Periode"/></td>
                <td></td>
              </tr>
              <tr>
                <td>${custom.entityType === 'pt' ? '(-) Dividen' : '(-) Prive'}</td>
                <td class="num"><input type="number" class="num-input" min="0" step="1000" data-scalar="drawings" value="${custom.drawings}" aria-label="Prive atau Dividen"/></td>
                <td></td>
              </tr>
              <tr class="row-total">
                <td>Modal Akhir Periode</td>
                <td class="num">${formatRp(calc.endingCapital)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Input Neraca (Aset &amp; Kewajiban)</h3>
            <p class="panel-subtitle">Pastikan Total Aset sama dengan Liabilitas + Modal Akhir</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr><th>Akun Neraca</th><th class="num">Nominal (Rp)</th><th></th></tr>
            </thead>
            <tbody>
              <tr class="row-section"><td colspan="3">Aset Lancar (Tidak Tetap)</td></tr>
              ${renderGroupRows('currentAssets', custom.currentAssets)}
              <tr class="row-section"><td colspan="3">Aset Tetap (Nilai Buku)</td></tr>
              ${renderGroupRows('fixedAssets', custom.fixedAssets)}
              <tr class="row-total">
                <td>Total Aset</td>
                <td class="num">${formatRp(calc.totalAssets)}</td>
                <td></td>
              </tr>
              <tr class="row-section"><td colspan="3">Liabilitas Jangka Pendek</td></tr>
              ${renderGroupRows('shortTermLiabilities', custom.shortTermLiabilities)}
              <tr class="row-section"><td colspan="3">Liabilitas Jangka Panjang</td></tr>
              ${renderGroupRows('longTermLiabilities', custom.longTermLiabilities)}
              <tr class="row-subtotal">
                <td>Ekuitas Akhir (Otomatis dari Laba Rugi)</td>
                <td class="num">${formatRp(calc.endingCapital)}</td>
                <td></td>
              </tr>
              <tr class="row-total">
                <td>Total Liabilitas &amp; Ekuitas</td>
                <td class="num">${formatRp(calc.totalLiabAndEquity)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Hasil Rasio Keuangan Usaha Mandiri</h3>
          <p class="panel-subtitle">Dihitung otomatis dari angka yang Anda masukkan di atas</p>
        </div>
      </div>
      <div class="kpi-grid">
        ${calc.ratios
          .map((r) => {
            const valStr = r.kind === 'times' ? formatTimes(r.value) : formatPct(r.value);
            const cls = r.status === 'ok' ? 'badge-ok' : r.status === 'warn' ? 'badge-warn' : 'badge-err';
            return `
              <article class="kpi-card">
                <span class="kpi-label">${r.category}</span>
                <span class="kpi-value">${valStr}</span>
                <span class="kpi-meta">${r.name}</span>
                <div><span class="badge ${cls}">${r.statusText}</span></div>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;

  container.querySelector('#b-company')?.addEventListener('change', (e) => {
    onUpdateCustom({ ...custom, companyName: e.target.value.trim() || 'Usaha Mandiri' });
  });
  container.querySelector('#b-period')?.addEventListener('change', (e) => {
    onUpdateCustom({ ...custom, periodLabel: e.target.value.trim() || '31 Desember 2023' });
  });
  container.querySelector('#b-entity')?.addEventListener('change', (e) => {
    onUpdateCustom({ ...custom, entityType: e.target.value });
  });

  container.querySelectorAll('[data-scalar]').forEach((inp) => {
    inp.addEventListener('change', (e) => {
      const raw = Number(e.target.value);
      const val = Number.isFinite(raw) ? Math.max(0, raw) : 0;
      e.target.value = String(val);
      onUpdateCustom({ ...custom, [inp.dataset.scalar]: val });
    });
  });

  container.querySelectorAll('[data-group]').forEach((inp) => {
    inp.addEventListener('change', (e) => {
      const grp = inp.dataset.group;
      const idx = Number(inp.dataset.idx);
      const raw = Number(e.target.value);
      const val = Number.isFinite(raw) ? Math.max(0, raw) : 0;
      e.target.value = String(val);
      const nextList = custom[grp].map((item, i) =>
        i === idx ? { ...item, amount: val } : item
      );
      onUpdateCustom({ ...custom, [grp]: nextList });
    });
  });

  container.querySelectorAll('[data-del-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const grp = btn.dataset.delGroup;
      const idx = Number(btn.dataset.delIdx);
      const nextList = custom[grp].filter((_, i) => i !== idx);
      onUpdateCustom({ ...custom, [grp]: nextList });
      onToast('Akun dihapus dari daftar.');
    });
  });

  container.querySelector('#add-account-btn')?.addEventListener('click', onOpenAddDialog);
  container.querySelector('#reset-builder-btn')?.addEventListener('click', onOpenResetDialog);
  container.querySelector('#export-custom-xlsx')?.addEventListener('click', () => {
    const fname = downloadCustomWorkbook(custom, calc);
    onToast(`Berhasil mengunduh ${fname} dengan rumus Excel aktif.`);
  });
}
