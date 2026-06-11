-- Backfill demo food macros without overwriting manually entered values.
UPDATE "FoodItem"
SET
  "carbsPerPortion" = CASE "name"
    WHEN 'Arroz' THEN 28
    WHEN 'Feijao' THEN 17
    WHEN 'Frango grelhado' THEN 0
    WHEN 'Carne moida' THEN 0
    WHEN 'Pure' THEN 20
    WHEN 'Legumes cozidos' THEN 10
    WHEN 'Sopa' THEN 25
    WHEN 'Fruta' THEN 14
    WHEN 'Suplemento oral hipercalorico' THEN 42
    WHEN 'Bebida lactea' THEN 25
    ELSE "carbsPerPortion"
  END,
  "fatPerPortion" = CASE "name"
    WHEN 'Arroz' THEN 0.3
    WHEN 'Feijao' THEN 0.5
    WHEN 'Frango grelhado' THEN 3.6
    WHEN 'Carne moida' THEN 12
    WHEN 'Pure' THEN 3
    WHEN 'Legumes cozidos' THEN 1
    WHEN 'Sopa' THEN 4
    WHEN 'Fruta' THEN 0.2
    WHEN 'Suplemento oral hipercalorico' THEN 10
    WHEN 'Bebida lactea' THEN 3
    ELSE "fatPerPortion"
  END
WHERE "name" IN (
  'Arroz',
  'Feijao',
  'Frango grelhado',
  'Carne moida',
  'Pure',
  'Legumes cozidos',
  'Sopa',
  'Fruta',
  'Suplemento oral hipercalorico',
  'Bebida lactea'
)
AND ("carbsPerPortion" IS NULL OR "fatPerPortion" IS NULL);

-- Backfill existing meal items from their linked food macros.
UPDATE "MealItem" AS meal_item
SET
  "servedCarbs" = COALESCE(food."carbsPerPortion", 0) * meal_item."servedPortionMultiplier",
  "servedFat" = COALESCE(food."fatPerPortion", 0) * meal_item."servedPortionMultiplier",
  "consumedCarbs" = COALESCE(food."carbsPerPortion", 0) * meal_item."servedPortionMultiplier" *
    CASE meal_item."consumedPercent"
      WHEN 'TWENTY_FIVE' THEN 0.25
      WHEN 'FIFTY' THEN 0.5
      WHEN 'SEVENTY_FIVE' THEN 0.75
      WHEN 'ONE_HUNDRED' THEN 1
      ELSE 0
    END,
  "consumedFat" = COALESCE(food."fatPerPortion", 0) * meal_item."servedPortionMultiplier" *
    CASE meal_item."consumedPercent"
      WHEN 'TWENTY_FIVE' THEN 0.25
      WHEN 'FIFTY' THEN 0.5
      WHEN 'SEVENTY_FIVE' THEN 0.75
      WHEN 'ONE_HUNDRED' THEN 1
      ELSE 0
    END
FROM "FoodItem" AS food
WHERE meal_item."foodItemId" = food."id"
AND (
  meal_item."servedCarbs" = 0
  OR meal_item."servedFat" = 0
  OR meal_item."consumedCarbs" = 0
  OR meal_item."consumedFat" = 0
);
