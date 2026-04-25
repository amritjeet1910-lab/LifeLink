/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const medicalIcon = L.divIcon({
  className: "medical-map-pin",
  html: '<div class="medical-map-pin-inner"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function SatelliteMapLayers() {
  return (
    <>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
      />
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
        attribution="Roads &copy; Esri"
        pane="overlayPane"
      />
      <TileLayer
        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        attribution="Labels &copy; Esri"
        pane="overlayPane"
      />
    </>
  );
}

export function RecenterMap({ center, zoom = 13 }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(center) || center.length < 2) return;
    map.setView(center, Math.max(map.getZoom(), zoom), { animate: true });
  }, [center, zoom, map]);

  return null;
}

export function NearbyMedicalPlaces({ center, radiusMeters = 3000 }) {
  const [places, setPlaces] = useState([]);

  const query = useMemo(() => {
    if (!Array.isArray(center) || center.length < 2) return "";
    const [lat, lng] = center;
    return `
      [out:json][timeout:20];
      (
        node["amenity"~"hospital|clinic|laboratory"](around:${radiusMeters},${lat},${lng});
        way["amenity"~"hospital|clinic|laboratory"](around:${radiusMeters},${lat},${lng});
        relation["amenity"~"hospital|clinic|laboratory"](around:${radiusMeters},${lat},${lng});
      );
      out center 24;
    `;
  }, [center, radiusMeters]);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: query,
        });
        const data = await res.json();
        if (cancelled) return;

        const nextPlaces = (data?.elements || [])
          .map((item) => {
            const lat = item.lat ?? item.center?.lat;
            const lng = item.lon ?? item.center?.lon;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return {
              id: `${item.type}-${item.id}`,
              lat,
              lng,
              name: item.tags?.name || "Medical place",
              kind: item.tags?.amenity || "medical",
            };
          })
          .filter(Boolean)
          .slice(0, 24);

        setPlaces(nextPlaces);
      } catch {
        if (!cancelled) setPlaces([]);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <>
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]} icon={medicalIcon}>
          <Popup>
            <div className="font-semibold">{place.name}</div>
            <div className="text-xs text-gray-500 capitalize">{place.kind}</div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
