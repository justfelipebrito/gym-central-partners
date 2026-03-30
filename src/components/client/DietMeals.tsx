import { useEffect, useState } from 'react'
import { collection, getDocs, doc as firestoreDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Card, CardTitle } from '@/components/ui/Card'
import './DietMeals.css'

interface Ingredient {
  id: string
  name: string
  grams: number
  macros: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

interface Meal {
  id: string
  period: {
    type: string
    customName?: string
  }
  ingredients: Ingredient[]
  hasAlternate: boolean
}

interface DietMealsProps {
  appUserUid: string
}

const MEAL_PERIODS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'afternoonTea', label: 'Afternoon Tea' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'supper', label: 'Supper' },
]

type MealOption = 'A' | 'B'

export function DietMeals({ appUserUid }: DietMealsProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [alternateMeals, setAlternateMeals] = useState<Map<string, Meal>>(new Map())
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Map<string, MealOption>>(new Map())

  useEffect(() => {
    if (!appUserUid) return

    const fetchMealsAndUser = async () => {
      setLoading(true)
      try {
        // Fetch user data to check subscription
        const userDoc = await getDoc(firestoreDoc(db, 'users', appUserUid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsPro(userData?.subscriptionPlan === 'pro')
        }

        const mealsPath = `users/${appUserUid}/diet/data/template`
        const mealsSnap = await getDocs(collection(db, mealsPath))

        const mealsData: Meal[] = await Promise.all(
          mealsSnap.docs.map(async (mealDoc) => {
            const mealData = mealDoc.data()

            // Fetch ingredients for template meal (Option A)
            const ingredientsPath = `${mealsPath}/${mealDoc.id}/ingredients`
            const ingredientsSnap = await getDocs(collection(db, ingredientsPath))

            const ingredients: Ingredient[] = ingredientsSnap.docs.map((ingDoc) => ({
              id: ingDoc.id,
              ...(ingDoc.data() as Omit<Ingredient, 'id'>),
            }))

            // Check if alternate meal exists (Option B)
            const alternatePath = `${mealsPath}/${mealDoc.id}/alternate/meal`
            const alternateDoc = await getDoc(firestoreDoc(db, alternatePath))
            const hasAlternate = alternateDoc.exists()

            return {
              id: mealDoc.id,
              period: mealData.period || { type: mealDoc.id },
              ingredients,
              hasAlternate,
            }
          })
        )

        // Fetch alternate meals for pro users
        if (isPro || userDoc.data()?.subscriptionPlan === 'pro') {
          const alternateMap = new Map<string, Meal>()

          await Promise.all(
            mealsData.filter(m => m.hasAlternate).map(async (meal) => {
              const alternatePath = `${mealsPath}/${meal.id}/alternate/meal`
              const alternateIngredientsPath = `${alternatePath}/ingredients`

              const alternateIngredientsSnap = await getDocs(collection(db, alternateIngredientsPath))
              const alternateIngredients: Ingredient[] = alternateIngredientsSnap.docs.map((ingDoc) => ({
                id: ingDoc.id,
                ...(ingDoc.data() as Omit<Ingredient, 'id'>),
              }))

              alternateMap.set(meal.id, {
                ...meal,
                ingredients: alternateIngredients,
              })
            })
          )

          setAlternateMeals(alternateMap)
        }

        // Sort by meal period order
        const sorted = mealsData.sort((a, b) => {
          const orderA = MEAL_PERIODS.findIndex(p => p.key === a.id)
          const orderB = MEAL_PERIODS.findIndex(p => p.key === b.id)
          return orderA - orderB
        })

        // Initialize all options to 'A' by default
        const initialOptions = new Map<string, MealOption>()
        sorted.forEach(meal => initialOptions.set(meal.id, 'A'))
        setSelectedOptions(initialOptions)

        setMeals(sorted)
      } catch (error) {
        console.error('Error fetching meals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMealsAndUser()
  }, [appUserUid, isPro])

  const getMealLabel = (meal: Meal): string => {
    if (meal.period.type === 'custom' && meal.period.customName) {
      return meal.period.customName
    }
    const period = MEAL_PERIODS.find(p => p.key === meal.id)
    return period?.label || meal.id
  }

  const formatMacros = (ingredient: Ingredient) => {
    const cals = Math.round(ingredient.macros.calories / 100)
    const protein = Math.round(ingredient.macros.protein / 100)
    const carbs = Math.round(ingredient.macros.carbs / 100)
    const fat = Math.round(ingredient.macros.fat / 100)
    return `${cals} kcal · ${protein}g P · ${carbs}g C · ${fat}g F`
  }

  const calculateMealTotals = (ingredients: Ingredient[]) => {
    const totals = ingredients.reduce(
      (sum, ing) => ({
        calories: sum.calories + ing.macros.calories,
        protein: sum.protein + ing.macros.protein,
        carbs: sum.carbs + ing.macros.carbs,
        fat: sum.fat + ing.macros.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    return {
      calories: Math.round(totals.calories / 100),
      protein: Math.round(totals.protein / 100),
      carbs: Math.round(totals.carbs / 100),
      fat: Math.round(totals.fat / 100),
    }
  }

  const handleOptionChange = (mealId: string, option: MealOption) => {
    setSelectedOptions(prev => {
      const newMap = new Map(prev)
      newMap.set(mealId, option)
      return newMap
    })
  }

  const getCurrentMealIngredients = (meal: Meal): Ingredient[] => {
    const selectedOption = selectedOptions.get(meal.id) || 'A'
    if (selectedOption === 'B' && alternateMeals.has(meal.id)) {
      return alternateMeals.get(meal.id)!.ingredients
    }
    return meal.ingredients
  }

  if (loading) {
    return (
      <Card className="diet-meals-card">
        <CardTitle>Meal Plan</CardTitle>
        <p className="diet-loading">Loading meals...</p>
      </Card>
    )
  }

  if (meals.length === 0) {
    return (
      <Card className="diet-meals-card">
        <CardTitle>Meal Plan</CardTitle>
        <p className="diet-empty">No meal plan configured yet.</p>
      </Card>
    )
  }

  return (
    <Card className="diet-meals-card">
      <CardTitle>Meal Plan</CardTitle>

      <div className="meals-list">
        {meals.map((meal) => {
          const currentIngredients = getCurrentMealIngredients(meal)
          const totals = calculateMealTotals(currentIngredients)
          const selectedOption = selectedOptions.get(meal.id) || 'A'
          const showSwitcher = isPro && meal.hasAlternate

          return (
            <div key={meal.id} className="meal-card">
              <div className="meal-header">
                <div className="meal-header-left">
                  <h3 className="meal-title">{getMealLabel(meal)}</h3>
                  {showSwitcher && (
                    <div className="meal-option-switcher">
                      <button
                        className={`option-btn ${selectedOption === 'A' ? 'active' : ''}`}
                        onClick={() => handleOptionChange(meal.id, 'A')}
                      >
                        Option A
                      </button>
                      <button
                        className={`option-btn ${selectedOption === 'B' ? 'active' : ''}`}
                        onClick={() => handleOptionChange(meal.id, 'B')}
                      >
                        Option B
                      </button>
                    </div>
                  )}
                </div>
                <div className="meal-totals">
                  <span className="meal-total-item">
                    <strong>{totals.calories}</strong> kcal
                  </span>
                  <span className="meal-total-item">
                    <strong>{totals.protein}</strong>g P
                  </span>
                  <span className="meal-total-item">
                    <strong>{totals.carbs}</strong>g C
                  </span>
                  <span className="meal-total-item">
                    <strong>{totals.fat}</strong>g F
                  </span>
                </div>
              </div>

              {currentIngredients.length === 0 ? (
                <p className="no-ingredients">No ingredients added</p>
              ) : (
                <div className="ingredients-list">
                  {currentIngredients.map((ingredient) => (
                    <div key={ingredient.id} className="ingredient-item">
                      <div className="ingredient-main">
                        <span className="ingredient-name">{ingredient.name}</span>
                        <span className="ingredient-quantity">{ingredient.grams}g</span>
                      </div>
                      <div className="ingredient-macros">
                        {formatMacros(ingredient)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
