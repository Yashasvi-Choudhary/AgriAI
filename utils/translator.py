import json
import os

# Cache loaded files in memory so disk is only read once per language
_cache = {}

def get_translations(lang, page):
    """Load and merge common + page translations for a given lang."""
    
    supported = ["en", "hi"]
    if lang not in supported:
        lang = "en"

    cache_key = f"{lang}_{page}"
    if cache_key in _cache:
        return _cache[cache_key]

    base = os.path.join("static", "locales", lang)

    def load_json(filepath):
        try:
            with open(filepath, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    common = load_json(os.path.join(base, "common.json"))
    page_t = load_json(os.path.join(base, f"{page}.json"))

    merged = {**common, **page_t}
    _cache[cache_key] = merged
    return merged