/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { NearbyMedicalPlaces, SatelliteMapLayers } from "./MapLayers.jsx";

const DEFAULT_CENTER = [22.5937, 78.9629];

const sharedIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lng, event.latlng.lat]);
    },
  });

  return null;
}

function RecenterOnPick({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    map.flyTo([coordinates[1], coordinates[0]], Math.max(map.getZoom(), 17), {
      duration: 0.7,
    });
  }, [coordinates, map]);

  return null;
}

export default function AuthLocationPicker({ coordinates, onPick }) {
  const markerPosition =
    Array.isArray(coordinates) && coordinates.length >= 2
      ? [coordinates[1], coordinates[0]]
      : null;

  return (
    <div className="auth-map-shell">
      <MapContainer
        center={markerPosition || DEFAULT_CENTER}
        zoom={markerPosition ? 17 : 5}
        scrollWheelZoom
        className="auth-map"
      >
        <SatelliteMapLayers />
        <MapClickHandler onPick={onPick} />
        <RecenterOnPick coordinates={coordinates} />
        <NearbyMedicalPlaces center={markerPosition || DEFAULT_CENTER} radiusMeters={2000} />
        {markerPosition ? <Marker position={markerPosition} icon={sharedIcon} /> : null}
      </MapContainer>
      <div className="auth-map-hint">Tap the satellite map to drop a pin on your exact address. Labels, roads, hospitals, labs, and clinics are shown for easier orientation.</div>
    </div>
  );
}
