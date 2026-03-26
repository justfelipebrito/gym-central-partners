import { useState, useEffect } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, query as firestoreQuery } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import './MuscleGroupExercisesEditor.css'

interface Exercise {
  id: string
  exerciseId: string
  title: string
  order: number
  pauseDurationSec: number
  pauseType: string
  series: Array<{
    id: string
    seriesNumber: number
    reps: number
    weightPercentage: number
  }>
}

interface MuscleGroupExercisesEditorProps {
  appUserUid: string
  availableGroups: string[]
  isPro: boolean
}

const FREE_GROUPS = ['group_a', 'group_b', 'group_c']

export function MuscleGroupExercisesEditor({ appUserUid, availableGroups, isPro }: MuscleGroupExercisesEditorProps) {
  const allowedGroups = isPro ? availableGroups : FREE_GROUPS
  const [activeGroup, setActiveGroup] = useState(allowedGroups[0])

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [availableExercises, setAvailableExercises] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch available exercises from exercises collection
  useEffect(() => {
    const fetchExercises = async () => {
      const exercisesSnap = await getDocs(collection(db, 'exercises'))
      const exList = exercisesSnap.docs.map(d => ({
        id: d.id,
        title: d.data().title || d.data().name || 'Unnamed Exercise',
      }))
      setAvailableExercises(exList)
    }
    fetchExercises()
  }, [])

  // Fetch exercises for active group
  useEffect(() => {
    if (!activeGroup) return

    const fetchGroupExercises = async () => {
      setLoading(true)
      const exercisesRef = collection(db, 'users', appUserUid, 'trainingGroups', activeGroup, 'exercises')
      const snap = await getDocs(exercisesRef)

      const exList: Exercise[] = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          exerciseId: data.exerciseId || '',
          title: data.title || '',
          order: data.order || 0,
          pauseDurationSec: data.pauseDurationSec || 60,
          pauseType: data.pauseType || 'between_series',
          series: data.series || [],
        }
      }).sort((a, b) => a.order - b.order)

      setExercises(exList)
      setLoading(false)
    }

    fetchGroupExercises()
  }, [activeGroup, appUserUid])

  const addExercise = () => {
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      exerciseId: '',
      title: '',
      order: exercises.length,
      pauseDurationSec: 60,
      pauseType: 'between_series',
      series: [
        { id: crypto.randomUUID(), seriesNumber: 1, reps: 10, weightPercentage: 70 },
      ],
    }
    setExercises([...exercises, newExercise])
  }

  const updateExercise = (index: number, field: string, value: any) => {
    const updated = [...exercises]

    // If changing exerciseId, also update title
    if (field === 'exerciseId') {
      const selectedEx = availableExercises.find(e => e.id === value)
      updated[index] = {
        ...updated[index],
        exerciseId: value,
        title: selectedEx?.title || '',
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }

    setExercises(updated)
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const addSeries = (exerciseIndex: number) => {
    const updated = [...exercises]
    const seriesCount = updated[exerciseIndex].series.length
    updated[exerciseIndex].series.push({
      id: crypto.randomUUID(),
      seriesNumber: seriesCount + 1,
      reps: 10,
      weightPercentage: 70,
    })
    setExercises(updated)
  }

  const updateSeries = (exerciseIndex: number, seriesIndex: number, field: string, value: any) => {
    const updated = [...exercises]
    updated[exerciseIndex].series[seriesIndex] = {
      ...updated[exerciseIndex].series[seriesIndex],
      [field]: field === 'reps' || field === 'weightPercentage' ? parseInt(value) || 0 : value,
    }
    setExercises(updated)
  }

  const removeSeries = (exerciseIndex: number, seriesIndex: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].series = updated[exerciseIndex].series.filter((_, i) => i !== seriesIndex)
    // Renumber series
    updated[exerciseIndex].series.forEach((s, i) => s.seriesNumber = i + 1)
    setExercises(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const exercisesRef = collection(db, 'users', appUserUid, 'trainingGroups', activeGroup, 'exercises')

      // Delete all existing exercises first
      const existingSnap = await getDocs(exercisesRef)
      await Promise.all(existingSnap.docs.map(d => deleteDoc(d.ref)))

      // Save new exercises
      await Promise.all(exercises.map((ex, index) => {
        const docRef = doc(exercisesRef, ex.id)
        return setDoc(docRef, {
          exerciseId: ex.exerciseId,
          title: ex.title,
          order: index,
          pauseDurationSec: ex.pauseDurationSec,
          pauseType: ex.pauseType,
          series: ex.series,
          id: ex.id,
        })
      }))

      alert('Exercises saved successfully!')
    } catch (err) {
      console.error('Failed to save exercises:', err)
      alert('Failed to save exercises')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="muscle-group-exercises-editor">
      <div className="exercises-editor-header">
        <CardTitle>Muscle Group Exercises</CardTitle>
        <Button loading={saving} onClick={handleSave}>
          Save Exercises
        </Button>
      </div>

      <div className="group-tabs">
        {allowedGroups.map((groupId) => {
          const letter = groupId.replace('group_', '').toUpperCase()
          return (
            <button
              key={groupId}
              className={`group-tab ${activeGroup === groupId ? 'active' : ''}`}
              onClick={() => setActiveGroup(groupId)}
            >
              Group {letter}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="loading-text">Loading exercises...</p>
      ) : (
        <div className="exercises-content">
          {exercises.length === 0 ? (
            <p className="no-exercises">No exercises in this group yet</p>
          ) : (
            <div className="exercises-list">
              {exercises.map((exercise, exIdx) => (
                <div key={exercise.id} className="exercise-card">
                  <div className="exercise-header">
                    <span className="exercise-order">#{exIdx + 1}</span>
                    {exercise.title ? (
                      <div className="exercise-title-display">
                        <span className="exercise-title">{exercise.title}</span>
                        <button
                          className="change-exercise-btn"
                          onClick={() => updateExercise(exIdx, 'title', '')}
                          title="Change exercise"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <select
                        className="exercise-select"
                        value={exercise.exerciseId}
                        onChange={(e) => updateExercise(exIdx, 'exerciseId', e.target.value)}
                      >
                        <option value="">Select exercise...</option>
                        {availableExercises.map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.title}</option>
                        ))}
                      </select>
                    )}
                    <button
                      className="remove-exercise-btn"
                      onClick={() => removeExercise(exIdx)}
                      title="Remove exercise"
                    >
                      ×
                    </button>
                  </div>

                  <div className="exercise-settings">
                    <div className="setting-field">
                      <label>Pause (seconds)</label>
                      <input
                        type="number"
                        value={exercise.pauseDurationSec}
                        onChange={(e) => updateExercise(exIdx, 'pauseDurationSec', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="setting-field">
                      <label>Pause Type</label>
                      <select
                        value={exercise.pauseType}
                        onChange={(e) => updateExercise(exIdx, 'pauseType', e.target.value)}
                      >
                        <option value="between_series">Between Series</option>
                        <option value="between_exercises">Between Exercises</option>
                      </select>
                    </div>
                  </div>

                  <div className="series-section">
                    <div className="series-header">
                      <strong>Series</strong>
                      <button className="add-series-btn" onClick={() => addSeries(exIdx)}>
                        + Add Set
                      </button>
                    </div>

                    <div className="series-list">
                      {exercise.series.map((series, serIdx) => (
                        <div key={series.id} className="series-row">
                          <span className="series-number">Set {series.seriesNumber}</span>
                          <input
                            type="number"
                            className="series-reps-input"
                            placeholder="Reps"
                            value={series.reps}
                            onChange={(e) => updateSeries(exIdx, serIdx, 'reps', e.target.value)}
                          />
                          <div className="weight-input-group">
                            <input
                              type="number"
                              className="series-weight-input"
                              placeholder="Weight %"
                              value={series.weightPercentage}
                              onChange={(e) => updateSeries(exIdx, serIdx, 'weightPercentage', e.target.value)}
                            />
                            <span className="weight-unit">%</span>
                          </div>
                          <button
                            className="remove-series-btn"
                            onClick={() => removeSeries(exIdx, serIdx)}
                            title="Remove set"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="secondary" onClick={addExercise}>
            + Add Exercise
          </Button>
        </div>
      )}
    </Card>
  )
}
