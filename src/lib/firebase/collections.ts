// Centralised Firestore collection/document path helpers
// Change paths here if the mobile app schema changes.

import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore'
import { db } from './config'
import type {
  Professional,
  ClientRequest,
  ClientProfile,
  ManualProgressEntry,
  Plan,
  ReplacementRequest,
  Batch,
} from '@shared/types'

// ── Top-level ─────────────────────────────────────────────────────────────────
export const professionalsCol = collection(
  db,
  'professionals',
) as CollectionReference<Professional>

export const clientRequestsCol = collection(
  db,
  'clientRequests',
) as CollectionReference<ClientRequest>

export const professionalDoc = (professionalId: string) =>
  doc(db, 'professionals', professionalId) as DocumentReference<Professional>

// ── Subcollections under a professional ──────────────────────────────────────
export const clientProfilesCol = (professionalId: string) =>
  collection(
    db,
    'professionals',
    professionalId,
    'clientProfiles',
  ) as CollectionReference<ClientProfile>

export const clientProfileDoc = (
  professionalId: string,
  clientProfileId: string,
) =>
  doc(
    db,
    'professionals',
    professionalId,
    'clientProfiles',
    clientProfileId,
  ) as DocumentReference<ClientProfile>

// ── Subcollections under a client profile ─────────────────────────────────────
export const manualProgressCol = (
  professionalId: string,
  clientProfileId: string,
) =>
  collection(
    db,
    'professionals',
    professionalId,
    'clientProfiles',
    clientProfileId,
    'manualProgress',
  ) as CollectionReference<ManualProgressEntry>

export const plansCol = (professionalId: string, clientProfileId: string) =>
  collection(
    db,
    'professionals',
    professionalId,
    'clientProfiles',
    clientProfileId,
    'plans',
  ) as CollectionReference<Plan>

export const replacementRequestsCol = (
  professionalId: string,
  clientProfileId: string,
) =>
  collection(
    db,
    'professionals',
    professionalId,
    'clientProfiles',
    clientProfileId,
    'replacementRequests',
  ) as CollectionReference<ReplacementRequest>

export const batchesCol = (professionalId: string, clientProfileId: string) =>
  collection(
    db,
    'professionals',
    professionalId,
    'clientProfiles',
    clientProfileId,
    'batches',
  ) as CollectionReference<Batch>
