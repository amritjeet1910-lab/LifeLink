export async function capturePreciseLocation({
  sampleMs = 7000,
  hardTimeoutMs = 12000,
  goodAccuracyM = 35,
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
      if (best) finish();
      else finish(new Error("Could not get GPS fix. Try again near a window/outdoors."));
    }, sampleMs);

    const hardTimer = setTimeout(() => {
      clearTimeout(sampleTimer);
      if (best) finish();
      else finish(new Error("Timed out waiting for GPS permission/fix."));
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

