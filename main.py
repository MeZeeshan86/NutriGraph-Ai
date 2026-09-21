from __future__ import annotations

import json
import os
import re
import uuid
from typing import Any, Dict, List, Literal, Optional, TypedDict

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

try:
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_groq import ChatGroq
    from langgraph.graph import END, StateGraph
except ImportError:  # Keeps the app usable without AI dependencies installed.
    HumanMessage = None
    SystemMessage = None
    ChatGroq = None
    END = "__end__"
    StateGraph = None


class UserProfile(TypedDict, total=False):
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    activity_level: str
    diet_preference: str
    health_goal: Optional[str]
    allergies: List[str]
    dislikes: List[str]
    cuisine: str
    budget: str
    meal_count: int
    condition: str
    time: str


class AppState(TypedDict, total=False):
    profile: UserProfile
    query_type: Literal[
        "meal_suggestions",
        "ingredient_based",
        "nutrient_analysis",
        "daily_plan",
    ]
    user_input: str
    intermediate_meals: List[Dict[str, Any]]
    final_response: Dict[str, Any]


ALLERGEN_TERMS = {
    "peanut": ["peanut", "peanuts"],
    "peanuts": ["peanut", "peanuts"],
    "dairy": ["milk", "curd", "paneer", "cheese", "yogurt", "ghee", "butter"],
    "milk": ["milk", "curd", "paneer", "cheese", "yogurt", "ghee", "butter"],
    "gluten": ["wheat", "bread", "roti", "naan", "pasta", "noodle"],
    "egg": ["egg", "eggs", "omelette", "omelet"],
    "eggs": ["egg", "eggs", "omelette", "omelet"],
    "soy": ["soy", "tofu", "soy sauce"],
    "shellfish": ["prawn", "shrimp", "crab", "lobster"],
}

NUTRIENT_TARGETS = {
    "fiber_g": 30,
    "calcium_mg": 1000,
    "iron_mg": 18,
    "vitamin_d_mcg": 15,
    "b12_mcg": 2.4,
    "potassium_mg": 3500,
    "sodium_mg": 2300,
}


LOCAL_MEALS: List[Dict[str, Any]] = [
    {
        "meal_type": "breakfast",
        "title": "Moong Dal Chilla with Mint Curd",
        "ingredients": ["moong dal", "curd", "mint", "onion"],
        "diet_tags": ["vegetarian", "indian"],
        "nutrition": {"calories_kcal": 310, "protein_g": 21, "carbs_g": 38, "fat_g": 8},
        "micronutrients": {"fiber_g": 8, "calcium_mg": 210, "iron_mg": 4.1, "vitamin_d_mcg": 1.2, "b12_mcg": 0.7, "potassium_mg": 520, "sodium_mg": 420},
    },
    {
        "meal_type": "breakfast",
        "title": "Oats Idli with Sambar",
        "ingredients": ["oats", "curd", "dal", "vegetables"],
        "diet_tags": ["vegetarian", "indian"],
        "nutrition": {"calories_kcal": 340, "protein_g": 16, "carbs_g": 55, "fat_g": 7},
        "micronutrients": {"fiber_g": 9, "calcium_mg": 230, "iron_mg": 3.8, "vitamin_d_mcg": 1.1, "b12_mcg": 0.8, "potassium_mg": 650, "sodium_mg": 510},
    },
    {
        "meal_type": "lunch",
        "title": "Rajma Brown Rice Bowl",
        "ingredients": ["rajma", "brown rice", "tomato", "cucumber"],
        "diet_tags": ["vegan", "vegetarian", "indian"],
        "nutrition": {"calories_kcal": 610, "protein_g": 25, "carbs_g": 94, "fat_g": 13},
        "micronutrients": {"fiber_g": 17, "calcium_mg": 170, "iron_mg": 6.8, "vitamin_d_mcg": 0.7, "b12_mcg": 0.1, "potassium_mg": 980, "sodium_mg": 680},
    },
    {
        "meal_type": "lunch",
        "title": "Grilled Chicken Roti Plate",
        "ingredients": ["chicken", "wheat roti", "salad", "curd"],
        "diet_tags": ["non-vegetarian", "indian"],
        "nutrition": {"calories_kcal": 640, "protein_g": 48, "carbs_g": 58, "fat_g": 18},
        "micronutrients": {"fiber_g": 9, "calcium_mg": 260, "iron_mg": 4.4, "vitamin_d_mcg": 2.2, "b12_mcg": 1.5, "potassium_mg": 880, "sodium_mg": 720},
    },
    {
        "meal_type": "snack",
        "title": "Roasted Chana and Fruit Bowl",
        "ingredients": ["roasted chana", "apple", "pumpkin seeds"],
        "diet_tags": ["vegan", "vegetarian", "indian"],
        "nutrition": {"calories_kcal": 260, "protein_g": 13, "carbs_g": 38, "fat_g": 7},
        "micronutrients": {"fiber_g": 8, "calcium_mg": 80, "iron_mg": 2.7, "vitamin_d_mcg": 0.3, "b12_mcg": 0.1, "potassium_mg": 430, "sodium_mg": 120},
    },
    {
        "meal_type": "snack",
        "title": "Greek Yogurt Berry Cup",
        "ingredients": ["greek yogurt", "berries", "chia seeds"],
        "diet_tags": ["vegetarian", "global"],
        "nutrition": {"calories_kcal": 250, "protein_g": 22, "carbs_g": 24, "fat_g": 8},
        "micronutrients": {"fiber_g": 7, "calcium_mg": 300, "iron_mg": 1.4, "vitamin_d_mcg": 1.3, "b12_mcg": 0.9, "potassium_mg": 330, "sodium_mg": 95},
    },
    {
        "meal_type": "dinner",
        "title": "Dal Palak with Quinoa",
        "ingredients": ["dal", "spinach", "quinoa", "tomato"],
        "diet_tags": ["vegan", "vegetarian", "indian"],
        "nutrition": {"calories_kcal": 540, "protein_g": 27, "carbs_g": 76, "fat_g": 13},
        "micronutrients": {"fiber_g": 16, "calcium_mg": 240, "iron_mg": 7.2, "vitamin_d_mcg": 1.1, "b12_mcg": 0.2, "potassium_mg": 1100, "sodium_mg": 560},
    },
    {
        "meal_type": "dinner",
        "title": "Fish Curry with Red Rice",
        "ingredients": ["fish", "red rice", "coconut", "vegetables"],
        "diet_tags": ["non-vegetarian", "indian"],
        "nutrition": {"calories_kcal": 590, "protein_g": 42, "carbs_g": 61, "fat_g": 20},
        "micronutrients": {"fiber_g": 7, "calcium_mg": 160, "iron_mg": 2.1, "vitamin_d_mcg": 4.8, "b12_mcg": 2.3, "potassium_mg": 760, "sodium_mg": 690},
    },
]


def get_llm() -> Optional[Any]:
    if ChatGroq is None:
        return None
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    model_name = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
    return ChatGroq(model=model_name, api_key=api_key, temperature=0.2)


def normalize_list(value: Any) -> List[str]:
    if isinstance(value, list):
        raw_items = value
    elif isinstance(value, str):
        raw_items = value.split(",")
    else:
        raw_items = []
    return [str(item).strip().lower() for item in raw_items if str(item).strip()]


def make_system_prompt(profile: UserProfile) -> str:
    return (
        "You are a careful nutrition planning assistant. Return factual, practical meal ideas.\n"
        "Never claim medical certainty. Always respect diet preference, allergies, dislikes, budget, cuisine, and health focus.\n"
        "Return JSON only when asked for JSON. Do not wrap JSON in markdown.\n\n"
        f"Profile JSON:\n{json.dumps(profile, indent=2)}"
    )


def clean_meal_title(line: str) -> str:
    line = re.sub(r"\*{1,2}(.+?)\*{1,2}", r"\1", line)
    line = re.sub(r"^#+\s*", "", line)
    line = re.sub(r"^\d+[.)]\s*", "", line)
    line = re.sub(r"^[-•]\s*", "", line)
    return line.rstrip(":").strip()


def calc_calories(profile: UserProfile) -> int:
    age = max(12, int(profile.get("age") or 28))
    height = max(120.0, float(profile.get("height_cm") or 170))
    weight = max(35.0, float(profile.get("weight_kg") or 70))
    female_bmr = 10 * weight + 6.25 * height - 5 * age - 161
    male_bmr = 10 * weight + 6.25 * height - 5 * age + 5
    gender = profile.get("gender", "neutral")
    bmr = female_bmr if gender == "female" else male_bmr if gender == "male" else (female_bmr + male_bmr) / 2
    multipliers = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "active": 1.725}
    calories = bmr * multipliers.get(profile.get("activity_level", "moderate"), 1.55)
    if profile.get("health_goal") == "weight_loss":
        calories -= 400
    if profile.get("health_goal") == "muscle_gain":
        calories += 280
    return max(1400, round(calories))


def macro_targets(profile: UserProfile, calories: int) -> Dict[str, int]:
    weight = max(35.0, float(profile.get("weight_kg") or 70))
    goal = profile.get("health_goal")
    protein_factor = 1.9 if goal == "muscle_gain" else 1.7 if goal == "weight_loss" else 1.45
    protein = round(weight * protein_factor)
    fat = round((calories * 0.27) / 9)
    carbs = round((calories - protein * 4 - fat * 9) / 4)
    return {"protein_g": protein, "carbs_g": carbs, "fat_g": fat}


def unsafe_terms(profile: UserProfile) -> List[str]:
    terms: List[str] = []
    for allergy in profile.get("allergies", []):
        terms.extend(ALLERGEN_TERMS.get(allergy.lower(), [allergy.lower()]))
    terms.extend(profile.get("dislikes", []))
    return [term for term in terms if term]


def meal_is_safe(meal: Dict[str, Any], profile: UserProfile) -> bool:
    text = " ".join([meal.get("title", ""), meal.get("description", ""), " ".join(meal.get("ingredients", []))]).lower()
    return not any(term in text for term in unsafe_terms(profile))


def meal_fits_diet(meal: Dict[str, Any], profile: UserProfile) -> bool:
    diet = profile.get("diet_preference", "non-vegetarian")
    tags = meal.get("diet_tags", [])
    ingredients = " ".join(meal.get("ingredients", [])).lower()
    animal_terms = ["chicken", "fish", "egg", "turkey", "salmon"]
    dairy_terms = ["milk", "curd", "paneer", "cheese", "yogurt", "ghee"]
    root_terms = ["onion", "garlic"]
    if diet == "non-vegetarian":
        return True
    if diet == "vegan":
        return "vegan" in tags or not any(term in ingredients for term in animal_terms + dairy_terms)
    if diet == "jain":
        return not any(term in ingredients for term in animal_terms + root_terms)
    return "vegetarian" in tags or "vegan" in tags or not any(term in ingredients for term in animal_terms)


def condition_reason(profile: UserProfile) -> str:
    condition = profile.get("condition", "none")
    if condition == "diabetes":
        return "Blood sugar focus: prioritize fiber, protein, and steadier carbohydrate portions."
    if condition == "hypertension":
        return "Low sodium focus: keep salt and packaged sauces controlled."
    if condition == "pcos":
        return "PCOS support: protein and fiber are emphasized for better satiety."
    return "General wellness: balanced calories, protein, fiber, and micronutrients."


def enrich_meal(meal: Dict[str, Any], profile: UserProfile) -> Dict[str, Any]:
    item = dict(meal)
    item.setdefault("description", item["title"])
    item.setdefault("ingredients", infer_ingredients(item["title"]))
    item.setdefault("nutrition", simple_nutrition_estimate(item["title"]))
    item.setdefault("micronutrients", estimate_micronutrients(item["title"]))
    item["reasons"] = [
        condition_reason(profile),
        f"Matches {profile.get('diet_preference', 'diet')} and {profile.get('cuisine', 'cuisine')} preference.",
        "Filtered against allergy and dislike terms at ingredient/title level.",
    ]
    return item


def local_plan(profile: UserProfile) -> List[Dict[str, Any]]:
    meal_count = int(profile.get("meal_count") or 4)
    types = ["breakfast", "lunch", "dinner"] if meal_count == 3 else ["breakfast", "lunch", "snack", "dinner"]
    if meal_count == 5:
        types = ["breakfast", "lunch", "snack", "snack", "dinner"]

    plan: List[Dict[str, Any]] = []
    for index, meal_type in enumerate(types):
        pool = [
            meal
            for meal in LOCAL_MEALS
            if meal["meal_type"] == meal_type and meal_fits_diet(meal, profile) and meal_is_safe(meal, profile)
        ]
        if not pool:
            pool = [meal for meal in LOCAL_MEALS if meal["meal_type"] == meal_type and meal_fits_diet(meal, profile)]
        if not pool:
            pool = [meal for meal in LOCAL_MEALS if meal["meal_type"] == meal_type]
        plan.append(enrich_meal(pool[index % len(pool)], profile))
    return plan


def infer_ingredients(title: str) -> List[str]:
    words = re.findall(r"[a-zA-Z]+", title.lower())
    stop = {"with", "and", "the", "bowl", "plate", "meal", "healthy"}
    return [word for word in words if word not in stop][:8]


def simple_nutrition_estimate(meal_description: str) -> Dict[str, Any]:
    text = meal_description.lower()
    calories, protein, carbs, fat = 300, 12, 30, 10
    if any(k in text for k in ["oat", "poha", "rice", "roti", "bread", "quinoa", "idli"]):
        calories += 100
        carbs += 24
    if any(k in text for k in ["egg", "omelette", "omelet"]):
        calories += 70
        protein += 8
        fat += 6
    if any(k in text for k in ["chicken", "paneer", "tofu", "fish", "dal", "rajma", "chana"]):
        calories += 130
        protein += 18
        fat += 5
    if any(k in text for k in ["avocado", "nuts", "seeds", "olive oil", "coconut"]):
        calories += 100
        fat += 9
    if any(k in text for k in ["fruit", "banana", "apple", "berry"]):
        calories += 60
        carbs += 15
    return {"calories_kcal": calories, "protein_g": protein, "carbs_g": carbs, "fat_g": fat}


def estimate_micronutrients(meal_description: str) -> Dict[str, Any]:
    text = meal_description.lower()
    micros = {"fiber_g": 5, "calcium_mg": 120, "iron_mg": 2.0, "vitamin_d_mcg": 0.5, "b12_mcg": 0.2, "potassium_mg": 420, "sodium_mg": 420}
    if any(k in text for k in ["dal", "rajma", "chana", "bean", "lentil", "oat"]):
        micros["fiber_g"] += 7
        micros["iron_mg"] += 2.5
        micros["potassium_mg"] += 260
    if any(k in text for k in ["spinach", "palak", "greens"]):
        micros["fiber_g"] += 3
        micros["iron_mg"] += 3
        micros["calcium_mg"] += 90
    if any(k in text for k in ["curd", "paneer", "milk", "yogurt"]):
        micros["calcium_mg"] += 220
        micros["b12_mcg"] += 0.7
    if any(k in text for k in ["fish", "salmon"]):
        micros["vitamin_d_mcg"] += 4
        micros["b12_mcg"] += 1.8
    return micros


def totals(meals: List[Dict[str, Any]]) -> Dict[str, float]:
    total: Dict[str, float] = {
        "calories_kcal": 0,
        "protein_g": 0,
        "carbs_g": 0,
        "fat_g": 0,
        **{key: 0 for key in NUTRIENT_TARGETS},
    }
    for meal in meals:
        for key, value in meal.get("nutrition", {}).items():
            total[key] = total.get(key, 0) + float(value)
        for key, value in meal.get("micronutrients", {}).items():
            total[key] = total.get(key, 0) + float(value)
    return total


def plan_score(total: Dict[str, float], targets: Dict[str, int]) -> int:
    protein = min(100, total["protein_g"] / max(1, targets["protein_g"]) * 100)
    fiber = min(100, total["fiber_g"] / NUTRIENT_TARGETS["fiber_g"] * 100)
    micro_keys = ["calcium_mg", "iron_mg", "vitamin_d_mcg", "b12_mcg", "potassium_mg"]
    micro = sum(min(100, total[key] / NUTRIENT_TARGETS[key] * 100) for key in micro_keys) / len(micro_keys)
    sodium = 100 if total["sodium_mg"] <= NUTRIENT_TARGETS["sodium_mg"] else 65
    return round(protein * 0.25 + fiber * 0.25 + micro * 0.35 + sodium * 0.15)


def build_analysis(profile: UserProfile, meals: List[Dict[str, Any]]) -> Dict[str, Any]:
    calories = calc_calories(profile)
    macros = macro_targets(profile, calories)
    total = totals(meals)
    gaps = []
    for key, target in {**macros, **NUTRIENT_TARGETS}.items():
        actual = total.get(key, 0)
        pct = round(actual / max(1, target) * 100)
        gaps.append({"nutrient": key, "actual": round(actual, 1), "target": target, "coverage_pct": pct, "status": "low" if pct < 70 else "ok"})

    recommendations = []
    if any(gap["nutrient"] == "protein_g" and gap["status"] == "low" for gap in gaps):
        recommendations.append("Increase protein with dal, paneer, tofu, eggs, chicken, fish, or Greek yogurt based on diet preference.")
    if any(gap["nutrient"] == "fiber_g" and gap["status"] == "low" for gap in gaps):
        recommendations.append("Add legumes, sprouts, oats, vegetables, chia seeds, or fruit with skin to improve fiber.")
    if any(gap["nutrient"] == "vitamin_d_mcg" and gap["status"] == "low" for gap in gaps):
        recommendations.append("Vitamin D is hard to solve through food alone; consider sunlight and professional guidance.")
    if profile.get("condition") == "hypertension" or total["sodium_mg"] > NUTRIENT_TARGETS["sodium_mg"]:
        recommendations.append("Keep sodium lower by reducing sauces, pickles, papad, packaged snacks, and added salt.")

    return {
        "daily_targets": {"calories_kcal": calories, **macros, **NUTRIENT_TARGETS},
        "totals": total,
        "score": plan_score(total, macros),
        "gaps": gaps,
        "recommendations": recommendations or ["Your plan covers the main targets reasonably well. Keep hydration and sleep consistent."],
        "disclaimer": "Educational estimates only. This does not replace medical or dietitian advice.",
    }


def parse_llm_json(text: str) -> Optional[List[Dict[str, Any]]]:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\[[\s\S]*\]", text)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return parsed if isinstance(parsed, list) else None


def node_meal_generator(state: AppState) -> AppState:
    profile = state["profile"]
    query_type = state["query_type"]
    user_input = state.get("user_input", "")

    if query_type == "daily_plan":
        meals = local_plan(profile)
        llm = get_llm()
        if llm and HumanMessage and SystemMessage:
            prompt = (
                "Generate a meal plan as a JSON array. Each object must include title, meal_type, "
                "description, ingredients array, and reasons array. Return JSON only. "
                f"Meal count: {profile.get('meal_count', 4)}. User input: {user_input}"
            )
            try:
                result = llm.invoke([SystemMessage(content=make_system_prompt(profile)), HumanMessage(content=prompt)])
                parsed = parse_llm_json(str(result.content))
                if parsed:
                    meals = [enrich_meal(meal, profile) for meal in parsed if meal_is_safe(meal, profile)]
            except Exception:
                pass
    elif query_type == "ingredient_based":
        ingredients = normalize_list(user_input)
        meals = [
            enrich_meal(
                {
                    "meal_type": "custom",
                    "title": f"{', '.join(ingredients[:2]).title()} Protein Bowl" if ingredients else "Balanced Pantry Bowl",
                    "ingredients": ingredients,
                    "description": "Simple dish using the user's available ingredients.",
                },
                profile,
            )
        ]
    elif query_type == "nutrient_analysis":
        meals = [enrich_meal({"meal_type": "analysis", "title": clean_meal_title(user_input), "description": user_input}, profile)]
    else:
        meals = local_plan(profile)[:5]

    new_state: AppState = dict(state)
    new_state["intermediate_meals"] = meals
    return new_state


def node_allergy_filter(state: AppState) -> AppState:
    profile = state["profile"]
    meals = state.get("intermediate_meals", [])
    safe_meals = [meal for meal in meals if meal_is_safe(meal, profile)]
    removed = [meal for meal in meals if not meal_is_safe(meal, profile)]
    new_state: AppState = dict(state)
    new_state["intermediate_meals"] = safe_meals
    new_state["final_response"] = {"filtered_out_due_to_allergy": removed}
    return new_state


def node_nutrition_tool(state: AppState) -> AppState:
    profile = state["profile"]
    enriched = [enrich_meal(meal, profile) for meal in state.get("intermediate_meals", [])]
    new_state: AppState = dict(state)
    new_state["intermediate_meals"] = enriched
    return new_state


def node_health_analysis(state: AppState) -> AppState:
    profile = state["profile"]
    meals = state.get("intermediate_meals", [])
    final_payload = {
        "query_type": state["query_type"],
        "meals": meals,
        "analysis": build_analysis(profile, meals),
    }
    existing = state.get("final_response") or {}
    existing.update(final_payload)
    new_state: AppState = dict(state)
    new_state["final_response"] = existing
    return new_state


def build_graph():
    if StateGraph is None:
        return None
    graph = StateGraph(AppState)
    graph.add_node("meal_generator", node_meal_generator)
    graph.add_node("allergy_filter", node_allergy_filter)
    graph.add_node("nutrition_tool", node_nutrition_tool)
    graph.add_node("health_analysis", node_health_analysis)
    graph.set_entry_point("meal_generator")
    graph.add_edge("meal_generator", "allergy_filter")
    graph.add_edge("allergy_filter", "nutrition_tool")
    graph.add_edge("nutrition_tool", "health_analysis")
    graph.add_edge("health_analysis", END)
    return graph.compile()


graph_app = build_graph()
app = FastAPI(title="NutriGraph AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROFILES: Dict[str, UserProfile] = {}


def get_or_create_session_id(request: Request, response: Response) -> str:
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie("session_id", session_id, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7)
    return session_id


def profile_from_payload(data: Dict[str, Any]) -> UserProfile:
    return {
        "age": int(data.get("age", 0) or 0),
        "gender": data.get("gender", "neutral"),
        "height_cm": float(data.get("height_cm", 0) or 0),
        "weight_kg": float(data.get("weight_kg", 0) or 0),
        "activity_level": data.get("activity_level", "moderate"),
        "diet_preference": data.get("diet_preference", "non-vegetarian"),
        "health_goal": data.get("health_goal") or "maintenance",
        "allergies": normalize_list(data.get("allergies", [])),
        "dislikes": normalize_list(data.get("dislikes", [])),
        "cuisine": data.get("cuisine", "indian"),
        "budget": data.get("budget", "standard"),
        "meal_count": int(data.get("meal_count", 4) or 4),
        "condition": data.get("condition", "none"),
        "time": data.get("time", "normal"),
    }


@app.post("/api/profile")
async def set_profile(request: Request):
    data = await request.json()
    response = JSONResponse({"status": "ok"})
    session_id = get_or_create_session_id(request, response)
    profile = profile_from_payload(data)
    PROFILES[session_id] = profile
    response.body = JSONResponse({"status": "ok", "profile": profile}).body
    return response


@app.get("/api/profile")
async def get_profile(request: Request):
    session_id = request.cookies.get("session_id")
    profile = PROFILES.get(session_id) if session_id else None
    return {"profile": profile}


@app.post("/api/query")
async def run_query(request: Request):
    data = await request.json()
    query_type = data.get("query_type", "daily_plan")
    user_input = data.get("user_input", "")
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in PROFILES:
        return JSONResponse({"error": "No profile found. Please create your profile first."}, status_code=400)

    initial_state: AppState = {
        "profile": PROFILES[session_id],
        "query_type": query_type,
        "user_input": user_input,
    }
    if graph_app is None:
        state = node_health_analysis(node_nutrition_tool(node_allergy_filter(node_meal_generator(initial_state))))
    else:
        state = graph_app.invoke(initial_state)
    return state.get("final_response", {})


static_dir = os.path.dirname(__file__)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
