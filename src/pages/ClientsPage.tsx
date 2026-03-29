import { Link } from 'react-router-dom'
import { useClientProfiles, type EnrichedClientProfile } from '@/hooks/useClientProfiles'
import { useProfessional } from '@/hooks/useProfessional'
import { Card } from '@/components/ui/Card'
import './ClientsPage.css'

export function ClientsPage() {
  const { professionalId } = useProfessional()
  const { profiles, loading, error } = useClientProfiles(professionalId)

  if (loading) {
    return <div className="loading-text">Loading clients...</div>
  }

  if (error) {
    return <div className="error-text">Error loading clients: {error}</div>
  }

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div>
          <h1 className="clients-title">Clients</h1>
          <p className="clients-subtitle">
            {profiles.length} {profiles.length === 1 ? 'client' : 'clients'}
          </p>
        </div>
      </div>

      {profiles.length === 0 ? (
        <Card className="empty-state">
          <p className="empty-text">
            No clients yet. Accept requests from the Requests page to get started.
          </p>
        </Card>
      ) : (
        <div className="clients-list">
          {profiles.map((profile) => (
            <ClientListItem key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientListItem({ profile }: { profile: EnrichedClientProfile }) {
  const clientName =
    profile.type === 'external'
      ? profile.externalProfile?.name ?? 'External Client'
      : profile.userData?.name || 'App User'

  const clientSubtext =
    profile.type === 'external'
      ? profile.externalProfile?.email || profile.externalProfile?.phone || ''
      : profile.userData?.email || ''

  return (
    <Link to={`/clients/${profile.id}`} className="client-list-item-link">
      <div className="client-list-item">
        <div className="client-avatar">
          {clientName.charAt(0).toUpperCase()}
        </div>

        <div className="client-main-info">
          <h3 className="client-name">{clientName}</h3>
          {clientSubtext && <p className="client-subtext">{clientSubtext}</p>}
        </div>

        <div className="client-meta">
          <span className="client-badge">
            {profile.type === 'external' ? 'External' : 'App User'}
          </span>
          <span className="client-source">
            {profile.source.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="client-arrow">→</div>
      </div>
    </Link>
  )
}
