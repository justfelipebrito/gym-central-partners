import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useProfessional } from '@/hooks/useProfessional'
import { upsertTrainingPlan, upsertDietPlan } from '@/lib/api/functions'
import { SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TrainingPlanEditor } from '@/components/plan/TrainingPlanEditor'
import { DietPlanEditor } from '@/components/plan/DietPlanEditor'
import { WeeklyScheduleEditor } from '@/components/plan/WeeklyScheduleEditor'
import { MuscleGroupExercisesEditor } from '@/components/plan/MuscleGroupExercisesEditor'
import type { Plan, TrainingPlanContent, DietPlanContent, ClientProfile } from '@shared/types'
import './PlanPage.css'

export function PlanPage() {
  const { clientProfileId } = useParams<{ clientProfileId: string }>()
  const { professionalId, isPT, isNutritionist } = useProfessional()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // For external clients using plans subcollection
  const [content, setContent] = useState<TrainingPlanContent | DietPlanContent | null>(null)

  // For app users using users collection
  const [schedule, setSchedule] = useState<any>({})
  const [availableGroups, setAvailableGroups] = useState<string[]>([])

  // Fetch client profile
  useEffect(() => {
    if (!professionalId || !clientProfileId) return

    const profRef = doc(db, 'professionals', professionalId, 'clientProfiles', clientProfileId)
    const unsub = onSnapshot(profRef, (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() } as ClientProfile)
      }
    })
    return unsub
  }, [professionalId, clientProfileId])

  // Fetch user data for app users
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

  // Load schedule for app users
  useEffect(() => {
    if (!profile || profile.type !== 'app_user' || !profile.appUserUid) return

    const loadSchedule = async () => {
      setLoading(true)
      try {
        // Load schedule
        const scheduleRef = doc(db, 'users', profile.appUserUid, 'trainingData', 'schedule')
        const scheduleSnap = await getDoc(scheduleRef)
        if (scheduleSnap.exists()) {
          setSchedule(scheduleSnap.data())
        }

        // Load available training groups from trainingGroups collection
        const groupsRef = collection(db, 'users', profile.appUserUid, 'trainingGroups')
        const groupsSnap = await getDocs(groupsRef)
        const groups = groupsSnap.docs.map(d => d.id)

        // Always ensure group_a, group_b, group_c are available
        const baseGroups = ['group_a', 'group_b', 'group_c']
        const allGroups = [...new Set([...baseGroups, ...groups])].sort()

        setAvailableGroups(allGroups)
      } catch (err) {
        console.error('Failed to load schedule:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [profile])

  // Load plan for external clients
  useEffect(() => {
    if (!professionalId || !clientProfileId || !profile || profile.type !== 'external') return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'plans'),
      orderBy('updatedAt', 'desc'),
    )

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const latest = snap.docs[0]
        const p = { id: latest.id, ...latest.data() } as Plan
        setPlan(p)
        setContent(p.content)
      } else {
        setPlan(null)
        if (isPT) {
          setContent(defaultTrainingPlan)
        } else {
          setContent(defaultDietPlan)
        }
      }
      setLoading(false)
    })
    return unsub
  }, [professionalId, clientProfileId, isPT, profile])

  const handleSaveSchedule = async () => {
    if (!profile || profile.type !== 'app_user' || !profile.appUserUid) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setSaving(true)

    try {
      const scheduleRef = doc(db, 'users', profile.appUserUid, 'trainingData', 'schedule')
      await setDoc(scheduleRef, schedule)
      setSuccessMsg('Schedule saved successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExternalPlan = async () => {
    if (!clientProfileId || !content) return

    setErrorMsg(null)
    setSuccessMsg(null)
    setSaving(true)

    try {
      if (isPT) {
        await upsertTrainingPlan({ clientProfileId, content: content as TrainingPlanContent })
      } else if (isNutritionist) {
        await upsertDietPlan({ clientProfileId, content: content as DietPlanContent })
      }
      setSuccessMsg('Plan saved successfully.')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-text">Loading plan…</div>

  const isAppUser = profile?.type === 'app_user'
  const isPro = userData?.subscriptionPlan === 'pro'

  return (
    <div className="plan-page">
      <button className="back-button" onClick={() => navigate(`/clients/${clientProfileId}`)}>
        ← Back to Client Profile
      </button>

      <div className="plan-header">
        <SectionTitle>{isPT ? 'Training Plan' : 'Diet Plan'}</SectionTitle>
        {plan && (
          <p className="last-updated">
            Last updated:{' '}
            {plan.updatedAt?.seconds
              ? new Date(plan.updatedAt.seconds * 1000).toLocaleString()
              : '—'}
          </p>
        )}
      </div>

      {errorMsg && <div className="message error">{errorMsg}</div>}
      {successMsg && <div className="message success">{successMsg}</div>}

      {isAppUser && isPT ? (
        // App user training plan (schedule + exercises)
        <>
          <div className="plan-section">
            <WeeklyScheduleEditor
              schedule={schedule}
              onChange={setSchedule}
              onSave={handleSaveSchedule}
              availableGroups={availableGroups}
              isPro={isPro}
              saving={saving}
            />
          </div>

          <div className="plan-section">
            <MuscleGroupExercisesEditor
              appUserUid={profile!.appUserUid!}
              availableGroups={availableGroups}
              isPro={isPro}
            />
          </div>
        </>
      ) : content ? (
        // External client plan
        <>
          {isPT ? (
            <TrainingPlanEditor
              content={content as TrainingPlanContent}
              onChange={(newContent) => setContent(newContent)}
            />
          ) : (
            <DietPlanEditor
              content={content as DietPlanContent}
              onChange={(newContent) => setContent(newContent)}
            />
          )}

          {errorMsg && <div className="message error">{errorMsg}</div>}
          {successMsg && <div className="message success">{successMsg}</div>}

          <div className="plan-actions">
            <Button loading={saving} onClick={handleSaveExternalPlan}>
              Save Plan
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/clients/${clientProfileId}`)}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

// Default plan templates for external clients
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
