import { useEffect, useState } from 'react'
import { query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { clientProfilesCol } from '@/lib/firebase/collections'
import type { ClientProfile } from '@shared/types'

export function useClientProfiles(professionalId: string | null) {
  const [profiles, setProfiles] = useState<ClientProfile[]>([])
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
      (snap) => {
        setProfiles(
          snap.docs.map((d) => Object.assign({ id: d.id }, d.data()) as ClientProfile),
        )
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
