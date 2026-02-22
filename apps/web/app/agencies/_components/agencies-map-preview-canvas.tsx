"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

export function AgenciesMapPreviewCanvas({
  center,
  markers,
}: {
  center: { lat: number; lng: number };
  markers: Array<{ id: string; lat: number; lng: number; trustScore: number }>;
}) {
  return (
    <div className="h-64 overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={9}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.lat, marker.lng]}
            radius={Math.max(
              5,
              Math.min(10, Math.round(marker.trustScore / 12)),
            )}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.9,
              weight: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
