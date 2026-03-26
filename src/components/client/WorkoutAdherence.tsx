import { useEffect, useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { subscribeDailyTrainingProgress, type DailyTrainingProgress } from '@/lib/progressAdapters/workoutSessions'
import './WorkoutAdherence.css'

interface WorkoutAdherenceProps {
  appUserUid: string
}

const trainingGroupColors: Record<string, string> = {
  A: '#EF4444',
  B: '#3B82F6',
  C: '#10B981',
  D: '#F59E0B',
  E: '#8B5CF6',
  F: '#EC4899',
  G: '#6366F1',
}

export function WorkoutAdherence({ appUserUid }: WorkoutAdherenceProps) {
  const [days, setDays] = useState<DailyTrainingProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeDailyTrainingProgress(
      appUserUid,
      (data) => {
        console.log('🎯 [WorkoutAdherence] Received data:', data.length, 'days')
        setDays(data)
        setLoading(false)
      },
      (err) => {
        console.error('Failed to load workout progress:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [appUserUid])

  if (loading) {
    return (
      <Card className="workout-adherence-card">
        <CardTitle>Workout Adherence (Last 30 Days)</CardTitle>
        <p className="loading-text">Loading workout data...</p>
      </Card>
    )
  }

  if (days.length === 0) {
    return (
      <Card className="workout-adherence-card">
        <CardTitle>Workout Adherence (Last 30 Days)</CardTitle>
        <p className="empty-text">No workout data available yet.</p>
      </Card>
    )
  }

  return (
    <Card className="workout-adherence-card">
      <CardTitle>Workout Adherence (Last 30 Days)</CardTitle>
      <ul className="adherence-list">
        {days.map((day) => (
          <li key={day.dateLabel} className="adherence-item">
            <div className="day-row">
              <span className="day-date">{day.dateLabel}</span>
              <div className="day-status">
                {day.didTrain ? (
                  <>
                    <span
                      className="training-badge"
                      style={{
                        backgroundColor: day.trainingGroup ? trainingGroupColors[day.trainingGroup] || '#A8A29E' : '#A8A29E',
                      }}
                    >
                      Training {day.trainingGroup || '?'}
                    </span>
                    {day.durationMinutes && (
                      <span className="duration">{day.durationMinutes} min</span>
                    )}
                  </>
                ) : (
                  <span className="rest-day-badge">Rest</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
