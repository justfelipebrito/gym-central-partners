import React, { useState } from 'react'
import { useProfessional } from '@/hooks/useProfessional'
import { useOpenRequests } from '@/hooks/useOpenRequests'
import { acceptClientRequest } from '@/lib/api/functions'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors, radius } from '@/lib/theme'
import { format } from 'date-fns'
import type { ClientRequest } from '@shared/types'

export function RequestsPage() {
  const { role } = useProfessional()
  const { requests, loading, error } = useOpenRequests(role)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAccept = async (req: ClientRequest) => {
    setAccepting(req.id)
    setErrorMsg(null)
    try {
      const result = await acceptClientRequest({ requestId: req.id })
      if (result.success) {
        setAcceptedIds((prev) => new Set([...prev, req.id]))
      } else {
        setErrorMsg(result.error ?? 'Failed to accept request.')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg('Unexpected error.')
      }
    } finally {
      setAccepting(null)
    }
  }

  const typeLabel: Record<string, string> = {
    training_plan: 'Training Plan',
    nutrition_plan: 'Nutrition Plan',
    cook_service: 'Cook Service',
  }

  return (
    <div>
      <SectionTitle>Client Requests</SectionTitle>

      {errorMsg && (
        <div style={styles.errorBanner}>{errorMsg}</div>
      )}

      <Card>
        <CardTitle>Open Requests for Your Role</CardTitle>
        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : error ? (
          <p style={styles.errorText}>{error}</p>
        ) : requests.length === 0 ? (
          <p style={styles.muted}>No open requests at the moment. Check back soon.</p>
        ) : (
          <ul style={styles.list}>
            {requests.map((req) => {
              const isAccepted = acceptedIds.has(req.id)
              return (
                <li key={req.id} style={styles.requestItem}>
                  <div style={styles.requestInfo}>
                    <div style={styles.requestType}>{typeLabel[req.requestType] ?? req.requestType}</div>
                    <div style={styles.requestMeta}>
                      Client UID: <code style={styles.code}>{req.clientUid}</code>
                    </div>
                    {req.createdAt?.seconds && (
                      <div style={styles.requestMeta}>
                        Received: {format(new Date(req.createdAt.seconds * 1000), 'MMM d, yyyy · h:mm a')}
                      </div>
                    )}
                  </div>
                  <div style={styles.requestActions}>
                    {isAccepted ? (
                      <span style={styles.acceptedBadge}>Accepted</span>
                    ) : (
                      <Button
                        size="sm"
                        loading={accepting === req.id}
                        onClick={() => handleAccept(req)}
                      >
                        Accept
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  errorBanner: {
    background: colors.dangerLight,
    border: `1px solid ${colors.danger}33`,
    borderRadius: radius.md,
    padding: '12px 16px',
    color: colors.dangerText,
    fontSize: 14,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  requestItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.divider}`,
    gap: 16,
  },
  requestInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  requestType: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  requestMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  code: {
    background: colors.divider,
    borderRadius: radius.sm,
    padding: '1px 5px',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  requestActions: {
    flexShrink: 0,
  },
  acceptedBadge: {
    background: colors.successLight,
    color: colors.successText,
    borderRadius: radius.full,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
  },
}
