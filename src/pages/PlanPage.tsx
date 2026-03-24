import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useProfessional } from '@/hooks/useProfessional'
import { upsertTrainingPlan, upsertDietPlan } from '@/lib/api/functions'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextareaField } from '@/components/ui/FormField'
import { colors, radius } from '@/lib/theme'
import type { Plan, TrainingPlanContent, DietPlanContent } from '@shared/types'

// Cook has no access to this page — enforced by RouteGuard in router
export function PlanPage() {
  const { clientProfileId } = useParams<{ clientProfileId: string }>()
  const { professionalId, isPT, isNutritionist } = useProfessional()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Simple JSON editor for MVP
  const [contentJson, setContentJson] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (!professionalId || !clientProfileId) return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'plans'),
      orderBy('updatedAt', 'desc'),
    )

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const latest = snap.docs[0]
        const p = { id: latest.id, ...latest.data() } as Plan
        setPlan(p)
        setContentJson(JSON.stringify(p.content, null, 2))
      } else {
        setPlan(null)
        if (isPT) {
          setContentJson(JSON.stringify(defaultTrainingPlan, null, 2))
        } else {
          setContentJson(JSON.stringify(defaultDietPlan, null, 2))
        }
      }
      setLoading(false)
    })
    return unsub
  }, [professionalId, clientProfileId, isPT])

  const handleSave = async () => {
    if (!clientProfileId) return
    setJsonError(null)
    setErrorMsg(null)
    setSuccessMsg(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(contentJson)
    } catch {
      setJsonError('Invalid JSON — please fix before saving.')
      return
    }

    setSaving(true)
    try {
      if (isPT) {
        await upsertTrainingPlan({ clientProfileId, content: parsed as TrainingPlanContent })
      } else if (isNutritionist) {
        await upsertDietPlan({ clientProfileId, content: parsed as DietPlanContent })
      }
      setSuccessMsg('Plan saved successfully.')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={styles.loading}>Loading plan…</div>

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(`/clients/${clientProfileId}`)}>
        ← Client Profile
      </button>
      <SectionTitle>{isPT ? 'Training Plan' : 'Diet Plan'}</SectionTitle>

      {plan && (
        <p style={styles.muted}>
          Last updated:{' '}
          {plan.updatedAt?.seconds
            ? new Date(plan.updatedAt.seconds * 1000).toLocaleString()
            : '—'}
        </p>
      )}

      <Card>
        <CardTitle>Plan Content (JSON Editor)</CardTitle>
        <p style={styles.hint}>
          Edit the plan below. The structure is flexible — see the schema in <code>shared/types/index.ts</code>.
        </p>
        <TextareaField
          label=""
          value={contentJson}
          onChange={(e) => setContentJson(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 13, minHeight: 360 }}
          error={jsonError ?? undefined}
        />

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}
        {successMsg && <p style={styles.success}>{successMsg}</p>}

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button loading={saving} onClick={handleSave}>
            Save Plan
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/clients/${clientProfileId}`)}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Default plan templates for new clients
const defaultTrainingPlan: TrainingPlanContent = {
  weeklySchedule: [
    {
      day: 'mon',
      exercises: [
        { name: 'Squat', sets: 3, reps: '8-12' },
        { name: 'Bench Press', sets: 3, reps: '8-10' },
      ],
    },
  ],
  notes: '',
}

const defaultDietPlan: DietPlanContent = {
  dailyCalories: 2000,
  meals: [
    {
      name: 'Breakfast',
      time: '08:00',
      foods: [{ name: 'Oats', quantity: '80g', calories: 300 }],
    },
  ],
  notes: '',
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: colors.textMuted,
    padding: 32,
    fontSize: 14,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 0 8px 0',
    marginBottom: 8,
    display: 'block',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  error: {
    color: colors.danger,
    background: colors.dangerLight,
    borderRadius: radius.md,
    padding: '8px 12px',
    fontSize: 13,
    marginTop: 8,
  },
  success: {
    color: colors.successText,
    background: colors.successLight,
    borderRadius: radius.md,
    padding: '8px 12px',
    fontSize: 13,
    marginTop: 8,
  },
}
