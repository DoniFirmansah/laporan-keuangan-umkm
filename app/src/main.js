import { initAtmosphere } from './atmosphere.js';
import { DEFAULT_CUSTOM_BUSINESS } from './data/bab6Data.js';
import { MICROTASKS_LIST } from './data/blueprintData.js';
import {
  DEFAULT_UMKM_STATE,
  UMKM_CHART_OF_ACCOUNTS,
  UMKM_QUICK_PRESETS,
  validateJournalEntry,
} from './engine/journalEngine.js';
import { renderBlueprintView } from './views/blueprintView.js';
import { renderBuilderView } from './views/builderView.js';
import { renderCaseStudyView } from './views/caseStudyView.js';
import { renderMicrotasksView } from './views/microtasksView.js';
import { renderOverviewView } from './views/overviewView.js';
import { renderStatementsView } from './views/statementsView.js';
import { renderUmkmLedgerView } from './views/umkmLedgerView.js';

const STORAGE_KEY = 'neraca-bab6-state-v2';

const VIEW_META = {
  umkm: {
    title: 'Pembukuan UMKM (Debit = Kredit)',
    subtitle: 'Jurnal Umum, Laba Rugi, Neraca & Arus Kas Selalu Seimbang',
  },
  overview: {
    title: 'Ringkasan & Materi Bab 6',
    subtitle: 'Hakikat Laporan Keuangan & Analisis Rasio Sederhana',
  },
  statements: {
    title: 'Laporan Keuangan (Tabel 6.1–6.5)',
    subtitle: 'Laba Rugi Single/Multiple Step, Perubahan Ekuitas & Neraca',
  },
  casestudy: {
    title: 'Studi Kasus PT ABC & 10 Rasio',
    subtitle: 'Komparatif 2022–2023 (Dalam Jutaan) & Rasio Likuiditas, Solvabilitas, Rentabilitas',
  },
  builder: {
    title: 'Input Usaha Mandiri & Ekspor Excel',
    subtitle: 'Kalkulator Neraca Seimbang Otomatis & Unduh .xlsx Berumus',
  },
  blueprint: {
    title: 'Blueprint Arsitektur Sistem',
    subtitle: 'Struktur Data Akuntansi, 9 Sheet Excel & Kontrak Design Kit',
  },
  microtasks: {
    title: 'Microtasks Board (24 Paket Kerja)',
    subtitle: 'Pemecahan Aplikasi & Excel Menjadi Tugas Atomik Terukur',
  },
};

function loadInitialState() {
  const defaultCompleted = MICROTASKS_LIST.filter((m) => m.defaultDone).map((m) => m.id);
  const base = {
    view: 'umkm',
    theme: 'light',
    umkmTab: 'journal',
    umkmQuery: '',
    umkmState: structuredClone(DEFAULT_UMKM_STATE),
    statementTab: 't61',
    calcMode: 'actual',
    statementQuery: '',
    ratioCategory: 'Semua',
    microtaskEpic: 'Semua',
    microtaskQuery: '',
    completedMicrotasks: defaultCompleted,
    customBusiness: structuredClone(DEFAULT_CUSTOM_BUSINESS),
    pendingResetTarget: 'custom',
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return base;
    const parsed = JSON.parse(saved);
    return {
      ...base,
      ...parsed,
      umkmState: parsed.umkmState || base.umkmState,
      customBusiness: parsed.customBusiness || base.customBusiness,
      completedMicrotasks: parsed.completedMicrotasks || base.completedMicrotasks,
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
  const sun = document.getElementById('theme-icon-sun');
  const moon = document.getElementById('theme-icon-moon');
  if (sun && moon) {
    sun.hidden = theme === 'dark';
    moon.hidden = theme !== 'dark';
  }
}

function showToast(message) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3400);
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
    case 'blueprint':
      renderBlueprintView(main);
      break;
    case 'microtasks':
      renderMicrotasksView(main, state, { onStateChange: patchState });
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
  applyJournalPreset(presetId || UMKM_QUICK_PRESETS[0].id);
  dlg?.showModal();
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

  document.getElementById('jrn-preset')?.addEventListener('change', (e) => {
    document.getElementById('jrn-desc').value = '';
    applyJournalPreset(e.target.value);
  });
  document.getElementById('jrn-close-btn')?.addEventListener('click', () => jrnDialog?.close());
  document.getElementById('jrn-cancel-btn')?.addEventListener('click', () => jrnDialog?.close());

  jrnForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('jrn-date').value;
    const amount = Number(document.getElementById('jrn-amount').value);
    const description = document.getElementById('jrn-desc').value.trim();
    const debitAcc = document.getElementById('jrn-debit-acc').value;
    const creditAcc = document.getElementById('jrn-credit-acc').value;
    const presetId = document.getElementById('jrn-preset').value;

    if (debitAcc === creditAcc) {
      jrnErr.textContent = 'Akun sisi Debit dan Kredit tidak boleh sama.';
      jrnErr.hidden = false;
      return;
    }

    const nextNum = state.umkmState.entries.length + 1;
    const candidate = {
      id: `JRN-${String(nextNum).padStart(3, '0')}`,
      date,
      description,
      presetId,
      lines: [
        { accountCode: debitAcc, debit: amount, credit: 0 },
        { accountCode: creditAcc, debit: 0, credit: amount },
      ],
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
    showToast(`Transaksi ${candidate.id} tersimpan seimbang (Debit = Kredit Rp${amount.toLocaleString('id-ID')}).`);
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
