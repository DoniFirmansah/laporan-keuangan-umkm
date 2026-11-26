import { initAtmosphere } from './atmosphere.js';
import { DEFAULT_CUSTOM_BUSINESS } from './data/bab6Data.js';
import {
  DEFAULT_UMKM_STATE,
  nextJournalId,
  sanitizeUmkmState,
  UMKM_CHART_OF_ACCOUNTS,
  UMKM_QUICK_PRESETS,
  validateJournalEntry,
} from './engine/journalEngine.js';
import { renderBuilderView } from './views/builderView.js';
import { renderCaseStudyView } from './views/caseStudyView.js';
import { renderOverviewView } from './views/overviewView.js';
import { renderStatementsView } from './views/statementsView.js';
import { renderUmkmLedgerView } from './views/umkmLedgerView.js';

const STORAGE_KEY = 'neraca-umkm-state-v2';

const VIEW_META = {
  umkm: {
    title: 'Pembukuan UMKM',
    subtitle: 'Jurnal Umum Debit = Kredit, Laba Rugi, Neraca & Arus Kas',
  },
  overview: {
    title: 'Ringkasan Usaha',
    subtitle: 'Ikhtisar Kinerja Keuangan & Struktur Pembukuan Bisnis',
  },
  statements: {
    title: 'Contoh Laporan Baku',
    subtitle: 'Format Laba Rugi, Perubahan Ekuitas & Neraca Standar',
  },
  casestudy: {
    title: 'Analisis Rasio Bisnis',
    subtitle: 'Perbandingan Laporan Tahunan & Rasio Likuiditas, Solvabilitas, Rentabilitas',
  },
  builder: {
    title: 'Kalkulator Neraca Cepat',
    subtitle: 'Susun Posisi Keuangan Usaha & Unduh Laporan Excel',
  },
};

function loadInitialState() {
  const base = {
    view: 'umkm',
    theme: 'light',
    umkmTab: 'journal',
    umkmQuery: '',
    umkmLedgerAccount: '1-101',
    umkmState: structuredClone(DEFAULT_UMKM_STATE),
    statementTab: 't61',
    calcMode: 'actual',
    statementQuery: '',
    ratioCategory: 'Semua',
    customBusiness: structuredClone(DEFAULT_CUSTOM_BUSINESS),
    pendingResetTarget: 'custom',
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return base;
    const parsed = JSON.parse(saved);
    const restoredUmkm = parsed.umkmState ? sanitizeUmkmState(parsed.umkmState) : null;
    const validView = VIEW_META[parsed.view] ? parsed.view : base.view;
    return {
      ...base,
      ...parsed,
      view: validView,
      umkmState: restoredUmkm?.ok ? restoredUmkm.state : base.umkmState,
      customBusiness: parsed.customBusiness || base.customBusiness,
    };
  } catch {
    return base;
  }
}

const state = loadInitialState();

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted webviews
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#131614' : '#f6f3eb');
  }
  const sun = document.getElementById('theme-icon-sun');
  const moon = document.getElementById('theme-icon-moon');
  if (sun && moon) {
    sun.hidden = theme === 'dark';
    moon.hidden = theme !== 'dark';
  }
}

function showToast(message, options = {}) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'space-between';
  el.style.gap = '10px';
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  el.appendChild(msgSpan);

  if (options.actionLabel && typeof options.onAction === 'function') {
    const actBtn = document.createElement('button');
    actBtn.type = 'button';
    actBtn.className = 'btn btn-secondary btn-sm';
    actBtn.textContent = options.actionLabel;
    actBtn.addEventListener('click', () => {
      options.onAction();
      el.remove();
    });
    el.appendChild(actBtn);
  }

  region.appendChild(el);
  setTimeout(() => el.remove(), options.actionLabel ? 6500 : 3400);
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuBtn = document.getElementById('mobile-menu-btn');
  sidebar?.classList.remove('open');
  if (backdrop) backdrop.hidden = true;
  menuBtn?.setAttribute('aria-expanded', 'false');
}

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuBtn = document.getElementById('mobile-menu-btn');
  sidebar?.classList.add('open');
  if (backdrop) backdrop.hidden = false;
  menuBtn?.setAttribute('aria-expanded', 'true');
}

function render() {
  const main = document.getElementById('main-content');
  const titleEl = document.getElementById('topbar-title');
  const subtitleEl = document.getElementById('topbar-subtitle');
  if (!main) return;

  const activeEl = document.activeElement;
  const activeId = activeEl && activeEl.id && main.contains(activeEl) ? activeEl.id : null;
  const selStart = activeId && typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
  const selEnd = activeId && typeof activeEl.selectionEnd === 'number' ? activeEl.selectionEnd : null;

  const meta = VIEW_META[state.view] || VIEW_META.umkm;
  if (titleEl) titleEl.textContent = meta.title;
  if (subtitleEl) subtitleEl.textContent = meta.subtitle;

  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === state.view);
  });

  const patchState = (patch) => {
    Object.assign(state, patch);
    persistState();
    render();
  };

  switch (state.view) {
    case 'umkm':
      renderUmkmLedgerView(main, state, {
        onUpdateUmkm: patchState,
        onOpenJournalModal: (presetId) => openJournalModal(presetId),
        onOpenUmkmReset: () => {
          state.pendingResetTarget = 'umkm';
          document.getElementById('confirm-dialog')?.showModal();
        },
        onToast: showToast,
      });
      break;
    case 'overview':
      renderOverviewView(main, { onNavigate: (v) => patchState({ view: v }) });
      break;
    case 'statements':
      renderStatementsView(main, state, { onStateChange: patchState });
      break;
    case 'casestudy':
      renderCaseStudyView(main, state, { onStateChange: patchState });
      break;
    case 'builder':
      renderBuilderView(main, state, {
        onUpdateCustom: (nextCustom) => patchState({ customBusiness: nextCustom }),
        onOpenAddDialog: () => openAddAccountDialog(),
        onOpenResetDialog: () => {
          state.pendingResetTarget = 'custom';
          document.getElementById('confirm-dialog')?.showModal();
        },
        onToast: showToast,
      });
      break;
    default:
      renderUmkmLedgerView(main, state, {
        onUpdateUmkm: patchState,
        onOpenJournalModal: (presetId) => openJournalModal(presetId),
        onOpenUmkmReset: () => {
          state.pendingResetTarget = 'umkm';
          document.getElementById('confirm-dialog')?.showModal();
        },
        onToast: showToast,
      });
  }

  if (activeId) {
    const restored = document.getElementById(activeId);
    if (restored) {
      restored.focus({ preventScroll: true });
      if (selStart !== null && typeof restored.setSelectionRange === 'function') {
        try {
          restored.setSelectionRange(selStart, selEnd ?? selStart);
        } catch {
          // Ignore selection error on non-text inputs
        }
      }
    }
  }
}

function openAddAccountDialog() {
  const dlg = document.getElementById('account-dialog');
  const errEl = document.getElementById('dialog-error');
  const form = document.getElementById('account-form');
  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }
  form?.reset();
  dlg?.showModal();
}

function populateJournalSelectors() {
  const presetSel = document.getElementById('jrn-preset');
  const debitSel = document.getElementById('jrn-debit-acc');
  const creditSel = document.getElementById('jrn-credit-acc');
  if (!presetSel || !debitSel || !creditSel) return;

  presetSel.innerHTML = UMKM_QUICK_PRESETS.map(
    (p) => `<option value="${p.id}">${p.label}</option>`
  ).join('');

  const accOptions = UMKM_CHART_OF_ACCOUNTS.map(
    (a) => `<option value="${a.code}">${a.code} — ${a.name}</option>`
  ).join('');
  debitSel.innerHTML = accOptions;
  creditSel.innerHTML = accOptions;
}

function applyJournalPreset(presetId) {
  const preset = UMKM_QUICK_PRESETS.find((p) => p.id === presetId) || UMKM_QUICK_PRESETS[0];
  const presetSel = document.getElementById('jrn-preset');
  const debitSel = document.getElementById('jrn-debit-acc');
  const creditSel = document.getElementById('jrn-credit-acc');
  const descInp = document.getElementById('jrn-desc');

  if (presetSel) presetSel.value = preset.id;
  if (debitSel) debitSel.value = preset.debit;
  if (creditSel) creditSel.value = preset.credit;
  if (descInp && !descInp.value.trim()) {
    descInp.value = preset.label.replace(/\s*\(.*?\)\s*/g, '');
  }
}

let modalEntryMode = 'simple';
let splitLinesDraft = [];

function renderSplitLinesEditor() {
  const listEl = document.getElementById('jrn-split-list');
  if (!listEl) return;
  const accOptions = UMKM_CHART_OF_ACCOUNTS.map(
    (a) => `<option value="${a.code}">${a.code} — ${a.name}</option>`
  ).join('');

  listEl.innerHTML = splitLinesDraft
    .map(
      (ln, idx) => `
      <div class="split-line-row" data-split-row="${idx}">
        <select class="split-acc" aria-label="Akun baris ${idx + 1}">${accOptions}</select>
        <input type="number" class="split-debit" min="0" step="1000" value="${ln.debit || ''}" placeholder="Debit (Rp)" aria-label="Debit baris ${idx + 1}" />
        <input type="number" class="split-credit" min="0" step="1000" value="${ln.credit || ''}" placeholder="Kredit (Rp)" aria-label="Kredit baris ${idx + 1}" />
        <button type="button" class="icon-btn split-del" ${splitLinesDraft.length <= 2 ? 'disabled' : ''} aria-label="Hapus baris ${idx + 1}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`
    )
    .join('');

  listEl.querySelectorAll('[data-split-row]').forEach((rowEl) => {
    const idx = Number(rowEl.dataset.splitRow);
    const sel = rowEl.querySelector('.split-acc');
    const debInp = rowEl.querySelector('.split-debit');
    const crdInp = rowEl.querySelector('.split-credit');
    const delBtn = rowEl.querySelector('.split-del');

    sel.value = splitLinesDraft[idx].accountCode;
    sel.addEventListener('change', (e) => {
      splitLinesDraft[idx].accountCode = e.target.value;
    });
    debInp.addEventListener('input', (e) => {
      const val = Math.max(0, Number(e.target.value || 0));
      splitLinesDraft[idx].debit = val;
      if (val > 0) {
        splitLinesDraft[idx].credit = 0;
        crdInp.value = '';
      }
      updateJournalBalancePreview();
    });
    crdInp.addEventListener('input', (e) => {
      const val = Math.max(0, Number(e.target.value || 0));
      splitLinesDraft[idx].credit = val;
      if (val > 0) {
        splitLinesDraft[idx].debit = 0;
        debInp.value = '';
      }
      updateJournalBalancePreview();
    });
    delBtn.addEventListener('click', () => {
      if (splitLinesDraft.length <= 2) return;
      splitLinesDraft = splitLinesDraft.filter((_, i) => i !== idx);
      renderSplitLinesEditor();
      updateJournalBalancePreview();
    });
  });
}

function setJournalModalMode(mode) {
  modalEntryMode = mode;
  document.getElementById('jrn-mode-simple')?.classList.toggle('active', mode === 'simple');
  document.getElementById('jrn-mode-split')?.classList.toggle('active', mode === 'split');
  const simpleBox = document.getElementById('jrn-simple-fields');
  const splitBox = document.getElementById('jrn-split-fields');
  const amtWrap = document.getElementById('jrn-amount-wrap');
  if (simpleBox) simpleBox.hidden = mode !== 'simple';
  if (splitBox) splitBox.hidden = mode !== 'split';
  if (amtWrap) amtWrap.hidden = mode !== 'simple';
  if (mode === 'split') {
    const debitAcc = document.getElementById('jrn-debit-acc')?.value || '1-101';
    const creditAcc = document.getElementById('jrn-credit-acc')?.value || '4-101';
    const amt = Math.max(0, Number(document.getElementById('jrn-amount')?.value || 0));
    if (splitLinesDraft.length < 2) {
      splitLinesDraft = [
        { accountCode: debitAcc, debit: amt, credit: 0 },
        { accountCode: creditAcc, debit: 0, credit: amt },
      ];
    }
    renderSplitLinesEditor();
  }
  updateJournalBalancePreview();
}

function openJournalModal(presetId) {
  const dlg = document.getElementById('journal-dialog');
  const errEl = document.getElementById('jrn-error');
  const dateInp = document.getElementById('jrn-date');
  const amountInp = document.getElementById('jrn-amount');
  const descInp = document.getElementById('jrn-desc');

  if (errEl) {
    errEl.hidden = true;
    errEl.textContent = '';
  }
  if (dateInp) {
    dateInp.value = new Date().toISOString().slice(0, 10);
  }
  if (amountInp) amountInp.value = '';
  if (descInp) descInp.value = '';
  splitLinesDraft = [];
  applyJournalPreset(presetId || UMKM_QUICK_PRESETS[0].id);
  setJournalModalMode('simple');
  dlg?.showModal();
}

function updateJournalBalancePreview() {
  const preview = document.getElementById('jrn-balance-preview');
  if (!preview) return;

  if (modalEntryMode === 'split') {
    const totD = splitLinesDraft.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totC = splitLinesDraft.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (totD <= 0 && totC <= 0) {
      preview.className = 'alert alert-warn';
      preview.innerHTML = '<span>Verifikasi Split:</span><strong>Isi nominal Debit dan Kredit</strong>';
      return;
    }
    if (Math.round(totD) !== Math.round(totC)) {
      const diff = Math.abs(totD - totC);
      preview.className = 'alert alert-err';
      preview.innerHTML = `<span>Belum Seimbang:</span><strong class="tabular">Selisih Rp${diff.toLocaleString('id-ID')} (D Rp${totD.toLocaleString('id-ID')} ≠ K Rp${totC.toLocaleString('id-ID')})</strong>`;
      return;
    }
    preview.className = 'alert alert-ok';
    preview.innerHTML = `<span>Verifikasi Split:</span><strong class="tabular">Debit Rp${totD.toLocaleString('id-ID')} = Kredit Rp${totC.toLocaleString('id-ID')} (SEIMBANG)</strong>`;
    return;
  }

  const amount = Number(document.getElementById('jrn-amount')?.value || 0);
  const debitAcc = document.getElementById('jrn-debit-acc')?.value;
  const creditAcc = document.getElementById('jrn-credit-acc')?.value;

  if (debitAcc && creditAcc && debitAcc === creditAcc) {
    preview.className = 'alert alert-err';
    preview.innerHTML = '<span>Verifikasi Keseimbangan:</span><strong>Akun Debit &amp; Kredit tidak boleh sama</strong>';
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    preview.className = 'alert alert-warn';
    preview.innerHTML = '<span>Verifikasi Keseimbangan:</span><strong>Masukkan nominal &gt; Rp0</strong>';
    return;
  }
  const fmt = `Rp${amount.toLocaleString('id-ID')}`;
  preview.className = 'alert alert-ok';
  preview.innerHTML = `<span>Verifikasi Keseimbangan:</span><strong class="tabular">Debit ${fmt} = Kredit ${fmt} (SEIMBANG)</strong>`;
}

function wireGlobalControls() {
  populateJournalSelectors();

  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      persistState();
      closeMobileSidebar();
      render();
    });
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) closeMobileSidebar();
    else openMobileSidebar();
  });

  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileSidebar);

  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    persistState();
  });

  document.getElementById('print-btn')?.addEventListener('click', () => window.print());

  const guideBtn = document.getElementById('toggle-guide-btn');
  const guideDrawer = document.getElementById('guide-drawer');
  guideBtn?.addEventListener('click', () => {
    if (!guideDrawer) return;
    const isHidden = guideDrawer.hidden;
    guideDrawer.hidden = !isHidden;
    guideBtn.setAttribute('aria-expanded', String(isHidden));
    const span = guideBtn.querySelector('span');
    if (span) span.textContent = isHidden ? 'Sembunyikan Panduan' : 'Tampilkan Panduan';
  });

  // Journal Double-Entry modal
  const jrnDialog = document.getElementById('journal-dialog');
  const jrnForm = document.getElementById('journal-form');
  const jrnErr = document.getElementById('jrn-error');

  document.getElementById('jrn-mode-simple')?.addEventListener('click', () => setJournalModalMode('simple'));
  document.getElementById('jrn-mode-split')?.addEventListener('click', () => setJournalModalMode('split'));
  document.getElementById('jrn-add-split-line')?.addEventListener('click', () => {
    splitLinesDraft.push({ accountCode: '1-101', debit: 0, credit: 0 });
    renderSplitLinesEditor();
    updateJournalBalancePreview();
  });

  document.getElementById('jrn-preset')?.addEventListener('change', (e) => {
    document.getElementById('jrn-desc').value = '';
    applyJournalPreset(e.target.value);
    updateJournalBalancePreview();
  });
  document.getElementById('jrn-amount')?.addEventListener('input', updateJournalBalancePreview);
  document.getElementById('jrn-debit-acc')?.addEventListener('change', updateJournalBalancePreview);
  document.getElementById('jrn-credit-acc')?.addEventListener('change', updateJournalBalancePreview);
  document.getElementById('jrn-close-btn')?.addEventListener('click', () => jrnDialog?.close());
  document.getElementById('jrn-cancel-btn')?.addEventListener('click', () => jrnDialog?.close());

  jrnForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('jrn-date').value;
    const description = document.getElementById('jrn-desc').value.trim();
    const presetId = document.getElementById('jrn-preset').value;

    let lines = [];
    if (modalEntryMode === 'split') {
      lines = splitLinesDraft
        .filter((l) => Number(l.debit || 0) > 0 || Number(l.credit || 0) > 0)
        .map((l) => ({
          accountCode: l.accountCode,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
        }));
    } else {
      const amount = Number(document.getElementById('jrn-amount').value);
      const debitAcc = document.getElementById('jrn-debit-acc').value;
      const creditAcc = document.getElementById('jrn-credit-acc').value;
      if (debitAcc === creditAcc) {
        jrnErr.textContent = 'Akun sisi Debit dan Kredit tidak boleh sama.';
        jrnErr.hidden = false;
        return;
      }
      lines = [
        { accountCode: debitAcc, debit: amount, credit: 0 },
        { accountCode: creditAcc, debit: 0, credit: amount },
      ];
    }

    const candidate = {
      id: nextJournalId(state.umkmState.entries),
      date,
      description,
      presetId: modalEntryMode === 'split' ? 'split' : presetId,
      lines,
    };

    const check = validateJournalEntry(candidate);
    if (!check.valid) {
      jrnErr.textContent = check.errors.join(' ');
      jrnErr.hidden = false;
      return;
    }

    state.umkmState = {
      ...state.umkmState,
      entries: [...state.umkmState.entries, candidate],
    };
    persistState();
    jrnDialog?.close();
    render();
    showToast(`Transaksi ${candidate.id} tersimpan seimbang (Debit = Kredit Rp${check.totalDebit.toLocaleString('id-ID')}).`);
  });

  // Add account modal validation inside dialog
  const accDialog = document.getElementById('account-dialog');
  const accForm = document.getElementById('account-form');
  const accErr = document.getElementById('dialog-error');

  document.getElementById('dialog-close-btn')?.addEventListener('click', () => accDialog?.close());
  document.getElementById('dialog-cancel-btn')?.addEventListener('click', () => accDialog?.close());

  accForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = document.getElementById('acc-category').value;
    const name = document.getElementById('acc-name').value.trim();
    const rawAmount = document.getElementById('acc-amount').value;
    const amount = Number(rawAmount);

    if (!name || name.length < 2) {
      accErr.textContent = 'Nama akun wajib diisi minimal 2 karakter.';
      accErr.hidden = false;
      return;
    }
    if (rawAmount === '' || !Number.isFinite(amount) || amount < 0) {
      accErr.textContent = 'Nominal harus berupa angka bulat non-negatif.';
      accErr.hidden = false;
      return;
    }

    const groupMap = {
      revenue: 'revenues',
      expense: 'expenses',
      currentAsset: 'currentAssets',
      fixedAsset: 'fixedAssets',
      shortTermLiability: 'shortTermLiabilities',
      longTermLiability: 'longTermLiabilities',
    };
    const key = groupMap[cat];
    const newEntry = {
      id: `${cat}-${Date.now()}`,
      name,
      amount,
      ...(cat === 'currentAsset' ? { isCash: false, isInventoryOrPrepaid: false } : {}),
    };

    state.customBusiness = {
      ...state.customBusiness,
      [key]: [...state.customBusiness[key], newEntry],
    };
    persistState();
    accDialog?.close();
    render();
    showToast(`Akun "${name}" berhasil ditambahkan.`);
  });

  // Reset confirmation modal
  const confirmDlg = document.getElementById('confirm-dialog');
  document.getElementById('confirm-close-btn')?.addEventListener('click', () => confirmDlg?.close());
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => confirmDlg?.close());
  document.getElementById('confirm-ok-btn')?.addEventListener('click', () => {
    if (state.pendingResetTarget === 'umkm') {
      state.umkmState = structuredClone(DEFAULT_UMKM_STATE);
      showToast('Pembukuan UMKM dikembalikan ke transaksi contoh.');
    } else {
      state.customBusiness = structuredClone(DEFAULT_CUSTOM_BUSINESS);
      showToast('Data usaha mandiri dikembalikan ke preset contoh.');
    }
    persistState();
    confirmDlg?.close();
    render();
  });
}

applyTheme(state.theme);
initAtmosphere();
wireGlobalControls();
render();
