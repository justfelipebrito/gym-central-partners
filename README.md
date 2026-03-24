# Gym Central Partners — Web Dashboard

Professional membership dashboard for Personal Trainers, Nutritionists, and Cooks.
Hosted at **partners.gymcentral.club**.

---

## Project Structure

```
gymcentral-web-partners/
├── src/
│   ├── pages/               # Route-level React pages
│   ├── components/
│   │   ├── layout/          # AppLayout (sidebar + outlet)
│   │   └── ui/              # Shared UI: Button, Card, FormField, RouteGuard
│   ├── contexts/            # AuthContext (Firebase Auth + professional doc)
│   ├── hooks/               # useClientProfiles, useOpenRequests, useProfessional
│   ├── lib/
│   │   ├── firebase/        # config.ts (init + emulator connect), collections.ts
│   │   ├── api/             # functions.ts (typed Cloud Function callers)
│   │   └── progressAdapters/ # subscribeWeeklyWorkoutProgress, subscribeMealLogs
│   ├── App.tsx              # Router + route guards
│   └── main.tsx
├── functions/src/index.ts   # All Cloud Functions (TypeScript)
├── shared/types/index.ts    # Domain types shared between frontend and functions
├── firestore.rules          # Security rules
├── firestore.indexes.json   # Composite indexes
├── firebase.json            # Hosting + emulator config
└── scripts/seed-emulator.ts # Emulator seed script
```

---

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (same one used by the mobile app)

---

## Local Setup

### 1. Install dependencies

```bash
# Frontend
npm install

# Cloud Functions
cd functions && npm install && cd ..
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase project values from the Firebase Console:
**Project Settings → Your apps → Web app → Config**

For local emulator development, keep `VITE_USE_EMULATORS=true`.

### 3. Set the hosting target

The `.firebaserc` is already configured for `gym-central-7d949`. Register the partners hosting site:
```bash
firebase target:apply hosting partners YOUR_PARTNERS_SITE_ID
```
Replace `YOUR_PARTNERS_SITE_ID` with the site name you create in Firebase Console → Hosting → Add site (e.g. `gymcentral-partners`).

---

## Running with Firebase Emulators

### Architecture: shared emulator with `gym-central-server`

The partners app shares the **same Firebase project and same Firestore emulator** as the existing `gym-central-server`.
The recommended dev flow is:

**Terminal 1 — start the server emulators** (Firestore + Auth + existing functions)
```bash
cd /path/to/gym-central-server
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```
This starts:
- Firestore on **:8080**
- Auth on **:9099**
- Existing functions on **:5001**
- Emulator UI on **:4000**

**Terminal 2 — start the partners functions only** (adds partners functions to the same emulator)
```bash
cd /path/to/gymcentral-web-partners
firebase emulators:start --only functions
```

**Terminal 3 — start the partners frontend**
```bash
cd /path/to/gymcentral-web-partners
npm run dev
```

Open: http://localhost:5173
Emulator UI: http://localhost:4000

### Standalone mode (partners app only, no server)

If you want to run the partners app in isolation (without the server's functions):
```bash
# Terminal 1
npm run emulators

# Terminal 2
npm run dev
```

Note: in standalone mode, `dailyProgress` data won't exist — app_user progress panels will show empty.

---

## Seeding Test Data

With emulators running, in a separate terminal:

```bash
# Install seed script dependencies (one-time)
npm install -D ts-node @types/node

# Run the seed
npx ts-node scripts/seed-emulator.ts
```

This creates:

| Account          | Email                      | Password    | Role         |
|------------------|----------------------------|-------------|--------------|
| PT               | pt@test.com                | password123 | Personal Trainer |
| Nutritionist     | nutritionist@test.com      | password123 | Nutritionist |
| Cook             | cook@test.com              | password123 | Cook         |
| Mobile Client    | client@test.com            | password123 | App user     |

And seeds:
- 3 open `clientRequests` (one per role type)
- 1 external client profile under PT
- 1 manual progress entry
- 1 training plan (PT)
- 1 app_user client profile under Nutritionist
- 1 diet plan (Nutritionist)
- 1 open replacement request
- 1 app_user client profile under Cook
- 1 batch logistics entry

---

## Manual Test Flow

### A) Accept a client request
1. Log in as `pt@test.com`
2. Go to **Requests** — you'll see the open training plan request
3. Click **Accept** — this calls `acceptClientRequest` Cloud Function
4. The request is atomically accepted; a new client profile appears in **Dashboard → My Clients**

### B) Add an external client
1. Log in as any professional
2. Go to **Settings → Add External Client**
3. Fill in name + optional email/phone → **Add Client**
4. New external profile appears in **Dashboard**

### C) View and edit a plan (PT / Nutritionist)
1. Log in as PT or Nutritionist
2. Go to **My Clients** → click a client → **View/Edit Plan**
3. Edit the JSON in the editor → **Save Plan**

### D) Create batch logistics (Cook)
1. Log in as `cook@test.com`
2. Go to a client profile → **Logistics** (or direct `/clients/:id/logistics`)
3. Click **+ New Batch** → fill the form → **Save Batch**
4. The batch appears in the list with live status

### E) Resolve a replacement request (Nutritionist)
1. Log in as `nutritionist@test.com`
2. Go to the app_user client profile
3. Scroll to **Replacement Requests** → click **Mark Resolved**

---

## Progress Data — Mobile App Schema (Confirmed)

The progress adapter in `src/lib/progressAdapters/index.ts` reads from the **real** schema confirmed from the iOS app:

```
dailyProgress/{docId}
  userId                string    — filtered by appUserUid
  date                  Timestamp — normalized to 00:00:00 of that day
  didTrain              boolean   — true if the user completed a training session
  trainingDurationMinutes  number
  allMealsConsumed      boolean   — true if all 5 meal periods were consumed
  mealsConsumedCount    number    — 0 to 5
```

- **PT view** → groups days by ISO week, counts `didTrain === true` per week
- **Nutritionist / Cook view** → reads `mealsConsumedCount` per day for last 30 days

If the schema changes, update the field mappings inside `subscribeDailyProgress` in `src/lib/progressAdapters/index.ts`.

---

## Building Functions

```bash
cd functions
npm run build          # compile TypeScript → lib/
npm run build:watch    # watch mode for development
```

---

## Deploying to Production

### Deploy everything
```bash
npm run deploy
# equivalent to: npm run build && firebase deploy
```

### Deploy only functions
```bash
firebase deploy --only functions
```

> **Note:** The partners functions deploy into the same Firebase project (`gym-central-7d949`) as `gym-central-server`, using a separate codebase (`gymcentral-partners` in `firebase.json`). They coexist safely — different function names, same region (`australia-southeast1`).

### Deploy only hosting
```bash
npm run build
firebase deploy --only hosting:partners
```

### Deploy only Firestore rules
```bash
firebase deploy --only firestore:rules
```

---

## Membership Gating

The MVP sets all new professionals to `membershipStatus: "active"` by default.

To add Stripe later:
1. Create a Stripe webhook Cloud Function
2. Update `professionals/{professionalId}.membershipStatus` to `"inactive"` on failed payment
3. Update it back to `"active"` on successful payment/subscription renewal
4. The frontend `RouteGuard` and all Cloud Functions already check this field

---

## Firestore Data Model

See `shared/types/index.ts` for the authoritative type definitions.

Key collections:
- `users/{uid}` — reused from mobile app; only add `accountType`, `professionalId`, `professionalRole`, `updatedAt`
- `professionals/{professionalId}` — professional profile (professionalId == ownerUid for MVP)
- `clientRequests/{requestId}` — open requests from mobile app users
- `professionals/{professionalId}/clientProfiles/{clientProfileId}` — per-professional client list
  - `/manualProgress/{entryId}` — manual tracking for external clients
  - `/plans/{planId}` — training or diet plans
  - `/replacementRequests/{replacementId}` — diet/meal replacement requests (nutritionist)
  - `/batches/{batchId}` — cook logistics

---

## Security Model

- All privileged writes (accept request, create profiles, upsert plans, manage batches) go through **Cloud Functions** which verify auth, membership, and role server-side.
- Firestore rules prevent direct client writes to sensitive paths.
- Professionals can only read/write their own subcollections.
- Role enforcement:
  - PT → can write `plans` where `role="pt"`
  - Nutritionist → can write `plans` where `role="nutritionist"`, can resolve `replacementRequests`
  - Cook → cannot write `plans` at all; can only write to `batches`
