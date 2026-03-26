import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { TrainingPlanContent } from '@shared/types'
import './TrainingPlanEditor.css'

interface TrainingPlanEditorProps {
  content: TrainingPlanContent
  onChange: (content: TrainingPlanContent) => void
}

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const

export function TrainingPlanEditor({ content, onChange }: TrainingPlanEditorProps) {
  const [activeDay, setActiveDay] = useState<string>('mon')

  const currentDaySchedule = content.weeklySchedule?.find(d => d.day === activeDay)
  const exercises = currentDaySchedule?.exercises || []

  const addExercise = () => {
    const updatedSchedule = content.weeklySchedule || []
    const dayIndex = updatedSchedule.findIndex(d => d.day === activeDay)

    if (dayIndex >= 0) {
      updatedSchedule[dayIndex].exercises.push({
        name: '',
        sets: 3,
        reps: '8-12',
      })
    } else {
      updatedSchedule.push({
        day: activeDay,
        exercises: [{ name: '', sets: 3, reps: '8-12' }],
      })
    }

    onChange({ ...content, weeklySchedule: updatedSchedule })
  }

  const updateExercise = (exerciseIndex: number, field: string, value: any) => {
    const updatedSchedule = [...(content.weeklySchedule || [])]
    const dayIndex = updatedSchedule.findIndex(d => d.day === activeDay)

    if (dayIndex >= 0) {
      updatedSchedule[dayIndex].exercises[exerciseIndex] = {
        ...updatedSchedule[dayIndex].exercises[exerciseIndex],
        [field]: value,
      }
      onChange({ ...content, weeklySchedule: updatedSchedule })
    }
  }

  const removeExercise = (exerciseIndex: number) => {
    const updatedSchedule = [...(content.weeklySchedule || [])]
    const dayIndex = updatedSchedule.findIndex(d => d.day === activeDay)

    if (dayIndex >= 0) {
      updatedSchedule[dayIndex].exercises.splice(exerciseIndex, 1)
      if (updatedSchedule[dayIndex].exercises.length === 0) {
        updatedSchedule.splice(dayIndex, 1)
      }
      onChange({ ...content, weeklySchedule: updatedSchedule })
    }
  }

  return (
    <div className="training-plan-editor">
      <Card>
        <CardTitle>Weekly Training Schedule</CardTitle>

        <div className="day-tabs">
          {DAYS.map(day => (
            <button
              key={day.key}
              className={`day-tab ${activeDay === day.key ? 'active' : ''}`}
              onClick={() => setActiveDay(day.key)}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="exercises-section">
          {exercises.length === 0 ? (
            <p className="no-exercises">No exercises scheduled for this day</p>
          ) : (
            <div className="exercises-list">
              {exercises.map((exercise, idx) => (
                <div key={idx} className="exercise-row">
                  <div className="exercise-fields">
                    <input
                      type="text"
                      className="exercise-name-input"
                      placeholder="Exercise name"
                      value={exercise.name}
                      onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                    />
                    <input
                      type="number"
                      className="exercise-sets-input"
                      placeholder="Sets"
                      value={exercise.sets}
                      onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)}
                    />
                    <input
                      type="text"
                      className="exercise-reps-input"
                      placeholder="Reps"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                    />
                    <input
                      type="text"
                      className="exercise-notes-input"
                      placeholder="Notes (optional)"
                      value={exercise.notes || ''}
                      onChange={(e) => updateExercise(idx, 'notes', e.target.value)}
                    />
                  </div>
                  <button
                    className="remove-exercise-btn"
                    onClick={() => removeExercise(idx)}
                    title="Remove exercise"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={addExercise}>
            + Add Exercise
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardTitle>General Notes</CardTitle>
        <textarea
          className="notes-textarea"
          placeholder="Add any general notes or instructions for the client..."
          value={content.notes || ''}
          onChange={(e) => onChange({ ...content, notes: e.target.value })}
        />
      </Card>
    </div>
  )
}
