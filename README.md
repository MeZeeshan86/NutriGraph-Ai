# NutriGraph AI

> **An AI-powered personalized nutrition planner that generates meal plans, analyzes macro and micronutrient intake, detects nutrient gaps, suggests recipe swaps, and creates grocery lists based on a user's health profile.**

NutriGraph AI is a full-stack nutrition intelligence web app built with **HTML, CSS, JavaScript, FastAPI, LangGraph, LangChain, and Groq-ready AI integration**. It helps users move beyond simple calorie counting by creating personalized meal plans and visual nutrition insights based on their goals, diet preferences, allergies, cuisine, budget, and health focus.

---

## Overview

Most nutrition apps focus only on calorie tracking or generic meal suggestions.

**NutriGraph AI is designed to be more useful and explainable.**

Users enter their health and lifestyle information, and the app generates a personalized meal plan with nutrition analysis, meal reasoning, recipe details, swap options, weekly previews, grocery lists, and nutrient gap detection.

### Example

**User profile:**

```text
Age: 22
Goal: Muscle gain
Diet: Vegetarian
Cuisine: Indian
Allergies: Peanuts
Budget: Student budget
Health focus: General wellness
```

NutriGraph AI can generate:

- Personalized calorie target
- Protein, carbs, and fat targets
- Breakfast, lunch, snack, and dinner plan
- Micronutrient analysis
- Nutrient gap warnings
- Meal swap options
- Recipe details
- Weekly plan preview
- Grocery list
- Health-focused recommendations

---

## Key Features

### Personalized Health Profile

Users can enter details such as:

- Age
- Gender / BMR estimate type
- Height
- Weight
- Activity level
- Health goal
- Diet preference
- Cuisine preference
- Budget
- Meal count
- Cooking time
- Allergies
- Food dislikes
- Health focus

This allows the app to create a more personalized plan instead of giving random generic meals.

---

### Smart Calorie and Macro Targets

NutriGraph AI calculates daily calorie needs using the user's body details, activity level, and goal.

It supports:

- Weight loss
- Maintenance
- Muscle gain

The app also calculates macro targets for:

- Protein
- Carbohydrates
- Fats

Protein targets are adjusted based on the user's goal, making the plan more useful for fitness and nutrition planning.

---

### AI-Powered Meal Planning

The app generates a meal plan with:

- Breakfast
- Lunch
- Snack
- Dinner

Each meal card includes:

- Meal name
- Calories
- Protein
- Carbohydrates
- Fat
- Fiber
- Prep time
- Explanation of why the meal was selected

The system is designed to support Groq-powered AI generation while also providing a local fallback planner if no API key is available.

---

### Ingredient-Level Allergy Filtering

NutriGraph AI checks meals against allergy and restriction terms.

Supported examples include:

- Peanut
- Dairy
- Gluten
- Egg
- Soy
- Shellfish

For example, if a user enters `dairy`, the app avoids ingredients such as:

- Milk
- Curd
- Paneer
- Cheese
- Yogurt
- Ghee
- Butter

This makes the project safer and more realistic than simple meal-title filtering.

---

### Meal Swap Feature

Users can replace a meal using the **Swap** button.

The swap system tries to preserve:

- Meal type
- Diet preference
- Allergy restrictions
- Food dislikes
- User preferences

This gives users more control over the plan instead of forcing one fixed recommendation.

---

### Recipe Details

Each meal has a recipe detail view that includes:

- Ingredients
- Nutrition summary
- Preparation steps
- Fiber and sodium information
- Explanation of why the meal fits the user

This makes the app more practical because users can actually understand and prepare the recommended meals.

---

### Nutrient Intelligence Dashboard

NutriGraph AI includes visual dashboards using Chart.js.

Charts include:

- Calories by meal
- Macronutrient distribution
- Micronutrient coverage
- Daily nutrient quality radar

These visuals help users understand their meal plan at a glance.

---

### Micronutrient Analysis

The app analyzes more than just calories and macros.

It also estimates:

- Fiber
- Calcium
- Iron
- Vitamin D
- Vitamin B12
- Potassium
- Sodium

This makes the project more advanced than a basic calorie calculator.

---

### Nutrient Gap Detection

NutriGraph AI compares the generated plan against target nutrient values and highlights gaps.

It can detect issues such as:

- Low protein
- Low fiber
- Low iron
- Low calcium
- Low vitamin D
- Low B12
- High sodium

The app then provides practical recommendations to improve the meal plan.

---

### Health Focus Modes

Users can choose health-oriented planning modes:

- General wellness
- Blood sugar friendly
- Low sodium focus
- PCOS supportive

These modes influence recommendations and help the app feel more personalized.

---

### Weekly Meal Preview

The app generates a simple 7-day meal preview based on the selected meals.

This makes the project feel more like a real nutrition planning product rather than only a one-day demo.

---

### Grocery List Generator

NutriGraph AI automatically creates a grocery list from meal ingredients.

This helps users move from planning to action by showing what they need to buy.

---

### Ingredient-Based Dish Generator

Users can enter ingredients they already have.

Example:

```text
eggs, spinach, tomato, quinoa
```

The app suggests dish ideas using those ingredients.

If the backend is running, it can use the API. If not, it still provides local suggestions.

---

## Architecture

```text
User
  |
  v
Frontend Dashboard
  |
  v
FastAPI Backend
  |
  v
LangGraph Workflow
  |
  +--> Profile Processing
  |
  +--> Meal Generation
  |
  +--> Allergy Filtering
  |
  +--> Nutrition Estimation
  |
  +--> Health Analysis
  |
  v
Structured Nutrition Response
  |
  v
Charts, Meal Cards, Recipes, Grocery List
```

---

## LangGraph Workflow

The backend uses a graph-based workflow for nutrition planning.

```text
START
  |
  v
Meal Generator
  |
  v
Allergy Filter
  |
  v
Nutrition Tool
  |
  v
Health Analysis
  |
  v
Final Response
  |
  v
END
```

This makes the backend easier to extend with more specialized agents in the future.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML | Page structure |
| CSS | Responsive dashboard styling |
| JavaScript | Frontend logic and interactivity |
| Chart.js | Nutrition charts and visualizations |
| Python | Backend development |
| FastAPI | API server |
| LangGraph | Workflow orchestration |
| LangChain | LLM application framework |
| Groq | Optional LLM provider |
| Uvicorn | ASGI server |

---

## Project Structure

Depending on how the project is organized, the files may be placed in one of these structures.

### Simple structure

```text
NutriGraph-AI/
|
|-- index.html
|-- style.css
|-- app.js
|-- main.py
|-- README.md
```

### Recommended structure

```text
NutriGraph-AI/
|
|-- app/
|   |-- main.py
|
|-- static/
|   |-- index.html
|   |-- style.css
|   |-- app.js
|
|-- requirements.txt
|-- README.md
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/NutriGraph-AI.git
```

```bash
cd NutriGraph-AI
```

---

### 2. Create a virtual environment

#### Windows

```bash
python -m venv .venv
```

```bash
.venv\Scripts\activate
```

#### macOS / Linux

```bash
python3 -m venv .venv
```

```bash
source .venv/bin/activate
```

---

### 3. Install dependencies

```bash
pip install fastapi uvicorn langchain-groq langgraph
```

Or, if you have a `requirements.txt` file:

```bash
pip install -r requirements.txt
```

---

## Running the Application

### If `main.py` is in the root folder

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000
```

---

### If `main.py` is inside the `app` folder

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open:

```text
http://127.0.0.1:8000
```

---

## Optional Groq API Setup

NutriGraph AI can run without an API key using the local fallback planner.

To enable Groq-powered AI generation, set your API key:

### Windows PowerShell

```powershell
$env:GROQ_API_KEY="your_api_key_here"
```

### macOS / Linux

```bash
export GROQ_API_KEY="your_api_key_here"
```

You can also create a `.env` file if your deployment setup supports it.

Do not commit secrets to GitHub.

---

## Example Workflow

### Step 1: Enter profile details

```text
Age: 22
Weight: 70 kg
Goal: Muscle gain
Diet: Vegetarian
Cuisine: Indian
Allergies: Peanuts
```

### Step 2: Generate meal plan

The app creates personalized meals for the day.

### Step 3: Analyze nutrients

The dashboard displays:

- Calories per meal
- Macro distribution
- Micronutrient coverage
- Nutrient quality radar

### Step 4: Review recommendations

The app identifies gaps such as low fiber, low vitamin D, low protein, or high sodium.

### Step 5: Use recipe, swap, and grocery tools

Users can view meal details, swap meals, and generate a grocery list.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/profile` | Save user profile |
| `GET` | `/api/profile` | Get current profile |
| `POST` | `/api/query` | Generate meal plan, ingredient dishes, or nutrient analysis |

---

## Future Improvements

Planned improvements include:

- Food image recognition
- Real nutrition database integration
- USDA / OpenFoodFacts / Edamam support
- Persistent database for user profiles
- Long-term nutrition history
- Meal reminders
- Water intake tracker
- Fitness wearable integration
- PDF diet reports
- Dietitian dashboard
- Authentication system
- More advanced AI agent workflow
- More regional Indian meal datasets

---

## Disclaimer

NutriGraph AI is an educational and informational prototype.

Nutrition values are estimates and may vary depending on ingredients, quantities, brands, preparation methods, and available data.

This application is **not a substitute for professional medical, nutritional, or dietitian advice**.

Users with medical conditions, pregnancy, eating disorders, prescribed diets, or serious health concerns should consult a qualified professional before following any meal plan.

---

## Author

**Zeeshan Mohd**

B.Tech - Computer Science & Engineering (AI/ML)

Interested in:

- Artificial Intelligence
- Machine Learning
- Generative AI
- LLM Applications
- LangChain and LangGraph
- Computer Vision
- AI-powered applications

---

## Project Goal

NutriGraph AI demonstrates how **Generative AI, FastAPI, LangChain, LangGraph, and nutrition analysis** can be combined to build an intelligent, explainable, and user-focused meal planning application.

If you find this project useful, consider giving the repository a star.
