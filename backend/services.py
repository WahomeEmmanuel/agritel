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

async def geocode(client: httpx.AsyncClient, name: str) -> list:
    """
    Get location coordinated
    """
    r = await client.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": name, "country_code": "KE",
                "count": 1, "language": "en", "format": "json"},
    )
    r.raise_for_status()
    return r.json().get("results", [])

async def get_weather(county_label, today):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            current_date_str = today.strftime("%B %d, %Y")          # e.g. "March 16, 2026"
            current_month    = today.strftime("%B")                  # e.g. "March"
            current_year     = today.strftime("%Y")
            six_months_later = (today.replace(day=1) + timedelta(days=183)).replace(day=1)
            season_end_str   = six_months_later.strftime("%B %d, %Y")

            # get exact coordinates of the user location
            geolocation = await geocode(client, county_label)
            if not geolocation:
                raise ValueError(f"Could not resolve '{county_label}' to coordinates.")

            lat           = geolocation[0]["latitude"]
            lng           = geolocation[0]["longitude"]
            resolved_name = geolocation[0].get("name", resolved_name)

            # get 16-day daily weather forecast
            wx = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude":      lat,
                    "longitude":     lng,
                    "daily":         "precipitation_sum,precipitation_hours,temperature_2m_max,temperature_2m_min",
                    "timezone":      "Africa/Nairobi",
                    "forecast_days": 16,
                },
            )
            wx.raise_for_status()
            wx_data = wx.json()

            # Parse the 16-day forecast
            daily = wx_data["daily"]
            days = [
                {
                    "date":     daily["time"][i],
                    "rain_mm":  round(daily["precipitation_sum"][i] or 0, 1),
                    "rain_hrs": round(daily["precipitation_hours"][i] or 0, 1),
                    "t_max":    round(daily["temperature_2m_max"][i] or 0, 1),
                    "t_min":    round(daily["temperature_2m_min"][i] or 0, 1),
                }
                for i in range(len(daily["time"]))
            ]
    
            total_mm   = round(sum(d["rain_mm"] for d in days), 1)
            rainy_days = sum(1 for d in days if d["rain_mm"] >= 5)
            dry_days   = sum(1 for d in days if d["rain_mm"] < 2)
            rain_onset = next((d["date"] for d in days if d["rain_mm"] >= 10), None)
    
            max_streak = streak = 0
            for d in days:
                streak     = streak + 1 if d["rain_mm"] < 2 else 0
                max_streak = max(max_streak, streak)
    
            if total_mm < 20:
                status = "VERY DRY — critically low rainfall. High drought risk."
            elif rainy_days >= 10:
                status = "WET — frequent rain. Good for germination; watch for waterlogging."
            elif max_streak >= 7:
                status = f"INTERMITTENT — {max_streak}-day dry streak. Germination risk."
            else:
                status = "MODERATE — variable rain. Time planting to coincide with wettest days."
    
            daily_table = "\n".join(
                f"  {d['date']} | {d['rain_mm']:>5.1f}mm | {d['t_min']}–{d['t_max']}°C | {d['rain_hrs']}h rain"
                for d in days
            )

            # get  6-month climate forecast
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
            cl.raise_for_status()
            cl_data = cl.json()


            # Parse 6-month climate forecast
            cl_daily  = cl_data["daily"]
            monthly   = defaultdict(lambda: {"rain": [], "t_max": [], "t_min": []})
    
            for i in range(len(cl_daily["time"])):
                month_key = cl_daily["time"][i][:7]   # "YYYY-MM"
                monthly[month_key]["rain"].append(cl_daily["precipitation_sum"][i] or 0)
                monthly[month_key]["t_max"].append(cl_daily["temperature_2m_max"][i] or 0)
                monthly[month_key]["t_min"].append(cl_daily["temperature_2m_min"][i] or 0)
    
            month_rows = []
            for month_key in sorted(monthly):
                m    = monthly[month_key]
                yr, mo = month_key.split("-")
                name   = date(int(yr), int(mo), 1).strftime("%b %Y")
                total  = round(sum(m["rain"]), 1)
                avg_hi = round(sum(m["t_max"]) / len(m["t_max"]), 1)
                avg_lo = round(sum(m["t_min"]) / len(m["t_min"]), 1)
                rainy  = sum(1 for r in m["rain"] if r >= 5)
    
                # Flag the month's farming significance
                if total >= 100:
                    flag = "GOOD — sufficient moisture"
                elif total >= 50:
                    flag = "MODERATE — monitor soil moisture"
                elif total >= 20:
                    flag = "LOW — consider supplemental irrigation"
                else:
                    flag = "VERY DRY — drought risk / off-season"
    
                month_rows.append(
                    f"  {name:<10} | {total:>6.1f}mm | {avg_lo}–{avg_hi}°C | {rainy:>2} rainy days | {flag}"
                )

            return f"""
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
            """
    except Exception as exc:
        return f"""
            ━━━ LIVE WEATHER FORECAST ━━━
            Status : UNAVAILABLE ({exc})
            Action : Use historical seasonal patterns for {county_label}.
        """

async def get_agronomy_advice(request: ChatRequest):
    # Chat history
    past_chats = format_history_for_gemini(request.context_history)
    
    # Start the session
    chat_session = model.start_chat(history=past_chats)

    # Date context
    today = date.today()
    current_date_str = today.strftime("%B %d, %Y")          # e.g. "March 16, 2026"
    current_month    = today.strftime("%B")                  # e.g. "March"
    current_year     = today.strftime("%Y")
    six_months_later = (today.replace(day=1) + timedelta(days=183)).replace(day=1)
    season_end_str   = six_months_later.strftime("%B %d, %Y")

    # Geocode county, location to fetch weather forecast
    county_label  = f"{request.county}, Kenya"
    weather_block = await get_weather(county_label, today)
    
    # THE MASTER PROMPT
    detailed_system_prompt = f"""
    You are 'Agritel.AI Agronomist', a senior agricultural expert with 20+ years of
    experience in Kenyan farming, agronomy, pest management, soil science, and government
    programs (NCPB, eCitizen subsidies, county extension services).

    ━━━ SESSION CONTEXT ━━━
    Date            : {current_date_str} ({current_month} {current_year})
    Farmer Location : {county_label}
    Primary Crop    : {request.crop}
    Season window   : {current_date_str} → {season_end_str}
    Farmer's Query  : {request.last_message}

    ━━━ LOCALISATION FRAMEWORK FOR {request.county.upper()} COUNTY ━━━
 
    1. AGRO-ECOLOGICAL ZONE — identify which AEZ applies to {request.county}:
    Zone I   : Afro-Alpine/humid >2500mm  — Mt. Kenya slopes, Aberdares
    Zone II  : Sub-humid 1500–2500mm      — Kisii, Kakamega, Nyeri highlands
    Zone III : Semi-humid 1000–1500mm     — Nakuru, Uasin Gishu, Trans Nzoia
    Zone IV  : Semi-arid 500–1000mm       — Machakos, Kitui, Makueni, Kajiado
    Zone V–VII: Arid/very arid <500mm     — Turkana, Marsabit, Garissa, Wajir
    
    2. COUNTY PLANTING SEASONS FOR {request.crop.upper()}:
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
    
    3. SOIL & FERTILISER for {request.county}:
    Red volcanic (Central, W. highlands) → DAP + CAN; lime if pH <5.5
    Black cotton (Rift lowlands, W. Kenya) → waterlogging risk; avoid wet tillage
    Sandy (Coast, ASAL)                  → split fertiliser; add organic matter
    Loam (most highlands)                → balanced; suitable for most crops
    
    4. SEED VARIETIES — recommend KEPHIS-approved certified varieties for {request.county}'s AEZ.

    {weather_block}

    ━━━ RESPONSE RULES ━━━
    - Language  : Professional, clear, jargon-free. Tone of a trusted advisor.
    - Currency  : Always KES.
    - points    : Steps for how-to | Key facts for diagnostic | [] if summary is self-contained
    - cost_estimate_per_acre_kes : integer ONLY for planting/input/treatment queries — null otherwise
    - warning   : string ONLY for real risks (timing, chemicals, disease, drought) — null otherwise
    - pro_tip   : string ONLY for non-obvious expert insight — null otherwise
    
    ━━━ OUTPUT — strict JSON only, no markdown, no text outside the object ━━━
    {{
    "summary": "Direct localised answer for {request.county} with planting verdict (Layer 1) and full season outlook (Layer 2).",
    "points": ["step or fact 1", "step or fact 2"],
    "cost_estimate_per_acre_kes": <integer | null>,
    "warning": "<string | null>",
    "pro_tip": "<string | null>"
    }}
    """

    # Generate content using the session to maintain memory
    raw_response = chat_session.send_message(
        detailed_system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    data = json.loads(raw_response.text)
    
    # Final data safety check
    if "points" not in data: data["points"] = []
    
    return data