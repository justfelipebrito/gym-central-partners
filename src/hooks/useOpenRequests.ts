import { useEffect, useState } from 'react'
import { query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { clientRequestsCol } from '@/lib/firebase/collections'
import type { ClientRequest, ProfessionalRole } from '@shared/types'

const ROLE_TO_REQUEST_TYPE: Record<ProfessionalRole, ClientRequest['requestType']> = {
  pt: 'training_plan',
  nutritionist: 'nutrition_plan',
  cook: 'cook_service',
}

export function useOpenRequests(role: ProfessionalRole | null) {
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!role) {
      setRequests([])
      setLoading(false)
      return
    }

    const requestType = ROLE_TO_REQUEST_TYPE[role]
    const q = query(
      clientRequestsCol,
      where('status', '==', 'open'),
      where('requestType', '==', requestType),
      orderBy('createdAt', 'desc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(
          snap.docs.map((d) => Object.assign({ id: d.id }, d.data()) as ClientRequest),
        )
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsub
  }, [role])

  return { requests, loading, error }
}
