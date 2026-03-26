import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useProfessional } from '@/hooks/useProfessional'
import { resolveReplacementRequest } from '@/lib/api/functions'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { WeeklySchedule } from '@/components/client/WeeklySchedule'
import { WorkoutAdherence } from '@/components/client/WorkoutAdherence'
import { colors, radius } from '@/lib/theme'
import {
  subscribeMealLogs,
  type MealLogEntry,
} from '@/lib/progressAdapters'

import type { ClientProfile, ManualProgressEntry, ReplacementRequest, Batch, Plan, TrainingPlanContent } from '@shared/types'
import { format } from 'date-fns'

export function ClientProfilePage() {
  const { clientProfileId } = useParams<{ clientProfileId: string }>()
  const { professionalId, isPT, isNutritionist, isCook } = useProfessional()

  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // App user data (name, height, weight, etc.)
  const [userData, setUserData] = useState<any>(null)

  // App user progress
  const [mealLogs, setMealLogs] = useState<MealLogEntry[]>([])

  // Manual progress
  const [manualEntries, setManualEntries] = useState<ManualProgressEntry[]>([])

  // Nutritionist: replacement requests
  const [replacements, setReplacements] = useState<ReplacementRequest[]>([])

  // Cook: batches
  const [batches, setBatches] = useState<Batch[]>([])

  // PT/Nutritionist: plans
  const [plan, setPlan] = useState<Plan | null>(null)

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

  // Subscribe to user data from users collection
  useEffect(() => {
    if (!profile || profile.type !== 'app_user' || !profile.appUserUid) return

    const userRef = doc(db, 'users', profile.appUserUid)
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserData(snap.data())
      }
    })
    return unsub
  }, [profile])

  // Subscribe to meal logs when profile is loaded
  useEffect(() => {
    if (!profile || profile.type !== 'app_user' || !profile.appUserUid) return

    const uid = profile.appUserUid
    const unsubMeals = subscribeMealLogs(uid, setMealLogs)
    return () => {
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

  // Subscribe to plan (PT/Nutritionist)
  useEffect(() => {
    if (!professionalId || !clientProfileId || (!isPT && !isNutritionist)) return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'plans'),
      limit(1),
    )
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPlan({ id: snap.docs[0].id, ...snap.docs[0].data() } as Plan)
      } else {
        setPlan(null)
      }
    })
    return unsub
  }, [professionalId, clientProfileId, isPT, isNutritionist])

  if (loadingProfile) return <div style={styles.loading}>Loading client…</div>
  if (!profile) return <div style={styles.loading}>Client not found.</div>

  const clientName =
    profile.type === 'external'
      ? profile.externalProfile?.name ?? 'External Client'
      : userData?.name || `App User (${profile.appUserUid?.slice(0, 8)}…)`

  return (
    <div>
      {/* Breadcrumbs */}
      <nav style={styles.breadcrumbs}>
        <Link to="/dashboard" style={styles.breadcrumbLink}>Dashboard</Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <Link to="/clients" style={styles.breadcrumbLink}>Clients</Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbCurrent}>{clientName}</span>
      </nav>

      <div style={styles.headerRow}>
        <div>
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
          <dt>Name</dt><dd>{clientName}</dd>
          {profile.type === 'app_user' && userData && (
            <>
              {userData.height && <><dt>Height</dt><dd>{userData.height} cm</dd></>}
              {userData.weight && <><dt>Weight</dt><dd>{userData.weight} kg</dd></>}
            </>
          )}
          {profile.type === 'external' && (
            <>
              {profile.externalProfile?.email && <><dt>Email</dt><dd>{profile.externalProfile.email}</dd></>}
              {profile.externalProfile?.phone && <><dt>Phone</dt><dd>{profile.externalProfile.phone}</dd></>}
            </>
          )}
        </dl>
      </Card>

      {/* Weekly Training Schedule (PT only) */}
      {isPT && profile.type === 'app_user' && profile.appUserUid && (
        <WeeklySchedule appUserUid={profile.appUserUid} />
      )}

      {/* Progress panels */}
      {profile.type === 'app_user' && profile.appUserUid && (
        <>
          {isPT && <WorkoutAdherence appUserUid={profile.appUserUid} />}

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
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    fontSize: 13,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  breadcrumbLink: {
    color: colors.textMuted,
    textDecoration: 'none',
    transition: 'color 0.15s',
  },
  breadcrumbSeparator: {
    color: colors.textMuted,
  },
  breadcrumbCurrent: {
    color: colors.textSecondary,
    fontWeight: 500,
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
