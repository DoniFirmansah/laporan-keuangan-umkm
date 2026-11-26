# NeracaSederhana — Aplikasi Laporan Keuangan UMKM Berbasis Web & Excel

Aplikasi pembukuan dan analisis laporan keuangan berbasis web yang **ramah bagi UMKM** dengan penerapan ketat **prinsip akuntansi berpasangan (Debit = Kredit selalu seimbang)** untuk mencegah data hilang atau tidak sinkron.

---

## Fitur Utama

### 1. Pembukuan UMKM Ramah Pengguna (Double-Entry Ledger)
- **Catat Cepat Transaksi UMKM:** Preset transaksi harian berbahasa sederhana (*Penjualan Tunai*, *Penjualan Kredit/Piutang*, *Beli Stok Barang*, *Bayar Gaji/Sewa/Listrik*, *Beli Peralatan*, *Setoran Modal*, *Prive*, *Pinjaman Bank*) yang mengisi pasangan akun **Debit & Kredit** secara otomatis.
- **Gerbang Keseimbangan Ketat (`Debit === Kredit`):** Transaksi ditolak jika total sisi Debit tidak sama dengan total sisi Kredit atau bernilai nol/negatif.
- **3 Laporan Akuntansi Bisnis Lengkap & Sinkron:**
  1. **Laporan Laba Rugi (*Income Statement*):** Pendapatan, HPP, Laba Kotor, Beban Operasional, hingga Laba/Rugi Bersih.
  2. **Laporan Neraca (*Balance Sheet*):** Aset Lancar, Aset Tetap (beserta Akumulasi Penyusutan), Liabilitas, dan Ekuitas Akhir dengan invarian `Total Aset = Total Liabilitas + Ekuitas` (`SEIMBANG`).
  3. **Laporan Arus Kas (*Cash Flow Statement*):** Metode langsung dari mutasi akun Kas & Bank (`1-101`), terpecah ke **Aktivitas Operasi**, **Aktivitas Investasi**, dan **Aktivitas Pendanaan**, dan selalu sinkron dengan saldo Kas pada Neraca.
- **Neraca Saldo (*Trial Balance*):** Ringkasan mutasi dan saldo akhir seluruh akun Buku Besar.
- **Anti-Hilang Data & Ekspor Excel:** Auto-simpan ke `localStorage`, fitur **Cadangkan & Pulihkan JSON** (terverifikasi seimbang), serta ekspor langsung ke file **`.xlsx` 4 sheet berumus Excel aktif** dari browser.

### 2. Materi & Studi Kasus Laporan Keuangan Sederhana (Bab 6)
- **Laporan Keuangan Tabel 6.1–6.5:** Laba Rugi *Single Step* (*Toko Rambak Maju*), Laba Rugi *Multiple Step* (*Toko Lancar Transportasi*), Perubahan Ekuitas & Laba Ditahan (*Laundry Resik*), dan Neraca (*Usaha Jasa Lancar Maju*) dengan sakelar perbandingan *Rumus Aktual* vs *Cetakan Buku*.
- **Studi Kasus PT ABC (2022 vs 2023):** Neraca & Laba Rugi Komparatif beserta analisis **10 Rasio Keuangan** (Likuiditas, Solvabilitas, Rentabilitas).
- **Workbook Excel Lengkap:** [Laporan_Keuangan_Bab6_Lengkap.xlsx](Laporan_Keuangan_Bab6_Lengkap.xlsx) (9 sheet, 170 rumus lintas-sheet) yang dihasilkan oleh [scripts/generate_excel.py](scripts/generate_excel.py).

### 3. Arsitektur & Dokumentasi Proyek
- **Blueprint Sistem:** [BLUEPRINT.md](BLUEPRINT.md)
- **Pemecahan Microtasks (24 Paket Kerja):** [MICROTASKS.md](MICROTASKS.md)
- **Kontrak Sistem Desain:** [DESIGN.md](DESIGN.md) & [.interface-design/system.md](.interface-design/system.md)

---

## Cara Menjalankan Secara Lokal

```bash
# 1. Jalankan server statis dari folder proyek
python3 -m http.server 8080

# 2. Buka aplikasi di browser
# http://localhost:8080/app/
```

---

## Pengujian Otomatis

```bash
node --test tests/accounting.test.mjs
```

Seluruh 7 suite pengujian mencakup validasi keseimbangan Debit=Kredit, penolakan jurnal tidak seimbang, rekonsiliasi Kas Arus Kas = Neraca, perhitungan Tabel 6.1–6.5, 10 rasio PT ABC, serta validitas arsip `.xlsx`.
