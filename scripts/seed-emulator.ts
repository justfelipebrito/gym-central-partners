/**
 * Seed script for Firebase Emulator using Admin SDK
 * Run: npx tsx scripts/seed-emulator.ts
 *
 * Prerequisites: emulators must be running (`npm run emulators:fresh`)
 */

import admin from 'firebase-admin'

// Initialize Admin SDK for emulator
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081'
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'

const auth = admin.auth()
const db = admin.firestore()

async function seed() {
  console.log('🌱 Seeding emulator data...\n')

  // ── 1. Create a PT professional ──────────────────────────────────────────
  console.log('1. Creating PT professional (pt@test.com / password123)...')
  const ptUser = await auth.createUser({
    email: 'pt@test.com',
    password: 'password123',
    displayName: 'Alex Trainer',
  })
  const ptUid = ptUser.uid

  await db.doc(`professionals/${ptUid}`).set({
    ownerUid: ptUid,
    role: 'pt',
    displayName: 'Alex Trainer',
    membershipStatus: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  console.log(`   ✓ PT uid: ${ptUid}`)

  // ── 2. Create a Nutritionist professional ─────────────────────────────────
  console.log('2. Creating Nutritionist (nutritionist@test.com / password123)...')
  const nutUser = await auth.createUser({
    email: 'nutritionist@test.com',
    password: 'password123',
    displayName: 'Maria Nutrição',
  })
  const nutUid = nutUser.uid

  await db.doc(`professionals/${nutUid}`).set({
    ownerUid: nutUid,
    role: 'nutritionist',
    displayName: 'Maria Nutrição',
    membershipStatus: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  console.log(`   ✓ Nutritionist uid: ${nutUid}`)

  // ── 3. Create a Cook professional ────────────────────────────────────────
  console.log('3. Creating Cook (cook@test.com / password123)...')
  const cookUser = await auth.createUser({
    email: 'cook@test.com',
    password: 'password123',
    displayName: 'Carlos Chef',
  })
  const cookUid = cookUser.uid

  await db.doc(`professionals/${cookUid}`).set({
    ownerUid: cookUid,
    role: 'cook',
    displayName: 'Carlos Chef',
    membershipStatus: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  console.log(`   ✓ Cook uid: ${cookUid}`)

  // ── 4. Create a mobile app client user ───────────────────────────────────
  console.log('4. Creating mobile app client (client@test.com / password123)...')
  const clientUser = await auth.createUser({
    email: 'client@test.com',
    password: 'password123',
    displayName: 'João Cliente',
  })
  const clientUid = clientUser.uid

  await db.doc(`users/${clientUid}`).set({
    displayName: 'João Cliente',
    email: 'client@test.com',
    accountType: 'client',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  console.log(`   ✓ Client uid: ${clientUid}`)

  // ── 5. Create open client requests ───────────────────────────────────────
  console.log('5. Creating open client requests...')

  const trainingReq = await db.collection('clientRequests').add({
    clientUid,
    requestType: 'training_plan',
    status: 'open',
    acceptedByProfessionalId: null,
    acceptedByUid: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    acceptedAt: null,
  })
  console.log(`   ✓ Training request: ${trainingReq.id}`)

  const nutritionReq = await db.collection('clientRequests').add({
    clientUid,
    requestType: 'nutrition_plan',
    status: 'open',
    acceptedByProfessionalId: null,
    acceptedByUid: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    acceptedAt: null,
  })
  console.log(`   ✓ Nutrition request: ${nutritionReq.id}`)

  const cookReq = await db.collection('clientRequests').add({
    clientUid,
    requestType: 'cook_service',
    status: 'open',
    acceptedByProfessionalId: null,
    acceptedByUid: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    acceptedAt: null,
  })
  console.log(`   ✓ Cook request: ${cookReq.id}`)

  // ── 6. Create an external client profile for PT ───────────────────────────
  console.log('6. Creating external client profile for PT...')
  const extProfile = await db
    .collection(`professionals/${ptUid}/clientProfiles`)
    .add({
      type: 'external',
      appUserUid: null,
      externalProfile: {
        name: 'Carlos Silva',
        email: 'carlos@example.com',
        phone: '+55 11 99999-0000'
      },
      source: 'manual_added',
      requestId: null,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    })
  console.log(`   ✓ External profile: ${extProfile.id}`)

  // ── 7. Add manual progress to external client ─────────────────────────────
  console.log('7. Adding manual progress entry...')
  await db
    .collection(`professionals/${ptUid}/clientProfiles/${extProfile.id}/manualProgress`)
    .add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      workoutsCompletedDaysCount: 4,
      mealsConsumedCount: null,
      notes: 'Great week, hit all targets.',
    })
  console.log('   ✓ Manual progress entry added')

  // ── 8. Create a training plan for PT external client ─────────────────────
  console.log('8. Creating training plan for PT external client...')
  await db
    .collection(`professionals/${ptUid}/clientProfiles/${extProfile.id}/plans`)
    .add({
      role: 'pt',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      content: {
        weeklySchedule: [
          {
            day: 'mon',
            exercises: [
              { name: 'Squat', sets: 4, reps: '8-10' },
              { name: 'Leg Press', sets: 3, reps: '12' },
            ],
          },
          {
            day: 'wed',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8-10' },
              { name: 'Pull-ups', sets: 3, reps: '6-8' },
            ],
          },
          {
            day: 'fri',
            exercises: [
              { name: 'Deadlift', sets: 4, reps: '5' },
              { name: 'Romanian Deadlift', sets: 3, reps: '10' },
            ],
          },
        ],
        notes: 'Focus on progressive overload each week.',
      },
    })
  console.log('   ✓ Training plan created')

  // ── 9. Create an app_user client profile for Nutritionist ────────────────
  console.log('9. Creating app_user client profile for Nutritionist...')
  const nutClient = await db
    .collection(`professionals/${nutUid}/clientProfiles`)
    .add({
      type: 'app_user',
      appUserUid: clientUid,
      externalProfile: null,
      source: 'manual_added',
      requestId: null,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    })
  console.log(`   ✓ App user profile: ${nutClient.id}`)

  // ── 10. Create a diet plan ─────────────────────────────────────────────
  console.log('10. Creating diet plan for Nutritionist...')
  await db
    .collection(`professionals/${nutUid}/clientProfiles/${nutClient.id}/plans`)
    .add({
      role: 'nutritionist',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      content: {
        dailyCalories: 2200,
        meals: [
          {
            name: 'Breakfast',
            time: '07:30',
            foods: [
              { name: 'Oats', quantity: '80g', calories: 290 },
              { name: 'Banana', quantity: '1 unit', calories: 89 },
            ],
          },
          {
            name: 'Lunch',
            time: '12:30',
            foods: [
              { name: 'Grilled Chicken', quantity: '150g', calories: 248 },
              { name: 'Brown Rice', quantity: '100g', calories: 370 },
              { name: 'Broccoli', quantity: '100g', calories: 34 },
            ],
          },
        ],
        notes: 'High protein, moderate carbs. Adjust rice portion if feeling heavy.',
      },
    })
  console.log('   ✓ Diet plan created')

  // ── 11. Create a replacement request ──────────────────────────────────────
  console.log('11. Creating replacement request...')
  await db
    .collection(`professionals/${nutUid}/clientProfiles/${nutClient.id}/replacementRequests`)
    .add({
      type: 'meal_replacement',
      message: 'Can I replace brown rice with sweet potato?',
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedAt: null,
    })
  console.log('   ✓ Replacement request created')

  // ── 12. Create an app_user client profile for Cook ───────────────────────
  console.log('12. Creating app_user client profile for Cook...')
  const cookClient = await db
    .collection(`professionals/${cookUid}/clientProfiles`)
    .add({
      type: 'app_user',
      appUserUid: clientUid,
      externalProfile: null,
      source: 'manual_added',
      requestId: null,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    })
  console.log(`   ✓ Cook client profile: ${cookClient.id}`)

  // ── 13. Create a batch ────────────────────────────────────────────────────
  console.log('13. Creating a batch for Cook...')
  await db
    .collection(`professionals/${cookUid}/clientProfiles/${cookClient.id}/batches`)
    .add({
      periodStart: admin.firestore.Timestamp.fromDate(new Date('2026-02-17')),
      periodEnd: admin.firestore.Timestamp.fromDate(new Date('2026-02-23')),
      pickupOrDelivery: 'delivery',
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date('2026-02-17T10:00:00')),
      address: 'Rua das Flores, 123 - São Paulo, SP',
      status: 'planned',
      notes: 'Buzz apt 42 upon arrival.',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  console.log('   ✓ Batch created')

  console.log('\n✅ Seed complete!\n')
  console.log('Test accounts:')
  console.log('  PT:           pt@test.com / password123')
  console.log('  Nutritionist: nutritionist@test.com / password123')
  console.log('  Cook:         cook@test.com / password123')
  console.log('  Client:       client@test.com / password123')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
