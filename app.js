"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

const nutrientTargets = {
  protein_g: 110,
  fiber_g: 30,
  calcium_mg: 1000,
  iron_mg: 18,
  vitamin_d_mcg: 15,
  b12_mcg: 2.4,
  potassium_mg: 3500,
  sodium_mg: 2300,
};

const allergenMap = {
  peanut: ["peanut", "peanuts"],
  peanuts: ["peanut", "peanuts"],
  dairy: ["milk", "curd", "paneer", "cheese", "yogurt", "ghee", "butter"],
  milk: ["milk", "curd", "paneer", "cheese", "yogurt", "ghee", "butter"],
  gluten: ["wheat", "bread", "roti", "naan", "pasta"],
  egg: ["egg", "eggs"],
  eggs: ["egg", "eggs"],
  soy: ["soy", "tofu", "soy sauce"],
  shellfish: ["prawn", "shrimp", "crab"],
};

const mealLibrary = {
  indian: [
    meal("breakfast", "Moong Dal Chilla with Mint Curd", "restaurant", ["moong dal", "curd", "mint", "onion"], [310, 21, 38, 8], [8, 210, 4.1, 1.2, 0.7, 520, 420], 18, ["High-protein Indian breakfast", "Slow carbs improve satiety"]),
    meal("breakfast", "Vegetable Poha with Sprouts", "rice_bowl", ["poha", "sprouts", "peas", "peanuts", "lemon"], [360, 14, 58, 10], [7, 110, 3.2, 0.6, 0.2, 480, 360], 20, ["Budget friendly", "Vitamin C from lemon supports iron absorption"]),
    meal("breakfast", "Oats Idli with Sambar", "breakfast_dining", ["oats", "curd", "dal", "vegetables"], [340, 16, 55, 7], [9, 230, 3.8, 1.1, 0.8, 650, 510], 25, ["Fermented base supports gut health", "Good fiber for steady energy"]),
    meal("lunch", "Rajma Brown Rice Bowl", "rice_bowl", ["rajma", "brown rice", "tomato", "onion", "cucumber"], [610, 25, 94, 13], [17, 170, 6.8, 0.7, 0.1, 980, 680], 35, ["Excellent fiber coverage", "Legume protein improves fullness"]),
    meal("lunch", "Paneer Tikka Millet Bowl", "lunch_dining", ["paneer", "millet", "capsicum", "curd"], [650, 36, 62, 27], [8, 620, 3.3, 1.6, 1.2, 710, 640], 30, ["High protein vegetarian meal", "Calcium-rich for bone support"]),
    meal("lunch", "Grilled Chicken Roti Plate", "lunch_dining", ["chicken", "wheat roti", "salad", "curd"], [640, 48, 58, 18], [9, 260, 4.4, 2.2, 1.5, 880, 720], 35, ["Strong lean-protein option", "Balanced for muscle repair"]),
    meal("snack", "Roasted Chana and Fruit Bowl", "nutrition", ["roasted chana", "apple", "pumpkin seeds"], [260, 13, 38, 7], [8, 80, 2.7, 0.3, 0.1, 430, 120], 5, ["Portable budget snack", "Fiber plus protein reduces cravings"]),
    meal("snack", "Greek Yogurt Berry Cup", "icecream", ["greek yogurt", "berries", "chia seeds"], [250, 22, 24, 8], [7, 300, 1.4, 1.3, 0.9, 330, 95], 6, ["Protein-dense snack", "Chia adds omega-friendly fats"]),
    meal("dinner", "Dal Palak with Quinoa", "dinner_dining", ["dal", "spinach", "quinoa", "tomato"], [540, 27, 76, 13], [16, 240, 7.2, 1.1, 0.2, 1100, 560], 32, ["Iron-rich dinner", "High fiber supports digestion"]),
    meal("dinner", "Fish Curry with Red Rice", "set_meal", ["fish", "red rice", "coconut", "vegetables"], [590, 42, 61, 20], [7, 160, 2.1, 4.8, 2.3, 760, 690], 35, ["Omega-3 supportive", "High-quality protein for recovery"]),
  ],
  mediterranean: [
    meal("breakfast", "Greek Yogurt Parfait", "breakfast_dining", ["greek yogurt", "berries", "walnuts", "oats"], [370, 25, 42, 13], [8, 330, 1.5, 1.8, 1.1, 430, 110], 8, ["Protein-rich start", "Good gut-friendly option"]),
    meal("lunch", "Chickpea Quinoa Power Bowl", "lunch_dining", ["chickpeas", "quinoa", "feta", "cucumber"], [620, 26, 78, 22], [15, 280, 5.6, 1.2, 0.7, 820, 670], 18, ["Fiber-heavy lunch", "Stable afternoon energy"]),
    meal("snack", "Hummus Veggie Plate", "nutrition", ["hummus", "carrot", "cucumber", "pita"], [280, 10, 34, 12], [8, 100, 2.4, 0.5, 0.1, 460, 410], 5, ["Crunchy high-fiber snack", "Easy meal-prep item"]),
    meal("dinner", "Salmon Sweet Potato Plate", "dinner_dining", ["salmon", "sweet potato", "greens", "olive oil"], [650, 43, 55, 28], [10, 180, 2.9, 8.5, 4.1, 1150, 520], 30, ["Omega-3 rich dinner", "Potassium supports recovery"]),
  ],
  global: [
    meal("breakfast", "Tofu Scramble Toast", "breakfast_dining", ["tofu", "whole grain bread", "spinach"], [390, 27, 37, 15], [8, 380, 4.8, 1.4, 0.2, 620, 540], 15, ["Vegan protein option", "Iron-rich with greens"]),
    meal("lunch", "Turkey Avocado Wrap", "wrap_text", ["turkey", "wheat wrap", "avocado", "lettuce"], [560, 39, 45, 25], [8, 160, 2.2, 1.8, 1.1, 760, 820], 12, ["High satiety lunch", "Healthy fats improve fullness"]),
    meal("snack", "Protein Smoothie", "local_drink", ["milk", "banana", "protein powder", "peanut butter"], [330, 31, 33, 9], [5, 320, 1.1, 1.4, 1.7, 650, 210], 5, ["Fast post-workout option", "Easy calorie control"]),
    meal("dinner", "Tofu Vegetable Stir Fry", "dinner_dining", ["tofu", "rice", "broccoli", "soy sauce"], [590, 31, 73, 19], [10, 420, 4.9, 1.3, 0.4, 870, 950], 25, ["Plant-forward dinner", "Good calcium if calcium-set tofu is used"]),
  ],
};

const swaps = {
  paneer: "tofu or grilled chicken",
  curd: "coconut yogurt",
  yogurt: "coconut yogurt",
  milk: "fortified soy or almond milk",
  peanuts: "pumpkin seeds",
  peanut: "pumpkin seeds",
  wheat: "jowar or rice roti",
  "wheat roti": "jowar roti",
  tofu: "paneer or chickpeas",
  fish: "tofu tikka or chicken",
  chicken: "paneer or tofu",
};

let currentMeals = [];
let currentProfile = null;
let charts = {};

function meal(type, name, icon, ingredients, macros, micros, prep, reasons) {
  const [kcal, protein, carbs, fat] = macros;
  const [fiber, calcium, iron, vitaminD, b12, potassium, sodium] = micros;
  return {
    type,
    name,
    icon,
    ingredients,
    nutrition: { kcal, protein, carbs, fat },
    micros: { fiber, calcium, iron, vitaminD, b12, potassium, sodium },
    prep,
    reasons,
    steps: [
      "Prep and portion ingredients based on your calorie target.",
      "Cook with minimal oil and keep salt moderate.",
      "Serve with vegetables or salad to improve fiber and micronutrient density.",
    ],
  };
}

function parseList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function calcCalories(profile) {
  const { age, height_cm, weight_kg, gender, activity_level, health_goal } = profile;
  const female = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  const male = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  const neutral = (female + male) / 2;
  const bmr = gender === "female" ? female : gender === "male" ? male : neutral;
  const activity = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
  let calories = bmr * (activity[activity_level] || 1.55);
  if (health_goal === "weight_loss") calories -= 400;
  if (health_goal === "muscle_gain") calories += 280;
  return Math.max(1400, Math.round(calories));
}

function calcMacroTargets(kcal, profile) {
  const proteinPerKg = profile.health_goal === "muscle_gain" ? 1.9 : profile.health_goal === "weight_loss" ? 1.7 : 1.45;
  const protein = Math.round(profile.weight_kg * proteinPerKg);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return { protein, carbs, fat };
}

function isUnsafe(mealItem, profile) {
  const ingredientText = mealItem.ingredients.join(" ").toLowerCase();
  const allergyWords = profile.allergies.flatMap((item) => allergenMap[item] || [item]);
  const dislikeWords = profile.dislikes;
  const blocked = [...allergyWords, ...dislikeWords];
  return blocked.some((word) => ingredientText.includes(word));
}

function fitsDiet(mealItem, diet) {
  const text = mealItem.ingredients.join(" ").toLowerCase();
  const animal = ["chicken", "fish", "turkey", "salmon", "egg"];
  const dairy = ["paneer", "curd", "milk", "cheese", "yogurt", "feta", "ghee"];
  const root = ["onion", "garlic"];
  if (diet === "vegan") return ![...animal, ...dairy].some((x) => text.includes(x));
  if (diet === "jain") return ![...animal, ...root].some((x) => text.includes(x));
  if (diet === "vegetarian") return !animal.some((x) => text.includes(x));
  return true;
}

function conditionReasons(profile) {
  if (profile.condition === "diabetes") return "Blood sugar mode: favors fiber-rich meals and avoids very high sugar choices.";
  if (profile.condition === "hypertension") return "Low sodium mode: watch salt, sauces, packaged snacks, and pick potassium-rich foods.";
  if (profile.condition === "pcos") return "PCOS mode: emphasizes protein, fiber, and steadier carb portions.";
  return "General wellness mode: balanced macros, fiber, and micronutrient coverage.";
}

function buildPlan(profile) {
  const library = [...mealLibrary[profile.cuisine], ...mealLibrary.indian, ...mealLibrary.global, ...mealLibrary.mediterranean];
  const types = profile.meal_count === 3 ? ["breakfast", "lunch", "dinner"] : profile.meal_count === 5 ? ["breakfast", "lunch", "snack", "snack", "dinner"] : ["breakfast", "lunch", "snack", "dinner"];
  return types.map((type, index) => {
    const options = library.filter((item) => item.type === type && fitsDiet(item, profile.diet_preference) && !isUnsafe(item, profile));
    const fallback = library.filter((item) => item.type === type && fitsDiet(item, profile.diet_preference));
    const pool = options.length ? options : fallback.length ? fallback : library.filter((item) => item.type === type);
    const selected = structuredClone(pool[index % pool.length]);
    selected.reasons = [
      ...selected.reasons,
      conditionReasons(profile),
      `Fits ${profile.budget.replace("_", " ")} and ${profile.time.replace("_", " ")} preferences.`,
    ];
    return selected;
  });
}

function totals(meals) {
  return meals.reduce(
    (sum, item) => {
      sum.kcal += item.nutrition.kcal;
      sum.protein += item.nutrition.protein;
      sum.carbs += item.nutrition.carbs;
      sum.fat += item.nutrition.fat;
      Object.entries(item.micros).forEach(([key, val]) => {
        sum[key] = (sum[key] || 0) + val;
      });
      return sum;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, vitaminD: 0, b12: 0, potassium: 0, sodium: 0 },
  );
}

function scorePlan(total, targetMacros, profile) {
  const proteinScore = Math.min(100, (total.protein / targetMacros.protein) * 100);
  const fiberScore = Math.min(100, (total.fiber / nutrientTargets.fiber_g) * 100);
  const microScore = ["calcium", "iron", "vitaminD", "b12", "potassium"]
    .map((key) => Math.min(100, (total[key] / targetFor(key)) * 100))
    .reduce((a, b) => a + b, 0) / 5;
  const sodiumScore = total.sodium > nutrientTargets.sodium_mg ? 65 : 100;
  const safetyScore = profile.allergies.length ? 95 : 100;
  return Math.round(proteinScore * 0.25 + fiberScore * 0.2 + microScore * 0.3 + sodiumScore * 0.15 + safetyScore * 0.1);
}

function targetFor(key) {
  return {
    fiber: nutrientTargets.fiber_g,
    calcium: nutrientTargets.calcium_mg,
    iron: nutrientTargets.iron_mg,
    vitaminD: nutrientTargets.vitamin_d_mcg,
    b12: nutrientTargets.b12_mcg,
    potassium: nutrientTargets.potassium_mg,
    sodium: nutrientTargets.sodium_mg,
  }[key];
}

function formatMealType(type, index) {
  if (type === "snack") return index > 2 ? "Snack 2" : "Snack";
  return type[0].toUpperCase() + type.slice(1);
}

function renderMeals(meals) {
  $("#meal-grid").innerHTML = meals
    .map((item, index) => `
      <article class="meal-card">
        <div class="meal-visual">
          <span class="meal-tag">${formatMealType(item.type, index)}</span>
          <span class="msymbol">${item.icon}</span>
        </div>
        <div class="meal-body">
          <div class="meal-meta">
            <span>${item.nutrition.kcal} kcal</span>
            <span>${item.prep} min</span>
          </div>
          <h3>${item.name}</h3>
          <div class="macro-row">
            <span class="macro-pill"><strong>${item.nutrition.protein}g</strong> P</span>
            <span class="macro-pill"><strong>${item.nutrition.carbs}g</strong> C</span>
            <span class="macro-pill"><strong>${item.nutrition.fat}g</strong> F</span>
            <span class="macro-pill"><strong>${item.micros.fiber}g</strong> fiber</span>
          </div>
          <ul class="reason-list">
            ${item.reasons.slice(0, 3).map((reason) => `<li><span class="msymbol">check_circle</span><span>${reason}</span></li>`).join("")}
          </ul>
          <div class="meal-actions">
            <button type="button" data-action="recipe" data-index="${index}">Recipe</button>
            <button type="button" data-action="swap" data-index="${index}">Swap</button>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderTarget(kcal, macros, profile) {
  $("#kcal-display").textContent = kcal.toLocaleString();
  $("#hero-kcal").textContent = kcal.toLocaleString();
  $("#kcal-note").textContent = `Goal: ${profile.health_goal.replace("_", " ")}. Activity: ${profile.activity_level}. Minimum safety floor applied.`;
  $("#mini-protein").textContent = `${macros.protein}g`;
  $("#mini-carbs").textContent = `${macros.carbs}g`;
  $("#mini-fat").textContent = `${macros.fat}g`;
}

function chart(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id), config);
}

function renderCharts(meals, total, targetMacros) {
  const textColor = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
  chart("#calorie-chart", {
    type: "bar",
    data: {
      labels: meals.map((m) => m.type.toUpperCase().slice(0, 3)),
      datasets: [{ data: meals.map((m) => m.nutrition.kcal), backgroundColor: "#16a34a", borderRadius: 10 }],
    },
    options: baseChartOptions(textColor, false),
  });

  const macroCalories = [total.protein * 4, total.carbs * 4, total.fat * 9];
  chart("#macro-chart", {
    type: "doughnut",
    data: {
      labels: ["Protein", "Carbs", "Fat"],
      datasets: [{ data: macroCalories, backgroundColor: ["#16a34a", "#2563eb", "#f97316"], borderWidth: 0 }],
    },
    options: { ...baseChartOptions(textColor, true), cutout: "62%" },
  });

  const microLabels = ["Fiber", "Calcium", "Iron", "Vit D", "B12", "Potassium"];
  const microData = [
    (total.fiber / targetFor("fiber")) * 100,
    (total.calcium / targetFor("calcium")) * 100,
    (total.iron / targetFor("iron")) * 100,
    (total.vitaminD / targetFor("vitaminD")) * 100,
    (total.b12 / targetFor("b12")) * 100,
    (total.potassium / targetFor("potassium")) * 100,
  ].map((n) => Math.min(130, Math.round(n)));
  chart("#micro-chart", {
    type: "bar",
    data: {
      labels: microLabels,
      datasets: [
        { label: "Coverage %", data: microData, backgroundColor: microData.map((n) => (n < 70 ? "#f97316" : "#16a34a")), borderRadius: 10 },
      ],
    },
    options: {
      ...baseChartOptions(textColor, false),
      scales: {
        y: { min: 0, max: 130, ticks: { callback: (value) => `${value}%`, color: textColor }, grid: { color: "rgba(100,116,139,0.16)" } },
        x: { ticks: { color: textColor }, grid: { display: false } },
      },
    },
  });

  const radarData = [
    Math.min(100, (total.protein / targetMacros.protein) * 100),
    Math.min(100, (total.fiber / targetFor("fiber")) * 100),
    Math.min(100, (total.calcium / targetFor("calcium")) * 100),
    Math.min(100, (total.iron / targetFor("iron")) * 100),
    total.sodium <= nutrientTargets.sodium_mg ? 100 : 65,
    Math.min(100, (total.potassium / targetFor("potassium")) * 100),
  ].map(Math.round);
  chart("#radar-chart", {
    type: "radar",
    data: {
      labels: ["Protein", "Fiber", "Calcium", "Iron", "Sodium", "Potassium"],
      datasets: [{ data: radarData, backgroundColor: "rgba(22,163,74,0.18)", borderColor: "#16a34a", pointBackgroundColor: "#16a34a" }],
    },
    options: {
      ...baseChartOptions(textColor, true),
      scales: { r: { min: 0, max: 100, ticks: { display: false }, pointLabels: { color: textColor, font: { weight: "700" } }, grid: { color: "rgba(100,116,139,0.18)" }, angleLines: { color: "rgba(100,116,139,0.18)" } } },
    },
  });
}

function baseChartOptions(textColor, showLegend) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: showLegend, labels: { color: textColor, boxWidth: 10 } } },
    scales: {
      y: { ticks: { color: textColor }, grid: { color: "rgba(100,116,139,0.16)" } },
      x: { ticks: { color: textColor }, grid: { display: false } },
    },
  };
}

function renderGaps(total, targetMacros, profile) {
  const gaps = [
    ["Protein", total.protein, targetMacros.protein, "g"],
    ["Fiber", total.fiber, targetFor("fiber"), "g"],
    ["Calcium", total.calcium, targetFor("calcium"), "mg"],
    ["Iron", total.iron, targetFor("iron"), "mg"],
    ["Vitamin D", total.vitaminD, targetFor("vitaminD"), "mcg"],
    ["B12", total.b12, targetFor("b12"), "mcg"],
    ["Potassium", total.potassium, targetFor("potassium"), "mg"],
  ];
  $("#gap-list").innerHTML = gaps
    .map(([name, actual, target, unit]) => {
      const pct = Math.round((actual / target) * 100);
      return `<div class="gap ${pct < 70 ? "low" : ""}"><span>${name}</span><strong>${round(actual)}${unit} / ${target}${unit} (${pct}%)</strong></div>`;
    })
    .join("");

  const recommendations = [];
  if (total.protein < targetMacros.protein) recommendations.push(["Increase protein", "Add dal, paneer, tofu, eggs, chicken, fish, or Greek yogurt depending on your diet."]);
  if (total.fiber < targetFor("fiber")) recommendations.push(["Raise fiber", "Add beans, sprouts, oats, vegetables, chia seeds, or fruit skins."]);
  if (total.iron < targetFor("iron")) recommendations.push(["Improve iron", "Use spinach, rajma, lentils, tofu, or lean meat. Pair plant iron with lemon or amla."]);
  if (total.vitaminD < targetFor("vitaminD")) recommendations.push(["Vitamin D warning", "Food alone may not be enough. Consider sunlight and professional guidance for supplements."]);
  if (profile.condition === "hypertension" || total.sodium > nutrientTargets.sodium_mg) recommendations.push(["Sodium caution", "Reduce packaged foods, sauces, pickles, papad, and extra salt."]);
  if (!recommendations.length) recommendations.push(["Balanced day", "Your plan covers the major targets well. Keep hydration and sleep consistent."]);

  $("#recommendations").innerHTML = recommendations
    .map(([title, body]) => `<div class="recommendation"><strong>${title}</strong><p>${body}</p></div>`)
    .join("");
}

function round(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function renderWeeklyPlan(meals) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  $("#weekly-plan").innerHTML = dayNames
    .map((day, i) => {
      const main = meals[i % meals.length];
      const dinner = meals[(i + 2) % meals.length];
      return `<div class="week-day"><strong>${day}</strong><p>${main.name} + ${dinner.name}</p></div>`;
    })
    .join("");
}

function renderGrocery(meals) {
  const unique = [...new Set(meals.flatMap((item) => item.ingredients))].sort();
  $("#grocery-list").innerHTML = unique.map((item) => `<span>${titleCase(item)}</span>`).join("");
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function openRecipe(index) {
  const item = currentMeals[index];
  $("#dialog-title").textContent = item.name;
  $("#dialog-content").innerHTML = `
    <div class="recipe-columns">
      <section>
        <h3>Ingredients</h3>
        <div>${item.ingredients.map((ing) => `<span class="ingredient-chip">${titleCase(ing)}</span>`).join("")}</div>
      </section>
      <section>
        <h3>Nutrition</h3>
        <div class="gap-list">
          <div class="gap"><span>Calories</span><strong>${item.nutrition.kcal} kcal</strong></div>
          <div class="gap"><span>Protein</span><strong>${item.nutrition.protein}g</strong></div>
          <div class="gap"><span>Fiber</span><strong>${item.micros.fiber}g</strong></div>
          <div class="gap"><span>Sodium</span><strong>${item.micros.sodium}mg</strong></div>
        </div>
      </section>
    </div>
    <section style="margin-top:18px">
      <h3>Steps</h3>
      <ol>${item.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
    </section>
    <section style="margin-top:18px">
      <h3>Why this meal?</h3>
      <ul>${item.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>
    </section>
  `;
  $("#recipe-dialog").showModal();
}

function swapMeal(index) {
  const old = currentMeals[index];
  const library = [...mealLibrary[currentProfile.cuisine], ...mealLibrary.indian, ...mealLibrary.global, ...mealLibrary.mediterranean];
  const option = library.find((item) => item.type === old.type && item.name !== old.name && fitsDiet(item, currentProfile.diet_preference) && !isUnsafe(item, currentProfile));
  if (!option) return;
  currentMeals[index] = structuredClone(option);
  currentMeals[index].reasons = [...currentMeals[index].reasons, "Swapped while preserving diet and allergy filters."];
  refreshOutputs(false);
}

function refreshOutputs(scrollToPlan = true) {
  const kcal = calcCalories(currentProfile);
  const targetMacros = calcMacroTargets(kcal, currentProfile);
  const total = totals(currentMeals);
  const score = scorePlan(total, targetMacros, currentProfile);
  renderTarget(kcal, targetMacros, currentProfile);
  renderMeals(currentMeals);
  renderCharts(currentMeals, total, targetMacros);
  renderGaps(total, targetMacros, currentProfile);
  renderWeeklyPlan(currentMeals);
  renderGrocery(currentMeals);
  $("#plan-score").textContent = score;
  $("#hero-score").textContent = score;
  $("#score-note").textContent = score >= 85 ? "Strong coverage with only small improvements needed." : score >= 70 ? "Useful plan, but the gaps below should be fixed." : "Needs improvement before it feels trustworthy.";
  $("#safety-badge").classList.toggle("hidden", !currentProfile.allergies.length && currentProfile.condition === "none");
  $$(".journey-step").forEach((step) => step.classList.add("active"));
  if (scrollToPlan) $("#meal-plan").scrollIntoView({ behavior: "smooth", block: "start" });
}

function normalizeApiMeal(item) {
  const micros = item.micronutrients || {};
  const nutrition = item.nutrition || {};
  return {
    type: item.meal_type || item.type || "meal",
    name: item.title || item.name || "Balanced meal",
    icon: item.icon || "restaurant",
    ingredients: item.ingredients || [],
    nutrition: {
      kcal: Math.round(nutrition.calories_kcal || nutrition.kcal || 0),
      protein: Math.round(nutrition.protein_g || nutrition.protein || 0),
      carbs: Math.round(nutrition.carbs_g || nutrition.carbs || 0),
      fat: Math.round(nutrition.fat_g || nutrition.fat || 0),
    },
    micros: {
      fiber: Number(micros.fiber_g || micros.fiber || 0),
      calcium: Number(micros.calcium_mg || micros.calcium || 0),
      iron: Number(micros.iron_mg || micros.iron || 0),
      vitaminD: Number(micros.vitamin_d_mcg || micros.vitaminD || 0),
      b12: Number(micros.b12_mcg || micros.b12 || 0),
      potassium: Number(micros.potassium_mg || micros.potassium || 0),
      sodium: Number(micros.sodium_mg || micros.sodium || 0),
    },
    prep: item.prep || 20,
    reasons: item.reasons || ["Generated from your backend profile and safety filters."],
    steps: item.steps || [
      "Prepare ingredients and portion according to your calorie target.",
      "Cook with moderate oil and salt.",
      "Serve with vegetables or salad for better nutrient density.",
    ],
  };
}

$("#profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#generate-btn");
  const originalButton = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="msymbol">progress_activity</span> Generating plan`;
  const fd = new FormData(event.currentTarget);
  currentProfile = {
    age: Number(fd.get("age")),
    gender: fd.get("gender"),
    height_cm: Number(fd.get("height_cm")),
    weight_kg: Number(fd.get("weight_kg")),
    activity_level: fd.get("activity_level"),
    health_goal: fd.get("health_goal"),
    diet_preference: fd.get("diet_preference"),
    cuisine: fd.get("cuisine"),
    budget: fd.get("budget"),
    meal_count: fd.get("meal_count"),
    condition: fd.get("condition"),
    time: fd.get("time"),
    allergies: parseList(fd.get("allergies")),
    dislikes: parseList(fd.get("dislikes")),
  };

  try {
    await fetchJSON("/api/profile", {
      method: "POST",
      body: JSON.stringify(currentProfile),
    });
    const response = await fetchJSON("/api/query", {
      method: "POST",
      body: JSON.stringify({ query_type: "daily_plan", user_input: "" }),
    });
    currentMeals = response.meals?.length ? response.meals.map(normalizeApiMeal) : buildPlan(currentProfile);
    $("#profile-status").textContent = "Backend plan generated with richer nutrient analysis and safety filters.";
  } catch (error) {
    currentMeals = buildPlan(currentProfile);
    $("#profile-status").textContent = "Offline mode used. Start the FastAPI backend for AI-backed plans.";
  }
  $("#profile-status").className = "status-msg success";
  refreshOutputs();
  button.disabled = false;
  button.innerHTML = originalButton;
});

$("#meal-grid").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === "recipe") openRecipe(index);
  if (button.dataset.action === "swap") swapMeal(index);
});

$("#dialog-close").addEventListener("click", () => $("#recipe-dialog").close());

$("#theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  $("#theme-icon").textContent = document.documentElement.classList.contains("dark") ? "light_mode" : "dark_mode";
  if (currentMeals.length) {
    const kcal = calcCalories(currentProfile);
    renderCharts(currentMeals, totals(currentMeals), calcMacroTargets(kcal, currentProfile));
  }
});

$("#hero-cta").addEventListener("click", () => $("#profile").scrollIntoView({ behavior: "smooth" }));

$("#ingredients-btn").addEventListener("click", async () => {
  const ingredients = parseList($("#ingredients-input").value);
  const results = $("#ingredient-results");
  if (!ingredients.length) {
    results.innerHTML = `<div class="ingredient-item"><strong>Add ingredients first</strong><p class="muted">Example: eggs, spinach, tomato, quinoa.</p></div>`;
    return;
  }
  try {
    const response = await fetchJSON("/api/query", {
      method: "POST",
      body: JSON.stringify({ query_type: "ingredient_based", user_input: ingredients.join(", ") }),
    });
    const meals = response.meals?.length ? response.meals : [];
    results.innerHTML = meals
      .map((item) => `<div class="ingredient-item"><strong>${item.title}</strong><p class="muted">${Math.round(item.nutrition?.calories_kcal || 0)} kcal • ${Math.round(item.nutrition?.protein_g || 0)}g protein</p></div>`)
      .join("");
  } catch (error) {
    const ideas = [
      `${titleCase(ingredients[0])} protein bowl`,
      `${titleCase(ingredients[0])}${ingredients[1] ? " and " + titleCase(ingredients[1]) : ""} stir fry`,
      `Quick ${titleCase(ingredients[0])} wrap`,
    ];
    results.innerHTML = ideas
      .map((name, i) => `<div class="ingredient-item"><strong>${name}</strong><p class="muted">${260 + i * 90} kcal estimate - add protein and vegetables for better balance.</p></div>`)
      .join("");
  }
});

$("#today-date").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

$("#meal-grid").innerHTML = ["Breakfast", "Lunch", "Snack", "Dinner"]
  .map((name) => `
    <article class="meal-card">
      <div class="meal-visual"><span class="meal-tag">${name}</span><span class="msymbol">restaurant</span></div>
      <div class="meal-body">
        <h3>Awaiting smarter plan...</h3>
        <p class="muted">Complete your profile to generate recipes, groceries, swaps, and nutrient analysis.</p>
      </div>
    </article>
  `)
  .join("");
