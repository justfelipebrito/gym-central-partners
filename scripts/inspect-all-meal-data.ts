/**
 * Detailed inspection of ALL meal data sources
 * Run: npx tsx scripts/inspect-all-meal-data.ts
 */

import admin from 'firebase-admin'

// Initialize Admin SDK for production
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const db = admin.firestore()

async function inspectAllMealData() {
  console.log('🔍 Detailed meal data inspection...\n')

  const clientUid = 'RT3PeY0SIMbXXeRjU362NrHr28l2'

  // Check ALL dailyProgress entries for this user (not just last 14 days)
  console.log('📊 Checking ALL dailyProgress entries for March 2026:')

  const marchStart = new Date('2026-03-01')
  const marchEnd = new Date('2026-03-31T23:59:59')

  const progressSnap = await db.collection('dailyProgress')
    .where('userId', '==', clientUid)
    .where('date', '>=', admin.firestore.Timestamp.fromDate(marchStart))
    .where('date', '<=', admin.firestore.Timestamp.fromDate(marchEnd))
    .orderBy('date', 'asc')
    .get()

  console.log(`Found ${progressSnap.docs.length} entries in dailyProgress for March\n`)

  let totalMeals = 0
  let daysComplete = 0

  progressSnap.docs.forEach(doc => {
    const data = doc.data()
    const date = data.date.toDate()
    const meals = data.mealsConsumedCount || 0
    const allConsumed = data.allMealsConsumed || false

    totalMeals += meals
    if (allConsumed) daysComplete++

    console.log(`${date.toISOString().split('T')[0]} (${date.toLocaleDateString('en-US', { weekday: 'short' })}): ${meals}/5 meals, all: ${allConsumed}, docId: ${doc.id}`)
  })

  console.log(`\n📈 March Summary:`)
  console.log(`  Total meals: ${totalMeals}`)
  console.log(`  Days complete: ${daysComplete}`)
  console.log(`  Total days with data: ${progressSnap.docs.length}`)

  // Check for the last 14 days specifically
  console.log('\n📅 Last 14 days specifically (what web app should show):')
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const last14Snap = await db.collection('dailyProgress')
    .where('userId', '==', clientUid)
    .where('date', '>=', admin.firestore.Timestamp.fromDate(fourteenDaysAgo))
    .orderBy('date', 'asc')
    .get()

  console.log(`Found ${last14Snap.docs.length} entries in last 14 days\n`)

  let last14Meals = 0
  last14Snap.docs.forEach(doc => {
    const data = doc.data()
    const meals = data.mealsConsumedCount || 0
    last14Meals += meals
  })

  console.log(`Total meals in last 14 days: ${last14Meals}`)

  process.exit(0)
}

inspectAllMealData().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
