import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useProfessional } from '@/hooks/useProfessional'
import { createOrUpdateBatch } from '@/lib/api/functions'
import { Card, CardTitle, SectionTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InputField, SelectField, TextareaField } from '@/components/ui/FormField'
import { colors, radius } from '@/lib/theme'
import type { Batch, BatchStatus, DeliveryType } from '@shared/types'
import { format } from 'date-fns'

// Cook only — enforced by RouteGuard in router
export function LogisticsPage() {
  const { clientProfileId } = useParams<{ clientProfileId: string }>()
  const { professionalId } = useProfessional()
  const navigate = useNavigate()

  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  // New batch form state
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [pickupOrDelivery, setPickupOrDelivery] = useState<DeliveryType>('delivery')
  const [scheduledAt, setScheduledAt] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<BatchStatus>('planned')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!professionalId || !clientProfileId) return

    const q = query(
      collection(db, 'professionals', professionalId, 'clientProfiles', clientProfileId, 'batches'),
      orderBy('scheduledAt', 'asc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch))
      setLoading(false)
    })
    return unsub
  }, [professionalId, clientProfileId])

  const resetForm = () => {
    setPeriodStart('')
    setPeriodEnd('')
    setPickupOrDelivery('delivery')
    setScheduledAt('')
    setAddress('')
    setStatus('planned')
    setNotes('')
    setEditingBatch(null)
    setFormError(null)
  }

  const openEditForm = (batch: Batch) => {
    setEditingBatch(batch)
    setPeriodStart(toInputDate(batch.periodStart))
    setPeriodEnd(toInputDate(batch.periodEnd))
    setPickupOrDelivery(batch.pickupOrDelivery)
    setScheduledAt(toInputDatetime(batch.scheduledAt))
    setAddress(batch.address ?? '')
    setStatus(batch.status)
    setNotes(batch.notes ?? '')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientProfileId) return
    setFormError(null)
    setSaving(true)

    try {
      const result = await createOrUpdateBatch({
        clientProfileId,
        batchId: editingBatch?.id,
        periodStart,
        periodEnd,
        pickupOrDelivery,
        scheduledAt,
        address: address || undefined,
        status,
        notes: notes || undefined,
      })

      if (result.success) {
        resetForm()
        setShowForm(false)
      } else {
        setFormError(result.error ?? 'Failed to save batch.')
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setSaving(false)
    }
  }

  const batchStatusOptions: { value: BatchStatus; label: string }[] = [
    { value: 'planned', label: 'Planned' },
    { value: 'prepared', label: 'Prepared' },
    { value: 'ready', label: 'Ready for pickup/delivery' },
    { value: 'picked_up', label: 'Picked up' },
    { value: 'delivered', label: 'Delivered' },
  ]

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(`/clients/${clientProfileId}`)}>
        ← Client Profile
      </button>
      <div style={styles.headerRow}>
        <SectionTitle>Batch Logistics</SectionTitle>
        {!showForm && (
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
            + New Batch
          </Button>
        )}
      </div>

      {/* Batch form */}
      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>{editingBatch ? 'Edit Batch' : 'New Batch'}</CardTitle>
          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.row}>
              <InputField label="Period Start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
              <InputField label="Period End" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
            </div>
            <div style={styles.row}>
              <SelectField
                label="Type"
                value={pickupOrDelivery}
                onChange={(e) => setPickupOrDelivery(e.target.value as DeliveryType)}
                options={[
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'delivery', label: 'Delivery' },
                ]}
              />
              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as BatchStatus)}
                options={batchStatusOptions}
              />
            </div>
            <InputField
              label="Scheduled At"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            {pickupOrDelivery === 'delivery' && (
              <InputField
                label="Delivery Address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City"
              />
            )}
            <TextareaField
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {formError && <p style={styles.error}>{formError}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" loading={saving}>Save Batch</Button>
              <Button type="button" variant="secondary" onClick={() => { resetForm(); setShowForm(false) }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Batch list */}
      <Card>
        <CardTitle>Scheduled Batches</CardTitle>
        {loading ? (
          <p style={styles.muted}>Loading…</p>
        ) : batches.length === 0 ? (
          <p style={styles.muted}>No batches scheduled yet.</p>
        ) : (
          <ul style={styles.batchList}>
            {batches.map((b) => (
              <li key={b.id} style={styles.batchItem}>
                <div>
                  <div style={styles.batchTitle}>
                    {b.scheduledAt?.seconds
                      ? format(new Date(b.scheduledAt.seconds * 1000), 'MMM d, yyyy · h:mm a')
                      : '—'}
                  </div>
                  <div style={styles.batchMeta}>
                    {b.pickupOrDelivery} ·{' '}
                    {b.periodStart?.seconds
                      ? format(new Date(b.periodStart.seconds * 1000), 'MMM d')
                      : ''}{' '}
                    →{' '}
                    {b.periodEnd?.seconds
                      ? format(new Date(b.periodEnd.seconds * 1000), 'MMM d')
                      : ''}
                  </div>
                  {b.address && <div style={styles.batchMeta}>{b.address}</div>}
                  {b.notes && <div style={styles.batchMeta}>{b.notes}</div>}
                </div>
                <div style={styles.batchRight}>
                  <span style={{ ...styles.statusBadge, ...statusBadgeColor(b.status) }}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => openEditForm(b)}>Edit</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function statusBadgeColor(status: BatchStatus): React.CSSProperties {
  const map: Record<BatchStatus, React.CSSProperties> = {
    planned:   { background: colors.infoLight,    color: colors.infoText },
    prepared:  { background: colors.warningLight,  color: colors.warningText },
    ready:     { background: colors.successLight,  color: colors.successText },
    picked_up: { background: colors.divider,       color: colors.textSecondary },
    delivered: { background: colors.successLight,  color: colors.successText },
  }
  return map[status] ?? {}
}

function toInputDate(ts: Batch['periodStart'] | undefined): string {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toISOString().split('T')[0]
}

function toInputDatetime(ts: Batch['scheduledAt'] | undefined): string {
  if (!ts?.seconds) return ''
  const d = new Date(ts.seconds * 1000)
  return d.toISOString().slice(0, 16)
}

const styles: Record<string, React.CSSProperties> = {
  backBtn: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 0 8px 0',
    marginBottom: 8,
    display: 'block',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  error: {
    color: colors.danger,
    background: colors.dangerLight,
    borderRadius: radius.md,
    padding: '8px 12px',
    fontSize: 13,
    margin: 0,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  batchList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  batchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: `1px solid ${colors.divider}`,
    gap: 16,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  batchMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  batchRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    borderRadius: radius.full,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
}
