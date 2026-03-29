/**
 * Workout Sessions Adapter - reads training adherence from mobile app
 *
 * Data sources:
 *   - users/{userId}/trainingData/schedule: weekly schedule (monday: "group_a", etc.)
 *   - dailyProgress collection: daily tracking (didTrain: boolean, trainingDurationMinutes: number)
 *     Uses WHERE clause on userId field, NOT document ID pattern
 */

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
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
  userId: string
  didTrain: boolean
  trainingDurationMinutes?: number
  date: Timestamp
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
  let unsubscribe: Unsubscribe | null = null

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
      unsubscribe = subscribeToRecentDailyProgress(appUserUid, schedule, onUpdate, onError)
    })
    .catch((err) => {
      console.error('❌ Failed to load training schedule:', err)
      onError?.(err)
    })

  // Return cleanup function
  return () => {
    if (unsubscribe) {
      unsubscribe()
    }
  }
}

function subscribeToRecentDailyProgress(
  appUserUid: string,
  schedule: TrainingSchedule,
  onUpdate: (days: DailyTrainingProgress[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  // Use collection query with WHERE clause on userId
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const q = query(
    collection(db, 'dailyProgress'),
    where('userId', '==', appUserUid),
    where('date', '>=', Timestamp.fromDate(cutoff)),
    orderBy('date', 'desc'),
    limit(50), // Increased buffer to ensure we get all data
  )

  console.log(`🔍 [subscribeToRecentDailyProgress] Setting up real-time listener for user: ${appUserUid}`)
  console.log(`🔍 [subscribeToRecentDailyProgress] Cutoff date: ${format(cutoff, 'yyyy-MM-dd HH:mm:ss')}`)
  console.log(`🔍 [subscribeToRecentDailyProgress] Today: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`)

  return onSnapshot(
    q,
    (snap) => {
      console.log(`📡 [subscribeToRecentDailyProgress] Received ${snap.docs.length} documents from Firestore`)

      const days: DailyTrainingProgress[] = []

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as DailyProgressData
        const date = data.date.toDate()
        const dayOfWeek = getDay(date)
        const dayName = DAY_NAMES[dayOfWeek] as keyof TrainingSchedule
        const groupId = schedule[dayName]

        console.log(`📄 [Document ${docSnap.id}]:`, {
          date: format(date, 'yyyy-MM-dd'),
          didTrain: data.didTrain,
          trainingDurationMinutes: data.trainingDurationMinutes,
          userId: data.userId,
        })

        const entry = {
          date,
          dateLabel: format(date, 'MMM d, yyyy'),
          didTrain: data.didTrain,
          trainingGroup: groupId ? convertGroupIdToLetter(groupId) : undefined,
          durationMinutes: data.trainingDurationMinutes,
        }

        days.push(entry)

        if (data.didTrain) {
          console.log(`✅ [TRAINED] ${format(date, 'yyyy-MM-dd')} (${dayName}): Group ${entry.trainingGroup || '?'}, ${data.trainingDurationMinutes || 0}min`)
        } else {
          console.log(`⚪ [NOT TRAINED] ${format(date, 'yyyy-MM-dd')} (${dayName})`)
        }
      })

      // Fill in missing days (days with no progress recorded)
      const allDays = fillMissingDays(days, schedule, 30)

      const trainedDays = allDays.filter(d => d.didTrain)
      console.log(`📊 [subscribeToRecentDailyProgress] Total days: ${allDays.length}, Trained: ${trainedDays.length}`)
      console.log(`📊 [subscribeToRecentDailyProgress] Trained dates:`, trainedDays.map(d => format(d.date, 'yyyy-MM-dd')).join(', '))
      console.log(`📊 [subscribeToRecentDailyProgress] Date range: ${format(allDays[allDays.length - 1].date, 'yyyy-MM-dd')} to ${format(allDays[0].date, 'yyyy-MM-dd')}`)

      onUpdate(allDays)
    },
    (err) => {
      console.error('❌ [subscribeToRecentDailyProgress] Failed to subscribe:', err)
      onError?.(err)
    },
  )
}

function fillMissingDays(
  existingDays: DailyTrainingProgress[],
  schedule: TrainingSchedule,
  daysBack: number,
): DailyTrainingProgress[] {
  const today = new Date()
  const dayMap = new Map<string, DailyTrainingProgress>()

  // Add existing days to map
  for (const day of existingDays) {
    const key = format(day.date, 'yyyy-MM-dd')
    dayMap.set(key, day)
  }

  // Fill in all days in the last 30 days
  const allDays: DailyTrainingProgress[] = []
  for (let i = 0; i < daysBack; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    const dateStr = format(checkDate, 'yyyy-MM-dd')

    if (dayMap.has(dateStr)) {
      allDays.push(dayMap.get(dateStr)!)
    } else {
      // No data for this day - fill with empty entry
      const dayOfWeek = getDay(checkDate)
      const dayName = DAY_NAMES[dayOfWeek] as keyof TrainingSchedule
      const groupId = schedule[dayName]

      allDays.push({
        date: checkDate,
        dateLabel: format(checkDate, 'MMM d, yyyy'),
        didTrain: false,
        trainingGroup: groupId ? convertGroupIdToLetter(groupId) : undefined,
      })
    }
  }

  return allDays
}
