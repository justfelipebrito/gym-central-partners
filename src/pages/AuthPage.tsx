import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { InputField, SelectField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { colors, radius, shadow } from '@/lib/theme'
import type { ProfessionalRole } from '@shared/types'

type Mode = 'login' | 'signup'

export function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<ProfessionalRole>('pt')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!displayName.trim()) {
          setErrorMsg('Please enter your name.')
          setSubmitting(false)
          return
        }
        await signUp(email, password, displayName.trim(), role)
      }
      // No need to navigate - component will auto-redirect when user state updates
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo mark */}
        <div style={styles.logoWrap}>
          <div style={styles.logoMark}>GC</div>
          <div>
            <div style={styles.logoTitle}>Gym Central</div>
            <div style={styles.logoSub}>Partners Portal</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setMode('login'); setErrorMsg(null) }}
          >
            Log in
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
            onClick={() => { setMode('signup'); setErrorMsg(null) }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <>
              <InputField
                label="Full name"
                type="text"
                placeholder="Jane Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <SelectField
                label="Your role"
                value={role}
                onChange={(e) => setRole(e.target.value as ProfessionalRole)}
                options={[
                  { value: 'pt', label: '🏋️  Personal Trainer' },
                  { value: 'nutritionist', label: '🥗  Nutritionist' },
                  { value: 'cook', label: '👨‍🍳  Cook' },
                ]}
              />
            </>
          )}

          <InputField
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <InputField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {errorMsg && <p style={styles.error}>{errorMsg}</p>}

          <Button type="submit" loading={submitting} style={{ width: '100%', marginTop: 4 }}>
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <p style={styles.legalNote}>
          For authorized professionals only.
        </p>
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
    padding: '32px 36px',
    width: '100%',
    maxWidth: 400,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
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
    flexShrink: 0,
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
  },
  logoSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  tabs: {
    display: 'flex',
    borderBottom: `2px solid ${colors.border}`,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: 600,
    transition: 'color 0.15s',
  },
  tabActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    margin: 0,
    background: colors.dangerLight,
    padding: '8px 12px',
    borderRadius: radius.sm,
  },
  legalNote: {
    marginTop: 20,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
}
