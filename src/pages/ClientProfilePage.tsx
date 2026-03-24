import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useProfessional } from '@/hooks/useProfessional'
import { resolveReplacementRequest } from '@/lib/api/functions'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors, radius } from '@/lib/theme'
import {
  subscribeWeeklyWorkoutProgress,
  subscribeMealLogs,
  type WeeklyWorkoutProgress,
  type MealLogEntry,
} from '@/lib/progressAdapters'

import type { ClientProfile, ManualProgressEntry, ReplacementRequest, Batch } from '@shared/types'
import { format } from 'date-fns'

export function ClientProfilePage() {
  const { clientProfileId } = useParams<{ clientProfileId: string }>()
  const { professionalId, isPT, isNutritionist, isCook } = useProfessional()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // App user progress
  const [workoutProgress, setWorkoutProgress] = useState<WeeklyWorkoutProgress[]>([])
  const [mealLogs, setMealLogs] = useState<MealLogEntry[]>([])

  // Manual progress
  const [manualEntries, setManualEntries] = useState<ManualProgressEntry[]>([])

  // Nutritionist: replacement requests
  const [replacements, setReplacements] = useState<ReplacementRequest[]>([])

  // Cook: batches
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    if (!professionalId || !clientProfileId) return

    const profRef = doc(db, 'professionals', professionalId, 'clientProfiles', clientProfileId)
    const unsub = onSnapshot(profRef, (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() } as ClientProfile)
      } else {
        setProfile(null)
      }
      setLoadingProfile(false)
    })
    return unsub
  }, [professionalId, clientProfileId])

  // Subscribe to app-user progress when profile is loaded
  useEffect(() => {
    if (!profile || profile.type !== 'app_user' || !profile.appUserUid) return

    const uid = profile.appUserUid
    const unsubWorkout = subscribeWeeklyWorkoutProgress(uid, setWorkoutProgress)
    const unsubMeals = subscribeMealLogs(uid, setMealLogs)
    return () => {
      unsubWorkout()
      unsubMeals()
    }
  }, [profile])

  // Subscribe to manual progress
  useEffect(() => {
    if (!professionalId || !clientProfileId || !profile || profile.type !== 'external') return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'manualProgress'),
      orderBy('timestamp', 'desc'),
      limit(20),
    )
    const unsub = onSnapshot(q, (snap) => {
      setManualEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ManualProgressEntry))
    })
    return unsub
  }, [professionalId, clientProfileId, profile])

  // Subscribe to replacement requests (nutritionist)
  useEffect(() => {
    if (!professionalId || !clientProfileId || !isNutritionist) return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'replacementRequests'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setReplacements(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReplacementRequest))
    })
    return unsub
  }, [professionalId, clientProfileId, isNutritionist])

  // Subscribe to batches (cook)
  useEffect(() => {
    if (!professionalId || !clientProfileId || !isCook) return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'batches'),
      orderBy('scheduledAt', 'asc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch))
    })
    return unsub
  }, [professionalId, clientProfileId, isCook])

  if (loadingProfile) return <div style={styles.loading}>Loading client…</div>
  if (!profile) return <div style={styles.loading}>Client not found.</div>

  const clientName =
    profile.type === 'external'
      ? profile.externalProfile?.name ?? 'External Client'
      : `App User (${profile.appUserUid?.slice(0, 8)}…)`

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <SectionTitle>{clientName}</SectionTitle>
        </div>
        <div style={styles.headerActions}>
          {(isPT || isNutritionist) && (
            <Link to={`/clients/${clientProfileId}/plan`}>
              <Button variant="secondary">View / Edit Plan</Button>
            </Link>
          )}
          {isCook && (
            <Link to={`/clients/${clientProfileId}/logistics`}>
              <Button variant="secondary">Logistics</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Client info */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Client Info</CardTitle>
        <dl style={styles.dl}>
          <dt>Type</dt><dd>{profile.type === 'external' ? 'External Client' : 'App User'}</dd>
          <dt>Source</dt><dd>{profile.source.replace(/_/g, ' ')}</dd>
          {profile.type === 'external' && profile.externalProfile?.email && (
            <><dt>Email</dt><dd>{profile.externalProfile.email}</dd></>
          )}
          {profile.type === 'external' && profile.externalProfile?.phone && (
            <><dt>Phone</dt><dd>{profile.externalProfile.phone}</dd></>
          )}
        </dl>
      </Card>

      {/* Progress panels */}
      {profile.type === 'app_user' && (
        <>
          {isPT && (
            <Card style={{ marginBottom: 24 }}>
              <CardTitle>Weekly Workout Adherence (Live)</CardTitle>
              {workoutProgress.length === 0 ? (
                <p style={styles.muted}>No workout data available yet.</p>
              ) : (
                <ul style={styles.progressList}>
                  {workoutProgress.map((w) => (
                    <li key={w.weekLabel} style={styles.progressItem}>
                      <span style={styles.progressLabel}>{w.weekLabel}</span>
                      <span style={styles.progressValue}>
                        {w.daysExercised} / 7 days
                        {w.totalMinutes > 0 && ` · ${w.totalMinutes} min`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {(isNutritionist || isCook) && (
            <Card style={{ marginBottom: 24 }}>
              <CardTitle>Meals Consumed (Live)</CardTitle>
              {mealLogs.length === 0 ? (
                <p style={styles.muted}>No meal log data available yet.</p>
              ) : (
                <ul style={styles.progressList}>
                  {mealLogs.slice(0, 14).map((m) => (
                    <li key={m.dateLabel} style={styles.progressItem}>
                      <span style={styles.progressLabel}>{m.dateLabel}</span>
                      <span style={styles.progressValue}>
                        {m.mealsConsumed} / 5 meals
                        {m.allConsumed && (
                          <span style={{ color: colors.success, marginLeft: 6 }}>✓ all</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}

      {/* Manual progress (external clients) */}
      {profile.type === 'external' && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>Manual Progress Entries</CardTitle>
          {manualEntries.length === 0 ? (
            <p style={styles.muted}>No manual progress recorded yet.</p>
          ) : (
            <ul style={styles.progressList}>
              {manualEntries.map((e) => (
                <li key={e.id} style={styles.progressItem}>
                  <span style={styles.progressLabel}>
                    {e.timestamp?.seconds
                      ? format(new Date(e.timestamp.seconds * 1000), 'MMM d, yyyy')
                      : e.id}
                  </span>
                  <span style={styles.progressValue}>
                    {e.workoutsCompletedDaysCount !== undefined && (
                      <>{e.workoutsCompletedDaysCount} workout days</>
                    )}
                    {e.mealsConsumedCount !== undefined && (
                      <> · {e.mealsConsumedCount} meals</>
                    )}
                    {e.notes && <> · {e.notes}</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Replacement requests (Nutritionist) */}
      {isNutritionist && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>Replacement Requests</CardTitle>
          {replacements.length === 0 ? (
            <p style={styles.muted}>No replacement requests.</p>
          ) : (
            <ul style={styles.progressList}>
              {replacements.map((r) => (
                <li key={r.id} style={{ ...styles.progressItem, alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <strong style={{ fontSize: 13 }}>{r.type.replace(/_/g, ' ')}</strong>
                    <span style={{
                      fontSize: 11,
                      background: r.status === 'open' ? colors.warningLight : colors.successLight,
                      color: r.status === 'open' ? colors.warningText : colors.successText,
                      borderRadius: radius.full,
                      padding: '2px 8px',
                      fontWeight: 600,
                    }}>
                      {r.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>{r.message}</p>
                  {r.status === 'open' && (
                    <ResolveReplacementButton
                      professionalId={professionalId!}
                      clientProfileId={clientProfileId!}
                      replacementId={r.id}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Upcoming batches (Cook) */}
      {isCook && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <CardTitle>Batch Logistics</CardTitle>
            <Link to={`/clients/${clientProfileId}/logistics`}>
              <Button size="sm" variant="ghost">Manage</Button>
            </Link>
          </div>
          {batches.length === 0 ? (
            <p style={styles.muted}>No batches scheduled yet.</p>
          ) : (
            <ul style={styles.progressList}>
              {batches.slice(0, 5).map((b) => (
                <li key={b.id} style={styles.progressItem}>
                  <span style={styles.progressLabel}>
                    {b.scheduledAt?.seconds
                      ? format(new Date(b.scheduledAt.seconds * 1000), 'MMM d · h:mm a')
                      : b.id}
                  </span>
                  <span style={styles.progressValue}>
                    {b.pickupOrDelivery} · <em>{b.status}</em>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}

// Inline component for resolving a replacement request
function ResolveReplacementButton({
  clientProfileId: _clientProfileId,
  replacementId: _replacementId,
}: {
  professionalId: string
  clientProfileId: string
  replacementId: string
}) {
  const [loading, setLoading] = useState(false)

  const handleResolve = async () => {
    setLoading(true)
    try {
      await resolveReplacementRequest({ clientProfileId: _clientProfileId, replacementId: _replacementId })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="ghost" loading={loading} onClick={handleResolve}>
      Mark Resolved
    </Button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: colors.textMuted,
    padding: 32,
    fontSize: 14,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 16,
  },
  headerActions: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 0 8px 0',
  },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    gap: '8px 16px',
    fontSize: 14,
    color: colors.textSecondary,
    margin: 0,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  progressList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  progressItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.divider}`,
    fontSize: 13,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontWeight: 500,
  },
  progressValue: {
    color: colors.textMuted,
  },
}
