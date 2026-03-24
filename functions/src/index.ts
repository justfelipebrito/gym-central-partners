import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { CallableRequest } from 'firebase-functions/v2/https'
import { onCall } from 'firebase-functions/v2/https'

// ── Types (inline to avoid path alias issues in Functions build) ──────────────
type ProfessionalRole = 'pt' | 'nutritionist' | 'cook'
type BatchStatus = 'planned' | 'prepared' | 'ready' | 'picked_up' | 'delivered'
type DeliveryType = 'pickup' | 'delivery'

interface Professional {
  ownerUid: string
  role: ProfessionalRole
  displayName: string
  membershipStatus: 'active' | 'inactive'
  createdAt: admin.firestore.Timestamp
}

interface ClientRequest {
  clientUid: string
  requestType: string
  status: 'open' | 'accepted' | 'closed'
  acceptedByProfessionalId?: string
  acceptedByUid?: string
  createdAt: admin.firestore.Timestamp
  acceptedAt?: admin.firestore.Timestamp
}

// ── Admin SDK init ────────────────────────────────────────────────────────────
// Uses applicationDefault() — works in Cloud Functions runtime and with
// GOOGLE_APPLICATION_CREDENTIALS env var locally (matches gym-central-server pattern)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
})
const db = admin.firestore()

// ── Helper: get calling professional ─────────────────────────────────────────
async function getCallerProfessional(
  uid: string,
): Promise<{ id: string; data: Professional } | null> {
  // professionalId == uid (MVP convention)
  const snap = await db.collection('professionals').doc(uid).get()
  if (!snap.exists) return null
  return { id: snap.id, data: snap.data() as Professional }
}

function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in.',
    )
  }
  return request.auth.uid
}

function requireActiveMembership(prof: Professional) {
  if (prof.membershipStatus !== 'active') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Membership is inactive.',
    )
  }
}

function requireRole(prof: Professional, ...roles: ProfessionalRole[]) {
  if (!roles.includes(prof.role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      `This action requires role: ${roles.join(' or ')}.`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// acceptClientRequest
// Atomically accepts an open client request for the calling professional.
// First professional to call wins.
// ─────────────────────────────────────────────────────────────────────────────
export const acceptClientRequest = onCall(
  { region: 'australia-southeast1' },
  async (request: CallableRequest<{ requestId: string }>) => {
    const uid = requireAuth(request)
    const { requestId } = request.data

    if (!requestId) {
      throw new functions.https.HttpsError('invalid-argument', 'requestId is required.')
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)

    const requestRef = db.collection('clientRequests').doc(requestId)

    // Map role to valid request types
    const roleRequestMap: Record<ProfessionalRole, string> = {
      pt: 'training_plan',
      nutritionist: 'nutrition_plan',
      cook: 'cook_service',
    }

    let clientProfileId: string | undefined

    await db.runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef)
      if (!requestSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Client request not found.')
      }

      const requestData = requestSnap.data() as ClientRequest

      if (requestData.status !== 'open') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This request is no longer open.',
        )
      }

      // Verify the request type matches the professional's role
      const expectedType = roleRequestMap[prof.role]
      if (requestData.requestType !== expectedType) {
        throw new functions.https.HttpsError(
          'permission-denied',
          `This request type (${requestData.requestType}) does not match your role (${prof.role}).`,
        )
      }

      // Mark request as accepted
      tx.update(requestRef, {
        status: 'accepted',
        acceptedByProfessionalId: professionalId,
        acceptedByUid: uid,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Create client profile under professional
      const profileRef = db
        .collection('professionals')
        .doc(professionalId)
        .collection('clientProfiles')
        .doc() // auto-id

      clientProfileId = profileRef.id

      tx.set(profileRef, {
        type: 'app_user',
        appUserUid: requestData.clientUid,
        externalProfile: null,
        source: 'accepted_request',
        requestId,
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true,
      })
    })

    return { success: true, data: { clientProfileId } }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// createExternalClientProfile
// ─────────────────────────────────────────────────────────────────────────────
export const createExternalClientProfile = onCall(
  { region: 'australia-southeast1' },
  async (
    request: CallableRequest<{
      name: string
      email?: string
      phone?: string
    }>,
  ) => {
    const uid = requireAuth(request)
    const { name, email, phone } = request.data

    if (!name?.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Client name is required.')
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)

    const profileRef = db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc()

    const profileData = {
      type: 'external',
      appUserUid: null,
      externalProfile: {
        name: name.trim(),
        email: email?.trim() ?? null,
        phone: phone?.trim() ?? null,
      },
      source: 'manual_added',
      requestId: null,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    }

    await profileRef.set(profileData)

    return { success: true, data: { id: profileRef.id, ...profileData } }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// linkAppUserClientProfile
// ─────────────────────────────────────────────────────────────────────────────
export const linkAppUserClientProfile = onCall(
  { region: 'australia-southeast1' },
  async (request: CallableRequest<{ appUserUid: string }>) => {
    const uid = requireAuth(request)
    const { appUserUid } = request.data

    if (!appUserUid?.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'appUserUid is required.')
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)

    // Verify the app user exists
    const appUserSnap = await db.collection('users').doc(appUserUid.trim()).get()
    if (!appUserSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'App user not found.')
    }

    const profileRef = db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc()

    const profileData = {
      type: 'app_user',
      appUserUid: appUserUid.trim(),
      externalProfile: null,
      source: 'manual_added',
      requestId: null,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    }

    await profileRef.set(profileData)

    return { success: true, data: { id: profileRef.id, ...profileData } }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// upsertTrainingPlan (PT only)
// ─────────────────────────────────────────────────────────────────────────────
export const upsertTrainingPlan = onCall(
  { region: 'australia-southeast1' },
  async (
    request: CallableRequest<{
      clientProfileId: string
      content: unknown
    }>,
  ) => {
    const uid = requireAuth(request)
    const { clientProfileId, content } = request.data

    if (!clientProfileId || !content) {
      throw new functions.https.HttpsError('invalid-argument', 'clientProfileId and content are required.')
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)
    requireRole(prof, 'pt')

    // Verify ownership of clientProfile
    const profileSnap = await db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .get()

    if (!profileSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Client profile not found.')
    }

    // Upsert plan — find existing pt plan or create new
    const plansCol = db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .collection('plans')

    const existing = await plansCol.where('role', '==', 'pt').limit(1).get()

    if (!existing.empty) {
      await existing.docs[0].ref.update({
        content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      await plansCol.add({
        role: 'pt',
        content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return { success: true }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// upsertDietPlan (Nutritionist only)
// ─────────────────────────────────────────────────────────────────────────────
export const upsertDietPlan = onCall(
  { region: 'australia-southeast1' },
  async (
    request: CallableRequest<{
      clientProfileId: string
      content: unknown
    }>,
  ) => {
    const uid = requireAuth(request)
    const { clientProfileId, content } = request.data

    if (!clientProfileId || !content) {
      throw new functions.https.HttpsError('invalid-argument', 'clientProfileId and content are required.')
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)
    requireRole(prof, 'nutritionist')

    const profileSnap = await db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .get()

    if (!profileSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Client profile not found.')
    }

    const plansCol = db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .collection('plans')

    const existing = await plansCol.where('role', '==', 'nutritionist').limit(1).get()

    if (!existing.empty) {
      await existing.docs[0].ref.update({
        content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      await plansCol.add({
        role: 'nutritionist',
        content,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return { success: true }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// createOrUpdateBatch (Cook only)
// ─────────────────────────────────────────────────────────────────────────────
export const createOrUpdateBatch = onCall(
  { region: 'australia-southeast1' },
  async (
    request: CallableRequest<{
      clientProfileId: string
      batchId?: string
      periodStart: string
      periodEnd: string
      pickupOrDelivery: DeliveryType
      scheduledAt: string
      address?: string
      status: BatchStatus
      notes?: string
    }>,
  ) => {
    const uid = requireAuth(request)
    const {
      clientProfileId,
      batchId,
      periodStart,
      periodEnd,
      pickupOrDelivery,
      scheduledAt,
      address,
      status,
      notes,
    } = request.data

    if (!clientProfileId) {
      throw new functions.https.HttpsError('invalid-argument', 'clientProfileId is required.')
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)
    requireRole(prof, 'cook')

    const profileSnap = await db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .get()

    if (!profileSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Client profile not found.')
    }

    const batchesCol = db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .collection('batches')

    const batchPayload = {
      periodStart: admin.firestore.Timestamp.fromDate(new Date(periodStart)),
      periodEnd: admin.firestore.Timestamp.fromDate(new Date(periodEnd)),
      pickupOrDelivery,
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date(scheduledAt)),
      address: address ?? null,
      status,
      notes: notes ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    let resolvedBatchId: string

    if (batchId) {
      await batchesCol.doc(batchId).set(batchPayload, { merge: true })
      resolvedBatchId = batchId
    } else {
      const ref = await batchesCol.add(batchPayload)
      resolvedBatchId = ref.id
    }

    return { success: true, data: { batchId: resolvedBatchId } }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// resolveReplacementRequest (Nutritionist only)
// ─────────────────────────────────────────────────────────────────────────────
export const resolveReplacementRequest = onCall(
  { region: 'australia-southeast1' },
  async (
    request: CallableRequest<{
      clientProfileId: string
      replacementId: string
    }>,
  ) => {
    const uid = requireAuth(request)
    const { clientProfileId, replacementId } = request.data

    if (!clientProfileId || !replacementId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'clientProfileId and replacementId are required.',
      )
    }

    const profResult = await getCallerProfessional(uid)
    if (!profResult) {
      throw new functions.https.HttpsError('not-found', 'Professional profile not found.')
    }
    const { id: professionalId, data: prof } = profResult
    requireActiveMembership(prof)
    requireRole(prof, 'nutritionist')

    const replacementRef = db
      .collection('professionals')
      .doc(professionalId)
      .collection('clientProfiles')
      .doc(clientProfileId)
      .collection('replacementRequests')
      .doc(replacementId)

    const snap = await replacementRef.get()
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Replacement request not found.')
    }

    await replacementRef.update({
      status: 'resolved',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  },
)
