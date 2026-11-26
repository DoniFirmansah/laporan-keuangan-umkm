import { formatPct, formatRp } from '../engine/accounting.js';

function esc(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function compactRp(val) {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}Rp${abs}`;
}

/**
 * Visualisasi 1: Jembatan Keseimbangan Neraca (Accounting Scale & Equilibrium Bridge SVG)
 */
export function renderBalanceScaleSvg({
  currentAssets,
  fixedAssets,
  liabilities,
  equity,
  isBalanced,
}) {
  const totalAssets = Math.max(1, currentAssets + fixedAssets);
  const totalRight = Math.max(1, liabilities + Math.max(0, equity));
  const caPct = Math.round((currentAssets / totalAssets) * 100);
  const faPct = Math.max(0, 100 - caPct);
  const liabPct = Math.round((liabilities / totalRight) * 100);
  const eqPct = Math.max(0, 100 - liabPct);

  const caW = Math.max(0, (currentAssets / totalAssets) * 230);
  const faW = Math.max(0, 230 - caW);
  const liabW = Math.max(0, (liabilities / totalRight) * 230);
  const eqW = Math.max(0, 230 - liabW);

  return `
    <div class="viz-box" aria-label="Diagram keseimbangan neraca aset terhadap liabilitas dan ekuitas">
      <svg viewBox="0 0 600 138" width="100%" height="auto" role="img" aria-label="Timbangan Neraca Seimbang">
        <!-- Left Bar: Total Aset -->
        <text x="16" y="22" font-size="11.5" font-weight="700" fill="var(--text-primary)">SISI AKTIVA (TOTAL ASET: ${esc(compactRp(currentAssets + fixedAssets))})</text>
        <rect x="16" y="32" width="230" height="24" rx="5" fill="var(--bg-inset)" />
        <rect x="16" y="32" width="${caW.toFixed(1)}" height="24" rx="5" fill="var(--accent-primary)" />
        <rect x="${(16 + caW).toFixed(1)}" y="32" width="${faW.toFixed(1)}" height="24" rx="3" fill="var(--accent-secondary)" />
        <text x="16" y="74" font-size="11" fill="var(--text-secondary)">Lancar ${caPct}% (${esc(compactRp(currentAssets))})</text>
        <text x="246" y="74" font-size="11" text-anchor="end" fill="var(--text-secondary)">Tetap ${faPct}% (${esc(compactRp(fixedAssets))})</text>

        <!-- Center Equilibrium Fulcrum -->
        <line x1="256" y1="44" x2="344" y2="44" stroke="var(--border-strong)" stroke-width="2" stroke-dasharray="4 3" />
        <polygon points="300,26 318,58 282,58" fill="${isBalanced ? 'var(--accent-primary)' : 'var(--status-err)'}" opacity="0.16" stroke="${isBalanced ? 'var(--accent-primary)' : 'var(--status-err)'}" stroke-width="1.6" />
        <text x="300" y="49" font-size="12" font-weight="700" text-anchor="middle" fill="${isBalanced ? 'var(--accent-primary)' : 'var(--status-err)'}">=</text>
        <text x="300" y="76" font-size="10.5" font-weight="700" text-anchor="middle" fill="${isBalanced ? 'var(--status-ok)' : 'var(--status-err)'}">${isBalanced ? 'SEIMBANG' : 'SELISIH'}</text>

        <!-- Right Bar: Liabilitas + Ekuitas -->
        <text x="354" y="22" font-size="11.5" font-weight="700" fill="var(--text-primary)">PASIVA (LIABILITAS + EKUITAS: ${esc(compactRp(liabilities + equity))})</text>
        <rect x="354" y="32" width="230" height="24" rx="5" fill="var(--bg-inset)" />
        <rect x="354" y="32" width="${liabW.toFixed(1)}" height="24" rx="5" fill="var(--status-err)" opacity="0.78" />
        <rect x="${(354 + liabW).toFixed(1)}" y="32" width="${eqW.toFixed(1)}" height="24" rx="3" fill="var(--accent-primary)" />
        <text x="354" y="74" font-size="11" fill="var(--text-secondary)">Utang ${liabPct}% (${esc(compactRp(liabilities))})</text>
        <text x="584" y="74" font-size="11" text-anchor="end" fill="var(--text-secondary)">Ekuitas ${eqPct}% (${esc(compactRp(equity))})</text>

        <!-- Legend Strip -->
        <rect x="16" y="102" width="10" height="10" rx="2" fill="var(--accent-primary)" />
        <text x="32" y="111" font-size="11" fill="var(--text-muted)">Aset Lancar / Ekuitas</text>
        <rect x="180" y="102" width="10" height="10" rx="2" fill="var(--accent-secondary)" />
        <text x="196" y="111" font-size="11" fill="var(--text-muted)">Aset Tetap</text>
        <rect x="295" y="102" width="10" height="10" rx="2" fill="var(--status-err)" opacity="0.78" />
        <text x="311" y="111" font-size="11" fill="var(--text-muted)">Liabilitas / Utang</text>
      </svg>
    </div>
  `;
}

/**
 * Visualisasi 2: Ring Komposisi Laba Rugi (SVG Donut Chart)
 */
export function renderProfitCompositionRingSvg({ totalRevenue, cogs, operatingExpenses, netIncome }) {
  const base = Math.max(1, totalRevenue);
  const cogsVal = Math.max(0, cogs);
  const opexVal = Math.max(0, operatingExpenses);
  const profitVal = Math.max(0, netIncome);
  const totalParts = Math.max(1, cogsVal + opexVal + profitVal);

  const r = 44;
  const circ = 2 * Math.PI * r;
  const cogsLen = (cogsVal / totalParts) * circ;
  const opexLen = (opexVal / totalParts) * circ;
  const profitLen = (profitVal / totalParts) * circ;

  const profitPct = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return `
    <div class="viz-ring-wrap">
      <svg viewBox="0 0 120 120" width="116" height="116" role="img" aria-label="Komposisi Pendapatan menjadi HPP, Beban, dan Laba Bersih">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--bg-inset)" stroke-width="14" />
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--accent-secondary)" stroke-width="14"
          stroke-dasharray="${cogsLen.toFixed(2)} ${circ.toFixed(2)}"
          transform="rotate(-90 60 60)" />
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--status-err)" stroke-opacity="0.72" stroke-width="14"
          stroke-dasharray="${opexLen.toFixed(2)} ${circ.toFixed(2)}"
          stroke-dashoffset="${(-cogsLen).toFixed(2)}"
          transform="rotate(-90 60 60)" />
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--accent-primary)" stroke-width="14"
          stroke-dasharray="${profitLen.toFixed(2)} ${circ.toFixed(2)}"
          stroke-dashoffset="${(-(cogsLen + opexLen)).toFixed(2)}"
          transform="rotate(-90 60 60)" />
        <text x="60" y="57" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text-primary)">${profitPct.toFixed(1)}%</text>
        <text x="60" y="72" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">Margin</text>
      </svg>

      <div class="viz-legend">
        <div class="viz-legend-row">
          <span class="viz-dot" style="background:var(--accent-primary)"></span>
          <span>Laba Bersih</span>
          <strong class="tabular">${formatRp(netIncome)}</strong>
        </div>
        <div class="viz-legend-row">
          <span class="viz-dot" style="background:var(--accent-secondary)"></span>
          <span>HPP (${((cogsVal / base) * 100).toFixed(1)}%)</span>
          <strong class="tabular">${formatRp(cogs)}</strong>
        </div>
        <div class="viz-legend-row">
          <span class="viz-dot" style="background:var(--status-err);opacity:0.78"></span>
          <span>Beban Usaha (${((opexVal / base) * 100).toFixed(1)}%)</span>
          <strong class="tabular">${formatRp(operatingExpenses)}</strong>
        </div>
      </div>
    </div>
  `;
}

/**
 * Visualisasi 3: Waterfall Arus Kas (Cash-Flow Bridge SVG)
 */
export function renderCashFlowWaterfallSvg({
  beginningCash,
  operatingCash,
  investingCash,
  financingCash,
  endingCash,
}) {
  const afterOp = beginningCash + operatingCash;
  const afterInv = afterOp + investingCash;
  const afterFin = afterInv + financingCash;

  const points = [0, beginningCash, afterOp, afterInv, afterFin, endingCash];
  const minVal = Math.min(...points);
  const maxVal = Math.max(...points, 1);
  const span = Math.max(1, maxVal - minVal);

  const chartTop = 28;
  const chartBottom = 148;
  const chartH = chartBottom - chartTop;
  const yOf = (v) => chartBottom - ((v - minVal) / span) * chartH;
  const zeroY = yOf(0);

  const steps = [
    { label: 'Kas Awal', start: 0, end: beginningCash, val: beginningCash, kind: 'total' },
    { label: 'Operasi', start: beginningCash, end: afterOp, val: operatingCash, kind: 'delta' },
    { label: 'Investasi', start: afterOp, end: afterInv, val: investingCash, kind: 'delta' },
    { label: 'Pendanaan', start: afterInv, end: afterFin, val: financingCash, kind: 'delta' },
    { label: 'Kas Akhir', start: 0, end: endingCash, val: endingCash, kind: 'total' },
  ];

  const colCenters = [66, 178, 290, 402, 514];
  const barW = 58;

  const barsSvg = steps
    .map((st, idx) => {
      const cx = colCenters[idx];
      const x = cx - barW / 2;
      const y1 = yOf(st.start);
      const y2 = yOf(st.end);
      const top = Math.min(y1, y2);
      const h = Math.max(4, Math.abs(y2 - y1));
      const fill =
        st.kind === 'total'
          ? 'var(--text-primary)'
          : st.val >= 0
          ? 'var(--accent-primary)'
          : 'var(--status-err)';
      const valText = compactRp(st.val);
      const labelY = st.val >= 0 || st.kind === 'total' ? Math.max(14, top - 6) : Math.min(162, top + h + 13);

      const connector =
        idx < steps.length - 1
          ? `<line x1="${x + barW}" y1="${y2.toFixed(1)}" x2="${colCenters[idx + 1] - barW / 2}" y2="${y2.toFixed(1)}" stroke="var(--border-strong)" stroke-dasharray="3 3" stroke-width="1.2" />`
          : '';

      return `
        ${connector}
        <rect x="${x}" y="${top.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="4" fill="${fill}" opacity="${st.kind === 'total' ? '0.86' : '0.92'}" />
        <text x="${cx}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--text-primary)">${esc(valText)}</text>
        <text x="${cx}" y="178" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">${st.label}</text>
      `;
    })
    .join('');

  return `
    <div class="viz-box" aria-label="Grafik jembatan arus kas (Waterfall)">
      <svg viewBox="0 0 580 190" width="100%" height="auto" role="img" aria-label="Waterfall Arus Kas">
        <line x1="20" y1="${zeroY.toFixed(1)}" x2="560" y2="${zeroY.toFixed(1)}" stroke="var(--border-strong)" stroke-width="1" />
        ${barsSvg}
      </svg>
    </div>
  `;
}

/**
 * Visualisasi 4: Dumbbell Trajectory Chart (2022 vs 2023) untuk Rasio PT ABC
 */
export function renderRatioDumbbellSvg(ratios22, ratios23) {
  const pctRatios23 = ratios23.filter((r) => r.kind === 'pct');
  const maxVal = Math.max(1, ...pctRatios23.map((r) => r.value), ...ratios22.filter((r) => r.kind === 'pct').map((r) => r.value));
  const leftX = 188;
  const rightX = 532;
  const spanX = rightX - leftX;
  const xOf = (v) => leftX + (Math.min(maxVal, Math.max(0, v)) / maxVal) * spanX;
  const rowH = 30;
  const height = 42 + pctRatios23.length * rowH;

  const rowsSvg = pctRatios23
    .map((r23, i) => {
      const r22 = ratios22.find((x) => x.id === r23.id) || r23;
      const y = 34 + i * rowH;
      const x22 = xOf(r22.value);
      const x23 = xOf(r23.value);
      const improved = r23.id.includes('debt') || r23.id.includes('ltl') ? r23.value <= r22.value : r23.value >= r22.value;
      const strokeColor = improved ? 'var(--accent-primary)' : 'var(--accent-secondary)';
      const shortName = r23.name.replace(/\s*\(.*?\)\s*/g, '');

      return `
        <line x1="${leftX}" y1="${y}" x2="${rightX}" y2="${y}" stroke="var(--border-subtle)" stroke-width="1" />
        <text x="12" y="${y + 4}" font-size="11" font-weight="600" fill="var(--text-secondary)">${esc(shortName)}</text>
        <line x1="${x22.toFixed(1)}" y1="${y}" x2="${x23.toFixed(1)}" y2="${y}" stroke="${strokeColor}" stroke-width="2.5" />
        <circle cx="${x22.toFixed(1)}" cy="${y}" r="5" fill="var(--bg-surface)" stroke="var(--accent-secondary)" stroke-width="2" />
        <circle cx="${x23.toFixed(1)}" cy="${y}" r="5.5" fill="var(--accent-primary)" />
        <text x="588" y="${y + 4}" text-anchor="end" font-size="10.5" font-weight="600" fill="var(--text-primary)">${esc(formatPct(r23.value, 1))}</text>
      `;
    })
    .join('');

  return `
    <div class="viz-box" aria-label="Grafik perbandingan trajektori rasio 2022 ke 2023">
      <svg viewBox="0 0 600 ${height}" width="100%" height="auto" role="img" aria-label="Dumbbell Chart Rasio 2022 vs 2023">
        <circle cx="16" cy="14" r="4.5" fill="var(--bg-surface)" stroke="var(--accent-secondary)" stroke-width="2" />
        <text x="26" y="18" font-size="11" fill="var(--text-muted)">Tahun 2022</text>
        <circle cx="116" cy="14" r="5" fill="var(--accent-primary)" />
        <text x="126" y="18" font-size="11" fill="var(--text-muted)">Tahun 2023</text>
        <text x="588" y="18" text-anchor="end" font-size="11" fill="var(--text-muted)">Nilai 2023</text>
        ${rowsSvg}
      </svg>
    </div>
  `;
}
