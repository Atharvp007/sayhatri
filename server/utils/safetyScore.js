import axios from "axios";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/**
 * Fetches nearby safety-relevant OSM points (police, hospitals, shops,
 * bars, nightclubs, parking, highways) within `radiusMeters` of a point.
 *
 * This is real-time data — every call queries OpenStreetMap's live
 * Overpass API, no caching or mock data involved.
 */
export async function getNearbySafetyData(lat, lng, radiusMeters = 300) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return [];
  }

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="police"](around:${radiusMeters},${lat},${lng});
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["shop"](around:${radiusMeters},${lat},${lng});
      node["amenity"="bar"](around:${radiusMeters},${lat},${lng});
      node["amenity"="nightclub"](around:${radiusMeters},${lat},${lng});
      node["amenity"="parking"](around:${radiusMeters},${lat},${lng});
      way["highway"](around:${radiusMeters},${lat},${lng});
    );
    out center 50;
  `;

  try {
    const res = await axios.post(OVERPASS_URL, query, {
      headers: { "Content-Type": "text/plain" },
      timeout: 12000,
    });

    const elements = res.data?.elements || [];

    // Normalize ways (which use `center` instead of lat/lon) to the same shape
    return elements.map((el) => ({
      id: el.id,
      type: el.type,
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      tags: el.tags || {},
    }));
  } catch (err) {
    console.log(
      `Overpass API error for (${lat}, ${lng}):`,
      err.response?.status || err.message
    );
    return [];
  }
}