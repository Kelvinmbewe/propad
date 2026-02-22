"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

export function ListingLocationMapCanvas({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  return (
    <div className="h-72 overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[lat, lng]}
          radius={8}
          pathOptions={{
            color: "#10b981",
            fillColor: "#10b981",
            fillOpacity: 0.95,
            weight: 2,
          }}
        />
      </MapContainer>
    </div>
  );
}
