/**
 * Dataset Kanonik Bab 6: Laporan Keuangan Sederhana
 * Sumber: lap keuangan.pdf (PKK SMK/MAK Kelas XII)
 */

export const BAB6_CONCEPTS = {
  tujuanPembelajaran: [
    'Memahami pengertian, tujuan, dan bentuk-bentuk laporan keuangan sederhana.',
    'Menganalisis laporan keuangan sederhana secara tepat dan akurat melalui rasio likuiditas, solvabilitas, dan rentabilitas.',
  ],
  tujuanLaporan: [
    'Menyajikan informasi keuangan yang jelas, akurat, dan transparan bagi pemangku kepentingan.',
    'Membantu penaksiran kemampuan perusahaan dalam menghasilkan laba.',
    'Mengukur kinerja entitas melalui pendapatan, biaya, laba/rugi, aset, dan kewajiban.',
    'Memfasilitasi pengambilan keputusan investasi, kredit, dan strategi bisnis.',
    'Memenuhi standar akuntansi (SAK / IFRS) dan regulasi perpajakan.',
  ],
  penggunaLaporan: [
    {
      pihak: 'Pemegang Saham',
      fokus: 'Menilai prestasi manajemen, dividen, nilai saham, serta keputusan menambah atau mengurangi investasi.',
    },
    {
      pihak: 'Manajemen Perusahaan',
      fokus: 'Pertanggungjawaban kepada pemilik, mengukur efisiensi biaya divisi, serta merumuskan kebijakan baru.',
    },
    {
      pihak: 'Kreditur / Bank',
      fokus: 'Menilai kelayakan kredit, kualitas jaminan, serta kemampuan likuiditas, solvabilitas, dan rentabilitas.',
    },
    {
      pihak: 'Pemerintah',
      fokus: 'Menghitung ketetapan pajak, menyusun statistik ekonomi, serta memastikan kepatuhan regulasi.',
    },
  ],
  tujuanAnalisis: [
    { kode: 'Screening', arti: 'Memahami kondisi awal perusahaan dari angka laporan tanpa meninjau operasional secara langsung.' },
    { kode: 'Understanding', arti: 'Mendalami posisi kas, modal, utang, dan hasil usaha untuk pengelolaan perusahaan.' },
    { kode: 'Diagnosis', arti: 'Mendeteksi potensi masalah manajemen, operasi, maupun keuangan sejak dini.' },
    { kode: 'Evaluation', arti: 'Menilai prestasi manajemen dalam mencatat laba serta mengendalikan beban utang.' },
  ],
};

export const TABLE_6_1_SINGLE_STEP = {
  id: 'tabel-6-1',
  tableLabel: 'Tabel 6.1',
  company: 'Toko Rambak Maju',
  title: 'Laporan Laba Rugi (Single Step)',
  period: 'Untuk Periode yang Berakhir 31 Desember 2023',
  revenues: [
    { code: '4-100', name: 'Penjualan bersih', amount: 31300000 },
    { code: '4-200', name: 'Pendapatan lain-lain', amount: 850000 },
  ],
  expenses: [
    { code: '5-100', name: 'Harga pokok penjualan', amount: 21100000 },
    { code: '5-200', name: 'Biaya penjualan', amount: 655000 },
    { code: '5-300', name: 'Biaya Umum dan Administrasi', amount: 1350000 },
    { code: '5-400', name: 'Biaya lain-lain', amount: 550000 },
  ],
  bookValues: {
    totalRevenue: 33150000,
    totalExpense: 23655000,
    netIncome: 9495000,
    errataNote:
      'Buku PDF mencetak Total Pendapatan Rp33.150.000,00 (selisih +Rp1.000.000 dari penjumlahan 31.300.000 + 850.000 = 32.150.000), sehingga Laba Bersih tercetak Rp9.495.000,00 (hitungan aktual: Rp8.495.000,00).',
  },
};

export const TABLE_6_2_MULTIPLE_STEP = {
  id: 'tabel-6-2',
  tableLabel: 'Tabel 6.2',
  company: 'Toko Lancar Transportasi',
  title: 'Laporan Laba Rugi (Multiple Step)',
  period: 'Per 31 Desember 2023',
  sales: 32445000,
  cogs: {
    beginningInventory: 4987000,
    netPurchases: 12850000,
    endingInventory: 2575000,
  },
  sellingExpenses: [
    { code: '5-201', name: 'Gaji staf penjualan', amount: 4335000 },
    { code: '5-202', name: 'Biaya iklan', amount: 450000 },
    { code: '5-203', name: 'Biaya penyusutan bangunan', amount: 335000 },
    { code: '5-204', name: 'Biaya suplai toko', amount: 750000 },
    { code: '5-205', name: 'Biaya lain-lain (penjualan)', amount: 250000 },
  ],
  adminExpenses: [
    { code: '5-301', name: 'Gaji pegawai', amount: 4200000 },
    { code: '5-302', name: 'Biaya penyusutan gedung', amount: 1050000 },
    { code: '5-303', name: 'Macam-macam biaya umum', amount: 550000 },
  ],
  otherRevenue: 1250000,
  otherExpense: 750000,
  bookValues: {
    goodsAvailable: 8453000,
    cogsTotal: 5878000,
    grossProfit: 26577000,
    sellingTotal: 6120000,
    adminTotal: 5800000,
    operatingExpenseTotal: 11920000,
    operatingIncome: 10250000,
    otherNet: -750000,
    ebt: 9500000,
    errataNote:
      'Buku PDF memiliki beberapa selisih cetak: Barang tersedia tertulis Rp8.453.000 (aktual 17.837.000), HPP Rp5.878.000 (aktual 15.262.000), Laba Kotor Rp26.577.000 (aktual 17.183.000), Laba Usaha Rp10.250.000, serta Laba Sebelum Pajak Rp9.500.000 (aktual Rp5.763.000).',
  },
};

export const TABLE_6_3_EQUITY_SOLE = {
  id: 'tabel-6-3',
  tableLabel: 'Tabel 6.3',
  company: 'Usaha Jasa Laundry Resik',
  title: 'Laporan Perubahan Ekuitas (Usaha Perorangan)',
  period: 'Untuk Periode yang Berakhir 31 Desember 2023',
  beginningLabel: 'Ekuitas 1 Desember 2023',
  beginningCapital: 21450000,
  netIncomeLabel: 'Laba bersih bulan Desember',
  netIncome: 6553000,
  deductionLabel: '(-) Prive',
  deduction: 1375000,
  endingLabel: 'Ekuitas 31 Desember 2023',
};

export const TABLE_6_4_RETAINED_PT = {
  id: 'tabel-6-4',
  tableLabel: 'Tabel 6.4',
  company: 'Usaha Jasa Laundry Resik',
  title: 'Laporan Laba Ditahan (Perseroan Terbatas)',
  period: 'Untuk Periode yang Berakhir 31 Desember 2023',
  beginningLabel: 'Modal yang ditahan 1 Oktober 2023',
  beginningCapital: 23450000,
  netIncomeLabel: 'Pendapatan Bersih untuk 3 bulan',
  netIncome: 9250000,
  deductionLabel: '(-) Dividen',
  deduction: 1625000,
  endingLabel: 'Modal yang ditahan 31 Desember 2023',
};

export const TABLE_6_5_BALANCE_SHEET = {
  id: 'tabel-6-5',
  tableLabel: 'Tabel 6.5',
  company: 'Usaha Jasa Lancar Maju',
  title: 'Laporan Neraca',
  period: 'Per 31 Desember 2023',
  currentAssets: [
    { code: '1-101', name: 'Kas', amount: 4250000 },
    { code: '1-102', name: 'Piutang Usaha', amount: 2500000 },
    { code: '1-103', name: 'Perlengkapan Kantor', amount: 2250000 },
    { code: '1-104', name: 'Persediaan Barang', amount: 500000 },
    { code: '1-105', name: 'Sewa di Bayar di Muka', amount: 750000 },
    { code: '1-106', name: 'Gaji Dibayar di Muka', amount: 3000000 },
  ],
  fixedAssets: [
    { code: '1-201', name: 'Peralatan Toko', cost: 2500000, accDep: 400000 },
    { code: '1-203', name: 'Bangunan Toko', cost: 10750000, accDep: 525000 },
    { code: '1-205', name: 'Tanah', cost: 5500000, accDep: 0 },
  ],
  shortTermLiabilities: [
    { code: '2-101', name: 'Liabilitas Usaha', amount: 4500000 },
    { code: '2-102', name: 'Liabilitas Bunga', amount: 500000 },
    { code: '2-103', name: 'Liabilitas Pajak', amount: 1200000 },
  ],
  longTermLiabilities: [],
  equity: [{ code: '3-100', name: 'Ekuitas Pemilik Usaha', amount: 24875000 }],
  errataNote:
    'Semua penjumlahan seimbang (Rp31.075.000 = Rp31.075.000). Catatan: di PDF terdapat salah ketik judul seksi "Liabilitas Jangka Panjang" tepat di atas rincian Liabilitas Jangka Pendek.',
};

export const PT_ABC_CASE = {
  company: 'PT ABC',
  unitLabel: 'Dalam Jutaan Rupiah',
  balanceSheet: {
    currentAssets: [
      { code: '1-101', name: 'Kas', y2022: 420, y2023: 790 },
      { code: '1-102', name: 'Piutang dagang', y2022: 1000, y2023: 1200 },
      { code: '1-103', name: 'Persediaan barang dagang', y2022: 2650, y2023: 2500 },
      { code: '1-104', name: 'Investasi jangka panjang', y2022: 960, y2023: 650 },
    ],
    fixedAssets: [
      { code: '1-201', name: 'Peralatan toko', y2022: 3500, y2023: 4000 },
      { code: '1-202', name: 'Peralatan kantor', y2022: 500, y2023: 450 },
      { code: '1-203', name: 'Bangunan', y2022: 6750, y2023: 6250 },
      { code: '1-204', name: 'Tanah', y2022: 1000, y2023: 1000 },
    ],
    shortTermLiabilities: [
      { code: '2-101', name: 'Utang dagang', y2022: 1900, y2023: 1640 },
      { code: '2-102', name: 'Utang wesel', y2022: 900, y2023: 750 },
      { code: '2-103', name: 'Utang pajak', y2022: 120, y2023: 260 },
    ],
    longTermLiabilities: [
      { code: '2-201', name: 'Utang obligasi', y2022: 4200, y2023: 4000 },
    ],
    equity: [
      { code: '3-101', name: 'Saham biasa nominal (Rp0,05 per lembar)', y2022: 4750, y2023: 4750 },
      { code: '3-102', name: 'Laba ditahan', y2022: 4910, y2023: 5440 },
    ],
  },
  incomeStatement: {
    sales: { y2022: 20750, y2023: 24860 },
    cogs: { y2022: 12220, y2023: 15230 },
    operatingExpenses: [
      { code: '5-201', name: 'Beban iklan', y2022: 1000, y2023: 1450 },
      { code: '5-202', name: 'Beban gaji bagian penjualan', y2022: 2800, y2023: 2400 },
      { code: '5-203', name: 'Beban gaji bagian kantor', y2022: 2000, y2023: 1650 },
      { code: '5-204', name: 'Beban asuransi', y2022: 450, y2023: 1000 },
      { code: '5-205', name: 'Beban perlengkapan', y2022: 350, y2023: 260 },
      { code: '5-206', name: 'Beban penyusutan', y2022: 750, y2023: 850 },
      { code: '5-207', name: 'Beban rupa-rupa', y2022: 150, y2023: 170 },
    ],
    interestExpense: { y2022: 460, y2023: 440 },
    taxExpense: { y2022: 190, y2023: 470 },
  },
};

export const DEFAULT_CUSTOM_BUSINESS = {
  companyName: 'UMKM Contoh Nusantara',
  periodLabel: '31 Desember 2023',
  entityType: 'perorangan',
  beginningCapital: 30000000,
  drawings: 2000000,
  revenues: [
    { id: 'rev-1', name: 'Penjualan bersih', amount: 50000000 },
    { id: 'rev-2', name: 'Pendapatan lain-lain', amount: 1500000 },
  ],
  cogs: 28000000,
  expenses: [
    { id: 'exp-1', name: 'Beban penjualan & pemasaran', amount: 4500000 },
    { id: 'exp-2', name: 'Beban umum & administrasi', amount: 5500000 },
  ],
  interestExpense: 600000,
  taxExpense: 1290000,
  currentAssets: [
    { id: 'ca-1', name: 'Kas', amount: 12500000, isCash: true, isInventoryOrPrepaid: false },
    { id: 'ca-2', name: 'Piutang usaha', amount: 6500000, isCash: false, isInventoryOrPrepaid: false },
    { id: 'ca-3', name: 'Persediaan barang', amount: 8000000, isCash: false, isInventoryOrPrepaid: true },
    { id: 'ca-4', name: 'Beban dibayar di muka', amount: 1500000, isCash: false, isInventoryOrPrepaid: true },
  ],
  fixedAssets: [
    { id: 'fa-1', name: 'Peralatan & bangunan (nilai buku)', amount: 25000000 },
  ],
  shortTermLiabilities: [
    { id: 'sl-1', name: 'Utang dagang & beban akrual', amount: 9500000 },
  ],
  longTermLiabilities: [
    { id: 'll-1', name: 'Utang bank jangka panjang', amount: 4390000 },
  ],
};
