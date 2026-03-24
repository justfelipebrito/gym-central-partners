// Typed wrappers for all Cloud Functions callable from the frontend.
// Each function maps to a Cloud Function defined in /functions/src/index.ts

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/config'
import type {
  AcceptClientRequestPayload,
  CreateExternalClientProfilePayload,
  LinkAppUserClientPayload,
  UpsertTrainingPlanPayload,
  UpsertDietPlanPayload,
  CreateOrUpdateBatchPayload,
  ResolveReplacementRequestPayload,
  FunctionResult,
  ClientProfile,
} from '@shared/types'

// ─── helpers ─────────────────────────────────────────────────────────────────
function callable<TPayload, TResult>(name: string) {
  return async (payload: TPayload): Promise<TResult> => {
    const fn = httpsCallable<TPayload, TResult>(functions, name)
    const result = await fn(payload)
    return result.data
  }
}

// ─── exported API calls ───────────────────────────────────────────────────────
export const acceptClientRequest = callable<
  AcceptClientRequestPayload,
  FunctionResult<{ clientProfileId: string }>
>('acceptClientRequest')

export const createExternalClientProfile = callable<
  CreateExternalClientProfilePayload,
  FunctionResult<ClientProfile>
>('createExternalClientProfile')

export const linkAppUserClientProfile = callable<
  LinkAppUserClientPayload,
  FunctionResult<ClientProfile>
>('linkAppUserClientProfile')

export const upsertTrainingPlan = callable<
  UpsertTrainingPlanPayload,
  FunctionResult
>('upsertTrainingPlan')

export const upsertDietPlan = callable<
  UpsertDietPlanPayload,
  FunctionResult
>('upsertDietPlan')

export const createOrUpdateBatch = callable<
  CreateOrUpdateBatchPayload,
  FunctionResult<{ batchId: string }>
>('createOrUpdateBatch')

export const resolveReplacementRequest = callable<
  ResolveReplacementRequestPayload,
  FunctionResult
>('resolveReplacementRequest')
