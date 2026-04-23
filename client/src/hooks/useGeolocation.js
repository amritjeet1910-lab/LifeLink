import { useCallback, useEffect, useRef, useState } from "react";

export function useGeolocation() {
  const watchIdRef = useRef(null);
  const [position, setPosition] = useState(null); // { lat, lng, accuracy, timestamp }
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const stop = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      return;
    }
    setIsRunning(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        setError(err?.message || "Failed to read location");
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 }
    );
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { position, error, isRunning, start, stop };
}

