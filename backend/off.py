"""Клиент Open Food Facts: поиск по названию и по штрих-коду.

OFF — бесплатная краудсорсная база (ODbL). Данные часто неполные/неточные,
поэтому КБЖУ всегда даём пользователю на правку перед сохранением.
"""
import httpx

OFF_BASE = "https://world.openfoodfacts.org"
# OFF просит указывать осмысленный User-Agent с названием приложения.
HEADERS = {"User-Agent": "DomashneeMenu/1.0 (personal home-menu calorie tracker)"}
TIMEOUT = 12.0
FIELDS = "code,product_name,product_name_ru,brands,nutriments,serving_quantity,image_small_url"


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _macros_per_100g(nutriments: dict) -> dict:
    kcal = _to_float(nutriments.get("energy-kcal_100g"))
    if not kcal:
        kj = _to_float(nutriments.get("energy_100g"))  # бывает в кДж
        if kj:
            kcal = round(kj / 4.184, 1)
    return {
        "calories": round(kcal, 1),
        "proteins": round(_to_float(nutriments.get("proteins_100g")), 1),
        "fats": round(_to_float(nutriments.get("fat_100g")), 1),
        "carbohydrates": round(_to_float(nutriments.get("carbohydrates_100g")), 1),
    }


def _normalize(product: dict) -> dict:
    nutriments = product.get("nutriments") or {}
    macros = _macros_per_100g(nutriments)
    name = (product.get("product_name_ru") or product.get("product_name") or "").strip()
    serving = product.get("serving_quantity")
    serving = _to_float(serving) or None
    return {
        "barcode": (product.get("code") or "").strip() or None,
        "name": name,
        "brand": (product.get("brands") or "").strip() or None,
        "calories": macros["calories"],
        "proteins": macros["proteins"],
        "fats": macros["fats"],
        "carbohydrates": macros["carbohydrates"],
        "serving_size_g": serving,
        "image_url": product.get("image_small_url") or None,
    }


def _has_data(p: dict) -> bool:
    return bool(p["name"]) and (
        p["calories"] or p["proteins"] or p["fats"] or p["carbohydrates"]
    )


async def search(query: str, limit: int = 20) -> list[dict]:
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": limit,
        "fields": FIELDS,
    }
    async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS) as client:
        resp = await client.get(f"{OFF_BASE}/cgi/search.pl", params=params)
        resp.raise_for_status()
        data = resp.json()
    results = []
    for product in data.get("products", []):
        norm = _normalize(product)
        if _has_data(norm):
            results.append(norm)
    return results


async def by_barcode(barcode: str) -> dict | None:
    async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS) as client:
        resp = await client.get(
            f"{OFF_BASE}/api/v2/product/{barcode}.json", params={"fields": FIELDS}
        )
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") == 1 and data.get("product"):
        norm = _normalize(data["product"])
        if norm["name"]:
            return norm
    return None
