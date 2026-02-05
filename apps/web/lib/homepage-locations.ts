import type { GeoCoords } from "@/hooks/use-geo-preference";

export interface QuickLocation {
  label: string;
  coords: GeoCoords;
}

export const DEFAULT_HOME_LOCATION: QuickLocation = {
  label: "Harare",
  coords: { lat: -17.8252, lng: 31.0335 },
};

export const QUICK_LOCATIONS: QuickLocation[] = [
  { label: "Nearby", coords: DEFAULT_HOME_LOCATION.coords },
  DEFAULT_HOME_LOCATION,
  { label: "Bulawayo", coords: { lat: -20.1494, lng: 28.5816 } },
  { label: "Victoria Falls", coords: { lat: -17.9324, lng: 25.8307 } },
  { label: "Gweru", coords: { lat: -19.45, lng: 29.8167 } },
  { label: "Mutare", coords: { lat: -18.9707, lng: 32.6709 } },
];
