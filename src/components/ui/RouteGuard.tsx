import React, { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { ProfessionalRole } from '@shared/types'

interface RouteGuardProps {
  children: ReactNode
  requireRole?: ProfessionalRole
}

/**
 * Redirects to /auth if not authenticated.
 * Redirects to /paywall if membership is inactive.
 * Optionally enforces a specific role.
 */
export function RouteGuard({ children, requireRole }: RouteGuardProps) {
  const { user, professional, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div style={loadingStyle}>Loading…</div>
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (!professional) {
    // Signed in but no professional doc yet — shouldn't happen but guard anyway
    return <Navigate to="/auth" replace />
  }

  if (professional.membershipStatus !== 'active') {
    return <Navigate to="/paywall" replace />
  }

  if (requireRole && professional.role !== requireRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  fontFamily: "'Inter', system-ui, sans-serif",
  color: '#A8A29E',
  fontSize: 14,
}
