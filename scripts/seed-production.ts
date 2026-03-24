/**
 * Seed script for Production Firebase
 * Run: npx tsx scripts/seed-production.ts
 *
 * Creates test partner accounts in production
 */

import admin from 'firebase-admin'

// Initialize Admin SDK for production
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const auth = admin.auth()
const db = admin.firestore()

async function createPartner(email: string, password: string, displayName: string, role: 'pt' | 'nutritionist' | 'cook') {
  try {
    // Check if user already exists
    let user
    try {
      user = await auth.getUserByEmail(email)
      console.log(`   ⚠ User ${email} already exists (uid: ${user.uid})`)
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Create new user
        user = await auth.createUser({
          email,
          password,
          displayName,
        })
        console.log(`   ✓ Created auth user: ${email} (uid: ${user.uid})`)
      } else {
        throw err
      }
    }

    // Create or update professional doc
    const profRef = db.doc(`professionals/${user.uid}`)
    const profSnap = await profRef.get()

    if (profSnap.exists) {
      console.log(`   ⚠ Professional doc already exists for ${email}`)
    } else {
      await profRef.set({
        ownerUid: user.uid,
        role,
        displayName,
        membershipStatus: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(`   ✓ Created professional doc for ${email}`)
    }

    return user.uid
  } catch (err) {
    console.error(`   ✗ Failed to create ${email}:`, err)
    throw err
  }
}

async function seed() {
  console.log('🌱 Creating test partner accounts in production...\n')

  // ── 1. Create a PT professional ──────────────────────────────────────────
  console.log('1. Creating PT professional (pt@test.com / password123)...')
  await createPartner('pt@test.com', 'password123', 'Alex Trainer', 'pt')

  // ── 2. Create a Nutritionist professional ─────────────────────────────────
  console.log('\n2. Creating Nutritionist (nutritionist@test.com / password123)...')
  await createPartner('nutritionist@test.com', 'password123', 'Maria Nutrição', 'nutritionist')

  // ── 3. Create a Cook professional ────────────────────────────────────────
  console.log('\n3. Creating Cook (cook@test.com / password123)...')
  await createPartner('cook@test.com', 'password123', 'Carlos Chef', 'cook')

  console.log('\n✅ Seed complete!\n')
  console.log('Test accounts:')
  console.log('  PT:           pt@test.com / password123')
  console.log('  Nutritionist: nutritionist@test.com / password123')
  console.log('  Cook:         cook@test.com / password123')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
