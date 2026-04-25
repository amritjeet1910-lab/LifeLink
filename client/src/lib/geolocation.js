import { api } from "./api";

export async function capturePreciseLocation({
  sampleMs = 9000,
  hardTimeoutMs = 15000,
  goodAccuracyM = 25,
  acceptableAccuracyM = 150,
} = {}) {
  if (!navigator.geolocation) throw new Error("Geolocation not supported on this device.");

  return await new Promise((resolve, reject) => {
    let watchId = null;
    let done = false;
    let best = null;
    let samples = 0;

    const finish = (err) => {
      if (done) return;
      done = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (err) reject(err);
      else resolve(best);
    };

    const sampleTimer = setTimeout(() => {
      if (best?.accuracy <= acceptableAccuracyM) finish();
      else finish(new Error(best ? `Location accuracy too low (about ${Math.round(best.accuracy)}m). Try again near a window or outdoors.` : "Could not get GPS fix. Try again near a window/outdoors."));
    }, sampleMs);

    const hardTimer = setTimeout(() => {
      clearTimeout(sampleTimer);
      if (best?.accuracy <= acceptableAccuracyM) finish();
      else finish(new Error(best ? `Timed out before getting an accurate GPS fix (best was about ${Math.round(best.accuracy)}m).` : "Timed out waiting for GPS permission/fix."));
    }, hardTimeoutMs);

    const onPos = (pos) => {
      samples += 1;
      const fix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };
      if (!best || fix.accuracy < best.accuracy) best = fix;

      if (samples >= 2 && best?.accuracy <= goodAccuracyM) {
        clearTimeout(sampleTimer);
        clearTimeout(hardTimer);
        finish();
      }
    };

    const onErr = (err) => {
      clearTimeout(sampleTimer);
      clearTimeout(hardTimer);
      finish(new Error(err?.message || "Failed to read location"));
    };

    watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: hardTimeoutMs,
    });
  });
}

export async function resolveEstimatedLocation({ address, pincode, city, coordinates, accuracy }) {
  const res = await api.post("/users/resolve-location", {
    address,
    pincode,
    city,
    coordinates,
    accuracy,
  });
  if (!res.data?.success) {
    throw new Error(res.data?.message || "Could not estimate location");
  }
  return res.data.data;
}
