"use client";

import { Button, Dialog, DialogContent } from "@propad/ui";
import { Map } from "lucide-react";
import { useState } from "react";
import type { GeoSuburb, Property } from "@propad/sdk";
import { PropertyMap, type MapBounds } from "@/components/property-map";
import type { ListingsViewMode } from "@/lib/listings";

export function ListingsMapPanel({
  properties,
  suburbs,
  hoveredPropertyId,
  activeSuburb,
  activeBounds,
  viewMode,
  onHoverMarker,
  onBoundsSearch,
  onSuburbSelect,
  onSelectMarker,
}: {
  properties: Property[];
  suburbs: GeoSuburb[];
  hoveredPropertyId: string | null;
  activeSuburb: string | null;
  activeBounds?: MapBounds;
  viewMode: ListingsViewMode;
  onHoverMarker: (propertyId: string | null) => void;
  onBoundsSearch: (bounds: MapBounds) => void;
  onSuburbSelect: (suburb: GeoSuburb) => void;
  onSelectMarker: (propertyId: string) => void;
}) {
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const shouldShowDesktop = viewMode === "map" || viewMode === "split";

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="secondary"
          className="w-full rounded-xl"
          onClick={() => setMobileMapOpen(true)}
          aria-label="Open map"
        >
          <Map className="mr-2 h-4 w-4" />
          Open map
        </Button>

        <Dialog open={mobileMapOpen} onOpenChange={setMobileMapOpen}>
          <DialogContent className="h-[90vh] w-[95vw] max-w-none rounded-2xl p-2">
            <PropertyMap
              properties={properties}
              suburbs={suburbs}
              hoveredPropertyId={hoveredPropertyId}
              activeSuburb={activeSuburb}
              activeBounds={activeBounds}
              onHoverMarker={onHoverMarker}
              onBoundsSearch={onBoundsSearch}
              onSuburbSelect={onSuburbSelect}
              onSelectMarker={onSelectMarker}
            />
          </DialogContent>
        </Dialog>
      </div>

      {shouldShowDesktop ? (
        <aside className="sticky top-24 hidden space-y-4 lg:block">
          <PropertyMap
            properties={properties}
            suburbs={suburbs}
            hoveredPropertyId={hoveredPropertyId}
            activeSuburb={activeSuburb}
            activeBounds={activeBounds}
            onHoverMarker={onHoverMarker}
            onBoundsSearch={onBoundsSearch}
            onSuburbSelect={onSuburbSelect}
            onSelectMarker={onSelectMarker}
          />
        </aside>
      ) : null}
    </>
  );
}
