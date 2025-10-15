'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoSuburb, Property } from '@propad/sdk';
import { Button } from '@propad/ui';
import clsx from 'clsx';
import L, { type Map as LeafletMap } from 'leaflet';
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapBounds {
  southWest: MapCoordinate;
  northEast: MapCoordinate;
}

interface PropertyMapProps {
  properties: Property[];
  suburbs: GeoSuburb[];
  hoveredPropertyId?: string | null;
  activeSuburb?: string | null;
  activeBounds?: MapBounds;
  onHoverMarker?: (propertyId: string | null) => void;
  onBoundsSearch?: (bounds: MapBounds) => void;
  onSuburbSelect?: (suburb: GeoSuburb) => void;
}

const DEFAULT_CENTER: [number, number] = [-17.829, 31.054];
const FORMAT_PRECISION = 6;

function formatBounds(bounds: MapBounds) {
  return [
    bounds.southWest.lat.toFixed(FORMAT_PRECISION),
    bounds.southWest.lng.toFixed(FORMAT_PRECISION),
    bounds.northEast.lat.toFixed(FORMAT_PRECISION),
    bounds.northEast.lng.toFixed(FORMAT_PRECISION)
  ].join(',');
}

function MapInteractions({
  isDrawing,
  onBoundsDrawn,
  onMoveEnd,
  stopDrawing
}: {
  isDrawing: boolean;
  onBoundsDrawn: (bounds: MapBounds) => void;
  onMoveEnd: (bounds: MapBounds) => void;
  stopDrawing: () => void;
}) {
  const rectangleRef = useRef<L.Rectangle | null>(null);
  const startPointRef = useRef<L.LatLng | null>(null);
  const map = useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onMoveEnd({
        southWest: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
        northEast: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }
      });
    },
    mousedown(event) {
      if (!isDrawing) {
        return;
      }
      startPointRef.current = event.latlng;
      rectangleRef.current = L.rectangle([event.latlng, event.latlng], {
        color: '#2563eb',
        weight: 2,
        dashArray: '6 4',
        fillOpacity: 0.1
      }).addTo(map);
      map.dragging.disable();
      map.doubleClickZoom.disable();
    },
    mousemove(event) {
      if (!isDrawing || !rectangleRef.current || !startPointRef.current) {
        return;
      }
      rectangleRef.current.setBounds(L.latLngBounds(startPointRef.current, event.latlng));
    },
    mouseup() {
      if (!isDrawing) {
        return;
      }

      map.dragging.enable();
      map.doubleClickZoom.enable();

      if (rectangleRef.current) {
        const bounds = rectangleRef.current.getBounds();
        onBoundsDrawn({
          southWest: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
          northEast: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }
        });
        map.removeLayer(rectangleRef.current);
        rectangleRef.current = null;
      }

      startPointRef.current = null;
      stopDrawing();
    }
  });

  useEffect(() => {
    if (!isDrawing) {
      map.dragging.enable();
      map.doubleClickZoom.enable();
    }
  }, [isDrawing, map]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawing) {
        if (rectangleRef.current) {
          map.removeLayer(rectangleRef.current);
          rectangleRef.current = null;
        }
        startPointRef.current = null;
        stopDrawing();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawing, stopDrawing, map]);

  return null;
}

export function PropertyMap({
  properties,
  suburbs,
  hoveredPropertyId,
  activeSuburb,
  activeBounds,
  onHoverMarker,
  onBoundsSearch,
  onSuburbSelect
}: PropertyMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const appliedBoundsRef = useRef<string | null>(activeBounds ? formatBounds(activeBounds) : null);

  const propertiesWithLocation = useMemo(
    () =>
      properties.filter(
        (property) =>
          typeof property.location.lat === 'number' && typeof property.location.lng === 'number'
      ),
    [properties]
  );

  const markerPositions = useMemo(
    () =>
      propertiesWithLocation.map((property) => [property.location.lat!, property.location.lng!] as [
        number,
        number
      ]),
    [propertiesWithLocation]
  );

  const defaultCenter = useMemo(() => {
    if (activeBounds) {
      return [
        (activeBounds.southWest.lat + activeBounds.northEast.lat) / 2,
        (activeBounds.southWest.lng + activeBounds.northEast.lng) / 2
      ] as [number, number];
    }

    if (markerPositions.length > 0) {
      return markerPositions[0];
    }

    if (suburbs.length > 0) {
      const first = suburbs[0].polygon[0];
      if (first) {
        return first;
      }
    }

    return DEFAULT_CENTER;
  }, [activeBounds, markerPositions, suburbs]);

  const defaultIcon = useMemo(
    () =>
      L.divIcon({
        className: 'property-marker-icon',
        html: '<span class="property-marker-icon__dot">✓</span>'
      }),
    []
  );

  const activeIcon = useMemo(
    () =>
      L.divIcon({
        className: 'property-marker-icon property-marker-icon--active',
        html: '<span class="property-marker-icon__dot">✓</span>'
      }),
    []
  );

  const clusterIconFactory = useMemo(
    () =>
      (cluster: any) =>
        L.divIcon({
          html: `<div class="property-cluster"><span>${cluster.getChildCount()}</span></div>`,
          className: 'property-cluster-wrapper',
          iconSize: [44, 44]
        }),
    []
  );

  useEffect(() => {
    appliedBoundsRef.current = activeBounds ? formatBounds(activeBounds) : null;
    setPendingBounds(null);
  }, [activeBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (activeBounds) {
      const bounds = L.latLngBounds(
        [activeBounds.southWest.lat, activeBounds.southWest.lng],
        [activeBounds.northEast.lat, activeBounds.northEast.lng]
      );
      map.fitBounds(bounds, { padding: [32, 32] });
      return;
    }

    if (markerPositions.length > 1) {
      const bounds = L.latLngBounds(markerPositions);
      map.fitBounds(bounds, { padding: [32, 32] });
    } else if (markerPositions.length === 1) {
      map.setView(markerPositions[0], 14);
    }
  }, [activeBounds, markerPositions]);

  const handleMoveEnd = (bounds: MapBounds) => {
    const key = formatBounds(bounds);
    if (key === appliedBoundsRef.current) {
      setPendingBounds(null);
      return;
    }
    setPendingBounds(bounds);
  };

  const handleBoundsSearch = (bounds: MapBounds | null) => {
    if (!bounds || !onBoundsSearch) {
      return;
    }
    appliedBoundsRef.current = formatBounds(bounds);
    onBoundsSearch(bounds);
    setPendingBounds(null);
  };

  const handleDrawnBounds = (bounds: MapBounds) => {
    handleBoundsSearch(bounds);
  };

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg md:h-[420px] lg:h-[520px]">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        minZoom={5}
        className="h-full w-full"
        scrollWheelZoom
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution="&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInteractions
          isDrawing={isDrawing}
          onBoundsDrawn={handleDrawnBounds}
          onMoveEnd={handleMoveEnd}
          stopDrawing={() => setIsDrawing(false)}
        />
        {suburbs.map((suburb) => {
          const isActive = activeSuburb?.toLowerCase() === suburb.name.toLowerCase();
          return (
            <Polygon
              key={suburb.name}
              positions={suburb.polygon}
              pathOptions={{
                color: isActive ? '#2563eb' : '#9ca3af',
                weight: isActive ? 2 : 1,
                fillOpacity: isActive ? 0.15 : 0.08,
                fillColor: isActive ? '#2563eb' : '#9ca3af'
              }}
              eventHandlers={{
                click: () => onSuburbSelect?.(suburb)
              }}
            />
          );
        })}
        <MarkerClusterGroup chunkedLoading iconCreateFunction={clusterIconFactory} showCoverageOnHover={false}>
          {propertiesWithLocation.map((property) => {
            const isActive = hoveredPropertyId === property.id;
            const icon = isActive ? activeIcon : defaultIcon;
            return (
              <Marker
                key={property.id}
                position={[property.location.lat!, property.location.lng!]}
                icon={icon}
                zIndexOffset={isActive ? 1000 : 0}
                riseOnHover
                eventHandlers={{
                  mouseover: () => onHoverMarker?.(property.id),
                  mouseout: () => onHoverMarker?.(null),
                  focus: () => onHoverMarker?.(property.id),
                  blur: () => onHoverMarker?.(null)
                }}
              />
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] flex w-full max-w-sm -translate-x-1/2 justify-center gap-2 px-4">
        {pendingBounds ? (
          <Button
            size="sm"
            className="pointer-events-auto bg-white/95 text-neutral-800 shadow"
            onClick={() => handleBoundsSearch(pendingBounds)}
          >
            Search this area
          </Button>
        ) : null}
        <Button
          size="sm"
          className={clsx(
            'pointer-events-auto bg-white/90 text-neutral-800 shadow transition',
            isDrawing ? 'ring-2 ring-blue-500' : 'hover:bg-white'
          )}
          onClick={() => setIsDrawing((state) => !state)}
        >
          {isDrawing ? 'Cancel drawing' : 'Draw area'}
        </Button>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] flex max-w-xs rounded-lg bg-white/90 p-3 text-xs text-neutral-700 shadow">
        <p>
          Shift the map or draw a rectangle to filter listings. Click a suburb polygon to focus that
          area.
        </p>
      </div>
      {propertiesWithLocation.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-white/60 text-sm text-neutral-600">
          We couldn&apos;t find map-ready listings for the current filters.
        </div>
      ) : null}
    </div>
  );
}
