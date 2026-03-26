import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Card, CardTitle } from '@/components/ui/Card'
import './WeeklySchedule.css'

interface WeeklyScheduleProps {
  appUserUid: string
}

interface TrainingSchedule {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

function convertGroupIdToLetter(groupId: string): string {
  const match = groupId.match(/group_([a-z])/i)
  return match ? match[1].toUpperCase() : groupId
}

export function WeeklySchedule({ appUserUid }: WeeklyScheduleProps) {
  const [schedule, setSchedule] = useState<TrainingSchedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const scheduleRef = doc(db, 'users', appUserUid, 'trainingData', 'schedule')

    getDoc(scheduleRef)
      .then((snap) => {
        if (snap.exists()) {
          setSchedule(snap.data() as TrainingSchedule)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load training schedule:', err)
        setLoading(false)
      })
  }, [appUserUid])

  if (loading) {
    return (
      <Card className="weekly-schedule-card">
        <CardTitle>Weekly Training Schedule</CardTitle>
        <p className="empty-message">Loading schedule...</p>
      </Card>
    )
  }

  if (!schedule) {
    return (
      <Card className="weekly-schedule-card">
        <CardTitle>Weekly Training Schedule</CardTitle>
        <p className="empty-message">No training schedule found.</p>
      </Card>
    )
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

  return (
    <Card className="weekly-schedule-card">
      <CardTitle>Weekly Training Schedule</CardTitle>
      <div className="weekly-grid">
        {days.map((day) => {
          const groupId = schedule[day]
          const groupLetter = groupId ? convertGroupIdToLetter(groupId) : null

          return (
            <div key={day} className="day-card">
              <h4 className="day-title">{day.charAt(0).toUpperCase() + day.slice(1)}</h4>
              {groupLetter ? (
                <div className="training-group">Training {groupLetter}</div>
              ) : (
                <p className="rest-day">Rest day</p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
