"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "propad:location-preference";

export type GeoSource = "browser" | "stored" | "manual" | "default";

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface GeoPreferenceState {
  coords: GeoCoords;
  label: string;
  source: GeoSource;
  permission: "granted" | "denied" | "prompt";
  updatedAt: string;
}

export interface GeoPreferenceResult {
  coords: GeoCoords;
  label: string;
  source: GeoSource;
  permission: "granted" | "denied" | "prompt";
  isLoading: boolean;
  fallbackLabel: string;
  requestLocation: () => void;
  setManualLocation: (next: { label: string; coords?: GeoCoords }) => void;
}

export function useGeoPreference(fallbackLocation: {
  label: string;
  coords: GeoCoords;
}): GeoPreferenceResult {
  const [state, setState] = useState<GeoPreferenceState>(() => ({
    coords: fallbackLocation.coords,
    label: fallbackLocation.label,
    source: "default",
    permission: "prompt",
    updatedAt: new Date().toISOString(),
  }));
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback((next: GeoPreferenceState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // ignore storage errors
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const fallback = {
        coords: fallbackLocation.coords,
        label: fallbackLocation.label,
        source: "default" as const,
        permission: "denied" as const,
        updatedAt: new Date().toISOString(),
      };
      setState(fallback);
      persist(fallback);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          label: "Near me",
          source: "browser" as const,
          permission: "granted" as const,
          updatedAt: new Date().toISOString(),
        };
        setState(next);
        persist(next);
        setIsLoading(false);
      },
      () => {
        const fallback = {
          coords: fallbackLocation.coords,
          label: fallbackLocation.label,
          source: "default" as const,
          permission: "denied" as const,
          updatedAt: new Date().toISOString(),
        };
        setState(fallback);
        persist(fallback);
        setIsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, [fallbackLocation.coords, fallbackLocation.label, persist]);

  const setManualLocation = useCallback(
    (next: { label: string; coords?: GeoCoords }) => {
      const updated = {
        coords: next.coords ?? fallbackLocation.coords,
        label: next.label,
        source: "manual" as const,
        permission: state.permission,
        updatedAt: new Date().toISOString(),
      };
      setState(updated);
      persist(updated);
    },
    [fallbackLocation.coords, persist, state.permission],
  );

  useEffect(() => {
    let stored: GeoPreferenceState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      stored = raw ? (JSON.parse(raw) as GeoPreferenceState) : null;
    } catch (error) {
      stored = null;
    }

    if (stored?.coords?.lat && stored?.coords?.lng) {
      setState({
        coords: stored.coords,
        label: stored.label ?? fallbackLocation.label,
        source: stored.source ?? "stored",
        permission: stored.permission ?? "prompt",
        updatedAt: stored.updatedAt ?? new Date().toISOString(),
      });
      setIsLoading(false);
      return;
    }

    requestLocation();
  }, [fallbackLocation.label, requestLocation]);

  return useMemo(
    () => ({
      coords: state.coords,
      label: state.label,
      source: state.source,
      permission: state.permission,
      isLoading,
      fallbackLabel: fallbackLocation.label,
      requestLocation,
      setManualLocation,
    }),
    [
      fallbackLocation.label,
      isLoading,
      requestLocation,
      setManualLocation,
      state.coords,
      state.label,
      state.permission,
      state.source,
    ],
  );
}
