import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type Coords = { latitude: number; longitude: number };

let cached: Coords | null = null;
let asked = false;

/** The customer's real position, or null when they say no or the phone cannot tell. Asked once per app start. */
export async function getCoords(): Promise<Coords | null> {
  if (cached) return cached;
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted" && perm.canAskAgain && !asked) {
      asked = true;
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status !== "granted") return null;
    const last = await Location.getLastKnownPositionAsync();
    const pos = last || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    cached = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    return cached;
  } catch {
    return null;
  }
}

export function useCoords() {
  const [coords, setCoords] = useState<Coords | null>(cached);
  useEffect(() => {
    let alive = true;
    getCoords().then((c) => alive && c && setCoords(c));
    return () => {
      alive = false;
    };
  }, []);
  return coords;
}

/** Straight-line distance in km between two points. */
export function haversineKm(a: Coords, b: Coords) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Real distance from the customer to a market when both positions are known.
 * Falls back to the distance typed in Admin (distance_km) so the card never shows nothing.
 */
export function marketDistanceKm(market: any, me: Coords | null): number | null {
  const lat = market?.latitude != null ? Number(market.latitude) : null;
  const lon = market?.longitude != null ? Number(market.longitude) : null;
  if (me && lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    return haversineKm(me, { latitude: lat, longitude: lon });
  }
  return market?.distance_km != null ? Number(market.distance_km) : null;
}
