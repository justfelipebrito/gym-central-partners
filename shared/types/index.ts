// ─────────────────────────────────────────────────────────────────────────────
// Shared domain types — used by both frontend and Cloud Functions
// ─────────────────────────────────────────────────────────────────────────────

export type ProfessionalRole = 'pt' | 'nutritionist' | 'cook';
export type MembershipStatus = 'active' | 'inactive';

// ── users/{uid} ───────────────────────────────────────────────────────────────
// These are ADDED fields only — existing mobile-app fields must not be touched.
export interface UserProfessionalFields {
  accountType?: 'client' | 'professional';
  professionalId?: string;
  professionalRole?: ProfessionalRole;
  updatedAt?: FirestoreTimestamp;
}

// ── professionals/{professionalId} ───────────────────────────────────────────
export interface Professional {
  id: string; // doc id == professionalId
  ownerUid: string;
  role: ProfessionalRole;
  displayName: string;
  membershipStatus: MembershipStatus;
  createdAt: FirestoreTimestamp;
}

// ── clientRequests/{requestId} ────────────────────────────────────────────────
export type RequestType = 'training_plan' | 'nutrition_plan' | 'cook_service';
export type RequestStatus = 'open' | 'accepted' | 'closed';

export interface ClientRequest {
  id: string;
  clientUid: string;
  requestType: RequestType;
  status: RequestStatus;
  acceptedByProfessionalId?: string;
  acceptedByUid?: string;
  createdAt: FirestoreTimestamp;
  acceptedAt?: FirestoreTimestamp;
}

// ── professionals/{professionalId}/clientProfiles/{clientProfileId} ───────────
export type ClientProfileType = 'app_user' | 'external';
export type ClientProfileSource = 'accepted_request' | 'manual_added';

export interface ExternalProfile {
  name: string;
  email?: string;
  phone?: string;
}

export interface ClientProfile {
  id: string;
  type: ClientProfileType;
  appUserUid?: string; // required if type === 'app_user'
  externalProfile?: ExternalProfile; // required if type === 'external'
  source: ClientProfileSource;
  requestId?: string;
  linkedAt: FirestoreTimestamp;
  active: boolean;
}

// ── manualProgress/{entryId} ──────────────────────────────────────────────────
export interface ManualProgressEntry {
  id: string;
  timestamp: FirestoreTimestamp;
  workoutsCompletedDaysCount?: number;
  mealsConsumedCount?: number;
  notes?: string;
}

// ── plans/{planId} ────────────────────────────────────────────────────────────
export interface Plan {
  id: string;
  role: 'pt' | 'nutritionist';
  updatedAt: FirestoreTimestamp;
  // PT plan content
  content: TrainingPlanContent | DietPlanContent;
}

export interface TrainingPlanContent {
  weeklySchedule: WorkoutDay[];
  notes?: string;
}

export interface WorkoutDay {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string; // e.g. "8-12"
  notes?: string;
}

export interface DietPlanContent {
  dailyCalories?: number;
  meals: Meal[];
  notes?: string;
}

export interface Meal {
  name: string;
  time?: string;
  foods: FoodItem[];
}

export interface FoodItem {
  name: string;
  quantity: string;
  calories?: number;
}

// ── replacementRequests/{replacementId} ──────────────────────────────────────
export type ReplacementType = 'diet_replacement' | 'meal_replacement';
export type ReplacementStatus = 'open' | 'resolved';

export interface ReplacementRequest {
  id: string;
  type: ReplacementType;
  message: string;
  status: ReplacementStatus;
  createdAt: FirestoreTimestamp;
  resolvedAt?: FirestoreTimestamp;
}

// ── batches/{batchId} ─────────────────────────────────────────────────────────
export type BatchStatus = 'planned' | 'prepared' | 'ready' | 'picked_up' | 'delivered';
export type DeliveryType = 'pickup' | 'delivery';

export interface Batch {
  id: string;
  periodStart: FirestoreTimestamp;
  periodEnd: FirestoreTimestamp;
  pickupOrDelivery: DeliveryType;
  scheduledAt: FirestoreTimestamp;
  address?: string;
  status: BatchStatus;
  notes?: string;
  updatedAt: FirestoreTimestamp;
}

// ── Cloud Function call payloads ──────────────────────────────────────────────
export interface AcceptClientRequestPayload {
  requestId: string;
}

export interface CreateExternalClientProfilePayload {
  name: string;
  email?: string;
  phone?: string;
}

export interface LinkAppUserClientPayload {
  appUserUid: string;
}

export interface UpsertTrainingPlanPayload {
  clientProfileId: string;
  content: TrainingPlanContent;
}

export interface UpsertDietPlanPayload {
  clientProfileId: string;
  content: DietPlanContent;
}

export interface CreateOrUpdateBatchPayload {
  clientProfileId: string;
  batchId?: string; // if provided, update; otherwise create
  periodStart: string; // ISO string
  periodEnd: string;
  pickupOrDelivery: DeliveryType;
  scheduledAt: string;
  address?: string;
  status: BatchStatus;
  notes?: string;
}

export interface ResolveReplacementRequestPayload {
  clientProfileId: string;
  replacementId: string;
}

// ── Generic server response ───────────────────────────────────────────────────
export interface FunctionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Minimal Firestore Timestamp shape (works for both admin SDK and web SDK)
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
};
