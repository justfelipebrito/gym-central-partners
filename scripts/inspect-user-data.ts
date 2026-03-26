/**
 * Inspect user data structure
 * Run: npx tsx scripts/inspect-user-data.ts
 */

import admin from 'firebase-admin'

admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const db = admin.firestore()
const userId = 'RT3PeY0SIMbXXeRjU362NrHr28l2'

async function inspect() {
  console.log('🔍 Inspecting user data...\n')

  // 1. User profile
  console.log('1. User Profile:')
  const userDoc = await db.doc(`users/${userId}`).get()
  if (userDoc.exists) {
    const data = userDoc.data()
    console.log('   Weight:', data?.weight)
    console.log('   Sex:', data?.sex)
    console.log('   Height:', data?.height)
    console.log('   Full data:', JSON.stringify(data, null, 2))
  } else {
    console.log('   ❌ User not found')
  }

  // 2. Training Schedule
  console.log('\n2. Training Schedule:')
  const scheduleDoc = await db.doc(`users/${userId}/trainingData/schedule`).get()
  if (scheduleDoc.exists) {
    console.log('   Weekly schedule:', JSON.stringify(scheduleDoc.data(), null, 2))
  } else {
    console.log('   ❌ No schedule found')
  }

  // 2b. Training Groups
  console.log('\n2b. Training Groups:')
  const trainingGroupsSnap = await db.collection(`users/${userId}/trainingGroups`).limit(5).get()
  console.log(`   Found ${trainingGroupsSnap.size} training groups`)
  trainingGroupsSnap.docs.forEach((doc, idx) => {
    console.log(`   [${idx + 1}] ${doc.id}:`, JSON.stringify(doc.data(), null, 2))
  })

  // 3. Daily Progress - sample recent dates
  console.log('\n3. Daily Progress (last 14 days):')
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    const docId = `${userId}_${dateStr}`
    const dailyDoc = await db.doc(`dailyProgress/${docId}`).get()
    if (dailyDoc.exists) {
      const data = dailyDoc.data()
      console.log(`   [${dateStr}]: didTrain=${data?.didTrain}, minutes=${data?.trainingDurationMinutes}, trainingGroup=${data?.trainingGroup || 'N/A'}`)
      if (i < 3) {
        console.log(`      Full: ${JSON.stringify(data, null, 2)}`)
      }
    }
  }

  process.exit(0)
}

inspect().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
