
import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from google import genai


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

if not API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY is missing. Add it to your project's .env file."
    )

client = genai.Client(api_key=API_KEY)


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="NutriGraph AI",
    description="AI-powered personalized meal planning API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# Temporary in-memory profile storage.
# Profiles are lost when the server restarts.
user_profiles: dict[str, dict[str, Any]] = {}


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class ProfileRequest(BaseModel):
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = None
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    activity_level: str | None = None
    goal: str | None = None
    diet_type: str | None = None
    allergies: list[str] = Field(default_factory=list)
    medical_conditions: list[str] = Field(default_factory=list)
    disliked_foods: list[str] = Field(default_factory=list)
    preferred_cuisines: list[str] = Field(default_factory=list)
    meals_per_day: int | None = Field(default=None, ge=1, le=10)
    budget: str | None = None
    additional_notes: str | None = None


class QueryRequest(BaseModel):
    query_type: str
    user_input: str = ""


# --------------------------------------------------
# GEMINI JSON GENERATION
# --------------------------------------------------

def call_gemini_json(prompt: str) -> dict[str, Any]:
    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )

        raw = response.text

        if not raw:
            raise ValueError("Gemini returned an empty response.")

        raw = re.sub(
            r"^\s*```(?:json)?\s*|\s*```\s*$",
            "",
            raw.strip(),
            flags=re.IGNORECASE,
        )

        data = json.loads(raw)

        if not isinstance(data, dict):
            raise ValueError(
                "Gemini response must be a JSON object."
            )

        return data

    except Exception as exc:
        # Keep the detailed cause in the server terminal.
        print(f"Gemini request failed: {type(exc).__name__}: {exc}")

        raise HTTPException(
            status_code=502,
            detail=(
                "Gemini could not generate a valid response. "
                "Check the API key, model availability, quota, "
                "internet connection, and server logs."
            ),
        ) from exc


# --------------------------------------------------
# ALLERGY VALIDATION
# --------------------------------------------------

def validate_allergens(
    meals: list[dict[str, Any]],
    allergies: list[str],
) -> None:
    normalized = [
        str(item).strip().casefold()
        for item in allergies
        if str(item).strip()
    ]

    for meal in meals:
        parts = [
            str(meal.get("name", "")),
            str(meal.get("description", "")),
        ]

        ingredients = meal.get("ingredients", [])

        if isinstance(ingredients, list):
            parts.extend(
                item if isinstance(item, str) else json.dumps(item)
                for item in ingredients
            )

        meal_text = " ".join(parts).casefold()

        for allergen in normalized:
            if allergen in meal_text:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"A generated meal matched a declared allergy "
                        f"({allergen}). The plan was rejected. "
                        "Please retry or review your profile."
                    ),
                )


# --------------------------------------------------
# MEAL RESPONSE VALIDATION
# --------------------------------------------------

def validate_meal_response(
    data: dict[str, Any],
    allergies: list[str],
) -> dict[str, Any]:

    meals = data.get("meals")

    if not isinstance(meals, list) or not meals:
        raise HTTPException(
            status_code=502,
            detail="Gemini returned no meals. Please try again.",
        )

    for index, meal in enumerate(meals):
        if not isinstance(meal, dict):
            raise HTTPException(
                status_code=502,
                detail=f"Meal {index + 1} is not a valid object.",
            )

        for field in ("name", "ingredients", "nutrition"):
            if field not in meal:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Meal {index + 1} is missing {field}."
                    ),
                )

        if not isinstance(meal["ingredients"], list):
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Meal {index + 1} has invalid ingredients."
                ),
            )

        if not isinstance(meal["nutrition"], dict):
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Meal {index + 1} has invalid nutrition data."
                ),
            )

        meal.setdefault("meal_type", "meal")
        meal.setdefault("description", "")
        meal.setdefault("icon", "restaurant")
        meal.setdefault("steps", [])
        meal.setdefault("reasons", [])
        meal.setdefault("micronutrients", {})
        meal.setdefault("prep_minutes", None)

    validate_allergens(meals, allergies)

    analysis = data.get("analysis")

    if not isinstance(analysis, dict):
        analysis = {
            "summary": "Your meal plan has been generated.",
            "strengths": [],
            "suggestions": [],
            "considerations": [
                "AI-generated nutrition values are estimates."
            ],
            "next_steps": [
                "Review the meals and adjust portions to your needs."
            ],
        }

    return {
        "meals": meals,
        "analysis": analysis,
        "message": data.get(
            "message",
            "AI meal plan generated.",
        ),
        "nutrition_disclaimer": (
            "Nutrition values are AI-generated estimates and have "
            "not been independently verified. This plan is not a "
            "substitute for professional medical or dietary advice."
        ),
    }


# --------------------------------------------------
# PROMPT BUILDER
# --------------------------------------------------

def build_meal_prompt(
    profile: dict[str, Any],
    query_type: str,
    user_input: str,
) -> str:

    task_instructions = {
        "daily_plan": (
            "Generate a personalized daily meal plan. "
            "Include the number of meals requested by the user "
            "when specified."
        ),
        "ingredient_based": (
            "Generate meals using the ingredients supplied by the user. "
            "Prioritize those ingredients."
        ),
        "swap_meal": (
            "Generate a suitable replacement for the specified meal. "
            "The replacement must be different from the original meal."
        ),
    }

    task = task_instructions.get(query_type)

    if task is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported query_type.",
        )

    return f"""
You are NutriGraph AI, an AI-powered meal-planning assistant.

TASK:
{task}

USER PROFILE:
{json.dumps(profile, ensure_ascii=False)}

USER INPUT:
{user_input}

IMPORTANT RULES:
- Generate meals using AI.
- Respect declared allergies, dietary preferences, dislikes,
  budget, cuisine preferences, and available ingredients.
- Never intentionally include a declared allergen.
- Do not claim that a meal is medically safe for an allergy.
- Do not make medical guarantees or diagnose conditions.
- Nutrition values are estimates, not laboratory measurements.
- Use realistic ingredient quantities and preparation steps.
- Return valid JSON only. Do not include Markdown fences.
- Ensure every meal has name, ingredients, and nutrition fields.
- Return the analysis object with the requested fields.

EXPECTED JSON SCHEMA:
{{
  "meals": [
    {{
      "meal_type": "breakfast",
      "name": "Meal name",
      "description": "Short description",
      "icon": "restaurant",
      "ingredients": ["1 cup ingredient"],
      "nutrition": {{
        "calories_kcal": 350,
        "protein_g": 18,
        "carbs_g": 45,
        "fat_g": 10
      }},
      "micronutrients": {{
        "fiber_g": 5,
        "sugar_g": 6,
        "calcium_mg": 100,
        "iron_mg": 2,
        "vitamin_d_mcg": 0,
        "b12_mcg": 0,
        "potassium_mg": 300,
        "sodium_mg": 250
      }},
      "prep_minutes": 20,
      "reasons": ["Reason this meal suits the profile"],
      "steps": ["Step 1", "Step 2"]
    }}
  ],
  "analysis": {{
    "summary": "Summary of the meal plan",
    "strengths": ["Strength"],
    "suggestions": ["Suggestion"],
    "considerations": ["Consideration"],
    "next_steps": ["Next step"]
  }},
  "message": "Plan generated successfully."
}}
"""


# --------------------------------------------------
# FRONTEND ROUTE
# --------------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    index_file = BASE_DIR / "index.html"

    if not index_file.is_file():
        raise HTTPException(
            status_code=404,
            detail=(
                f"index.html not found in {BASE_DIR}. "
                "Place index.html in the same directory as main.py."
            ),
        )

    return FileResponse(index_file)


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": "NutriGraph AI",
        "model": MODEL_NAME,
    }


# --------------------------------------------------
# SAVE USER PROFILE
# --------------------------------------------------

@app.post("/api/profile")
def save_profile(profile: ProfileRequest):
    profile_data = profile.model_dump()
    user_profiles["default"] = profile_data

    return {
        "message": "Profile saved successfully.",
        "profile": profile_data,
    }


# --------------------------------------------------
# AI MEAL GENERATION
# --------------------------------------------------

@app.post("/api/query")
def query_ai(request: QueryRequest):
    query_type = request.query_type.strip().lower()

    allowed_types = {
        "daily_plan",
        "ingredient_based",
        "swap_meal",
    }

    if query_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported query type.",
        )

    profile = user_profiles.get("default", {})
    user_input = request.user_input
    original_name = ""

    # Handle meal replacement requests.
    if query_type == "swap_meal":
        try:
            swap_request = json.loads(request.user_input)

            if isinstance(swap_request, dict):
                supplied_profile = swap_request.get(
                    "user_preferences"
                )

                if isinstance(supplied_profile, dict):
                    profile = supplied_profile

                original = swap_request.get(
                    "meal_to_replace",
                    {},
                )

                if isinstance(original, dict):
                    original_name = str(
                        original.get("name", "")
                    )

        except (json.JSONDecodeError, TypeError):
            pass

    prompt = build_meal_prompt(
        profile,
        query_type,
        user_input,
    )

    data = call_gemini_json(prompt)

    allergies = profile.get("allergies", [])

    if not isinstance(allergies, list):
        allergies = []

    result = validate_meal_response(
        data,
        allergies,
    )

    # Ensure a replacement meal differs from the original.
    if query_type == "swap_meal":
        replacements = [
            meal
            for meal in result["meals"]
            if str(meal.get("name", "")).strip().casefold()
            != original_name.strip().casefold()
        ]

        if not replacements:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini did not return a distinct replacement meal. "
                    "Please try again."
                ),
            )

        result["meals"] = replacements[:1]
        result["message"] = "AI meal replacement generated."

    return result


# --------------------------------------------------
# STATIC FRONTEND ASSETS
# Keep this mount AFTER all API routes.
# --------------------------------------------------

app.mount(
    "/",
    StaticFiles(
        directory=str(BASE_DIR),
        html=True,
    ),
    name="static",
)
