/**
 * Data Blueprint & Microtasks Terstruktur (BLUEPRINT.md & MICROTASKS.md)
 */

export const BLUEPRINT_NODES = [
  {
    layer: '01 - Sumber Materi & Rekonsiliasi',
    modules: [
      'Ekstraksi halaman 1–26 lap keuangan.pdf',
      'Tabel 6.1–6.5 (Rambak Maju, Lancar Transportasi, Laundry Resik, Lancar Maju)',
      'Studi Kasus PT ABC komparatif 2022–2023',
      'Katalog Errata: pemisahan hitungan rumus aktual vs cetakan buku',
    ],
  },
  {
    layer: '02 - Mesin Akuntansi & Rasio',
    modules: [
      'computeSingleStep() & computeMultipleStep()',
      'computeEquityStatement() & computeBalanceSheet()',
      'Invarian Neraca: Total Aset = Total Liabilitas + Ekuitas',
      '10 Rasio Bab 6 (Likuiditas, Solvabilitas, Rentabilitas)',
    ],
  },
  {
    layer: '03 - Generator Excel OOXML (.xlsx)',
    modules: [
      'Workbook Desktop Python: 9 Sheet, 170 Rumus Lintas-Sheet',
      'Exporter Browser Murni (xlsxExporter.js): ZIP Store + CRC32',
      'Format Rupiah, persentase, double-border, dan freeze pane',
      'Template Input Usaha Mandiri siap pakai',
    ],
  },
  {
    layer: '04 - Design Kit & Atmosfer Tier 0/1',
    modules: [
      'Profile greenfield-app + Theme Harmony Matrix (L > 0.179 vs L <= 0.179)',
      'Palet Archival Cotton Light & Matte Mineral Slate Dark (zero neon)',
      'Pre-baked 256×256 cotton paper grain + margin rule statis (Mode A)',
      '1×1 sRGB Color Bridge + tabular-nums + dialog validasi inline',
    ],
  },
];

export const MICROTASKS_LIST = [
  { id: 'MT-01', epic: 'Epic 1: Fondasi & Design Kit', title: 'Ekstraksi & transkripsi seluruh angka Bab 6 dari lap keuangan.pdf', deliverable: 'bab6Data.js', defaultDone: true },
  { id: 'MT-02', epic: 'Epic 1: Fondasi & Design Kit', title: 'Audit aritmetika & katalog errata cetakan buku PDF', deliverable: 'BLUEPRINT.md', defaultDone: true },
  { id: 'MT-03', epic: 'Epic 1: Fondasi & Design Kit', title: 'Penguncian kontrak Design Kit (DESIGN.md & .interface-design/system.md)', deliverable: 'DESIGN.md', defaultDone: true },
  { id: 'MT-04', epic: 'Epic 1: Fondasi & Design Kit', title: 'Penulisan arsitektur sistem & pemecahan microtasks', deliverable: 'BLUEPRINT.md, MICROTASKS.md', defaultDone: true },

  { id: 'MT-05', epic: 'Epic 2: Workbook Excel (.xlsx)', title: 'Utilitas OOXML .xlsx (styles, border akuntansi, format Rupiah & %)', deliverable: 'scripts/generate_excel.py', defaultDone: true },
  { id: 'MT-06', epic: 'Epic 2: Workbook Excel (.xlsx)', title: 'Sheet Ringkasan Eksekutif & katalog rekonsiliasi buku', deliverable: 'Sheet 1 (.xlsx)', defaultDone: true },
  { id: 'MT-07', epic: 'Epic 2: Workbook Excel (.xlsx)', title: 'Sheet LR Single Step (Rambak Maju) & Multiple Step (Lancar Transportasi)', deliverable: 'Sheet 2–3 (.xlsx)', defaultDone: true },
  { id: 'MT-08', epic: 'Epic 2: Workbook Excel (.xlsx)', title: 'Sheet Perubahan Ekuitas (Laundry Resik) & Neraca (Lancar Maju)', deliverable: 'Sheet 4–5 (.xlsx)', defaultDone: true },
  { id: 'MT-09', epic: 'Epic 2: Workbook Excel (.xlsx)', title: 'Sheet PT ABC Neraca, Laba Rugi Komparatif & Analisis 10 Rasio', deliverable: 'Sheet 6–8 (.xlsx)', defaultDone: true },
  { id: 'MT-10', epic: 'Epic 2: Workbook Excel (.xlsx)', title: 'Sheet Template Input Usaha Mandiri berumus otomatis', deliverable: 'Sheet 9 (.xlsx)', defaultDone: true },

  { id: 'MT-11', epic: 'Epic 3: Mesin Akuntansi & Exporter JS', title: 'Dataset kanonik ESM untuk seluruh tabel dan blueprint', deliverable: 'app/src/data/*.js', defaultDone: true },
  { id: 'MT-12', epic: 'Epic 3: Mesin Akuntansi & Exporter JS', title: 'Kalkulator Laba Rugi, Ekuitas, Neraca & Balance Invariant', deliverable: 'app/src/engine/accounting.js', defaultDone: true },
  { id: 'MT-13', epic: 'Epic 3: Mesin Akuntansi & Exporter JS', title: 'Kalkulator 10 Rasio Keuangan & evaluator status sehat/waspada', deliverable: 'app/src/engine/accounting.js', defaultDone: true },
  { id: 'MT-14', epic: 'Epic 3: Mesin Akuntansi & Exporter JS', title: 'Generator .xlsx murni di browser (ZIP Store + OOXML rumus)', deliverable: 'app/src/engine/xlsxExporter.js', defaultDone: true },

  { id: 'MT-15', epic: 'Epic 4: Token CSS & Atmosfer Kit', title: 'Token semantik Light Cotton & Matte Dark + tipografi tabular-nums', deliverable: 'app/styles/tokens.css', defaultDone: true },
  { id: 'MT-16', epic: 'Epic 4: Token CSS & Atmosfer Kit', title: 'Layout 264px sidebar, safe-zones & responsive mobile drawer', deliverable: 'app/styles/layout.css', defaultDone: true },
  { id: 'MT-17', epic: 'Epic 4: Token CSS & Atmosfer Kit', title: 'Komponen double-rule strip, tabel akuntansi, dialog & meter', deliverable: 'app/styles/components.css', defaultDone: true },
  { id: 'MT-18', epic: 'Epic 4: Token CSS & Atmosfer Kit', title: 'Engine Atmosfer Tier 0/1 statis + 1×1 sRGB Color Bridge', deliverable: 'app/src/atmosphere.js', defaultDone: true },

  { id: 'MT-19', epic: 'Epic 5: Antarmuka Multi-Layar', title: 'Layar Ringkasan & Materi dengan Panduan kolapsibel default-hidden', deliverable: 'overviewView.js', defaultDone: true },
  { id: 'MT-20', epic: 'Epic 5: Antarmuka Multi-Layar', title: 'Layar Laporan Keuangan Tabel 6.1–6.5 & mode Aktual vs Buku', deliverable: 'statementsView.js', defaultDone: true },
  { id: 'MT-21', epic: 'Epic 5: Antarmuka Multi-Layar', title: 'Layar Studi Kasus PT ABC Komparatif & Analisis 10 Rasio', deliverable: 'caseStudyView.js', defaultDone: true },
  { id: 'MT-22', epic: 'Epic 5: Antarmuka Multi-Layar', title: 'Layar Input Usaha Mandiri + validasi modal & unduh .xlsx', deliverable: 'builderView.js', defaultDone: true },
  { id: 'MT-23', epic: 'Epic 5: Antarmuka Multi-Layar', title: 'Layar Blueprint Sistem & Microtasks Board interaktif', deliverable: 'blueprintView.js, microtasksView.js', defaultDone: true },

  { id: 'MT-24', epic: 'Epic 6 · Verifikasi & Audit', title: 'Validasi XML .xlsx, unit test akuntansi, dak.mjs audit & detect.mjs', deliverable: 'Test & Audit Pass', defaultDone: true },
];
