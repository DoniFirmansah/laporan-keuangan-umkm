#!/usr/bin/env python3
"""
Generator Workbook Excel Laporan Keuangan Sederhana (Bab 6 PDF).
Menghasilkan file OOXML (.xlsx) multi-sheet lengkap dengan rumus aktif,
format akuntansi Rupiah/persentase, freeze pane, dan catatan rekonsiliasi buku.
Zero external dependencies (Python stdlib only).
"""

from __future__ import annotations

import os
import zipfile
from xml.sax.saxutils import escape


def xml_attr(val: str) -> str:
    """Escape XML attribute value including double and single quotes."""
    return escape(val, {'"': "&quot;", "'": "&apos;"})


def col_letter(idx: int) -> str:
    """Convert 1-based column index to Excel column letters (1 -> A, 27 -> AA)."""
    result = []
    while idx > 0:
        idx, rem = divmod(idx - 1, 26)
        result.append(chr(65 + rem))
    return "".join(reversed(result))


def cell_ref(col: int, row: int) -> str:
    return f"{col_letter(col)}{row}"


class StyleRegistry:
    """Builds minimal, crisp OOXML styles.xml matching the Archival Ledger palette."""

    def __init__(self) -> None:
        # Custom numFmts start at 164
        self.num_fmts = [
            (164, '"Rp"#,##0;("Rp"#,##0);"-"'),
            (165, '"Rp"#,##0.00;("Rp"#,##0.00);"-"'),
            (166, '#,##0;(#,##0);"-"'),
            (167, '0.00%'),
            (168, '0.00" kali"'),
        ]
        # Fonts: (name, size, bold, italic, color_rgb)
        self.fonts = [
            ("Calibri", 10, False, False, "FF181B19"),  # 0: body
            ("Calibri", 14, True, False, "FF181B19"),   # 1: title
            ("Calibri", 11, True, False, "FFFFFFFF"),   # 2: header white
            ("Calibri", 10, True, False, "FF181B19"),   # 3: bold dark
            ("Calibri", 10, False, True, "FF636A65"),   # 4: italic muted
            ("Calibri", 10, True, False, "FF1D5942"),   # 5: ledger green bold
            ("Calibri", 10, True, False, "FF855E1C"),   # 6: amber warn bold
            ("Calibri", 10, True, False, "FF9E3329"),   # 7: red err bold
            ("Calibri", 11, True, False, "FF1D5942"),   # 8: KPI value
        ]
        # Fills: (pattern_type, fg_rgb)
        self.fills = [
            ("none", None),          # 0: required default
            ("gray125", None),       # 1: required default
            ("solid", "FF1D5942"),   # 2: ledger pine header
            ("solid", "FFEBF1ED"),   # 3: soft sage section
            ("solid", "FFF6F3EB"),   # 4: archival cotton tint
            ("solid", "FFE6E1D4"),   # 5: subtotal inset
            ("solid", "FFE7F0F7"),   # 6: user input blue tint
            ("solid", "FFFBF3E2"),   # 7: warn / errata note tint
            ("solid", "FF1F2421"),   # 8: dark slate banner
        ]
        # Borders: (top, bottom, left, right) -> None or (style, rgb)
        thin = ("thin", "FFD2CEC2")
        strong = ("thin", "FF8B887D")
        double_b = ("double", "FF181B19")
        top_thin = ("thin", "FF181B19")
        self.borders = [
            (None, None, None, None),                  # 0: none
            (thin, thin, thin, thin),                  # 1: light grid
            (top_thin, double_b, thin, thin),          # 2: accounting double bottom
            (top_thin, strong, thin, thin),            # 3: subtotal
            (strong, strong, strong, strong),          # 4: header / KPI box
        ]
        # CellXfs: (fontId, fillId, borderId, numFmtId, hAlign, vAlign, wrapText)
        self.xfs: list[tuple[int, int, int, int, str, str, bool]] = []
        self.named: dict[str, int] = {}
        self._register_presets()

    def _add_xf(
        self,
        name: str,
        font_id: int = 0,
        fill_id: int = 0,
        border_id: int = 0,
        num_fmt_id: int = 0,
        h_align: str = "left",
        v_align: str = "center",
        wrap: bool = False,
    ) -> int:
        idx = len(self.xfs)
        self.xfs.append((font_id, fill_id, border_id, num_fmt_id, h_align, v_align, wrap))
        self.named[name] = idx
        return idx

    def _register_presets(self) -> None:
        self._add_xf("default", 0, 0, 0, 0, "left", "center", False)
        self._add_xf("title", 1, 0, 0, 0, "left", "center", False)
        self._add_xf("subtitle", 4, 0, 0, 0, "left", "center", True)
        self._add_xf("banner", 2, 8, 4, 0, "left", "center", False)
        self._add_xf("th_left", 2, 2, 4, 0, "left", "center", True)
        self._add_xf("th_right", 2, 2, 4, 0, "right", "center", True)
        self._add_xf("th_center", 2, 2, 4, 0, "center", "center", True)
        self._add_xf("section", 5, 3, 1, 0, "left", "center", False)
        self._add_xf("sub_section", 3, 4, 1, 0, "left", "center", False)
        self._add_xf("text", 0, 0, 1, 0, "left", "center", True)
        self._add_xf("text_indent", 0, 0, 1, 0, "left", "center", True)
        self._add_xf("text_muted", 4, 0, 1, 0, "left", "center", True)
        self._add_xf("text_center", 0, 0, 1, 0, "center", "center", True)
        self._add_xf("rp", 0, 0, 1, 164, "right", "center", False)
        self._add_xf("rp_dec", 0, 0, 1, 165, "right", "center", False)
        self._add_xf("num", 0, 0, 1, 166, "right", "center", False)
        self._add_xf("pct", 0, 0, 1, 167, "right", "center", False)
        self._add_xf("times", 0, 0, 1, 168, "right", "center", False)
        self._add_xf("subtotal_label", 3, 5, 3, 0, "left", "center", True)
        self._add_xf("subtotal_rp", 3, 5, 3, 164, "right", "center", False)
        self._add_xf("subtotal_num", 3, 5, 3, 166, "right", "center", False)
        self._add_xf("total_label", 3, 3, 2, 0, "left", "center", True)
        self._add_xf("total_rp", 5, 3, 2, 164, "right", "center", False)
        self._add_xf("total_num", 5, 3, 2, 166, "right", "center", False)
        self._add_xf("input_rp", 5, 6, 1, 164, "right", "center", False)
        self._add_xf("input_text", 5, 6, 1, 0, "left", "center", True)
        self._add_xf("note_warn", 6, 7, 1, 0, "left", "center", True)
        self._add_xf("status_ok", 5, 3, 1, 0, "center", "center", True)
        self._add_xf("status_warn", 6, 7, 1, 0, "center", "center", True)
        self._add_xf("kpi_label", 3, 4, 4, 0, "left", "center", True)
        self._add_xf("kpi_rp", 8, 0, 4, 164, "right", "center", False)
        self._add_xf("kpi_pct", 8, 0, 4, 167, "right", "center", False)

    def idx(self, name: str) -> int:
        return self.named[name]

    def to_xml(self) -> str:
        out = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
            f'<numFmts count="{len(self.num_fmts)}">',
        ]
        for nid, code in self.num_fmts:
            out.append(f'<numFmt numFmtId="{nid}" formatCode="{xml_attr(code)}"/>')
        out.append("</numFmts>")

        out.append(f'<fonts count="{len(self.fonts)}">')
        for fname, size, bold, italic, rgb in self.fonts:
            b_xml = "<b/>" if bold else ""
            i_xml = "<i/>" if italic else ""
            out.append(
                f'<font>{b_xml}{i_xml}<sz val="{size}"/><color rgb="{rgb}"/>'
                f'<name val="{xml_attr(fname)}"/><family val="2"/></font>'
            )
        out.append("</fonts>")

        out.append(f'<fills count="{len(self.fills)}">')
        for ptype, rgb in self.fills:
            if rgb:
                out.append(
                    f'<fill><patternFill patternType="{ptype}">'
                    f'<fgColor rgb="{rgb}"/><bgColor indexed="64"/></patternFill></fill>'
                )
            else:
                out.append(f'<fill><patternFill patternType="{ptype}"/></fill>')
        out.append("</fills>")

        out.append(f'<borders count="{len(self.borders)}">')
        for top, bottom, left, right in self.borders:
            parts = []
            for side_name, side_val in [("left", left), ("right", right), ("top", top), ("bottom", bottom)]:
                if side_val:
                    st, rgb = side_val
                    parts.append(f'<{side_name} style="{st}"><color rgb="{rgb}"/></{side_name}>')
                else:
                    parts.append(f"<{side_name}/>")
            out.append(f'<border>{"".join(parts)}<diagonal/></border>')
        out.append("</borders>")

        out.append('<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>')
        out.append(f'<cellXfs count="{len(self.xfs)}">')
        for font_id, fill_id, border_id, num_fmt_id, ha, va, wrap in self.xfs:
            w_attr = ' wrapText="1"' if wrap else ""
            out.append(
                f'<xf numFmtId="{num_fmt_id}" fontId="{font_id}" fillId="{fill_id}" '
                f'borderId="{border_id}" xfId="0" applyNumberFormat="1" applyFont="1" '
                f'applyFill="1" applyBorder="1" applyAlignment="1">'
                f'<alignment horizontal="{ha}" vertical="{va}"{w_attr}/></xf>'
            )
        out.append("</cellXfs>")
        out.append('<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>')
        out.append("</styleSheet>")
        return "".join(out)


class SheetBuilder:
    """Tracks cells, column widths, row heights, merges, and freeze panes for 1 sheet."""

    def __init__(self, name: str, styles: StyleRegistry) -> None:
        self.name = name
        self.styles = styles
        self.cells: dict[tuple[int, int], dict] = {}
        self.col_widths: dict[int, float] = {}
        self.row_heights: dict[int, float] = {}
        self.merges: list[str] = []
        self.freeze_row: int | None = None
        self.freeze_col: int = 1
        self.max_row = 1
        self.max_col = 1

    def set_col_widths(self, widths: dict[int, float]) -> None:
        self.col_widths.update(widths)

    def set_row_height(self, row: int, height: float) -> None:
        self.row_heights[row] = height

    def freeze(self, row: int, col: int = 1) -> None:
        self.freeze_row = row
        self.freeze_col = col

    def merge(self, c1: int, r1: int, c2: int, r2: int) -> None:
        self.merges.append(f"{cell_ref(c1, r1)}:{cell_ref(c2, r2)}")

    def set_text(self, col: int, row: int, val: str, style: str = "text") -> str:
        self.max_row = max(self.max_row, row)
        self.max_col = max(self.max_col, col)
        self.cells[(row, col)] = {"type": "s", "val": val, "style": self.styles.idx(style)}
        return cell_ref(col, row)

    def set_num(self, col: int, row: int, val: float | int, style: str = "rp") -> str:
        self.max_row = max(self.max_row, row)
        self.max_col = max(self.max_col, col)
        self.cells[(row, col)] = {"type": "n", "val": val, "style": self.styles.idx(style)}
        return cell_ref(col, row)

    def set_formula(
        self,
        col: int,
        row: int,
        formula: str,
        cached: float | int | str | None = None,
        style: str = "rp",
    ) -> str:
        self.max_row = max(self.max_row, row)
        self.max_col = max(self.max_col, col)
        clean_formula = formula[1:] if formula.startswith("=") else formula
        self.cells[(row, col)] = {
            "type": "f",
            "formula": clean_formula,
            "cached": cached,
            "style": self.styles.idx(style),
        }
        return cell_ref(col, row)

    def write_banner(self, title: str, subtitle: str, cols: int) -> int:
        self.set_text(1, 1, title, "title")
        self.merge(1, 1, cols, 1)
        self.set_row_height(1, 26)
        self.set_text(1, 2, subtitle, "subtitle")
        self.merge(1, 2, cols, 2)
        self.set_row_height(2, 20)
        return 4

    def to_xml(self, shared_strings: list[str], string_index: dict[str, int]) -> str:
        def get_ss(text: str) -> int:
            if text not in string_index:
                string_index[text] = len(shared_strings)
                shared_strings.append(text)
            return string_index[text]

        dim = f"A1:{cell_ref(self.max_col, self.max_row)}"
        out = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
            f'<dimension ref="{dim}"/>',
            "<sheetViews><sheetView tabSelected=\"0\" workbookViewId=\"0\">",
        ]
        if self.freeze_row and self.freeze_row > 1:
            tl = cell_ref(self.freeze_col, self.freeze_row)
            out.append(
                f'<pane ySplit="{self.freeze_row - 1}" topLeftCell="{tl}" '
                f'activePane="bottomLeft" state="frozen"/>'
            )
        out.append("</sheetView></sheetViews>")
        out.append('<sheetFormatPr defaultRowHeight="19"/>')

        if self.col_widths:
            out.append("<cols>")
            for col_i in sorted(self.col_widths):
                w = self.col_widths[col_i]
                out.append(f'<col min="{col_i}" max="{col_i}" width="{w:.2f}" customWidth="1"/>')
            out.append("</cols>")

        out.append("<sheetData>")
        rows_map: dict[int, list[tuple[int, dict]]] = {}
        for (r, c), payload in self.cells.items():
            rows_map.setdefault(r, []).append((c, payload))

        for r in sorted(rows_map):
            ht_attr = f' ht="{self.row_heights[r]:.1f}" customHeight="1"' if r in self.row_heights else ""
            out.append(f'<row r="{r}"{ht_attr}>')
            for c, cell in sorted(rows_map[r], key=lambda item: item[0]):
                ref = cell_ref(c, r)
                s = cell["style"]
                ctype = cell["type"]
                if ctype == "s":
                    sid = get_ss(cell["val"])
                    out.append(f'<c r="{ref}" s="{s}" t="s"><v>{sid}</v></c>')
                elif ctype == "n":
                    out.append(f'<c r="{ref}" s="{s}"><v>{cell["val"]}</v></c>')
                elif ctype == "f":
                    f_esc = escape(cell["formula"])
                    cached = cell["cached"]
                    if isinstance(cached, str):
                        out.append(f'<c r="{ref}" s="{s}" t="str"><f>{f_esc}</f><v>{escape(cached)}</v></c>')
                    elif cached is not None:
                        out.append(f'<c r="{ref}" s="{s}"><f>{f_esc}</f><v>{cached}</v></c>')
                    else:
                        out.append(f'<c r="{ref}" s="{s}"><f>{f_esc}</f></c>')
            out.append("</row>")
        out.append("</sheetData>")

        if self.merges:
            out.append(f'<mergeCells count="{len(self.merges)}">')
            for m in self.merges:
                out.append(f'<mergeCell ref="{m}"/>')
            out.append("</mergeCells>")

        out.append('<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>')
        out.append("</worksheet>")
        return "".join(out)


class WorkbookBuilder:
    def __init__(self) -> None:
        self.styles = StyleRegistry()
        self.sheets: list[SheetBuilder] = []

    def add_sheet(self, name: str) -> SheetBuilder:
        sb = SheetBuilder(name, self.styles)
        self.sheets.append(sb)
        return sb

    def save(self, filepath: str) -> None:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        shared_strings: list[str] = []
        string_index: dict[str, int] = {}
        sheet_xmls = [s.to_xml(shared_strings, string_index) for s in self.sheets]

        content_types = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
            '<Default Extension="xml" ContentType="application/xml"/>',
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>',
        ]
        for i in range(1, len(self.sheets) + 1):
            content_types.append(
                f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            )
        content_types.append("</Types>")

        root_rels = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>'
        )

        wb_xml = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
            '<calcPr calcId="191029" fullCalcOnLoad="1"/>',
            "<sheets>",
        ]
        wb_rels = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        ]
        for idx, sh in enumerate(self.sheets, start=1):
            wb_xml.append(f'<sheet name="{xml_attr(sh.name)}" sheetId="{idx}" r:id="rId{idx}"/>')
            wb_rels.append(
                f'<Relationship Id="rId{idx}" '
                f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                f'Target="worksheets/sheet{idx}.xml"/>'
            )
        wb_xml.append("</sheets></workbook>")
        wb_rels.append(
            f'<Relationship Id="rId{len(self.sheets)+1}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        )
        wb_rels.append(
            f'<Relationship Id="rId{len(self.sheets)+2}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
        )
        wb_rels.append("</Relationships>")

        ss_xml = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            f'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            f'count="{len(shared_strings)}" uniqueCount="{len(shared_strings)}">',
        ]
        for text in shared_strings:
            ss_xml.append(f"<si><t xml:space=\"preserve\">{escape(text)}</t></si>")
        ss_xml.append("</sst>")

        with zipfile.ZipFile(filepath, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("[Content_Types].xml", "".join(content_types))
            zf.writestr("_rels/.rels", root_rels)
            zf.writestr("xl/workbook.xml", "".join(wb_xml))
            zf.writestr("xl/_rels/workbook.xml.rels", "".join(wb_rels))
            zf.writestr("xl/styles.xml", self.styles.to_xml())
            zf.writestr("xl/sharedStrings.xml", "".join(ss_xml))
            for idx, xml_body in enumerate(sheet_xmls, start=1):
                zf.writestr(f"xl/worksheets/sheet{idx}.xml", xml_body)


def build_financial_workbook(output_path: str) -> dict[str, str]:
    wb = WorkbookBuilder()

    # Pre-create all 9 sheets in order so cross-sheet references are clean
    sh_summary = wb.add_sheet("Ringkasan Eksekutif")
    sh_ss = wb.add_sheet("LR Single Step")
    sh_ms = wb.add_sheet("LR Multiple Step")
    sh_eq = wb.add_sheet("Perubahan Ekuitas")
    sh_nr = wb.add_sheet("Neraca Lancar Maju")
    sh_abc_nr = wb.add_sheet("PT ABC - Neraca")
    sh_abc_lr = wb.add_sheet("PT ABC - Laba Rugi")
    sh_abc_ratio = wb.add_sheet("PT ABC - Analisis Rasio")
    sh_tpl = wb.add_sheet("Template Input Usaha")

    refs: dict[str, str] = {}

    # ------------------------------------------------------------------
    # SHEET 2: LR Single Step (Tabel 6.1 Toko Rambak Maju)
    # ------------------------------------------------------------------
    sh_ss.set_col_widths({1: 8, 2: 38, 3: 22, 4: 22, 5: 38})
    sh_ss.freeze(6)
    r = sh_ss.write_banner(
        "TOKO RAMBAK MAJU — LAPORAN LABA RUGI (SINGLE STEP)",
        "Tabel 6.1 | Untuk Periode yang Berakhir 31 Desember 2023",
        5,
    )
    sh_ss.set_text(1, r, "Kode", "th_center")
    sh_ss.set_text(2, r, "Uraian Akun", "th_left")
    sh_ss.set_text(3, r, "Hitungan Rumus (Rp)", "th_right")
    sh_ss.set_text(4, r, "Cetakan Buku PDF (Rp)", "th_right")
    sh_ss.set_text(5, r, "Catatan Audit / Keterangan", "th_left")
    sh_ss.set_row_height(r, 24)
    r += 1

    sh_ss.set_text(1, r, "4-000", "section")
    sh_ss.set_text(2, r, "Pendapatan", "section")
    sh_ss.set_text(3, r, "", "section")
    sh_ss.set_text(4, r, "", "section")
    sh_ss.set_text(5, r, "", "section")
    r += 1

    r_rev_start = r
    sh_ss.set_text(1, r, "4-100", "text_center")
    sh_ss.set_text(2, r, "Penjualan bersih", "text")
    sh_ss.set_num(3, r, 31300000, "rp")
    sh_ss.set_num(4, r, 31300000, "rp")
    sh_ss.set_text(5, r, "Sesuai Tabel 6.1 PDF", "text_muted")
    r += 1

    sh_ss.set_text(1, r, "4-200", "text_center")
    sh_ss.set_text(2, r, "Pendapatan lain-lain", "text")
    sh_ss.set_num(3, r, 850000, "rp")
    sh_ss.set_num(4, r, 850000, "rp")
    sh_ss.set_text(5, r, "Sesuai Tabel 6.1 PDF", "text_muted")
    r_rev_end = r
    r += 1

    sh_ss.set_text(1, r, "", "subtotal_label")
    sh_ss.set_text(2, r, "Total Pendapatan", "subtotal_label")
    c_tot_rev = sh_ss.set_formula(
        3, r, f"SUM(C{r_rev_start}:C{r_rev_end})", 32150000, "subtotal_rp"
    )
    sh_ss.set_num(4, r, 33150000, "subtotal_rp")
    sh_ss.set_text(5, r, "Buku cetak Rp33.150.000 (koreksi aritmetika: Rp32.150.000)", "note_warn")
    refs["ss_tot_rev"] = c_tot_rev
    r += 2

    sh_ss.set_text(1, r, "5-000", "section")
    sh_ss.set_text(2, r, "Biaya-Biaya", "section")
    sh_ss.set_text(3, r, "", "section")
    sh_ss.set_text(4, r, "", "section")
    sh_ss.set_text(5, r, "", "section")
    r += 1

    r_exp_start = r
    ss_expenses = [
        ("5-100", "Harga pokok penjualan", 21100000),
        ("5-200", "Biaya penjualan", 655000),
        ("5-300", "Biaya Umum dan Administrasi", 1350000),
        ("5-400", "Biaya lain-lain", 550000),
    ]
    for code, name, val in ss_expenses:
        sh_ss.set_text(1, r, code, "text_center")
        sh_ss.set_text(2, r, name, "text")
        sh_ss.set_num(3, r, val, "rp")
        sh_ss.set_num(4, r, val, "rp")
        sh_ss.set_text(5, r, "Sesuai Tabel 6.1 PDF", "text_muted")
        r += 1
    r_exp_end = r - 1

    sh_ss.set_text(1, r, "", "subtotal_label")
    sh_ss.set_text(2, r, "Jumlah Biaya", "subtotal_label")
    c_tot_exp = sh_ss.set_formula(
        3, r, f"SUM(C{r_exp_start}:C{r_exp_end})", 23655000, "subtotal_rp"
    )
    sh_ss.set_num(4, r, 23655000, "subtotal_rp")
    sh_ss.set_text(5, r, "Penjumlahan tepat sama dengan buku", "text_muted")
    refs["ss_tot_exp"] = c_tot_exp
    r += 1

    sh_ss.set_text(1, r, "", "total_label")
    sh_ss.set_text(2, r, "Laba Bersih", "total_label")
    c_ss_net = sh_ss.set_formula(3, r, f"{c_tot_rev}-{c_tot_exp}", 8495000, "total_rp")
    sh_ss.set_formula(4, r, f"D{r - 7}-D{r - 1}", 9495000, "total_rp")
    sh_ss.set_text(5, r, "Mengikuti Total Pendapatan aktual vs buku", "note_warn")
    refs["ss_net_income"] = c_ss_net

    # ------------------------------------------------------------------
    # SHEET 3: LR Multiple Step (Tabel 6.2 Toko Lancar Transportasi)
    # ------------------------------------------------------------------
    sh_ms.set_col_widths({1: 8, 2: 38, 3: 20, 4: 20, 5: 20, 6: 38})
    sh_ms.freeze(6)
    r = sh_ms.write_banner(
        "TOKO LANCAR TRANSPORTASI — LAPORAN LABA RUGI (MULTIPLE STEP)",
        "Tabel 6.2 | Per 31 Desember 2023",
        6,
    )
    sh_ms.set_text(1, r, "Kode", "th_center")
    sh_ms.set_text(2, r, "Komponen Laporan", "th_left")
    sh_ms.set_text(3, r, "Rincian (Rp)", "th_right")
    sh_ms.set_text(4, r, "Subtotal (Rp)", "th_right")
    sh_ms.set_text(5, r, "Cetakan Buku (Rp)", "th_right")
    sh_ms.set_text(6, r, "Catatan Audit", "th_left")
    sh_ms.set_row_height(r, 24)
    r += 1

    sh_ms.set_text(1, r, "4-100", "text_center")
    sh_ms.set_text(2, r, "Hasil Penjualan", "subtotal_label")
    sh_ms.set_text(3, r, "", "text")
    c_ms_sales = sh_ms.set_num(4, r, 32445000, "subtotal_rp")
    sh_ms.set_num(5, r, 32445000, "subtotal_rp")
    sh_ms.set_text(6, r, "Sesuai Tabel 6.2 PDF", "text_muted")
    refs["ms_sales"] = c_ms_sales
    r += 1

    sh_ms.set_text(1, r, "5-100", "section")
    sh_ms.set_text(2, r, "Harga Pokok Penjualan", "section")
    for c in range(3, 7):
        sh_ms.set_text(c, r, "", "section")
    r += 1

    sh_ms.set_text(1, r, "5-101", "text_center")
    sh_ms.set_text(2, r, "Persediaan barang 1 Desember", "text")
    c_inv_beg = sh_ms.set_num(3, r, 4987000, "rp")
    sh_ms.set_text(4, r, "", "text")
    sh_ms.set_num(5, r, 4987000, "rp")
    sh_ms.set_text(6, r, "Sesuai buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "5-102", "text_center")
    sh_ms.set_text(2, r, "Pembelian bersih", "text")
    c_purch = sh_ms.set_num(3, r, 12850000, "rp")
    sh_ms.set_text(4, r, "", "text")
    sh_ms.set_num(5, r, 12850000, "rp")
    sh_ms.set_text(6, r, "Buku cetak Rp12.850.0000,00 (ekstra nol di desimal)", "note_warn")
    r += 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Barang dagangan tersedia dijual", "subtotal_label")
    c_avail = sh_ms.set_formula(3, r, f"{c_inv_beg}+{c_purch}", 17837000, "subtotal_rp")
    sh_ms.set_text(4, r, "", "subtotal_label")
    sh_ms.set_num(5, r, 8453000, "subtotal_rp")
    sh_ms.set_text(6, r, "Buku cetak Rp8.453.000 (selisih cetak)", "note_warn")
    r += 1

    sh_ms.set_text(1, r, "5-103", "text_center")
    sh_ms.set_text(2, r, "Persediaan barang dagangan 31 Desember", "text")
    c_inv_end = sh_ms.set_num(3, r, 2575000, "rp")
    sh_ms.set_text(4, r, "", "text")
    sh_ms.set_num(5, r, 2575000, "rp")
    sh_ms.set_text(6, r, "Sesuai buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Harga Pokok Barang yang Dijual (HPP)", "subtotal_label")
    sh_ms.set_text(3, r, "", "subtotal_label")
    c_cogs = sh_ms.set_formula(4, r, f"{c_avail}-{c_inv_end}", 15262000, "subtotal_rp")
    sh_ms.set_num(5, r, 5878000, "subtotal_rp")
    sh_ms.set_text(6, r, "Buku: 8.453.000 - 2.575.000 = 5.878.000", "note_warn")
    r += 1

    sh_ms.set_text(1, r, "", "total_label")
    sh_ms.set_text(2, r, "Laba Kotor Penjualan", "total_label")
    sh_ms.set_text(3, r, "", "total_label")
    c_gp = sh_ms.set_formula(4, r, f"{c_ms_sales}-{c_cogs}", 17183000, "total_rp")
    sh_ms.set_num(5, r, 26577000, "total_rp")
    sh_ms.set_text(6, r, "Buku mencetak Rp26.577.000", "note_warn")
    refs["ms_gross_profit"] = c_gp
    r += 2

    sh_ms.set_text(1, r, "5-200", "section")
    sh_ms.set_text(2, r, "Biaya-Biaya Usaha: Biaya Penjualan", "section")
    for c in range(3, 7):
        sh_ms.set_text(c, r, "", "section")
    r += 1

    r_sell_start = r
    sell_items = [
        ("5-201", "Gaji staf penjualan", 4335000),
        ("5-202", "Biaya iklan", 450000),
        ("5-203", "Biaya penyusutan bangunan", 335000),
        ("5-204", "Biaya suplai toko", 750000),
        ("5-205", "Biaya lain-lain (penjualan)", 250000),
    ]
    for code, name, val in sell_items:
        sh_ms.set_text(1, r, code, "text_center")
        sh_ms.set_text(2, r, name, "text")
        sh_ms.set_num(3, r, val, "rp")
        sh_ms.set_text(4, r, "", "text")
        sh_ms.set_num(5, r, val, "rp")
        sh_ms.set_text(6, r, "Sesuai buku", "text_muted")
        r += 1
    r_sell_end = r - 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Jumlah Biaya Penjualan", "subtotal_label")
    c_sell_tot = sh_ms.set_formula(3, r, f"SUM(C{r_sell_start}:C{r_sell_end})", 6120000, "subtotal_rp")
    sh_ms.set_text(4, r, "", "subtotal_label")
    sh_ms.set_num(5, r, 6120000, "subtotal_rp")
    sh_ms.set_text(6, r, "Tepat sama dengan buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "5-300", "section")
    sh_ms.set_text(2, r, "Biaya Umum dan Administrasi", "section")
    for c in range(3, 7):
        sh_ms.set_text(c, r, "", "section")
    r += 1

    r_adm_start = r
    adm_items = [
        ("5-301", "Gaji pegawai", 4200000),
        ("5-302", "Biaya penyusutan gedung", 1050000),
        ("5-303", "Macam-macam biaya umum", 550000),
    ]
    for code, name, val in adm_items:
        sh_ms.set_text(1, r, code, "text_center")
        sh_ms.set_text(2, r, name, "text")
        sh_ms.set_num(3, r, val, "rp")
        sh_ms.set_text(4, r, "", "text")
        sh_ms.set_num(5, r, val, "rp")
        sh_ms.set_text(6, r, "Sesuai buku", "text_muted")
        r += 1
    r_adm_end = r - 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Jumlah Biaya Umum dan Administrasi", "subtotal_label")
    c_adm_tot = sh_ms.set_formula(3, r, f"SUM(C{r_adm_start}:C{r_adm_end})", 5800000, "subtotal_rp")
    sh_ms.set_text(4, r, "", "subtotal_label")
    sh_ms.set_num(5, r, 5800000, "subtotal_rp")
    sh_ms.set_text(6, r, "Tepat sama dengan buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Jumlah Biaya Usaha", "subtotal_label")
    sh_ms.set_text(3, r, "", "subtotal_label")
    c_op_tot = sh_ms.set_formula(4, r, f"{c_sell_tot}+{c_adm_tot}", 11920000, "subtotal_rp")
    sh_ms.set_num(5, r, 11920000, "subtotal_rp")
    sh_ms.set_text(6, r, "Tepat sama dengan buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Laba Usaha", "subtotal_label")
    sh_ms.set_text(3, r, "", "subtotal_label")
    c_op_inc = sh_ms.set_formula(4, r, f"{c_gp}-{c_op_tot}", 5263000, "subtotal_rp")
    sh_ms.set_num(5, r, 10250000, "subtotal_rp")
    sh_ms.set_text(6, r, "Buku mencetak Rp10.250.000", "note_warn")
    r += 1

    sh_ms.set_text(1, r, "4-900", "text_center")
    sh_ms.set_text(2, r, "Pendapatan Lain-Lain: Pendapatan sewa", "text")
    c_oth_inc = sh_ms.set_num(3, r, 1250000, "rp")
    sh_ms.set_text(4, r, "", "text")
    sh_ms.set_num(5, r, 1250000, "rp")
    sh_ms.set_text(6, r, "Sesuai buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "5-900", "text_center")
    sh_ms.set_text(2, r, "Biaya Lain-Lain", "text")
    c_oth_exp = sh_ms.set_num(3, r, 750000, "rp")
    sh_ms.set_text(4, r, "", "text")
    sh_ms.set_num(5, r, 750000, "rp")
    sh_ms.set_text(6, r, "Sesuai buku", "text_muted")
    r += 1

    sh_ms.set_text(1, r, "", "subtotal_label")
    sh_ms.set_text(2, r, "Selisih Pendapatan & Biaya Lain-Lain", "subtotal_label")
    sh_ms.set_text(3, r, "", "subtotal_label")
    c_oth_net = sh_ms.set_formula(4, r, f"{c_oth_inc}-{c_oth_exp}", 500000, "subtotal_rp")
    sh_ms.set_num(5, r, -750000, "subtotal_rp")
    sh_ms.set_text(6, r, "Buku mengurangkan Rp750.000 bukan +Rp500.000", "note_warn")
    r += 1

    sh_ms.set_text(1, r, "", "total_label")
    sh_ms.set_text(2, r, "Laba Bersih Sebelum Pajak", "total_label")
    sh_ms.set_text(3, r, "", "total_label")
    c_ms_ebt = sh_ms.set_formula(4, r, f"{c_op_inc}+{c_oth_net}", 5763000, "total_rp")
    sh_ms.set_num(5, r, 9500000, "total_rp")
    sh_ms.set_text(6, r, "Aktual (5.763.000) vs Buku (9.500.000)", "note_warn")
    refs["ms_ebt"] = c_ms_ebt

    # ------------------------------------------------------------------
    # SHEET 4: Perubahan Ekuitas (Tabel 6.3 & 6.4 Laundry Resik)
    # ------------------------------------------------------------------
    sh_eq.set_col_widths({1: 10, 2: 42, 3: 22, 4: 22, 5: 32})
    sh_eq.freeze(6)
    r = sh_eq.write_banner(
        "USAHA JASA LAUNDRY RESIK — PERUBAHAN EKUITAS & LABA DITAHAN",
        "Tabel 6.3 (Usaha Perorangan) & Tabel 6.4 (Perseroan Terbatas) | 31 Desember 2023",
        5,
    )
    sh_eq.set_text(1, r, "Tabel", "th_center")
    sh_eq.set_text(2, r, "Komponen Perubahan Ekuitas", "th_left")
    sh_eq.set_text(3, r, "Rincian (Rp)", "th_right")
    sh_eq.set_text(4, r, "Total Ekuitas (Rp)", "th_right")
    sh_eq.set_text(5, r, "Status Verifikasi Buku", "th_left")
    sh_eq.set_row_height(r, 24)
    r += 1

    # Tabel 6.3
    sh_eq.set_text(1, r, "6.3", "section")
    sh_eq.set_text(2, r, "LAPORAN PERUBAHAN EKUITAS — USAHA PERORANGAN", "section")
    for c in range(3, 6):
        sh_eq.set_text(c, r, "", "section")
    r += 1

    sh_eq.set_text(1, r, "6.3", "text_center")
    sh_eq.set_text(2, r, "Ekuitas 1 Desember 2023", "text")
    sh_eq.set_text(3, r, "", "text")
    c_eq1_beg = sh_eq.set_num(4, r, 21450000, "rp")
    sh_eq.set_text(5, r, "Modal awal periode", "text_muted")
    r += 1

    sh_eq.set_text(1, r, "6.3", "text_center")
    sh_eq.set_text(2, r, "Laba bersih bulan Desember", "text")
    c_eq1_ni = sh_eq.set_num(3, r, 6553000, "rp")
    sh_eq.set_text(4, r, "", "text")
    sh_eq.set_text(5, r, "Menambah ekuitas", "text_muted")
    r += 1

    sh_eq.set_text(1, r, "6.3", "text_center")
    sh_eq.set_text(2, r, "(-) Prive", "text")
    c_eq1_prive = sh_eq.set_num(3, r, 1375000, "rp")
    sh_eq.set_text(4, r, "", "text")
    sh_eq.set_text(5, r, "Pengambilan pribadi pemilik", "text_muted")
    r += 1

    sh_eq.set_text(1, r, "6.3", "subtotal_label")
    sh_eq.set_text(2, r, "Penambahan dalam modal", "subtotal_label")
    sh_eq.set_text(3, r, "", "subtotal_label")
    c_eq1_add = sh_eq.set_formula(4, r, f"{c_eq1_ni}-{c_eq1_prive}", 5178000, "subtotal_rp")
    sh_eq.set_text(5, r, "100% sesuai Tabel 6.3", "status_ok")
    r += 1

    sh_eq.set_text(1, r, "6.3", "total_label")
    sh_eq.set_text(2, r, "Ekuitas 31 Desember 2023", "total_label")
    sh_eq.set_text(3, r, "", "total_label")
    c_eq1_end = sh_eq.set_formula(4, r, f"{c_eq1_beg}+{c_eq1_add}", 26628000, "total_rp")
    sh_eq.set_text(5, r, "100% sesuai Tabel 6.3", "status_ok")
    refs["eq_perorangan"] = c_eq1_end
    r += 2

    # Tabel 6.4
    sh_eq.set_text(1, r, "6.4", "section")
    sh_eq.set_text(2, r, "LAPORAN LABA DITAHAN — PERSEROAN TERBATAS (PT)", "section")
    for c in range(3, 6):
        sh_eq.set_text(c, r, "", "section")
    r += 1

    sh_eq.set_text(1, r, "6.4", "text_center")
    sh_eq.set_text(2, r, "Modal yang ditahan 1 Oktober 2023", "text")
    sh_eq.set_text(3, r, "", "text")
    c_eq2_beg = sh_eq.set_num(4, r, 23450000, "rp")
    sh_eq.set_text(5, r, "Saldo awal laba ditahan triwulan", "text_muted")
    r += 1

    sh_eq.set_text(1, r, "6.4", "text_center")
    sh_eq.set_text(2, r, "Pendapatan Bersih untuk 3 bulan", "text")
    c_eq2_ni = sh_eq.set_num(3, r, 9250000, "rp")
    sh_eq.set_text(4, r, "", "text")
    sh_eq.set_text(5, r, "Laba bersih periode berjalan", "text_muted")
    r += 1

    sh_eq.set_text(1, r, "6.4", "text_center")
    sh_eq.set_text(2, r, "(-) Dividen", "text")
    c_eq2_div = sh_eq.set_num(3, r, 1625000, "rp")
    sh_eq.set_text(4, r, "", "text")
    sh_eq.set_text(5, r, "Pembagian laba ke pemegang saham", "text_muted")
    r += 1

    sh_eq.set_text(1, r, "6.4", "subtotal_label")
    sh_eq.set_text(2, r, "Penambahan dalam modal yang ditahan", "subtotal_label")
    sh_eq.set_text(3, r, "", "subtotal_label")
    c_eq2_add = sh_eq.set_formula(4, r, f"{c_eq2_ni}-{c_eq2_div}", 7625000, "subtotal_rp")
    sh_eq.set_text(5, r, "100% sesuai Tabel 6.4", "status_ok")
    r += 1

    sh_eq.set_text(1, r, "6.4", "total_label")
    sh_eq.set_text(2, r, "Modal yang ditahan 31 Desember 2023", "total_label")
    sh_eq.set_text(3, r, "", "total_label")
    c_eq2_end = sh_eq.set_formula(4, r, f"{c_eq2_beg}+{c_eq2_add}", 31075000, "total_rp")
    sh_eq.set_text(5, r, "100% sesuai Tabel 6.4", "status_ok")
    refs["eq_pt"] = c_eq2_end

    # ------------------------------------------------------------------
    # SHEET 5: Neraca Lancar Maju (Tabel 6.5)
    # ------------------------------------------------------------------
    sh_nr.set_col_widths({1: 8, 2: 38, 3: 20, 4: 20, 5: 22, 6: 34})
    sh_nr.freeze(6)
    r = sh_nr.write_banner(
        "USAHA JASA LANCAR MAJU — LAPORAN NERACA",
        "Tabel 6.5 | Per 31 Desember 2023",
        6,
    )
    sh_nr.set_text(1, r, "Kode", "th_center")
    sh_nr.set_text(2, r, "Akun Neraca", "th_left")
    sh_nr.set_text(3, r, "Rincian (Rp)", "th_right")
    sh_nr.set_text(4, r, "Nilai Bersih (Rp)", "th_right")
    sh_nr.set_text(5, r, "Jumlah Golongan (Rp)", "th_right")
    sh_nr.set_text(6, r, "Catatan", "th_left")
    sh_nr.set_row_height(r, 24)
    r += 1

    sh_nr.set_text(1, r, "1-000", "section")
    sh_nr.set_text(2, r, "ASET — Aset Tidak Tetap (Aset Lancar)", "section")
    for c in range(3, 7):
        sh_nr.set_text(c, r, "", "section")
    r += 1

    r_ca_start = r
    ca_items = [
        ("1-101", "Kas", 4250000),
        ("1-102", "Piutang Usaha", 2500000),
        ("1-103", "Perlengkapan Kantor", 2250000),
        ("1-104", "Persediaan Barang", 500000),
        ("1-105", "Sewa di Bayar di Muka", 750000),
        ("1-106", "Gaji Dibayar di Muka", 3000000),
    ]
    for code, name, val in ca_items:
        sh_nr.set_text(1, r, code, "text_center")
        sh_nr.set_text(2, r, name, "text")
        sh_nr.set_num(3, r, val, "rp")
        sh_nr.set_text(4, r, "", "text")
        sh_nr.set_text(5, r, "", "text")
        sh_nr.set_text(6, r, "Sesuai Tabel 6.5", "text_muted")
        r += 1
    r_ca_end = r - 1

    sh_nr.set_text(1, r, "", "subtotal_label")
    sh_nr.set_text(2, r, "Jumlah Aset Tidak Tetap (Aset Lancar)", "subtotal_label")
    sh_nr.set_text(3, r, "", "subtotal_label")
    sh_nr.set_text(4, r, "", "subtotal_label")
    c_nr_ca = sh_nr.set_formula(5, r, f"SUM(C{r_ca_start}:C{r_ca_end})", 13250000, "subtotal_rp")
    sh_nr.set_text(6, r, "100% sesuai buku", "status_ok")
    r += 1

    sh_nr.set_text(1, r, "1-200", "section")
    sh_nr.set_text(2, r, "ASET — Aset Tetap", "section")
    for c in range(3, 7):
        sh_nr.set_text(c, r, "", "section")
    r += 1

    # Peralatan Toko
    sh_nr.set_text(1, r, "1-201", "text_center")
    sh_nr.set_text(2, r, "Peralatan Toko", "text")
    c_eqp = sh_nr.set_num(3, r, 2500000, "rp")
    sh_nr.set_text(4, r, "", "text")
    sh_nr.set_text(5, r, "", "text")
    sh_nr.set_text(6, r, "Harga perolehan", "text_muted")
    r += 1

    sh_nr.set_text(1, r, "1-202", "text_center")
    sh_nr.set_text(2, r, "(-) Akumulasi Depresiasi Peralatan Toko", "text")
    c_eqp_acc = sh_nr.set_num(3, r, 400000, "rp")
    c_eqp_net = sh_nr.set_formula(4, r, f"{c_eqp}-{c_eqp_acc}", 2100000, "subtotal_rp")
    sh_nr.set_text(5, r, "", "text")
    sh_nr.set_text(6, r, "Nilai buku peralatan", "text_muted")
    r += 1

    # Bangunan Toko
    sh_nr.set_text(1, r, "1-203", "text_center")
    sh_nr.set_text(2, r, "Bangunan Toko", "text")
    c_bld = sh_nr.set_num(3, r, 10750000, "rp")
    sh_nr.set_text(4, r, "", "text")
    sh_nr.set_text(5, r, "", "text")
    sh_nr.set_text(6, r, "Harga perolehan", "text_muted")
    r += 1

    sh_nr.set_text(1, r, "1-204", "text_center")
    sh_nr.set_text(2, r, "(-) Akumulasi Depresiasi Bangunan Toko", "text")
    c_bld_acc = sh_nr.set_num(3, r, 525000, "rp")
    c_bld_net = sh_nr.set_formula(4, r, f"{c_bld}-{c_bld_acc}", 10225000, "subtotal_rp")
    sh_nr.set_text(5, r, "", "text")
    sh_nr.set_text(6, r, "Nilai buku bangunan", "text_muted")
    r += 1

    # Tanah
    sh_nr.set_text(1, r, "1-205", "text_center")
    sh_nr.set_text(2, r, "Tanah", "text")
    sh_nr.set_text(3, r, "", "text")
    c_land = sh_nr.set_num(4, r, 5500000, "rp")
    sh_nr.set_text(5, r, "", "text")
    sh_nr.set_text(6, r, "Tidak disusutkan", "text_muted")
    r += 1

    sh_nr.set_text(1, r, "", "subtotal_label")
    sh_nr.set_text(2, r, "Jumlah Aset Tetap", "subtotal_label")
    sh_nr.set_text(3, r, "", "subtotal_label")
    sh_nr.set_text(4, r, "", "subtotal_label")
    c_nr_fa = sh_nr.set_formula(5, r, f"{c_eqp_net}+{c_bld_net}+{c_land}", 17825000, "subtotal_rp")
    sh_nr.set_text(6, r, "100% sesuai buku", "status_ok")
    r += 1

    sh_nr.set_text(1, r, "", "total_label")
    sh_nr.set_text(2, r, "JUMLAH ASET", "total_label")
    sh_nr.set_text(3, r, "", "total_label")
    sh_nr.set_text(4, r, "", "total_label")
    c_nr_assets = sh_nr.set_formula(5, r, f"{c_nr_ca}+{c_nr_fa}", 31075000, "total_rp")
    sh_nr.set_text(6, r, "Total Aset Lancar + Aset Tetap", "text_muted")
    refs["nr_assets"] = c_nr_assets
    r += 2

    # Liabilitas
    sh_nr.set_text(1, r, "2-100", "section")
    sh_nr.set_text(2, r, "LIABILITAS — Liabilitas Jangka Pendek", "section")
    for c in range(3, 6):
        sh_nr.set_text(c, r, "", "section")
    sh_nr.set_text(6, r, "Buku PDF salah cetak subjudul 'Jangka Panjang' di atas seksi ini", "note_warn")
    r += 1

    r_cl_start = r
    cl_items = [
        ("2-101", "Liabilitas Usaha", 4500000),
        ("2-102", "Liabilitas Bunga", 500000),
        ("2-103", "Liabilitas Pajak", 1200000),
    ]
    for code, name, val in cl_items:
        sh_nr.set_text(1, r, code, "text_center")
        sh_nr.set_text(2, r, name, "text")
        sh_nr.set_num(3, r, val, "rp")
        sh_nr.set_text(4, r, "", "text")
        sh_nr.set_text(5, r, "", "text")
        sh_nr.set_text(6, r, "Kewajiban jangka pendek", "text_muted")
        r += 1
    r_cl_end = r - 1

    sh_nr.set_text(1, r, "", "subtotal_label")
    sh_nr.set_text(2, r, "Jumlah Liabilitas Jangka Pendek", "subtotal_label")
    sh_nr.set_text(3, r, "", "subtotal_label")
    c_nr_cl = sh_nr.set_formula(4, r, f"SUM(C{r_cl_start}:C{r_cl_end})", 6200000, "subtotal_rp")
    sh_nr.set_text(5, r, "", "subtotal_label")
    sh_nr.set_text(6, r, "100% sesuai buku", "status_ok")
    r += 1

    sh_nr.set_text(1, r, "2-200", "text_center")
    sh_nr.set_text(2, r, "Liabilitas Jangka Panjang", "text")
    sh_nr.set_text(3, r, "", "text")
    c_nr_ltl = sh_nr.set_num(4, r, 0, "rp")
    sh_nr.set_text(5, r, "", "text")
    sh_nr.set_text(6, r, "Nol pada Tabel 6.5", "text_muted")
    r += 1

    sh_nr.set_text(1, r, "", "subtotal_label")
    sh_nr.set_text(2, r, "Jumlah Liabilitas", "subtotal_label")
    sh_nr.set_text(3, r, "", "subtotal_label")
    sh_nr.set_text(4, r, "", "subtotal_label")
    c_nr_liab = sh_nr.set_formula(5, r, f"{c_nr_cl}+{c_nr_ltl}", 6200000, "subtotal_rp")
    sh_nr.set_text(6, r, "100% sesuai buku", "status_ok")
    r += 1

    sh_nr.set_text(1, r, "3-100", "text_center")
    sh_nr.set_text(2, r, "Ekuitas Pemilik Usaha", "text")
    sh_nr.set_text(3, r, "", "text")
    sh_nr.set_text(4, r, "", "text")
    c_nr_eq = sh_nr.set_num(5, r, 24875000, "rp")
    sh_nr.set_text(6, r, "Sesuai buku", "text_muted")
    r += 1

    sh_nr.set_text(1, r, "", "total_label")
    sh_nr.set_text(2, r, "TOTAL LIABILITAS DAN EKUITAS", "total_label")
    sh_nr.set_text(3, r, "", "total_label")
    sh_nr.set_text(4, r, "", "total_label")
    c_nr_le = sh_nr.set_formula(5, r, f"{c_nr_liab}+{c_nr_eq}", 31075000, "total_rp")
    c_nr_chk = sh_nr.set_formula(
        6,
        r,
        f'IF(ROUND({c_nr_assets},0)=ROUND({c_nr_le},0),"SEIMBANG","SELISIH")',
        "SEIMBANG",
        "status_ok",
    )
    refs["nr_le"] = c_nr_le
    refs["nr_check"] = c_nr_chk

    # ------------------------------------------------------------------
    # SHEET 6: PT ABC - Neraca (2022 & 2023, Dalam Jutaan)
    # ------------------------------------------------------------------
    sh_abc_nr.set_col_widths({1: 8, 2: 38, 3: 18, 4: 18, 5: 18, 6: 16})
    sh_abc_nr.freeze(6)
    r = sh_abc_nr.write_banner(
        "PT ABC — LAPORAN NERACA KOMPARATIF (DALAM JUTAAN RUPIAH)",
        "Contoh Kasus Bab 6 | Per 31 Desember 2022 dan 31 Desember 2023",
        6,
    )
    sh_abc_nr.set_text(1, r, "Kode", "th_center")
    sh_abc_nr.set_text(2, r, "Aktiva / Kewajiban & Ekuitas", "th_left")
    sh_abc_nr.set_text(3, r, "31 Des 2022 (Jt)", "th_right")
    sh_abc_nr.set_text(4, r, "31 Des 2023 (Jt)", "th_right")
    sh_abc_nr.set_text(5, r, "Selisih YoY (Jt)", "th_right")
    sh_abc_nr.set_text(6, r, "Tumbuh (%)", "th_right")
    sh_abc_nr.set_row_height(r, 24)
    r += 1

    def add_comp_row(
        sh: SheetBuilder, row: int, code: str, label: str, v22: float, v23: float, style_num: str = "rp"
    ) -> tuple[str, str]:
        sh.set_text(1, row, code, "text_center")
        sh.set_text(2, row, label, "text")
        c22 = sh.set_num(3, row, v22, style_num)
        c23 = sh.set_num(4, row, v23, style_num)
        sh.set_formula(5, row, f"{c23}-{c22}", v23 - v22, style_num)
        sh.set_formula(6, row, f"IF({c22}=0,0,({c23}-{c22})/{c22})", (v23 - v22) / v22 if v22 else 0, "pct")
        return c22, c23

    sh_abc_nr.set_text(1, r, "1-100", "section")
    sh_abc_nr.set_text(2, r, "AKTIVA — Aset Tidak Tetap (Aset Lancar)", "section")
    for c in range(3, 7):
        sh_abc_nr.set_text(c, r, "", "section")
    r += 1

    r_abc_ca_s = r
    abc_ca = [
        ("1-101", "Kas", 420, 790),
        ("1-102", "Piutang dagang", 1000, 1200),
        ("1-103", "Persediaan barang dagang", 2650, 2500),
        ("1-104", "Investasi jangka panjang", 960, 650),
    ]
    for code, label, v22, v23 in abc_ca:
        c22, c23 = add_comp_row(sh_abc_nr, r, code, label, v22, v23)
        if code == "1-101":
            refs["abc_cash_22"], refs["abc_cash_23"] = c22, c23
        elif code == "1-103":
            refs["abc_inv_22"], refs["abc_inv_23"] = c22, c23
        r += 1
    r_abc_ca_e = r - 1

    sh_abc_nr.set_text(1, r, "", "subtotal_label")
    sh_abc_nr.set_text(2, r, "Total Aset Tidak Tetap (Aset Lancar)", "subtotal_label")
    c_ca_22 = sh_abc_nr.set_formula(3, r, f"SUM(C{r_abc_ca_s}:C{r_abc_ca_e})", 5030, "subtotal_rp")
    c_ca_23 = sh_abc_nr.set_formula(4, r, f"SUM(D{r_abc_ca_s}:D{r_abc_ca_e})", 5140, "subtotal_rp")
    sh_abc_nr.set_formula(5, r, f"{c_ca_23}-{c_ca_22}", 110, "subtotal_rp")
    sh_abc_nr.set_formula(6, r, f"({c_ca_23}-{c_ca_22})/{c_ca_22}", 110 / 5030, "pct")
    refs["abc_ca_22"], refs["abc_ca_23"] = c_ca_22, c_ca_23
    r += 1

    sh_abc_nr.set_text(1, r, "1-200", "section")
    sh_abc_nr.set_text(2, r, "AKTIVA — Aset Tetap", "section")
    for c in range(3, 7):
        sh_abc_nr.set_text(c, r, "", "section")
    r += 1

    r_abc_fa_s = r
    abc_fa = [
        ("1-201", "Peralatan toko", 3500, 4000),
        ("1-202", "Peralatan kantor", 500, 450),
        ("1-203", "Bangunan", 6750, 6250),
        ("1-204", "Tanah", 1000, 1000),
    ]
    for code, label, v22, v23 in abc_fa:
        add_comp_row(sh_abc_nr, r, code, label, v22, v23)
        r += 1
    r_abc_fa_e = r - 1

    sh_abc_nr.set_text(1, r, "", "subtotal_label")
    sh_abc_nr.set_text(2, r, "Total Aset Tetap", "subtotal_label")
    c_fa_22 = sh_abc_nr.set_formula(3, r, f"SUM(C{r_abc_fa_s}:C{r_abc_fa_e})", 11750, "subtotal_rp")
    c_fa_23 = sh_abc_nr.set_formula(4, r, f"SUM(D{r_abc_fa_s}:D{r_abc_fa_e})", 11700, "subtotal_rp")
    sh_abc_nr.set_formula(5, r, f"{c_fa_23}-{c_fa_22}", -50, "subtotal_rp")
    sh_abc_nr.set_formula(6, r, f"({c_fa_23}-{c_fa_22})/{c_fa_22}", -50 / 11750, "pct")
    r += 1

    sh_abc_nr.set_text(1, r, "", "total_label")
    sh_abc_nr.set_text(2, r, "TOTAL ASET", "total_label")
    c_ta_22 = sh_abc_nr.set_formula(3, r, f"{c_ca_22}+{c_fa_22}", 16780, "total_rp")
    c_ta_23 = sh_abc_nr.set_formula(4, r, f"{c_ca_23}+{c_fa_23}", 16840, "total_rp")
    sh_abc_nr.set_formula(5, r, f"{c_ta_23}-{c_ta_22}", 60, "total_rp")
    sh_abc_nr.set_formula(6, r, f"({c_ta_23}-{c_ta_22})/{c_ta_22}", 60 / 16780, "pct")
    refs["abc_ta_22"], refs["abc_ta_23"] = c_ta_22, c_ta_23
    r += 2

    # Kewajiban
    sh_abc_nr.set_text(1, r, "2-100", "section")
    sh_abc_nr.set_text(2, r, "KEWAJIBAN — Kewajiban Jangka Pendek", "section")
    for c in range(3, 7):
        sh_abc_nr.set_text(c, r, "", "section")
    r += 1

    r_abc_cl_s = r
    abc_cl = [
        ("2-101", "Utang dagang", 1900, 1640),
        ("2-102", "Utang wesel", 900, 750),
        ("2-103", "Utang pajak", 120, 260),
    ]
    for code, label, v22, v23 in abc_cl:
        add_comp_row(sh_abc_nr, r, code, label, v22, v23)
        r += 1
    r_abc_cl_e = r - 1

    sh_abc_nr.set_text(1, r, "", "subtotal_label")
    sh_abc_nr.set_text(2, r, "Total Kewajiban Jangka Pendek", "subtotal_label")
    c_cl_22 = sh_abc_nr.set_formula(3, r, f"SUM(C{r_abc_cl_s}:C{r_abc_cl_e})", 2920, "subtotal_rp")
    c_cl_23 = sh_abc_nr.set_formula(4, r, f"SUM(D{r_abc_cl_s}:D{r_abc_cl_e})", 2650, "subtotal_rp")
    sh_abc_nr.set_formula(5, r, f"{c_cl_23}-{c_cl_22}", -270, "subtotal_rp")
    sh_abc_nr.set_formula(6, r, f"({c_cl_23}-{c_cl_22})/{c_cl_22}", -270 / 2920, "pct")
    refs["abc_cl_22"], refs["abc_cl_23"] = c_cl_22, c_cl_23
    r += 1

    sh_abc_nr.set_text(1, r, "2-200", "section")
    sh_abc_nr.set_text(2, r, "KEWAJIBAN — Kewajiban Jangka Panjang", "section")
    for c in range(3, 7):
        sh_abc_nr.set_text(c, r, "", "section")
    r += 1

    c_ltl_22, c_ltl_23 = add_comp_row(sh_abc_nr, r, "2-201", "Utang obligasi", 4200, 4000)
    refs["abc_ltl_22"], refs["abc_ltl_23"] = c_ltl_22, c_ltl_23
    r += 1

    sh_abc_nr.set_text(1, r, "", "subtotal_label")
    sh_abc_nr.set_text(2, r, "Total Kewajiban", "subtotal_label")
    c_tl_22 = sh_abc_nr.set_formula(3, r, f"{c_cl_22}+{c_ltl_22}", 7120, "subtotal_rp")
    c_tl_23 = sh_abc_nr.set_formula(4, r, f"{c_cl_23}+{c_ltl_23}", 6650, "subtotal_rp")
    sh_abc_nr.set_formula(5, r, f"{c_tl_23}-{c_tl_22}", -470, "subtotal_rp")
    sh_abc_nr.set_formula(6, r, f"({c_tl_23}-{c_tl_22})/{c_tl_22}", -470 / 7120, "pct")
    refs["abc_tl_22"], refs["abc_tl_23"] = c_tl_22, c_tl_23
    r += 1

    sh_abc_nr.set_text(1, r, "3-000", "section")
    sh_abc_nr.set_text(2, r, "MODAL PEMEGANG SAHAM", "section")
    for c in range(3, 7):
        sh_abc_nr.set_text(c, r, "", "section")
    r += 1

    r_abc_eq_s = r
    add_comp_row(sh_abc_nr, r, "3-101", "Saham biasa nominal (Rp0,05 per lembar)", 4750, 4750)
    r += 1
    add_comp_row(sh_abc_nr, r, "3-102", "Laba ditahan", 4910, 5440)
    r_abc_eq_e = r
    r += 1

    sh_abc_nr.set_text(1, r, "", "subtotal_label")
    sh_abc_nr.set_text(2, r, "Total Modal Pemegang Saham", "subtotal_label")
    c_eq_22 = sh_abc_nr.set_formula(3, r, f"SUM(C{r_abc_eq_s}:C{r_abc_eq_e})", 9660, "subtotal_rp")
    c_eq_23 = sh_abc_nr.set_formula(4, r, f"SUM(D{r_abc_eq_s}:D{r_abc_eq_e})", 10190, "subtotal_rp")
    sh_abc_nr.set_formula(5, r, f"{c_eq_23}-{c_eq_22}", 530, "subtotal_rp")
    sh_abc_nr.set_formula(6, r, f"({c_eq_23}-{c_eq_22})/{c_eq_22}", 530 / 9660, "pct")
    refs["abc_eq_22"], refs["abc_eq_23"] = c_eq_22, c_eq_23
    r += 1

    sh_abc_nr.set_text(1, r, "", "total_label")
    sh_abc_nr.set_text(2, r, "TOTAL KEWAJIBAN DAN EKUITAS", "total_label")
    c_tle_22 = sh_abc_nr.set_formula(3, r, f"{c_tl_22}+{c_eq_22}", 16780, "total_rp")
    c_tle_23 = sh_abc_nr.set_formula(4, r, f"{c_tl_23}+{c_eq_23}", 16840, "total_rp")
    sh_abc_nr.set_formula(5, r, f"{c_tle_23}-{c_tle_22}", 60, "total_rp")
    sh_abc_nr.set_formula(6, r, f"({c_tle_23}-{c_tle_22})/{c_tle_22}", 60 / 16780, "pct")
    r += 1

    sh_abc_nr.set_text(1, r, "CHK", "text_center")
    sh_abc_nr.set_text(2, r, "Cek Keseimbangan Neraca (Aset = Liabilitas + Ekuitas)", "subtotal_label")
    sh_abc_nr.set_formula(3, r, f'IF({c_ta_22}={c_tle_22},"SEIMBANG","SELISIH")', "SEIMBANG", "status_ok")
    sh_abc_nr.set_formula(4, r, f'IF({c_ta_23}={c_tle_23},"SEIMBANG","SELISIH")', "SEIMBANG", "status_ok")
    sh_abc_nr.set_text(5, r, "", "text")
    sh_abc_nr.set_text(6, r, "", "text")

    # ------------------------------------------------------------------
    # SHEET 7: PT ABC - Laba Rugi (2022 & 2023, Dalam Jutaan)
    # ------------------------------------------------------------------
    sh_abc_lr.set_col_widths({1: 8, 2: 38, 3: 18, 4: 18, 5: 18, 6: 16})
    sh_abc_lr.freeze(6)
    r = sh_abc_lr.write_banner(
        "PT ABC — LAPORAN LABA RUGI KOMPARATIF (DALAM JUTAAN RUPIAH)",
        "Contoh Kasus Bab 6 | Periode Berakhir 31 Desember 2022 dan 31 Desember 2023",
        6,
    )
    sh_abc_lr.set_text(1, r, "Kode", "th_center")
    sh_abc_lr.set_text(2, r, "Akun Laba Rugi", "th_left")
    sh_abc_lr.set_text(3, r, "31 Des 2022 (Jt)", "th_right")
    sh_abc_lr.set_text(4, r, "31 Des 2023 (Jt)", "th_right")
    sh_abc_lr.set_text(5, r, "Selisih YoY (Jt)", "th_right")
    sh_abc_lr.set_text(6, r, "Tumbuh (%)", "th_right")
    sh_abc_lr.set_row_height(r, 24)
    r += 1

    c_sl_22, c_sl_23 = add_comp_row(sh_abc_lr, r, "4-100", "Penjualan bersih", 20750, 24860)
    refs["abc_sales_22"], refs["abc_sales_23"] = c_sl_22, c_sl_23
    r += 1
    c_cg_22, c_cg_23 = add_comp_row(sh_abc_lr, r, "5-100", "Harga pokok penjualan", 12220, 15230)
    r += 1

    sh_abc_lr.set_text(1, r, "", "subtotal_label")
    sh_abc_lr.set_text(2, r, "Laba kotor", "subtotal_label")
    c_gp_22 = sh_abc_lr.set_formula(3, r, f"{c_sl_22}-{c_cg_22}", 8530, "subtotal_rp")
    c_gp_23 = sh_abc_lr.set_formula(4, r, f"{c_sl_23}-{c_cg_23}", 9630, "subtotal_rp")
    sh_abc_lr.set_formula(5, r, f"{c_gp_23}-{c_gp_22}", 1100, "subtotal_rp")
    sh_abc_lr.set_formula(6, r, f"({c_gp_23}-{c_gp_22})/{c_gp_22}", 1100 / 8530, "pct")
    refs["abc_gp_22"], refs["abc_gp_23"] = c_gp_22, c_gp_23
    r += 1

    sh_abc_lr.set_text(1, r, "5-200", "section")
    sh_abc_lr.set_text(2, r, "Beban Operasi", "section")
    for c in range(3, 7):
        sh_abc_lr.set_text(c, r, "", "section")
    r += 1

    r_abc_op_s = r
    abc_op = [
        ("5-201", "Beban iklan", 1000, 1450),
        ("5-202", "Beban gaji bagian penjualan", 2800, 2400),
        ("5-203", "Beban gaji bagian kantor", 2000, 1650),
        ("5-204", "Beban asuransi", 450, 1000),
        ("5-205", "Beban perlengkapan", 350, 260),
        ("5-206", "Beban penyusutan", 750, 850),
        ("5-207", "Beban rupa-rupa", 150, 170),
    ]
    for code, label, v22, v23 in abc_op:
        add_comp_row(sh_abc_lr, r, code, label, v22, v23)
        r += 1
    r_abc_op_e = r - 1

    sh_abc_lr.set_text(1, r, "", "subtotal_label")
    sh_abc_lr.set_text(2, r, "Total beban operasi", "subtotal_label")
    c_opex_22 = sh_abc_lr.set_formula(3, r, f"SUM(C{r_abc_op_s}:C{r_abc_op_e})", 7500, "subtotal_rp")
    c_opex_23 = sh_abc_lr.set_formula(4, r, f"SUM(D{r_abc_op_s}:D{r_abc_op_e})", 7780, "subtotal_rp")
    sh_abc_lr.set_formula(5, r, f"{c_opex_23}-{c_opex_22}", 280, "subtotal_rp")
    sh_abc_lr.set_formula(6, r, f"({c_opex_23}-{c_opex_22})/{c_opex_22}", 280 / 7500, "pct")
    r += 1

    sh_abc_lr.set_text(1, r, "", "subtotal_label")
    sh_abc_lr.set_text(2, r, "Laba bersih sebelum bunga dan pajak (EBIT)", "subtotal_label")
    c_ebit_22 = sh_abc_lr.set_formula(3, r, f"{c_gp_22}-{c_opex_22}", 1030, "subtotal_rp")
    c_ebit_23 = sh_abc_lr.set_formula(4, r, f"{c_gp_23}-{c_opex_23}", 1850, "subtotal_rp")
    sh_abc_lr.set_formula(5, r, f"{c_ebit_23}-{c_ebit_22}", 820, "subtotal_rp")
    sh_abc_lr.set_formula(6, r, f"({c_ebit_23}-{c_ebit_22})/{c_ebit_22}", 820 / 1030, "pct")
    refs["abc_ebit_22"], refs["abc_ebit_23"] = c_ebit_22, c_ebit_23
    r += 1

    c_int_22, c_int_23 = add_comp_row(sh_abc_lr, r, "5-301", "Beban bunga", 460, 440)
    refs["abc_int_22"], refs["abc_int_23"] = c_int_22, c_int_23
    r += 1

    sh_abc_lr.set_text(1, r, "", "subtotal_label")
    sh_abc_lr.set_text(2, r, "Laba bersih sebelum pajak (EBT)", "subtotal_label")
    c_ebt_22 = sh_abc_lr.set_formula(3, r, f"{c_ebit_22}-{c_int_22}", 570, "subtotal_rp")
    c_ebt_23 = sh_abc_lr.set_formula(4, r, f"{c_ebit_23}-{c_int_23}", 1410, "subtotal_rp")
    sh_abc_lr.set_formula(5, r, f"{c_ebt_23}-{c_ebt_22}", 840, "subtotal_rp")
    sh_abc_lr.set_formula(6, r, f"({c_ebt_23}-{c_ebt_22})/{c_ebt_22}", 840 / 570, "pct")
    r += 1

    c_tax_22, c_tax_23 = add_comp_row(sh_abc_lr, r, "5-401", "Pajak penghasilan", 190, 470)
    r += 1

    sh_abc_lr.set_text(1, r, "", "total_label")
    sh_abc_lr.set_text(2, r, "Laba bersih setelah pajak (EAT)", "total_label")
    c_eat_22 = sh_abc_lr.set_formula(3, r, f"{c_ebt_22}-{c_tax_22}", 380, "total_rp")
    c_eat_23 = sh_abc_lr.set_formula(4, r, f"{c_ebt_23}-{c_tax_23}", 940, "total_rp")
    sh_abc_lr.set_formula(5, r, f"{c_eat_23}-{c_eat_22}", 560, "total_rp")
    sh_abc_lr.set_formula(6, r, f"({c_eat_23}-{c_eat_22})/{c_eat_22}", 560 / 380, "pct")
    refs["abc_eat_22"], refs["abc_eat_23"] = c_eat_22, c_eat_23

    # ------------------------------------------------------------------
    # SHEET 8: PT ABC - Analisis Rasio
    # ------------------------------------------------------------------
    sh_abc_ratio.set_col_widths({1: 18, 2: 34, 3: 38, 4: 15, 5: 15, 6: 16, 7: 34})
    sh_abc_ratio.freeze(6)
    r = sh_abc_ratio.write_banner(
        "PT ABC — ANALISIS RASIO KEUANGAN (LIKUIDITAS, SOLVABILITAS, RENTABILITAS)",
        "Seluruh angka dihitung dinamis dari sheet 'PT ABC - Neraca' dan 'PT ABC - Laba Rugi'",
        7,
    )
    sh_abc_ratio.set_text(1, r, "Kategori", "th_left")
    sh_abc_ratio.set_text(2, r, "Nama Rasio", "th_left")
    sh_abc_ratio.set_text(3, r, "Rumus Materi Bab 6", "th_left")
    sh_abc_ratio.set_text(4, r, "2022", "th_right")
    sh_abc_ratio.set_text(5, r, "2023 (Aktual)", "th_right")
    sh_abc_ratio.set_text(6, r, "Kunci Buku 2023", "th_center")
    sh_abc_ratio.set_text(7, r, "Evaluasi & Catatan", "th_left")
    sh_abc_ratio.set_row_height(r, 24)
    r += 1

    NR = "'PT ABC - Neraca'"
    LR = "'PT ABC - Laba Rugi'"

    ratios = [
        (
            "Likuiditas",
            "Rasio Lancar (Current Ratio)",
            "Total Aset Tidak Tetap / Total Kewajiban Jangka Pendek",
            f"{NR}!{refs['abc_ca_22']}/{NR}!{refs['abc_cl_22']}",
            5030 / 2920,
            f"{NR}!{refs['abc_ca_23']}/{NR}!{refs['abc_cl_23']}",
            5140 / 2650,
            "194%",
            "pct",
            "Membaik (+21,7 pp); aman menutup utang lancar",
            "status_ok",
        ),
        (
            "Likuiditas",
            "Rasio Cepat (Quick Ratio)",
            "(Aset Tidak Tetap - Persediaan) / Kewajiban Jangka Pendek",
            f"({NR}!{refs['abc_ca_22']}-{NR}!{refs['abc_inv_22']})/{NR}!{refs['abc_cl_22']}",
            (5030 - 2650) / 2920,
            f"({NR}!{refs['abc_ca_23']}-{NR}!{refs['abc_inv_23']})/{NR}!{refs['abc_cl_23']}",
            (5140 - 2500) / 2650,
            "100%",
            "pct",
            "Membaik ke ~100%; sangat likuid tanpa jual persediaan",
            "status_ok",
        ),
        (
            "Likuiditas",
            "Rasio Kas (Cash Ratio)",
            "Kas / Total Kewajiban Jangka Pendek",
            f"{NR}!{refs['abc_cash_22']}/{NR}!{refs['abc_cl_22']}",
            420 / 2920,
            f"{NR}!{refs['abc_cash_23']}/{NR}!{refs['abc_cl_23']}",
            790 / 2650,
            "(Rumus hlm. 168)",
            "pct",
            "Kas naik hampir 2x lipat dibanding 2022",
            "status_ok",
        ),
        (
            "Solvabilitas",
            "Utang Jangka Panjang thd Ekuitas",
            "Utang Jangka Panjang / Total Modal",
            f"{NR}!{refs['abc_ltl_22']}/{NR}!{refs['abc_eq_22']}",
            4200 / 9660,
            f"{NR}!{refs['abc_ltl_23']}/{NR}!{refs['abc_eq_23']}",
            4000 / 10190,
            "39%",
            "pct",
            "Menurun (semakin sehat; utang obligasi turun)",
            "status_ok",
        ),
        (
            "Solvabilitas",
            "Total Utang thd Ekuitas (DER)",
            "Total Kewajiban / Total Modal",
            f"{NR}!{refs['abc_tl_22']}/{NR}!{refs['abc_eq_22']}",
            7120 / 9660,
            f"{NR}!{refs['abc_tl_23']}/{NR}!{refs['abc_eq_23']}",
            6650 / 10190,
            "62% (typo buku)",
            "pct",
            "Aktual 65,26%; buku mencetak 62%",
            "note_warn",
        ),
        (
            "Solvabilitas",
            "Total Utang thd Total Aset (DAR)",
            "Total Utang / Total Aset",
            f"{NR}!{refs['abc_tl_22']}/{NR}!{refs['abc_ta_22']}",
            7120 / 16780,
            f"{NR}!{refs['abc_tl_23']}/{NR}!{refs['abc_ta_23']}",
            6650 / 16840,
            "4% (typo buku)",
            "pct",
            "Aktual 39,49%; buku salah cetak 4% (tertinggal angka 9)",
            "note_warn",
        ),
        (
            "Solvabilitas",
            "Rasio Cakupan Bunga (TIE)",
            "Laba Sebelum Bunga & Pajak (EBIT) / Beban Bunga",
            f"{LR}!{refs['abc_ebit_22']}/{LR}!{refs['abc_int_22']}",
            1030 / 460,
            f"{LR}!{refs['abc_ebit_23']}/{LR}!{refs['abc_int_23']}",
            1850 / 440,
            "4 kali",
            "times",
            "Meningkat signifikan dari 2,24x menjadi 4,20x",
            "status_ok",
        ),
        (
            "Rentabilitas",
            "Rasio Laba Kotor (GPM)",
            "Laba Kotor / Penjualan Bersih",
            f"{LR}!{refs['abc_gp_22']}/{LR}!{refs['abc_sales_22']}",
            8530 / 20750,
            f"{LR}!{refs['abc_gp_23']}/{LR}!{refs['abc_sales_23']}",
            9630 / 24860,
            "39%",
            "pct",
            "Margin kotor sedikit turun karena kenaikan HPP",
            "text_muted",
        ),
        (
            "Rentabilitas",
            "Rasio Laba Bersih (NPM)",
            "Laba Bersih Setelah Pajak / Penjualan Bersih",
            f"{LR}!{refs['abc_eat_22']}/{LR}!{refs['abc_sales_22']}",
            380 / 20750,
            f"{LR}!{refs['abc_eat_23']}/{LR}!{refs['abc_sales_23']}",
            940 / 24860,
            "(Rumus hlm. 169)",
            "pct",
            "Efisiensi beban operasi naik -> NPM tumbuh >2x",
            "status_ok",
        ),
        (
            "Rentabilitas",
            "Pengembalian Modal (ROE)",
            "Laba Bersih Setelah Pajak / Modal",
            f"{LR}!{refs['abc_eat_22']}/{NR}!{refs['abc_eq_22']}",
            380 / 9660,
            f"{LR}!{refs['abc_eat_23']}/{NR}!{refs['abc_eq_23']}",
            940 / 10190,
            "9%",
            "pct",
            "Imbal hasil modal meningkat dari 3,93% ke 9,22%",
            "status_ok",
        ),
    ]

    for idx_r, (cat, name, formula_desc, f22, c22, f23, c23, book_txt, num_st, note, note_st) in enumerate(ratios):
        sh_abc_ratio.set_text(1, r, cat, "text")
        sh_abc_ratio.set_text(2, r, name, "subtotal_label" if idx_r % 2 == 0 else "text")
        sh_abc_ratio.set_text(3, r, formula_desc, "text_muted")
        sh_abc_ratio.set_formula(4, r, f22, c22, num_st)
        c_r23 = sh_abc_ratio.set_formula(5, r, f23, c23, num_st)
        sh_abc_ratio.set_text(6, r, book_txt, "text_center")
        sh_abc_ratio.set_text(7, r, note, note_st)
        if name.startswith("Rasio Lancar"):
            refs["abc_curr_ratio_23"] = c_r23
        elif name.startswith("Pengembalian Modal"):
            refs["abc_roe_23"] = c_r23
        r += 1

    # ------------------------------------------------------------------
    # SHEET 9: Template Input Usaha (Self-Service UMKM / Siswa)
    # ------------------------------------------------------------------
    sh_tpl.set_col_widths({1: 34, 2: 20, 3: 6, 4: 34, 5: 22})
    sh_tpl.freeze(5)
    r = sh_tpl.write_banner(
        "TEMPLATE INPUT USAHA MANDIRI — LAPORAN & RASIO OTOMATIS",
        "Ubah angka pada sel biru muda; Laba Rugi, Neraca, Cek Keseimbangan & Rasio terhitung otomatis",
        5,
    )
    sh_tpl.set_text(1, r, "INPUT DATA USAHA (UBAH SEL BIRU)", "th_left")
    sh_tpl.set_text(2, r, "Nilai (Rp)", "th_right")
    sh_tpl.set_text(3, r, "", "default")
    sh_tpl.set_text(4, r, "HASIL LAPORAN & RASIO OTOMATIS", "th_left")
    sh_tpl.set_text(5, r, "Output Rumus", "th_right")
    sh_tpl.set_row_height(r, 24)
    r += 1

    tpl_inputs = [
        ("Nama Usaha", "UMKM Contoh Nusantara", "text", 0),
        ("Penjualan Bersih", 50000000, "num", 0),
        ("Pendapatan Lain-Lain", 1500000, "num", 0),
        ("Harga Pokok Penjualan (HPP)", 28000000, "num", 0),
        ("Beban Penjualan", 4500000, "num", 0),
        ("Beban Umum & Administrasi", 5500000, "num", 0),
        ("Beban Bunga", 600000, "num", 0),
        ("Pajak Penghasilan", 1290000, "num", 0),
        ("Modal Awal Periode", 30000000, "num", 0),
        ("Prive / Dividen", 2000000, "num", 0),
        ("Kas", 12500000, "num", 0),
        ("Piutang Usaha", 6500000, "num", 0),
        ("Persediaan Barang", 8000000, "num", 0),
        ("Beban Dibayar di Muka", 1500000, "num", 0),
        ("Aset Tetap (Nilai Buku Bersih)", 25000000, "num", 0),
        ("Utang Usaha & Beban (J. Pendek)", 9500000, "num", 0),
        ("Utang Bank Jangka Panjang", 4390000, "num", 0),
    ]
    in_cells: dict[str, str] = {}
    for idx_i, (label, val, kind, _) in enumerate(tpl_inputs):
        rr = r + idx_i
        sh_tpl.set_text(1, rr, label, "text")
        if kind == "text":
            in_cells[label] = sh_tpl.set_text(2, rr, str(val), "input_text")
        else:
            in_cells[label] = sh_tpl.set_num(2, rr, float(val), "input_rp")

    # Right side calculated outputs
    rr = r
    sh_tpl.set_text(4, rr, "Laba Kotor", "text")
    c_t_gp = sh_tpl.set_formula(
        5, rr, f"{in_cells['Penjualan Bersih']}-{in_cells['Harga Pokok Penjualan (HPP)']}", 22000000, "rp"
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Laba Usaha (EBIT)", "text")
    c_t_ebit = sh_tpl.set_formula(
        5,
        rr,
        f"{c_t_gp}+{in_cells['Pendapatan Lain-Lain']}-{in_cells['Beban Penjualan']}-{in_cells['Beban Umum & Administrasi']}",
        13500000,
        "rp",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Laba Bersih Setelah Pajak (EAT)", "subtotal_label")
    c_t_eat = sh_tpl.set_formula(
        5, rr, f"{c_t_ebit}-{in_cells['Beban Bunga']}-{in_cells['Pajak Penghasilan']}", 11610000, "subtotal_rp"
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Modal Akhir Periode", "subtotal_label")
    c_t_eq = sh_tpl.set_formula(
        5, rr, f"{in_cells['Modal Awal Periode']}+{c_t_eat}-{in_cells['Prive / Dividen']}", 39610000, "subtotal_rp"
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Total Aset Lancar", "text")
    c_t_ca = sh_tpl.set_formula(
        5,
        rr,
        f"{in_cells['Kas']}+{in_cells['Piutang Usaha']}+{in_cells['Persediaan Barang']}+{in_cells['Beban Dibayar di Muka']}",
        28500000,
        "rp",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Total Aset", "total_label")
    c_t_ta = sh_tpl.set_formula(
        5, rr, f"{c_t_ca}+{in_cells['Aset Tetap (Nilai Buku Bersih)']}", 53500000, "total_rp"
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Total Kewajiban", "text")
    c_t_tl = sh_tpl.set_formula(
        5,
        rr,
        f"{in_cells['Utang Usaha & Beban (J. Pendek)']}+{in_cells['Utang Bank Jangka Panjang']}",
        13890000,
        "rp",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Total Kewajiban + Modal Akhir", "total_label")
    c_t_tle = sh_tpl.set_formula(5, rr, f"{c_t_tl}+{c_t_eq}", 53500000, "total_rp")
    rr += 1
    sh_tpl.set_text(4, rr, "Cek Keseimbangan Neraca", "subtotal_label")
    sh_tpl.set_formula(
        5, rr, f'IF(ROUND({c_t_ta},0)=ROUND({c_t_tle},0),"SEIMBANG","SELISIH")', "SEIMBANG", "status_ok"
    )
    rr += 2
    sh_tpl.set_text(4, rr, "Rasio Lancar (Current Ratio)", "text")
    sh_tpl.set_formula(
        5, rr, f"IF({in_cells['Utang Usaha & Beban (J. Pendek)']}=0,0,{c_t_ca}/{in_cells['Utang Usaha & Beban (J. Pendek)']})",
        28500000 / 9500000,
        "pct",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Rasio Cepat (Quick Ratio)", "text")
    sh_tpl.set_formula(
        5,
        rr,
        f"IF({in_cells['Utang Usaha & Beban (J. Pendek)']}=0,0,({c_t_ca}-{in_cells['Persediaan Barang']}-{in_cells['Beban Dibayar di Muka']})/{in_cells['Utang Usaha & Beban (J. Pendek)']})",
        19000000 / 9500000,
        "pct",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Rasio Kas (Cash Ratio)", "text")
    sh_tpl.set_formula(
        5,
        rr,
        f"IF({in_cells['Utang Usaha & Beban (J. Pendek)']}=0,0,{in_cells['Kas']}/{in_cells['Utang Usaha & Beban (J. Pendek)']})",
        12500000 / 9500000,
        "pct",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Total Utang thd Modal (DER)", "text")
    sh_tpl.set_formula(5, rr, f"IF({c_t_eq}=0,0,{c_t_tl}/{c_t_eq})", 13890000 / 39610000, "pct")
    rr += 1
    sh_tpl.set_text(4, rr, "Rasio Laba Bersih (NPM)", "text")
    sh_tpl.set_formula(
        5, rr, f"IF({in_cells['Penjualan Bersih']}=0,0,{c_t_eat}/{in_cells['Penjualan Bersih']})",
        11610000 / 50000000,
        "pct",
    )
    rr += 1
    sh_tpl.set_text(4, rr, "Pengembalian Modal (ROE)", "text")
    sh_tpl.set_formula(5, rr, f"IF({c_t_eq}=0,0,{c_t_eat}/{c_t_eq})", 11610000 / 39610000, "pct")

    # ------------------------------------------------------------------
    # SHEET 1: Ringkasan Eksekutif (Cross-sheet KPI & Errata Log)
    # ------------------------------------------------------------------
    sh_summary.set_col_widths({1: 6, 2: 34, 3: 24, 4: 22, 5: 44})
    sh_summary.freeze(5)
    r = sh_summary.write_banner(
        "RINGKASAN EKSEKUTIF — LAPORAN KEUANGAN SEDERHANA (BAB 6)",
        "Materi PDF: Proyek Kreatif dan Kewirausahaan SMK/MAK Kelas XII | Seluruh angka terhubung ke sheet laporan",
        5,
    )
    sh_summary.set_text(1, r, "No", "th_center")
    sh_summary.set_text(2, r, "Entitas & Jenis Laporan", "th_left")
    sh_summary.set_text(3, r, "Nama Sheet", "th_left")
    sh_summary.set_text(4, r, "Metrik Kunci (Rumus)", "th_right")
    sh_summary.set_text(5, r, "Keterangan / Status", "th_left")
    sh_summary.set_row_height(r, 24)
    r += 1

    summary_rows = [
        ("1", "Toko Rambak Maju — LR Single Step", "LR Single Step", f"='LR Single Step'!{refs['ss_net_income']}", 8495000, "rp", "Laba bersih aktual (buku cetak Rp9.495.000)"),
        ("2", "Toko Lancar Transportasi — LR Multiple Step", "LR Multiple Step", f"='LR Multiple Step'!{refs['ms_ebt']}", 5763000, "rp", "Laba bersih sebelum pajak aktual (buku cetak Rp9.500.000)"),
        ("3", "Laundry Resik — Perubahan Ekuitas (Perorangan)", "Perubahan Ekuitas", f"='Perubahan Ekuitas'!{refs['eq_perorangan']}", 26628000, "rp", "Ekuitas akhir 31 Des 2023 (100% sesuai buku)"),
        ("4", "Laundry Resik — Laba Ditahan (PT)", "Perubahan Ekuitas", f"='Perubahan Ekuitas'!{refs['eq_pt']}", 31075000, "rp", "Modal ditahan akhir 31 Des 2023 (100% sesuai buku)"),
        ("5", "Usaha Jasa Lancar Maju — Laporan Neraca", "Neraca Lancar Maju", f"='Neraca Lancar Maju'!{refs['nr_assets']}", 31075000, "rp", "Aset = Liabilitas + Ekuitas (SEIMBANG)"),
        ("6", "PT ABC — Total Aset 2023 (Dalam Jutaan)", "PT ABC - Neraca", f"='PT ABC - Neraca'!{refs['abc_ta_23']}", 16840, "rp", "Naik Rp60 juta (+0,36%) dibanding 2022"),
        ("7", "PT ABC — Laba Bersih 2023 (Dalam Jutaan)", "PT ABC - Laba Rugi", f"='PT ABC - Laba Rugi'!{refs['abc_eat_23']}", 940, "rp", "Naik Rp560 juta (+147,37%) dibanding 2022"),
        ("8", "PT ABC — Rasio Lancar 2023", "PT ABC - Analisis Rasio", f"='PT ABC - Analisis Rasio'!{refs['abc_curr_ratio_23']}", 5140 / 2650, "pct", "Likuiditas sangat kuat (~194%)"),
        ("9", "PT ABC — Pengembalian Modal (ROE) 2023", "PT ABC - Analisis Rasio", f"='PT ABC - Analisis Rasio'!{refs['abc_roe_23']}", 940 / 10190, "pct", "Profitabilitas ekuitas ~9,22% (kunci buku: 9%)"),
    ]
    for no, ent, sname, form, cached, st, desc in summary_rows:
        sh_summary.set_text(1, r, no, "text_center")
        sh_summary.set_text(2, r, ent, "text")
        sh_summary.set_text(3, r, sname, "subtotal_label")
        sh_summary.set_formula(4, r, form, cached, st)
        sh_summary.set_text(5, r, desc, "text_muted")
        r += 1

    r += 1
    sh_summary.set_text(1, r, "!", "section")
    sh_summary.set_text(2, r, "KATALOG REKONSILIASI SALAH CETAK BUKU PDF", "section")
    for c in range(3, 6):
        sh_summary.set_text(c, r, "", "section")
    r += 1

    errata = [
        ("Tabel 6.1", "Toko Rambak Maju", "Total Pendapatan buku Rp33.150.000", "31.300.000 + 850.000 = 32.150.000 -> Laba Bersih aktual 8.495.000"),
        ("Tabel 6.2", "Toko Lancar Transportasi", "Barang tersedia buku Rp8.453.000 & selisih lain-lain -Rp750.000", "4.987.000 + 12.850.000 = 17.837.000 -> EBT aktual Rp5.763.000"),
        ("Tabel 6.5", "Usaha Jasa Lancar Maju", "Header tercetak 'Liabilitas Jangka Panjang' di atas utang lancar", "Isi & subtotal Rp6.200.000 adalah Liabilitas Jangka Pendek"),
        ("Kasus PT ABC", "Rasio Solvabilitas 2023", "DER tertulis 62% & DAR tertulis 4%", "Rumus akurat: 6.650/10.190 = 65,26% dan 6.650/16.840 = 39,49%"),
    ]
    for tbl, ent, issue, fix in errata:
        sh_summary.set_text(1, r, "•", "note_warn")
        sh_summary.set_text(2, r, f"{tbl} ({ent})", "note_warn")
        sh_summary.set_text(3, r, issue, "text")
        sh_summary.set_text(4, r, "Koreksi Rumus:", "subtotal_label")
        sh_summary.set_text(5, r, fix, "text_muted")
        r += 1

    wb.save(output_path)
    return refs


if __name__ == "__main__":
    out = "/storage/emulated/0/Laporan/LaporanKeuangan/Laporan_Keuangan_Bab6_Lengkap.xlsx"
    build_financial_workbook(out)
    print(f"Generated: {out} ({os.path.getsize(out)} bytes)")
