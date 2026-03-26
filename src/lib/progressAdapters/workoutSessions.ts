/**
 * Workout Sessions Adapter - reads training adherence from mobile app
 *
 * Data sources:
 *   - users/{userId}/trainingData/schedule: weekly schedule (monday: "group_a", etc.)
 *   - dailyProgress/{userId}_{date}: daily tracking (didTrain: boolean, trainingDurationMinutes: number)
 */

import {
  doc,
  getDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { format, getDay } from 'date-fns'

interface TrainingSchedule {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

interface DailyProgressData {
  didTrain: boolean
  trainingDurationMinutes?: number
  date: { _seconds: number }
}

export interface DailyTrainingProgress {
  date: Date
  dateLabel: string
  didTrain: boolean
  trainingGroup?: string // A, B, C, etc.
  durationMinutes?: number
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function convertGroupIdToLetter(groupId: string): string {
  // Convert "group_a" -> "A", "group_b" -> "B", etc.
  const match = groupId.match(/group_([a-z])/i)
  return match ? match[1].toUpperCase() : groupId
}

/**
 * Subscribe to daily training progress (last 30 days)
 * Combines training schedule with daily progress to show adherence
 */
export function subscribeDailyTrainingProgress(
  appUserUid: string,
  onUpdate: (days: DailyTrainingProgress[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  let schedule: TrainingSchedule = {}

  // First, load the training schedule
  const scheduleRef = doc(db, 'users', appUserUid, 'trainingData', 'schedule')

  getDoc(scheduleRef)
    .then((scheduleSnap) => {
      if (scheduleSnap.exists()) {
        schedule = scheduleSnap.data() as TrainingSchedule
        console.log('📅 [Training Schedule]:', schedule)
      } else {
        console.warn('⚠️  No training schedule found for user')
      }

      // Now subscribe to daily progress changes
      subscribeToRecentDailyProgress(appUserUid, schedule, onUpdate, onError)
    })
    .catch((err) => {
      console.error('Failed to load training schedule:', err)
      onError?.(err)
    })

  // Return cleanup function
  return () => {
    // Cleanup handled by onSnapshot
  }
}

function subscribeToRecentDailyProgress(
  appUserUid: string,
  schedule: TrainingSchedule,
  onUpdate: (days: DailyTrainingProgress[]) => void,
  onError?: (err: Error) => void,
) {
  // Subscribe to one dailyProgress document to trigger updates
  const today = format(new Date(), 'yyyy-MM-dd')
  const docRef = doc(db, 'dailyProgress', `${appUserUid}_${today}`)

  onSnapshot(
    docRef,
    async () => {
      // When any change happens, fetch last 30 days
      const days = await fetchDailyProgress(appUserUid, schedule, 30)
      onUpdate(days)
    },
    (err) => {
      console.error('Failed to subscribe to daily progress:', err)
      onError?.(err)
    },
  )

  // Also fetch immediately
  fetchDailyProgress(appUserUid, schedule, 30).then(onUpdate).catch(onError)
}

async function fetchDailyProgress(
  appUserUid: string,
  schedule: TrainingSchedule,
  daysBack: number,
): Promise<DailyTrainingProgress[]> {
  const today = new Date()
  const promises: Promise<DailyTrainingProgress>[] = []

  for (let i = 0; i < daysBack; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    const dateStr = format(checkDate, 'yyyy-MM-dd')
    const docId = `${appUserUid}_${dateStr}`

    const dayOfWeek = getDay(checkDate)
    const dayName = DAY_NAMES[dayOfWeek] as keyof TrainingSchedule
    const groupId = schedule[dayName]

    promises.push(
      getDoc(doc(db, 'dailyProgress', docId)).then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as DailyProgressData

          return {
            date: checkDate,
            dateLabel: format(checkDate, 'MMM d, yyyy'),
            didTrain: data.didTrain,
            trainingGroup: groupId ? convertGroupIdToLetter(groupId) : undefined,
            durationMinutes: data.trainingDurationMinutes,
          }
        }

        // No data for this day
        return {
          date: checkDate,
          dateLabel: format(checkDate, 'MMM d, yyyy'),
          didTrain: false,
          trainingGroup: groupId ? convertGroupIdToLetter(groupId) : undefined,
        }
      }),
    )
  }

  const results = await Promise.all(promises)
  console.log(`📊 [Daily Progress] Last ${daysBack} days:`, results.filter(d => d.didTrain).length, 'training days')

  return results
}
