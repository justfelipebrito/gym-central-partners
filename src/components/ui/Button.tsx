import React, { ButtonHTMLAttributes } from 'react'
import { colors, radius } from '@/lib/theme'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: radius.md,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  letterSpacing: '0.01em',
  transition: 'opacity 0.15s, transform 0.1s',
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: colors.primary,
    color: colors.primaryText,
  },
  secondary: {
    background: colors.divider,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
  },
  danger: {
    background: colors.danger,
    color: '#fff',
  },
  ghost: {
    background: 'transparent',
    color: colors.primary,
    border: `1.5px solid ${colors.primary}`,
  },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '5px 12px', fontSize: 12 },
  md: { padding: '8px 18px', fontSize: 14 },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        opacity: disabled || loading ? 0.55 : 1,
        ...style,
      }}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
