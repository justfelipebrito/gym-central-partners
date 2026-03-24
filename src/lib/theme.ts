// ── GC Partners design tokens ────────────────────────────────────────────────
// Less formal, warm & energetic — yellow as the hero colour.

export const colors = {
  // Brand
  primary:        '#F59E0B', // amber-400 — the yellow
  primaryDark:    '#D97706', // amber-600 — hover/press
  primaryLight:   '#FEF3C7', // amber-50  — subtle tint
  primaryText:    '#1C1917', // dark text on yellow bg (not white — better contrast)

  // Surfaces
  bg:             '#FAFAF9', // warm off-white page bg
  card:           '#FFFFFF',
  sidebar:        '#1C1917', // warm charcoal
  sidebarHover:   '#292524', // slightly lighter charcoal
  sidebarActive:  '#3A3230', // active nav item

  // Text
  textPrimary:    '#1C1917',
  textSecondary:  '#57534E', // stone-600
  textMuted:      '#A8A29E', // stone-400

  // Borders & dividers
  border:         '#E7E5E4', // stone-200
  divider:        '#F5F5F4', // stone-100

  // Semantic
  success:        '#10B981',
  successLight:   '#D1FAE5',
  successText:    '#065F46',
  warning:        '#F59E0B',
  warningLight:   '#FEF3C7',
  warningText:    '#92400E',
  danger:         '#EF4444',
  dangerLight:    '#FEE2E2',
  dangerText:     '#991B1B',
  info:           '#3B82F6',
  infoLight:      '#DBEAFE',
  infoText:       '#1E40AF',
}

export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  full: '9999px',
}

export const shadow = {
  card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
  md:   '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
}
