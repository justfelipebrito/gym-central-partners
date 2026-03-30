/**
 * Link the same test client to the Cook account
 * Run: npx tsx scripts/link-cook-client.ts
 */

import admin from 'firebase-admin'

// Initialize Admin SDK for production
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const db = admin.firestore()

async function linkClientToCook() {
  console.log('🔗 Linking test client to Cook...\n')

  // Find Cook account
  const profSnap = await db.collection('professionals')
    .where('role', '==', 'cook')
    .limit(1)
    .get()

  if (profSnap.empty) {
    console.error('❌ No Cook account found')
    process.exit(1)
  }

  const cookDoc = profSnap.docs[0]
  const cookId = cookDoc.id
  console.log(`✓ Found Cook: ${cookId}`)

  // Use the same client UID as PT
  const clientUid = 'RT3PeY0SIMbXXeRjU362NrHr28l2'

  // Check if user exists
  const userDoc = await db.doc(`users/${clientUid}`).get()
  if (!userDoc.exists) {
    console.error(`❌ User ${clientUid} not found`)
    process.exit(1)
  }

  console.log(`✓ Found user: ${clientUid}`)

  // Check if client is already linked
  const existingProfile = await db.collection(`professionals/${cookId}/clientProfiles`)
    .where('appUserUid', '==', clientUid)
    .limit(1)
    .get()

  if (!existingProfile.empty) {
    console.log('⚠️  Client already linked to Cook')
    console.log(`View at: /clients/${existingProfile.docs[0].id}`)
    process.exit(0)
  }

  // Create client profile for Cook
  const profileRef = await db.collection(`professionals/${cookId}/clientProfiles`).add({
    type: 'app_user',
    appUserUid: clientUid,
    externalProfile: null,
    source: 'manual_added',
    requestId: null,
    linkedAt: admin.firestore.FieldValue.serverTimestamp(),
    active: true,
  })

  console.log(`✓ Created client profile: ${profileRef.id}`)
  console.log('\n✅ Client linked to Cook!\n')
  console.log(`View at: /clients/${profileRef.id}`)

  process.exit(0)
}

linkClientToCook().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
