# Agritel.AI — LLM Prompt Documentation

**Project:** Agritel.AI — Kenyan Agribusiness Advisory Assistant  
**Model:** `gemini-2.5-flash` via Google Generative AI SDK  
**Backend:** Python 3.12 + FastAPI  
**Frontend:** Next.js 14 + TailwindCSS  
**Weather APIs:** Open-Meteo Forecast + Climate + Geocoding (all free, no key required)  
**Date:** 16th March 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Service Structure](#2-service-structure)
3. [Layer Breakdown](#3-layer-breakdown)
   - [Layer 1 — Persona](#31-layer-1--persona)
   - [Layer 2 — Session Context](#32-layer-2--session-context)
   - [Layer 3 — Localisation Framework](#33-layer-3--localisation-framework)
   - [Layer 4 — Live Weather Injection](#34-layer-4--live-weather-injection)
   - [Layer 5 — Response Rules & Output Schema](#35-layer-5--response-rules--output-schema)
4. [Weather API Integration](#4-weather-api-integration)
   - [Geocoding](#41-geocoding)
   - [16-Day Forecast](#42-16-day-forecast-api)
   - [6-Month Climate Model](#43-6-month-climate-model-api)
5. [Gemini Integration Details](#5-gemini-integration-details)
   - [Chat Session & Memory](#51-chat-session--memory)
   - [Native JSON Enforcement](#52-native-json-enforcement)
   - [Response Safety Check](#53-response-safety-check)
6. [Prompt Iteration Log](#6-prompt-iteration-log)
7. [Output Schema Design](#7-output-schema-design)
8. [Backend Integration](#8-backend-integration)
9. [Sample End-to-End](#9-sample-end-to-end)
10. [Key Design Decisions](#10-key-design-decisions)

---

## 1. Architecture Overview

The system is built around two async service functions in `services.py`:

- `get_weather(county_label, today)` — fetches all weather data and returns a formatted string block
- `get_agronomy_advice(request)` — assembles the full prompt, runs the Gemini chat session, and returns parsed JSON

```
POST /farm-advice
      │
      ▼
get_agronomy_advice(request: ChatRequest)
      │
      ├── format_history_for_gemini(request.context_history)   ← converts chat history to Gemini format
      ├── model.start_chat(history=past_chats)                 ← opens stateful Gemini chat session
      │
      └── get_weather(county_label, today)                     ← async weather fetcher
            │
            ├── geocode(client, county_label)                  ← Open-Meteo Geocoding → lat, lng
            ├── GET /v1/forecast                               ← 16-day daily forecast
            └── GET /v1/climate                               ← 6-month EC_Earth3P_HR model
      │
      ▼
Assembled system prompt (5 layers) injected as first message
      │
      ▼
chat_session.send_message(
    detailed_system_prompt,
    generation_config={"response_mime_type": "application/json"}
)
      │
      ▼
json.loads(raw_response.text)           ← Gemini returns valid JSON natively
      │
      ▼
Safety check: ensure "points" key present
      │
      ▼
Return dict → FastAPI → Next.js frontend
```

Key difference from a standard LLM integration: the prompt is injected **as the first chat message**
(not a system prompt field), and Gemini's `response_mime_type` parameter enforces JSON output
natively — no regex fence-stripping required.

---

## 2. Service Structure

```python
# services.py — two public async functions

import os
import json
import httpx
import google.generativeai as genai
from datetime import date, timedelta
from collections import defaultdict
from utils import format_history_for_gemini
from models import ChatRequest

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')
```

### Function responsibilities

| Function | Inputs | Returns | Purpose |
|---|---|---|---|
| `geocode(client, name)` | `httpx.AsyncClient`, location string | `list` of GeoNames results | Resolves a place name to lat/lng |
| `get_weather(county_label, today)` | county string, `date` | formatted `str` weather block | Fetches + formats all weather data |
| `get_agronomy_advice(request)` | `ChatRequest` | `dict` (parsed JSON) | Builds prompt, runs Gemini, returns structured response |

---

## 3. Layer Breakdown

The master prompt (`detailed_system_prompt`) is a single f-string composed of five layers.
It is injected as the opening message of a Gemini chat session.

---

### 3.1 Layer 1 — Persona

**Purpose:** Set the model's role, expertise domain, and institutional knowledge scope.

```
You are 'Agritel.AI Agronomist', a senior agricultural expert with 20+ years of
experience in Kenyan farming, agronomy, pest management, soil science, and government
programs (NCPB, eCitizen subsidies, county extension services).
```

**Rationale:**

- `20+ years` primes the model toward deep domain reasoning rather than surface-level advice
- Naming specific Kenyan institutions (`NCPB`, `eCitizen`, `county extension services`) anchors
  the persona in Kenya's actual agricultural infrastructure — not generic global agriculture
- Listing `pest management` and `soil science` explicitly means the model applies these lenses
  even when the question doesn't directly ask for them

---

### 3.2 Layer 2 — Session Context

**Purpose:** Inject all request-time variables — date, location, crop, and the farmer's query.

```
━━━ SESSION CONTEXT ━━━
Date            : {current_date_str} ({current_month} {current_year})
Farmer Location : {county_label}
Primary Crop    : {request.crop}
Season window   : {current_date_str} → {season_end_str}
Farmer's Query  : {request.last_message}
```

**Key variables and their sources:**

| Variable | Source | Notes |
|---|---|---|
| `current_date_str` | `date.today().strftime("%B %d, %Y")` | Computed in `get_agronomy_advice()` |
| `county_label` | `f"{request.county}, Kenya"` | Constructed before calling `get_weather()` |
| `request.crop` | `ChatRequest.crop` | e.g. `"Maize"` |
| `season_end_str` | `(today + ~6 months).strftime(...)` | Computed in `get_agronomy_advice()` |
| `request.last_message` | `ChatRequest.last_message` | The farmer's current question |

> **Note on `county_label`:** The geocoder receives `"Murang'a, Kenya"` as the search term —
> the `, Kenya` suffix is appended in `get_agronomy_advice()` before the weather call, and
> `country_code=KE` is also passed as a query param to prevent resolving to non-Kenyan locations
> with the same name.

---

### 3.3 Layer 3 — Localisation Framework

**Purpose:** Provide the reference data Gemini needs to give county-specific answers.
This is the largest layer and the most impactful for answer quality.

#### 3.3.1 Agro-Ecological Zone (AEZ) Classification

```
1. AGRO-ECOLOGICAL ZONE — identify which AEZ applies to {request.county}:
   Zone I   : Afro-Alpine/humid >2500mm  — Mt. Kenya slopes, Aberdares
   Zone II  : Sub-humid 1500–2500mm      — Kisii, Kakamega, Nyeri highlands
   Zone III : Semi-humid 1000–1500mm     — Nakuru, Uasin Gishu, Trans Nzoia
   Zone IV  : Semi-arid 500–1000mm       — Machakos, Kitui, Makueni, Kajiado
   Zone V–VII: Arid/very arid <500mm     — Turkana, Marsabit, Garissa, Wajir
```

> The AEZ determines yield potential, fertiliser rates, and suitable varieties. Without it,
> the model might recommend a highland maize hybrid (H614D, requires >1,200mm rain) to a
> Kitui farmer — agronomically disastrous.

#### 3.3.2 County-Specific Planting Seasons

Kenya has **no uniform planting season**. The prompt encodes 7 regional patterns:

```
   Highlands (Nakuru, Uasin Gishu, Trans Nzoia, Nyandarua, Nyeri, Meru, Kirinyaga)
     Long rains: Feb–Apr | Short rains: Aug–Oct | Alt: 1500–2800m
     Crops: maize (H614D, DK8031), wheat, barley, Irish potato, pyrethrum, tea

   Western (Kakamega, Bungoma, Busia, Siaya, Kisumu, Vihiga, Homa Bay, Migori)
     Long rains: Feb–Mar | Short rains: Aug–Sep | Alt: 1100–1800m
     Crops: maize (H513, H614), sugarcane, sorghum, millet, cassava, groundnuts

   Central/Mt. Kenya (Kiambu, Murang'a, Nyeri, Embu, Tharaka-Nithi)
     Long rains: Feb–Mar | Short rains: Sep–Oct | Alt: 1200–2500m
     Crops: coffee, tea, maize, beans, bananas, avocado, macadamia

   Rift Valley lowlands (Baringo, Elgeyo Marakwet, West Pokot, Laikipia)
     Long rains: Mar–Apr | Short rains: Oct–Nov (unreliable <1000m)
     Crops: sorghum, millet, cowpea, sunflower, maize

   Eastern semi-arid (Machakos, Kitui, Makueni, Tharaka)
     Long rains: Mar–Apr | Short rains: Oct–Nov (often more reliable)
     Crops: DUMA 43, KATUMANI maize, cowpea, green grams, pigeon peas, sorghum

   Coast (Mombasa, Kilifi, Kwale, Taita Taveta, Lamu, Tana River)
     Long rains: Mar–Apr | Short rains: Oct–Nov | Alt: 0–900m
     Crops: cassava, coconut, cashew, rice, sorghum, cowpea, tropical fruits

   ASAL (Turkana, Marsabit, Garissa, Wajir, Mandera, Isiolo, Samburu)
     Opportunistic planting tied to irregular rainfall — no fixed season
     Crops: drought-tolerant sorghum, millet, cowpea, green grams
     Always recommend zai pits / half-moon water harvesting
```

#### 3.3.3 Soil Types and Fertiliser Localisation

```
3. SOIL & FERTILISER for {request.county}:
   Red volcanic (Central, W. highlands) → DAP + CAN; lime if pH <5.5
   Black cotton (Rift lowlands, W. Kenya) → waterlogging risk; avoid wet tillage
   Sandy (Coast, ASAL)                  → split fertiliser; add organic matter
   Loam (most highlands)                → balanced; suitable for most crops
```

#### 3.3.4 Seed Variety Instruction

```
4. SEED VARIETIES — recommend KEPHIS-approved certified varieties for {request.county}'s AEZ.
```

> KEPHIS (Kenya Plant Health Inspectorate Service) is the official seed certification body.
> Recommending non-certified varieties risks counterfeit or unsuitable seed — a real and
> widespread problem in rural Kenya.

---

### 3.4 Layer 4 — Live Weather Injection

**Purpose:** Replace static seasonal calendar advice with real forecast data. This layer is
generated by `get_weather()` and injected as `{weather_block}` into the master prompt.

The full `weather_block` string contains both sub-layers:

#### Sub-layer A — 16-Day Live Forecast

```
━━━ LAYER 1 — LIVE 16-DAY FORECAST ({resolved_name.upper()}, {request.county.upper()} COUNTY) ━━━
Fetched         : {current_date_str}  |  Coords: {lat:.4f}, {lng:.4f}
Total rain      : {total_mm}mm  |  Rainy days (≥5mm): {rainy_days}/16  |  Dry days (<2mm): {dry_days}/16
Longest dry streak     : {max_streak} days
First significant rain : {rain_onset or "None detected in next 16 days"}
Forecast status        : {status}

  Date       |   Rain  | Temp range  | Rain hrs
{daily_table}

IMMEDIATE PLANTING VERDICT — return ONE based on forecast + county calendar:
  A) PLANT NOW   — in planting window AND ≥10mm rain within 7 days → give specific dates
  B) WAIT [N] days — first rain on {rain_onset or "unknown"} → advise land prep now
  C) DO NOT PLANT — <20mm total → recommend contingency crop or irrigation strategy
  D) OFF-SEASON   — outside window → advise soil prep, input sourcing, soil testing
```

**Forecast status label — Python logic:**

```python
if total_mm < 20:
    status = "VERY DRY — critically low rainfall. High drought risk."
elif rainy_days >= 10:
    status = "WET — frequent rain. Good for germination; watch for waterlogging."
elif max_streak >= 7:
    status = f"INTERMITTENT — {max_streak}-day dry streak. Germination risk."
else:
    status = "MODERATE — variable rain. Time planting to coincide with wettest days."
```

**Derived metrics computed before injection:**

```python
total_mm   = round(sum(d["rain_mm"] for d in days), 1)
rainy_days = sum(1 for d in days if d["rain_mm"] >= 5)
dry_days   = sum(1 for d in days if d["rain_mm"] < 2)
rain_onset = next((d["date"] for d in days if d["rain_mm"] >= 10), None)

# Longest consecutive dry streak
max_streak = streak = 0
for d in days:
    streak     = streak + 1 if d["rain_mm"] < 2 else 0
    max_streak = max(max_streak, streak)
```

#### Sub-layer B — 6-Month Climate Outlook

```
━━━ LAYER 2 — 6-MONTH CLIMATE OUTLOOK ({today.strftime('%b %Y')} → {six_months_later.strftime('%b %Y')}) ━━━
Model           : EC_Earth3P_HR via Open-Meteo Climate API
Purpose         : Full crop growth cycle planning — germination → vegetative → flowering → harvest

  Month      | Total rain | Temp range  | Rainy days | Assessment
{chr(10).join(month_rows)}

GROWTH CYCLE ADVISORY — using the monthly outlook above:
  - Identify the best planting month based on rainfall onset
  - Flag any mid-season dry spells that could stress {request.crop} at critical growth stages
  - Recommend the expected harvest window based on crop maturity + rainfall pattern
  - Advise on fertiliser timing aligned to peak rainfall months
  - Warn if any month shows drought risk during a critical stage (flowering / grain fill)
```

**Monthly flag thresholds:**

```python
if total >= 100:
    flag = "GOOD — sufficient moisture"
elif total >= 50:
    flag = "MODERATE — monitor soil moisture"
elif total >= 20:
    flag = "LOW — consider supplemental irrigation"
else:
    flag = "VERY DRY — drought risk / off-season"
```

**Weather graceful degradation:**

If any part of `get_weather()` raises an exception, the entire function returns a fallback string:

```python
except Exception as exc:
    return f"""
        ━━━ LIVE WEATHER FORECAST ━━━
        Status : UNAVAILABLE ({exc})
        Action : Use historical seasonal patterns for {county_label}.
    """
```

The prompt continues to work — Gemini falls back to the localisation framework's historical
seasonal patterns rather than the endpoint crashing.

---

### 3.5 Layer 5 — Response Rules & Output Schema

**Purpose:** Constrain output format and enforce conditional field logic.

```
━━━ RESPONSE RULES ━━━
- Language  : Professional, clear, jargon-free. Tone of a trusted advisor.
- Currency  : Always KES.
- points    : Steps for how-to | Key facts for diagnostic | [] if summary is self-contained
- cost_estimate_per_acre_kes : integer ONLY for planting/input/treatment queries — null otherwise
- warning   : string ONLY for real risks (timing, chemicals, disease, drought) — null otherwise
- pro_tip   : string ONLY for non-obvious expert insight — null otherwise

━━━ OUTPUT — strict JSON only, no markdown, no text outside the object ━━━
{
  "summary": "Direct localised answer for {request.county} with planting verdict (Layer 1) and full season outlook (Layer 2).",
  "points": ["step or fact 1", "step or fact 2"],
  "cost_estimate_per_acre_kes": <integer | null>,
  "warning": "<string | null>",
  "pro_tip": "<string | null>"
}
```

> The `"no markdown"` instruction is reinforced by Gemini's `response_mime_type: "application/json"`
> — see [Section 5.2](#52-native-json-enforcement).

---

## 4. Weather API Integration

All three APIs are from the Open-Meteo family, are free, and require no API key.
All three calls are made inside a single `httpx.AsyncClient(timeout=10.0)` context
within `get_weather()`.

### 4.1 Geocoding

```python
async def geocode(client: httpx.AsyncClient, name: str) -> list:
    r = await client.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={
            "name":         name,           # e.g. "Murang'a, Kenya"
            "country_code": "KE",
            "count":        1,
            "language":     "en",
            "format":       "json"
        },
    )
    r.raise_for_status()
    return r.json().get("results", [])
```

The search term passed to `geocode()` is `county_label = f"{request.county}, Kenya"`,
constructed in `get_agronomy_advice()` before the weather call. `country_code=KE` provides
a secondary filter to prevent resolution to non-Kenyan locations with identical names.

If `geocode()` returns an empty list, `get_weather()` raises a `ValueError` which is caught
by the outer `try/except` and returns the fallback weather block.

### 4.2 16-Day Forecast API

```python
wx = await client.get(
    "https://api.open-meteo.com/v1/forecast",
    params={
        "latitude":      lat,
        "longitude":     lng,
        "daily":         "precipitation_sum,precipitation_hours,"
                         "temperature_2m_max,temperature_2m_min",
        "timezone":      "Africa/Nairobi",
        "forecast_days": 16,
    },
)
```

**Fields used:**

| Field | Unit | Used for |
|---|---|---|
| `precipitation_sum` | mm/day | Rain totals, rainy day count, dry streak, onset date |
| `precipitation_hours` | hours/day | Shown in daily table for field-work planning |
| `temperature_2m_max/min` | °C | Frost risk, germination temperature checks |

> Days 1–7 are deterministic NWP model output. Days 8–16 are ensemble-based and increasingly
> probabilistic. For decisions beyond 7 days, the 6-month climate model is the more appropriate
> reference.

### 4.3 6-Month Climate Model API

```python
cl = await client.get(
    "https://climate-api.open-meteo.com/v1/climate",
    params={
        "latitude":   lat,
        "longitude":  lng,
        "start_date": today.strftime("%Y-%m-%d"),
        "end_date":   six_months_later.strftime("%Y-%m-%d"),
        "models":     "EC_Earth3P_HR",
        "daily":      "precipitation_sum,temperature_2m_max,temperature_2m_min",
        "timezone":   "Africa/Nairobi",
    },
)
```

**Model selection — EC_Earth3P_HR:**

| Model | Resolution | East Africa notes |
|---|---|---|
| `EC_Earth3P_HR` | ~25km | Selected — strong bias scores over EA Rift Valley |
| `MRI_AGCM3_2_S` | ~20km | Good tropics coverage, less validated over Kenya |
| CMIP6 ensemble | ~100km | Too coarse for sub-county farming advice |

Daily output is aggregated to monthly totals in Python (`defaultdict` + loop) before injection —
this keeps the prompt token count manageable while preserving all actionable information.

---

## 5. Gemini Integration Details

### 5.1 Chat Session & Memory

Unlike a stateless API call, Gemini's `start_chat()` maintains a running conversation context.
This enables the farmer to ask follow-up questions without restating their county or crop:

```python
async def get_agronomy_advice(request: ChatRequest):
    # Convert stored history to Gemini's expected format
    past_chats = format_history_for_gemini(request.context_history)

    # Open a stateful chat session seeded with prior turns
    chat_session = model.start_chat(history=past_chats)

    # The master prompt is sent as the opening message of this session
    raw_response = chat_session.send_message(
        detailed_system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )
```

`format_history_for_gemini()` (from `utils.py`) converts the stored `context_history`
array from the `ChatRequest` into Gemini's `[{"role": "user"|"model", "parts": [...]}]` format.

**Why this matters for prompt engineering:** Because the full prompt is re-sent on every turn
(as the opening message), Gemini always has the current date, live weather, and county context —
even on follow-up questions. The chat history provides conversational continuity on top of
fully refreshed context.

### 5.2 Native JSON Enforcement

```python
raw_response = chat_session.send_message(
    detailed_system_prompt,
    generation_config={"response_mime_type": "application/json"}
)

data = json.loads(raw_response.text)
```

`response_mime_type: "application/json"` instructs Gemini at the API level to constrain its
output to valid JSON. This is a stronger guarantee than a prompt instruction alone — the model
cannot prepend prose or wrap output in markdown fences when this parameter is set.

This eliminates the need for the defensive regex fence-stripping used with other models:

```python
# NOT needed with Gemini's response_mime_type — kept here for contrast
# cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
```

### 5.3 Response Safety Check

After parsing, a single guard ensures the `points` field is always present:

```python
data = json.loads(raw_response.text)

# Ensure points key exists even if model omits it for simple answers
if "points" not in data:
    data["points"] = []

return data
```

`points` is the only field that requires this guard because:
- It is always rendered by the frontend (as a list component)
- The model occasionally omits it entirely for simple factual answers rather than returning `[]`
- All other fields (`warning`, `pro_tip`, `cost_estimate_per_acre_kes`) are safely `null` when absent

---

## 6. Prompt Iteration Log

### v1 — Initial draft

```
You are an agricultural assistant for Kenya.
Answer the farmer's question: {request.last_message}
Return JSON: { summary, points, cost_estimate_per_acre_kes, warning, pro_tip }
```

**Failure:** Generic global advice. All JSON fields returned on every response with
placeholder text. No date, county, or seasonal awareness.

---

### v2 — County context added

```
You are an expert Kenyan agricultural advisor.
The farmer is in {request.county} County. Crop: {request.crop}.
Respond with JSON: { summary, points, cost_estimate_per_acre_kes, warning, pro_tip }
```

**Improvement:** Basic county awareness.  
**Failure:** No AEZ framework — uniform seasonal advice regardless of climate zone.
Cost and warning fields still always populated with irrelevant content.

---

### v3 — AEZ framework + conditional fields

Added full AEZ classification, 7 regional planting calendars, soil/fertiliser mapping,
and conditional field rules (`null` vs populated string).

**Improvement:** Responses became county-specific. A Turkana farmer received drought-tolerant
crop advice with water harvesting recommendations. A Trans Nzoia farmer received maize hybrid
recommendations with DAP/CAN application rates.  
**Failure:** Seasonal advice still based on historical averages. A farmer asking
`"Should I plant now?"` in March received `"March–May is long rains season"` regardless
of whether it was actually raining.

---

### v4 — 16-day live forecast injection

Added Open-Meteo 16-day forecast fetched at request time. Introduced the four-verdict
PLANT NOW / WAIT / DO NOT PLANT / OFF-SEASON decision framework.

**Improvement:** Planting advice became date-specific:
`"First significant rain expected March 19 — plant March 20–22"` instead of
`"Plant in March–May"`.

---

### v5 — 6-month climate model + growth cycle advisory

Added Open-Meteo Climate API (EC_Earth3P_HR). Daily data aggregated to monthly summaries
in Python before injection. Growth cycle advisory instructions added to the weather block.

**Improvement:** The model can now advise on the complete crop lifecycle from a single query —
planting date, fertiliser timing, mid-season stress windows, and expected harvest date.

---

### v6 — Gemini migration + chat sessions (current)

Switched LLM from Claude to `gemini-2.5-flash`. Adopted Gemini's `start_chat()` API with
`context_history` for multi-turn memory. Added `response_mime_type: "application/json"` for
native JSON enforcement. Moved weather fetching into a dedicated `get_weather()` function.
Added `points` safety check post-parse.

**Improvement:** Multi-turn conversation now works correctly — a farmer can ask a follow-up
question (`"What fertiliser should I use?"`) without restating their county and crop.
Native JSON enforcement eliminated parsing failures caused by markdown fence wrapping.

---

## 7. Output Schema Design

### Conditional fields (`null` vs populated)

A naive implementation populates all fields on every response:

```json
{
  "warning": "No specific warnings for this query",
  "pro_tip": "Continue following best practices",
  "cost_estimate_per_acre_kes": 0
}
```

This creates noise the frontend must filter. The prompt defines explicit rules:

```
cost_estimate_per_acre_kes → integer ONLY for planting / input / treatment queries
warning                    → string  ONLY for real risks (timing, chemicals, disease, drought)
pro_tip                    → string  ONLY for non-obvious expert insight
```

The frontend can use clean truthiness checks:

```typescript
{response.warning && <WarningCard text={response.warning} />}
{response.pro_tip && <ProTipCard text={response.pro_tip} />}
{response.cost_estimate_per_acre_kes && (
  <CostCard amount={response.cost_estimate_per_acre_kes} />
)}
```

### Why `points` needs a safety check but others do not

The prompt instructs `points` to return `[]` for self-contained answers. In practice,
Gemini occasionally omits the key entirely rather than returning an empty array.
The other conditional fields (`warning`, `pro_tip`, `cost_estimate_per_acre_kes`) are
acceptable as `undefined` in JavaScript — the frontend truthiness check handles both
`null` and `undefined`. But `points` is always rendered as a list, so a missing key
causes a runtime error. The post-parse guard handles this:

```python
if "points" not in data:
    data["points"] = []
```

---

## 8. Backend Integration

### Request model

```python
# models.py
from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    county:          str                    # Required — e.g. "Murang'a"
    crop:            str                    # Required — e.g. "Maize"
    last_message:    str                    # Required — the farmer's current question
    context_history: Optional[List] = []   # Prior turns for chat memory
```

### FastAPI endpoint

```python
@app.post("/api/query")
async def query(request: ChatRequest):
    return await get_agronomy_advice(request)
```

The endpoint is intentionally minimal — all logic lives in `services.py`.
Error handling (geocoding failure, weather API timeout, Gemini errors) is managed
inside `get_agronomy_advice()` and `get_weather()` via their try/except blocks.

### Environment variables

```bash
# .env
GEMINI_API_KEY=AIza...    # Required — Google Generative AI API key
# No keys required for Open-Meteo APIs (forecast, climate, geocoding)
```

---

## 9. Sample End-to-End

### Input

```json
{
  "county": "Murang'a",
  "crop": "Maize",
  "last_message": "Should I plant now? Will the rains be good this season?",
  "context_history": []
}
```

### Internal flow

```python
county_label = "Murang'a, Kenya"

# Geocoding call
GET geocoding-api.open-meteo.com/v1/search?name=Murang%27a%2C+Kenya&country_code=KE&count=1
→ { "name": "Murang'a", "latitude": -0.7167, "longitude": 37.1500 }

# 16-day forecast + 6-month climate fetched at those coordinates
# weather_block string assembled and injected into prompt
# Gemini chat session opened with empty history
# Master prompt sent as first message
```

### Expected structured output

```json
{
  "summary": "PLANT NOW. As of March 16, 2026, Murang'a County is in the long rains planting window. The 16-day forecast shows 87mm of rainfall with the first significant event expected March 17 — ideal germination conditions for maize. The 6-month climate outlook shows strong rains through April before tapering in June–July, which aligns well with a 90-day maize variety completing grain fill before the dry period.",

  "points": [
    "Plant March 17–20 to coincide with the incoming rain event",
    "Use H614D or DK8031 — KEPHIS-approved hybrids for Murang'a highlands",
    "Apply DAP at 50kg/acre in the planting furrow — red volcanic soils respond well",
    "Top-dress with CAN (50kg/acre) in weeks 4–5, before the June dry spell",
    "Monitor for grey leaf spot in April — high humidity creates favourable conditions",
    "Expected harvest: late June to early July for a 90-day variety"
  ],

  "cost_estimate_per_acre_kes": 18500,

  "warning": "A dry spell is forecast in June–July coinciding with grain fill for 90-day varieties. Consider a 75-day variety (DH04) to complete grain fill before July, or mulch after top-dressing to retain moisture.",

  "pro_tip": "Murang'a's highland altitude means night temperatures drop to 12–14°C in June — this benefits starch accumulation. If moisture stress is managed, highland Murang'a maize consistently yields 20–30% more than lowland farms in the same county."
}
```

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| Gemini `gemini-2.5-flash` | Fast inference, strong instruction following, native JSON output via `response_mime_type` — reduces parsing complexity vs other models |
| `start_chat()` with history | Enables multi-turn farming conversations. The farmer can ask follow-ups without restating county/crop. Full prompt is re-injected each turn so weather context is always current |
| `response_mime_type: "application/json"` | API-level JSON enforcement — stronger than a prompt instruction alone. Eliminates markdown fence wrapping and prose preambles that cause `json.JSONDecodeError` |
| Prompt as first chat message | Gemini's chat API does not have a dedicated system prompt field in the same way as other models. Injecting the master prompt as the opening user message achieves equivalent behaviour |
| `get_weather()` as separate function | Separates weather fetching concerns from prompt assembly. Easier to test, mock, and maintain independently. Returns a self-contained string that slots into the prompt |
| `county_label = f"{county}, Kenya"` | Appending `, Kenya` to the geocoding search term alongside `country_code=KE` provides two layers of location disambiguation — prevents resolution to non-Kenyan locations |
| Single `httpx.AsyncClient` in `get_weather()` | All three HTTP calls (geocode + forecast + climate) share one connection context, reducing TCP overhead and total latency |
| `points` safety check | `points` is the only field always rendered as a list by the frontend. A missing key causes a runtime error; `null` does not. The guard costs one dict lookup per request |
| EC_Earth3P_HR climate model | Best-performing free model over East Africa (~25km resolution). Outperforms CMIP6 ensemble (~100km) at the sub-county scale relevant to farming advice |
| Weather graceful degradation | If `get_weather()` raises any exception, it returns a fallback string rather than propagating the error. The prompt remains functional using historical seasonal patterns |

---

*End of prompt documentation — Agritel.AI Technical Assessment Submission, March 2026*
