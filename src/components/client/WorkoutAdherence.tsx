import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardTitle } from '@/components/ui/Card'
import { subscribeDailyTrainingProgress, type DailyTrainingProgress } from '@/lib/progressAdapters/workoutSessions'
import './WorkoutAdherence.css'

interface WorkoutAdherenceProps {
  appUserUid: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarWeek {
  days: (DailyTrainingProgress | null)[]
}

export function WorkoutAdherence({ appUserUid }: WorkoutAdherenceProps) {
  const [days, setDays] = useState<DailyTrainingProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🎯 [WorkoutAdherence] Component mounted with appUserUid:', appUserUid)

    const unsub = subscribeDailyTrainingProgress(
      appUserUid,
      (data) => {
        console.log('🎯 [WorkoutAdherence] Received data:', data.length, 'days')
        const trainedDays = data.filter(d => d.didTrain)
        console.log('🎯 [WorkoutAdherence] Days trained:', trainedDays.length)

        // Create a table view for easy debugging
        console.table(trainedDays.map(d => ({
          Date: d.dateLabel,
          Group: d.trainingGroup || 'N/A',
          Duration: d.durationMinutes ? `${d.durationMinutes}m` : 'N/A'
        })))

        setDays(data)
        setLoading(false)
      },
      (err) => {
        console.error('❌ [WorkoutAdherence] Failed to load workout progress:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [appUserUid])

  // Calculate statistics
  const daysTrained = days.filter(d => d.didTrain).length
  const totalMinutes = days.reduce((sum, d) => sum + (d.durationMinutes || 0), 0)
  const avgMinutes = daysTrained > 0 ? Math.round(totalMinutes / daysTrained) : 0

  const formatTime = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  // Build calendar grid
  const buildCalendarWeeks = (): CalendarWeek[] => {
    if (days.length === 0) return []

    // Reverse to get chronological order (oldest first)
    const sortedDays = [...days].reverse()

    // Get the earliest date to determine calendar start
    const firstDate = sortedDays[0].date
    const firstDayOfWeek = firstDate.getDay()

    const weeks: CalendarWeek[] = []
    let currentWeek: (DailyTrainingProgress | null)[] = Array(7).fill(null)

    // Fill leading nulls for the first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek[i] = null
    }

    let weekDayIndex = firstDayOfWeek

    for (const day of sortedDays) {
      currentWeek[weekDayIndex] = day
      weekDayIndex++

      if (weekDayIndex === 7) {
        weeks.push({ days: currentWeek })
        currentWeek = Array(7).fill(null)
        weekDayIndex = 0
      }
    }

    // Add last partial week if it has any days
    if (currentWeek.some(d => d !== null)) {
      weeks.push({ days: currentWeek })
    }

    return weeks
  }

  const calendarWeeks = buildCalendarWeeks()

  if (loading) {
    return (
      <div className="workout-adherence-card">
        <Card style={{ marginBottom: '24px' }}>
          <CardTitle>Workout Adherence (Last 30 Days)</CardTitle>
          <p className="loading-text">Loading workout data...</p>
        </Card>
      </div>
    )
  }

  if (days.length === 0) {
    return (
      <div className="workout-adherence-card">
        <Card style={{ marginBottom: '24px' }}>
          <CardTitle>Workout Adherence (Last 30 Days)</CardTitle>
          <p className="empty-text">No workout data available yet.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="workout-adherence-card">
      <Card style={{ marginBottom: '24px' }}>
        <CardTitle>Workout Adherence (Last 30 Days)</CardTitle>

        {/* Statistics */}
        <div className="adherence-stats">
        <div className="stat-item">
          <div className="stat-value">{daysTrained}</div>
          <div className="stat-label">Days Trained</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatTime(totalMinutes)}</div>
          <div className="stat-label">Total Time</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatTime(avgMinutes)}</div>
          <div className="stat-label">Avg Time</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-container">
        {/* Weekday headers */}
        <div className="calendar-header">
          {WEEKDAY_LABELS.map(label => (
            <div key={label} className="weekday-label">{label}</div>
          ))}
        </div>

        {/* Calendar weeks */}
        {calendarWeeks.map((week, weekIndex) => (
          <div key={weekIndex} className="calendar-week">
            {week.days.map((day, dayIndex) => (
              <div key={dayIndex} className="calendar-day">
                {day ? (
                  <div
                    className={`day-cell ${day.didTrain ? 'trained' : 'scheduled'}`}
                    style={{
                      backgroundColor: day.didTrain ? '#3B82F6' : undefined,
                    }}
                    title={`${day.dateLabel}${day.didTrain ? ` - Training ${day.trainingGroup || ''}` : ' - Rest'}${day.durationMinutes ? ` (${day.durationMinutes}m)` : ''}`}
                  >
                    {day.didTrain ? (
                      <div className="cell-content">
                        <span className="training-group">{day.trainingGroup || '✓'}</span>
                        <span className="training-date">{format(day.date, 'dd/MM')}</span>
                      </div>
                    ) : day.trainingGroup ? (
                      <div className="cell-content">
                        <span className="scheduled-indicator">{day.trainingGroup}</span>
                        <span className="scheduled-date">{format(day.date, 'dd/MM')}</span>
                      </div>
                    ) : (
                      <div className="cell-content">
                        <span className="day-number">{day.date.getDate()}</span>
                        <span className="rest-date">{format(day.date, 'dd/MM')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="day-cell empty" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color trained-color" />
          <span>Trained</span>
        </div>
        <div className="legend-item">
          <div className="legend-color scheduled-color" />
          <span>Scheduled</span>
        </div>
        <div className="legend-item">
          <div className="legend-color rest-color" />
          <span>Rest Day</span>
        </div>
      </div>
      </Card>
    </div>
  )
}
