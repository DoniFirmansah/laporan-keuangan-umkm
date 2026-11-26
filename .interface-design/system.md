# Interface Design System Contract

- **Direction:** Archival Ledger Workbench (`warm cotton paper` light / `matte mineral slate` dark).
- **Spacing Grid:** `4px` base (`4, 8, 12, 16, 20, 24, 32`).
- **Sidebar Width:** `264px` on desktop, collapsible drawer on mobile (`<= 900px`). Same background as `--bg-base` separated by `1px solid var(--border-subtle)`.
- **Tabular Numerals:** Required on all monetary amounts, variances, ratios, and accounting tables.
- **Accessibility:** `:focus-visible` `2px solid var(--accent-primary)` with `2px` offset; inline validation errors inside `<dialog>` above action buttons; collapsible `Tampilkan Panduan` hidden by default.
- **Iconography:** Crisp monochrome stroke SVG icons (`16px`–`18px`) for nav items, export/print actions, search, status alerts, and theme toggle. Zero emoji UI icons and zero tinted-square icon boxes.
