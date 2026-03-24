import React, { ReactNode } from 'react'
import { colors, radius, shadow } from '@/lib/theme'

interface CardProps {
  children: ReactNode
  style?: React.CSSProperties
}

export function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: shadow.card,
        padding: '20px 24px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: '0 0 16px 0',
        fontSize: 15,
        fontWeight: 700,
        color: colors.textPrimary,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h2>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: colors.textPrimary,
        margin: '0 0 24px 0',
        letterSpacing: '-0.02em',
      }}
    >
      {children}
    </h1>
  )
}
