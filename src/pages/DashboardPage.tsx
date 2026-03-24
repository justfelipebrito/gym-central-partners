import React from 'react'
import { Link } from 'react-router-dom'
import { useProfessional } from '@/hooks/useProfessional'
import { useOpenRequests } from '@/hooks/useOpenRequests'
import { useClientProfiles } from '@/hooks/useClientProfiles'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors, radius } from '@/lib/theme'
import { format } from 'date-fns'

const roleLabel: Record<string, string> = {
  pt: 'Personal Trainer',
  nutritionist: 'Nutritionist',
  cook: 'Cook',
}

export function DashboardPage() {
  const { professionalId, role, professional } = useProfessional()
  const { requests, loading: reqLoading } = useOpenRequests(role)
  const { profiles, loading: profLoading } = useClientProfiles(professionalId)

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>Good day,</p>
          <SectionTitle>{professional?.displayName} 👋</SectionTitle>
        </div>
        <div style={styles.rolePill}>
          {roleLabel[role ?? ''] ?? '—'}
        </div>
      </div>

      {/* Stat cards */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.primary}` }}>
          <div style={styles.statNum}>{reqLoading ? '…' : requests.length}</div>
          <div style={styles.statLabel}>Open Requests</div>
          <Link to="/requests" style={styles.statLink}>View all →</Link>
        </div>
        <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.info}` }}>
          <div style={styles.statNum}>{profLoading ? '…' : profiles.length}</div>
          <div style={styles.statLabel}>My Clients</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: `3px solid ${colors.success}` }}>
          <div style={{ ...styles.statNum, fontSize: 18 }}>Active</div>
          <div style={styles.statLabel}>Membership</div>
        </div>
      </div>

      {/* Open requests preview */}
      <Card style={{ marginBottom: 20 }}>
        <div style={styles.cardHeader}>
          <CardTitle>Open Requests</CardTitle>
          <Link to="/requests">
            <Button variant="ghost" size="sm">See all</Button>
          </Link>
        </div>
        {reqLoading ? (
          <p style={styles.muted}>Loading…</p>
        ) : requests.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p style={styles.emptyText}>No open requests right now. Check back soon!</p>
          </div>
        ) : (
          <ul style={styles.list}>
            {requests.slice(0, 3).map((req) => (
              <li key={req.id} style={styles.listItem}>
                <div>
                  <div style={styles.listPrimary}>
                    {req.requestType.replace(/_/g, ' ')}
                  </div>
                  <div style={styles.listSecondary}>
                    {req.createdAt?.seconds
                      ? format(new Date(req.createdAt.seconds * 1000), 'MMM d, yyyy')
                      : 'Just now'}
                  </div>
                </div>
                <Link to="/requests">
                  <Button size="sm">Accept</Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* My clients */}
      <Card>
        <div style={styles.cardHeader}>
          <CardTitle>My Clients</CardTitle>
          <Link to="/settings">
            <Button variant="ghost" size="sm">+ Add client</Button>
          </Link>
        </div>
        {profLoading ? (
          <p style={styles.muted}>Loading…</p>
        ) : profiles.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🧑‍🤝‍🧑</div>
            <p style={styles.emptyText}>No clients yet — accept a request or add one manually.</p>
          </div>
        ) : (
          <ul style={styles.list}>
            {profiles.map((p) => (
              <li key={p.id} style={styles.listItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={styles.clientAvatar}>
                    {p.type === 'external'
                      ? (p.externalProfile?.name?.charAt(0) ?? 'E').toUpperCase()
                      : 'A'}
                  </div>
                  <div>
                    <div style={styles.listPrimary}>
                      {p.type === 'external'
                        ? p.externalProfile?.name ?? 'External Client'
                        : `App User (${p.appUserUid?.slice(0, 8)}…)`}
                    </div>
                    <div style={styles.listSecondary}>
                      <span style={{
                        ...styles.typeBadge,
                        background: p.type === 'external' ? colors.warningLight : colors.infoLight,
                        color: p.type === 'external' ? colors.warningText : colors.infoText,
                      }}>
                        {p.type === 'external' ? 'External' : 'App User'}
                      </span>
                    </div>
                  </div>
                </div>
                <Link to={`/clients/${p.id}`}>
                  <Button size="sm" variant="secondary">View</Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 13,
    color: colors.textMuted,
    margin: '0 0 2px 0',
  },
  rolePill: {
    background: colors.primaryLight,
    color: colors.primaryDark,
    borderRadius: radius.full,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.01em',
    marginTop: 4,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: colors.card,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statNum: {
    fontSize: 28,
    fontWeight: 800,
    color: colors.textPrimary,
    letterSpacing: '-0.03em',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  statLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 600,
    marginTop: 4,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.divider}`,
    gap: 12,
  },
  listPrimary: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  listSecondary: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  clientAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    background: colors.primaryLight,
    color: colors.primaryDark,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  typeBadge: {
    borderRadius: radius.full,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    margin: 0,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
}
