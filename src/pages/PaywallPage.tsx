import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { colors, radius, shadow } from '@/lib/theme'

export function PaywallPage() {
  const { professional, signOut } = useAuth()

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo mark */}
        <div style={styles.logoMark}>GC</div>

        <div style={styles.icon}>🔒</div>
        <h1 style={styles.title}>Membership Required</h1>
        <p style={styles.body}>
          Hey {professional?.displayName ?? 'there'}! Your professional
          membership is currently <strong>inactive</strong>.
        </p>
        <p style={styles.body}>
          Activate your membership to unlock the full dashboard and all
          professional tools.
        </p>

        {/* Stripe integration goes here */}
        <button style={styles.ctaBtn} disabled>
          Activate Membership — Coming Soon
        </button>

        <button style={styles.signOutLink} onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg,
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 16,
  },
  card: {
    background: colors.card,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    boxShadow: shadow.md,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 440,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    background: colors.primary,
    color: colors.primaryText,
    fontWeight: 900,
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-0.02em',
  },
  icon: {
    fontSize: 40,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: colors.textPrimary,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    margin: 0,
    lineHeight: 1.6,
  },
  ctaBtn: {
    background: colors.primary,
    color: colors.primaryText,
    border: 'none',
    borderRadius: radius.md,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'not-allowed',
    opacity: 0.5,
    width: '100%',
    letterSpacing: '-0.01em',
  },
  signOutLink: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: 13,
    textDecoration: 'underline',
  },
}
