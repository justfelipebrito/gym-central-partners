import { useEffect, useState } from 'react'
import { query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { clientProfilesCol } from '@/lib/firebase/collections'
import type { ClientProfile } from '@shared/types'

export interface EnrichedClientProfile extends ClientProfile {
  userData?: {
    name?: string
    email?: string
  }
}

export function useClientProfiles(professionalId: string | null) {
  const [profiles, setProfiles] = useState<EnrichedClientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!professionalId) {
      setProfiles([])
      setLoading(false)
      return
    }

    const q = query(
      clientProfilesCol(professionalId),
      where('active', '==', true),
      orderBy('linkedAt', 'desc'),
    )

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const profilesList = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()) as ClientProfile)

        // Fetch user data for app users
        const enrichedProfiles = await Promise.all(
          profilesList.map(async (profile) => {
            if (profile.type === 'app_user' && profile.appUserUid) {
              try {
                const userRef = doc(db, 'users', profile.appUserUid)
                const userSnap = await getDoc(userRef)
                if (userSnap.exists()) {
                  const userData = userSnap.data()
                  return {
                    ...profile,
                    userData: {
                      name: userData?.name,
                      email: userData?.email,
                    }
                  }
                }
              } catch (err) {
                console.error('Error fetching user data:', err)
              }
            }
            return profile
          })
        )

        setProfiles(enrichedProfiles)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsub
  }, [professionalId])

  return { profiles, loading, error }
}
