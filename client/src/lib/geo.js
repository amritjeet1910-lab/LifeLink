export function toLeafletLatLng(geoJsonCoordinates) {
  if (!Array.isArray(geoJsonCoordinates) || geoJsonCoordinates.length < 2) return null;
  const [lng, lat] = geoJsonCoordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return [lat, lng];
}

export function formatDistance(meters) {
  if (typeof meters !== "number" || Number.isNaN(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters > 9950 ? 0 : 1)} km`;
}

