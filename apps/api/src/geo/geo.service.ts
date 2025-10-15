import { Injectable } from '@nestjs/common';
import { SUBURBS, type RawSuburb, type LatLngTuple } from './suburbs.data';

type Bounds = {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
};

export interface GeoSuburb {
  name: string;
  city: string;
  polygon: LatLngTuple[];
  bbox: Bounds;
}

interface ReverseGeocodeResult {
  city: string;
  suburb?: string;
}

@Injectable()
export class GeoService {
  private readonly suburbs: GeoSuburb[];

  constructor() {
    this.suburbs = SUBURBS.map((suburb) => ({
      ...suburb,
      bbox: this.computeBounds(suburb.polygon)
    }));
  }

  listSuburbs(): GeoSuburb[] {
    return this.suburbs;
  }

  reverseGeocode(lat: number | undefined, lng: number | undefined): ReverseGeocodeResult | null {
    if (typeof lat !== 'number' || Number.isNaN(lat) || typeof lng !== 'number' || Number.isNaN(lng)) {
      return null;
    }

    for (const suburb of this.suburbs) {
      if (!this.withinBounds(lat, lng, suburb.bbox)) {
        continue;
      }

      if (this.pointInPolygon(lat, lng, suburb.polygon)) {
        return { city: suburb.city, suburb: suburb.name };
      }
    }

    const fallbackCity = this.suburbs.find((entry) => entry.city)?.city;
    return fallbackCity ? { city: fallbackCity } : null;
  }

  private computeBounds(polygon: RawSuburb['polygon']): Bounds {
    const latitudes = polygon.map(([lat]) => lat);
    const longitudes = polygon.map(([, lng]) => lng);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      northEast: { lat: maxLat, lng: maxLng },
      southWest: { lat: minLat, lng: minLng }
    };
  }

  private withinBounds(lat: number, lng: number, bounds: Bounds): boolean {
    return (
      lat >= Math.min(bounds.southWest.lat, bounds.northEast.lat) &&
      lat <= Math.max(bounds.southWest.lat, bounds.northEast.lat) &&
      lng >= Math.min(bounds.southWest.lng, bounds.northEast.lng) &&
      lng <= Math.max(bounds.southWest.lng, bounds.northEast.lng)
    );
  }

  private pointInPolygon(lat: number, lng: number, polygon: LatLngTuple[]): boolean {
    if (polygon.length < 3) {
      return false;
    }

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [yi, xi] = polygon[i];
      const [yj, xj] = polygon[j];

      const intersects =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }
}
