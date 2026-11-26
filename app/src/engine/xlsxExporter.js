/**
 * Pure Browser / Zero-Dependency OOXML (.xlsx) Generator
 * Menggunakan ZIP Store (method 0) + CRC-32 resmi agar file .xlsx terbuka mulus
 * di Excel, LibreOffice Calc, Google Sheets, dan WPS Office dengan rumus aktif.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function colName(idx) {
  let n = idx;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildZipStore(files) {
  const encoder = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const { name, content } of files) {
    const nameBytes = encoder.encode(name);
    const dataBytes = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const lfh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lfh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8
    lv.setUint16(8, 0, true); // Store
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x5421, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);

    localChunks.push(lfh, dataBytes);

    const cdh = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cdh.set(nameBytes, 46);

    centralChunks.push(cdh);
    offset += lfh.length + size;
  }

  const centralSize = centralChunks.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLen = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const ch of localChunks) {
    out.set(ch, pos);
    pos += ch.length;
  }
  for (const ch of centralChunks) {
    out.set(ch, pos);
    pos += ch.length;
  }
  out.set(eocd, pos);
  return out;
}

function makeSheetXml(rows, colWidths = [40, 22, 22]) {
  const colsXml = colWidths
    .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  const rowsXml = rows
    .map((cells, rIdx) => {
      const r = rIdx + 1;
      const cellXml = cells
        .map((cell, cIdx) => {
          if (!cell && cell !== 0) return '';
          const ref = `${colName(cIdx + 1)}${r}`;
          if (typeof cell === 'object' && cell.formula) {
            const s = cell.style ?? 0;
            const valPart =
              cell.cached !== undefined && cell.cached !== null
                ? typeof cell.cached === 'string'
                  ? `<v>${escapeXml(cell.cached)}</v>`
                  : `<v>${cell.cached}</v>`
                : '';
            const tAttr = typeof cell.cached === 'string' ? ' t="str"' : '';
            return `<c r="${ref}" s="${s}"${tAttr}><f>${escapeXml(cell.formula)}</f>${valPart}</c>`;
          }
          if (typeof cell === 'object') {
            const s = cell.style ?? 0;
            if (typeof cell.val === 'number') {
              return `<c r="${ref}" s="${s}"><v>${cell.val}</v></c>`;
            }
            return `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${escapeXml(cell.val ?? '')}</t></is></c>`;
          }
          if (typeof cell === 'number') {
            return `<c r="${ref}" s="3"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" s="0" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r}">${cellXml}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowsXml}</sheetData>` +
    '</worksheet>'
  );
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="3">' +
  '<numFmt numFmtId="164" formatCode="&quot;Rp&quot;#,##0;(&quot;Rp&quot;#,##0);&quot;-&quot;"/>' +
  '<numFmt numFmtId="165" formatCode="0.00%"/>' +
  '<numFmt numFmtId="166" formatCode="0.00&quot; kali&quot;"/>' +
  '</numFmts>' +
  '<fonts count="4">' +
  '<font><sz val="10"/><color rgb="FF181B19"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="13"/><color rgb="FF181B19"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="10"/><color rgb="FF1D5942"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="4">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1D5942"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEBF1ED"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="3">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFD2CEC2"/></left><right style="thin"><color rgb="FFD2CEC2"/></right><top style="thin"><color rgb="FFD2CEC2"/></top><bottom style="thin"><color rgb="FFD2CEC2"/></bottom></border>' +
  '<border><left style="thin"><color rgb="FFD2CEC2"/></left><right style="thin"><color rgb="FFD2CEC2"/></right><top style="thin"><color rgb="FF181B19"/></top><bottom style="double"><color rgb="FF181B19"/></bottom></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="8">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>' + // 0: text
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>' + // 1: title
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0"/>' + // 2: header
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>' + // 3: Rp
  '<xf numFmtId="164" fontId="3" fillId="3" borderId="2" xfId="0" applyNumberFormat="1"/>' + // 4: Total Rp
  '<xf numFmtId="0" fontId="3" fillId="3" borderId="2" xfId="0"/>' + // 5: Total Label
  '<xf numFmtId="165" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>' + // 6: Pct
  '<xf numFmtId="166" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>' + // 7: Times
  '</cellXfs>' +
  '</styleSheet>';

export function generateCustomWorkbookBytes(state, calc) {
  // Backward-compatible wrapper or full UMKM Double-Entry workbook
  if (state && Array.isArray(state.entries)) {
    return generateUmkmLedgerWorkbookBytes(state, calc);
  }
  return generateLegacyCustomWorkbookBytes(state, calc);
}

export function generateUmkmLedgerWorkbookBytes(umkmState, report) {
  const { incomeStatement: is, balanceSheet: bs, cashFlow: cf, trialBalance } = report;

  // Sheet 1: Jurnal Umum (Debit = Kredit)
  const jrnRows = [
    [{ val: `${umkmState.businessName} — Jurnal Umum Double-Entry`, style: 1 }],
    [{ val: `Periode: ${umkmState.periodLabel} | Prinsip: Total Debit = Total Kredit`, style: 0 }],
    [],
    [
      { val: 'No Jurnal', style: 2 },
      { val: 'Tanggal', style: 2 },
      { val: 'Keterangan', style: 2 },
      { val: 'Kode Akun', style: 2 },
      { val: 'Debit (Rp)', style: 2 },
      { val: 'Kredit (Rp)', style: 2 },
    ],
  ];
  const jrnStart = 5;
  for (const e of umkmState.entries) {
    for (const ln of e.lines) {
      jrnRows.push([
        { val: e.id, style: 0 },
        { val: e.date, style: 0 },
        { val: e.description, style: 0 },
        { val: ln.accountCode, style: 0 },
        { val: Number(ln.debit || 0), style: 3 },
        { val: Number(ln.credit || 0), style: 3 },
      ]);
    }
  }
  const jrnEnd = jrnRows.length;
  jrnRows.push([
    { val: 'TOTAL JURNAL UMUM', style: 5 },
    { val: '', style: 5 },
    { val: '', style: 5 },
    { val: '', style: 5 },
    { formula: jrnEnd >= jrnStart ? `SUM(E${jrnStart}:E${jrnEnd})` : '0', cached: report.journalTotalDebit, style: 4 },
    { formula: jrnEnd >= jrnStart ? `SUM(F${jrnStart}:F${jrnEnd})` : '0', cached: report.journalTotalCredit, style: 4 },
  ]);
  const jrnTotRow = jrnRows.length;
  jrnRows.push([
    { val: 'Cek Keseimbangan Debit = Kredit', style: 5 },
    {
      formula: `IF(ROUND(E${jrnTotRow},0)=ROUND(F${jrnTotRow},0),"SEIMBANG","TIDAK SEIMBANG")`,
      cached: report.isJournalBalanced ? 'SEIMBANG' : 'TIDAK SEIMBANG',
      style: 5,
    },
  ]);

  // Sheet 2: Neraca Saldo (Trial Balance)
  const tbRows = [
    [{ val: `${umkmState.businessName} — Neraca Saldo`, style: 1 }],
    [{ val: `Periode: ${umkmState.periodLabel}`, style: 0 }],
    [],
    [
      { val: 'Kode', style: 2 },
      { val: 'Nama Akun', style: 2 },
      { val: 'Debit (Rp)', style: 2 },
      { val: 'Kredit (Rp)', style: 2 },
    ],
  ];
  const tbStart = 5;
  for (const r of trialBalance) {
    tbRows.push([
      { val: r.code, style: 0 },
      { val: r.name, style: 0 },
      { val: r.tbDebit, style: 3 },
      { val: r.tbCredit, style: 3 },
    ]);
  }
  const tbEnd = tbRows.length;
  tbRows.push([
    { val: 'TOTAL NERACA SALDO', style: 5 },
    { val: '', style: 5 },
    { formula: tbEnd >= tbStart ? `SUM(C${tbStart}:C${tbEnd})` : '0', cached: report.tbDebit, style: 4 },
    { formula: tbEnd >= tbStart ? `SUM(D${tbStart}:D${tbEnd})` : '0', cached: report.tbCredit, style: 4 },
  ]);

  // Sheet 3: Laba Rugi & Neraca
  const stmtRows = [
    [{ val: `${umkmState.businessName} — Laba Rugi & Neraca`, style: 1 }],
    [{ val: `Periode: ${umkmState.periodLabel}`, style: 0 }],
    [],
    [{ val: 'Laporan Laba Rugi', style: 2 }, { val: 'Nominal (Rp)', style: 2 }],
  ];
  const revStart = 5;
  for (const r of is.revenueAccounts) {
    stmtRows.push([{ val: `${r.code} ${r.name}`, style: 0 }, { val: r.balance, style: 3 }]);
  }
  const revEnd = stmtRows.length;
  stmtRows.push([
    { val: 'Total Pendapatan', style: 5 },
    { formula: revEnd >= revStart ? `SUM(B${revStart}:B${revEnd})` : '0', cached: is.totalRevenue, style: 4 },
  ]);
  const totRevRow = stmtRows.length;

  const expStart = stmtRows.length + 1;
  stmtRows.push([{ val: '5-101 Harga Pokok Penjualan (HPP)', style: 0 }, { val: is.cogs, style: 3 }]);
  for (const ex of is.operatingExpenses) {
    stmtRows.push([{ val: `${ex.code} ${ex.name}`, style: 0 }, { val: ex.balance, style: 3 }]);
  }
  const expEnd = stmtRows.length;
  stmtRows.push([
    { val: 'Total Beban', style: 5 },
    { formula: `SUM(B${expStart}:B${expEnd})`, cached: is.totalExpenses, style: 4 },
  ]);
  const totExpRow = stmtRows.length;
  stmtRows.push([
    { val: 'Laba Bersih Periode Berjalan', style: 5 },
    { formula: `B${totRevRow}-B${totExpRow}`, cached: is.netIncome, style: 4 },
  ]);
  const netIncRow = stmtRows.length;

  stmtRows.push([]);
  stmtRows.push([{ val: 'Laporan Neraca', style: 2 }, { val: 'Nominal (Rp)', style: 2 }]);
  const caStart = stmtRows.length + 1;
  for (const a of bs.currentAssetAccounts) {
    stmtRows.push([{ val: `${a.code} ${a.name}`, style: 0 }, { val: a.balance, style: 3 }]);
  }
  stmtRows.push([{ val: '1-201 Peralatan & Mesin (Bruto)', style: 0 }, { val: bs.equipmentGross, style: 3 }]);
  stmtRows.push([{ val: '1-202 (-) Akumulasi Penyusutan', style: 0 }, { val: -bs.accDep, style: 3 }]);
  const assetEnd = stmtRows.length;
  stmtRows.push([
    { val: 'TOTAL ASET', style: 5 },
    { formula: `SUM(B${caStart}:B${assetEnd})`, cached: bs.totalAssets, style: 4 },
  ]);
  const totAssetRow = stmtRows.length;

  const liabStart = stmtRows.length + 1;
  for (const l of [...bs.shortTermLiabAccounts, ...bs.longTermLiabAccounts]) {
    stmtRows.push([{ val: `${l.code} ${l.name}`, style: 0 }, { val: l.balance, style: 3 }]);
  }
  const liabEnd = stmtRows.length;
  stmtRows.push([
    { val: 'Total Liabilitas', style: 5 },
    { formula: liabEnd >= liabStart ? `SUM(B${liabStart}:B${liabEnd})` : '0', cached: bs.totalLiabilities, style: 4 },
  ]);
  const totLiabRow = stmtRows.length;

  stmtRows.push([{ val: '3-101 Modal Pemilik', style: 0 }, { val: bs.ownerCapital, style: 3 }]);
  const capRow = stmtRows.length;
  stmtRows.push([{ val: '3-201 (-) Prive Pemilik', style: 0 }, { val: bs.ownerDrawings, style: 3 }]);
  const drawRow = stmtRows.length;
  stmtRows.push([
    { val: 'Total Ekuitas Akhir', style: 5 },
    { formula: `B${capRow}-B${drawRow}+B${netIncRow}`, cached: bs.endingEquity, style: 4 },
  ]);
  const totEqRow = stmtRows.length;
  stmtRows.push([
    { val: 'TOTAL LIABILITAS & EKUITAS', style: 5 },
    { formula: `B${totLiabRow}+B${totEqRow}`, cached: bs.totalLiabilitiesAndEquity, style: 4 },
  ]);
  const totLeRow = stmtRows.length;
  stmtRows.push([
    { val: 'Status Keseimbangan Neraca', style: 5 },
    {
      formula: `IF(ROUND(B${totAssetRow},0)=ROUND(B${totLeRow},0),"SEIMBANG","SELISIH")`,
      cached: bs.isBalanced ? 'SEIMBANG' : 'SELISIH',
      style: 5,
    },
  ]);

  // Sheet 4: Arus Kas (Cash Flow Statement)
  const cfRows = [
    [{ val: `${umkmState.businessName} — Laporan Arus Kas`, style: 1 }],
    [{ val: `Periode: ${umkmState.periodLabel} (Metode Langsung dari Jurnal Kas)`, style: 0 }],
    [],
    [{ val: 'Aktivitas & Uraian Transaksi Kas', style: 2 }, { val: 'Tanggal', style: 2 }, { val: 'Arus Kas (Rp)', style: 2 }],
  ];
  const pushCfSection = (title, items, subtotalVal) => {
    cfRows.push([{ val: title, style: 5 }, { val: '', style: 5 }, { val: '', style: 5 }]);
    const start = cfRows.length + 1;
    if (items.length === 0) {
      cfRows.push([{ val: 'Tidak ada mutasi kas pada aktivitas ini', style: 0 }, { val: '-', style: 0 }, { val: 0, style: 3 }]);
    } else {
      for (const it of items) {
        cfRows.push([{ val: `${it.id} ${it.description}`, style: 0 }, { val: it.date, style: 0 }, { val: it.amount, style: 3 }]);
      }
    }
    const end = cfRows.length;
    cfRows.push([
      { val: `Arus Kas Bersih — ${title}`, style: 5 },
      { val: '', style: 5 },
      { formula: `SUM(C${start}:C${end})`, cached: subtotalVal, style: 4 },
    ]);
    return cfRows.length;
  };

  const opRow = pushCfSection('Aktivitas Operasi', cf.items.operating, cf.operatingCash);
  const invRow = pushCfSection('Aktivitas Investasi', cf.items.investing, cf.investingCash);
  const finRow = pushCfSection('Aktivitas Pendanaan', cf.items.financing, cf.financingCash);

  cfRows.push([]);
  cfRows.push([
    { val: 'KENAIKAN (PENURUNAN) KAS BERSIH / SALDO KAS AKHIR', style: 5 },
    { val: '', style: 5 },
    { formula: `C${opRow}+C${invRow}+C${finRow}`, cached: cf.endingCash, style: 4 },
  ]);

  const files = [
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
        '<sheets>' +
        '<sheet name="Jurnal Umum" sheetId="1" r:id="rId1"/>' +
        '<sheet name="Neraca Saldo" sheetId="2" r:id="rId2"/>' +
        '<sheet name="Laba Rugi &amp; Neraca" sheetId="3" r:id="rId3"/>' +
        '<sheet name="Arus Kas" sheetId="4" r:id="rId4"/>' +
        '</sheets>' +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>' +
        '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>' +
        '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: makeSheetXml(jrnRows, [12, 13, 38, 12, 18, 18]) },
    { name: 'xl/worksheets/sheet2.xml', content: makeSheetXml(tbRows, [12, 36, 20, 20]) },
    { name: 'xl/worksheets/sheet3.xml', content: makeSheetXml(stmtRows, [44, 24]) },
    { name: 'xl/worksheets/sheet4.xml', content: makeSheetXml(cfRows, [44, 14, 22]) },
  ];

  return buildZipStore(files);
}

function generateLegacyCustomWorkbookBytes(state, calc) {
  // Sheet 1: Laba Rugi & Perubahan Ekuitas
  const lrRows = [
    [{ val: `${state.companyName} — Laporan Laba Rugi & Ekuitas`, style: 1 }],
    [{ val: `Periode: ${state.periodLabel}`, style: 0 }],
    [],
    [{ val: 'Akun', style: 2 }, { val: 'Nominal (Rp)', style: 2 }],
  ];
  const revStart = 5;
  for (const r of state.revenues) {
    lrRows.push([{ val: r.name, style: 0 }, { val: Number(r.amount || 0), style: 3 }]);
  }
  const revEnd = lrRows.length;
  lrRows.push([
    { val: 'Total Pendapatan', style: 5 },
    { formula: `SUM(B${revStart}:B${revEnd})`, cached: calc.totalRevenue, style: 4 },
  ]);
  const totRevRow = lrRows.length;

  lrRows.push([{ val: 'Harga Pokok Penjualan (HPP)', style: 0 }, { val: Number(state.cogs || 0), style: 3 }]);
  const cogsRow = lrRows.length;
  const expStart = lrRows.length + 1;
  for (const e of state.expenses) {
    lrRows.push([{ val: e.name, style: 0 }, { val: Number(e.amount || 0), style: 3 }]);
  }
  lrRows.push([{ val: 'Beban Bunga', style: 0 }, { val: Number(state.interestExpense || 0), style: 3 }]);
  lrRows.push([{ val: 'Pajak Penghasilan', style: 0 }, { val: Number(state.taxExpense || 0), style: 3 }]);
  const expEnd = lrRows.length;
  lrRows.push([
    { val: 'Total HPP, Beban, Bunga & Pajak', style: 5 },
    { formula: `SUM(B${cogsRow}:B${expEnd})`, cached: calc.cogs + calc.totalOpex + calc.interest + calc.tax, style: 4 },
  ]);
  const totCostRow = lrRows.length;
  lrRows.push([
    { val: 'Laba Bersih Setelah Pajak (EAT)', style: 5 },
    { formula: `B${totRevRow}-B${totCostRow}`, cached: calc.eat, style: 4 },
  ]);
  const eatRow = lrRows.length;

  lrRows.push([]);
  lrRows.push([{ val: 'Modal Awal Periode', style: 0 }, { val: Number(state.beginningCapital || 0), style: 3 }]);
  const begCapRow = lrRows.length;
  lrRows.push([{ val: state.entityType === 'pt' ? '(-) Dividen' : '(-) Prive', style: 0 }, { val: Number(state.drawings || 0), style: 3 }]);
  const drawRow = lrRows.length;
  lrRows.push([
    { val: 'Modal Akhir Periode', style: 5 },
    { formula: `B${begCapRow}+B${eatRow}-B${drawRow}`, cached: calc.endingCapital, style: 4 },
  ]);
  const endCapRow = lrRows.length;

  // Sheet 2: Neraca & Analisis Rasio
  const nrRows = [
    [{ val: `${state.companyName} — Neraca & Rasio Keuangan`, style: 1 }],
    [{ val: `Per ${state.periodLabel}`, style: 0 }],
    [],
    [{ val: 'Akun Neraca', style: 2 }, { val: 'Nominal (Rp)', style: 2 }],
  ];
  const caStart = 5;
  for (const a of state.currentAssets) {
    nrRows.push([{ val: a.name, style: 0 }, { val: Number(a.amount || 0), style: 3 }]);
  }
  const caEnd = nrRows.length;
  nrRows.push([
    { val: 'Total Aset Lancar', style: 5 },
    { formula: `SUM(B${caStart}:B${caEnd})`, cached: calc.currentAssets, style: 4 },
  ]);
  const totCaRow = nrRows.length;

  const faStart = nrRows.length + 1;
  for (const fa of state.fixedAssets) {
    nrRows.push([{ val: fa.name, style: 0 }, { val: Number(fa.amount || 0), style: 3 }]);
  }
  const faEnd = nrRows.length;
  nrRows.push([
    { val: 'Total Aset Tetap', style: 5 },
    { formula: `SUM(B${faStart}:B${faEnd})`, cached: calc.fixedAssets, style: 4 },
  ]);
  const totFaRow = nrRows.length;

  nrRows.push([
    { val: 'TOTAL ASET', style: 5 },
    { formula: `B${totCaRow}+B${totFaRow}`, cached: calc.totalAssets, style: 4 },
  ]);
  const totAssetsRow = nrRows.length;

  nrRows.push([]);
  const slStart = nrRows.length + 1;
  for (const sl of state.shortTermLiabilities) {
    nrRows.push([{ val: sl.name, style: 0 }, { val: Number(sl.amount || 0), style: 3 }]);
  }
  const slEnd = nrRows.length;
  nrRows.push([
    { val: 'Total Liabilitas Jangka Pendek', style: 5 },
    { formula: `SUM(B${slStart}:B${slEnd})`, cached: calc.shortTermLiab, style: 4 },
  ]);
  const totSlRow = nrRows.length;

  const llStart = nrRows.length + 1;
  for (const ll of state.longTermLiabilities) {
    nrRows.push([{ val: ll.name, style: 0 }, { val: Number(ll.amount || 0), style: 3 }]);
  }
  const llEnd = nrRows.length;
  nrRows.push([
    { val: 'Total Liabilitas Jangka Panjang', style: 5 },
    { formula: `SUM(B${llStart}:B${llEnd})`, cached: calc.longTermLiab, style: 4 },
  ]);
  const totLlRow = nrRows.length;

  nrRows.push([
    { val: 'Ekuitas Akhir (dari Laba Rugi & Ekuitas)', style: 0 },
    { formula: `'Laba Rugi & Ekuitas'!B${endCapRow}`, cached: calc.endingCapital, style: 3 },
  ]);
  const eqLinkRow = nrRows.length;

  nrRows.push([
    { val: 'TOTAL LIABILITAS DAN EKUITAS', style: 5 },
    { formula: `B${totSlRow}+B${totLlRow}+B${eqLinkRow}`, cached: calc.totalLiabAndEquity, style: 4 },
  ]);
  const totLeRow = nrRows.length;

  nrRows.push([
    { val: 'Status Keseimbangan Neraca', style: 5 },
    {
      formula: `IF(ROUND(B${totAssetsRow},0)=ROUND(B${totLeRow},0),"SEIMBANG","SELISIH")`,
      cached: calc.isBalanced ? 'SEIMBANG' : 'SELISIH',
      style: 5,
    },
  ]);

  // Sheet 3: Rasio Keuangan
  const ratioRows = [
    [{ val: `${state.companyName} — Analisis Rasio Keuangan`, style: 1 }],
    [{ val: 'Dihitung otomatis sesuai rumus Bab 6', style: 0 }],
    [],
    [{ val: 'Kategori', style: 2 }, { val: 'Nama Rasio', style: 2 }, { val: 'Nilai', style: 2 }],
  ];
  for (const item of calc.ratios) {
    ratioRows.push([
      { val: item.category, style: 0 },
      { val: item.name, style: 0 },
      { val: item.value, style: item.kind === 'times' ? 7 : 6 },
    ]);
  }

  const sheet1Xml = makeSheetXml(lrRows, [42, 24]);
  const sheet2Xml = makeSheetXml(nrRows, [42, 24]);
  const sheet3Xml = makeSheetXml(ratioRows, [18, 38, 18]);

  const files = [
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
        '<sheets>' +
        '<sheet name="Laba Rugi &amp; Ekuitas" sheetId="1" r:id="rId1"/>' +
        '<sheet name="Neraca" sheetId="2" r:id="rId2"/>' +
        '<sheet name="Analisis Rasio" sheetId="3" r:id="rId3"/>' +
        '</sheets>' +
        '</workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>' +
        '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
    { name: 'xl/worksheets/sheet2.xml', content: sheet2Xml },
    { name: 'xl/worksheets/sheet3.xml', content: sheet3Xml },
  ];

  return buildZipStore(files);
}

export function downloadCustomWorkbook(state, calc) {
  const bytes = generateCustomWorkbookBytes(state, calc);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const baseName = state.businessName || state.companyName || 'laporan-umkm';
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `${slug || 'laporan-umkm'}-keuangan.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}
