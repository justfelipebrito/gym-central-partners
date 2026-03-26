import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DietPlanContent } from '@shared/types'
import './DietPlanEditor.css'

interface DietPlanEditorProps {
  content: DietPlanContent
  onChange: (content: DietPlanContent) => void
}

export function DietPlanEditor({ content, onChange }: DietPlanEditorProps) {
  const meals = content.meals || []

  const addMeal = () => {
    const updatedMeals = [
      ...meals,
      {
        name: '',
        time: '12:00',
        foods: [],
      },
    ]
    onChange({ ...content, meals: updatedMeals })
  }

  const updateMeal = (mealIndex: number, field: string, value: any) => {
    const updatedMeals = [...meals]
    updatedMeals[mealIndex] = {
      ...updatedMeals[mealIndex],
      [field]: value,
    }
    onChange({ ...content, meals: updatedMeals })
  }

  const removeMeal = (mealIndex: number) => {
    const updatedMeals = meals.filter((_, idx) => idx !== mealIndex)
    onChange({ ...content, meals: updatedMeals })
  }

  const addFood = (mealIndex: number) => {
    const updatedMeals = [...meals]
    updatedMeals[mealIndex].foods.push({
      name: '',
      quantity: '',
      calories: 0,
    })
    onChange({ ...content, meals: updatedMeals })
  }

  const updateFood = (mealIndex: number, foodIndex: number, field: string, value: any) => {
    const updatedMeals = [...meals]
    updatedMeals[mealIndex].foods[foodIndex] = {
      ...updatedMeals[mealIndex].foods[foodIndex],
      [field]: value,
    }
    onChange({ ...content, meals: updatedMeals })
  }

  const removeFood = (mealIndex: number, foodIndex: number) => {
    const updatedMeals = [...meals]
    updatedMeals[mealIndex].foods = updatedMeals[mealIndex].foods.filter((_, idx) => idx !== foodIndex)
    onChange({ ...content, meals: updatedMeals })
  }

  return (
    <div className="diet-plan-editor">
      <Card>
        <CardTitle>Daily Calories Target</CardTitle>
        <input
          type="number"
          className="calories-input"
          placeholder="e.g., 2000"
          value={content.dailyCalories || ''}
          onChange={(e) => onChange({ ...content, dailyCalories: parseInt(e.target.value) || 0 })}
        />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div className="meals-header">
          <CardTitle>Meals</CardTitle>
          <Button variant="secondary" size="sm" onClick={addMeal}>
            + Add Meal
          </Button>
        </div>

        {meals.length === 0 ? (
          <p className="no-meals">No meals added yet</p>
        ) : (
          <div className="meals-list">
            {meals.map((meal, mealIdx) => (
              <div key={mealIdx} className="meal-card">
                <div className="meal-header">
                  <div className="meal-basic-fields">
                    <input
                      type="text"
                      className="meal-name-input"
                      placeholder="Meal name (e.g., Breakfast)"
                      value={meal.name}
                      onChange={(e) => updateMeal(mealIdx, 'name', e.target.value)}
                    />
                    <input
                      type="time"
                      className="meal-time-input"
                      value={meal.time}
                      onChange={(e) => updateMeal(mealIdx, 'time', e.target.value)}
                    />
                  </div>
                  <button
                    className="remove-meal-btn"
                    onClick={() => removeMeal(mealIdx)}
                    title="Remove meal"
                  >
                    ×
                  </button>
                </div>

                <div className="foods-section">
                  <div className="foods-list">
                    {meal.foods.map((food, foodIdx) => (
                      <div key={foodIdx} className="food-row">
                        <input
                          type="text"
                          className="food-name-input"
                          placeholder="Food item"
                          value={food.name}
                          onChange={(e) => updateFood(mealIdx, foodIdx, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="food-quantity-input"
                          placeholder="Quantity"
                          value={food.quantity}
                          onChange={(e) => updateFood(mealIdx, foodIdx, 'quantity', e.target.value)}
                        />
                        <input
                          type="number"
                          className="food-calories-input"
                          placeholder="Cal"
                          value={food.calories || ''}
                          onChange={(e) => updateFood(mealIdx, foodIdx, 'calories', parseInt(e.target.value) || 0)}
                        />
                        <button
                          className="remove-food-btn"
                          onClick={() => removeFood(mealIdx, foodIdx)}
                          title="Remove food"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button className="add-food-btn" onClick={() => addFood(mealIdx)}>
                    + Add Food
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardTitle>General Notes</CardTitle>
        <textarea
          className="notes-textarea"
          placeholder="Add any dietary notes, restrictions, or special instructions..."
          value={content.notes || ''}
          onChange={(e) => onChange({ ...content, notes: e.target.value })}
        />
      </Card>
    </div>
  )
}
