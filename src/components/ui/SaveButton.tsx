import { useState } from 'react'
import { Button } from './Button'
import { ConfirmModal } from './ConfirmModal'

interface SaveButtonProps {
  onSave: () => Promise<void> | void
  loading?: boolean
  size?: 'sm' | 'md'
  confirmTitle?: string
  confirmMessage?: string
  confirmText?: string
  disabled?: boolean
}

export function SaveButton({
  onSave,
  loading = false,
  size = 'md',
  confirmTitle = 'Confirm Save',
  confirmMessage = 'Are you sure you want to save these changes?',
  confirmText = 'Save',
  disabled = false,
}: SaveButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleClick = () => {
    setIsModalOpen(true)
  }

  const handleConfirm = async () => {
    setIsSaving(true)
    try {
      await onSave()
      setIsModalOpen(false)
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <Button
        loading={loading || isSaving}
        onClick={handleClick}
        size={size}
        disabled={disabled}
      >
        Save
      </Button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmText}
        loading={isSaving}
      />
    </>
  )
}
