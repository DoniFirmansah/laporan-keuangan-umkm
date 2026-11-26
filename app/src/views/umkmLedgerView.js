import { formatRp } from '../engine/accounting.js';
import {
  ACCOUNT_MAP,
  computeUmkmAccounting,
  sanitizeUmkmState,
  UMKM_QUICK_PRESETS,
} from '../engine/journalEngine.js';
import { downloadCustomWorkbook } from '../engine/xlsxExporter.js';

function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const UMKM_TABS = [
  { id: 'journal', label: '1. Jurnal Umum (Debit = Kredit)' },
  { id: 'statements', label: '2. Laba Rugi & Neraca' },
  { id: 'cashflow', label: '3. Laporan Arus Kas' },
  { id: 'trial', label: '4. Neraca Saldo' },
];

export function renderUmkmLedgerView(
  container,
  state,
  { onUpdateUmkm, onOpenJournalModal, onOpenUmkmReset, onToast }
) {
  const umkm = state.umkmState;
  const activeTab = state.umkmTab || 'journal';
  const query = (state.umkmQuery || '').trim().toLowerCase();
  const report = computeUmkmAccounting(umkm.entries);
  const { incomeStatement: is, balanceSheet: bs, cashFlow: cf } = report;

  const allSynced =
    report.isJournalBalanced &&
    report.isTrialBalanced &&
    bs.isBalanced &&
    cf.isCashReconciled;

  let bodyHtml = '';

  if (activeTab === 'journal') {
    const filtered = umkm.entries.filter((e) => {
      if (!query) return true;
      return (
        e.id.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.date.includes(query) ||
        e.lines.some((l) => (ACCOUNT_MAP[l.accountCode]?.name || '').toLowerCase().includes(query))
      );
    });

    bodyHtml = `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Catat Cepat Transaksi UMKM</h3>
            <p class="panel-subtitle">Pilih jenis transaksi harian di bawah; akun Debit &amp; Kredit terisi otomatis agar selalu seimbang</p>
          </div>
          <button type="button" id="open-journal-modal-btn" class="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Transaksi Baru
          </button>
        </div>

        <div class="grid-3">
          ${UMKM_QUICK_PRESETS.slice(0, 6)
            .map(
              (p) => `
              <button type="button" class="bp-node" data-quick-preset="${p.id}" style="text-align:left;cursor:pointer;">
                <h4 style="margin:0;font-size:13.5px;">${p.label}</h4>
                <span style="font-size:12px;color:var(--text-secondary);">${p.hint}</span>
                <span class="code-tag">D: ${ACCOUNT_MAP[p.debit]?.name} | K: ${ACCOUNT_MAP[p.credit]?.name}</span>
              </button>`
            )
            .join('')}
        </div>
      </section>

      <section class="panel">
        <div class="toolbar" style="margin-bottom:14px;">
          <div>
            <h3 class="panel-title">Buku Jurnal Umum (${filtered.length} Transaksi)</h3>
            <p class="panel-subtitle">Setiap transaksi wajib memenuhi Total Debit = Total Kredit sebelum tersimpan</p>
          </div>
          <div class="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="umkm-search" type="search" value="${esc(state.umkmQuery || '')}" placeholder="Cari keterangan, tanggal, atau akun..." aria-label="Cari transaksi jurnal" />
          </div>
        </div>

        ${
          filtered.length === 0
            ? `<div class="empty-state">Belum ada transaksi yang cocok. Klik "Tambah Transaksi Baru" untuk mencatat.</div>`
            : `
            <div class="table-wrap">
              <table class="ledger-table">
                <thead>
                  <tr>
                    <th style="width:90px">ID &amp; Tgl</th>
                    <th>Keterangan &amp; Akun</th>
                    <th class="num">Debit (Rp)</th>
                    <th class="num">Kredit (Rp)</th>
                    <th style="width:46px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
                    .map((entry) => {
                      const rows = entry.lines
                        .map(
                          (ln, idx) => `
                          <tr>
                            <td>${idx === 0 ? `<div class="code-tag">${esc(entry.id)}</div><div class="code-tag">${esc(entry.date)}</div>` : ''}</td>
                            <td>
                              ${idx === 0 ? `<div style="font-weight:600;margin-bottom:3px;">${esc(entry.description)}</div>` : ''}
                              <div style="padding-left:${ln.credit > 0 ? '18px' : '0'};color:var(--text-secondary);">
                                <span class="code-tag">${esc(ln.accountCode)}</span> ${esc(ACCOUNT_MAP[ln.accountCode]?.name || ln.accountCode)}
                              </div>
                            </td>
                            <td class="num">${ln.debit > 0 ? formatRp(ln.debit) : '—'}</td>
                            <td class="num">${ln.credit > 0 ? formatRp(ln.credit) : '—'}</td>
                            <td style="text-align:right">
                              ${
                                idx === 0
                                  ? `<button type="button" class="icon-btn" data-del-entry="${esc(entry.id)}" aria-label="Hapus ${esc(entry.id)}" title="Hapus transaksi">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>`
                                  : ''
                              }
                            </td>
                          </tr>`
                        )
                        .join('');
                      return rows;
                    })
                    .join('')}
                  <tr class="row-total">
                    <td colspan="2">TOTAL DEBIT &amp; KREDIT JURNAL UMUM</td>
                    <td class="num">${formatRp(report.journalTotalDebit)}</td>
                    <td class="num">${formatRp(report.journalTotalCredit)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>`
        }
      </section>
    `;
  } else if (activeTab === 'statements') {
    bodyHtml = `
      <div class="grid-2">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Laporan Laba Rugi</h3>
              <p class="panel-subtitle">${esc(umkm.businessName)} | ${esc(umkm.periodLabel)}</p>
            </div>
            <span class="badge ${is.netIncome >= 0 ? 'badge-ok' : 'badge-err'}">
              ${is.netIncome >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}
            </span>
          </div>
          <div class="table-wrap">
            <table class="ledger-table">
              <thead><tr><th>Kode</th><th>Pos Laba Rugi</th><th class="num">Nominal (Rp)</th></tr></thead>
              <tbody>
                <tr class="row-section"><td colspan="3">Pendapatan Usaha</td></tr>
                ${is.revenueAccounts
                  .map((a) => `<tr><td class="code-tag">${a.code}</td><td>${a.name}</td><td class="num">${formatRp(a.balance)}</td></tr>`)
                  .join('')}
                <tr class="row-subtotal"><td></td><td>Total Pendapatan</td><td class="num">${formatRp(is.totalRevenue)}</td></tr>
                <tr class="row-section"><td colspan="3">HPP &amp; Beban Operasional</td></tr>
                <tr><td class="code-tag">5-101</td><td>Harga Pokok Penjualan (HPP)</td><td class="num">${formatRp(is.cogs)}</td></tr>
                <tr class="row-subtotal"><td></td><td>Laba Kotor</td><td class="num">${formatRp(is.grossProfit)}</td></tr>
                ${is.operatingExpenses
                  .map((a) => `<tr><td class="code-tag">${a.code}</td><td>${a.name}</td><td class="num">${formatRp(a.balance)}</td></tr>`)
                  .join('')}
                <tr class="row-subtotal"><td></td><td>Total Beban Usaha</td><td class="num">${formatRp(is.totalExpenses)}</td></tr>
                <tr class="row-total"><td></td><td>Laba Bersih Periode Berjalan</td><td class="num">${formatRp(is.netIncome)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Laporan Neraca (Balance Sheet)</h3>
              <p class="panel-subtitle">Per ${esc(umkm.periodLabel)}</p>
            </div>
            <span class="badge ${bs.isBalanced ? 'badge-ok' : 'badge-err'}">
              ${bs.isBalanced ? 'SEIMBANG' : 'SELISIH'}
            </span>
          </div>
          <div class="table-wrap">
            <table class="ledger-table">
              <thead><tr><th>Kode</th><th>Pos Neraca</th><th class="num">Nominal (Rp)</th></tr></thead>
              <tbody>
                <tr class="row-section"><td colspan="3">Aset Lancar</td></tr>
                ${bs.currentAssetAccounts
                  .map((a) => `<tr><td class="code-tag">${a.code}</td><td>${a.name}</td><td class="num">${formatRp(a.balance)}</td></tr>`)
                  .join('')}
                <tr class="row-subtotal"><td></td><td>Total Aset Lancar</td><td class="num">${formatRp(bs.totalCurrentAssets)}</td></tr>
                <tr class="row-section"><td colspan="3">Aset Tetap</td></tr>
                <tr><td class="code-tag">1-201</td><td>Peralatan &amp; Mesin Usaha</td><td class="num">${formatRp(bs.equipmentGross)}</td></tr>
                <tr><td class="code-tag">1-202</td><td>(-) Akumulasi Penyusutan</td><td class="num">${formatRp(-bs.accDep)}</td></tr>
                <tr class="row-subtotal"><td></td><td>Nilai Buku Aset Tetap</td><td class="num">${formatRp(bs.totalFixedAssets)}</td></tr>
                <tr class="row-total"><td></td><td>TOTAL ASET</td><td class="num">${formatRp(bs.totalAssets)}</td></tr>
                <tr class="row-section"><td colspan="3">Liabilitas &amp; Ekuitas</td></tr>
                ${[...bs.shortTermLiabAccounts, ...bs.longTermLiabAccounts]
                  .map((a) => `<tr><td class="code-tag">${a.code}</td><td>${a.name}</td><td class="num">${formatRp(a.balance)}</td></tr>`)
                  .join('')}
                <tr class="row-subtotal"><td></td><td>Total Liabilitas</td><td class="num">${formatRp(bs.totalLiabilities)}</td></tr>
                <tr><td class="code-tag">3-101</td><td>Modal Pemilik</td><td class="num">${formatRp(bs.ownerCapital)}</td></tr>
                <tr><td class="code-tag">3-201</td><td>(-) Prive Pemilik</td><td class="num">${formatRp(-bs.ownerDrawings)}</td></tr>
                <tr><td class="code-tag">L/R</td><td>Laba Bersih Berjalan</td><td class="num">${formatRp(bs.netIncome)}</td></tr>
                <tr class="row-subtotal"><td></td><td>Total Ekuitas Akhir</td><td class="num">${formatRp(bs.endingEquity)}</td></tr>
                <tr class="row-total"><td></td><td>TOTAL LIABILITAS &amp; EKUITAS</td><td class="num">${formatRp(bs.totalLiabilitiesAndEquity)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  } else if (activeTab === 'cashflow') {
    const renderCfRows = (title, items, subtotal) => `
      <tr class="row-section"><td colspan="3">${title}</td></tr>
      ${
        items.length === 0
          ? `<tr><td></td><td style="color:var(--text-muted)">Tidak ada transaksi kas pada aktivitas ini</td><td class="num">${formatRp(0)}</td></tr>`
          : items
              .map(
                (it) => `
                <tr>
                  <td class="code-tag">${esc(it.date)}</td>
                  <td><span class="code-tag">${esc(it.id)}</span> ${esc(it.description)}</td>
                  <td class="num">${formatRp(it.amount)}</td>
                </tr>`
              )
              .join('')
      }
      <tr class="row-subtotal"><td></td><td>Arus Kas Bersih — ${title}</td><td class="num">${formatRp(subtotal)}</td></tr>
    `;

    bodyHtml = `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Laporan Arus Kas (Cash Flow Statement)</h3>
            <p class="panel-subtitle">${esc(umkm.businessName)} | Metode langsung dari mutasi akun Kas &amp; Bank (1-101)</p>
          </div>
          <span class="badge ${cf.isCashReconciled ? 'badge-ok' : 'badge-err'}">
            ${cf.isCashReconciled ? 'SINKRON DENGAN KAS NERACA' : 'TIDAK SINKRON'}
          </span>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr><th style="width:110px">Tanggal</th><th>Uraian Aktivitas Kas</th><th class="num">Arus Kas (Rp)</th></tr>
            </thead>
            <tbody>
              ${renderCfRows('Aktivitas Operasi', cf.items.operating, cf.operatingCash)}
              ${renderCfRows('Aktivitas Investasi', cf.items.investing, cf.investingCash)}
              ${renderCfRows('Aktivitas Pendanaan', cf.items.financing, cf.financingCash)}
              <tr class="row-subtotal"><td></td><td>Kenaikan (Penurunan) Kas Bersih</td><td class="num">${formatRp(cf.netCashChange)}</td></tr>
              <tr><td></td><td>Saldo Kas Awal Periode</td><td class="num">${formatRp(cf.beginningCash)}</td></tr>
              <tr class="row-total"><td></td><td>SALDO KAS AKHIR (Sama dengan Kas di Neraca)</td><td class="num">${formatRp(cf.endingCash)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  } else if (activeTab === 'trial') {
    bodyHtml = `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Neraca Saldo (Trial Balance)</h3>
            <p class="panel-subtitle">Ringkasan seluruh akun Buku Besar untuk memastikan keseimbangan Debit &amp; Kredit</p>
          </div>
          <span class="badge ${report.isTrialBalanced ? 'badge-ok' : 'badge-err'}">
            ${report.isTrialBalanced ? 'DEBIT = KREDIT SEIMBANG' : 'TIDAK SEIMBANG'}
          </span>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th style="width:85px">Kode</th>
                <th>Nama Akun</th>
                <th class="num">Mutasi Debit</th>
                <th class="num">Mutasi Kredit</th>
                <th class="num">Saldo Debit</th>
                <th class="num">Saldo Kredit</th>
              </tr>
            </thead>
            <tbody>
              ${report.trialBalance
                .map(
                  (r) => `
                  <tr>
                    <td class="code-tag">${r.code}</td>
                    <td>${r.name}</td>
                    <td class="num">${formatRp(r.totalDebit)}</td>
                    <td class="num">${formatRp(r.totalCredit)}</td>
                    <td class="num">${r.tbDebit > 0 ? formatRp(r.tbDebit) : '—'}</td>
                    <td class="num">${r.tbCredit > 0 ? formatRp(r.tbCredit) : '—'}</td>
                  </tr>`
                )
                .join('')}
              <tr class="row-total">
                <td colspan="2">TOTAL NERACA SALDO</td>
                <td class="num">${formatRp(report.journalTotalDebit)}</td>
                <td class="num">${formatRp(report.journalTotalCredit)}</td>
                <td class="num">${formatRp(report.tbDebit)}</td>
                <td class="num">${formatRp(report.tbCredit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  container.innerHTML = `
    <section class="ledger-balance-strip" aria-label="Pita verifikasi keseimbangan akuntansi UMKM">
      <div class="strip-equation">
        <div class="strip-item">
          <span class="strip-label">Total Debit = Kredit</span>
          <span class="strip-val">${formatRp(report.journalTotalDebit)}</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Aset = Liabilitas + Ekuitas</span>
          <span class="strip-val">${formatRp(bs.totalAssets)}</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Kas Akhir (Arus Kas = Neraca)</span>
          <span class="strip-val">${formatRp(cf.endingCash)}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="badge ${allSynced ? 'badge-ok' : 'badge-err'}">
          ${allSynced ? '3 LAPORAN SINKRON & SEIMBANG' : 'PERLU CEK JURNAL'}
        </span>
        <button type="button" id="umkm-export-xlsx" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Ekspor .xlsx (4 Sheet)
        </button>
      </div>
    </section>

    <section class="panel">
      <div class="grid-3" style="align-items:end;">
        <div class="field-group">
          <label for="umkm-biz-name">Nama Usaha UMKM</label>
          <input id="umkm-biz-name" type="text" value="${esc(umkm.businessName)}" placeholder="Contoh: Kedai Kopi Nusantara" />
        </div>
        <div class="field-group">
          <label for="umkm-period">Periode Pembukuan</label>
          <input id="umkm-period" type="text" value="${esc(umkm.periodLabel)}" placeholder="Contoh: November 2026" />
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button type="button" id="umkm-backup-json" class="btn btn-secondary btn-sm">Cadangkan JSON</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            Pulihkan JSON
            <input id="umkm-restore-json" type="file" accept="application/json,.json" hidden />
          </label>
          <button type="button" id="umkm-reset-btn" class="btn btn-ghost btn-sm">Reset Contoh</button>
        </div>
      </div>
    </section>

    <div class="tab-bar no-print" role="tablist" aria-label="Tampilan akuntansi UMKM">
      ${UMKM_TABS.map(
        (t) => `<button type="button" role="tab" aria-selected="${activeTab === t.id}" class="tab-btn ${activeTab === t.id ? 'active' : ''}" data-umkm-tab="${t.id}">${t.label}</button>`
      ).join('')}
    </div>

    ${bodyHtml}
  `;

  container.querySelectorAll('[data-umkm-tab]').forEach((btn) => {
    btn.addEventListener('click', () => onUpdateUmkm({ umkmTab: btn.dataset.umkmTab }));
  });

  container.querySelector('#umkm-biz-name')?.addEventListener('change', (e) => {
    onUpdateUmkm({
      umkmState: { ...umkm, businessName: e.target.value.trim() || 'Usaha UMKM' },
    });
  });

  container.querySelector('#umkm-period')?.addEventListener('change', (e) => {
    onUpdateUmkm({
      umkmState: { ...umkm, periodLabel: e.target.value.trim() || 'Periode Berjalan' },
    });
  });

  container.querySelector('#open-journal-modal-btn')?.addEventListener('click', () => onOpenJournalModal());
  container.querySelectorAll('[data-quick-preset]').forEach((btn) => {
    btn.addEventListener('click', () => onOpenJournalModal(btn.dataset.quickPreset));
  });

  container.querySelectorAll('[data-del-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.delEntry;
      const prevEntries = umkm.entries;
      const nextEntries = umkm.entries.filter((e) => e.id !== id);
      onUpdateUmkm({ umkmState: { ...umkm, entries: nextEntries } });
      onToast(`Transaksi ${id} dihapus; laporan otomatis diperbarui.`, {
        actionLabel: 'Urungkan',
        onAction: () => {
          onUpdateUmkm({ umkmState: { ...umkm, entries: prevEntries } });
        },
      });
    });
  });

  const searchInp = container.querySelector('#umkm-search');
  if (searchInp) {
    let t = null;
    searchInp.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => onUpdateUmkm({ umkmQuery: e.target.value }), 180);
    });
  }

  container.querySelector('#umkm-export-xlsx')?.addEventListener('click', () => {
    const fname = downloadCustomWorkbook(umkm, report);
    onToast(`Berhasil mengunduh ${fname} (Jurnal, Neraca Saldo, Laba Rugi & Neraca, Arus Kas).`);
  });

  container.querySelector('#umkm-backup-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(umkm, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadangan-pembukuan-umkm.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    onToast('Cadangan data pembukuan JSON berhasil diunduh.');
  });

  container.querySelector('#umkm-restore-json')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const res = sanitizeUmkmState(parsed);
      if (!res.ok) {
        onToast(`Gagal pulihkan: ${res.error}`);
        return;
      }
      onUpdateUmkm({ umkmState: res.state });
      onToast(`Berhasil memulihkan ${res.state.entries.length} transaksi terverifikasi seimbang.`);
    } catch {
      onToast('File cadangan JSON tidak valid atau rusak.');
    } finally {
      e.target.value = '';
    }
  });

  container.querySelector('#umkm-reset-btn')?.addEventListener('click', onOpenUmkmReset);
}
