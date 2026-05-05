# Geolocation utilities
import requests

def geocode_location(location):
    """
    Geocode a location string to latitude and longitude using Nominatim API.
    Returns (lat, lon) or (None, None) if not found.
    """
    if not location:
        return None, None
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json&limit=1"
        response = requests.get(url, timeout=5)
        data = response.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None, None
