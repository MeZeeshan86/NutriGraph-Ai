"use strict";

/*
 * NutriGraph AI frontend.
 * Meal generation and recommendations come from the backend/Gemini.
 */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.detail || data.error || `Request failed (${response.status})`,
    );
  }
  return data;
}

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}
function parseList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function displayNumber(value) {
  const number = numberOrNull(value);
  return number === null
    ? "Not provided"
    : Number.isInteger(number)
      ? String(number)
      : number.toFixed(1);
}
function displayWithUnit(value, unit = "") {
  const shown = displayNumber(value);
  return shown === "Not provided" ? shown : `${shown}${unit}`;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function titleCase(value) {
  return String(value ?? "").replace(/\\b\\w/g, (char) => char.toUpperCase());
}
let currentMeals = [];
let currentProfile = null;
let currentAnalysis = null;
let charts = {};

function normalizeApiMeal(item = {}) {
  const nutrition = item.nutrition || {};
  const micros = item.micronutrients || item.micros || {};
  return {
    type: item.meal_type || item.type || "meal",
    name: item.title || item.name || "AI-generated meal",
    description: item.description || "",
    icon: item.icon || "restaurant",
    ingredients: asArray(item.ingredients),
    nutrition: {
      kcal: numberOrNull(nutrition.calories_kcal ?? nutrition.kcal),
      protein: numberOrNull(nutrition.protein_g ?? nutrition.protein),
      carbs: numberOrNull(nutrition.carbs_g ?? nutrition.carbs),
      fat: numberOrNull(nutrition.fat_g ?? nutrition.fat),
    },
    micros: {
      fiber: numberOrNull(micros.fiber_g ?? micros.fiber),
      sugar: numberOrNull(micros.sugar_g ?? micros.sugar),
      calcium: numberOrNull(micros.calcium_mg ?? micros.calcium),
      iron: numberOrNull(micros.iron_mg ?? micros.iron),
      vitaminD: numberOrNull(micros.vitamin_d_mcg ?? micros.vitaminD),
      b12: numberOrNull(micros.b12_mcg ?? micros.b12),
      potassium: numberOrNull(micros.potassium_mg ?? micros.potassium),
      sodium: numberOrNull(micros.sodium_mg ?? micros.sodium),
    },
    prep: numberOrNull(item.prep_minutes ?? item.prep),
    reasons: asArray(item.reasons),
    steps: asArray(item.steps),
  };
}
function mealTypeLabel(type, index) {
  const normalized = String(type || "meal").toLowerCase();
  return normalized === "snack" && index > 2
    ? "Snack 2"
    : normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
function sumKnown(values) {
  const known = values.filter((value) => numberOrNull(value) !== null);
  return known.length
    ? known.reduce((sum, value) => sum + Number(value), 0)
    : null;
}
function getTotals(meals) {
  return {
    kcal: sumKnown(meals.map((m) => m.nutrition.kcal)),
    protein: sumKnown(meals.map((m) => m.nutrition.protein)),
    carbs: sumKnown(meals.map((m) => m.nutrition.carbs)),
    fat: sumKnown(meals.map((m) => m.nutrition.fat)),
    fiber: sumKnown(meals.map((m) => m.micros.fiber)),
    calcium: sumKnown(meals.map((m) => m.micros.calcium)),
    iron: sumKnown(meals.map((m) => m.micros.iron)),
    vitaminD: sumKnown(meals.map((m) => m.micros.vitaminD)),
    b12: sumKnown(meals.map((m) => m.micros.b12)),
    potassium: sumKnown(meals.map((m) => m.micros.potassium)),
    sodium: sumKnown(meals.map((m) => m.micros.sodium)),
  };
}

function renderMeals(meals) {
  const grid = $("#meal-grid");
  if (!grid) return;
  if (!meals.length) {
    grid.innerHTML =
      '<div class="ingredient-item"><strong>No meals to display</strong><p>Generate a plan using your profile.</p></div>';
    return;
  }
  grid.innerHTML = meals
    .map(
      (item, index) => `
    <article class="meal-card">
      <div class="meal-visual">
        <span class="meal-tag">${escapeHTML(mealTypeLabel(item.type, index))}</span>
        <span class="msymbol">${escapeHTML(item.icon)}</span>
      </div>
      <div class="meal-body">
        <div class="meal-meta">
          <span>${escapeHTML(displayWithUnit(item.nutrition.kcal, " kcal"))}</span>
          <span>${escapeHTML(displayWithUnit(item.prep, " min"))}</span>
        </div>
        <h3>${escapeHTML(item.name)}</h3>
        ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}
        <div class="macro-row">
          <span class="macro-pill"><strong>${escapeHTML(displayNumber(item.nutrition.protein))}g</strong> P</span>
          <span class="macro-pill"><strong>${escapeHTML(displayNumber(item.nutrition.carbs))}g</strong> C</span>
          <span class="macro-pill"><strong>${escapeHTML(displayNumber(item.nutrition.fat))}g</strong> F</span>
          <span class="macro-pill"><strong>${escapeHTML(displayNumber(item.micros.fiber))}g</strong> fiber</span>
        </div>
        ${
          item.reasons.length
            ? `<ul class="reason-list">${item.reasons
                .slice(0, 3)
                .map((reason) => `<li>${escapeHTML(reason)}</li>`)
                .join("")}</ul>`
            : ""
        }
        <div class="meal-actions">
          <button type="button" data-action="recipe" data-index="${index}">Recipe</button>
          <button type="button" data-action="swap" data-index="${index}">Ask AI to swap</button>
        </div>
      </div>
    </article>`,
    )
    .join("");
}

function renderNutritionSummary(meals) {
  const totals = getTotals(meals);
  const container =
    $("#nutrition-summary") || $("#daily-summary") || $("#nutrition-stats");
  if (!container) return;
  const values = [
    { label: "Calories", value: totals.kcal, unit: " kcal" },
    { label: "Protein", value: totals.protein, unit: " g" },
    { label: "Carbs", value: totals.carbs, unit: " g" },
    { label: "Fat", value: totals.fat, unit: " g" },
  ];
  container.innerHTML = values
    .map(
      (item) => `
    <div class="stat-card"><span class="stat-label">${escapeHTML(item.label)}</span>
    <strong class="stat-value">${escapeHTML(displayWithUnit(item.value, item.unit))}</strong></div>
  `,
    )
    .join("");
}

function renderMicronutrients(meals) {
  const totals = getTotals(meals);
  const container = $("#micronutrient-list");
  if (!container) return;
  const items = [
    ["Fiber", totals.fiber, "g"],
    ["Calcium", totals.calcium, "mg"],
    ["Iron", totals.iron, "mg"],
    ["Vitamin D", totals.vitaminD, "mcg"],
    ["Vitamin B12", totals.b12, "mcg"],
    ["Potassium", totals.potassium, "mg"],
    ["Sodium", totals.sodium, "mg"],
  ];
  container.innerHTML = items
    .map(
      ([label, value, unit]) => `
    <div class="micro-row"><span>${escapeHTML(label)}</span>
    <strong>${escapeHTML(displayWithUnit(value, ` ${unit}`))}</strong></div>
  `,
    )
    .join("");
}

function renderCharts(meals) {
  if (typeof Chart === "undefined") return;
  const totals = getTotals(meals);
  const macroCanvas = $("#macro-chart");
  if (macroCanvas) {
    if (charts.macro) charts.macro.destroy();
    const values = [totals.protein, totals.carbs, totals.fat];
    if (values.some((value) => value !== null)) {
      charts.macro = new Chart(macroCanvas, {
        type: "doughnut",
        data: {
          labels: ["Protein", "Carbs", "Fat"],
          datasets: [
            {
              data: values.map((value) => value ?? 0),
              backgroundColor: ["#2563eb", "#f43f5e", "#f59e0b"],
              borderColor: "#ffffff",
              borderWidth: 4,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#52635a",
                padding: 18,
                usePointStyle: true,
                pointStyle: "circle",
                font: {
                  family: "'Plus Jakarta Sans', sans-serif",
                  size: 12,
                  weight: "600",
                },
              },
            },
            tooltip: {
              backgroundColor: "#14251c",
              titleColor: "#ffffff",
              bodyColor: "#e5f2e9",
              padding: 12,
              cornerRadius: 10,
              displayColors: true,
            },
          },
        },
      });
    }
  }
  const caloriesCanvas = $("#calories-chart");
  if (caloriesCanvas) {
    if (charts.calories) charts.calories.destroy();
    charts.calories = new Chart(caloriesCanvas, {
      type: "bar",
      data: {
        labels: meals.map((meal) => titleCase(meal.type)),
        datasets: [
          {
            label: "Calories (AI estimate)",
            data: meals.map((meal) => meal.nutrition.kcal ?? 0),
            backgroundColor: "rgba(37, 99, 235, 0.78)",
            hoverBackgroundColor: "#1d4ed8",
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#52635a",
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: "600",
              },
            },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(82, 99, 90, 0.12)", drawBorder: false },
            ticks: {
              color: "#718078",
              precision: 0,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            },
            border: { display: false },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "#52635a",
              usePointStyle: true,
              pointStyle: "rectRounded",
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
                weight: "600",
              },
            },
          },
          tooltip: {
            backgroundColor: "#14251c",
            titleColor: "#ffffff",
            bodyColor: "#e5f2e9",
            padding: 12,
            cornerRadius: 10,
          },
        },
      },
    });
  }
}

function renderAnalysis(analysis) {
  currentAnalysis = analysis || null;
  const container =
    $("#ai-analysis") || $("#analysis-content") || $("#recommendations");
  if (!container) return;
  if (!analysis) {
    container.innerHTML =
      "<p>AI analysis was not included in the server response.</p>";
    return;
  }
  if (typeof analysis === "string") {
    container.innerHTML = `<p>${escapeHTML(analysis)}</p>`;
    return;
  }
  const sections = [
    ["Summary", analysis.summary],
    ["Strengths", analysis.strengths],
    ["Suggestions", analysis.suggestions],
    ["Considerations", analysis.considerations],
    ["Next steps", analysis.next_steps],
  ];
  container.innerHTML = sections
    .filter(([, value]) =>
      typeof value === "string"
        ? value.trim()
        : Array.isArray(value) && value.length,
    )
    .map(
      ([heading, value]) => `
    <section class="analysis-section"><h3>${escapeHTML(heading)}</h3>
    ${Array.isArray(value) ? `<ul>${value.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : `<p>${escapeHTML(value)}</p>`}
    </section>`,
    )
    .join("");
  if (!container.innerHTML) container.textContent = "No analysis was returned.";
}

function renderPlan(response) {
  currentMeals = asArray(response.meals).map(normalizeApiMeal);
  renderMeals(currentMeals);
  renderNutritionSummary(currentMeals);
  renderMicronutrients(currentMeals);
  renderCharts(currentMeals);
  renderAnalysis(
    response.analysis ?? response.ai_analysis ?? response.explanation ?? null,
  );
  const notice = $("#nutrition-disclaimer");
  if (notice)
    notice.textContent =
      response.nutrition_disclaimer ||
      "Nutrition values are AI-generated estimates, not verified measurements.";
  const count = $("#meal-count");
  if (count) count.textContent = String(currentMeals.length);
  ($("#results-section") || $("#plan-results"))?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function setLoading(button, loading, loadingText = "Generating...") {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Generate plan";
  }
}

function showMessage(message, type = "info") {
  let container = $("#app-message");
  if (!container) {
    container = document.createElement("div");
    container.id = "app-message";
    container.setAttribute("role", "status");
    ($("#app") || $("main") || document.body).prepend(container);
  }
  container.className = `app-message ${type}`;
  container.textContent = message;
}
function showError(error) {
  console.error(error);
  showMessage(
    error?.message || "Something went wrong. Please try again.",
    "error",
  );
}

function getProfileFromForm() {
  const read = (...selectors) => {
    for (const selector of selectors) {
      const element = $(selector);
      if (element && element.value !== undefined) return element.value.trim();
    }
    return "";
  };
  const goal = read(
    "#goal",
    "#health_goal",
    '[name="goal"]',
    '[name="health_goal"]',
  );
  const diet = read(
    "#diet-type",
    "#diet_type",
    "#diet_preference",
    '[name="diet_type"]',
    '[name="diet_preference"]',
  );
  const dislikes = parseList(
    read(
      "#disliked-foods",
      "#disliked_foods",
      "#dislikes",
      '[name="disliked_foods"]',
      '[name="dislikes"]',
    ),
  );
  const cuisines = parseList(
    read(
      "#preferred-cuisines",
      "#preferred_cuisines",
      "#cuisine",
      '[name="preferred_cuisines"]',
      '[name="cuisine"]',
    ),
  );
  const conditions = parseList(
    read(
      "#medical-conditions",
      "#medical_conditions",
      "#condition",
      '[name="medical_conditions"]',
      '[name="condition"]',
    ),
  );
  const mealCount = numberOrNull(
    read(
      "#meals-per-day",
      "#meals_per_day",
      "#meal_count",
      '[name="meals_per_day"]',
      '[name="meal_count"]',
    ),
  );
  return {
    age: numberOrNull(read("#age", '[name="age"]')),
    gender: read("#gender", '[name="gender"]'),
    height_cm: numberOrNull(
      read("#height", "#height_cm", '[name="height_cm"]'),
    ),
    weight_kg: numberOrNull(
      read("#weight", "#weight_kg", '[name="weight_kg"]'),
    ),
    activity_level: read(
      "#activity-level",
      "#activity_level",
      '[name="activity_level"]',
    ),
    goal,
    health_goal: goal,
    diet_type: diet,
    diet_preference: diet,
    allergies: parseList(read("#allergies", '[name="allergies"]')),
    medical_conditions: conditions,
    condition: conditions[0] || "none",
    disliked_foods: dislikes,
    dislikes,
    preferred_cuisines: cuisines,
    cuisine: cuisines[0] || read("#cuisine", '[name="cuisine"]') || "indian",
    meals_per_day: mealCount,
    meal_count: mealCount || 4,
    budget: read("#budget", '[name="budget"]'),
    time: read("#time", '[name="time"]') || "normal",
    additional_notes: read(
      "#additional-notes",
      "#additional_notes",
      '[name="additional_notes"]',
    ),
  };
}

function validateProfile(profile) {
  const errors = [];
  if (profile.age !== null && (profile.age < 1 || profile.age > 120))
    errors.push("Enter a valid age.");
  if (
    profile.height_cm !== null &&
    (profile.height_cm < 30 || profile.height_cm > 300)
  )
    errors.push("Enter a valid height in centimetres.");
  if (
    profile.weight_kg !== null &&
    (profile.weight_kg < 1 || profile.weight_kg > 500)
  )
    errors.push("Enter a valid weight in kilograms.");
  if (errors.length) throw new Error(errors.join(" "));
}

async function saveProfile(options = {}) {
  const button =
    $("#save-profile") ||
    $("#saveProfile") ||
    $('[data-action="save-profile"]');
  try {
    const profile = getProfileFromForm();
    validateProfile(profile);
    if (!options.silent) setLoading(button, true, "Saving profile...");
    const response = await fetchJSON("/api/profile", {
      method: "POST",
      body: JSON.stringify(profile),
    });
    currentProfile = response.profile || profile;
    if (!options.silent) {
      showMessage(response.message || "Profile saved successfully.", "success");
    }
    return currentProfile;
  } catch (error) {
    showError(error);
    return null;
  } finally {
    if (!options.silent) setLoading(button, false);
  }
}

function getUserInstructions() {
  return (
    $("#user-instructions")?.value?.trim() ||
    $("#meal-preferences")?.value?.trim() ||
    $("#additional-notes")?.value?.trim() ||
    ""
  );
}

async function requestAI(payload, button, loadingText) {
  try {
    setLoading(button, true, loadingText);
    const profile = await saveProfile({ silent: true });
    if (!profile) return null;
    const response = await fetchJSON("/api/query", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!Array.isArray(response.meals)) {
      throw new Error(
        "Backend did not return a meals array. Check your FastAPI response.",
      );
    }
    renderPlan(response);
    showMessage(response.message || "AI response received.", "success");
    return response;
  } catch (error) {
    showError(error);
    return null;
  } finally {
    setLoading(button, false);
  }
}

async function generateDailyPlan() {
  const button =
    $("#generate-plan") ||
    $("#generatePlan") ||
    $('[data-action="generate-plan"]');
  await requestAI(
    {
      query_type: "daily_plan",
      user_input: getUserInstructions(),
    },
    button,
    "Generating with AI...",
  );
}

async function generateIngredientMeals() {
  const button =
    $("#generate-ingredients") ||
    $("#generateIngredientMeals") ||
    $('[data-action="generate-ingredients"]');
  const ingredientText =
    $("#ingredients")?.value?.trim() ||
    $("#ingredient-input")?.value?.trim() ||
    $("#available-ingredients")?.value?.trim() ||
    "";
  if (!ingredientText) {
    showMessage("Enter the ingredients you have first.", "error");
    return;
  }
  await requestAI(
    {
      query_type: "ingredient_based",
      user_input: [
        `Available ingredients: ${ingredientText}`,
        getUserInstructions(),
      ]
        .filter(Boolean)
        .join("\\n"),
    },
    button,
    "Generating meals...",
  );
}

async function swapMeal(index) {
  const meal = currentMeals[index];
  if (!meal) {
    showMessage("Could not find that meal.", "error");
    return;
  }
  const request = {
    meal_to_replace: meal,
    user_preferences: currentProfile || getProfileFromForm(),
    instructions: getUserInstructions(),
    all_current_meals: currentMeals,
  };
  const response = await requestAI(
    {
      query_type: "swap_meal",
      user_input: JSON.stringify(request),
    },
    null,
    "Asking AI for a replacement...",
  );
  if (!response || !response.meals.length) return;

  // Replace only the selected card; don't discard the rest of the plan.
  currentMeals[index] = normalizeApiMeal(response.meals[0]);
  renderMeals(currentMeals);
  renderNutritionSummary(currentMeals);
  renderMicronutrients(currentMeals);
  renderCharts(currentMeals);
  renderAnalysis(response.analysis ?? currentAnalysis);
  showMessage("Meal replaced with an AI-generated alternative.", "success");
}

function showRecipe(index) {
  const meal = currentMeals[index];
  if (!meal) return;
  const modal = $("#recipe-modal");
  const content = $("#recipe-content");
  const ingredientHTML = meal.ingredients.length
    ? meal.ingredients
        .map(
          (item) =>
            `<li>${escapeHTML(typeof item === "string" ? item : JSON.stringify(item))}</li>`,
        )
        .join("")
    : "<li>Ingredients were not provided.</li>";
  const stepHTML = meal.steps.length
    ? meal.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")
    : "<li>Preparation steps were not provided.</li>";

  if (modal && content) {
    content.innerHTML = `
      <h2>${escapeHTML(meal.name)}</h2><p>${escapeHTML(meal.description)}</p>
      <h3>Ingredients</h3><ul>${ingredientHTML}</ul>
      <h3>Preparation</h3><ol>${stepHTML}</ol>
      <p>Nutrition values are AI-generated estimates.</p>`;
    modal.hidden = false;
    return;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    showMessage(
      "Recipe popup blocked. Add a recipe modal or allow popups.",
      "error",
    );
    return;
  }
  popup.document
    .write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHTML(meal.name)}</title></head>
  <body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6">
  <h1>${escapeHTML(meal.name)}</h1><p>${escapeHTML(meal.description)}</p>
  <h2>Ingredients</h2><ul>${ingredientHTML}</ul><h2>Preparation</h2><ol>${stepHTML}</ol>
  <small>Nutrition values are AI-generated estimates.</small></body></html>`);
  popup.document.close();
}
function closeRecipe() {
  const modal = $("#recipe-modal");
  if (modal) modal.hidden = true;
}

function bindClick(selector, handler) {
  $$(selector).forEach((element) =>
    element.addEventListener("click", (event) => {
      event.preventDefault();
      handler(event);
    }),
  );
}

function initializeNutriGraph() {
  bindClick(
    '#save-profile, #saveProfile, [data-action="save-profile"]',
    saveProfile,
  );
  bindClick(
    '#generate-plan, #generatePlan, [data-action="generate-plan"]',
    generateDailyPlan,
  );
  bindClick(
    '#generate-ingredients, #generateIngredientMeals, [data-action="generate-ingredients"]',
    generateIngredientMeals,
  );
  bindClick('#close-recipe, [data-action="close-recipe"]', closeRecipe);

  const mealGrid = $("#meal-grid");
  if (mealGrid) {
    mealGrid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index)) return;
      if (button.dataset.action === "recipe") showRecipe(index);
      if (button.dataset.action === "swap") swapMeal(index);
    });
  }

  const modal = $("#recipe-modal");
  if (modal)
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeRecipe();
    });

  console.log("NutriGraph AI frontend initialized.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeNutriGraph, {
    once: true,
  });
} else {
  initializeNutriGraph();
}
