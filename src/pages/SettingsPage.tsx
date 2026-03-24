import React, { useState } from 'react'
import { useProfessional } from '@/hooks/useProfessional'
import { useAuth } from '@/contexts/AuthContext'
import { createExternalClientProfile, linkAppUserClientProfile } from '@/lib/api/functions'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/FormField'
import { colors, radius } from '@/lib/theme'

export function SettingsPage() {
  const { professional } = useProfessional()
  const { signOut } = useAuth()

  // Add external client form
  const [showExtForm, setShowExtForm] = useState(false)
  const [extName, setExtName] = useState('')
  const [extEmail, setExtEmail] = useState('')
  const [extPhone, setExtPhone] = useState('')
  const [extSaving, setExtSaving] = useState(false)
  const [extMsg, setExtMsg] = useState<string | null>(null)

  // Link app user form
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [appUid, setAppUid] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkMsg, setLinkMsg] = useState<string | null>(null)

  const handleAddExternal = async (e: React.FormEvent) => {
    e.preventDefault()
    setExtMsg(null)
    setExtSaving(true)
    try {
      const result = await createExternalClientProfile({
        name: extName.trim(),
        email: extEmail.trim() || undefined,
        phone: extPhone.trim() || undefined,
      })
      if (result.success) {
        setExtMsg('Client added successfully.')
        setExtName('')
        setExtEmail('')
        setExtPhone('')
        setShowExtForm(false)
      } else {
        setExtMsg(result.error ?? 'Failed to add client.')
      }
    } catch (err: unknown) {
      setExtMsg(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setExtSaving(false)
    }
  }

  const handleLinkAppUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkMsg(null)
    setLinkSaving(true)
    try {
      const result = await linkAppUserClientProfile({ appUserUid: appUid.trim() })
      if (result.success) {
        setLinkMsg('App user linked successfully.')
        setAppUid('')
        setShowLinkForm(false)
      } else {
        setLinkMsg(result.error ?? 'Failed to link app user.')
      }
    } catch (err: unknown) {
      setLinkMsg(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setLinkSaving(false)
    }
  }

  const roleLabel: Record<string, string> = {
    pt: 'Personal Trainer',
    nutritionist: 'Nutritionist',
    cook: 'Cook',
  }

  return (
    <div>
      <SectionTitle>Settings</SectionTitle>

      {/* Profile card */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Your Profile</CardTitle>
        <dl style={styles.dl}>
          <dt>Name</dt><dd>{professional?.displayName ?? '—'}</dd>
          <dt>Role</dt><dd>{roleLabel[professional?.role ?? ''] ?? professional?.role ?? '—'}</dd>
          <dt>Membership</dt>
          <dd>
            <span style={{
              background: professional?.membershipStatus === 'active' ? colors.successLight : colors.warningLight,
              color: professional?.membershipStatus === 'active' ? colors.successText : colors.warningText,
              borderRadius: radius.full,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {professional?.membershipStatus ?? '—'}
            </span>
          </dd>
          <dt>Professional ID</dt>
          <dd><code style={styles.code}>{professional?.id ?? '—'}</code></dd>
        </dl>
      </Card>

      {/* Add clients card */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Add / Link Clients</CardTitle>
        <p style={styles.hint}>
          You can add clients who aren't using the mobile app yet (external), or
          link an existing app user by their UID.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Button size="sm" variant="ghost" onClick={() => { setShowExtForm((v) => !v); setShowLinkForm(false) }}>
            + Add External Client
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowLinkForm((v) => !v); setShowExtForm(false) }}>
            Link App User
          </Button>
        </div>

        {extMsg && <p style={styles.successMsg}>{extMsg}</p>}
        {showExtForm && (
          <form onSubmit={handleAddExternal} style={styles.form}>
            <InputField label="Name" type="text" value={extName} onChange={(e) => setExtName(e.target.value)} required />
            <InputField label="Email (optional)" type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} />
            <InputField label="Phone (optional)" type="tel" value={extPhone} onChange={(e) => setExtPhone(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" size="sm" loading={extSaving}>Add Client</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowExtForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {linkMsg && <p style={styles.successMsg}>{linkMsg}</p>}
        {showLinkForm && (
          <form onSubmit={handleLinkAppUser} style={styles.form}>
            <InputField
              label="App User UID"
              type="text"
              value={appUid}
              onChange={(e) => setAppUid(e.target.value)}
              placeholder="Firebase Auth UID of the client"
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" size="sm" loading={linkSaving}>Link User</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowLinkForm(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </Card>

      {/* Membership card */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Membership</CardTitle>
        <p style={styles.hint}>
          Stripe integration will be available here. Membership management coming soon.
        </p>
        <Button variant="secondary" disabled>
          Manage Subscription — Coming Soon
        </Button>
      </Card>

      {/* Sign out */}
      <Card>
        <CardTitle>Account</CardTitle>
        <Button variant="danger" onClick={signOut}>
          Sign Out
        </Button>
      </Card>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  dl: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    gap: '8px 16px',
    fontSize: 14,
    color: colors.textSecondary,
    margin: 0,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 1.5,
  },
  code: {
    background: colors.divider,
    borderRadius: radius.sm,
    padding: '1px 5px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textSecondary,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 8,
    maxWidth: 400,
  },
  successMsg: {
    color: colors.successText,
    background: colors.successLight,
    borderRadius: radius.md,
    padding: '8px 12px',
    fontSize: 13,
    marginBottom: 8,
  },
}
