import React, { InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { colors, radius } from '@/lib/theme'

interface FieldProps {
  label: string
  error?: string
}

type InputFieldProps = FieldProps & InputHTMLAttributes<HTMLInputElement>
type SelectFieldProps = FieldProps & SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[]
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: 13,
  color: colors.textSecondary,
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  padding: '9px 13px',
  borderRadius: radius.md,
  border: `1.5px solid ${colors.border}`,
  fontSize: 14,
  color: colors.textPrimary,
  background: '#FAFAF9',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const errorStyle: React.CSSProperties = {
  color: colors.danger,
  fontSize: 11,
  fontWeight: 500,
}

export function InputField({ label, error, ...props }: InputFieldProps) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        style={{
          ...inputStyle,
          borderColor: error ? colors.danger : colors.border,
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </label>
  )
}

export function SelectField({ label, error, options, ...props }: SelectFieldProps) {
  return (
    <label style={labelStyle}>
      {label}
      <select
        style={{
          ...inputStyle,
          borderColor: error ? colors.danger : colors.border,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={errorStyle}>{error}</span>}
    </label>
  )
}

export function TextareaField({
  label,
  error,
  ...props
}: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label style={labelStyle}>
      {label}
      <textarea
        style={{
          ...inputStyle,
          resize: 'vertical',
          minHeight: 80,
          borderColor: error ? colors.danger : colors.border,
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
    </label>
  )
}
