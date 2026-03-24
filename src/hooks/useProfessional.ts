// Convenience hook — re-exports professional from auth context
// with typed role helpers.
import { useAuth } from '@/contexts/AuthContext'
import type { ProfessionalRole } from '@shared/types'

export function useProfessional() {
  const { professional } = useAuth()

  return {
    professional,
    professionalId: professional?.id ?? null,
    role: (professional?.role ?? null) as ProfessionalRole | null,
    isActive: professional?.membershipStatus === 'active',
    isPT: professional?.role === 'pt',
    isNutritionist: professional?.role === 'nutritionist',
    isCook: professional?.role === 'cook',
  }
}
