import { Link } from 'react-router-dom'
import { useClientProfiles } from '@/hooks/useClientProfiles'
import { useProfessional } from '@/hooks/useProfessional'
import { Card } from '@/components/ui/Card'
import { colors, radius } from '@/lib/theme'
import type { ClientProfile } from '@shared/types'

export function ClientsPage() {
  const { professionalId } = useProfessional()
  const { profiles, loading, error } = useClientProfiles(professionalId)

  if (loading) {
    return <div style={styles.loading}>Loading clients...</div>
  }

  if (error) {
    return <div style={styles.error}>Error loading clients: {error}</div>
  }

  return (
    <div>
      <h1 style={styles.title}>Clients</h1>
      <p style={styles.subtitle}>
        {profiles.length} {profiles.length === 1 ? 'client' : 'clients'}
      </p>

      {profiles.length === 0 ? (
        <Card>
          <p style={styles.emptyText}>
            No clients yet. Accept requests from the Requests page to get started.
          </p>
        </Card>
      ) : (
        <div style={styles.grid}>
          {profiles.map((profile) => (
            <ClientCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientCard({ profile }: { profile: ClientProfile }) {
  const clientName =
    profile.type === 'external'
      ? profile.externalProfile?.name ?? 'External Client'
      : 'App User'

  const clientSubtext =
    profile.type === 'external'
      ? profile.externalProfile?.email || profile.externalProfile?.phone || ''
      : `UID: ${profile.appUserUid?.slice(0, 12)}...`

  return (
    <Link to={`/clients/${profile.id}`} style={styles.cardLink}>
      <Card style={styles.clientCard}>
        <div style={styles.avatar}>
          {clientName.charAt(0).toUpperCase()}
        </div>
        <div style={styles.clientInfo}>
          <h3 style={styles.clientName}>{clientName}</h3>
          {clientSubtext && <p style={styles.clientSubtext}>{clientSubtext}</p>}
          <div style={styles.meta}>
            <span style={styles.badge}>
              {profile.type === 'external' ? 'External' : 'App User'}
            </span>
            <span style={styles.metaText}>
              {profile.source.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div style={styles.arrow}>→</div>
      </Card>
    </Link>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: colors.textMuted,
    padding: 32,
    fontSize: 14,
  },
  error: {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: colors.danger,
    padding: 32,
    fontSize: 14,
  },
  title: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: colors.textPrimary,
    margin: '0 0 4px 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    color: colors.textMuted,
    margin: '0 0 24px 0',
  },
  emptyText: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    color: colors.textMuted,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  cardLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  clientCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    },
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    background: colors.primary,
    color: colors.primaryText,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    flexShrink: 0,
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
  },
  clientName: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 16,
    fontWeight: 600,
    color: colors.textPrimary,
    margin: '0 0 4px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  clientSubtext: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    color: colors.textMuted,
    margin: '0 0 8px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: colors.primary,
    background: colors.primaryLight,
    padding: '2px 8px',
    borderRadius: radius.full,
  },
  metaText: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12,
    color: colors.textMuted,
  },
  arrow: {
    fontSize: 20,
    color: colors.textMuted,
    flexShrink: 0,
  },
}
