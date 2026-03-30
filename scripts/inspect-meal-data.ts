/**
 * Inspect meal consumption data for a user
 * Run: npx tsx scripts/inspect-meal-data.ts
 */

import admin from 'firebase-admin'

// Initialize Admin SDK for production
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const db = admin.firestore()

async function inspectMealData() {
  console.log('🔍 Inspecting meal data...\n')

  const clientUid = 'RT3PeY0SIMbXXeRjU362NrHr28l2'

  // Check dailyProgress collection
  console.log('📊 Checking dailyProgress collection:')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const progressSnap = await db.collection('dailyProgress')
    .where('userId', '==', clientUid)
    .where('date', '>=', admin.firestore.Timestamp.fromDate(cutoff))
    .orderBy('date', 'desc')
    .get()

  console.log(`Found ${progressSnap.docs.length} entries in dailyProgress\n`)

  progressSnap.docs.forEach(doc => {
    const data = doc.data()
    const date = data.date.toDate()
    console.log(`${date.toISOString().split('T')[0]}: ${data.mealsConsumedCount || 0}/5 meals, all: ${data.allMealsConsumed || false}`)
  })

  // Check diet data collection
  console.log('\n📊 Checking users/{uid}/diet/data/eaten:')

  // Get last 14 days of eaten meals
  const eatenPath = `users/${clientUid}/diet/data/eaten`
  const eatenSnap = await db.collection(eatenPath).get()

  console.log(`Found ${eatenSnap.docs.length} date entries in eaten tracking\n`)

  if (eatenSnap.docs.length > 0) {
    // Show a sample
    const sampleDoc = eatenSnap.docs[0]
    console.log(`Sample date key: ${sampleDoc.id}`)

    const mealsSnap = await db.collection(`${eatenPath}/${sampleDoc.id}/meals`).get()
    console.log(`  Has ${mealsSnap.docs.length} meal periods`)

    mealsSnap.docs.forEach(mealDoc => {
      console.log(`    - ${mealDoc.id}`)
    })
  }

  process.exit(0)
}

inspectMealData().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
