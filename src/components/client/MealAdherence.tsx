import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardTitle } from '@/components/ui/Card'
import { subscribeMealLogs, type MealLogEntry } from '@/lib/progressAdapters'
import './MealAdherence.css'

interface MealAdherenceProps {
  appUserUid: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarWeek {
  days: (MealLogEntry | null)[]
}

export function MealAdherence({ appUserUid }: MealAdherenceProps) {
  const [days, setDays] = useState<MealLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeMealLogs(
      appUserUid,
      (data) => {
        // Data already includes all 14 days from the adapter
        setDays(data)
        setLoading(false)
      },
      (err) => {
        console.error('Failed to load meal logs:', err)
        setLoading(false)
      },
    )
    return unsub
  }, [appUserUid])

  // Calculate statistics
  const totalMealsConsumed = days.reduce((sum, d) => sum + d.mealsConsumed, 0)
  const daysWithAllMeals = days.filter(d => d.allConsumed).length
  const avgMealsPerDay = days.length > 0 ? (totalMealsConsumed / days.length).toFixed(1) : '0.0'

  // Build calendar grid
  const buildCalendarWeeks = (): CalendarWeek[] => {
    if (days.length === 0) return []

    // Days are already in chronological order (oldest first) after our processing
    const sortedDays = [...days]

    // Get the earliest date to determine calendar start
    const firstDate = sortedDays[0].date
    const firstDayOfWeek = firstDate.getDay()

    const weeks: CalendarWeek[] = []
    let currentWeek: (MealLogEntry | null)[] = Array(7).fill(null)

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

  const weeks = buildCalendarWeeks()

  if (loading) {
    return (
      <Card className="meal-adherence-card">
        <CardTitle>Meals Consumed (Last 14 Days)</CardTitle>
        <p className="loading-text">Loading meal consumption data...</p>
      </Card>
    )
  }

  if (days.length === 0) {
    return (
      <Card className="meal-adherence-card">
        <CardTitle>Meals Consumed (Last 14 Days)</CardTitle>
        <p className="no-data-text">No meal consumption data available yet.</p>
      </Card>
    )
  }

  return (
    <Card className="meal-adherence-card">
      <CardTitle>Meals Consumed (Last 14 Days)</CardTitle>

      {/* Statistics */}
      <div className="meal-stats">
        <div className="meal-stat-item">
          <span className="meal-stat-value">{avgMealsPerDay}</span>
          <span className="meal-stat-label">Avg per Day</span>
        </div>
        <div className="meal-stat-item">
          <span className="meal-stat-value">{daysWithAllMeals}</span>
          <span className="meal-stat-label">Days All Consumed</span>
        </div>
        <div className="meal-stat-item">
          <span className="meal-stat-value">{totalMealsConsumed}</span>
          <span className="meal-stat-label">Total Meals</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="meal-calendar">
        {/* Weekday headers */}
        <div className="meal-calendar-header">
          {WEEKDAY_LABELS.map(label => (
            <div key={label} className="meal-weekday-label">{label}</div>
          ))}
        </div>

        {/* Calendar weeks */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="meal-calendar-week">
            {week.days.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={`meal-calendar-cell ${!day ? 'empty' : ''} ${day?.allConsumed ? 'all-consumed' : ''}`}
              >
                {day && (
                  <div className="meal-cell-content">
                    <span className="meal-count">{day.mealsConsumed}/5</span>
                    <span className="meal-date">{format(day.date, 'dd/MM')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="meal-legend">
        <div className="meal-legend-item">
          <div className="meal-legend-box all-consumed-box"></div>
          <span className="meal-legend-label">5/5 meals (all consumed)</span>
        </div>
        <div className="meal-legend-item">
          <div className="meal-legend-box partial-box"></div>
          <span className="meal-legend-label">1/5 to 4/5 meals (partial)</span>
        </div>
      </div>
    </Card>
  )
}
