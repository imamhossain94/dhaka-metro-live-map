import { useEffect, useRef, useState } from 'react';

// Opt-in (active=false by default at the call site) continuous GPS watch.
export default function useGeolocation(active) {
  const [position, setPosition] = useState(null); // {lat, lon, accuracy}
  const [error, setError] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!active) {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setPosition(null);
      return;
    }
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device or browser.');
      return;
    }
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED ? 'Location permission denied.' :
          err.code === err.POSITION_UNAVAILABLE ? 'Location unavailable right now.' :
          'Location request timed out.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [active]);

  return { position, error };
}
