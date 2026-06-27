import json
import os


def get_translations(lang, page):
    """Load and merge common + page translations for a given lang."""
    
    supported = ["en", "hi"]
    if lang not in supported:
        lang = "en"

    base = os.path.join("static", "locales", lang)

    def load_json(filepath):
        try:
            with open(filepath, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    common = load_json(os.path.join(base, "common.json"))
    dashboard_t = load_json(os.path.join(base, "dashboard.json"))
    page_t = load_json(os.path.join(base, f"{page}.json"))

    merged = {**common, **dashboard_t, **page_t}
<<<<<<< HEAD
    _cache[cache_key] = merged
=======
>>>>>>> bfc39489398e30c9057e1e32688b0793db3f36c6
    return merged