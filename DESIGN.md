# DESIGN.md — Sistem Desain Aplikasi Laporan Keuangan Sederhana (Bab 6)

## 1. Intent & Product Domain
- **Domain:** Akuntansi UMKM & Pembelajaran Kewirausahaan SMK/MAK Kelas XII (*Buku Proyek Kreatif dan Kewirausahaan — Bab 6: Laporan Keuangan Sederhana*).
- **Human:** Siswa akuntansi/kewirausahaan, guru pengajar, dan pemilik usaha kecil (*Toko Rambak Maju*, *Laundry Resik*, *PT ABC*, dan UMKM mandiri) yang memeriksa neraca, menghitung rasio likuiditas/solvabilitas/rentabilitas, serta menyusun laporan siap ekspor Excel.
- **Feel:** **Kertas Buku Besar Arsip & Meja Akuntan Tenang** — presisi, hangat secara alami seperti kertas katun arsip (`#f6f3eb`), tinta grafit gelap (`#191c1a`), dan aksen hijau buku kas mineral (`#1d5942`). Bukan template korporat biru-ungu, bukan *cream + terracotta* generik, dan bukan mode gelap neon.

## 2. Semantic Color Tokens (Light & Matte Dark Mode)

### Light Mode (`L > 0.179`, Default)
- `--bg-base`: `#f6f3eb` (Kertas katun arsip hangat — *archival cotton ledger*)
- `--bg-surface`: `#fbf9f4` (Lembar kerja utama)
- `--bg-elevated`: `#ffffff` (Dialog / popover / kartu aktif)
- `--bg-inset`: `#ebe6da` (Area terkunci / disabled well / baris subtotal)
- `--bg-input`: `#f1ede3` (Permukaan input — sedikit lebih gelap dari `--bg-surface` agar terasa *inset* siap ketik)
- `--text-primary`: `#181b19` (Tinta arsip)
- `--text-secondary`: `#424844` (Label & subjudul)
- `--text-muted`: `#636a65` (Metadata — tetap memenuhi kontras WCAG AA >= 4.5:1 terhadap `#f6f3eb`)
- `--text-placeholder`: `#757d77` (Teks bayangan input)
- `--border-subtle`: `rgba(24, 27, 25, 0.09)`
- `--border-strong`: `rgba(24, 27, 25, 0.18)`
- `--accent-primary`: `#1d5942` (Hijau tinta buku kas — *ledger pine*, saturasi terkendali)
- `--accent-primary-hover`: `#164634`
- `--accent-primary-tint`: `rgba(29, 89, 66, 0.10)`
- `--accent-secondary`: `#855e1c` (Kuning oker stempel / peringatan catatan buku)
- `--status-ok`: `#1d5942`
- `--status-warn`: `#855e1c`
- `--status-err`: `#9e3329`

### Dark Mode (`L <= 0.179`, Non-Neon Matte Mineral Hygiene)
- `--bg-base`: `#131614` (Batu tulis gelap matte, zero neon)
- `--bg-surface`: `#1a1e1b`
- `--bg-elevated`: `#222723`
- `--bg-inset`: `#101311`
- `--bg-input`: `#141815`
- `--text-primary`: `#eceae2`
- `--text-secondary`: `#c2c6be`
- `--text-muted`: `#969c94`
- `--text-placeholder`: `#747b74`
- `--border-subtle`: `rgba(236, 234, 226, 0.08)`
- `--border-strong`: `rgba(236, 234, 226, 0.16)`
- `--accent-primary`: `#6b9e88` (Mineral sage terdesaturasi `S <= 35%`, zero neon glow)
- `--accent-primary-hover`: `#7fb19b`
- `--accent-primary-tint`: `rgba(107, 158, 136, 0.14)`
- `--accent-secondary`: `#c49a52`
- `--status-ok`: `#6b9e88`
- `--status-warn`: `#c49a52`
- `--status-err`: `#d07268`

## 3. Typography & Hierarchy
- **Display / Headings:** `'Newsreader', 'Georgia', 'Times New Roman', serif` (wibawa laporan keuangan klasik & editorial).
- **UI Body:** `'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif` (jelas untuk label, formulir, dan navigasi Indonesia; bebas `Inter`).
- **Numeric & Accounting Codes:** `'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace` dengan `font-variant-numeric: tabular-nums;` wajib pada seluruh nominal Rupiah, rasio persen, dan kode mikrotask.
- **Scale (ratio ~1.25 from 14px base):** `11px` caption · `12px` meta · `14px` body · `16px` h4 · `18px` h3 · `22px` h2 · `28px` h1.

## 4. Layout, Safe-Zones & Atmosphere Contract
- **Safe Zones:**
  - `--atmo-safe-top: 64px`
  - `--atmo-safe-left: 264px` (sidebar navigasi `264px` pada desktop)
  - `--atmo-safe-right: 24px`
  - `--atmo-safe-bottom: 24px`
  - `data-atmo-density="app"`
- **Atmosphere Tier 0/1 (Static, Calmly Unique, Mode A):**
  - Canvas backdrop `position: fixed; inset: 0; z-index: 0; pointer-events: none;`
  - UI root `position: relative; z-index: 1;`
  - Pre-baked `256x256` cotton paper grain (sekali saat init, `opacity: 0.035`) + garis marjin arsitektural & busur jangka halus di tepi kanan/luar `--atmo-safe-left` (`7%–13%` delta tonal), `renderOnce()` statis pada init/resize/theme flip tanpa `RAF` loop dan tanpa `pointermove` listener.
  - `document.documentElement.dataset.atmosphereReady = "true"` diset segera setelah frame 1.
  - Semua warna pada Canvas 2D diselesaikan dari CSS custom properties melalui Color Bridge `1x1` canvas (`{ colorSpace: 'srgb', willReadFrequently: true }`), tersinkronisasi lewat `MutationObserver` & `matchMedia('(prefers-color-scheme: dark)')`.

## 5. Signature Element
- **Garis Pembukuan Ganda (*Double-Rule Accounting Balance Strip*):** Setiap laporan keuangan menampilkan pita neraca langsung di bagian atas/bawah dengan garis pembukuan ganda (`border-bottom: 3px double`) khas akuntansi Indonesia dan lencana verifikasi `SEIMBANG / SELISIH`.
