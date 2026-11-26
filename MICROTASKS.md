# MICROTASKS.md — Pemecahan Aplikasi & Laporan Excel Menjadi Microtask

Total: **6 Epic · 24 Microtask Atomik** (berurutan berdasarkan dependensi).

---

## Epic 1: Fondasi Materi, Rekonsiliasi Data & Design Kit Contract
| ID | Judul Microtask | Input | Output / Artefak | Kriteria Terima (*Acceptance Criteria*) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-01** | Ekstraksi & transkripsi seluruh angka Bab 6 dari `lap keuangan.pdf` | Halaman 1–26 `lap keuangan.pdf` | Data terstruktur Tabel 6.1–6.5 & PT ABC 2022–2023 | 100% akun, nominal, rumus rasio, dan soal kasus tercatat akurat | Selesai |
| **MT-02** | Audit aritmetika & katalog *errata* cetakan buku PDF | Data Tabel 6.1–6.5 & PT ABC | Tabel rekonsiliasi angka buku vs hitungan matematis | Setiap selisih cetak terdokumentasi beserta penyebabnya | Selesai |
| **MT-03** | Penguncian kontrak Design Kit (`greenfield-app` + `theme-harmony-matrix`) | Aturan `design-atmosphere-orchestrator` | `DESIGN.md` & `.interface-design/system.md` | Palet *Archival Cotton* & *Matte Mineral Dark* terkunci tanpa neon/slop | Selesai |
| **MT-04** | Penulisan arsitektur sistem & kontrak modul | Materi Bab 6 + `DESIGN.md` | `BLUEPRINT.md` & `MICROTASKS.md` | Blueprint skema data, rumus Excel, dan struktur app lengkap | Selesai |

---

## Epic 2: Generator Workbook Excel Multi-Sheet (`.xlsx`)
| ID | Judul Microtask | Input | Output / Artefak | Kriteria Terima (*Acceptance Criteria*) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-05** | Pembangunan utilitas OOXML `.xlsx` (styles, border akuntansi, format Rupiah & `%`) | Spesifikasi OOXML SpreadsheetML | `scripts/generate_excel.py` | Mendukung formula, number format `Rp`, `0.00%`, `0.00"x"`, merge & freeze pane | Selesai |
| **MT-06** | Sheet `Ringkasan Eksekutif` & peta daftar laporan + katalog errata | Metrik seluruh sheet | Sheet 1 pada `.xlsx` | KPI terhubung rumus lintas-sheet & tabel catatan PDF jelas | Selesai |
| **MT-07** | Sheet `LR Single Step` (Toko Rambak Maju) & `LR Multiple Step` (Toko Lancar Transportasi) | Tabel 6.1 & 6.2 | Sheet 2 & Sheet 3 pada `.xlsx` | Rumus `=SUM(...)`, HPP, Laba Kotor, Laba Usaha, dan kolom referensi buku aktif | Selesai |
| **MT-08** | Sheet `Perubahan Ekuitas` (Laundry Resik Perorangan & PT) & `Neraca Lancar Maju` | Tabel 6.3, 6.4, 6.5 | Sheet 4 & Sheet 5 pada `.xlsx` | Neraca menampilkan `SEIMBANG` (`31.075.000 = 31.075.000`) | Selesai |
| **MT-09** | Sheet `PT ABC - Neraca`, `PT ABC - Laba Rugi`, & `PT ABC - Analisis Rasio` | Studi Kasus PT ABC 2022–2023 | Sheet 6, 7, 8 pada `.xlsx` | Komparatif YoY & 10 rumus rasio dinamis mereferensikan sheet Neraca/LR | Selesai |
| **MT-10** | Sheet `Template Input Usaha` untuk praktik mandiri siswa/UMKM | Skema akun standar | Sheet 9 pada `.xlsx` | Sel input terpisah jelas, menghasilkan LR, Neraca, Balance Check & Rasio | Selesai |

---

## Epic 3: Mesin Akuntansi & Generator `.xlsx` Sisi Klien (JavaScript)
| ID | Judul Microtask | Input | Output / Artefak | Kriteria Terima (*Acceptance Criteria*) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-11** | Penyusunan dataset kanonik JS (`bab6Data.js` & `blueprintData.js`) | Data terverifikasi MT-01/MT-02 | `app/src/data/*.js` | Seluruh tabel, rumus, konsep, dan microtasks tersedia sebagai modul ESM | Selesai |
| **MT-12** | Implementasi mesin kalkulator Laba Rugi, Ekuitas & Neraca | Dataset & skema input | `app/src/engine/accounting.js` | Mendukung mode `actual` vs `book`, validasi `SEIMBANG`, dan uji unit | Selesai |
| **MT-13** | Implementasi kalkulator 10 Rasio Keuangan & evaluator kesehatan usaha | Rumus Likuiditas, Solvabilitas, Rentabilitas | Fungsi rasio di `accounting.js` | Menangani pembagi nol aman dan mengembalikan interpretasi status | Selesai |
| **MT-14** | Implementasi generator `.xlsx` murni di browser (ZIP Store CRC32 + OOXML) | State laporan dari app | `app/src/engine/xlsxExporter.js` | User dapat mengunduh `.xlsx` berumus langsung dari input usaha mandiri | Selesai |

---

## Epic 4: Sistem Desain, Token CSS & Atmosfer Tier 0/1
| ID | Judul Microtask | Input | Output / Artefak | Kriteria Terima (*Acceptance Criteria*) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-15** | Penulisan token CSS Light & Matte Dark Mode + tipografi `tabular-nums` | `DESIGN.md` | `app/styles/tokens.css` | Kontras WCAG AA >= 4.5:1, zero neon dark mode, zero `Inter` | Selesai |
| **MT-16** | Layout workbench 264px sidebar, safe-zone `--atmo-safe-*` & responsive drawer | `greenfield-app.md` | `app/styles/layout.css` | Navigasi desktop & mobile mulus tanpa overflow horizontal | Selesai |
| **MT-17** | Komponen akuntansi (garis pembukuan ganda, tabel, meter proporsional, dialog) | `interface-design` | `app/styles/components.css` | `:focus-visible` tegas, input inset jelas, tombol ikon SVG fungsional | Selesai |
| **MT-18** | Engine Atmosfer Tier 0/1 statis (paper grain 256×256 + ledger margin rule + Color Bridge) | Kontrak 8 Design Kit | `app/src/atmosphere.js` | Mode A `z-index: 0`, `1x1` sRGB Color Bridge, `data-atmosphere-ready="true"` | Selesai |

---

## Epic 5: Antarmuka Multi-Layar Aplikasi Web
| ID | Judul Microtask | Input | Output / Artefak | Kriteria Terima (*Acceptance Criteria*) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-19** | Layar `Ringkasan & Materi`: KPI utama, konsep Bab 6 & `Tampilkan Panduan` kolapsibel | `bab6Data.js` | `app/src/views/overviewView.js` | Panduan tersembunyi default; kartu ringkasan menampilkan data nyata | Selesai |
| **MT-20** | Layar `Laporan Keuangan`: Tab Tabel 6.1–6.5 & switch Hitungan Aktual / Cetakan Buku | `accounting.js` | `app/src/views/statementsView.js` | User bisa membandingkan angka aktual vs cetakan buku & mencari akun | Selesai |
| **MT-21** | Layar `PT ABC & Analisis Rasio`: Neraca/LR Komparatif 2022–2023 + 10 kartu rasio & bar | `accounting.js` | `app/src/views/caseStudyView.js` | Selisih YoY, rumus eksplisit, dan bar komparasi 2022 vs 2023 tampil rapi | Selesai |
| **MT-22** | Layar `Kalkulator & Input Usaha`: Editor akun interaktif, dialog tambah akun, ekspor `.xlsx` | `accounting.js` + `xlsxExporter.js` | `app/src/views/builderView.js` | Validasi error di dalam `<dialog>`, konfirmasi reset, dan unduh `.xlsx` sukses | Selesai |
| **MT-23** | Layar `Blueprint` & `Microtasks Board`: Diagram arsitektur interaktif & checklist progres | `blueprintData.js` | `blueprintView.js`, `microtasksView.js` | Filter epic, pencarian microtask, dan toggle status checklist tersimpan lokal | Selesai |

---

## Epic 6: Pengujian Terpadu & Audit Design Kit
| ID | Judul Microtask | Input | Output / Artefak | Kriteria Terima (*Acceptance Criteria*) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MT-24** | Pengujian `.xlsx` (XML/formula), unit test mesin akuntansi, serta `dak.mjs audit` & `detect.mjs` | Seluruh artefak | Laporan verifikasi lulus 100% | 0 error XML/formula, seluruh unit test lulus, 0 pelanggaran P0/stacking/safe-zone | Selesai |
