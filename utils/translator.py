import json
import os


_TRANSLATION_CACHE = {}


def deep_merge(base, update):
    for key, value in update.items():
        if (
            key in base
            and isinstance(base[key], dict)
            and isinstance(value, dict)
        ):
            deep_merge(base[key], value)
        else:
            base[key] = value

    return base


def get_translations(lang, page):
    """Load and merge common + page translations for a given lang."""

    supported = ["en", "hi"]

    if lang not in supported:
        lang = "en"

    cache_key = (lang, page)

    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key]


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


    merged = deep_merge(common, dashboard_t)
    merged = deep_merge(merged, page_t)


    _TRANSLATION_CACHE[cache_key] = merged

    return merged