import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import './WeeklyScheduleEditor.css'

interface WeeklyScheduleEditorProps {
  schedule: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }
  onChange: (schedule: any) => void
  onSave: () => Promise<void>
  availableGroups: string[]
  isPro: boolean
  saving?: boolean
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

const FREE_GROUPS = ['group_a', 'group_b', 'group_c']

export function WeeklyScheduleEditor({ schedule, onChange, onSave, availableGroups, isPro, saving }: WeeklyScheduleEditorProps) {
  const allowedGroups = isPro ? availableGroups : FREE_GROUPS

  const handleDayChange = (day: string, groupId: string) => {
    const updated = { ...schedule }
    if (groupId === 'rest') {
      delete updated[day as keyof typeof updated]
    } else {
      updated[day as keyof typeof updated] = groupId
    }
    onChange(updated)
  }

  return (
    <Card className="weekly-schedule-editor">
      <div className="schedule-editor-header">
        <div className="schedule-title-row">
          <CardTitle>Weekly Training Schedule</CardTitle>
          {!isPro && (
            <span className="plan-badge">Free Plan - Groups A, B, C only</span>
          )}
        </div>
        <Button loading={saving} onClick={onSave} size="sm">
          Save Schedule
        </Button>
      </div>
      <p className="schedule-hint">
        Assign training groups to each day of the week. Select "Rest" for rest days.
      </p>

      <div className="days-schedule-list">
        {DAYS.map((day) => {
          const currentGroup = schedule[day.key as keyof typeof schedule]

          return (
            <div key={day.key} className="day-schedule-row">
              <label className="day-label">{day.label}</label>
              <select
                className="group-select"
                value={currentGroup || 'rest'}
                onChange={(e) => handleDayChange(day.key, e.target.value)}
              >
                <option value="rest">Rest Day</option>
                {allowedGroups.map((groupId) => {
                  const letter = groupId.replace('group_', '').toUpperCase()
                  return (
                    <option key={groupId} value={groupId}>
                      Training {letter}
                    </option>
                  )
                })}
              </select>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
