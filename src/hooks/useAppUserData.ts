import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export function useAppUserData(appUserUid: string | undefined) {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!appUserUid) {
      setUserData(null)
      setLoading(false)
      return
    }

    const userRef = doc(db, 'users', appUserUid)
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserData(snap.data())
      } else {
        setUserData(null)
      }
      setLoading(false)
    }, (error) => {
      console.error('Error fetching user data:', error)
      setUserData(null)
      setLoading(false)
    })

    return unsub
  }, [appUserUid])

  return { userData, loading }
}
