import { BLUEPRINT_NODES } from '../data/blueprintData.js';

export function renderBlueprintView(container) {
  container.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Blueprint Arsitektur Aplikasi &amp; Workbook Excel</h3>
          <p class="panel-subtitle">Dokumen teknis lengkap tersedia di BLUEPRINT.md dan DESIGN.md pada root proyek</p>
        </div>
        <span class="badge badge-ok">4 Lapisan Terintegrasi</span>
      </div>

      <div class="blueprint-flow">
        ${BLUEPRINT_NODES.map(
          (node) => `
          <article class="bp-node">
            <h4>${node.layer}</h4>
            <ul>
              ${node.modules.map((m) => `<li>${m}</li>`).join('')}
            </ul>
          </article>`
        ).join('')}
      </div>
    </section>

    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Peta 9 Sheet Workbook Excel (.xlsx)</h3>
            <p class="panel-subtitle">File: Laporan_Keuangan_Bab6_Lengkap.xlsx (170 Rumus Lintas-Sheet)</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr><th>Sheet</th><th>Konten &amp; Sumber PDF</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>1. Ringkasan Eksekutif</strong></td><td>KPI lintas-sheet + katalog rekonsiliasi salah cetak buku</td></tr>
              <tr><td><strong>2. LR Single Step</strong></td><td>Tabel 6.1 Toko Rambak Maju (rumus aktual vs cetakan buku)</td></tr>
              <tr><td><strong>3. LR Multiple Step</strong></td><td>Tabel 6.2 Toko Lancar Transportasi (HPP, Laba Kotor, Laba Usaha)</td></tr>
              <tr><td><strong>4. Perubahan Ekuitas</strong></td><td>Tabel 6.3 Perorangan &amp; Tabel 6.4 Laba Ditahan PT (Laundry Resik)</td></tr>
              <tr><td><strong>5. Neraca Lancar Maju</strong></td><td>Tabel 6.5 dengan nilai buku aset tetap &amp; cek SEIMBANG</td></tr>
              <tr><td><strong>6. PT ABC - Neraca</strong></td><td>Komparatif 2022 vs 2023 + selisih YoY (Rp &amp; %)</td></tr>
              <tr><td><strong>7. PT ABC - Laba Rugi</strong></td><td>Komparatif 2022 vs 2023 (Penjualan, HPP, EBIT, EBT, EAT)</td></tr>
              <tr><td><strong>8. PT ABC - Analisis Rasio</strong></td><td>10 Rasio Bab 6 dinamis mereferensikan Neraca &amp; Laba Rugi</td></tr>
              <tr><td><strong>9. Template Input Usaha</strong></td><td>Area input mandiri berwarna biru untuk praktik siswa/UMKM</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Kontrak Design Kit (design-atmosphere-orchestrator)</h3>
            <p class="panel-subtitle">Profil greenfield-app + Theme Harmony Matrix + 8 Hard Contracts</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="ledger-table">
            <thead>
              <tr><th>Kontrak</th><th>Implementasi Terkunci</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Palet &amp; Mode</strong></td><td>Light Archival Cotton (#f6f3eb) &amp; Matte Mineral Dark (#131614, zero neon)</td></tr>
              <tr><td><strong>Atmosfer Tier 0/1</strong></td><td>Pre-baked 256×256 cotton grain + garis marjin akuntansi statis (Mode A, z-index: 0)</td></tr>
              <tr><td><strong>Color Bridge</strong></td><td>Resolusi token via 1×1 sRGB canvas + MutationObserver + matchMedia</td></tr>
              <tr><td><strong>Tipografi</strong></td><td>Newsreader + Plus Jakarta Sans + JetBrains Mono tabular-nums (bebas Inter)</td></tr>
              <tr><td><strong>Aksesibilitas</strong></td><td>Focus ring 2px, error modal inline di atas tombol, Panduan tersembunyi default</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}
