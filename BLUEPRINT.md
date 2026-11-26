# BLUEPRINT.md — Arsitektur Sistem Laporan Keuangan Sederhana (Bab 6)

> **Sumber Materi:** `lap keuangan.pdf` (*Proyek Kreatif dan Kewirausahaan untuk SMK/MAK Kelas XII — Bab 6: Laporan Keuangan Sederhana*).  
> **Artefak Utama:**
> 1. Workbook Excel multi-sheet berumus aktif (`Laporan_Keuangan_Bab6_Lengkap.xlsx`).
> 2. Aplikasi Web Interaktif berbasis Design Kit (`app/`) dengan generator `.xlsx` klien-side & kalkulator neraca/rasio langsung.
> 3. Rincian Paket Kerja Terstruktur (`MICROTASKS.md`).

---

## 1. Tujuan & Ruang Lingkup Fungsional
Sistem menyatukan **dua pilar utama** dari peta konsep Bab 6:
1. **Hakikat & Penyusunan Laporan Keuangan:**
   - **Laporan Laba Rugi *Single Step*** (Tabel 6.1 — *Toko Rambak Maju*, periode berakhir 31 Des 2023).
   - **Laporan Laba Rugi *Multiple Step*** (Tabel 6.2 — *Toko Lancar Transportasi*, per 31 Des 2023).
   - **Laporan Perubahan Ekuitas (Usaha Perorangan)** & **Laporan Laba Ditahan (PT)** (Tabel 6.3 & Tabel 6.4 — *Usaha Jasa Laundry Resik*, 31 Des 2023).
   - **Laporan Neraca (*Balance Sheet*)** (Tabel 6.5 — *Usaha Jasa Lancar Maju*, 31 Des 2023) dengan invarian `Total Aset = Total Liabilitas + Ekuitas`.
2. **Analisis Laporan Keuangan Sederhana:**
   - **Studi Kasus Komparatif *PT ABC* (2022 & 2023, dalam jutaan):** Neraca Komparatif & Laporan Laba Rugi Komparatif beserta selisih YoY (`Rp` dan `%`).
   - **10 Rasio Keuangan Bab 6:**
     - *Likuiditas:* Rasio Lancar (*Current Ratio*), Rasio Cepat (*Quick Ratio*), Rasio Kas (*Cash Ratio*).
     - *Solvabilitas & Struktur Modal:* Rasio Utang Jangka Panjang terhadap Modal, Rasio Total Utang terhadap Modal (*DER*), Rasio Total Utang terhadap Total Aset (*DAR*), Rasio Cakupan Bunga (*Interest Coverage*).
     - *Rentabilitas (Profitabilitas):* Rasio Laba Kotor (*GPM*), Rasio Laba Bersih (*NPM*), Pengembalian Modal (*ROE*).
3. **Mode Praktik Mandiri (UMKM / Siswa):**
   - Form interaktif untuk memasukkan akun usaha sendiri, memvalidasi keseimbangan neraca secara langsung, menghitung 10 rasio otomatis, dan mengunduh file `.xlsx` berumus Excel aktif tanpa memerlukan server backend.

---

## 2. Model Data & Skema Entitas

```text
FinancialDataset
├── companyName: string
├── entityType: "perorangan" | "pt"
├── periodLabel: string
├── currencyScale: 1 | 1_000_000          // Satuan penuh vs (Dalam Jutaan)
├── incomeStatement:
│   ├── mode: "single_step" | "multiple_step"
│   ├── revenueLines: AccountLine[]       // Penjualan bersih, pendapatan lain-lain
│   ├── cogsSection?: COGSSection         // Persediaan awal, pembelian bersih, persediaan akhir
│   ├── sellingExpenses: AccountLine[]    // Beban penjualan
│   ├── adminExpenses: AccountLine[]      // Beban umum & administrasi
│   ├── nonOperatingItems: AccountLine[]  // Pendapatan/beban lain-lain, beban bunga, pajak
├── equityStatement:
│   ├── beginningCapital: number
│   ├── netIncome: number
│   ├── drawingsOrDividends: number       // Prive (perorangan) atau Dividen (PT)
├── balanceSheet:
│   ├── currentAssets: AccountLine[]      // Kas, piutang, persediaan, dibayar dimuka, dll.
│   ├── fixedAssets: FixedAssetLine[]     // Harga perolehan & akumulasi depresiasi
│   ├── shortTermLiabilities: AccountLine[]
│   ├── longTermLiabilities: AccountLine[]
│   └── equityAccounts: AccountLine[]
└── errataNotes?: ErrataEntry[]           // Transparansi koreksi cetak buku PDF vs rumus hidup
```

### Kebijakan Rekonsiliasi Salah Cetak Buku PDF (`Errata Policy`)
Beberapa tabel contoh di PDF memiliki ketidaksesuaian aritmetika cetak (misalnya total yang tercetak berbeda dengan penjumlahan barisnya):
- **Tabel 6.1 (*Toko Rambak Maju*):** `31.300.000 + 850.000 = 32.150.000`, namun buku mencetak `Rp33.150.000,00` sehingga laba bersih tercetak `Rp9.495.000,00` (rumus aktual: `Rp8.495.000,00`).
- **Tabel 6.2 (*Toko Lancar Transportasi*):** Persediaan awal `4.987.000 + 12.850.000 = 17.837.000`, buku mencetak barang tersedia `8.453.000`, HPP `5.878.000`, Laba Kotor `26.577.000` (aktual dari `32.445.000 - 5.878.000 = 26.567.000`), serta bagian Laba Usaha & Pendapatan Lain-Lain.
- **Tabel 6.5 (*Usaha Jasa Lancar Maju*):** Judul seksi di atas liabilitas usaha tertulis "Liabilitas Jangka Panjang", padahal rincian dan subtotalnya adalah **Liabilitas Jangka Pendek** (`Rp6.200.000`).
- **Rasio PT ABC (2023):** `Total Utang / Ekuitas = 6.650 / 10.190 = 65,26%` (buku mencetak `62%`), dan `Total Utang / Total Aset = 6.650 / 16.840 = 39,49%` (buku mencetak `4%`).

**Prinsip Arsitektur:** Baik Excel maupun Aplikasi Web **selalu menghitung dengan rumus matematis asli secara akurat**, sambil menyediakan kolom/toggle **Referensi Cetakan Buku** agar siswa dan guru dapat memverifikasi keduanya secara transparan.

---

## 3. Arsitektur Aplikasi & Design Kit (`design-atmosphere-orchestrator`)

```text
app/
├── index.html                  # Shell semantik, <dialog> modal, skip link, aria landmarks
├── styles/
│   ├── tokens.css              # DESIGN.md tokens (Light archival cotton + Matte dark mineral)
│   ├── layout.css              # 264px sidebar, topbar, safe-zones, responsive drawer
│   └── components.css          # Double-rule ledger strips, tabular tables, meters, print styles
└── src/
    ├── main.js                 # Bootstrap router, theme toggle, keyboard nav, collapsible guide
    ├── atmosphere.js           # Tier 0/1 static ledger backdrop + 1x1 sRGB Color Bridge
    ├── data/
    │   ├── bab6Data.js         # Seluruh data terstruktur Tabel 6.1–6.5 & Studi Kasus PT ABC
    │   └── blueprintData.js    # Data interaktif Blueprint & 24 Microtasks
    ├── engine/
    │   ├── accounting.js       # Kalkulator Laba Rugi, Ekuitas, Neraca, Balance Invariant & 10 Rasio
    │   └── xlsxExporter.js     # Generator file .xlsx murni di browser (ZIP Store + OOXML formulas)
    └── views/
        ├── overviewView.js     # Ringkasan materi, tujuan pembelajaran, pengguna laporan, KPI meters
        ├── statementsView.js   # Tab Tabel 6.1–6.5 + toggle Angka Aktual vs Cetakan Buku
        ├── caseStudyView.js    # PT ABC komparatif 2022–2023 + Analisis 10 Rasio & interpretasi
        ├── builderView.js      # Kalkulator & Input Usaha Mandiri + Export .xlsx & Print
        ├── blueprintView.js    # Visualisasi Blueprint Arsitektur & Rumus Matematis
        └── microtasksView.js   # Papan Microtasks interaktif (filter Epic, status, checklist)
```

---

## 4. Kontrak Rumus Excel (`Laporan_Keuangan_Bab6_Lengkap.xlsx`)
Workbook terdiri dari **9 Sheet** dengan relasi formula lintas-sheet:
1. `Ringkasan Eksekutif` -> menarik KPI dari seluruh sheet laporan & menampilkan daftar catatan rekonsiliasi buku.
2. `LR Single Step` -> `=SUM(...)` pendapatan & biaya, `=TotalPendapatan - TotalBiaya`.
3. `LR Multiple Step` -> `=PersediaanAwal + PembelianBersih`, `=Tersedia - PersediaanAkhir`, `=Penjualan - HPP`, `=SUM(Beban)`, `=LabaUsaha + PendapatanLain - BiayaLain`.
4. `Perubahan Ekuitas` -> Perorangan (`=LabaBersih - Prive`, `=ModalAwal + Penambahan`) & PT (`=LabaDitahanAwal + LabaBersih - Dividen`).
5. `Neraca Lancar Maju` -> Subtotals `=SUM(...)`, Nilai Buku Aset Tetap (`=Perolehan - Akumulasi`), serta cek keseimbangan `=IF(ROUND(Aset,0)=ROUND(LiabilitasEkuitas,0),"SEIMBANG","SELISIH")`.
6. `PT ABC - Neraca` -> Komparatif 2022 vs 2023 + `Selisih (Rp)` (`=D-C`) & `Pertumbuhan (%)` (`=IF(C=0,0,(D-C)/C)`).
7. `PT ABC - Laba Rugi` -> Komparatif 2022 vs 2023 + Margin Laba Kotor, EBIT, EBT, EAT.
8. `PT ABC - Analisis Rasio` -> Rumus 10 rasio dinamis mereferensikan `'PT ABC - Neraca'` dan `'PT ABC - Laba Rugi'` + status kesehatan keuangan.
9. `Template Input Usaha` -> Area input pengguna (sel biru muda) yang menggerakkan laporan Laba Rugi, Neraca, Perubahan Modal, dan Rasio Keuangan secara otomatis.

---

## 5. Strategi Pengujian & Gerbang Kualitas
1. **Validasi Excel OOXML:** Pemeriksaan struktur ZIP, kevalidan XML seluruh worksheet/sharedStrings/styles dengan `lxml`, dan verifikasi keberadaan rumus `=` serta tidak ada error `#REF!`/`#VALUE!`.
2. **Unit Test Mesin Akuntansi (`node --test`):** Menguji kalkulasi Tabel 6.1–6.5, keseimbangan neraca, 10 rasio PT ABC, serta fungsi ekspor `.xlsx` JS.
3. **Design Kit & Anti-Slop Audit:**
   - `node "$HOME/.gemini/config/skills/design-atmosphere-orchestrator/scripts/dak.mjs" audit app`
   - `node "$HOME/.local/share/design-kit/vendor/avoid-ai-design/scripts/detect.mjs" app`
   - Memastikan 0 P0, kepatuhan safe-zone, 0 hex hardcoded di JS atmosfer, dan kesiapan `data-atmosphere-ready="true"`.
