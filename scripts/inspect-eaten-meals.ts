/**
 * Inspect eaten meals from the iOS source of truth
 * Path: users/{userId}/diet/data/eaten/{dateKey}/meals
 * Run: npx tsx scripts/inspect-eaten-meals.ts
 */

import admin from 'firebase-admin'
import { format } from 'date-fns'

// Initialize Admin SDK for production
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const db = admin.firestore()

async function inspectEatenMeals() {
  console.log('🔍 Inspecting eaten meals from iOS source of truth...\n')

  const clientUid = 'RT3PeY0SIMbXXeRjU362NrHr28l2'

  // Generate last 14 days date keys
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  console.log(`Today: ${today.toISOString().split('T')[0]}\n`)

  let totalMeals = 0
  let daysWithAllMeals = 0

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = format(date, 'yyyy-MM-dd')

    // Query eaten meals for this date
    const mealsPath = `users/${clientUid}/diet/data/eaten/${dateKey}/meals`
    const mealsSnap = await db.collection(mealsPath).get()

    const mealsConsumed = mealsSnap.size
    const allConsumed = mealsConsumed === 5

    totalMeals += mealsConsumed
    if (allConsumed) daysWithAllMeals++

    const meals = mealsSnap.docs.map(doc => doc.id).join(', ')
    console.log(`${dateKey} (${date.toLocaleDateString('en-US', { weekday: 'short' })}): ${mealsConsumed}/5 meals, all: ${allConsumed}`)
    if (mealsConsumed > 0) {
      console.log(`  Meals: ${meals}`)
    }
  }

  console.log(`\n📈 Summary (Last 14 Days):`)
  console.log(`  Total meals: ${totalMeals}`)
  console.log(`  Days with all meals: ${daysWithAllMeals}`)
  console.log(`  Avg per day: ${(totalMeals / 14).toFixed(1)}`)

  process.exit(0)
}

inspectEatenMeals().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
