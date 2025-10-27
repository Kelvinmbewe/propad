'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, List, MapPin } from 'lucide-react';
import type { LandingProperty } from './landing-property-card';

export interface LandingMapProperty extends LandingProperty {
  coordinates: [number, number];
}

export interface LandingMapSectionProps {
  properties: LandingMapProperty[];
}

type LeafletModule = typeof import('leaflet');
type ReactLeafletExports = typeof import('react-leaflet');
type LeafletComponents = Pick<ReactLeafletExports, 'MapContainer' | 'Marker' | 'useMap'>;

interface LandingTileLayerProps {
  leaflet: LeafletModule;
  useMap: LeafletComponents['useMap'];
}

function LandingTileLayer({ leaflet, useMap }: LandingTileLayerProps) {
  const map = useMap();

  useEffect(() => {
    const tileLayer = leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    tileLayer.addTo(map);

    return () => {
      map.removeLayer(tileLayer);
    };
  }, [leaflet, map]);

  return null;
}

export function LandingMapSection({ properties }: LandingMapSectionProps) {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [leaflet, setLeaflet] = useState<LeafletModule | null>(null);
  const [leafletComponents, setLeafletComponents] = useState<LeafletComponents | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    void Promise.all([import('leaflet'), import('react-leaflet')])
      .then(([leafletModule, reactLeafletModule]) => {
        if (!isMounted) {
          return;
        }

        const resolvedLeaflet =
          (leafletModule as LeafletModule & { default?: LeafletModule }).default ?? leafletModule;

        setLeaflet(resolvedLeaflet);
        setLeafletComponents({
          MapContainer: reactLeafletModule.MapContainer,
          Marker: reactLeafletModule.Marker,
          useMap: reactLeafletModule.useMap
        });
      })
      .catch(() => {
        setLeaflet(null);
        setLeafletComponents(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const tealIcon = useMemo(() => {
    if (!leaflet) {
      return null;
    }
    return leaflet.divIcon({
      className: 'landing-map-pin',
      html: '<span class="landing-map-pin__dot">✓</span>',
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });
  }, [leaflet]);

  const center = useMemo(() => properties[0]?.coordinates ?? [-17.829, 31.054], [properties]);

  const MapContainerComponent = leafletComponents?.MapContainer;
  const MarkerComponent = leafletComponents?.Marker;
  const useMapHook = leafletComponents?.useMap;

  return (
    <section id="map" className="mx-auto flex max-w-6xl flex-col gap-12 px-6 sm:px-12 lg:px-16">
      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">Live locations</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Map the PropAd neighbourhoods</h2>
            <p className="mt-3 text-sm text-slate-600">
              Toggle between cinematic list view and live map exploration. Every pin represents a PropAd verified address.
            </p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium text-slate-500">
            <button
              type="button"
              onClick={() => setView('map')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${
                view === 'map' ? 'bg-white text-emerald-600 shadow-[0_12px_30px_-18px_rgba(45,212,191,0.65)]' : ''
              }`}
            >
              <MapPin className="h-4 w-4" /> Map
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 transition ${
                view === 'list' ? 'bg-white text-emerald-600 shadow-[0_12px_30px_-18px_rgba(45,212,191,0.65)]' : ''
              }`}
            >
              <List className="h-4 w-4" /> List
            </button>
          </div>
          <ul className="space-y-4 text-sm text-slate-600">
            {properties.map((property) => (
              <li key={property.id} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{property.status}</p>
                  <p className="text-sm font-semibold text-slate-900">{property.title}</p>
                  <p className="text-xs text-slate-500">{property.location}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <div className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_35px_100px_-65px_rgba(15,23,42,0.5)]">
          {view === 'map' ? (
            leaflet && MapContainerComponent && MarkerComponent && useMapHook && tealIcon ? (
              <MapContainerComponent
                center={center}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <LandingTileLayer leaflet={leaflet} useMap={useMapHook} />
                {properties.map((property) => (
                  <MarkerComponent key={property.id} position={property.coordinates} icon={tealIcon} />
                ))}
              </MapContainerComponent>
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-50/70 text-sm text-slate-500">
                Loading interactive map…
              </div>
            )
          ) : (
            <div className="grid h-full gap-4 bg-slate-50/70 p-6 sm:grid-cols-2">
              {properties.map((property) => (
                <div key={property.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">{property.status}</p>
                  <p className="text-sm font-semibold text-slate-900">{property.title}</p>
                  <p className="text-xs text-slate-500">{property.location}</p>
                  <p className="text-sm font-medium text-slate-700">{property.price}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
