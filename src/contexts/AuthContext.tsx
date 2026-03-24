import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import type { Professional, ProfessionalRole } from '@shared/types'

interface AuthContextValue {
  user: User | null
  professional: Professional | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: ProfessionalRole,
  ) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Load the professional doc — professionalId == uid for MVP simplicity
        const profSnap = await getDoc(
          doc(db, 'professionals', firebaseUser.uid),
        )
        if (profSnap.exists()) {
          setProfessional({ id: profSnap.id, ...profSnap.data() } as Professional)
        } else {
          setProfessional(null)
        }
      } else {
        setProfessional(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: ProfessionalRole,
  ) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const { uid } = credential.user

    // professionalId == uid (simplest 1:1 mapping for MVP)
    const professionalId = uid

    const professionalData: Omit<Professional, 'id'> = {
      ownerUid: uid,
      role,
      displayName,
      membershipStatus: 'active', // default active for MVP; replace with Stripe check later
      createdAt: serverTimestamp() as unknown as Professional['createdAt'],
    }

    // Create the professional doc only (partners don't belong in users collection)
    await setDoc(doc(db, 'professionals', professionalId), professionalData)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, professional, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
