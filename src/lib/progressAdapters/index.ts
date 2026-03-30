// ─────────────────────────────────────────────────────────────────────────────
// Progress Adapters — reads from the GymCentral mobile app's Firestore schema
//
// REAL SCHEMA (confirmed from iOS app):
//
// dailyProgress/{docId}
//   userId          string    — filter by this
//   date            Timestamp — normalized to 00:00:00 UTC of that day
//   didTrain        boolean   — user completed a training session
//   trainingDurationMinutes  number
//   allMealsConsumed boolean  — ate all 5 meal periods
//   mealsConsumedCount       number (0-5)
//   createdAt       Timestamp
//   updatedAt       Timestamp
//
// Meal eaten tracking (granular, per period):
//   users/{userId}/diet/data/eaten/{dateKey}/meals/{period}
//   — used if you need per-meal detail; not needed for MVP counts
//
// Workout sessions (for future drill-down):
//   users/{userId}/completedSessions/{sessionId}
//
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { startOfWeek, endOfWeek, format } from 'date-fns'

// ── Types returned by the adapters ────────────────────────────────────────────

export interface DailyProgressEntry {
  id: string
  date: Date
  didTrain: boolean
  trainingDurationMinutes: number
  allMealsConsumed: boolean
  mealsConsumedCount: number
}

export interface WeeklyWorkoutProgress {
  weekLabel: string      // e.g. "Feb 10 – Feb 16"
  weekStart: Date
  weekEnd: Date
  daysExercised: number  // count of days where didTrain === true
  totalMinutes: number
}

export interface MealLogEntry {
  date: Date
  dateLabel: string      // e.g. "Feb 16"
  mealsConsumed: number  // 0-5
  allConsumed: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribe to daily progress entries for an app user (last N days).
// Raw entries — use the derived helpers below for PT/Nutritionist views.
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeDailyProgress(
  appUserUid: string,
  daysBack: number,
  onUpdate: (entries: DailyProgressEntry[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)

  const q = query(
    collection(db, 'dailyProgress'),
    where('userId', '==', appUserUid),
    where('date', '>=', Timestamp.fromDate(cutoff)),
    orderBy('date', 'desc'),
    limit(daysBack + 5), // small buffer
  )

  return onSnapshot(
    q,
    (snap) => {
      const entries: DailyProgressEntry[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          id: d.id,
          date: (data.date as Timestamp).toDate(),
          didTrain: (data.didTrain as boolean) ?? false,
          trainingDurationMinutes: (data.trainingDurationMinutes as number) ?? 0,
          allMealsConsumed: (data.allMealsConsumed as boolean) ?? false,
          mealsConsumedCount: (data.mealsConsumedCount as number) ?? 0,
        }
      })
      onUpdate(entries)
    },
    (err) => onError?.(err),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PT view: subscribe to weekly workout adherence (last 8 weeks).
// Groups dailyProgress entries by ISO week, counts days where didTrain=true.
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeWeeklyWorkoutProgress(
  appUserUid: string,
  onUpdate: (weeks: WeeklyWorkoutProgress[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return subscribeDailyProgress(
    appUserUid,
    56, // 8 weeks
    (entries) => {
      const weekMap = new Map<string, WeeklyWorkoutProgress>()

      for (const entry of entries) {
        const ws = startOfWeek(entry.date, { weekStartsOn: 1 }) // Monday
        const we = endOfWeek(entry.date, { weekStartsOn: 1 })
        const key = format(ws, 'yyyy-MM-dd')

        if (!weekMap.has(key)) {
          weekMap.set(key, {
            weekLabel: `${format(ws, 'MMM d')} – ${format(we, 'MMM d')}`,
            weekStart: ws,
            weekEnd: we,
            daysExercised: 0,
            totalMinutes: 0,
          })
        }

        const week = weekMap.get(key)!
        if (entry.didTrain) {
          week.daysExercised += 1
          week.totalMinutes += entry.trainingDurationMinutes
        }
      }

      // Return sorted newest-first
      const sorted = Array.from(weekMap.values()).sort(
        (a, b) => b.weekStart.getTime() - a.weekStart.getTime(),
      )
      onUpdate(sorted)
    },
    onError,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Nutritionist / Cook view: subscribe to daily meal consumption (last 14 days).
// Returns one entry per day with mealsConsumedCount (0-5).
// Uses the SAME source of truth as iOS: users/{uid}/diet/data/eaten/{dateKey}/meals
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeMealLogs(
  appUserUid: string,
  onUpdate: (entries: MealLogEntry[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  // Generate last 14 days date keys
  const dateKeys: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = format(date, 'yyyy-MM-dd')
    dateKeys.push(dateKey)
  }

  // Subscribe to the first date (to trigger updates)
  // We'll fetch all dates on each update
  const firstDateKey = dateKeys[0]
  const basePath = `users/${appUserUid}/diet/data/eaten`

  const unsubscribe = onSnapshot(
    collection(db, basePath),
    async () => {
      try {
        // Fetch meal counts for all 14 days
        const results: MealLogEntry[] = []

        for (let i = 0; i < dateKeys.length; i++) {
          const dateKey = dateKeys[i]
          const date = new Date(today)
          date.setDate(date.getDate() - (13 - i))

          // Query eaten meals for this date
          const mealsPath = `${basePath}/${dateKey}/meals`
          const mealsSnap = await getDocs(collection(db, mealsPath))
          const mealsConsumed = mealsSnap.size
          const allConsumed = mealsConsumed === 5

          results.push({
            date: date,
            dateLabel: format(date, 'MMM d'),
            mealsConsumed: mealsConsumed,
            allConsumed: allConsumed,
          })
        }

        onUpdate(results)
      } catch (err) {
        if (onError) onError(err as Error)
      }
    },
    (err) => {
      if (onError) onError(err)
    }
  )

  return unsubscribe
}
