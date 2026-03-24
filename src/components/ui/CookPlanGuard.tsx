import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Blocks Cook role from accessing the plan page.
 * PT and Nutritionist pass through.
 */
export function CookPlanGuard({ children }: { children: ReactNode }) {
  const { professional } = useAuth()

  if (professional?.role === 'cook') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
