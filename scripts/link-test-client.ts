/**
 * Link a test client to the PT account
 * Run: npx tsx scripts/link-test-client.ts
 */

import admin from 'firebase-admin'

// Initialize Admin SDK for production
admin.initializeApp({
  projectId: 'gym-central-7d949',
})

const db = admin.firestore()

async function linkClient() {
  console.log('🔗 Linking test client to PT...\n')

  // Find PT account
  const profSnap = await db.collection('professionals')
    .where('role', '==', 'pt')
    .limit(1)
    .get()

  if (profSnap.empty) {
    console.error('❌ No PT account found')
    process.exit(1)
  }

  const ptDoc = profSnap.docs[0]
  const ptId = ptDoc.id
  console.log(`✓ Found PT: ${ptId}`)

  const clientUid = 'RT3PeY0SIMbXXeRjU362NrHr28l2'

  // Check if user exists
  const userDoc = await db.doc(`users/${clientUid}`).get()
  if (!userDoc.exists) {
    console.error(`❌ User ${clientUid} not found`)
    process.exit(1)
  }

  console.log(`✓ Found user: ${clientUid}`)

  // Create client profile
  const profileRef = await db.collection(`professionals/${ptId}/clientProfiles`).add({
    type: 'app_user',
    appUserUid: clientUid,
    externalProfile: null,
    source: 'manual_added',
    requestId: null,
    linkedAt: admin.firestore.FieldValue.serverTimestamp(),
    active: true,
  })

  console.log(`✓ Created client profile: ${profileRef.id}`)
  console.log('\n✅ Client linked to PT!\n')
  console.log(`View at: /clients/${profileRef.id}`)

  process.exit(0)
}

linkClient().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
